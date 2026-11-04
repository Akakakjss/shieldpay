import os
import pytest
from backend.retrieval import Retriever


def test_failed_onnx_initialization_falls_back_honestly_without_fake_ai(monkeypatch):
    retriever = Retriever("onnx")
    assert retriever.status()["ready"] is False
    assert hasattr(retriever, "warmup"), "real model warmup is not implemented"
    def unavailable():
        raise OSError("offline model cache")
    monkeypatch.setattr(retriever, "_load_model", unavailable)
    assert retriever.warmup() is False
    ranked = retriever.rank("parcel delivered", [dict(id="delivery", text="parcel delivered yesterday"), dict(id="other", text="blue shoes")])
    assert ranked[0]["source_id"] == "delivery"
    assert retriever.status()["provider"] == "lexical-baseline"
    assert retriever.status()["ready"] is False
    assert "OSError" in retriever.status()["detail"]


@pytest.mark.skipif(os.getenv("SHIELDPAY_TEST_ONNX") != "1", reason="Explicit opt-in: downloads and runs a real ONNX model on CPU")
def test_real_onnx_inference_ranks_semantically_related_source():
    retriever = Retriever("onnx")
    assert hasattr(retriever, "warmup"), "real model warmup is not implemented"
    assert retriever.warmup(), retriever.status()
    assert retriever.status()["provider"] == "local-onnx"
    assert retriever.status()["ready"] is True
    sources = [dict(id="fruit", text="Fresh apples and bananas are stocked in the grocery store."),
               dict(id="delivery", text="The courier confirmed the recipient signed for the parcel yesterday afternoon.")]
    ranked = retriever.rank("Evidence that a customer received their shipment", sources)
    assert ranked[0]["source_id"] == "delivery"
    assert ranked[0]["score"] > ranked[1]["score"]
    assert all(-1 <= s["score"] <= 1 for s in ranked)
