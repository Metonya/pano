# oven/bun 1.4.4
FROM oven/bun:1.4.4@sha256:1d22548f177f4ff38e0c15baa3c2c46c6c2060ba2d1bc573bb4720b407548f1d AS build
WORKDIR /app
COPY . .
RUN bun install --frozen-lockfile --ignore-scripts && bun run build:bin && mkdir -p /app/empty-data

# distroless cc-debian13 nonroot, 2026-11-09
FROM gcr.io/distroless/cc-debian13:nonroot@sha256:cc66d222f0a7ec996b78a99fe76a969bc80b539a5016ad866c14d1949bc6d0ab
ENV PANO_HOST=0.0.0.0 PANO_DATA_DIR=/data
COPY --from=build /app/dist/pano /usr/local/bin/pano
COPY --from=build --chown=nonroot:nonroot /app/empty-data /data
USER nonroot
VOLUME ["/data"]
EXPOSE 7777
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 CMD ["/usr/local/bin/pano", "healthcheck"]
ENTRYPOINT ["/usr/local/bin/pano"]
CMD ["serve"]
