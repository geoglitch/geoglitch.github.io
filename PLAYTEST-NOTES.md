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

## Continuous movement and removal of floating equipment

- Removed floating equipment cards, holograms, plinths, rising glints and the central pickup popup. Static colored attack symbols now sit directly on the floor. Visible symbols retain invisible 56-pixel tap areas, and the bottom inventory still indicates the equipped weapon.
- Found a simulation-wide early return after melee hits. Removed it so travel, cooldowns and the EDM clock continue through hits. Terrain contact previously reversed velocity; it now clips to the boundary and retains sliding motion, including along oblique ridges. Damage retains forward momentum with a smaller impulse, while shield damage and hurt protection remain unchanged.
- Added route lookahead through clear corners, screen-relative keyboard/stick movement and a continuously scaled radial controller dead zone.
- Replaced separate camera eye/target lag and stepped clearance jumps with one coherent rig. The rig follows the large underlying world shape, excluding ridge and pulse displacement from its follow height and horizon. Turning accelerates smoothly and clearance uses a continuous search. Camera regression checks sample every world family and all fifty transitions.
- Removed the screen-space equipment layout search. Rendering reuses per-frame surface projections across drawing and HUD work. Color buffers upload only active instance data. Segments that jump more than ten world units or cross the near-camera region are discarded; this addresses oversized trail streaks observed during the portrait check.
- A normal desktop movement run reached 26.2 seconds and encounter two, collecting Wave Fan, using terrain pulses and clearing three formations including a 48-enemy swarm. Observed roughly 60 FPS at hardware scale 1.0, with rolling 95th-percentile frame times of 16.8–18.6 ms. These are local observations, not a matched hardware benchmark.
- A 390 × 844 portrait check collected Wave Fan by clicking its floor symbol. Observed 60 FPS and 16.8 ms rolling 95th-percentile frame time. After restoring the browser's normal 492 × 900 panel, the same run continued to 14.8 seconds with three shields, 59.9 FPS and 17.6 ms sampled frame time. Physical phone touch and controller hardware still require device testing; input mappings and the radial dead zone are tested automatically.
- All 91 tests passed, including uninterrupted combat travel, damage momentum, ridge sliding, camera continuity, flat equipment marks, trail clipping and build-free root/subpath loading. Browser console checks reported no warnings or errors. Updated visual proof: `art/geometry-glitch-flow.png`.

## Forward fire with weapon-specific targeting

- Filament, Wave Fan, Pulse Lance, Nova Well and the ribbon align their attacks with the ship's eased facing direction. Enemy proximity no longer redirects direct fire. Stationary mouse/right-stick input turns the hull, and movement direction takes priority while travelling.
- Arc Lash acquires the nearest active enemy within actual whip reach, independently of hull direction. Spawning and unreachable enemies are ignored. Seeker missiles launch in a forward spread and then retain their homing behavior. Companion targeting and circular area effects retain their existing roles.
- Switching from the whip to a direct-fire module resets attack direction to the nose. Idle boosts also follow the hull instead of an automatically selected whip target. Removed the obsolete global touch-assistance setting; targeting is defined per weapon.
- All 95 tests passed. New checks cover nose-aligned launch cones, behind-the-ship threats, whip acquisition limits, and switching back to forward fire. A browser turn-and-fire check reported matching hull and fire headings with `fireMode=forward`, with no console warnings or errors. Proof: `art/geometry-glitch-forward.png`.

## Dispersed pressure, positional bosses, controls and music — 22 October 2026

The current pass replaces tight wave grids and mote cohesion with broad spaced sectors and independent approaches. Hunters lead escape paths, crosses circle then cut inward, cubes bait and ambush, and darts visibly lock a predicted charge. Later waves contain more enemies and mixed roles. Weapon damage was not globally increased: missiles gain a small bounded splash and Novas clear nearby hostile shots and break nearby props. Emitters and projectile silhouettes differ by weapon. Ground shading now blends broad teal, steel-blue and violet gradients.

The procedural score is an original sixteen-bar arrangement with an octave bass groove, a two-bar hook, chords, builds, drops and short breakdowns. FX have their own quieter bus, per-family rate limits and a burst budget. Energy pickups are unpitched. Automated checks validate note/envelope bounds, arrangement changes, scheduling, routing and throttling. This session did not capture or listen to audio output, so musical quality remains a listening judgment for the player.

Usability corrections: radial touch motion, a base that follows extended thumb drags, independent nose aim while strafing, no destination on touch cancellation or a released drag, A/RT boost, no boost spent by launch/resume input, a 0.45-second pickup protection window, three boss lock indicators, and no inherited debug invulnerability on a new run. Boss navigation latches one intact lock, approaches its side and keeps aiming at the core. Breaking a lock marks nearby hostile shots dead immediately, including in the current projectile iteration.

- Normal desktop run at 1280×720, without debug invulnerability: survived 11.3 seconds while changing direction, boosting, pulsing and collecting the Fan through its floor tap target. At 10.1 seconds: 5 HP, Fan equipped, 60.0 FPS, 17.5 ms frame p95. A separate unattended pickup-route check collected the Fan but died after remaining still; stationary play remains vulnerable.
- Focused boss check: used F6 and F8 to reach encounter 5. The boss spawned with three locks. Tapping its marker approached the boss and broke one lock by 20.7 seconds; two indicators remained. Observed 60.0 FPS and 16.8 ms p95. This was a feature check with invulnerability, not a survival or complete boss-balance run. Stable lock selection and aim during approach received a subsequent correction covered by regression tests.
- Portrait layout at 390×844: continuous normal keyboard navigation, boost and pulse for 8.2 seconds, 77.5 units travelled, 4 HP remaining, 21 enemies, 60.0 FPS and 17.6 ms p95. No browser warnings or errors. This checks a portrait browser viewport, not a real phone or physical touch hardware.
- Space launch check: boost cooldown remained 0.00 and debug invulnerability was false. The temporary viewport override was reset and the normal preview returned to its launch screen.
- `npm test`: 118 passing checks. New coverage includes 100-member wave spacing, independent swarm phases, interception and charges, directional boss damage, approach selection, projectile invalidation, missile splash, Nova cleanup, emitters, radial touch/cancellation, music structure, scheduling, FX throttling and separate audio buses. Existing checks cover static imports and all fifty world transitions.

Proof images: `art/geometry-glitch-malice.png` (desktop Fan combat) and `art/geometry-glitch-portrait.png` (portrait combat). They are verification images, not runtime assets. FPS values describe these short local sessions, not broad hardware benchmarks.

## Gameplay passes — 23 October 2026

Completed several normal control runs, a portrait pass and a focused boss encounter. Paused between input segments to inspect state and visuals; these were not uninterrupted human sessions. Debug invulnerability was off throughout the reported gameplay. The checks improve confidence in control and fairness, but do not establish long-term enjoyment or replace phone/controller hardware testing.

Changes driven by the passes:

- Ship movement, grounded enemies and swept projectiles now query the same ridge field. Charges stop and recover at ridges, other grounded enemies attempt flanking steps, and explosives detonate against the barrier. Projection work is cached within a surface chart and stable-world distance queries avoid computing the unused second shape.
- Holding the primary mouse button deliberately aims while travelling. A long hold or a drag returning to its starting point never becomes a destination on release. The moving aim cursor and control hint reflect this behavior.
- Incidental pickups preserve a non-default weapon. Tapping a floor weapon selects it for equip; the first upgrade from Filament equips automatically. Refills replenish without stealing the active slot. Newly collected inventory icons flash briefly.
- A close crowd or recent damage can delay one pending wave by 2.2 seconds, after which spawning resumes. The ribbon cuts only hostile shots its short contact curve actually touches.
- Boss approach distance now fits the equipped weapon. Automatic gate avoidance permits leaving a nearby gate without travelling further into it. Breaking the last lock gives a visible pulse and a short offensive window before the denser core attack pattern.
- Fast curved navigation exposed excessive camera lag and empty portrait framing. Turning now catches up faster while retaining eased angular speed; portrait focus moves toward the visible world mass. Cosmetic attack segments, particles and rings have lower drawing budgets while combat counts remain unchanged.

Observed runs:

1. Initial desktop control/terrain run: 25.5 seconds, encounter 2, 66 enemies, 1 HP remaining, 60.0 FPS and 16.9 ms rolling frame p95. This showed that indiscriminate movement and abandoned pickup routes remained risky.
2. Deliberate desktop run: collected Arc Lash through its floor target, tried the Fan, used a safe zone and selected the whip again. At 35 seconds there were 102 active enemies, 5 HP and 60.0 FPS / 16.8 ms p95. Reached encounter 5 at 69.8 seconds with 5 HP. At 77.5 seconds, after an old-range boss approach, one lock was broken and 1 HP remained; observed a temporary 45.7 FPS / 25.9 ms p95 during the boss/world transition. This prompted the weapon-range, gate routing and cosmetic-budget corrections.
3. Portrait normal run at 390×844: reached 39 seconds, encounter 2, 122 active enemies, 4 HP, 60.0 FPS / 18.3 ms p95. Its screenshots exposed the camera framing issue, which was corrected afterward.
4. Focused portrait boss check: skipped to encounter 5 with F8, without invulnerability. The corrected approach retained the boss target, did not warp, and broke the first lock with 5 HP at 15.2 seconds. All three locks were broken by 24.2 seconds with 4 HP. The ship died during the dense exposed-core attack at 30.6 seconds; this prompted the offensive-window correction, which is regression-tested. This was a feature check at early-run pressure, not proof of full-run boss balance or a completed boss victory.
5. Final portrait framing check after the corrections: reached encounter 2 at 21.7 seconds with 5 HP, Arc Lash retained, 60.0 FPS / 17.5 ms p95 and about 1 degree sampled camera error. No console warnings or errors. Proof: `art/geometry-glitch-gameplay-pass.png`. Temporary viewport override was reset; the normal preview was returned to the launch screen.

`npm test`: 135 checks pass, including shared ridge boundaries, charge impacts, fast projectile terrain sweeps, explosive contact, ribbon shot cutting, bounded wave relief, explicit pickup intent, gate escape routes, weapon-dependent boss range, the final-lock attack window, mouse aiming and release classification, and fast camera response/framing across every surface family. Existing static deployment and all-fifty-transition checks also pass. These FPS samples are local observations, not a device benchmark. Physical touch/controllers, audio listening and sustained first-time-player sessions remain outstanding validation work.


## Usability audit — 24 October 2026

- Fixed dropped boost, pulse and weapon edges when a render frame precedes the next fixed simulation step. The buffer consumes each action once, including during catch-up steps, and clears on focus loss or menus. Regression checks exercise 120 and 144 Hz rendering against the 60 Hz simulation.
- Removed the weapon-switch cooldown shortcut. Reselecting, cycling or refilling cannot rapidly fire a slow Nova. Empty-ammo fallback preserves the previous shot's recovery.
- World marker actions now wait for release, allowing a drag to begin on a weapon symbol without selecting a destination. Dedicated touch abilities remain immediate. Lost pointer capture releases steering and held aim; focus loss discards stale pointer actions. Mouse use restores mouse control after touch.
- Modal menus discard hidden world, weapon and ability hit areas. Overlapping world hit targets choose the nearest symbol while HUD buttons retain priority. Tapping sky or a ring hole leaves the existing route unchanged. Deliberate manual aim remains available during automatic travel.
- Added a brief directional red damage arc and contextual boss armor/core feedback. The floor shader now skips an unused shape outside morphs and skips expired pulse calculations. Added CPU timing diagnostics to distinguish simulation, scene preparation and drawing costs.
- Desktop keyboard checks after the input changes used normal vulnerability, Arc Lash, direction changes, boost and pulse. A 7.6-second run retained 5 HP. Local samples were only 26.7–30.9 FPS, with frame p95 of 50.2–110.3 ms. At 7.6 seconds, smoothed CPU portions were approximately 6.5 ms logic, 5.3 ms scene preparation and 1.3 ms drawing submission. These results do not establish smooth performance, and the later shader optimization has not received a visual/performance retest.
- Automatic browser approval review blocked the final reload because the account reached its usage limit. No alternate browser or indirect UI automation was used to bypass that block. The final shader/HUD changes and refreshed static packages therefore have automated verification, but the final browser reload, portrait rerun and console inspection remain unverified. The desktop test preview was left paused.
- All 143 automated checks pass, including eight new usability regressions. Static root/subpath import checks, crowded combat bounds and all fifty world transitions still pass. Both archives were rebuilt from the current source and checked for ZIP integrity. Real touch/controller hardware and sustained player sessions remain outstanding.


## Playability and combat rhythm — 25 October 2026

This pass changes the playing space and reward rhythm rather than adding more visual clutter. The existing geometric ship, forward fire, selective whip targeting, one drone, weapon inventory and endless static-hosted structure remain.

- Enlarged world scales and replaced the opening monolith's narrow shelves with broad rounded corners. The ship starts at the center of its surface chart. Opening movement has no blocking ridges; barriers ease in across subsequent encounters, retaining shared ship/enemy/projectile collision and passable gate approaches later. Camera turning accounts for boom length so a wider world cannot turn into a large camera sweep. All fifty transition and camera-clearance tests pass.
- Moved the first Arc Lash and Wave Fan pads into the portrait viewport while retaining twenty-unit separation between every equipment area. The other three opening modules require exploration. Nearby floor marks receive a small dark ink patch for contrast, using existing terrain uniforms. No floating equipment exhibits were introduced.
- Starter forward projectiles now reach about sixteen units, at modest damage, so initial kills need not require body contact. Boost and pulse accept inputs made within 140 ms of their cooldown ending; early presses expire, and pausing clears them.
- Finishing a complete formation attracts existing energy within twenty-four units for 1.25 seconds and leaves at least two seconds before another formation is scheduled. Rewards do not directly heal, reset defensive abilities, collect weapons, or count escaped enemies as kills. Existing enemies and already announced formations continue to matter.
- The implicit floor now renders only the far bounding faces, avoiding a duplicate raymarch per pixel. Instance matrices upload only the active prefix, matching the existing partial color uploads. Offscreen enemy telegraphs no longer draw lines and rings through empty sky.

Browser observations, with pauses between input segments:

1. The initial baseline movement check died at 10.3 seconds after travelling only 36.7 chart units, with repeated terrain stops. Sampled 36.6 FPS / 44.2 ms frame p95 after death. This is not a controlled before/after benchmark.
2. After the world changes, a four-second desktop movement loop travelled 58.2 units, reported no blocked terrain, retained all five shields and sampled 60.0 FPS. A longer normal desktop run collected Arc Lash, used boost and pulse, tapped a recharge zone, deployed Twin Echo, tried Orbit Cutter and returned to Arc Lash. It reached encounter three: at 41.4 seconds there were 112 enemies, three shields, three formation clears, 60.0 FPS and 17.6 ms p95. The run ended at 47.0 seconds with three sweeps. Shorter snapshots around 18–34 seconds sampled 59.9–60.0 FPS and 17.4–18.7 ms p95. No invulnerability or encounter skipping was used in that run. The first-pad positions were subsequently adjusted for portrait and verified separately.
3. At 390 by 844, both first weapon symbols and their tap targets were visible. Clicking Wave Fan collected and equipped it by 2.4 seconds, with five shields and 137 ammo. Movement, boost, pulse and forward fire continued to 8.9 seconds with five shields, 114 ammo, 24 enemies, 152.3 travel units, 60.0 FPS and 18.6 ms p95. Proof: `art/geometry-glitch-playable.png`. This used pointer clicks and keyboard travel in a portrait browser, not physical touch hardware.
4. A focused portrait boss check used F8 to skip to encounter five, with invulnerability off. Selecting the boss marker approached an armor lock and the Fan broke it. Two locks were broken before the ship died at 19.4 seconds. This confirms approach/fire interaction under pressure; it is not a completed boss victory or a full-run boss-balance result.

All 149 automated tests pass, including six new checks covering unrestricted opening travel, portrait pickup visibility and spacing, gradual solid barriers, starter forward engagement range, bounded salvage rewards, and forgiving defensive-input timing. Both deployment archives were regenerated and checked for integrity. Hardware controllers, real phone touch, sustained first-time-player sessions and a full boss victory remain unverified; these checks cannot establish long-term enjoyment on their own.


## Chaotic encounters and Apple touch layouts — 25 October 2026

- Added two broad braided arrival fronts after the opening, with independent enemy weaving. Mixed formations introduce blue hexagonal emitters after twenty seconds. They strafe, warn for 0.95 seconds and launch a split six-shot fan with a central opening. Destroying one reclaims six short-lived friendly bolts, each dealing 1.6 damage; this final counterattack addition is regression-tested.
- Rift beams appear after the opening. Their 1.65-second warning precedes 0.8 seconds of fire; each enemy takes at most one twelve-damage hit per beam. They can trigger reactor chains, damage armored enemies without erasing them, and hurt the ship. Boost protection permits a crossing; pulse cancels only beams within its radius. Later events use two parallel beams, with an open starting corridor and space between them. Rifts remain bounded, move with the chart, expire and clear on encounter changes.
- Added a shared touch-layout module with four safe-area insets, dynamic viewport handling, orientation cancellation, optional fold-segment protection and native CSS-pixel hit targets. Inventory, sticks and abilities have distinct positions in portrait, short landscape and tablet layouts. System controls are at least 44 pixels. Two thumbs and an ability finger operate independently; spare contacts cannot become aim, and multi-touch releases cannot create destinations. Pencil uses touch gesture handling. Hidden control hit areas remain blocked by modal menus.
- The responsive fixtures cover the Duo outer/inner and narrow-window ranges documented by WebKit, plus phone portrait, landscape, iPad portrait/landscape and split view. Fold APIs are optional developer-preview features; no flags were enabled. Reference: https://webkit.org/blog/18486/webkit-features-for-safari-27-1/ . Multi-pointer behavior follows the Pointer Events model: https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events/Multi-touch_interaction .

Observed normal browser run, without invulnerability or encounter skipping, paused between input segments: at 13.7 seconds the new braid contained 29 enemies and 45 total enemies were active, with five shields, 60.0 FPS and 18.3 ms p95. A rift was visible at 25.4 seconds, with five shields, 59.9 FPS and 19.3 ms p95. At 34.2 seconds, encounter three contained 100 enemies including the new emitter, prisms, diamonds, cubes and motes; five shields remained, with 57.4 FPS and 31.1 ms p95. These local samples do not establish matched performance or long-term balance. Proof of the rift warning: `art/geometry-glitch-chaos.png`.

Also booted the game in Safari on the available iPad Pro 13-inch (M5), iPadOS 27.0 simulator in Device Hub. Verified launch, actual touch-pointer input, a tap route collecting Arc Lash, drag movement, a floor pulse, pause and rotation from portrait to landscape. The inventory and ability controls stayed visible and separated. Simulator debug readings ranged roughly 22–30 FPS; this is not a physical iPad performance measurement. Keyboard capture was returned to its original off state. Proof: `art/geometry-glitch-ipad.png`. Physical iPhone Duo hardware and simultaneous multi-finger hardware play remain unverified; gesture combinations are covered automatically.

The old 5173 preview had been reused by another project, so the independent test server used `http://127.0.0.1:5181/`. All 160 automated checks pass. Both build-free static deployment archives were refreshed and checked for ZIP integrity.
