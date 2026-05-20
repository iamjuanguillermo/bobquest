#!/usr/bin/env bash
set -euo pipefail

DOWNLOAD_DIR="${1:-/workspace/bob-download}"
TARBALL="${BOBSHELL_TARBALL:-bobshell-1.0.4.tgz}"
INSTALL_DIR="${BOBSHELL_INSTALL_DIR:-/opt/bobshell}"
BIN_LINK="${BOBSHELL_BIN_LINK:-/usr/local/bin/bob}"

if [ ! -d "$DOWNLOAD_DIR" ]; then
  echo "Missing Bob Shell download directory: $DOWNLOAD_DIR" >&2
  exit 1
fi

if [ ! -f "$DOWNLOAD_DIR/$TARBALL" ]; then
  echo "Missing Bob Shell installer tarball: $DOWNLOAD_DIR/$TARBALL" >&2
  exit 1
fi

if [ ! -f "$DOWNLOAD_DIR/SHA256SUMS.txt" ]; then
  echo "Missing Bob Shell checksum file: $DOWNLOAD_DIR/SHA256SUMS.txt" >&2
  exit 1
fi

if ! grep -F "  $TARBALL" "$DOWNLOAD_DIR/SHA256SUMS.txt" >/dev/null; then
  echo "Checksum file does not contain expected tarball entry: $TARBALL" >&2
  exit 1
fi

(
  cd "$DOWNLOAD_DIR"
  sha256sum -c SHA256SUMS.txt
)

rm -rf "$INSTALL_DIR"
mkdir -p "$INSTALL_DIR"
tar -xzf "$DOWNLOAD_DIR/$TARBALL" -C "$INSTALL_DIR" --strip-components=1
chmod +x "$INSTALL_DIR/bundle/bob.js"
ln -sf "$INSTALL_DIR/bundle/bob.js" "$BIN_LINK"

if command -v bob >/dev/null 2>&1; then
  bob --version
else
  "$BIN_LINK" --version
fi
