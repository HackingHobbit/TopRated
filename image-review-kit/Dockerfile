# Portable Top Rated image-review server.
# Stdlib HTTP gallery + SearXNG-backed image search. Data (data/, work/) is
# bind-mounted at runtime — see docker-compose.yml — so only the code is baked
# into the image.
FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY scripts/ ./scripts/

EXPOSE 8099

CMD ["python3", "scripts/review_server.py"]
