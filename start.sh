#!/bin/sh
# Serve the static site from ui_kits/website on $PORT (Railway injects this)
npx serve ui_kits/website -l "${PORT:-3000}" --no-clipboard
