# PA Service Mod

An emergency hotfix channel for the Planetary Annihilation client. Nothing more.

This mod is enabled by default for every player who has not explicitly turned it off, and it
deploys far faster than a game build. That combination makes it the right tool for exactly one
job: shipping an urgent client-side patch when waiting for a build is not acceptable.

## What this mod is for

- Urgent client-side fixes that cannot wait for the next game build.
- Nothing else.

## What this mod is not for

- New functionality.
- General changes, tweaks, or improvements to the game.
- Anything that could ship in the base game instead.

Code that lives here is invisible to anyone reading the base game, overrides base files silently,
and makes every subsequent change to those files harder and more surprising. The complexity cost
is real and it is paid by everyone who touches the affected code later.

## Rules

1. Do not add anything here that is not an emergency.
2. Anything added here is temporary. Migrate the fix into the base game as soon as possible, then
   remove it from this mod.
3. Bump `version` in `modinfo.json` with every change.
4. This mod should sit empty. An empty mod is the correct steady state — if it is not empty, there
   is outstanding work to migrate.

## Contents

- `modinfo.json` — the mod manifest.
- `badge_uber_vip.png` — the mod icon referenced by the manifest.
