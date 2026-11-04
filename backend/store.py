import hashlib
import json
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4


def now():
    return datetime.now(timezone.utc).isoformat()


def digest(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode()).hexdigest()


class Store:
    def __init__(self, path):
        self.path = str(path)
        if self.path == ":memory:":
            raise ValueError("Use a SQLite file: per-request connections require persistence")
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        with self.connect() as db:
            db.executescript("""
            PRAGMA journal_mode=WAL;
            CREATE TABLE IF NOT EXISTS cases (id TEXT PRIMARY KEY, mode TEXT NOT NULL, data TEXT NOT NULL, analysis TEXT);
            CREATE TABLE IF NOT EXISTS sources (id TEXT PRIMARY KEY, case_id TEXT NOT NULL, data TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS audit (id TEXT PRIMARY KEY, case_id TEXT, at TEXT NOT NULL, action TEXT NOT NULL, detail TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS approvals (id TEXT PRIMARY KEY, case_id TEXT NOT NULL, packet_hash TEXT NOT NULL, approved_by TEXT NOT NULL, status TEXT NOT NULL, result TEXT);
            """)

    @contextmanager
    def connect(self):
        db = sqlite3.connect(self.path, timeout=30)
        db.row_factory = sqlite3.Row
        try:
            yield db
            db.commit()
        except BaseException:
            db.rollback()
            raise
        finally:
            db.close()

    def put_case(self, case, mode="demo", sources=()):
        with self.connect() as db:
            old = db.execute("SELECT data FROM cases WHERE id=?", (case["id"],)).fetchone()
            if old and old["data"] == json.dumps(case):
                return
            db.execute("INSERT INTO cases(id,mode,data) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data,analysis=NULL", (case["id"], mode, json.dumps(case)))
            for source in sources:
                source = dict(source)
                source["sha256"] = hashlib.sha256(source["text"].encode()).hexdigest()
                db.execute("INSERT OR REPLACE INTO sources VALUES(?,?,?)", (source["id"], case["id"], json.dumps(source)))

    def list_cases(self, mode):
        with self.connect() as db:
            return [self._case(row, db) for row in db.execute("SELECT * FROM cases WHERE mode=? ORDER BY id", (mode,)).fetchall()]

    def _case(self, row, db):
        data = json.loads(row["data"])
        data["sources"] = [json.loads(x[0]) for x in db.execute("SELECT data FROM sources WHERE case_id=? ORDER BY id", (data["id"],)).fetchall()]
        data["analysis"] = json.loads(row["analysis"]) if row["analysis"] else None
        data["evidence_count"] = len([s for s in data["sources"] if s["order_id"] == data["order_id"]])
        data["audit"] = self.audit(data["id"], db)
        return data

    def get_case(self, case_id, mode):
        with self.connect() as db:
            row = db.execute("SELECT * FROM cases WHERE id=? AND mode=?", (case_id, mode)).fetchone()
            return self._case(row, db) if row else None

    def audit(self, case_id=None, db=None):
        if db is None:
            with self.connect() as con:
                return self.audit(case_id, con)
        query = "SELECT * FROM audit"
        rows = db.execute(query + (" WHERE case_id=?" if case_id else "") + " ORDER BY at,id", (case_id,) if case_id else ()).fetchall()
        return [dict(r) for r in rows]

    def record(self, case_id, action, detail, db=None):
        if db is None:
            with self.connect() as con:
                return self.record(case_id, action, detail, con)
        db.execute("INSERT INTO audit VALUES(?,?,?,?,?)", (str(uuid4()), case_id, now(), action, detail))

    def reset_demo(self):
        with self.connect() as db:
            ids = [r[0] for r in db.execute("SELECT id FROM cases WHERE mode='demo'")]
            for cid in ids:
                db.execute("DELETE FROM sources WHERE case_id=?", (cid,))
                db.execute("DELETE FROM approvals WHERE case_id=?", (cid,))
                db.execute("DELETE FROM audit WHERE case_id=?", (cid,))
            db.execute("DELETE FROM cases WHERE mode='demo'")
