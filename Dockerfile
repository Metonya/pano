# oven/bun 1.3.10
FROM oven/bun:1.3.10@sha256:b86c67b531d87b4db11470d9b2bd0c519b1976eee6fcd71634e73abfa6230d2e AS build
WORKDIR /app
COPY . .
RUN bun install --frozen-lockfile --ignore-scripts && bun run build:bin && mkdir -p /app/empty-data

# distroless cc-debian13 nonroot, 2026-11-07
FROM gcr.io/distroless/cc-debian13:nonroot@sha256:08476c244888bfb425bae1ae4dd7c17f093e972aab8426883d97f3c6f280f7c1
ENV PANO_HOST=0.0.0.0 PANO_DATA_DIR=/data
COPY --from=build /app/dist/pano /usr/local/bin/pano
COPY --from=build --chown=nonroot:nonroot /app/empty-data /data
USER nonroot
VOLUME ["/data"]
EXPOSE 7777
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 CMD ["/usr/local/bin/pano", "healthcheck"]
ENTRYPOINT ["/usr/local/bin/pano"]
CMD ["serve"]
