# Shut Up and Get Structured

A live 2D molecular dynamics simulation for school students. Molecules move in real time in a small box, and the temperature is set either with a slider or by the noise in the room: quiet cools the box and structures grow; noise heats it and breaks them apart.

The whole program is one HTML file. It runs in any modern browser on a laptop, tablet or phone, with no installation and no internet connection once the page is loaded.

Made by [Dmitry Tolmachev](https://scholar.google.com/citations?user=OQtj-R4AAAAJ). Available in English, Finnish, Swedish and Russian.

---

## Contents

1. [Running it](#running-it)
2. [A first lesson in 10 minutes](#a-first-lesson-in-10-minutes)
3. [The screen](#the-screen)
4. [Game mode](#game-mode)
5. [Explore mode](#explore-mode)
6. [Energy scan mode](#energy-scan-mode)
7. [Class mode](#class-mode)
8. [The systems](#the-systems)
9. [Simulation details](#simulation-details)
10. [Hidden systems](#hidden-systems)
11. [References](#references)

---

## Running it

- **Open the file** `amphiphile-assembly-lab.html` in a browser, or open the GitHub Pages link of the repository.
- **Microphone:** the browser asks for permission the first time the microphone is used. Browsers allow the microphone only on `https://` pages or on a file opened from your own computer. Nothing is recorded or sent anywhere: the page only measures the loudness.
- **Speed:** a recent laptop runs every system smoothly. On slow phones the page automatically switches to simpler drawing (see *Drawing quality* under Box and view). Phones and old tablets run the smaller boxes well. The water systems (Ice, Oily particles) are the slowest, because each water molecule also rotates.
- **Language:** the menu in the top-right corner. The page starts in the browser's language if it is one of the four.
- **Help:** the **?** button opens a short tour of the screen. It also opens by itself on the first visit.

## A first lesson in 10 minutes

1. Open the page. It starts in **Game** mode with *Grow the biggest ice crystal* selected.
2. Press **?** and go through the seven-step tour together (1 minute). On the first screen, switch on the microphone and let the class melt the small piece of ice by making noise, then watch it freeze again when everyone is quiet.
3. Play one game with the microphone, with the whole class quiet. Discuss: why did going silent at once not give the best ice? (Slow cooling lets molecules find their places.)
4. Switch to **Explore**, pick **Soap molecules**, and drag the temperature slider under the box from cold to hot and back. Click one molecule to follow its path, and compare how far it travels when cold and when hot.
5. Finish with **Class mode** on the projector: the whole room has to stay quiet to build structures.

## The screen

| Element | What it does |
|---|---|
| **Class mode** (top right) | Full-screen projector view; the room's noise controls the temperature. See [Class mode](#class-mode). |
| **?** (top right) | Quick tour: how it works, modes, the box, temperature, games or systems, class mode and language. The first screen has a small piece of ice to melt with your voice (**Microphone** button) or with a slider; until you use either, it melts and refreezes by itself. Arrow keys move through the tour, Esc closes it. |
| **Language** (top right) | English, Suomi, Svenska, Русский. |
| **Simulation box** | The molecules, moving in real time. The box is periodic: a molecule that leaves on one side comes back on the other. |
| **Temperature bar** (under the box) | Shows the set temperature T* and the measured kinetic temperature. Drag the slider to set the temperature. **Mic** switches to room-noise control; the bar under it shows the noise level. |
| **Legend** (under the box) | Names the colours of the current system and shows the box size. |
| **Click a molecule** (Explore and Energy scan) | Rings it and draws its path over the last few seconds. Click it again or press Esc to stop. For chains the whole chain is followed. |
| **Mode switch** (right) | **Game**, **Explore** and **Energy scan**. |
| **In everyday life** (bottom) | Short real-world examples for the current system. |

**On phones** the box and the temperature bar stay at the top of the screen. The mode switch moves to a bar at the bottom (**Game**, **Explore**, **Energy scan**, **Options**), and all panels open in a sheet that slides up from the bottom. **Game** and **Explore** open their options; **Energy scan** goes straight to the scan buttons and graphs under the box; **Options** in Explore opens at the current system's settings. Picking a game or a system, pressing Start, tapping outside the sheet or ✕ closes the sheet again.

Temperatures are in reduced units (T*). They are not degrees Celsius: each system has its own natural scale, and the slider covers the useful range for that system.

## Game mode

Four 30-second games. Each one shows its goal, a short description, and up to three stars.

| Game | System | Goal | Stars at |
|---|---|---|---|
| **Grow the biggest ice crystal** | Ice | Turn as much water into ice as possible. | 40%, 48%, 55% ice |
| **Separate the liquids** | Two liquids | Separate two mixed liquids as far as possible. | s = 0.60, 0.72, 0.79 |
| **Deliver the drug** | Soap molecules carrying drug | Heat only during the red target windows, so the micelles release their drug at the right moment. Drug released at other times is lost. | 40%, 65%, 85% delivered |
| **Grow the longest gel strand** | Proteins | Unfold the proteins with heat, then cool them so they link into the longest possible network. | 80, 130, 170 σ path |

How a game runs:

- Press **Start**. A 3-2-1-Go countdown runs over the box; the clock and the molecules wait for it.
- **Use the microphone** (ticked by default) lets the room control the temperature. Untick it to use the slider instead.
- During the game, the bar shows the score now, the star levels and the time left. When a new star is reached, the stars pop up over the box.
- At the end, the box shows the best moment of the run (press **Resume** to let it continue from there). The text gives the score and one random fact related to the game. Students who get 0 or 1 star also get a tip.
- **Statistics on this device** lists games played, average and best score for each game. They are stored only in this browser. **Reset statistics** clears them.
- **Give up** ends a game early; **Play again** restarts it.

Each game needs a different strategy, which is what makes them good discussion starters:

- **Ice** rewards slow cooling (annealing): going silent at once freezes a disordered jumble.
- **Separate the liquids** rewards a temperature that is cold enough to separate but warm enough for molecules to move: too cold and everything freezes in place.
- **Deliver the drug** rewards timing: the micelles need a moment to open, so start the noise just before each window and stop just before it ends.
- **Gel strand** rewards heat-then-cool: folded proteins cannot link, and too much heat breaks the links.

## Explore mode

Free experimentation with any system. The panels on the right:

### System

Seven systems, described in detail under [The systems](#the-systems):

| Button | What it shows |
|---|---|
| **Ice** | Water freezes into a honeycomb and melts on heating. |
| **Two liquids** | Two liquids mix when hot and separate when cooled. |
| **Soap molecules** | Soap-like molecules form micelles and bilayers when cold. |
| **Plastic** | Stiff polymer chains crystallize below T* ≈ 1.5. |
| **Polymer chains** | Flexible chains in a poor solvent: swollen coils when hot, collapsed globules when cold. |
| **Proteins** | Folded proteins hide sticky sites; heat unfolds them and they clump. |
| **Oily particles** | Nonpolar particles in water dissolve when cold and gather when warm. |

### Temperature

- **Cool to … / Heat to …** jump to a typical cold or hot temperature for the system.
- **Pause / Resume** stops and restarts the simulation.
- With the microphone on (**Mic** under the box), two more settings appear:
  - **Sensitivity (dB span)**: how much louder than the quiet level the room must get to reach the maximum temperature. Lower values make the box react to quieter sounds.
  - **Set quiet level**: listens for a moment and takes that as "silence". Press it once with the room quiet before playing.

### Live readouts

Six numbers for the current system, updated several times a second, and two plots over time: the temperature (set and measured) and the system's main structural measure. The readouts change with the system; their meaning is given under [The systems](#the-systems). Besides them, every system shows the elapsed simulation time, the energy per bead and the speed (steps per second).

### Composition and interactions

Only the controls that apply to the current system are shown.

| Control | System | What it changes |
|---|---|---|
| **Antifreeze particles** | Ice | 0–100 particles, twice the size of a water molecule, that attract water but have no hydrogen-bond arms (the box rebuilds). They lower the melting point and stop the water from freezing; about 80 keep most of the water liquid. |
| **Concentration** / **Number of …** | all | How many molecules of the solute there are. Changes are applied live: molecules are added or removed. |
| **Tail–tail attraction ε_BB** | Soap molecules | How strongly the oily tails stick together. Lower acts like heating. |
| **Head–solvent attraction ε_AS** | Soap molecules | How strongly the heads like the solvent. |
| **Head diameter σ_A** | Soap molecules | Larger heads make cone-shaped molecules that prefer curved micelles to flat bilayers. |
| **Polymer–polymer attraction ε_PP** | Plastic, Polymer chains, Oily particles | How strongly polymer beads attract each other. |
| **Chain stiffness k_bend** | Plastic | How strongly the chains resist bending. |
| **Chain length N_c** | Plastic, Polymer chains, Oily particles | Beads per chain (rebuilds the system). For Oily particles, length 1 gives free particles and longer lengths give chains. |
| **S–C attraction ε_SC** | Two liquids | Attraction between the two liquids. Lower means more incompatible, so they separate more readily. |
| **Stickiness of the hidden beads ε_XX** | Proteins | How strongly exposed sticky beads stick to other proteins. Set it to 0 for the control: the proteins still unfold, but nothing clumps. |
| **Hydrophobic attraction ε_h when warm** | Oily particles | Attraction between nonpolar particles, switched on at warm temperatures. Added by hand (see the system description). |
| **Solute–water attraction ε_w when cold** | Oily particles | Attraction between the particles and water, active at cold temperatures. Added by hand. |
| **Water hydrogen bonds on** | Oily particles | Untick for the control: plain Lennard-Jones water without hydrogen bonds. |

### Model and integrator (collapsed by default)

| Control | What it does |
|---|---|
| **Thermostat** | **Langevin** (default) adds friction and random kicks to every molecule. **Bussi** rescales all velocities together and keeps the natural motion of the liquid. |
| **Friction γ** (Langevin) | Higher friction slows the molecules down. The water systems use γ = 0.1 by default so that particles meet within seconds. |
| **Coupling time τ_T** (Bussi) | How quickly the temperature follows the set point. |
| **Constant pressure (barostat)** | The box grows or shrinks to hold the pressure, instead of keeping its size. The view keeps the molecules the same size on screen and fills the edges with periodic copies, so the box edge never shows. Available in Explore only. |
| **Target pressure P\*** | The pressure to hold. When the barostat is switched on, it first measures the current pressure and holds that. |
| **MD steps per frame** | How many simulation steps run between two pictures. More steps make the simulation faster but can make the animation stutter. |
| **Adjust steps per frame automatically** | Keeps the animation smooth on slower devices. |

### Box and view (collapsed by default)

| Control | What it does |
|---|---|
| **Box size** | 36, 48 or 64 sites wide. Smaller boxes run faster. |
| **Drawing quality** | **Automatic** (default on phones and tablets; computers start at **Full**) watches how long each frame takes and, on slow devices, draws more simply, one step at a time: first at normal pixel density instead of double; then without the water-arm lines and with less frequent readouts; then only every second frame and without the solvent (except in Ice and Two liquids, where the solvent is the system). It never steps back up by itself during a session. The speed line under the readouts says when lighter drawing is on. **Full**, **Lighter**, **Light** and **Lightest** fix the level by hand. |
| **Initial state** | **Ordered** starts from the cold structure (crystal, bilayers, folded proteins…), so heating destroys it right away. **Disordered** starts hot and mixed, so cooling shows it assembling. |
| **Rebuild system** | Starts again from the chosen initial state. |
| **Show solvent** | Hide the solvent to see the solute structure more clearly. |
| **Highlight hydration-shell water** | (Oily particles) colours the water touching a particle. |
| **Color by micelle / cluster** | Gives each cluster its own colour. |
| **Show bonds** | Draws the bonds inside molecules. |

## Energy scan mode

The computer heats (or cools) the system slowly and measures its energy at every temperature, then draws four graphs:

1. **Energy U**: climbs as the structure breaks, because broken contacts cost energy.
2. **Heat capacity C = dU/dT**: how much heat it takes to warm up a little. The peak is the melting point: there, the heat goes into breaking the structure instead of warming it.
3. **Entropy S**: the amount of disorder. It jumps up when the structure breaks.
4. **Free energy F = U − T·S**: nature picks the state with the lower F. Where the dashed lines for "stayed ordered" and "stayed broken" cross, both are equally good: that is the melting point.

Controls: **Heating scan**, **Cooling scan**, **Stop**, and the scan duration (Fast 80 τ, Normal 160 τ, Slow 320 τ). A heating scan finds the transition at a higher temperature than a cooling scan; that hysteresis is real and gets smaller with slower scans. The panel **What do the graphs mean?** explains the graphs in plain words for students.

## Class mode

For a projector. The page goes full screen with the box on the left and, on the right, large readouts: the system's main score, the temperature, and a room-noise bar. The microphone switches on automatically.

- **System menu**: Ice, Two liquids, Soap molecules, Plastic, Polymer chains, Proteins, Oily particles.
- **Set quiet level**: press it once with the class silent.
- **Pause** and **Exit class mode** (or Esc).

Suggested use: ask the class to build structures together (everyone quiet), then let one group make noise and watch them break. Ice and Soap molecules give the most visible response.

## The systems

All systems are 2D. Beads interact through Lennard-Jones potentials unless stated otherwise; lengths are in bead diameters σ, energies in ε, time in τ, and temperature as T* = k_BT/ε.

### Ice

**What is simulated.** About 840 water molecules in the Mercedes-Benz (MB) model. Each molecule is a disk with three arms 120° apart, like a simplified H₂O that can make three hydrogen bonds. Two molecules bond when they are one unit apart and an arm of each points at the other. The start is a perfect 2D ice crystal: a honeycomb in which every molecule holds 3 hydrogen bonds. A molecule counts as ice (blue) when it and all its close neighbours hold 3 hydrogen bonds. Units are those of the MB model: lengths in hydrogen-bond distances, temperature as k_BT/ε_HB.

**What to look for.**
- Cold (T* = 0.12): the honeycomb stays, about 80–95% ice, with molecules only wobbling.
- Around T* = 0.18 the crystal starts to fall apart from defects; at 0.22 it is fully liquid within about 20 τ, and hydrogen bonds per molecule drop from 3 to about 1.4.
- Cool it again and it does not come straight back: 200 τ at T* = 0.10–0.13 rebuilds only about 40% ice, as small crystals with defects between them. Freezing needs a nucleus to grow from, so a liquid can stay supercooled well below the melting point. The energy scan shows the same hysteresis.
- The liquid is denser than the ice, so it opens small holes when the ice melts at fixed box size. Real ice floats for the same reason.

**Antifreeze particles.** The slider adds 0–100 particles that attract water (LJ, ε = 1.0) but have no hydrogen-bond arms, so they cannot be part of the honeycomb. They are twice the size of a water molecule (σ = 1.4). Smaller particles fit into the holes of the honeycomb and get frozen in without harm, so they barely affect the ice. At this size each particle holds a patch of liquid water around itself, and the ice can only grow away from them, as with salt or antifreeze. Measured from the ice start, 30 τ at each temperature (fraction of water in ice):

| T* | 0 particles | 20 | 40 | 80 |
|---|---|---|---|---|
| 0.10 | 96% | 75% | 49% | 21% |
| 0.13 | 80% | 63% | 42% | 15% |
| 0.16 | 62% | 44% | 28% | 8% |
| 0.19 | 18% | 11% | 4% | 1% |

Cooling the liquid to T* = 0.12 for 200 τ gives 39% ice without particles, 33% with 20, 22% with 40 and 9% with 80. The particles stay spread out; they do not clump.

**Readouts.** Ice fraction, hydrogen bonds per molecule, molecules with 3 hydrogen bonds, number of molecules, energy per molecule, density.

### Two liquids

**What is simulated.** Two liquids, S and C, of identical size. Like pairs attract with ε = 1, unlike pairs with ε_SC = 0.3. In the regular-solution picture the mixture separates below a critical temperature that grows with the mismatch 1 − ε_SC. There are no molecules here, only atoms, so this is the simplest example of a phase transition driven by energy against mixing entropy.

**What to look for.**
- The ordered start is four stripes of liquid C at T* = 0.8 (s ≈ 0.8). Heat to 2.0: the stripes dissolve (s ≈ 0.3 after 15 τ, 0.1 after 50 τ).
- From a disordered start, cool from 2.0 to 0.8: S-rich and C-rich domains appear and slowly coarsen. s rises from about 0.05 to 0.3 within 50 τ and keeps rising slowly, because coarsening in 2D is slow.
- At 50% C the domains form interconnected stripes (spinodal decomposition); at 15–20% C, isolated droplets.
- Compare the Langevin and Bussi thermostats to see how momentum transport affects coarsening.

**Readouts.** Demixing s (0 = fully mixed, 1 = fully separated; like-contact fraction compared with an ideal mixture), interface beads, domain width (rough estimate: 2 × bead spacing / interface fraction), fraction of liquid C, unlike contacts per bead, beads.

### Soap molecules (amphiphiles)

**What is simulated.** Each amphiphile is an A–B dumbbell held by a harmonic bond. Every bead feels a Lennard-Jones potential, cut and shifted to zero at r_c:

```
U_LJ(r)   = 4ε[(σ/r)¹² − (σ/r)⁶] − U_LJ(r_c)
U_bond(r) = ½ k (r − r₀)²,  k = 200
```

Only the tail–tail pair (and optionally head–solvent) keeps the attractive well, with r_c = 2.5σ. All other pairs are purely repulsive (WCA, r_c = 2^(1/6)σ). The drive to assemble is the B–B attraction against an athermal solvent. Number density is 0.6.

**What to look for.**
- The ordered start is five bilayers at T* = 0.5. With equal head and tail sizes (σ_A = 1.0) they stay intact. Heat to 2.0: they break up within 5–15 τ (aggregated fraction 99% → about 30%).
- Set σ_A to 1.2 and rebuild: the bilayers fragment even when cold, because cone-shaped molecules prefer curved micelles (the packing-parameter argument).
- From a disordered start at T* = 2.0, cool to 0.5: tails find each other and small micelles grow over tens of τ. Heat back: they fall apart within a few τ. Breakup is fast and assembly is slow, because assembly needs diffusion and collisions.
- At T* = 0.5, lower the concentration to about 8%: most molecules stay free. Raise it to 50%: most join micelles. The free-dumbbell density levels off near the critical micelle concentration; allow 100 τ or more per concentration to see it.
- Lowering ε_BB acts like heating.

**Readouts.** Aggregated fraction, number of aggregates, largest aggregate, mean aggregation number, number of dumbbells, free dumbbells per σ². A micelle is any cluster of at least 4 molecules whose tails are within 1.5σ.

### Plastic (stiff polymer)

**What is simulated.** Each chain is N_c P beads (3–40, 12 by default) joined by harmonic bonds, with a bending penalty that favours straight chains. P–P pairs attract with well depth ε_PP (r_c = 2.5σ). P–S and S–S pairs are purely repulsive, so the solvent is poor for the polymer.

```
U_bend(α) = k_bend (1 − cos α),  α = angle between consecutive bonds
```

Defaults ε_PP = 1.75 and k_bend = 6.4 were calibrated for N_c = 12 at 40% polymer; other lengths shift the crossover.

**What to look for.**
- The ordered start is a crystal slab of straight, hexagonally packed chains at T* = 1.2 (about 85% crystalline). Heat to 2.0: it drops to about 25% within 5 τ but a remnant survives; at 2.5 it melts completely. The crystal melts at a higher temperature than it forms on cooling: hysteresis.
- From a disordered start at T* = 2.2, cool to 1.2: within tens of τ, segments align into small crystallites (gold). Crystallinity stays partial (about 20% after 75 τ at 40% polymer), as in real semicrystalline polymers.

**Readouts.** Crystalline fraction, number of crystallites, largest crystallite (beads), mean size, chains, mean radius of gyration R_g. A bead is crystalline when its six-fold order |ψ₆| exceeds 0.6 and agrees in phase with at least 4 polymer neighbours within 1.45σ, inside a crystallite of 10 or more beads.

### Polymer chains

**What is simulated.** Flexible P chains (20 beads, 5% of beads) in an athermal solvent. P–P pairs attract with ε_PP = 1.0 (r_c = 2.5σ); P–S and S–S pairs are purely repulsive, so the solvent is poor for the polymer. The attraction does not depend on temperature; its effect is set by ε_PP/k_BT: weak when hot, so chains are swollen coils; strong when cold, so they collapse. This is upper-critical-solution (UCST) behaviour, the standard poor-solvent case of polymer physics.

**What to look for.**
- The ordered start is collapsed globules at T* = 0.6. Heat to 2.2: they swell within about 15 τ (R_g 1.9σ → 2.9σ, self-contact 0.76 → 0.47).
- From a disordered start at 2.2 (R_g ≈ 3.4σ), cool to 0.6: they collapse into compact globules (R_g ≈ 2.6σ) within tens of τ, the coil-to-globule transition below the θ temperature.
- Raise the concentration to 20% or more and cooling makes chains stick together into a polymer-rich phase instead; then watch the self-contact fraction rather than R_g.

**Readouts.** Self-contact fraction, mean R_g, solvent contacts per bead, chains, chain length, R_g relative to the start.

### Proteins

**What is simulated.** Thirty small "proteins" in a solvent. Each is a chain of 37 beads that folds into one compact disc, its native fold. The fold is held together by native contacts: bead pairs that touch in the folded shape attract each other (strength 2.5). This is a Gō-type model, a standard simplification in protein research. Nineteen beads (orange) are sticky sites. In the fold they sit in the core, wrapped by a ring of 18 ordinary beads, so they are hidden: cryptic binding sites. They attract the sticky beads of other proteins (ε_XX = 4), but not those of their own protein. The start is every protein folded at T* = 0.6.

**What to look for** (averages over 80 τ at each temperature).
- **Cold (T* = 1.0): folded and separate.** The outer ring keeps the core covered: only about 3% of the sticky beads touch the solvent, and almost no proteins are in clumps.
- **Medium (T* ≈ 1.6–3): unfolded and clumped.** The folds open, the sticky beads come out, and proteins that meet stick together: three quarters of them in clumps.
- **Hot (T* = 5–7): dissolving.** The proteins stay unfolded, but heat breaks contacts faster.
- So clumping rises and then falls with temperature: the hidden beads need heat to come out, and too much heat pulls them apart. With ε_XX = 0 the proteins still unfold, but nothing clumps.

**Readouts.** Proteins in clumps, largest clump, folded fraction (native contacts), hidden beads exposed, sticky contacts between proteins, proteins.

### Oily particles (hydrophobic)

**What is simulated.** Nonpolar particles (σ = 1.5) in Mercedes-Benz water, the same water as in Ice:

```
U_HB = −ε_HB G(r − 1) Σ_k G(i_k·u − 1) Σ_l G(j_l·u + 1),   G(x) = exp(−x²/2σ²), σ = 0.085
U_LJ: ε = 0.1, σ = 0.7 (water–water)
```

Units are those of the MB model, so the useful range is T* ≈ 0.12–0.40. Waters rotate as well as translate; the thermostat acts on both. Number density is 0.85 and the time step 0.01.

**Hydrophobic interactions added by hand.** In 2D MB water the water's own push on the particles is real but weak (about 1 kT at contact) and hard to see. The main reason is size: the particles are in the small-solute regime, where even real water gives only a weak attraction; the strong, dewetting-driven hydrophobic attraction appears only for objects larger than about 1 nm (Lum, Chandler and Weeks 1999). So two interactions are added and switched by temperature with a smooth switch s(T), which goes from 0 at T* ≤ 0.18 to 1 at T* ≥ 0.32:

```
particle–water:    ε_PW = ε_w · (1 − s(T))      default ε_w = 0.4
particle–particle: ε_PP = 0.1 + ε_h · s(T)      default ε_h = 1.0
```

Cold, the particles are attracted to water, so they dissolve. Warm, that attraction is gone and the particles attract each other, so they aggregate. This copies the real hydrophobic attraction, which is entropic and gets stronger with temperature. Set both ε_w and ε_h to 0 and use the hydrogen-bond switch to see the water's own, smaller effect: hydrogen bonds on roughly double the clustering compared with plain LJ water.

**What to look for.**
- Cold (T* = 0.18 or below): the particles stay dissolved; practically none are in clusters.
- At 0.24 a few small clusters appear.
- Warm to 0.30: they gather into compact blobs, 70–85% in clusters within about 100 τ, the largest holding 9–12 particles. On a laptop this takes 20–30 seconds.
- Cool again: the blobs dissolve within about 40 τ.
- The water network: about 2.5 hydrogen bonds per water at T* = 0.14, 1.7 at 0.20, 1.1 at 0.26 and 0.8 at 0.34.

**Readouts.** Fraction in clusters of 3 or more, largest cluster, water molecules in the hydration shell, hydrogen bonds per shell water and per bulk water, number of particles. With chain length above 1, the readouts switch to the chain's self-contact fraction and R_g.

## Simulation details

- **Integrator:** velocity Verlet, time step Δt = 0.005 in reduced LJ units (0.01 for the MB water systems), periodic boundaries and cell lists.
- **Thermostats:** Langevin dynamics with the BAOAB splitting, or Bussi stochastic velocity rescaling:

  ```
  Langevin  m dv = F dt − γ m v dt + √(2γ m k_B T) dW
  Bussi     K ← stochastic rescale toward ½ N_f k_B T
  ```

  Langevin damps momentum locally, so it slows diffusion and removes hydrodynamics as γ grows. Bussi rescaling preserves momentum and leaves the Newtonian dynamics nearly intact, so solvent flow survives.
- **Start:** each system starts from its ordered, cold-equilibrium structure, relaxed for 1 τ (Ordered) or from a melted, mixed state (Disordered).
- **Barostat (optional):** Berendsen-type isotropic box scaling. The pressure is computed from the virial, P = (2K + Σ r_ij·F_ij)/(2A), smoothed over about 2 τ, and the box area relaxes towards the target: d ln A/dt ∝ (P − P₀). The box length can change by at most 0.2% every 10 steps and stays between 60% and 150% of its start. Not available for games or energy scans.
- **Energy scan:** the temperature ramps linearly and the energy is binned by temperature. C = dU/dT is taken from the binned energies, S by integrating dS = dU/T, and F = U − TS. Straight-line fits of U below and above the peak give the two phase branches, extrapolated across the transition; where their free energies cross is the transition estimate. Because the ramp is finite, a heating scan overshoots and a cooling scan undershoots. Single or dilute chains give only a smooth crossover with no clear peak, and in MB water the dominant peak near T* = 0.2 is the melting of the water's own hydrogen-bond network.
- **Microphone:** the page measures the loudness in decibels above the quiet level and maps it linearly, over the sensitivity span, onto the temperature range of the system.

## Hidden systems

Three systems are still in the code but hidden from the menu, because they need more work:

- **Diblock copolymer:** chains of an A block and a B block that dislike each other, forming microphase-separated domains about one chain size wide. Works, but the change with temperature is gradual and slow in 2D.
- **Brush + droplet:** a polymer brush grafted on a surface with a liquid droplet on top, whose wetting should switch with temperature. The change in surface chemistry is real, but the contact angle of a droplet this small fluctuates too much to show it.
- **Plates in water:** two flat plates in MB water. Water-fearing plates dry out the gap between them and snap together; water-attracting and hydrogen-bonding plates keep water in the gap.

## References

- Ben-Naim, A. (1971). Statistical mechanics of "waterlike" particles in two dimensions. *J. Chem. Phys.* 54, 3682.
- Silverstein, K. A. T., Haymet, A. D. J. & Dill, K. A. (1998). A simple model of water and the hydrophobic effect. *J. Am. Chem. Soc.* 120, 3166.
- Lum, K., Chandler, D. & Weeks, J. D. (1999). Hydrophobicity at small and large length scales. *J. Phys. Chem. B* 103, 4570.
- Bussi, G., Donadio, D. & Parrinello, M. (2007). Canonical sampling through velocity rescaling. *J. Chem. Phys.* 126, 014101.
- Leimkuhler, B. & Matthews, C. (2013). Rational construction of stochastic numerical methods for molecular sampling. *Appl. Math. Res. Express* 2013, 34 (BAOAB).
- Berendsen, H. J. C. et al. (1984). Molecular dynamics with coupling to an external bath. *J. Chem. Phys.* 81, 3684.
