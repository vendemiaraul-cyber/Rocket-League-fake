# Rocket Strike AI: training report

- Trained: 2026-11-14T21:02:52Z with PyTorch 2.15.0+cpu in 132 s
- Topics: 57 (56 with answers + other), example questions: 623, training examples: 23257
- Model: EmbeddingBag(16384×64) → 128 → 57, file size 1149 KB
- New wording it never saw (held-out): **73.2%** right
- Temperature 1.0, confidence threshold: **0.65**: answers 62% of game questions on its own, 92.1% of those right; the rest go to the cloud helper

## Mistakes on held-out questions

- "hey velper grazie" → sites (should be greeting, 0.26)
- "what does the pnlse button do??" → controls-keyboard (should be about-helper, 0.13)
- "what is rocket strike" → other (should be what-is-game, 0.62)
- "pls what is rocket strike thanks" → other (should be what-is-game, 0.36)
- "pls what is rocket strike help" → other (should be what-is-game, 0.33)
- "what is rocket stike again" → other (should be what-is-game, 0.89)
- "i want to know epxlainthe game now" → free-download (should be what-is-game, 0.16)
- "i want to know who ownsvthis game please" → what-is-game (should be who-made, 0.30)
- "question can i on mobile?" → controls-touch (should be free-download, 0.55)
- "i want to know is tis a" → what-is-game (should be safe, 0.70)
- "how to on phone?" → free-download (should be controls-touch, 0.67)
- "yo how to boosto n?" → boost (should be controls-touch, 0.95)
- "how do i play on ipad" → free-download (should be controls-touch, 0.61)
- "so how do i play on ipad" → free-download (should be controls-touch, 0.43)
- "can you tell me ho wdo i play on ipad" → what-is-game (should be controls-touch, 0.23)
- "can you tell me how do i ox ipad now" → free-download (should be controls-touch, 0.20)
- "jumpo n iad on ipad" → free-download (should be jump, 0.38)
- "help me nirto please" → invite-link (should be boost, 0.13)
- "quick question nirto again" → controls-keyboard (should be boost, 0.10)
- "come giro in aria" → jump (should be air-roll, 0.19)
- "help me comd giro ina ria !!" → safe (should be air-roll, 0.17)
- "can you tell me come giro in aria on ipad" → score-tips (should be air-roll, 0.14)
- "help me coe in aria?" → aerial (should be air-roll, 0.09)
- "can you tell me air drbible?" → air-roll (should be aerial, 0.34)
- "how to hit the ball harder" → aerial (should be score-tips, 0.65)
