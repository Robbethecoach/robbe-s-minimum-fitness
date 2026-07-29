# Robbe's Minimum Fitness

Build a web app called Robbethecoach. It will become a fitness coaching platform for high-performers who want to get their body right without becoming gym obsessives. We'll focus on 'minimum viable workouts'

The app has three pages:

1. LANDING PAGE

- Hero headline: "A generalist approach to fitness"

- Subheadline: "The minimum viable workout."

- 4 pillars section with icon and one-line description for each:

  Move — Training for life.

  Fuel — Sustainable nutrition

  The chain — Building momentum.

  Think — As you think, you'll become.

- Single CTA button: "Join Robbethecoach"

- Build it in the Zweet Club branding. (Broken White (e7e6e4) - Dark Blue (0a1432))

2. WEEKLY OVERVIEW (authenticated users only)

- Page title: "Weekly overview"

- 5 fields:

  Workouts completed this week (number input, 0–7)

  Nutrition adherence (slider, 1–10)

  Sleep quality (slider, 1–10)

  Energy levels (slider, 1–10)

  What felt hard this week? (open text area)


- Submit button that saves to Supabase

3. CONTENT LIBRARY PAGE (authenticated users only)

- Page title: "The Library"

- Grid of cards, each with: title, pillar tag (Move / Fuel / Recover / Think), short description

- Filter buttons at top to filter by pillar

- Clicking a card opens a reading view with title and full text content

- Seed with 3 placeholder cards, one per pillar

Use Supabase for auth and database. Navigation between pages. Clean minimal design, dark mode default, no gradients, no heavy UI.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/42dfe4f8-7623-42a0-9d0c-26478745840e).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
