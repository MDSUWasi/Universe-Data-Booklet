# Universe Data Booklet - Production Docker Image
# Python 3.13 base image with the standard library only (no pip install needed at runtime).
FROM python:3.13-slim-bookworm

LABEL maintainer="MDSUWasi"
LABEL org.opencontainers.image.title="Universe Data Booklet"
LABEL org.opencontainers.image.description="Interactive explorer for Near-Earth Asteroids, Exoplanets, and Planetary Terrain"
LABEL org.opencontainers.image.source="https://github.com/MDSUWasi/Universe-Data-Booklet"
LABEL org.opencontainers.image.license="MIT"

# Environment variables with safe production defaults
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    SERVER_PORT=8081 \
    DEBUG_MODE=false \
    NASA_API_KEY=DEMO_KEY \
    REFRESH_THRESHOLD_DAYS=7 \
    MAX_CACHE_AGE_DAYS=90 \
    GZIP_MIN_BYTES=512 \
    STATIC_CACHE_SECONDS=86400 \
    API_CACHE_SECONDS=60 \
    RATE_LIMIT_WINDOW_SECONDS=60 \
    RATE_LIMIT_MAX_REQUESTS=120 \
    HOST=0.0.0.0 \
    ALLOWED_ORIGINS=*

# Create a non-root user for security
RUN groupadd -r appuser && useradd -r -g appuser -d /app appuser

# Set working directory
WORKDIR /app

# Copy requirements first for layer caching
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy the application
COPY . .

# Ensure data directory exists and is writable by appuser
RUN mkdir -p /app/src/data && \
    chown -R appuser:appuser /app && \
    chmod -R 755 /app

# Expose the application port
EXPOSE 8081

# Switch to non-root user
USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python3 -c "import urllib.request; urllib.request.urlopen('http://localhost:8081/api/health')" || exit 1

# Run the server
CMD ["python3", "src/backend/server.py"]