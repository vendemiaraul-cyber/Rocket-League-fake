"""Writes the trained model in the small format the game reads (public/ai/rs-ai.json + rs-ai.bin).

rs-ai.bin, little-endian: float32 embScale[NB], float32 w1[H*D], float32 b1[H], float32 w2[C*H], float32 b2[C],
then int8 emb[NB*D] (each embedding row is stored as int8 times its row's scale). rs-ai.json says where each part
starts, plus the labels, answers and the confidence threshold.
"""
import json
from pathlib import Path

import numpy as np


def quantize_rows(emb):
    scale = np.abs(emb).max(axis=1) / 127.0
    safe = np.where(scale > 0, scale, 1.0)
    q = np.clip(np.round(emb / safe[:, None]), -127, 127).astype(np.int8)
    return q, scale.astype(np.float32)


def forward_np(q, scale, w1, b1, w2, b2, idx, temp=1.0):
    """The same maths the game does, on the stored (quantized) weights."""
    if not idx:
        return None
    e = (q[idx].astype(np.float32) * scale[idx][:, None]).mean(axis=0)
    h = np.maximum(0, w1 @ e + b1)
    z = (w2 @ h + b2) / temp
    z = z - z.max()
    p = np.exp(z)
    return p / p.sum()


def write(out_dir, emb, w1, b1, w2, b2, labels, answers, meta):
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    q, scale = quantize_rows(np.asarray(emb, np.float32))
    parts = [('embScale', scale), ('w1', np.asarray(w1, np.float32).ravel()), ('b1', np.asarray(b1, np.float32)),
             ('w2', np.asarray(w2, np.float32).ravel()), ('b2', np.asarray(b2, np.float32))]
    offsets, pos, blob = {}, 0, bytearray()
    for name, arr in parts:
        offsets[name] = pos
        b = arr.astype('<f4').tobytes()
        blob += b
        pos += len(b)
    offsets['emb'] = pos
    blob += q.tobytes()
    (out / 'rs-ai.bin').write_bytes(bytes(blob))
    nb, d = q.shape
    h = len(b1)
    info = {'format': 1, 'nb': nb, 'd': d, 'h': h, 'c': len(labels), 'labels': labels, 'answers': answers,
            'offsets': offsets, 'bytes': len(blob), **meta}
    (out / 'rs-ai.json').write_text(json.dumps(info, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    return q, scale
