# Rocket Strike AI: the brain

This file is the brain of **Rocket Strike AI**, the game's own helper model. It's trained with PyTorch from this file
(`ai/train.py`), by the GitHub Action in `.github/workflows/train-ai.yml`, every time this file changes on `main`.
The trained model (`public/ai/rs-ai.json` + `public/ai/rs-ai.bin`, about 1 MB) runs inside the game, on the
player's own device: no server, no limits.

How it works: each `##` topic below has an **Answer** and a list of ways players **ask** for it. The model learns to
recognise which topic a question is about (also with typos, other wording, English or Italian) and gives that answer.
When it isn't sure, or the question is about something else, the game passes the question to the cloud helper
(gpt-oss on the game server) instead.

How to teach it something new:
1. Add a topic: `## topic-name`, then `Answer:` with the reply, `Keywords:` (words and short phrases that mean this
   topic, comma-separated, English and Italian), then `Ask like:` with at least 8 example questions.
2. Or add more example questions to a topic it gets wrong.
3. Push to `main`. The Action retrains the model and commits the new files; the sites update by themselves.

Rules for answers: short, friendly, plain words for young players, correct for the current game. Markdown allowed:
`**bold**`, lists with `- `. The `other` topic has no answer: questions like those go to the cloud helper.

## greeting
Answer:
Hi! 😊 I'm the Rocket Strike helper. Ask me about controls, tricks, multiplayer, settings or any problem, or tap the pulse button and I'll run a check.
Keywords: hi, hello, hey, ciao, salve, buongiorno, good morning, good evening, whats up, sup
Ask like:
- hi
- hello
- hey there
- yo
- good morning
- ciao
- salve
- hey helper
- hello orb
- hi there how are you
- buongiorno
- hey whats up

## thanks
Answer:
You're welcome! Have fun out there, and ask me anytime. 🚀
Keywords: thanks, thank you, thx, ty, grazie, grazie mille, appreciate it, cheers
Ask like:
- thanks
- thank you
- thx
- thanks a lot
- grazie
- grazie mille
- ty
- that helped thanks
- ok thanks
- perfect thank you
- cool thanks
- great, thanks for the help

## bye
Answer:
See you on the pitch! Tap me whenever you need help. 👋
Keywords: bye, goodbye, see you, see ya, arrivederci, good night, buonanotte, later, gotta go
Ask like:
- bye
- goodbye
- see you
- ciao ciao
- see ya later
- gotta go
- arrivederci
- good night
- im leaving bye
- later

## about-helper
Answer:
I'm the Rocket Strike helper: the orb with the face. I run right here on your device, so I answer instantly. For harder questions I ask the cloud helper on the game server. My mini helpers search the game's code, the web (SearXNG) or Wikipedia first, so that costs just one cloud call.
- Drag me anywhere.
- Tap me to open the text bar; tap me again to close it.
- The pulse button runs a check of your game.
Keywords: who are you, what are you, the helper, the orb, this assistant, you, chi sei, the ai, pulse button, chatbot
Ask like:
- who are you
- what are you
- what can you do
- are you an ai
- how do you work
- what is this orb
- chi sei
- cosa sai fare
- are you chatgpt
- how do i use the helper
- can i move the orb
- what does the pulse button do

## what-is-game
Answer:
**Rocket Strike** is rocket-car football in your browser: drive, boost, jump and flip to hit a giant ball into the other team's goal. Play against the bot, or online with friends through invite links. No download, no account, free.
Keywords: this game, rocket strike, how to play, the goal of the game, the point of the game, come si gioca, gameplay, rocket league
Ask like:
- what is this game
- what is rocket strike
- how do i play this
- what do i do in this game
- whats the goal of the game
- cos'è questo gioco
- come si gioca
- is this rocket league
- explain the game
- how do you win

## who-made
Answer:
Rocket Strike was made with AI by a young creator who is learning to code. It's open: anyone can read the source code (Settings → Proof has the link), and the community is on Discord.
Keywords: who made, creator, developer, who created, who coded, chi ha fatto, chi ha creato, the author, made with ai
Ask like:
- who made this game
- who is the creator
- who made rocket strike
- chi ha fatto questo gioco
- who coded this
- is this made by ai
- who is the developer
- who built this
- did a kid make this
- who owns this game

## free-download
Answer:
It's **free** and runs in the browser: nothing to download or install, no account, no ads, no passwords. It works on computers, phones and tablets (like iPad) in Safari or Chrome.
Keywords: free, download, install, account, sign up, app, gratis, price, cost, ipad, phone, mobile, devices
Ask like:
- is it free
- do i need to download anything
- do i need an account
- does it cost money
- is there an app
- è gratis
- can i play on ipad
- does it work on phone
- can i play on mobile
- do i need to sign up
- which devices work
- does it work on chromebook

## safe
Answer:
Yes, it's safe: **0 viruses**, no downloads, no ads or trackers, and it never asks for passwords or payment. Your name and settings are saved only in your browser. Settings → **Proof** lists every link the game uses, so you can check (even on VirusTotal).
Keywords: safe, virus, viruses, malware, scam, trust, tracking, data, privacy, sicuro, ads, hack my device
Ask like:
- is this safe
- does it have viruses
- is this a virus
- can i trust this site
- is it a scam
- è sicuro
- does it steal my data
- does it track me
- are there ads
- is my information safe
- malware

## controls-keyboard
Answer:
Keyboard controls:
- **W / S** or arrows: drive and reverse
- **A / D**: steer
- **SPACE**: jump (press again in the air to flip)
- **SHIFT** or **L**: boost
- **Q / E**: air roll
- **C**: ball camera on/off
- **ENTER**: chat (online)
Keywords: controls, keys, keyboard, buttons, comandi, tastiera, key bindings, wasd, shift, space
Ask like:
- what are the controls
- keyboard controls
- how do i move
- which keys
- controls pc
- come si gioca con la tastiera
- what button is boost on keyboard
- comandi
- how do i drive with keyboard
- key bindings
- what does shift do
- what does c do

## controls-touch
Answer:
Touch controls (phone/tablet): drag on the **left side** of the screen to drive and steer (it's a stick), and use the on-screen **JUMP**, **BOOST**, **CAM** and **CHAT** buttons. Tap JUMP again in the air to flip.
Keywords: touch, touch screen, ipad controls, phone controls, joystick, tablet, mobile controls, comandi touch, on screen buttons
Ask like:
- touch controls
- how do i play on ipad
- how to move on phone
- controls on tablet
- how do i steer on touch screen
- comandi touch
- where is the joystick
- how do i drive on mobile
- ipad controls
- how to boost on phone
- there is no keyboard how do i play

## controls-gamepad
Answer:
Controller: **left stick** steers and pitches in the air, **right trigger** drives, **left trigger** reverses, **A / Cross** jumps (again to flip), **B / X** boosts, **LB / RB** air roll. Plug it in or pair it, then press a button.
Keywords: controller, gamepad, joypad, xbox, playstation, ps4, ps5, switch controller, joystick controller
Ask like:
- can i use a controller
- gamepad controls
- xbox controller
- ps5 controller
- joypad
- controller support
- posso usare il controller
- does it work with a gamepad
- controller buttons
- how to boost on controller

## flip
Answer:
To **flip**: jump, then within 1.5 seconds press jump again **while holding a direction** (forward, back or sideways). The flip gives a burst of speed and a strong hit, so flip into the ball for power shots. Jump again with no direction for a double jump instead.
Keywords: flip, flips, dodge, front flip, backflip, side flip, double jump, capriola, flip doesnt work
Ask like:
- how do i flip
- how to do a flip
- how do i dodge
- front flip
- how do you do a flip
- come faccio il flip
- come si fa la capriola
- flip doesnt work
- how to do a side flip
- double jump
- how do i do a backflip
- what is a dodge

## jump
Answer:
Press **SPACE** (or **JUMP** on touch, **A** on a controller) to jump. Press it again in the air: with a direction you **flip**, without one you **double jump**. The bot jumps at balls about 3.4 to 7 m high.
Keywords: jump, jumping, salto, saltare, jump higher, jump button, cant jump
Ask like:
- how do i jump
- jump button
- how to jump higher
- come si salta
- my car wont jump
- how high can i jump
- what button jumps
- jump on ipad
- how to get the ball in the air
- salto

## boost
Answer:
Hold **SHIFT** or **L** (or **BOOST** on touch, **B** on a controller) to boost. You have up to 100 boost: small pads give 12, big glowing pads give 100. Pads come back after 4 s (small) or 10 s (big). Top speed is 26 without boost and 44 with it.
Keywords: boost, turbo, nitro, go faster, boost pads, speed, run out of boost, orange pads, velocità
Ask like:
- how do i boost
- boost button
- how to go faster
- how to get more boost
- where is the boost
- come si usa il boost
- my boost ran out
- what are the orange pads
- big boost pads
- how fast can i go
- turbo
- nitro

## air-roll
Answer:
In the air, use **Q / E** (or **LB / RB** on a controller) to roll the car, and **W / S** to tilt the nose up or down. Use it to land on your wheels and line up aerial hits.
Keywords: air roll, rotate in the air, roll, land on wheels, upside down, tilt, air control, q and e
Ask like:
- how do i air roll
- how to rotate in the air
- how to control the car in the air
- my car lands upside down
- air control
- come giro in aria
- how to tilt the car
- what do q and e do
- how do i land properly
- pitch in the air

## aerial
Answer:
**Aerials**: jump, tilt the car back (pull back / S), then hold **boost** and keep boosting to fly up to the ball. Steer with tilt and air roll. Start with balls just above the car and go higher as you get the timing.
Keywords: aerial, fly, flying, air dribble, high ball, reach the ball in the air, volare, hit in the air
Ask like:
- how do i fly
- how to do an aerial
- how to hit the ball in the air
- can the car fly
- aerial tutorial
- come si vola
- how to reach high balls
- flying car
- how to boost in the air
- air dribble

## ball-camera
Answer:
Press **C** (or **CAM** on touch) to switch the **ball camera** on and off. On keeps the ball in view; off looks where you're driving. Most players keep it on and switch it off to grab boost or line up a shot.
Keywords: camera, ball cam, ball camera, cant see the ball, view, telecamera, cam button, look around
Ask like:
- how does the camera work
- ball cam
- i cant see the ball
- change camera
- camera button
- come cambio la telecamera
- what is cam
- the camera is weird
- how to look around
- turn off ball camera

## score-tips
Answer:
Tips to score more:
- Come at the ball **from behind**, facing the other goal.
- **Flip into the ball** for a power shot.
- Use **ball camera** to keep track of it.
- Grab small boost pads on the way; save the big ones.
- Shoot when the ball is rolling toward you, not away.
Keywords: score, scoring, goals, shoot, shot, aim, tips, get better, gol, segnare, consigli, improve
Ask like:
- how do i score
- tips to score more
- how to get better
- i cant score
- how to shoot
- come faccio gol
- consigli
- give me tips
- how to hit the ball harder
- how to aim
- how to win more
- im bad at this game

## defend-tips
Answer:
Defending tips: get back **between the ball and your goal**, face the ball, and don't chase it into the corners with your teammate. Clear it up the sides rather than across your own goal. Keep some boost for a save.
Keywords: defend, defense, save, saves, goalkeeper, block, difendere, parare, stop goals
Ask like:
- how do i defend
- how to save
- how to stop goals
- they keep scoring
- defense tips
- come si difende
- how to be a goalkeeper
- how to block shots
- the bot always scores
- how do i make saves

## bot-tips
Answer:
Beating the bot: wait for it to commit to a hit, then take the ball past it. It jumps at balls about 3.4 to 7 m high, so keep shots low or go very high. Flip shots and shots off the side walls catch it out.
Keywords: bot, beat the bot, the ai opponent, computer player, bot too hard, bot cheating, battere il bot
Ask like:
- how do i beat the bot
- the bot is too good
- bot tips
- how to win against the bot
- come batto il bot
- the ai is unfair
- bot always wins
- how does the bot play
- is the bot cheating
- bot is hard

## goal-kickoff
Answer:
After a **goal** there's a slow-motion explosion, then a **kickoff**: everyone goes back to their spawn spot and a 3-2-1 countdown starts. Rush the ball at kickoff, or wait and pick up the ball after the first touch.
Keywords: kickoff, after a goal, slow motion, countdown, reset, spawn, explosion, calcio d inizio
Ask like:
- what happens after a goal
- what is kickoff
- how does kickoff work
- why is it slow motion
- countdown after goal
- cosa succede dopo un gol
- reset after goal
- where do i spawn
- the game reset
- explosion after goal

## match-length
Answer:
Matches last **2 minutes** by default. If you run matches on your own device (Settings → Custom server → Run on my device), you can pick 2, 3 or 5 minutes in **Customs**.
Keywords: match length, how long, minutes, time limit, timer, duration, durata, overtime, game time
Ask like:
- how long is a match
- match time
- how long are games
- can i make matches longer
- quanto dura una partita
- change match length
- time limit
- how many minutes
- when does the game end
- overtime

## multiplayer
Answer:
Tap **MULTIPLAYER** to see the server list. **HOST SERVER** creates a match that everyone who opens the game can see, or **join** one from the list. Up to 6 players; teams are balanced and a bot fills an empty spot. Players on any Rocket Strike site play together.
Keywords: online, multiplayer, play with friends, other players, pvp, 2v2, 3v3, amici, giocare online, how many players
Ask like:
- how do i play online
- multiplayer
- how to play with friends
- how do i play with others
- online mode
- come gioco online
- giocare con amici
- can i play with my friend
- how many players
- is there pvp
- 2 player
- how to play 2v2

## host
Answer:
To host: **MULTIPLAYER** → **HOST SERVER**. Your match shows up for everyone. In the lobby press **START MATCH** when ready; otherwise after 30 s with 2+ players a 15 s vote starts. The server runs the match, so you can even switch tabs.
Keywords: host, create a server, create a match, make a room, start match, lobby, creare partita, host server
Ask like:
- how do i host
- how to create a server
- make a match
- how to start a game online
- host server
- come creo una partita
- how to make a room
- create lobby
- how do i start the match
- start match button

## join
Answer:
To join: **MULTIPLAYER**, then tap a match in the server list. Or open an **invite link** a friend sent you: it joins that match straight away.
Keywords: join, join a server, enter a match, server list, find a match, unirsi, entrare, join my friend
Ask like:
- how do i join
- how to join a server
- join my friend
- how to enter a match
- come entro in una partita
- unirsi
- where are the servers
- i want to join a game
- server list
- find a match

## invite-link
Answer:
In the lobby tap **COPY INVITE LINK** (on phones and tablets it opens the share sheet). Send it to your friends: opening the link joins your match directly.
Keywords: invite, invite link, share link, send link, invitare, copy invite link, share sheet
Ask like:
- how do i invite friends
- invite link
- share my match
- how to send a link
- how to invite someone
- come invito un amico
- link per invitare
- copy invite link
- how does my friend join me
- send game to friend

## vote-lobby
Answer:
In the lobby the host can press **START MATCH**. If they don't, after 30 s with 2 or more players a **15 s vote** starts: pick **START NOW** or **WAIT**. Players who don't vote watch from the spectator box.
Keywords: vote, voting, start now, wait button, lobby timer, spectator, votazione, match wont start
Ask like:
- what is the vote
- start now or wait
- how does voting work
- why is there a vote
- lobby timer
- votazione
- how does the lobby work
- what does wait do
- the match wont start
- spectator box

## autopilot
Answer:
**AUTOPILOT** (host only, in the lobby) decides what happens to players who step away (tab hidden or no updates for 1.5 s): **ON** lets the server drive their car like the bot ("NAME · AUTO"); **OFF** (the default) takes the car off the field until they're back.
Keywords: autopilot, auto, afk, away player, car drove by itself, car disappeared, autopilota
Ask like:
- what is autopilot
- what does auto mean
- why does it say auto
- my car drove by itself
- autopilot on or off
- cos'è l'autopilota
- player away
- someone left their car is gone
- car disappeared
- afk player

## two-tabs
Answer:
Two game tabs on one device: the browser pauses the tab in the background, so that car leaves the field (or autopilot drives it, if the host turned it on). For testing, put both windows side by side, but note that halves performance on iPad.
Keywords: two tabs, second tab, background tab, split view, two windows, due schede, play against myself
Ask like:
- i opened two tabs
- two tabs on the same device
- testing with two windows
- background tab stops
- the other tab freezes
- due schede
- playing against myself
- second tab not moving
- split view
- host tab in background

## settings
Answer:
Open **SETTINGS** from the menu. You'll find: **Join our Discord server**, **Graphics** (quality, resolution, glow, FPS counter), **Custom server** (paste a server link, or run matches on your device) and **Proof** (what the game does and every link it uses).
Keywords: settings, options, menu, impostazioni, preferences, config, configuration
Ask like:
- where are the settings
- how do i open settings
- settings menu
- options
- impostazioni
- what is in settings
- how do i change settings
- preferences
- menu options
- config

## lag
Answer:
If the game lags or stutters:
- Settings → Graphics: **Quality LOW or MEDIUM**, **Resolution 75–90%**, **Glow off**.
- Turn on **Show FPS** to check.
- Close other tabs and apps.
- On iPad, don't play with two windows side by side.
Keywords: lag, lags, laggy, fps, frame rate, slow, stutter, choppy, performance, scatti, lento, freezes a bit
Ask like:
- the game lags
- low fps
- my game is slow
- it stutters
- laggy
- the game is choppy
- il gioco va a scatti
- lagga
- how to make it run faster
- performance problems
- frame rate is bad
- my ipad is slow with this

## jitter
Answer:
If other cars or the ball **jump around** online, it's usually a slow or unsteady connection. Check your ping in the players panel, move closer to Wi-Fi, and close downloads or video. Small corrections can happen when two players hit the ball at the same moment.
Keywords: teleports, jumping around, rubber banding, ping, jittery, the ball jumps back, laggy players, desync
Ask like:
- the ball teleports
- cars are jumping around
- other players are laggy
- the ball jumps back
- rubber banding
- high ping
- la palla si teletrasporta
- movement is jittery
- online is choppy
- my friend is lagging
- the ball goes somewhere else

## white-screen
Answer:
If the screen is white or black or the game won't start: reload the page; check your internet (the first load needs it); try another browser (Safari or Chrome). Very old devices or some in-app viewers can't run the 3D (WebGL).
Keywords: white screen, black screen, doesnt load, wont start, blank, loading, crashed, schermo bianco, non funziona
Ask like:
- white screen
- black screen
- the game doesnt load
- nothing shows up
- it wont start
- schermo bianco
- non si carica
- stuck on loading
- blank screen
- game not working
- it crashed

## webgl
Answer:
"**WebGL is not available**" means this browser or viewer can't run 3D. Open the link directly in **Safari** or **Chrome** (not inside another app's viewer), and update your browser if you can.
Keywords: webgl, 3d not supported, graphics not supported, in app browser, instagram browser, errore webgl
Ask like:
- webgl is not available
- webgl error
- what is webgl
- 3d not supported
- my browser cant run it
- errore webgl
- it says webgl
- graphics not supported
- opened in instagram and it doesnt work
- in app browser problem

## cant-host
Answer:
If **HOST SERVER** is greyed out, the server list isn't connected yet. Wait for "**game server online**", or open the game from one of the live Rocket Strike sites. On a site with no game server only the bot works.
Keywords: host button grey, cant host, host disabled, greyed out, server list not loading, cant create match
Ask like:
- i cant host
- host button is grey
- host server disabled
- why cant i make a server
- non posso creare un server
- host not working
- the host button does nothing
- cant create match
- multiplayer is greyed out
- server list not loading

## create-failed
Answer:
"**Could not create a server**" or "**Could not join that server**" means the connection failed or the match closed. Reopen **MULTIPLAYER** and try again in a moment; if it keeps happening, tap the pulse button and I'll check your connection.
Keywords: could not create, could not join, failed to join, join error, connection failed, impossibile
Ask like:
- could not create a server
- could not join that server
- failed to join
- error joining
- join failed
- impossibile entrare
- it says could not create
- create server error
- cant join my friend
- connection failed

## match-closed
Answer:
"**That match isn't open any more**" means the invite link's match has ended. Pick another server from the list, or host your own and send a new invite link.
Keywords: match isnt open, link expired, invite not working, match not found, old link, partita chiusa
Ask like:
- that match isnt open any more
- invite link doesnt work
- the link is expired
- old invite link
- la partita non è più aperta
- match not found
- link not working
- my friend's link is broken
- match closed
- invite expired

## lost-connection
Answer:
"**Lost the connection to the game server**" is a network drop. Check your Wi-Fi or data, then rejoin from **MULTIPLAYER**. "Reconnecting to the game server" means it's retrying by itself.
Keywords: lost connection, disconnected, kicked, connection dropped, reconnecting, disconnesso, offline
Ask like:
- lost connection
- lost the connection to the game server
- disconnected
- i got kicked out
- connection dropped
- reconnecting
- disconnesso
- why did i disconnect
- kicked from match
- connection lost

## host-left
Answer:
"**The host left, so the server closed**" only happens with matches run on the host's own device (Custom server → Run on my device): when the host's tab closes or goes to the background, the match stops. Normal matches are run by the online server and keep going.
Keywords: host left, server closed, host quit, host disconnected, l host è uscito, match stopped
Ask like:
- the host left
- server closed
- the host left so the server closed
- match ended when host left
- l'host è uscito
- host quit
- why did the server close
- host closed the game
- match stopped
- host disconnected

## stuck-goal
Answer:
Stuck after a goal or out of sync? The game catches up with the server by itself in a moment. If it doesn't, press **LEAVE** and rejoin. After an update, reload all the tabs.
Keywords: stuck, frozen, froze, out of sync, bloccato, stuck after goal, countdown stuck
Ask like:
- stuck after a goal
- i got stuck
- game froze after goal
- out of sync
- the match is stuck
- bloccato dopo il gol
- my screen froze
- the countdown is stuck
- everything stopped
- frozen

## status-line
Answer:
The "**Running on …**" line in the menu shows where the game is and its server:
- **game server online**: online play works.
- **reconnecting**: it's retrying by itself.
- **game server not linked yet** / **no game server here, bot only**: only the bot works here; open a live Rocket Strike site or Settings → Custom server → Paste a server link.
Keywords: running on, status, not linked, bot only, server online, no game server, status line
Ask like:
- what does running on mean
- game server not linked yet
- no game server here bot only
- what is the status line
- server status
- cosa significa running on
- bot only
- not linked
- why does it say bot only
- is the server online

## custom-server
Answer:
Settings → **Custom server**:
- **PASTE A SERVER LINK**: use someone else's Rocket Strike server (an https address).
- **RUN ON MY DEVICE**: matches you host run in your own browser, with **Customs** (match length, players, bot, unlimited boost). Keep your tab open and in front.
- **USE THE ONLINE SERVER** switches back.
Keywords: custom server, own server, private server, paste a server link, run on my device, server personalizzato
Ask like:
- custom server
- how do i use my own server
- paste a server link
- run on my device
- what is run on device
- server personalizzato
- private server
- can i host my own server
- use another server
- change game server

## customs
Answer:
**Customs** (for matches you run on your device): match length **2/3/5 min**, players **2/4/6**, bot fills a gap **on/off**, boost **normal/unlimited**. Open them from Settings → Custom server after choosing Run on my device.
Keywords: customs, custom rules, unlimited boost, infinite boost, number of players, turn off bot, regole personalizzate
Ask like:
- customs
- unlimited boost
- custom rules
- change the number of players
- can i turn off the bot
- regole personalizzate
- private match settings
- custom match
- infinite boost
- game settings for my match

## graphics
Answer:
Settings → **Graphics**: Quality **LOW / MEDIUM / HIGH** (pixels, glow, sparks; phones and tablets start on MEDIUM), Resolution **75 / 90 / 100%**, **Glow** on/off and **Show FPS**. They're saved in your browser.
Keywords: graphics, quality, resolution, glow, bloom, show fps, grafica, look better, low graphics
Ask like:
- graphics settings
- how to change quality
- make it look better
- turn off glow
- show fps
- grafica
- resolution
- high quality
- low graphics
- bloom

## rules
Answer:
The rules: **be cool**. No swearing, slurs, insults, putting down countries or their people, cheating, spamming or griefing. Admins follow the same rules. Mild words get masked; swearing and slurs are blocked and give **strikes**.
Keywords: rules, swearing, bad words, allowed, not allowed, regole, parolacce, community rules
Ask like:
- what are the rules
- chat rules
- can i swear
- what is not allowed
- regole
- is swearing allowed
- community rules
- what happens if i swear
- bad words
- what are strikes

## strikes
Answer:
Strikes add up: a swear word = 1 strike, a slur = 2, putting down a country = a warning. Enough strikes and your chat gets **restricted** (solve a captcha and agree to the rules to unlock it), then you can be **suspended** from online play for a while.
Keywords: strikes, ban, banned, warning, avvertimento, punishment, how many strikes
Ask like:
- what are strikes
- how many strikes
- why do i have strikes
- strike system
- avvertimenti
- how do strikes work
- will i get banned
- ban
- how to remove strikes
- i got a warning

## chat-restricted
Answer:
**Chat restricted**: try to chat and a box opens: solve the captcha and agree to the rules to unlock it. **Suspended**: you can't play online until it ends; the game shows how long is left.
Keywords: chat restricted, cant chat, chat locked, suspended, suspension, captcha, chat bloccata, sospeso
Ask like:
- my chat is restricted
- i cant chat
- chat locked
- i am suspended
- how long is my suspension
- chat bloccata
- sospeso
- why cant i type in chat
- unlock chat
- captcha

## report
Answer:
To report a player: open the **players panel** in a match, pick the player, tap **REPORT** and choose the reasons. The host's game checks the report (cheating is checked with a movement analysis; a confirmed slur gives two strikes).
Keywords: report, cheater, hacker, rude player, segnala, report button, bully, toxic
Ask like:
- how do i report someone
- report a player
- someone is cheating
- someone is being rude
- segnala un giocatore
- report button
- a player is swearing
- hacker in my game
- how to report
- bully in chat

## chat
Answer:
Online, press **ENTER** (or the **CHAT** button) to type, and send stickers from the chat bar (one every few seconds). Keep it friendly: rule-breaking words get masked or blocked.
Keywords: chat, message, stickers, emoji, type, talk to players, scrivere, messaggio
Ask like:
- how do i chat
- how to send a message
- chat button
- how to talk to other players
- come si scrive in chat
- stickers
- emojis
- how to use stickers
- open chat
- type message

## name
Answer:
Type your name on the main menu (up to 16 characters) and pick your car paint. If it says "**Your name breaks the rules**", choose a different one. Your name is saved in this browser.
Keywords: name, nickname, username, nome, car colour, paint, name not allowed, name breaks the rules
Ask like:
- how do i change my name
- your name breaks the rules
- my name is not allowed
- change nickname
- cambiare nome
- why is my name player
- set username
- change car colour
- paint my car
- name rejected

## saved-data
Answer:
Your name, paint, settings and strikes are saved **only in this browser**. Private mode or clearing site data resets them, and another device or browser starts fresh.
Keywords: saved, save, progress, settings gone, lost settings, private mode, reset, salvataggio, new device
Ask like:
- my settings are gone
- where is my progress saved
- my name reset
- do i lose my settings
- i lost my settings
- dati salvati
- private mode
- save progress
- does it save
- new device settings

## discord
Answer:
Join the community on **Discord**: Settings → **Join our Discord server!** (or the Discord button on the main page). Be cool there too: the same rules apply.
Keywords: discord, community, server discord, social, contact, bug report, talk to other players
Ask like:
- discord
- is there a discord server
- community
- join discord
- server discord
- where can i talk to other players
- discord link
- social
- how to contact the creator
- report a bug

## log
Answer:
The **LOG** / **ERROR LOG** button shows recent events: phases, connection, warnings and errors. If something breaks, open it, or tap my pulse button: I'll run a check and read the log to find the cause.
Keywords: log, error log, errors, something went wrong, debug, registro, frame error
Ask like:
- what is the log
- error log
- something went wrong open log
- where are the errors
- log button
- registro errori
- show errors
- frame error
- debug
- how to see what went wrong

## check
Answer:
Tap the **pulse button** in my text bar (or "Run a check") and I'll test your device, 3D graphics, frame rate, internet, game server, a live connection, multiplayer, the game log, saving and chat, then tell you what's wrong.
Keywords: check, run a check, test, diagnose, diagnosis, controllo, test my connection, whats wrong
Ask like:
- run a check
- test my game
- diagnose my problem
- check my connection
- is my internet ok
- fai un controllo
- test
- something is wrong find it
- check everything
- why doesnt it work

## helper-modes
Answer:
The helper has three modes (top of my chat bubble):
- **LIGHT** (normal): I answer on your device; anything I'm unsure of goes to the cloud helper without research. Uses the least.
- **STABILIZED**: for problems and errors I answer first, then the cloud helper double-checks it with what **2 mini helpers** find in the game's code (they search on your device, so it's one cloud call).
- **ULTRA**: runs a full check plus an asset check (3D engine, fonts, my AI, game files), 2 mini helpers search the code behind anything that fails (on your device), and I change **exactly one setting** to fix it. There's an **Undo** button.
Keywords: modes, helper modes, light mode, stabilized, stabilized mode, ultra, ultra mode, efficiency, modalità, which mode
Ask like:
- what are the modes
- what does ultra do
- what is stabilized mode
- light or ultra
- which mode should i use
- what is light mode
- cosa fa la modalità ultra
- modalità del helper
- does ultra change my settings
- how do i undo what ultra changed
- what are the mini helpers
- do mini helpers cost cloud calls
- can you search the web
- what is searxng
- how many cloud calls does it use
- efficiency modes
- what is the difference between light and stabilized

## sites
Answer:
Rocket Strike runs on several sites (Cloudflare, Netlify, Render and Vercel); they're all on the main page under **Where to play**. They share the same game server, so players on any of them see the same matches.
Keywords: sites, websites, links, netlify, vercel, render, cloudflare, where to play, site down, other link
Ask like:
- which site should i use
- other websites
- where can i play
- is there another link
- netlify
- vercel
- which link is best
- siti
- site is down
- different sites same game

## other
Keywords: capital city, poem, joke, homework, weather, history, maths, real life, football player, music, movie, recipe, mod, make a mod, websocket, netcode, source code, javascript, machine learning, three js, physics in the code, neurons, translate, world cup, your favorite, science, animals, space, minecraft, fortnite
Ask like:
- what is the capital of france
- how does a websocket work
- write me a poem
- what is rocket league
- tell me a joke
- what is 2+2
- who won the world cup
- how does gravity work
- what is the weather today
- help me with my homework
- how does the ball physics work in the code
- what language is this game written in
- how does the netcode work
- explain the source code
- who is the best football player
- what is javascript
- how do cars work in real life
- translate this to spanish
- what is three js
- recommend me a game
- how old are you
- whats your favorite color
- can you make a mod
- make the ball bigger
- how many neurons does the ai use
- what is machine learning
- why is the sky blue
- what is a durable object
- history of football
- quanto fa 5 per 5
