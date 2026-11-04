"""Local embeddings rank evidence; deterministic policy checks consistency.

Model import/download are lazy. No evidence text is uploaded to a cloud model.
"""
import os
import re
import threading
from pathlib import Path

MODEL_NAME = "BAAI/bge-small-en-v1.5"


class Retriever:
    def __init__(self, mode="onnx"):
        self.mode = mode
        self._model = None
        self._attempted = False
        self._inferred = False
        self._error = None
        self._lock = threading.RLock()

    def status(self):
        if self._inferred:
            return dict(provider="local-onnx", ready=True,
                        detail=f"Real CPU ONNX inference completed with {MODEL_NAME}; 384-dimensional embeddings rank scoped excerpts. Policy is deterministic, not LLM reasoning.")
        detail = "Explicit lexical mode; no semantic AI inference." if self.mode == "lexical" else "ONNX model not loaded yet. First analyze or python -m backend.cli warmup downloads the model and runs CPU inference."
        if self._error:
            detail = f"Semantic model unavailable ({self._error}); using honest lexical fallback. No AI inference. Restart or run warmup after resolving model availability."
        return dict(provider="lexical-baseline", ready=False, detail=detail)

    def _load_model(self):
        from fastembed import TextEmbedding
        cache = Path(os.getenv("SHIELDPAY_MODEL_CACHE", str(Path(os.getenv("LOCALAPPDATA", str(Path.home() / ".cache"))) / "ShieldPay" / "models")))
        cache.mkdir(parents=True, exist_ok=True)
        return TextEmbedding(model_name=MODEL_NAME, cache_dir=str(cache), threads=2,
                             providers=["CPUExecutionProvider"], cuda=False)

    def warmup(self):
        if self.mode != "onnx":
            return False
        with self._lock:
            if self._attempted:
                return self._inferred
            self._attempted = True
            try:
                self._model = self._load_model()
                vectors = list(self._model.embed(["delivery proof warmup"], batch_size=1))
                import numpy as np
                if len(vectors) != 1 or vectors[0].shape != (384,) or not np.isfinite(vectors[0]).all():
                    raise ValueError("Unexpected embedding output")
                self._inferred = True
                return True
            except Exception as exc:
                self._error = type(exc).__name__
                self._model = None
                self._inferred = False
                return False

    def rank(self, query, sources):
        if not sources:
            return []
        if self.warmup():
            try:
                import numpy as np
                with self._lock:
                    vectors = list(self._model.embed([query] + [s["text"] for s in sources], batch_size=16))
                matrix = np.asarray(vectors)
                norms = np.linalg.norm(matrix, axis=1)
                if len(vectors) != len(sources) + 1 or not np.isfinite(matrix).all() or not (norms > 0).all():
                    raise ValueError("Invalid inference output")
                scores = (matrix[1:] @ matrix[0]) / (norms[1:] * norms[0])
                ranked = [dict(source_id=s["id"], score=round(float(max(-1, min(1, score))), 6)) for s,score in zip(sources, scores)]
                return sorted(ranked, key=lambda x: (-x["score"], x["source_id"]))
            except Exception as exc:
                self._error = type(exc).__name__
                self._inferred = False
                self._model = None
        terms = set(re.findall(r"[a-z0-9]+", query.lower()))
        ranks = []
        for source in sources:
            words = set(re.findall(r"[a-z0-9]+", source["text"].lower()))
            score = len(terms & words) / max(1, len(terms | words))
            ranks.append(dict(source_id=source["id"], score=round(score, 6)))
        return sorted(ranks, key=lambda x: (-x["score"], x["source_id"]))
