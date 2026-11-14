"""Reads ai/brain.md and makes training examples for Rocket Strike AI."""
import random
import re
from pathlib import Path

BRAIN = Path(__file__).with_name('brain.md')


def parse_brain(path=BRAIN):
    """-> list of topics: {id, answer, asks:[...]} in file order. 'other' has no answer."""
    topics, cur, mode = [], None, None
    for raw in Path(path).read_text(encoding='utf-8').splitlines():
        line = raw.rstrip()
        m = re.match(r'^##\s+([a-z0-9-]+)\s*$', line)
        if m:
            cur = {'id': m.group(1), 'answer': [], 'asks': [], 'keywords': []}
            topics.append(cur)
            mode = None
            continue
        if cur is None:
            continue
        if line.strip() == 'Answer:':
            mode = 'answer'
            continue
        if line.strip().startswith('Keywords:'):
            cur['keywords'] = [k.strip() for k in line.strip()[9:].split(',') if k.strip()]
            mode = None
            continue
        if line.strip() == 'Ask like:':
            mode = 'asks'
            continue
        if mode == 'answer':
            cur['answer'].append(line)
        elif mode == 'asks' and line.strip().startswith('- '):
            cur['asks'].append(line.strip()[2:].strip())
    for t in topics:
        t['answer'] = '\n'.join(t['answer']).strip()
        if t['id'] != 'other' and not t['answer']:
            raise ValueError(f"topic {t['id']} has no answer")
        if len(t['asks']) < 5:
            raise ValueError(f"topic {t['id']} needs at least 5 example questions (has {len(t['asks'])})")
    ids = [t['id'] for t in topics]
    if len(set(ids)) != len(ids):
        raise ValueError('two topics have the same name')
    if 'other' not in ids:
        raise ValueError("brain.md needs an 'other' topic")
    return topics


PREFIX = ['', '', '', 'hey ', 'pls ', 'please ', 'help ', 'help me ', 'can you tell me ', 'i want to know ', 'question ',
          'ciao ', 'scusa ', 'yo ', 'um ', 'so ', 'quick question ', 'helper ']
SUFFIX = ['', '', '', '?', '??', ' pls', ' please', ' thanks', ' help', ' in this game', ' in rocket strike', ' grazie',
          ' on ipad', ' now', ' again', ' !!']
KEYS = 'abcdefghijklmnopqrstuvwxyz'
# question shapes that keywords are dropped into, so the model learns which words point to which topic
FRAMES = ['{k}', '{k}?', 'how does {k} work', 'how do i {k}', 'what is {k}', 'help with {k}', '{k} help', 'tell me about {k}',
          'explain {k}', '{k} not working', 'problem with {k}', 'i have a question about {k}', 'what about {k}', 'can you explain {k}',
          'i need help with {k}', 'how to {k}', 'whats {k}', 'question about {k}', 'come funziona {k}', 'aiuto con {k}', 'cosa è {k}',
          'non va {k}', 'domanda su {k}', 'info on {k}', 'is there {k}', 'why {k}', 'where is {k}', 'any tips for {k}']


def typo(s, rng):
    if len(s) < 4:
        return s
    i = rng.randrange(1, len(s) - 1)
    k = rng.random()
    if k < 0.3:
        return s[:i] + s[i + 1:]                       # drop a letter
    if k < 0.6:
        return s[:i - 1] + s[i] + s[i - 1] + s[i + 1:]  # swap two letters
    if k < 0.8:
        return s[:i] + s[i] + s[i:]                     # double a letter
    return s[:i] + rng.choice(KEYS) + s[i + 1:]         # wrong letter


def augment(text, rng):
    t = text
    if rng.random() < 0.5:
        t = t.lower()
    words = t.split()
    if len(words) > 3 and rng.random() < 0.2:
        del words[rng.randrange(len(words))]
    t = ' '.join(words)
    for _ in range(rng.choice([0, 0, 1, 1, 2])):
        t = typo(t, rng)
    return (rng.choice(PREFIX) + t + rng.choice(SUFFIX)).strip()


def make_examples(topics, per_example=30, seed=1, hold_out=0):
    """-> (train [(text, label)], test [(text, label)]). With hold_out=k, k example questions per topic are kept
    out of training (plus typo'd copies of them) to measure how well the model handles new wording."""
    rng = random.Random(seed)
    train, test = [], []
    for li, t in enumerate(topics):
        asks = list(t['asks'])
        rng.shuffle(asks)
        held, used = asks[:hold_out], asks[hold_out:]
        for a in used:
            train.append((a, li))
            for _ in range(per_example):
                train.append((augment(a, rng), li))
        for k in t['keywords']:
            for f in rng.sample(FRAMES, 8):
                train.append((augment(f.format(k=k), rng), li))
        for a in held:
            test.append((a, li))
            for _ in range(3):
                test.append((augment(a, rng), li))
    rng.shuffle(train)
    return train, test
