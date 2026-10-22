# Design research applied to GEOMETRY GLITCH

The sources below inform design choices; they do not establish that a particular build will be enjoyable or addictive. That requires play-testing.

## Readable chaos

[Craig Howard, Lucid Games: Creating a New Enemy in Geometry Wars 3](https://blog.playstation.com/?p=152477) describes clear, strong enemy behaviors, prototype testing, and a multi-part enemy that changes movement decisions. Applied here: distinct silhouettes and movement rules, spawn anticipation, a visible charge windup, and late-stage blocks that split into smaller threats. Splitting is deferred until encounter pattern 16, with recursion from 31, so the opening stages establish the core rules first.

## Goals, control and pacing

[Sweetser and Wyeth: GameFlow (2005)](https://doi.org/10.1145/1077246.1077253) identifies challenge, skills, control, goals and feedback among the elements of enjoyment. Its initial evaluation used expert reviews of strategy games, so applying it to an arcade shooter is a design inference. Here the loop is clear a pressure peak, locate an optional green safe zone, recharge and continue without a level-ending screen. A five-pattern intensity cycle varies pressure; new weapons provide different ways to solve dense waves. Tap navigation and automatic firing reduce the number of simultaneous actions required on a phone.

## Physicality and amplification

[Pichlmair and Johansen: Designing Game Feel. A Survey (2020)](https://arxiv.org/abs/2011.09201) distinguishes physicality, amplification and support. Applied here: fast movement with a controlled stop, travel-facing ship orientation, recoil and knockback, bright expanding kill bursts, separate weapon cadence, and automatic targeting. Enemy projectiles retain a distinct red color to help preserve threat readability amid player effects.

## Geometry as a tactical space

[PlayStation's Geometry Wars 3 interview (2014)](https://blog.playstation.com/?p=142780) describes deforming 3D arenas and two spherical regions connected by a narrow bridge. This informed the connected split-and-rejoin world. Its central capsule bridge remains solid through every split phase; world size changes and pulse deformation use the same distance field for drawing and movement. Tests exercise all fifty transitions, bridge continuity and pulse navigation. Those are sampled checks, not an exhaustive proof for every possible trajectory.

## Weapon roles

Weapon parameters are tuning choices: short-range strings and whips reward approaching the swarm; fan fire handles lanes; the lance prioritizes piercing; seekers trade reload speed for steering; Nova trades firing frequency for an area burst. Pickups are separated by at least twenty local navigation units to make equipment a reason to travel. Ranged ammo and a permanent default weapon keep pickups useful without leaving the ship unable to attack.

The supplied [Geometry Wars 3 visual reference](https://geometry-wars-3-dimensions.en.softonic.com/mac) informed the bright geometric vocabulary. All runtime geometry, effects, music and game code are original to this project.

## Review findings and resulting changes

[GameSpot's Geometry Wars 3 review](https://www.gamespot.com/reviews/geometry-wars-3-dimensions-review/1900-6415977/) praises responsive controls, score chasing, music and the risk of sweeping through collectible debris. It also describes particles obscuring threats. Applied here: energy collection fuels multiplier and temporary overdrive, boosts can chain through enemies, and explosive reactor blocks reward routing a swarm past them. A sharp ship outline stays above weapon effects; hostile shots use a separate red palette.

[Push Square's Geometry Wars 3 review](https://www.pushsquare.com/reviews/ps4/geometry_wars_3_dimensions) likes the varied 3D shapes and neon presentation, but flags a steep difficulty curve and losing the ship amid many light sources. Applied here: a twelve-enemy opening, a gradual first-minute pressure ramp, delayed armored variants, charge warnings and small indicators for nearby threats outside the visible area. Fuller weapon strokes retain their color with thinner white cores.

[Rick Lane's first-person Sektori impressions at PC Gamer](https://www.pcgamer.com/games/action/this-roguelike-take-on-geometry-wars-is-the-best-game-ive-played-this-month-and-the-latest-to-become-a-permanent-fixture-on-my-steam-deck/) praises strike chains, escalating spectacle, upgrades and rave music, while identifying the first boss as a difficulty spike. Applied here: energy collected during a boost partially recharges it, with a minimum delay, pickups show attack diagrams, and EDM layers build gradually. Boss entrances clear old hostile fire and reduce the supporting swarm. The first boss has slower, lighter patterns and a longer exposed window. Morphing terrain keeps navigation attached instead of killing the player for leaving a new boundary.

These reviews are a small qualitative sample. The changes are design responses, not proof that every criticism has been solved. Manual browser runs subsequently found unreachable trailing objectives and heavy-effect rendering costs; those fixes are recorded in the playtest notes.

## Additional arcade references — October update

The [Sektori developer description](https://store.steampowered.com/app/2105620/Sektori/) emphasizes hand-authored attack waves recombined across evolving fields and upgrades. Applied here: synchronized formations, opposing pincer packs, small coordinated swarms, separate shape behaviors, and modest firing/drive/boost progression. The game retains quick uninterrupted flow.

[Waves 2’s developer description](https://store.steampowered.com/app/217120/Waves_2_Notorious/) connects combos with bursts and describes a tower-destruction portal mode. Applied here: the existing collection/multiplier/overdrive loop remains, with later two-pillar objectives and gate escapes that reward drawing a pack close. Pulse and boost refunds are bounded to preserve vulnerability. This is an interpretation, not the same combo system or adaptive AI.

[Beat Hazard](https://store.steampowered.com/app/49600/Beat_Hazard/) links musical flow and combat. Applied here: formation warnings begin on the procedural EDM clock and last three beats before activation. Pausing stops that clock; muting preserves the same combat timing. No personal music import or song analysis is implemented.

[Neon Pulsefire](https://store.steampowered.com/app/4402170/Neon_Pulsefire/) describes automatic weapon builds and pickups. Applied here: the existing automatic modules gain two contrasting additions—temporary sister ships and a contact ribbon—while ammo and deployment cooldowns keep them distinct. This game uses field pickups and seamless progression rather than a between-wave shop.

[Housemarque’s Resogun description](https://housemarque.com/games/resogun) emphasizes hordes, multipliers and vivid block destruction. Applied here: stacked pillars lose sections as damaged and shatter into energy and glowing fragments. The existing late-stage splitting blocks and reactor chain explosions provide additional destructive reactions. Full voxel-world destruction is not implemented.

These are selected design influences, not claims of equivalent scope, performance or quality. The latest balance pass reduces weapon reach/damage, knockback, healing, pulse strength and hit protection; spectacle remains bright while the ship must keep moving.

## Beyond twin-stick shooters — proposed next iterations

These proposals are design inferences, not implemented features. The pickup presentation described afterward is implemented. Review praise identifies promising mechanics, but does not predict retention for this game.

### 1. Weapon evolutions that change the way you move

[PC Gamer's Vampire Survivors review](https://www.pcgamer.com/vampire-survivors-review/) praises complementary firing patterns and the payoff of evolving a build, while noting that an easy steamroll can become dull. Adaptation: offer two visible field modules for the current weapon. A fan could bounce off ridges or return like a boomerang; a whip could leave a brief electric tether or become a narrower, longer lash. Each form should trade coverage, cadence or range. Start with three weapons and two forms each. Show the resulting attack in its pickup hologram. Cap the run at two mutations so selection remains understandable on a phone.

### 2. Lure-and-crush terrain traps

[PC Gamer's Deep Rock Galactic: Survivor review](https://www.pcgamer.com/games/roguelike/deep-rock-galactic-survivor-review/) particularly praises terrain tactics and clever environmental kills, including falling supply pods. Adaptation: forecast a falling slab with a generous striped landing zone. Lure a wave underneath, dash out, and use the new slab as cover before it crumbles into energy. This builds on the current pillars, ridges and pulse. Test one slab at a time, with a traversable escape route and a distinct danger color. The same review also supports overclocks that alter weapon behavior.

### 3. Optional weapon caches with a price

[PC Gamer's Risk of Rain 2 review](https://www.pcgamer.com/risk-of-rain-2-review/) praises surprising item combinations and exploration. The related [staff retrospective](https://www.pcgamer.com/risk-of-rain-2-is-the-co-op-game-i-keep-coming-back-to/) describes the temptation to keep looting while difficulty rises. Adaptation: an optional cache advertises its exact weapon before activation. Passing through a marked switch starts a short ambush; surviving opens the cache. Offer a desirable mutation or scarce ammunition. Skipping it should remain a good decision when shields are low.

### 4. A director that gives pressure a rhythm

[Michael Booth's Valve presentation, The AI Systems of Left 4 Dead](https://steamcdn-a.akamaihd.net/apps/valve/2009/ai_systems_of_l4d_mike_booth.pdf), pp. 77–91, describes peaks, fades and recovery, adjusting pacing separately from difficulty. Adaptation: estimate pressure from nearby threats, incoming shots and recent hits. After a sustained peak, briefly defer a new formation while existing enemies remain dangerous. Keep enemy health and damage consistent. Prototype a 4–6 second opening to collect energy and choose a route, followed by a warned surge. Compare against the current authored wave timing; avoid punishing skilled players with concealed health scaling.

### 5. Random arena events that the player can exploit

The [#killallzombies developer announcement](https://blog.playstation.com/?p=137011) describes arena events, timed bonuses and encounter choices driven by spectators. Adaptation for a standalone game: draw a telegraphed event from a shuffled bag every 45–70 seconds. Examples: a ridge becomes a breakable wall; two gates exchange exits; a narrow bridge gets temporary side platforms; a slow gravity well pulls enemies and energy inward. Keep one event active at a time, prevent immediate repeats, and retain a viable escape path. First prototype the gravity well and breakable wall. Audience voting is unnecessary here.

### 6. Visible combinations and small secrets

Build on the discovery appeal discussed in the Vampire Survivors and Risk of Rain 2 reviews: award one experimental module for a specific visible feat, such as a three-reactor chain or a complete wave cleared with a ribbon. A paired-symbol hint can suggest the challenge without explanatory text. Give the reward a new behavior, such as missiles orbiting briefly before seeking. Keep these optional and deterministic once the player understands the rule. Later, offer a seed that can be replayed locally, making surprising event combinations reproducible without a server or leaderboard.

Recommended order: weapon evolutions, one lure-and-crush trap, then optional caches. Those create immediate choices within the existing navigation and automatic-fire loop. Follow with the director and a small event bag after measuring whether players can identify weapons, read danger and make a deliberate escape. Useful checks: pickup identification at a glance, intentional equipment detours, avoidable versus unreadable deaths, and whether idle firing becomes sufficient to survive.

### Implemented now: equipment that advertises its function

Each ground pickup has an animated native 3D attack display: flexible strings, orbiting blades, five fan lanes, a piercing beam, converging seekers, an expanding nova, two sister ships or a rainbow ribbon. A low plinth and colored corner tabs distinguish equipment from enemies. Larger dark-backed HUD diagrams remain legible against the floor, show a selected-route accent and a direction arrow off screen, and displace to avoid one another, the ship and navigation controls where space permits. Tap regions are at least 48 pixels wide. Collection gives a larger brief attack diagram. There are no text labels beneath pickups, rarity tiers, damage buffs or ammunition balance changes in this pass.
