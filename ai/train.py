"""Trains Rocket Strike AI with PyTorch from ai/brain.md and writes it for the game.

    pip install torch numpy        (the CPU build is enough: the model is small)
    python ai/train.py

Writes public/ai/rs-ai.json + public/ai/rs-ai.bin (what the game loads), ai/golden.json (test questions with the
expected answers, so the game's JavaScript can be checked against PyTorch) and ai/report.md (how well it did).

The model: every question becomes a bag of hashed features (ai/features.py). Each feature has a learned vector
(an EmbeddingBag); their average goes through a small neural network (one hidden layer) that scores every topic.
The best topic wins if the model is confident enough; otherwise the game asks the cloud helper.
"""
import json
import random
import sys
import time
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn

sys.path.insert(0, str(Path(__file__).parent))
import data            # noqa: E402
import export          # noqa: E402
from features import NB, feats  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
D, H = 64, 128
EPOCHS, BATCH, LR = 30, 64, 3e-3
SEED = 7


class RSAI(nn.Module):
    def __init__(self, classes):
        super().__init__()
        self.emb = nn.EmbeddingBag(NB, D, mode='mean')
        self.fc1 = nn.Linear(D, H)
        self.fc2 = nn.Linear(H, classes)
        self.drop = nn.Dropout(0.2)
        nn.init.normal_(self.emb.weight, 0, 0.1)

    def forward(self, idx, offsets):
        x = self.drop(self.emb(idx, offsets))
        return self.fc2(self.drop(torch.relu(self.fc1(x))))


def batches(samples, shuffle):
    order = list(range(len(samples)))
    if shuffle:
        random.shuffle(order)
    for s in range(0, len(order), BATCH):
        chunk = [samples[i] for i in order[s:s + BATCH]]
        idx, offs, ys = [], [], []
        for f, y in chunk:
            offs.append(len(idx))
            idx.extend(f if f else [0])
            ys.append(y)
        yield torch.tensor(idx), torch.tensor(offs), torch.tensor(ys)


def train(examples, classes):
    torch.manual_seed(SEED)
    random.seed(SEED)
    samples = [(feats(t), y) for t, y in examples]
    model = RSAI(classes)
    opt = torch.optim.AdamW(model.parameters(), lr=LR, weight_decay=1e-4)
    sched = torch.optim.lr_scheduler.CosineAnnealingLR(opt, EPOCHS)
    lossf = nn.CrossEntropyLoss(label_smoothing=0.05)
    for ep in range(EPOCHS):
        model.train()
        total = 0.0
        for idx, offs, ys in batches(samples, True):
            opt.zero_grad()
            loss = lossf(model(idx, offs), ys)
            loss.backward()
            opt.step()
            total += loss.item() * len(ys)
        sched.step()
        if ep % 5 == 4 or ep == EPOCHS - 1:
            print(f'  epoch {ep + 1:2d}  loss {total / len(samples):.4f}', flush=True)
    model.eval()
    return model


def weights(model):
    g = lambda t: t.detach().cpu().numpy().astype(np.float32)  # noqa: E731
    return g(model.emb.weight), g(model.fc1.weight), g(model.fc1.bias), g(model.fc2.weight), g(model.fc2.bias)


def evaluate(qw, examples, other, temp=1.0):
    """-> list of (prob, predicted, true) using the stored (quantized) weights, exactly like the game."""
    out = []
    for text, y in examples:
        p = export.forward_np(*qw, feats(text), temp=temp)
        if p is None:
            out.append((0.0, other, y))
        else:
            k = int(p.argmax())
            out.append((float(p[k]), k, y))
    return out


def calibrate(qw, examples):
    """Temperature that makes the confidence honest on new wording (lowest log-loss on the held-out questions)."""
    best, best_loss = 1.0, 1e9
    for temp in (1.0, 1.25, 1.5, 2.0, 2.5, 3.0, 4.0, 5.0, 6.0):
        loss = 0.0
        for text, y in examples:
            p = export.forward_np(*qw, feats(text), temp=temp)
            loss -= np.log((p[y] if p is not None else 1e-3) + 1e-9)
        if loss < best_loss:
            best, best_loss = temp, loss
    return best


def pick_threshold(results, other, target=0.9):
    """Lowest confidence at which its own answers on new wording are right at least 90% of the time."""
    for th in [x / 100 for x in range(30, 96, 5)]:
        answered = [(k, y) for p, k, y in results if p >= th and k != other]
        if answered and sum(k == y for k, y in answered) / len(answered) >= target:
            return th
    return 0.95


def main():
    t0 = time.time()
    topics = data.parse_brain()
    labels = [t['id'] for t in topics]
    other = labels.index('other')
    answers = {t['id']: t['answer'] for t in topics if t['id'] != 'other'}
    print(f'{len(topics)} topics, {sum(len(t["asks"]) for t in topics)} example questions')

    # 1) measure: train without 2 questions per topic, test on those (and typo'd copies)
    tr, te = data.make_examples(topics, hold_out=2, seed=SEED)
    print(f'check run: {len(tr)} training examples, {len(te)} held-out')
    m = train(tr, len(labels))
    e, w1, b1, w2, b2 = weights(m)
    q, s = export.quantize_rows(e)
    temp = calibrate((q, s, w1, b1, w2, b2), te)
    res = evaluate((q, s, w1, b1, w2, b2), te, other, temp)
    acc = sum(k == y for _, k, y in res) / len(res)
    th = pick_threshold(res, other)
    answered = [(k, y) for p, k, y in res if p >= th and k != other]
    coverage = len(answered) / max(1, sum(1 for _, _, y in res if y != other))
    precision = sum(k == y for k, y in answered) / max(1, len(answered))
    misses = [(te[i][0], labels[k], labels[y], p) for i, (p, k, y) in enumerate(res) if k != y][:25]
    print(f'held-out accuracy {acc:.3f}, temperature {temp}, threshold {th}, answers {coverage:.2%} of game questions at {precision:.2%} precision')

    # 2) final model on everything
    full, _ = data.make_examples(topics, hold_out=0, seed=SEED)
    print(f'final run: {len(full)} training examples')
    m = train(full, len(labels))
    e, w1, b1, w2, b2 = weights(m)
    meta = {'threshold': th, 'temperature': temp, 'trainedAt': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), 'examples': len(full),
            'heldOutAccuracy': round(acc, 4), 'torch': torch.__version__, 'features': 'fnv1a-words-bigrams-char34-v1'}
    q, s = export.write(ROOT / 'public' / 'ai', e, w1, b1, w2, b2, labels, answers, meta)

    # golden questions: what PyTorch's weights say, for checking the game's JavaScript
    qs = [a for t in topics for a in t['asks'][:1]] + ['how do i fliip', 'COME FACCIO IL FLIP??', 'my game lags on ipad',
                                                       'what is the meaning of life', '']
    golden = []
    for text in qs:
        p = export.forward_np(q, s, w1, b1, w2, b2, feats(text), temp=temp)
        golden.append({'text': text, 'feats': feats(text)[:8], 'top': labels[int(p.argmax())] if p is not None else None,
                       'p': round(float(p.max()), 5) if p is not None else 0})
    (ROOT / 'ai' / 'golden.json').write_text(json.dumps(golden, ensure_ascii=False, indent=1), encoding='utf-8')

    lines = ['# Rocket Strike AI: training report', '',
             f'- Trained: {meta["trainedAt"]} with PyTorch {torch.__version__} in {time.time() - t0:.0f} s',
             f'- Topics: {len(labels)} ({len(answers)} with answers + other), example questions: '
             f'{sum(len(t["asks"]) for t in topics)}, training examples: {len(full)}',
             f'- Model: EmbeddingBag({NB}×{D}) → {H} → {len(labels)}, file size {(ROOT / "public/ai/rs-ai.bin").stat().st_size // 1024} KB',
             f'- New wording it never saw (held-out): **{acc:.1%}** right',
             f'- Temperature {temp}, confidence threshold: **{th}**: answers {coverage:.0%} of game questions on its own, {precision:.1%} of those right;'
             ' the rest go to the cloud helper', '', '## Mistakes on held-out questions', '']
    lines += [f'- "{t}" → {got} (should be {want}, {p:.2f})' for t, got, want, p in misses] or ['- none']
    (ROOT / 'ai' / 'report.md').write_text('\n'.join(lines) + '\n', encoding='utf-8')
    print('done in', round(time.time() - t0), 's')


if __name__ == '__main__':
    main()
