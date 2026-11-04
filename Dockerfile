FROM node:24-bookworm-slim AS frontend
WORKDIR /frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM python:3.12-slim-bookworm AS runtime
COPY --from=ghcr.io/astral-sh/uv:0.13.6 /uv /uvx /bin/
WORKDIR /app
ENV UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy PYTHONUNBUFFERED=1
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project
COPY backend/ backend/
COPY --from=frontend /frontend/dist frontend/dist
RUN useradd --create-home --uid 10001 shieldpay && mkdir -p /app/data /app/.cache && chown -R shieldpay:shieldpay /app
USER shieldpay
ENV SHIELDPAY_MODE=demo SHIELDPAY_AI=onnx SHIELDPAY_DB=/app/data/shieldpay.sqlite3 PORT=8787
EXPOSE 8787
CMD ["sh", "-c", "uv run --no-sync uvicorn backend.app:app --host 0.0.0.0 --port ${PORT:-8787}"]
