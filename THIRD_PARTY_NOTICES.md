# Third-party notices

Original ShieldPay code: MIT (`LICENSE`). Bundled dependencies retain their own notices. No paid AG Grid Enterprise modules or AG Studio licenses are bundled.

| Component | Purpose | Upstream license / source |
|---|---|---|
| React | Operator interface | MIT · https://github.com/facebook/react |
| Vite | Frontend bundler | MIT · https://github.com/vitejs/vite |
| AG Grid Community | Dispute operations grid | MIT · https://github.com/ag-grid/ag-grid |
| FastAPI | HTTP API | MIT · https://github.com/fastapi/fastapi |
| Uvicorn | ASGI server | BSD-3-Clause · https://github.com/encode/uvicorn |
| HTTPX | PayPal sandbox HTTP client | BSD-3-Clause · https://github.com/encode/httpx |
| ReportLab | Evidence PDF | BSD-style · https://www.reportlab.com/opensource/ |
| DejaVu Sans Mono | Bundled PDF font | DejaVu/Bitstream Vera license and public-domain changes; full notice in `backend/assets/fonts/DejaVu-LICENSE.txt` · font from https://github.com/matplotlib/matplotlib/blob/v3.10.8/lib/matplotlib/mpl-data/fonts/ttf/DejaVuSansMono.ttf · project https://dejavu-fonts.github.io/ |
| FastEmbed | Local semantic retrieval | Apache-2.0 · https://github.com/qdrant/fastembed |
| ONNX Runtime | Model inference | MIT · https://github.com/microsoft/onnxruntime |
| BAAI/bge-small-en-v1.5 | Downloaded embedding weights | MIT (model card) · https://huggingface.co/BAAI/bge-small-en-v1.5 |
| uv | Dependency management / optional container tool | MIT OR Apache-2.0 · https://github.com/astral-sh/uv |

The dependency lockfiles record the resolved package versions and transitive dependencies. Distribution must preserve applicable upstream notices. Model weights are downloaded rather than committed. No PayPal SDK/toolkit or proprietary artwork is falsely represented as bundled. PayPal and other product names are used only to identify integrations; this project is independent and not endorsed by those vendors.
