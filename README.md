# GEOMETRY GLITCH

A pure Babylon.js arcade game: a small ship, automatic neon weapons, colorful geometric swarms and changing 3D worlds. An endless run evolves through fifty reusable encounter patterns, six surface families, varied sizes, enemy combinations and ten boss archetypes. Patterns, world geometry and interactions blend during play; there are no numbered level endings.

Tap or click a part of the world to fly there. The ship turns toward its travel direction; weapons automatically target nearby enemies. Keyboard, controller and floating touch sticks also work. A single selectable geometric drone attacks, collects geoms or guards the ship.

## Run — no build required

The repository is a complete static game. Publish it as-is: there is no npm install, compilation, CDN dependency or generated `dist/` folder needed. The Babylon.js browser runtime is included in `vendor/`; the game is editable native JavaScript in `src/`.

For a local preview, serve this folder over HTTP:

```sh
python3 -m http.server 5173 --bind 127.0.0.1
```

Or, with Node installed, run `node scripts/serve.mjs` (`npm run dev` is the same dependency-free server). Open `http://localhost:5173/`. Enter, controller A, click or tap starts. Audio begins after the first input. Native modules load over HTTP/HTTPS.

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

Manual movement cancels a tap destination. A destination ring shows the current target. Weapon areas remain at least twenty units apart. Each has a floating 3D preview of its attack above a colored plinth, plus a large dark-backed diagram that stays legible against the world. Selected targets gain a white route accent; offscreen markers show direction. Markers separate when they overlap and keep at least 48-pixel tap regions. Fly over a weapon to equip it.

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

Collect 72 energy squares to trigger 3.2 seconds of modest overdrive: longer whips, stronger shots, larger explosions and faster firing. It partially reduces the floor-pulse cooldown. The arc around the ship shows charge and remaining overdrive. Boost through enemies to create local splash hits; collecting energy during the boost partially recharges it, with a minimum delay that prevents invulnerability loops. Gold reactor blocks arrive in linked clusters and detonate through nearby enemies and other reactors, opening pockets in the swarm. Tap a visible gold reactor marker to approach and aim at it. Chaining the cluster awards a score bonus and a short musical accent. Larger blocks break into bouncing neon fragments.

The opening has twelve weak enemies and a gradual first-minute ramp in spawn density, cadence and speed. Large formations arrive together on musical beats, with a shared three-beat warning and gaps between waves. Hunts arrive as pursuing wedges, spirals curl around the ship, floods form broad fronts, and pincers attack from opposing sides. Every fifth wave after the introduction can become a larger surge: a four-beat warning precedes a surrounding arc with a 100-degree opening in the travel direction. Opposing pincer groups and 80-plus tiny-triangle swarms enter as pressure grows. The simulation caps combat at 240 enemies. Armored variants enter later. Boss entrances clear lingering hostile fire and reduce the supporting swarm; the first boss has wider exposed windows and a lighter projectile pattern. Clearing every member of a formation awards a sweep score bonus and a brief flourish. Escaped enemies do not count as kills, and splitting blocks keep the formation unresolved until their children are destroyed. These bonuses do not heal the ship or reset defensive cooldowns. Later encounters increase pressure. Weapon damage, knockback and automatic companion fire are restrained; hurt protection lasts under a second, floor pulses recharge in nine seconds, and armored enemies survive light attacks.

Enemy silhouettes communicate their behavior: diamonds pursue and intercept; cubes wander and flee close contact; crosses orbit; tiny triangular motes weave in coordinated packs; darts charge; triangular prisms retreat and strafe while shooting; armored guard blocks hold range. Enemy sizes vary, and armored variants take many more hits. Interception, flanking, weaving and short surges vary their paths. Large splitting blocks enter later in the run; recursive splitting appears after further progression. Bosses have rotating geometric assemblies, protected and exposed core phases, and denser attacks as their health falls.

Green safe zones appear after pressure peaks, providing optional recharge and a quick route into the next encounter. If ignored, the flow evolves automatically after a short interval. From the seventh encounter, selected flows send two huge stacked pillars down onto marked landing zones. Both must be destroyed before the safe zone opens. Boss encounters require defeating the boss and grant a permanent module automatically, without interrupting the run with a selection screen. The initial fifty patterns cycle with higher pressure instead of ending the game. Afterimage upgrades improve firing, drive speed and boost recharge, with movement bonuses capped to preserve control and vulnerability.

Tap weapon, recharge, gate, pillar or boss markers to navigate directly to them, including offscreen markers. Boss and pillar targeting approaches to the current weapon’s range and maintains aim. Manual movement or a new floor destination cancels it. A boss or pillar left far behind re-enters ahead with a visible delay and its existing health. Pillar objectives cannot be skipped by travelling away.

## Evolving worlds

Monoliths, rings, globes, twisting columns, separating double lobes and contorted rings share an implicit surface field between navigation and rendering. World size changes as the run evolves. Splitting lobes retain a solid bridge at every split phase, then recombine. Floor pulse emits a bright shockwave, deforms the surface and changes the positions of terrain ridges. Navigation remains attached to the evolving surface. Raised ridges are larger and physically block movement, including boosts. Tap navigation plans routes around them. Nearby weapon pads and gates have openings through the terrain. Paired blue and violet gates warp the ship across the world; a small departure blast rewards bringing a light swarm close, while armored enemies survive. A gate cannot bounce a stationary ship back. World morphs ease over 6.5 seconds. The camera’s orbit has a capped turning speed, a slow easing curve and a damped focus point, while the ship eases into its travel heading.

The palette uses visible steel-blue surfaces, cyan grids and colored neon effects. A few small cyan and magenta pixel fragments shimmer subtly in the ground. All art is engine geometry and shaders; no creature atlas is loaded. The procedural 134–142 BPM EDM score has four-on-the-floor kicks, syncopated bass, sidechain ducking, arpeggios, stereo delay, short breakdowns and drops. Music and formation warnings share a simulation beat clock, so muting does not change gameplay timing. Combat audio has a separate route so the beat does not mute hit feedback.

See [DESIGN-RESEARCH.md](DESIGN-RESEARCH.md) for the research and design rationale, including proposed weapon evolutions, environmental traps, optional caches and arena events inspired by games beyond twin-stick shooters.

## GitHub Pages and itch.io

To publish straight from GitHub, commit these files and folders to the repository:

- `index.html`
- `.nojekyll`
- `src/`
- `vendor/` (including `babylon-core.js`)
- `public/` (fonts and license notices)

In **Settings → Pages**, select **Deploy from a branch → main → /(root)**, then save. The same files work on account sites and repository subpaths because every runtime URL is relative. See [GitHub's publishing-source instructions](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

If the repository already uses **GitHub Actions** for Pages, the included `.github/workflows/pages.yml` also works: it copies and deploys the ready-to-serve files, with no package install or build step. Local edits do not publish until committed and pushed.

For itch.io, upload `geometry-glitch-itch.zip` as an HTML Game and mark it playable in the browser. Enable mobile-friendly and fullscreen options. Portrait and desktop embeds are supported. `geometry-glitch-pages.zip` contains the complete project, including the static game, optional tests and local preview tools, and the build-free Pages workflow. Both ZIPs have `index.html` at the root.

Regenerating either ZIP only packages existing files:

```sh
node scripts/package-itch.mjs
```

If a file fails to load or initialization fails, the startup screen shows an error and Retry button instead of remaining on “Initializing.”

## Verification and tuning

The 87-test suite covers native static-module resolution at root and repository paths, the vendored engine registrations, pickup marker separation at desktop, portrait and landscape sizes, compact weapon displays at terrain seams, synchronized formations, shape-specific AI, sister-ship limits and targeting, ribbon contact, pillar objectives, gate escapes, ridge collision, pickup routing, beat timing, input, travel-facing rotation, perspective-correct aiming, taps versus drags, weapon pickups and spacing, seeker steering, area damage, ammo fallback, late-stage block splitting, seamless flow and safe-zone transitions, crowded combat bounds, all fifty world transitions, pulse deformation and bridge continuity. Real phones and physical controllers still need hardware play-testing.

See [PLAYTEST-NOTES.md](PLAYTEST-NOTES.md) for survival runs and focused browser checks. Cosmetic particles and rings have rendering budgets; combat simulation, enemy counts and collision checks retain their full resolution. Adaptive resolution reduces GPU load when needed; the HUD keeps its own sharp texture.

Backtick opens tuning; F2 shows performance. F6 toggles invulnerability, F7 spawns a block, F8 advances the encounter flow. Scores and settings save locally. Reduced effects, music and sound toggles are in settings.

The included Babylon.js 8.56.2 runtime is Apache-2.0; license and notice are in `public/licenses/`. Local Barlow Condensed and Space Grotesk fonts are OFL-1.1; notices are in `public/fonts/`. Earlier unused artwork is retained under `art/` and is not exported.
