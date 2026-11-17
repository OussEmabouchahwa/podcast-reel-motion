#!/usr/bin/env bash
# Voice track for an OFFSET-0 reel: source audio 0..END0, 2.4 s of silence for the end card, cleaned and loudness-normalised.
# usage: scripts/audio.sh source.mp4 END0 out/voice.wav
set -euo pipefail
SRC=$1; END0=$2; OUT=$3
FADE=$(python3 -c "print(round($END0-0.3,3))")
ffmpeg -y -v error -i "$SRC" -filter_complex \
"[0:a]atrim=0:$END0,asetpts=PTS-STARTPTS,aformat=sample_rates=48000:channel_layouts=stereo,afade=t=in:d=0.03,afade=t=out:st=$FADE:d=0.3[m];\
anullsrc=r=48000:cl=stereo,atrim=0:2.4[z];[m][z]concat=n=2:v=0:a=1,highpass=f=70,loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000[o]" \
-map "[o]" "$OUT"
ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUT"
