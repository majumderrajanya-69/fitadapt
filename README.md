# FitAdapt

A fitness tracking web app that builds a workout plan around the user, then adjusts it after every session.

**Live demo:** (https://majumderrajanya-69.github.io/fitadapt/)

## How it works

1. **Personalise** – the user picks a goal (strength, muscle, endurance), experience level, equipment and training days. The app builds a split and sets starting weights and rep ranges.
2. **Log** – after each workout the user enters reps per set, the weight lifted, and how the session felt (easy / just right / hard).
3. **Adapt** – the engine uses double progression:
   - All sets hit the target → add reps first, then add weight once the top of the rep range is reached.
   - "Easy" feedback → bigger jumps. "Hard" feedback → hold the load.
   - Targets missed twice in a row → automatic 10% deload.
4. **Guide** – the next workout screen shows exactly what to lift and why it changed.

## Tech

Vanilla HTML, CSS and JavaScript. No build step. Data is stored in the browser with `localStorage`.

## Run locally

Open `index.html` in a browser, or run `npx serve .`

## Roadmap

- Progress charts per lift
- Rest timer
- Export / import data
- Installable PWA
