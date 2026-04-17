# Use Python 3.12 slim image
FROM python:3.12-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PORT=8000
# NLTK: stable path so runtime finds data from image (avoids re-download + RAM spikes)
ENV NLTK_DATA=/opt/nltk_data

# Install system dependencies
# - poppler-utils: for pdf2image
# - libgl1 & libglib2.0-0: for OpenCV/EasyOCR
# - build-essential: to compile some python packages if needed
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    poppler-utils \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    ffmpeg \
    libpq-dev \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements first to leverage Docker cache
COPY requirements.txt .

# Install dependencies
# Set SKIP_HEAVY_ML=1 to create a "Slim" image (Uses Hugging Face API instead of local)
ARG SKIP_HEAVY_ML=1
RUN pip install --no-cache-dir --upgrade pip && \
    if [ "$SKIP_HEAVY_ML" != "1" ]; then \
        pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu; \
    else \
        echo "Skipping heavy ML libraries (torch/torchvision) for Slim build"; \
    fi && \
    pip install --no-cache-dir -r requirements.txt

# Download spaCy models
RUN python -m spacy download en_core_web_sm && \
    python -m spacy download en_core_web_md

# Pre-download NLTK into NLTK_DATA (runtime must match this path)
RUN mkdir -p /opt/nltk_data && python -c "import nltk; nltk.download('punkt', download_dir='/opt/nltk_data'); nltk.download('averaged_perceptron_tagger', download_dir='/opt/nltk_data')"

# Copy the rest of the application
COPY . .

# Expose the port the app runs on (Railway uses PORT env var)
EXPOSE ${PORT}

# Command to run the application
# We use the PORT environment variable provided by Railway
# Single worker avoids loading PyTorch/NLP stacks multiple times (OOM on Railway)
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1"]
