"""Turns a question into feature numbers for Rocket Strike AI.

The game does exactly the same in JavaScript (public/play.html, rsaiFeatures), so any change here must be made
there too (and the model retrained). Features: each word, each pair of neighbouring words, and the 3- and 4-letter
pieces of each word (so typos and word endings still match), hashed with FNV-1a into NB buckets.
"""
import re
import unicodedata

NB = 16384          # hash buckets (rows of the embedding table)
MAX_WORDS = 40
_MARKS = re.compile('[̀-ͯ]')
_NON = re.compile('[^a-z0-9]+')


def norm(text):
    t = unicodedata.normalize('NFKD', str(text).lower())
    t = _MARKS.sub('', t)
    return _NON.sub(' ', t).strip()


def fnv(s):
    h = 2166136261
    for b in s.encode('ascii'):
        h ^= b
        h = (h * 16777619) & 0xFFFFFFFF
    return h


def tokens(text):
    words = norm(text).split()[:MAX_WORDS]
    out = []
    for w in words:
        out.append('w:' + w)
        s = '<' + w + '>'
        for n in (3, 4):
            for i in range(len(s) - n + 1):
                out.append('c:' + s[i:i + n])
    for a, b in zip(words, words[1:]):
        out.append('b:' + a + '_' + b)
    return out


def feats(text):
    return [fnv(t) % NB for t in tokens(text)]
