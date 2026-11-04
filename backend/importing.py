"""Local human-provided records, never an authentication or network adapter."""
import hashlib
import json
from typing import Literal
from uuid import uuid4

from datetime import datetime, timezone
from pydantic import BaseModel, ConfigDict, Field, field_validator
from fastapi import HTTPException
from backend.actions import locked_case, unresolved_submission
from backend.store import now

PROVENANCE = "UNVERIFIED human-provided evidence; NOT carrier authenticated."


class SourceInput(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    type: Literal["order", "carrier", "buyer_message"]
    title: str = Field(min_length=1, max_length=200)
    text: str = Field(min_length=1, max_length=16384)
    occurred_at: str = Field(min_length=1, max_length=64)
    order_id: str = Field(min_length=1, max_length=255)

    @field_validator("title", "order_id")
    @classmethod
    def single_line(cls, value):
        if not value.strip() or any(not c.isprintable() for c in value):
            raise ValueError("A nonempty single-line value without control characters is required")
        return value

    @field_validator("text")
    @classmethod
    def bounded_text(cls, value):
        try:
            size = len(value.encode("utf-8"))
        except UnicodeError:
            raise ValueError("Text must be valid UTF-8") from None
        if not value.strip() or size > 16384 or any(not c.isprintable() and c not in "\n\r\t" for c in value):
            raise ValueError("Text must be nonempty, at most 16384 UTF-8 bytes, without control characters except newline/tab")
        return value

    @field_validator("occurred_at")
    @classmethod
    def timestamp(cls, value):
        try:
            timestamp = datetime.fromisoformat(value.replace("Z", "+00:00"))
            if timestamp.tzinfo is None or timestamp > datetime.now(timezone.utc):
                raise ValueError()
        except ValueError:
            raise ValueError("occurred_at must be a nonfuture ISO-8601 timestamp with a timezone") from None
        return value


class ImportInput(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    sources: list[SourceInput] = Field(min_length=1, max_length=20)
    reviewed_by: str = Field(min_length=1, max_length=100)
    acknowledged_unverified: Literal[True]

    @field_validator("reviewed_by")
    @classmethod
    def reviewer(cls, value):
        return SourceInput.single_line(value)

    @field_validator("acknowledged_unverified", mode="before")
    @classmethod
    def acknowledgement(cls, value):
        if value is not True:
            raise ValueError("Explicit acknowledged_unverified: true is required")
        return value


def import_sources(store, case_id, payload):
    """Replace exactly one case's source set and record the local attribution."""
    with store.connect() as db:
        db.execute("BEGIN IMMEDIATE")
        locked_case(store, db, case_id, "sandbox")
        if unresolved_submission(db, case_id):
            raise HTTPException(409, "Submission is in progress or unresolved; reconcile before replacing evidence")
        sources = []
        for record in payload.sources:
            source = record.model_dump()
            source.update(id="IMP-" + str(uuid4()), title="UNVERIFIED human-provided | " + record.title,
                          text=PROVENANCE + "\n" + record.text, reviewed_by=payload.reviewed_by,
                          imported_at=now(), provenance="unverified_human_provided")
            source["sha256"] = hashlib.sha256(source["text"].encode()).hexdigest()
            sources.append(source)
        db.execute("DELETE FROM sources WHERE case_id=?", (case_id,))
        for source in sources:
            db.execute("INSERT INTO sources VALUES(?,?,?)", (source["id"], case_id, json.dumps(source)))
        db.execute("UPDATE cases SET analysis=NULL WHERE id=?", (case_id,))
        store.record(case_id, "sources_imported", f"Replaced {len(sources)} sources with unverified human-provided records; NOT carrier authenticated. Reviewed by {payload.reviewed_by}.", db)
    return dict(case_id=case_id, imported=len(sources), verified=False, detail=PROVENANCE)
