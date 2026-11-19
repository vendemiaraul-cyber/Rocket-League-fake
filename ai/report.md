# Rocket Strike AI: training report

- Trained: 2026-11-19T06:45:19Z with PyTorch 2.15.0+cpu in 136 s
- Topics: 57 (56 with answers + other), example questions: 631, training examples: 23505
- Model: EmbeddingBag(16384×64) → 128 → 57, file size 1149 KB
- New wording it never saw (held-out): **68.2%** right
- Temperature 1.0, confidence threshold: **0.7**: answers 56% of game questions on its own, 90.4% of those right; the rest go to the cloud helper

## Mistakes on held-out questions

- "hey velper grazie" → controls-touch (should be greeting, 0.20)
- "hey helper in rocket strike" → about-helper (should be greeting, 0.16)
- "um hy whaty up" → white-screen (should be greeting, 0.39)
- "im leaving bye" → bot-tips (should be bye, 0.07)
- "help im leavin bye thanks" → helper-modes (should be bye, 0.07)
- "can you tell me im leaving bye help" → score-tips (should be bye, 0.15)
- "what does the pnlse button do??" → controls-keyboard (should be about-helper, 0.19)
- "what is rocket strike" → other (should be what-is-game, 0.85)
- "pls what is rocket strike thanks" → other (should be what-is-game, 0.38)
- "pls what is rocket strike help" → other (should be what-is-game, 0.62)
- "what is rocket stike again" → other (should be what-is-game, 0.74)
- "i want to know who ownsvthis game please" → custom-server (should be who-made, 0.27)
- "question can i  on mobille??" → controls-touch (should be free-download, 0.42)
- "question can i on mobile?" → controls-touch (should be free-download, 0.72)
- "i want to know is tis a" → what-is-game (should be safe, 0.27)
- "pls how to bost on phone now" → free-download (should be controls-touch, 0.35)
- "yo how to boosto n?" → boost (should be controls-touch, 0.94)
- "how do i play on ipad" → free-download (should be controls-touch, 0.68)
- "so how do i play on ipad" → free-download (should be controls-touch, 0.65)
- "can you tell me ho wdo i play on ipad" → free-download (should be controls-touch, 0.38)
- "can you tell me how do i ox ipad now" → free-download (should be controls-touch, 0.30)
- "jumpo n iad on ipad" → free-download (should be jump, 0.34)
- "quick question nirto again" → thanks (should be boost, 0.09)
- "come giro in aria" → name (should be air-roll, 0.13)
- "help me comd giro ina ria !!" → safe (should be air-roll, 0.20)
