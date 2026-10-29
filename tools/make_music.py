#!/usr/bin/env python3
"""Generate a soft ambient bed for the invitation, then encode it to MP3.

Deliberately understated: a tanpura-ish drone on Sa-Pa with sparse bell notes,
so it can sit at low volume under the page without competing with it.

Run:  python tools/make_music.py
Requires ffmpeg on PATH (or the copy that ships with Playwright) for the MP3 step.
"""
import array
import math
import os
import shutil
import struct
import subprocess
import wave

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(ROOT, "assets", "audio")
os.makedirs(OUT_DIR, exist_ok=True)

SR = 22050
DURATION = 48.0
FADE = 2.0

# A minor pentatonic, low octave drone
DRONE = [
    (110.00, 0.30, 0.083),   # A2
    (164.81, 0.22, 0.061),   # E3
    (220.00, 0.16, 0.047),   # A3
    (329.63, 0.07, 0.031),   # E4 (air)
]

# bell notes: (time, frequency, amplitude)
BELLS = [
    (3.0, 440.00, 0.16),
    (7.5, 523.25, 0.13),
    (11.0, 659.25, 0.10),
    (16.5, 440.00, 0.14),
    (20.0, 392.00, 0.11),
    (24.5, 523.25, 0.12),
    (29.0, 659.25, 0.09),
    (33.0, 440.00, 0.13),
    (37.5, 392.00, 0.10),
    (41.0, 523.25, 0.11),
    (44.0, 440.00, 0.09),
]


def bell(env_t: float, freq: float, amp: float) -> float:
    """Struck bell: fast attack, long exponential decay, few partials."""
    if env_t < 0:
        return 0.0
    attack = 0.012
    a = env_t / attack if env_t < attack else 1.0
    decay = math.exp(-env_t / 1.55)
    s = 0.0
    for k, w in ((1.0, 1.0), (2.01, 0.42), (3.02, 0.18), (4.97, 0.07)):
        s += w * math.sin(2 * math.pi * freq * k * env_t)
    return amp * a * decay * s


def main():
    n = int(SR * DURATION)
    samples = array.array("f", [0.0]) * n

    for i in range(n):
        t = i / SR
        v = 0.0
        for freq, amp, lfo in DRONE:
            # slow breathing so the drone never sits perfectly still
            mod = 0.72 + 0.28 * math.sin(2 * math.pi * lfo * t + freq)
            # a touch of second harmonic gives it body without harshness
            v += amp * mod * (math.sin(2 * math.pi * freq * t) + 0.18 * math.sin(4 * math.pi * freq * t))
        samples[i] = v

    for start, freq, amp in BELLS:
        i0 = int(start * SR)
        length = int(3.4 * SR)
        for j in range(length):
            idx = i0 + j
            if idx >= n:
                break
            samples[idx] += bell(j / SR, freq, amp)

    # gentle low-pass (one-pole) to take the edge off
    prev = 0.0
    for i in range(n):
        prev = prev + 0.30 * (samples[i] - prev)
        samples[i] = prev

    # fade in / out so the loop is not a click
    fade_n = int(FADE * SR)
    for i in range(fade_n):
        g = i / fade_n
        samples[i] *= g
        samples[n - 1 - i] *= g

    peak = max(abs(x) for x in samples) or 1.0
    target = 0.30                      # ~ -10 dBFS, sits under speech
    gain = target / peak

    wav_path = os.path.join(OUT_DIR, "theme.wav")
    with wave.open(wav_path, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(SR)
        frames = bytearray()
        for x in samples:
            v = x * gain
            v = max(-1.0, min(1.0, v))
            frames += struct.pack("<h", int(v * 32767))
        wf.writeframes(bytes(frames))
    print(f"wav  {os.path.getsize(wav_path)/1024:.0f} KB  {DURATION:.0f}s")

    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        bundled = os.path.expandvars(
            r"%LOCALAPPDATA%\ms-playwright\ffmpeg-1011\ffmpeg-win64.exe")
        ffmpeg = bundled if os.path.exists(bundled) else None

    mp3_path = os.path.join(OUT_DIR, "theme.mp3")
    if ffmpeg:
        cmd = [ffmpeg, "-y", "-loglevel", "error", "-i", wav_path,
               "-codec:a", "libmp3lame", "-b:a", "96k", "-ar", "44100", mp3_path]
        r = subprocess.run(cmd, capture_output=True, text=True)
        if r.returncode == 0 and os.path.exists(mp3_path):
            os.remove(wav_path)
            print(f"mp3  {os.path.getsize(mp3_path)/1024:.0f} KB  -> {mp3_path}")
            return
        print("ffmpeg failed:", r.stderr[:400])
    print("kept wav (no encoder):", wav_path)


if __name__ == "__main__":
    main()
