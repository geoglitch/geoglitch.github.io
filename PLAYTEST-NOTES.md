# Manual playtest notes — 21 October 2026

The first two runs below preceded the latest balance, formation and terrain update. They are historical observations, not results for the current weapon strength. This is an endless game; these were survival runs, not completion of every encounter template.

## Keyboard run

- Tested at 1280 × 720 with movement, auto fire, collected weapons, boosts and floor pulses.
- Full shields at about 40 seconds; 39 active enemies and two shields at about 63 seconds.
- Continued to 1:56.7 and the first boss, then paused deliberately. Score 1,352,725; shields had recovered through energy collection.
- Regular navigation was around 60 FPS. Continuous travel exposed objectives left too far behind, including a boss that could remain outside the active chart.

## Destination run

- Tested floor destinations, weapon marker navigation, Nova explosions, seeking missiles and spread fire.
- Tapping weapon markers collected and equipped the selected modules. Tapping the green recharge marker restored shields and continued into the next flow without a level-ending screen.
- Ended at 1:25.5 with 476 targets cleared and score 2,087,818.
- Heavy spread fire and accumulated projectiles reached the low 40s in FPS. The first boss arrived with too much leftover swarm and projectile pressure.

## Fixes and follow-up checks

- Added tappable weapon, recharge and boss markers. Boss navigation approaches to attack range and maintains aim. A distant boss re-enters ahead after a visible warmup, preserving health.
- Made weapon resupply recover quickly if no pickups remain, and biased new areas toward travel.
- Cleared lingering hostile shots on boss entrance, limited the supporting swarm and softened the first boss's patterns and protected phase.
- Reduced cosmetic projection and geometry work: bounded particle/ring rendering, fewer curve segments, one rendered pixel per CSS pixel, and culled effects on hidden sides. Combat and collisions remain fully simulated.
- Checked a 492 × 900 portrait panel. Marker collection, score and shield layout were usable. A focused encounter selected with the debug controls confirmed that the first boss could be approached, defeated and followed by continued play. That focused check ran around 60 FPS; it was not a matched desktop benchmark of the earlier heavy scene.
- A sharply curved transition exposed a rare surface projection failure. Projection now uses bounded, backtracked steps and brackets a nearby surface when gradients cancel. The ship marker projects the actual ship basis instead of independently projecting its corners.
- Automated checks cover the pressure ramp, overdrive duration, boost chains, reactor chains, boss re-entry, boss entrance cleanup, canceled gradients, all fifty morph transitions and bridge continuity.

Physical phone touch input and real controller hardware remain unverified. Their mappings are covered by input tests; the browser destination checks used mouse clicks.

## Latest balance, formation and terrain pass

- A normal keyboard run used movement, a boost and a floor pulse, then tap navigation to the ribbon. It reached 35.5 seconds, cleared 114 targets and scored 150,405 before losing the ship in encounter two. No invulnerability or encounter skipping was used in this run. The close-range ribbon could not passively hold off ranged prisms and the surrounding swarm.
- Browser pickup checks confirmed Twin Echo deploys exactly two temporary ships while retaining one permanent drone and returning to Filament. The final preview shows this active pair at 5.2 seconds alongside the first 20-enemy formation. Later checks observed 22-enemy and 48-mote synchronized groups.
- Tap navigation collected the rainbow ribbon both from the opening world and while the first world morphed. Testing first found that the larger ridges trapped a greedy route. A local surface path search and nearby clear landing pads fixed that route. A second check found that a weapon route could accidentally pass through a gate; equipment routes now avoid unselected gates.
- Tapping the blue gate moved the ship to the violet gate, cleared the navigation target and started a 2.8-second cooldown. The check observed a cross-world travel jump and a 2.4-second remaining cooldown. Automated tests additionally cover standing on the receiving gate without bouncing back and the limited departure blast.
- A focused check used encounter skipping and invulnerability to inspect encounter seven. Both large stacked pillars descended onto marked positions, remained solid and kept the exit closed. Tests verify that both must be destroyed, that ribbon contact cannot instantly erase them, and that repeated contact does not apply multiple hits in one swing. This was not a normal survival run to encounter seven.
- The camera blends its orientation and position, while terrain morphs ease over 6.5 seconds. The ship stayed on the surface throughout the observed transitions. All fifty transitions, pulse travel and the split-world bridge remain covered by automated sampling.
- Desktop checks with multiple game contexts showed roughly 32–60 FPS depending on view and effects; the final twin-ship scene reached 60 FPS with adaptive rendering at 1.25 hardware scale. These are observations, not a controlled performance benchmark. The existing 492 × 899 portrait panel was inspected without controlling it; its title/demo layout ran at 60 FPS.
- The current suite passes 70 checks, including grouped waves, musical timing, individual shape behavior, weapon limits, controller cycling during summon cooldown, terrain routes and gate avoidance. Real phone touch and physical controller hardware remain unverified.

Current gameplay preview: `art/vector-shift-update.png`. The static ZIP is rebuilt from this pass. Its 47 files passed archive integrity and relative-asset checks. The production preview booted in the browser; movement, a gate traversal and floor pulse worked, with no captured console warnings or errors.

## Geometry Glitch identity and rotation polish

Renamed the title, loading screen, browser metadata and static package to Geometry Glitch. Existing locally saved scores and settings migrate from the earlier save key. Added sparse, low-contrast cyan dashes and magenta pixel flecks anchored to the terrain shader. They do not affect terrain collision or spawn mechanics.

The camera now eases its orientation more slowly, caps angular speed and smooths its focus point; ship turns are also eased and capped. Browser checks exercised several keyboard direction changes with the ship visible and the surface anchor stable. The portrait title fits without overlapping the settings icons; no console warnings or errors were captured. Current identity preview: `art/geometry-glitch-preview.png`.

Disabled browser text selection, image dragging, tap highlights and touch callouts on the game. Pointer handling prevents browser selection while explicitly focusing the canvas. A browser click/drag check retained game controls with computed `user-select: none` and no console warnings or errors.

## Final arcade pass — Geometry Glitch 1.0

- Added distinct wedge, spiral and broad-front arrivals, alongside existing pincers and small swarms. Every fifth eligible wave becomes a larger surrounding surge with a four-beat warning and an open 100-degree forward cone. Boss support waves retain their smaller budgets.
- Linked reactor clusters appeared at ten seconds. In a browser check, tapping one core caused all three to detonate, recorded a best chain of three, scattered neon fragments and cleared nearby enemies. The observed scene ran at about 60 FPS. This is an observation on this browser, not a hardware benchmark.
- A normal run used keyboard movement, boosts, a terrain pulse, tap pickup of Twin Echo and a recharge marker to continue into the next world. It cleared three formations, encountered a 48-mote swarm and then a 42-enemy surge. It ended at 35.4 seconds with 114 kills and 193,929 points after standing under ranged pressure. Invulnerability and encounter skipping were not used.
- The normal run confirmed that early formation clears award sweep bonuses while later pressure can still kill the ship. Sweep and reactor bonuses add score without healing or resetting defense cooldowns. Splitting children retain their formation membership; travelling away never awards a sweep.
- Fixed pillar objectives being removed outside the active chart. Pillars now return ahead with their health preserved and a fresh descent warning, so leaving them behind cannot skip the objective.
- Added bounded, bouncing solid debris to large-block and reactor destruction, a small score pulse, short formation warnings and a compact sweep/chain result summary. The calm floor palette, sparse ground glitches and eased camera rotation are retained.
- All 77 automated checks pass. They cover surge escape geometry, formation layouts, reward accounting, splitting children, reactor chain bounds, debris cleanup and pillar re-entry in addition to the previous input, combat and world tests. Real phone and physical controller play-testing remains unverified.

Final gameplay capture: `art/geometry-glitch-finish.png`. Static export: `geometry-glitch-itch.zip`.

The final 1.0 production preview was browser-tested after packaging: movement, automatic fire, a grouped hunt wave and terrain pulse worked. No console warnings or errors were captured. The 47-file ZIP passed archive integrity and relative-asset checks.

## Build-free GitHub Pages fix — 1.0.1

The repository root previously loaded Vite-specific source: browser-unresolvable package imports, a root-absolute script URL and a Vite environment lookup. Publishing that source directly left the page on Initializing even though the separate compiled export worked.

The root now loads native relative modules and a checked-in Babylon.js 8.56.2 browser runtime. Fonts resolve relative to the module URL. There are no npm dependencies, install commands or build steps needed to play, publish or edit the game. Added `.nojekyll`, a plain Node HTTP preview, a static-copy Pages workflow and direct source packaging.

Browser checks used plain static servers at `http://localhost:5173/` and a repository-style `/geometry-glitch/` URL. Both reached the title and active play; movement, automatic fire and a terrain pulse worked. No console errors were associated with either working page. A separate fixture deliberately omitted the game module and displayed Unable to Start with a Retry button, confirming that module-load failure does not silently remain on Initializing. Fonts have a bounded startup wait.

All 80 tests pass, including root/subpath module resolution, local engine constructors and shader registrations, and the build-free publishing contract. The GitHub Pages ZIP includes the updated workflow and optional developer tools; the itch ZIP contains only ready-to-serve game files. New screenshot: `art/geometry-glitch-static.png`.


## Weapon readability and wider genre research

- Added distinct animated 3D attack displays and low equipment plinths, larger dark-backed diagrams, offscreen direction arrows, a white selected-route accent and a larger pickup confirmation. Weapon damage, ammunition and encounter balance were unchanged.
- Focused desktop and 390 × 690 portrait browser checks used marker clicks to approach Twin Echo. The pickup disappeared, its inventory icon unlocked and two sister ships appeared. The desktop snapshot confirmed owned modules `0,7` and exactly two temporary ships. These were short navigation checks, not full survival playthroughs or physical touch-device tests.
- Inspected simultaneous whip, fan, orbit, ribbon and twin-ship diagrams against the ground. A stretched halo at a ridge was traced to sampling a circular decal across separate surface projections. Pickup displays now use a single tangent frame; the repeated desktop route showed compact displays without the streaks.
- Marker placement protects the projected ship position, separates six coincident targets at 1280 × 720, 390 × 844, 320 × 568 and 844 × 390, and retains at least 48-pixel tap areas. The placement tests cover coincident projections and a gate control; they do not prove every possible combination can fit without displacement.
- All 87 tests passed. A geometry regression exercises all nine attack displays at multiple animation times and a rotated surface frame, checking finite, bounded geometry. Native root and repository-subpath module checks remain green. Browser console checks found no warnings or errors.
- `DESIGN-RESEARCH.md` distinguishes six proposed next iterations from the implemented pickup pass, with references to Vampire Survivors, Deep Rock Galactic: Survivor, Risk of Rain 2, Left 4 Dead and #killallzombies.
- Updated proof: `art/geometry-glitch-weapons.png`. Both static archives package the current files directly, with no build step.
