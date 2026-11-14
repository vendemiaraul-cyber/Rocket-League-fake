# Rocket Strike AI: training report

- Trained: 2026-11-14T20:04:53Z with PyTorch 2.15.0+cpu in 150 s
- Topics: 56 (55 with answers + other), example questions: 604, training examples: 22588
- Model: EmbeddingBag(16384×64) → 128 → 56, file size 1148 KB
- New wording it never saw (held-out): **72.5%** right
- Temperature 1.0, confidence threshold: **0.7**: answers 61% of game questions on its own, 90.3% of those right; the rest go to the cloud helper

## Mistakes on held-out questions

- "hey velper grazie" → boost (should be greeting, 0.49)
- "hey helper in rocket strike" → about-helper (should be greeting, 0.15)
- "quick question goobdye !!" → greeting (should be bye, 0.19)
- "what does the pnlse button do??" → controls-keyboard (should be about-helper, 0.22)
- "i want to know who ownsvthis game please" → what-is-game (should be who-made, 0.30)
- "question can i on mobile?" → controls-touch (should be free-download, 0.55)
- "i want to know is tis a" → what-is-game (should be safe, 0.31)
- "what button is boost on keyboard" → boost (should be controls-keyboard, 0.26)
- "so what button is boost on keyboard !!" → boost (should be controls-keyboard, 0.24)
- "um what button is boost on keyboard??" → boost (should be controls-keyboard, 0.27)
- "yo how to boosto n?" → boost (should be controls-touch, 0.92)
- "how do i play on ipad" → free-download (should be controls-touch, 0.64)
- "so how do i play on ipad" → free-download (should be controls-touch, 0.60)
- "can you tell me ho wdo i play on ipad" → what-is-game (should be controls-touch, 0.29)
- "can you tell me how do i ox ipad now" → free-download (should be controls-touch, 0.57)
- "help me nirto please" → defend-tips (should be boost, 0.30)
- "quick question nirto again" → strikes (should be boost, 0.16)
- "come giro in aria" → score-tips (should be air-roll, 0.14)
- "help me comd giro ina ria !!" → aerial (should be air-roll, 0.20)
- "can you tell me come giro in aria on ipad" → greeting (should be air-roll, 0.08)
- "how to hit the ball harder" → aerial (should be score-tips, 0.91)
- "how to hit the ballharer" → aerial (should be score-tips, 0.74)
- "help me how to hti the ball harder help" → aerial (should be score-tips, 0.17)
- "question how to hit the ball harder now" → aerial (should be score-tips, 0.88)
- "im bad at this game" → what-is-game (should be score-tips, 0.26)
