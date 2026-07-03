#!/usr/bin/env bash
# Abre o telão em modo kiosk no Chromium/Chrome.
# Uso: ./scripts/kiosk-linux.sh [URL] [X] [Y]
#   URL: endereço do telão (padrão http://localhost:4700)
#   X,Y: posição da janela — use para mandar o telão para o segundo monitor,
#        ex.: ./scripts/kiosk-linux.sh http://localhost:4700 1920 0

URL="${1:-http://localhost:4700}"
POS_X="${2:-0}"
POS_Y="${3:-0}"

BROWSER="$(command -v chromium || command -v chromium-browser || command -v google-chrome)"
if [ -z "$BROWSER" ]; then
  echo "Chromium/Chrome não encontrado. Instale com: sudo apt install chromium-browser"
  exit 1
fi

exec "$BROWSER" \
  --kiosk "$URL" \
  --window-position="${POS_X},${POS_Y}" \
  --noerrdialogs \
  --disable-infobars \
  --autoplay-policy=no-user-gesture-required \
  --no-first-run
