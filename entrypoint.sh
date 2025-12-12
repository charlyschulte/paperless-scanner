#!/usr/bin/env sh
set -e

# Entry point: ensure config directory exists and a default config.json is present
CONFIG_DIR="/usr/src/app/config"
CONFIG_FILE="$CONFIG_DIR/config.json"

mkdir -p "$CONFIG_DIR"

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
exec bun index.ts
