#!/usr/bin/env sh
set -e

# Entry point: ensure config directory exists and a default config.json is present
DEFAULT_CONFIG_DIR="/usr/src/app/config"
# Allow overriding config directory via environment variable (useful for local testing)
CONFIG_DIR="${CONFIG_DIR:-$DEFAULT_CONFIG_DIR}"
CONFIG_FILE="$CONFIG_DIR/config.json"

mkdir -p "$CONFIG_DIR"

# Backwards compatibility: if an old single-file mount exists at /usr/src/app/config.json,
# move it into the new config directory name so we keep existing configs.
OLD_SINGLE_CONFIG_FILE="/usr/src/app/config.json"
if [ -f "$OLD_SINGLE_CONFIG_FILE" ] && [ ! -f "$CONFIG_FILE" ]; then
  mv "$OLD_SINGLE_CONFIG_FILE" "$CONFIG_FILE"
  echo "Moved legacy /usr/src/app/config.json to $CONFIG_FILE"
fi

if [ ! -f "$CONFIG_FILE" ]; then
  cat > "$CONFIG_FILE" <<'EOF'
{
  "paperlessApiUrl": "http://192.168.177.168:8000",
  "paperlessApiToken": "",
  "scanOutputDir": "/tmp",
  "scanResolution": 300,
  "defaultTags": ["scanned", "automated"],
  "scannerDeviceUrl": ""
}
EOF
  echo "Created default config at $CONFIG_FILE"
fi

# Execute the main process (use exec so signals are forwarded correctly)
if [ "$SKIP_APP_START" = "1" ] || [ "$1" = "--no-start" ]; then
  echo "SKIP_APP_START set; not starting the app"
  exit 0
fi

exec bun index.ts
