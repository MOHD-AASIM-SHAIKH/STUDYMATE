FROM python:3.11-slim

WORKDIR /app

# System deps needed by pdfplumber/pillow and to keep image slim
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download the embedding model and tokenizer at build time so cold
# starts don't pay the download cost (also works offline once baked in).
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')"
RUN python -c "import tiktoken; tiktoken.get_encoding('cl100k_base')"

COPY app ./app
COPY ingested_docs ./ingested_docs

# Render provides $PORT at runtime; default to 8000 for local `docker run`.
ENV PORT=8000
EXPOSE 8000

# storage/ holds Chroma + SQLite data. On Render's free tier (no persistent
# disk) this directory is ephemeral and rebuilt from ingested_docs/ on boot
# (see README "Cold start / persistence" section).
RUN mkdir -p storage/chroma

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]
