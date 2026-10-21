# GEOMETRY GLITCH

A pure Babylon.js arcade game: a small ship, automatic neon weapons, colorful geometric swarms and changing 3D worlds. An endless run evolves through fifty reusable encounter patterns, six surface families, varied sizes, enemy combinations and ten boss archetypes. Patterns, world geometry and interactions blend during play; there are no numbered level endings.

Tap or click a part of the world to fly there. The ship turns toward its travel direction; weapons automatically target nearby enemies. Keyboard, controller and floating touch sticks also work. A single selectable geometric drone attacks, collects geoms or guards the ship.

## Run

Node 22.12+ or Node 24+:

```sh
npm ci
npm run dev
```

Open the printed address. Enter, controller A, click or tap starts. Audio begins after the first input.

## Controls

| Action | Keyboard / mouse | Controller | Mobile |
| --- | --- | --- | --- |
| Navigate | Click a destination or WASD / arrows | Left stick | Tap a destination or drag left stick |
| Fire | Automatic | Automatic | Automatic |
| Optional aim | Mouse; ship follows travel while moving | Right stick | Drag right stick |
| Boost | Space / Shift | A | Boost circle |
| Deform floor | E / right click | B / LT | Pulse circle |
| Select collected module | 1–9 | LB / RB | Bottom icons |
| Pause | P / Escape | Start | Pause symbol |
| Choose drone | Left/right on title | D-pad or LB/RB | Tap icon |
| Mute / fullscreen | M / F | Settings | Settings |

Manual movement cancels a tap destination. A destination ring shows the current target. Weapon areas remain at least twenty units apart, have colored beacons, and show direction markers when off screen. Fly over a weapon to equip it.

## Weapons and progression

| Module | Role | Tradeoff |
| --- | --- | --- |
| Filament | Sweeping neon strings plus triple wave shots | Infinite, limited reach |
| Arc Lash | Long flexible whip with heavy knockback | Must approach the swarm |
| Orbit Cutter | Powerful circular clearance | Slower, close range |
| Wave Fan | Broad five-shot waves | Limited ammo, no piercing |
| Pulse Lance | Piercing line with chain arcs | Narrow coverage, limited ammo |
| Seeker Array | Three homing missiles that spread across nearby targets | Slower reload, limited ammo |
| Nova Well | Slow projectile with a large area explosion | Longest reload, limited ammo |
| Twin Echo | Two sister ships flank you and independently shoot nearby threats for six seconds | Five deployments, nine-second cooldown; returns to your previous weapon |
| Prism Ribbon | A short rainbow contact ribbon destroys ordinary enemies | Very close range; bosses and pillars take repeated hits |

Empty ranged modules fall back to Filament; another pickup refills them. Weapon diagrams depict each attack, and a recharge line shows firing cadence. Enemies release small glowing energy squares; collecting them builds score, multiplier and overdrive charge. Energy does not heal the ship. Hearts, safe zones and boss rewards restore shields.

Collect 72 energy squares to trigger 3.2 seconds of modest overdrive: longer whips, stronger shots, larger explosions and faster firing. It partially reduces the floor-pulse cooldown. The arc around the ship shows charge and remaining overdrive. Boost through enemies to create local splash hits; collecting energy during the boost partially recharges it, with a minimum delay that prevents invulnerability loops. Gold reactor blocks detonate through nearby enemies and other reactors, opening pockets in the swarm.

The opening has twelve weak enemies and a gradual first-minute ramp in spawn density, cadence and speed. Large formations arrive together on musical beats, with a shared three-beat warning and gaps between waves. Opposing pincer groups and 80-plus tiny-triangle swarms enter as pressure grows. The simulation caps combat at 240 enemies. Armored variants enter later. Boss entrances clear lingering hostile fire and reduce the supporting swarm; the first boss has wider exposed windows and a lighter projectile pattern. Later encounters increase pressure. Weapon damage, knockback and automatic companion fire are restrained; hurt protection lasts under a second, floor pulses recharge in nine seconds, and armored enemies survive light attacks.

Enemy silhouettes communicate their behavior: diamonds pursue and intercept; cubes wander and flee close contact; crosses orbit; tiny triangular motes weave in coordinated packs; darts charge; triangular prisms retreat and strafe while shooting; armored guard blocks hold range. Enemy sizes vary, and armored variants take many more hits. Interception, flanking, weaving and short surges vary their paths. Large splitting blocks enter later in the run; recursive splitting appears after further progression. Bosses have rotating geometric assemblies, protected and exposed core phases, and denser attacks as their health falls.

Green safe zones appear after pressure peaks, providing optional recharge and a quick route into the next encounter. If ignored, the flow evolves automatically after a short interval. From the seventh encounter, selected flows send two huge stacked pillars down onto marked landing zones. Both must be destroyed before the safe zone opens. Boss encounters require defeating the boss and grant a permanent module automatically, without interrupting the run with a selection screen. The initial fifty patterns cycle with higher pressure instead of ending the game. Afterimage upgrades improve firing, drive speed and boost recharge, with movement bonuses capped to preserve control and vulnerability.

Tap weapon, recharge, gate, pillar or boss markers to navigate directly to them, including offscreen markers. Boss and pillar targeting approaches to the current weapon’s range and maintains aim. Manual movement or a new floor destination cancels it. A boss left far behind re-enters ahead with a visible delay and its existing health.

## Evolving worlds

Monoliths, rings, globes, twisting columns, separating double lobes and contorted rings share an implicit surface field between navigation and rendering. World size changes as the run evolves. Splitting lobes retain a solid bridge at every split phase, then recombine. Floor pulse emits a bright shockwave, deforms the surface and changes the positions of terrain ridges. Navigation remains attached to the evolving surface. Raised ridges are larger and physically block movement, including boosts. Tap navigation plans routes around them. Nearby weapon pads and gates have openings through the terrain. Paired blue and violet gates warp the ship across the world; a small departure blast rewards bringing a light swarm close, while armored enemies survive. A gate cannot bounce a stationary ship back. World morphs ease over 6.5 seconds. The camera’s orbit has a capped turning speed, a slow easing curve and a damped focus point, while the ship eases into its travel heading.

The palette uses visible steel-blue surfaces, cyan grids and colored neon effects. A few small cyan and magenta pixel fragments shimmer subtly in the ground. All art is engine geometry and shaders; no creature atlas is loaded. The procedural 134–142 BPM EDM score has four-on-the-floor kicks, syncopated bass, sidechain ducking, arpeggios, stereo delay, short breakdowns and drops. Music and formation warnings share a simulation beat clock, so muting does not change gameplay timing. Combat audio has a separate route so the beat does not mute hit feedback.

See [DESIGN-RESEARCH.md](DESIGN-RESEARCH.md) for the research and design rationale.

## Static exports

```sh
npm test
npm run build
npm run package:itch
```

`dist/` is a standalone static build with relative asset paths, suitable for GitHub Pages or itch.io. The ZIP is `geometry-glitch-itch.zip`, with `index.html` at its root. On itch.io select HTML Game, mark the ZIP as playable in the browser, and enable mobile-friendly and fullscreen options. A portrait 480 × 854 embed is supported, as are desktop and landscape sizes.

The repository includes `.github/workflows/pages.yml`. Enable GitHub Pages with GitHub Actions to use it. No public deployment is performed by local build or packaging.

## Verification and tuning

The 70-test suite covers synchronized formations, shape-specific AI, sister-ship limits and targeting, ribbon contact, pillar objectives, gate escapes, ridge collision, pickup routing, beat timing, input, travel-facing rotation, perspective-correct aiming, taps versus drags, weapon pickups and spacing, seeker steering, area damage, ammo fallback, late-stage block splitting, seamless flow and safe-zone transitions, crowded combat bounds, all fifty world transitions, pulse deformation and bridge continuity. Real phones and physical controllers still need hardware play-testing.

See [PLAYTEST-NOTES.md](PLAYTEST-NOTES.md) for survival runs and focused browser checks. Cosmetic particles and rings have rendering budgets; combat simulation, enemy counts and collision checks retain their full resolution. Adaptive resolution reduces GPU load when needed; the HUD keeps its own sharp texture.

Backtick opens tuning; F2 shows performance. F6 toggles invulnerability, F7 spawns a block, F8 advances the encounter flow. Scores and settings save locally. Reduced effects, music and sound toggles are in settings.

Babylon.js is Apache-2.0; license and notice are in `public/licenses/`. Local Barlow Condensed and Space Grotesk fonts are OFL-1.1; notices are in `public/fonts/`. Earlier unused artwork is retained under `art/` and is not exported.
