FROM oven/bun:1.3.10 AS build
WORKDIR /app
COPY . .
RUN bun install --frozen-lockfile && bun run build:bin

FROM debian:bookworm-slim
ENV PANO_HOST=0.0.0.0 PANO_DATA_DIR=/data
RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --system pano && useradd --system --gid pano --home-dir /data pano \
    && mkdir -p /data && chown pano:pano /data
COPY --from=build /app/dist/pano /usr/local/bin/pano
USER pano
VOLUME ["/data"]
EXPOSE 7777
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 CMD curl --fail --silent "http://127.0.0.1:${PANO_PORT:-7777}/api/v1/health" || exit 1
ENTRYPOINT ["pano"]
CMD ["serve"]
