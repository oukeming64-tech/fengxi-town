#!/bin/sh
set -eu
cd "$(dirname "$0")/../.."
npx --yes --package=esbuild@0.28.2 esbuild server/browser-model.mjs --bundle --platform=browser --format=esm --target=es2020 --charset=utf8 --outfile=town/assets/resident-ai.mjs
