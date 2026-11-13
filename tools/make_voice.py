#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
重新生成 audio/voice.wav。
用 macOS 自带的 say 念出「啊哈，DeepSeek 其乐无穷啊」，
再降调、降采样、量化，做成有点颗粒感的电子嗓。

依赖：macOS（say / afconvert）、numpy
用法：
    python3 tools/make_voice.py
    python3 tools/make_voice.py --pitch 1.6        # 更低更慢
    python3 tools/make_voice.py --voice Meijia     # 换一个系统发音人
"""

import argparse
import subprocess
import tempfile
import wave
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_OUT = ROOT / "audio" / "voice-deepseek.wav"


def read_wav(path):
    with wave.open(str(path), "rb") as w:
        sr = w.getframerate()
        n = w.getnframes()
        ch = w.getnchannels()
        data = np.frombuffer(w.readframes(n), dtype=np.int16).astype(np.float32) / 32768.0
    if ch == 2:
        data = data.reshape(-1, 2).mean(axis=1)
    return data, sr


def write_wav(path, data, sr):
    data = np.clip(data, -1.0, 1.0)
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes((data * 32767).astype(np.int16).tobytes())


def trim(data, sr, thresh=0.008):
    idx = np.where(np.abs(data) > thresh)[0]
    if not len(idx):
        return data
    start = max(0, idx[0] - int(0.01 * sr))
    end = min(len(data), idx[-1] + int(0.06 * sr))
    return data[start:end]


def resample_linear(data, factor):
    """factor > 1：变慢、变低。"""
    n = int(len(data) * factor)
    x = np.arange(n) / factor
    i0 = np.floor(x).astype(int)
    i1 = np.minimum(i0 + 1, len(data) - 1)
    f = x - i0
    return data[i0] * (1 - f) + data[i1] * f


def highpass(data, sr, fc=220.0):
    rc = 1.0 / (2 * np.pi * fc)
    alpha = rc / (rc + 1.0 / sr)
    out = np.empty_like(data)
    px = 0.0
    py = 0.0
    for i, x in enumerate(data):
        py = alpha * (py + x - px)
        px = x
        out[i] = py
    return out


def lowpass(data, sr, fc=4200.0):
    rc = 1.0 / (2 * np.pi * fc)
    alpha = (1.0 / sr) / (rc + 1.0 / sr)
    out = np.empty_like(data)
    acc = data[0]
    for i, x in enumerate(data):
        acc += alpha * (x - acc)
        out[i] = acc
    return out


def make(src, dst, pitch=0.9, hold=2, levels=192):
    data, sr = read_wav(src)
    data = trim(data, sr)
    data = data / max(1e-6, np.max(np.abs(data)))

    # 降调：重采样会同时拉长时间，正好有那种慢半拍的电子味
    data = resample_linear(data, pitch)

    # 降采样（采样保持）+ 5~6 bit 量化
    if hold > 1:
        data = data[::hold].repeat(hold)[: len(data)]
    data = np.tanh(data * 1.6) / np.tanh(1.6)
    data = highpass(data, sr, 220)
    data = lowpass(data, sr, 4200)
    if levels:
        data = np.round(data * levels) / levels

    # 去掉首尾的咔哒声
    fade = int(0.008 * sr)
    data[:fade] *= np.linspace(0, 1, fade)
    data[-fade:] *= np.linspace(1, 0, fade)
    data = data / max(1e-6, np.max(np.abs(data))) * 0.92

    write_wav(dst, data, sr)
    return len(data) / sr


def main():
    parser = argparse.ArgumentParser(description="生成小霸王开机人声")
    parser.add_argument("--text", default="啊哈，DeepSeek 其乐无穷啊")
    parser.add_argument("--voice", default="Tingting", help="say -v '?' 里看到的发音人")
    parser.add_argument("--rate", type=int, default=140)
    parser.add_argument("--pitch", type=float, default=0.9, help="1.0 原速；<1 更高更快；>1 更低更慢")
    parser.add_argument("--out", default=str(DEFAULT_OUT))
    args = parser.parse_args()

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)

    with tempfile.TemporaryDirectory() as td:
        aiff = Path(td) / "voice.aiff"
        wav = Path(td) / "voice.wav"
        subprocess.run(
            ["say", "-v", args.voice, "-r", str(args.rate), "-o", str(aiff), args.text],
            check=True,
        )
        subprocess.run(
            ["afconvert", "-f", "WAVE", "-d", "LEI16@22050", "-c", "1", str(aiff), str(wav)],
            check=True,
        )
        dur = make(wav, out, pitch=args.pitch)
    print(f"写入 {out} · {dur:.2f}s")


if __name__ == "__main__":
    main()
