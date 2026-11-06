FROM oven/bun:1.3.10 AS build
WORKDIR /app
COPY . .
RUN bun install --frozen-lockfile && bun run build:bin && mkdir -p /app/empty-data

FROM gcr.io/distroless/cc-debian12:nonroot
ENV PANO_HOST=0.0.0.0 PANO_DATA_DIR=/data
COPY --from=build /app/dist/pano /usr/local/bin/pano
COPY --from=build --chown=nonroot:nonroot /app/empty-data /data
USER nonroot
VOLUME ["/data"]
EXPOSE 7777
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 CMD ["/usr/local/bin/pano", "healthcheck"]
ENTRYPOINT ["/usr/local/bin/pano"]
CMD ["serve"]
