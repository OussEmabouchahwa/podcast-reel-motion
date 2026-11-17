#!/usr/bin/env bash
# One-time setup: node deps, fonts, speech models.
set -euo pipefail
cd "$(dirname "$0")/.."
npm install
G=https://raw.githubusercontent.com/google/fonts/main/ofl
curl -sL -o public/Amiri-Italic.ttf      $G/amiri/Amiri-Italic.ttf
curl -sL -o public/Amiri-BoldItalic.ttf  $G/amiri/Amiri-BoldItalic.ttf
curl -sL -o public/Playfair-Italic.ttf   "$G/playfairdisplay/PlayfairDisplay-Italic%5Bwght%5D.ttf"
pip install --break-system-packages -q sherpa-onnx opencv-python-headless numpy
B=https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models
[ -f silero_vad.onnx ] || curl -sL -o silero_vad.onnx $B/silero_vad.onnx
[ -d sherpa-onnx-whisper-turbo ] || (curl -sL $B/sherpa-onnx-whisper-turbo.tar.bz2 | tar xj)
[ -f src/plan.js ] || cp src/plan.example.js src/plan.js
mkdir -p public/frames public/assets out
echo "ready"
