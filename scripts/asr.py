"""Timed Arabic transcript: Silero VAD segments + Whisper (sherpa-onnx, int8, CPU).

usage: python3 scripts/asr.py audio16k.wav [model_dir] [min_silence] [max_speech]
  model_dir   default: sherpa-onnx-whisper-turbo   (turbo >> small on Gulf / Levantine dialect)
  min_silence default 0.3 s  (use 0.08 for word-level chunks)
  max_speech  default 8 s    (use 1.6 for short chunks)
prints:  start - end  text
"""
import sys, glob, wave, numpy as np, sherpa_onnx

wav = sys.argv[1]
d = (sys.argv[2] if len(sys.argv) > 2 else "sherpa-onnx-whisper-turbo").rstrip("/") + "/"
min_sil = float(sys.argv[3]) if len(sys.argv) > 3 else 0.3
max_sp = float(sys.argv[4]) if len(sys.argv) > 4 else 8.0
pick = lambda pat: sorted(glob.glob(d + pat))[0]
rec = sherpa_onnx.OfflineRecognizer.from_whisper(
    encoder=pick("*encoder.int8.onnx"), decoder=pick("*decoder.int8.onnx"), tokens=pick("*tokens.txt"),
    language="ar", task="transcribe", num_threads=2)
w = wave.open(wav); s = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768
c = sherpa_onnx.VadModelConfig(); c.silero_vad.model = "silero_vad.onnx"; c.sample_rate = 16000
c.silero_vad.min_silence_duration = min_sil; c.silero_vad.min_speech_duration = 0.1; c.silero_vad.max_speech_duration = max_sp
vad = sherpa_onnx.VoiceActivityDetector(c, buffer_size_in_seconds=180); n = c.silero_vad.window_size

def drain():
    while not vad.empty():
        seg = vad.front; st = seg.start / 16000; a = np.array(seg.samples); vad.pop()
        t = rec.create_stream(); t.accept_waveform(16000, a); rec.decode_stream(t)
        print(f"{st:6.2f} - {st + len(a) / 16000:6.2f} {t.result.text}", flush=True)

for i in range(0, len(s), n): vad.accept_waveform(s[i:i + n]); drain()
vad.flush(); drain()
