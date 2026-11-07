#!/bin/sh
set -eu

fail() { printf 'Error: %s\n' "$*" >&2; exit 1; }
os=$(uname -s)
arch=$(uname -m)
case "$os:$arch" in
  Darwin:arm64) asset=pano-darwin-arm64 ;;
  Darwin:x86_64) asset=pano-darwin-x64 ;;
  Linux:x86_64) asset=pano-linux-x64 ;;
  Linux:aarch64|Linux:arm64) asset=pano-linux-arm64 ;;
  *) fail "Unsupported platform $os $arch. Use the Docker option." ;;
esac
if [ "$os" = Linux ]; then
  if (ldd --version 2>&1 || :) | grep -qi musl || ls /lib/ld-musl-*.so.1 >/dev/null 2>&1; then
    fail 'Linux binaries require glibc. This system uses musl; use the Docker option.'
  fi
fi
if command -v curl >/dev/null 2>&1; then downloader=curl
elif command -v wget >/dev/null 2>&1; then downloader=wget
else fail 'Install curl or wget to download Pano.'; fi
if command -v sha256sum >/dev/null 2>&1; then hasher=sha256sum
elif command -v shasum >/dev/null 2>&1; then hasher=shasum
else fail 'Install sha256sum or shasum to verify Pano.'; fi
base=${PANO_DOWNLOAD_BASE:-}
if [ -z "$base" ]; then
  if [ "${PANO_VERSION:-latest}" = latest ]; then base=https://github.com/Metonya/pano/releases/latest/download
  else base=https://github.com/Metonya/pano/releases/download/$PANO_VERSION; fi
fi
tmp=$(mktemp -d) || fail 'Could not create a temporary directory.'
staged=
cleanup() { rm -rf "$tmp"; if [ -n "$staged" ]; then rm -f "$staged"; fi; }
trap cleanup 0
trap 'exit 1' HUP INT TERM
download() {
  url=${base%/}/$1
  if [ "$downloader" = curl ]; then
    status=$(curl -sSL -o "$2" -w '%{http_code}' "$url") || fail "Download failed: $url"
    [ "$status" != 404 ] || fail "Release or asset not found (404): $url. No release may exist yet."
    case "$status" in 2??) ;; *) fail "Download failed (HTTP $status): $url" ;; esac
  else
    if ! wget -q -O "$2" "$url"; then
      fail "Download failed: $url. The release or asset may not exist yet (404)."
    fi
  fi
}
download "$asset" "$tmp/$asset"
download SHA256SUMS.txt "$tmp/SHA256SUMS.txt"
expected=$(awk -v name="$asset" '$2 == name || $2 == "*" name { print $1 }' "$tmp/SHA256SUMS.txt")
case "$expected" in *[!0-9a-fA-F]*|'') fail "Missing or invalid checksum for $asset." ;; esac
[ "${#expected}" -eq 64 ] || fail "Invalid checksum for $asset."
if [ "$hasher" = sha256sum ]; then actual=$(sha256sum "$tmp/$asset"); else actual=$(shasum -a 256 "$tmp/$asset"); fi
actual=${actual%% *}
[ "$(printf '%s' "$expected" | tr 'A-F' 'a-f')" = "$actual" ] || fail 'SHA-256 checksum mismatch. Nothing was installed.'
dir=${PANO_INSTALL_DIR:-$HOME/.local/bin}
mkdir -p "$dir"
staged=$(mktemp "$dir/.pano.XXXXXXXX") || fail 'Could not create a file in the install directory.'
cp "$tmp/$asset" "$staged"
chmod 755 "$staged"
mv -f "$staged" "$dir/pano"
staged=
printf 'Installed Pano to %s/pano\n' "$dir"
case ":${PATH:-}:" in *":$dir:"*) ;; *)
  escaped=$(printf '%s' "$dir" | sed "s/'/'\\\\''/g")
  printf "Add this line to your shell profile:\nexport PATH='%s':\"\$PATH\"\n" "$escaped" ;;
esac
printf 'Run: pano serve\nThen open http://localhost:7777\n'
