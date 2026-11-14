# Rocket Strike AI: training report

- Trained: 2026-11-14T20:24:12Z with PyTorch 2.15.0+cpu in 114 s
- Topics: 57 (56 with answers + other), example questions: 616, training examples: 23040
- Model: EmbeddingBag(16384×64) → 128 → 57, file size 1149 KB
- New wording it never saw (held-out): **73.5%** right
- Temperature 1.0, confidence threshold: **0.6**: answers 68% of game questions on its own, 90.1% of those right; the rest go to the cloud helper

## Mistakes on held-out questions

- "hey velper grazie" → thanks (should be greeting, 0.37)
- "hey helper in rocket strike" → about-helper (should be greeting, 0.13)
- "what does the pnlse button do??" → controls-keyboard (should be about-helper, 0.23)
- "what is rocket strike" → other (should be what-is-game, 0.91)
- "pls what is rocket strike thanks" → other (should be what-is-game, 0.79)
- "pls what is rocket strike help" → other (should be what-is-game, 0.78)
- "what is rocket stike again" → other (should be what-is-game, 0.93)
- "i want to know epxlainthe game now" → thanks (should be what-is-game, 0.14)
- "i want to know who ownsvthis game please" → what-is-game (should be who-made, 0.28)
- "question can i on mobile?" → controls-touch (should be free-download, 0.43)
- "i want to know is tis a" → what-is-game (should be safe, 0.66)
- "how to boost on phone" → free-download (should be controls-touch, 0.37)
- "pls how to bost on phone now" → boost (should be controls-touch, 0.37)
- "how to on phone?" → free-download (should be controls-touch, 0.62)
- "yo how to boosto n?" → boost (should be controls-touch, 0.95)
- "how do i play on ipad" → free-download (should be controls-touch, 0.51)
- "so how do i play on ipad" → free-download (should be controls-touch, 0.50)
- "can you tell me ho wdo i play on ipad" → what-is-game (should be controls-touch, 0.28)
- "can you tell me how do i ox ipad now" → free-download (should be controls-touch, 0.50)
- "come giro in aria" → jump (should be air-roll, 0.18)
- "help me comd giro ina ria !!" → safe (should be air-roll, 0.21)
- "can you tell me come giro in aria on ipad" → about-helper (should be air-roll, 0.08)
- "help me coe in aria?" → settings (should be air-roll, 0.22)
- "can you tell me air drbible?" → air-roll (should be aerial, 0.56)
- "how to hit the ball harder" → aerial (should be score-tips, 0.33)
