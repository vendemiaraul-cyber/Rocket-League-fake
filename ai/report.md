# Rocket Strike AI: training report

- Trained: 2026-11-14T20:38:44Z with PyTorch 2.15.0+cpu in 87 s
- Topics: 57 (56 with answers + other), example questions: 619, training examples: 23133
- Model: EmbeddingBag(16384×64) → 128 → 57, file size 1149 KB
- New wording it never saw (held-out): **71.5%** right
- Temperature 1.0, confidence threshold: **0.65**: answers 62% of game questions on its own, 90.6% of those right; the rest go to the cloud helper

## Mistakes on held-out questions

- "help im leavin bye thanks" → other (should be bye, 0.24)
- "hey what arelyou" → helper-modes (should be about-helper, 0.44)
- "what does the pnlse button do??" → controls-keyboard (should be about-helper, 0.33)
- "what is rocket strike" → other (should be what-is-game, 0.96)
- "pls what is rocket strike thanks" → other (should be what-is-game, 0.80)
- "pls what is rocket strike help" → other (should be what-is-game, 0.79)
- "what is rocket stike again" → other (should be what-is-game, 0.90)
- "i want to know epxlainthe game now" → thanks (should be what-is-game, 0.20)
- "i want to know who ownsvthis game please" → what-is-game (should be who-made, 0.27)
- "ciao can i trust thi site" → sites (should be safe, 0.56)
- "i want to know is tis a" → what-is-game (should be safe, 0.71)
- "how to boost on phone" → free-download (should be controls-touch, 0.65)
- "pls how to bost on phone now" → boost (should be controls-touch, 0.29)
- "how to on phone?" → free-download (should be controls-touch, 0.67)
- "yo how to boosto n?" → boost (should be controls-touch, 0.91)
- "how do i play on ipad" → free-download (should be controls-touch, 0.47)
- "so how do i play on ipad" → free-download (should be controls-touch, 0.42)
- "can you tell me ho wdo i play on ipad" → what-is-game (should be controls-touch, 0.25)
- "can you tell me how do i ox ipad now" → free-download (should be controls-touch, 0.47)
- "help me nirto please" → defend-tips (should be boost, 0.20)
- "quick question nirto again" → score-tips (should be boost, 0.11)
- "come giro in aria" → safe (should be air-roll, 0.18)
- "help me comd giro ina ria !!" → safe (should be air-roll, 0.17)
- "can you tell me come giro in aria on ipad" → safe (should be air-roll, 0.14)
- "help me coe in aria?" → aerial (should be air-roll, 0.32)
