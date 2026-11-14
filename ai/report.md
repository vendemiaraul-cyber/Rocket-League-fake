# Rocket Strike AI: training report

- Trained: 2026-11-14T20:48:56Z with PyTorch 2.15.0+cpu in 94 s
- Topics: 57 (56 with answers + other), example questions: 621, training examples: 23195
- Model: EmbeddingBag(16384×64) → 128 → 57, file size 1149 KB
- New wording it never saw (held-out): **73.0%** right
- Temperature 1.0, confidence threshold: **0.6**: answers 67% of game questions on its own, 90.6% of those right; the rest go to the cloud helper

## Mistakes on held-out questions

- "hey velper grazie" → thanks (should be greeting, 0.21)
- "hey helper in rocket strike" → about-helper (should be greeting, 0.18)
- "quick question goobdye !!" → helper-modes (should be bye, 0.14)
- "what does the pnlse button do??" → controls-keyboard (should be about-helper, 0.21)
- "what is rocket strike" → other (should be what-is-game, 0.87)
- "pls what is rocket strike thanks" → other (should be what-is-game, 0.58)
- "pls what is rocket strike help" → other (should be what-is-game, 0.64)
- "what is rocket stike again" → other (should be what-is-game, 0.83)
- "i want to know epxlainthe game now" → name (should be what-is-game, 0.11)
- "i want to know is tis a" → what-is-game (should be safe, 0.64)
- "how to boost on phone" → free-download (should be controls-touch, 0.57)
- "pls how to bost on phone now" → boost (should be controls-touch, 0.22)
- "yo how to boosto n?" → boost (should be controls-touch, 0.92)
- "how do i play on ipad" → free-download (should be controls-touch, 0.53)
- "so how do i play on ipad" → free-download (should be controls-touch, 0.47)
- "can you tell me ho wdo i play on ipad" → what-is-game (should be controls-touch, 0.35)
- "can you tell me how do i ox ipad now" → free-download (should be controls-touch, 0.39)
- "help me nirto please" → invite-link (should be boost, 0.15)
- "quick question nirto again" → thanks (should be boost, 0.08)
- "come giro in aria" → jump (should be air-roll, 0.35)
- "help me comd giro ina ria !!" → safe (should be air-roll, 0.39)
- "can you tell me come giro in aria on ipad" → safe (should be air-roll, 0.20)
- "help me coe in aria?" → score-tips (should be air-roll, 0.11)
- "how to hit the ball harder" → aerial (should be score-tips, 0.53)
- "how to hit the ballharer" → aerial (should be score-tips, 0.67)
