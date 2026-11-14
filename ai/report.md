# Rocket Strike AI: training report

- Trained: 2026-11-14T21:13:06Z with PyTorch 2.15.0+cpu in 107 s
- Topics: 57 (56 with answers + other), example questions: 629, training examples: 23443
- Model: EmbeddingBag(16384×64) → 128 → 57, file size 1149 KB
- New wording it never saw (held-out): **68.0%** right
- Temperature 1.0, confidence threshold: **0.7**: answers 54% of game questions on its own, 92.2% of those right; the rest go to the cloud helper

## Mistakes on held-out questions

- "hey velper grazie" → boost (should be greeting, 0.36)
- "quick question goobdye !!" → greeting (should be bye, 0.19)
- "what does the pnlse button do??" → controls-keyboard (should be about-helper, 0.19)
- "what is rocket strike" → other (should be what-is-game, 0.84)
- "pls what is rocket strike thanks" → other (should be what-is-game, 0.50)
- "pls what is rocket strike help" → other (should be what-is-game, 0.47)
- "what is rocket stike again" → other (should be what-is-game, 0.97)
- "i want to know epxlainthe game now" → lag (should be what-is-game, 0.10)
- "i want to know who ownsvthis game please" → what-is-game (should be who-made, 0.27)
- "question can i on mobile?" → controls-touch (should be free-download, 0.56)
- "i want to know is tis a" → what-is-game (should be safe, 0.67)
- "how to boost on phone" → free-download (should be controls-touch, 0.38)
- "pls how to bost on phone now" → boost (should be controls-touch, 0.45)
- "how to on phone?" → free-download (should be controls-touch, 0.58)
- "yo how to boosto n?" → boost (should be controls-touch, 0.95)
- "how do i play on ipad" → free-download (should be controls-touch, 0.61)
- "so how do i play on ipad" → free-download (should be controls-touch, 0.66)
- "can you tell me ho wdo i play on ipad" → free-download (should be controls-touch, 0.31)
- "can you tell me how do i ox ipad now" → free-download (should be controls-touch, 0.42)
- "jumpo n iad on ipad" → free-download (should be jump, 0.55)
- "come giro in aria" → safe (should be air-roll, 0.35)
- "help me comd giro ina ria !!" → safe (should be air-roll, 0.25)
- "can you tell me come giro in aria on ipad" → safe (should be air-roll, 0.11)
- "help me coe in aria?" → aerial (should be air-roll, 0.46)
- "can you tell me air drbible?" → air-roll (should be aerial, 0.66)
