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
