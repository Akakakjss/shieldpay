"""Run with uv run python -m backend.cli warmup."""
import argparse
import json
from backend.config import Settings
from backend.retrieval import Retriever, MODEL_NAME


def main(argv=None):
    parser = argparse.ArgumentParser(description="ShieldPay local AI readiness tools")
    parser.add_argument("command", choices=["warmup"], help="Download/cache the ONNX model and run real CPU semantic inference")
    args = parser.parse_args(argv)
    Settings.from_env()
    retriever = Retriever("onnx")
    ready = retriever.warmup()
    result = {"model": MODEL_NAME, **retriever.status()}
    if ready:
        result["retrieval"] = retriever.rank("Evidence a customer received their shipment", [
            {"id": "delivery", "text": "The courier confirmed the recipient signed for the parcel yesterday."},
            {"id": "unrelated", "text": "Fresh fruit is stocked in the grocery store."}])
        result.update(retriever.status())
    print(json.dumps(result, indent=2))
    return 0 if result["ready"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
