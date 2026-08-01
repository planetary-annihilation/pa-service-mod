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

## Temporary exception: main menu news

**The main menu news is hosted here for now.** It is the one thing in this mod that is not an
emergency hotfix, and it is here deliberately and temporarily.

News posts are written directly into the start screen override, so hosting them here lets a post
go out without waiting for a game build. That is the same fast-deployment argument that justifies
the mod existing at all, which is why this exception is tolerable — but it is still an exception,
and it still carries the costs described above.

This exception ends when news content can be driven remotely rather than shipped as code. Until
then, treat it as the only permitted resident of this mod.

### What that covers

- `ui/main/game/start/start.html`, `start.css`, `start.js` — the start screen override.
- `ui/main/game/start/img/` — news post images.

Note that these three files are a **whole start screen override**, not a news module. PA mods
replace files wholesale, so there is no way to override only the news portion of `start.html`.
Keeping news here therefore also keeps the nav, leaderboard, Twitch and video panels, useful
links, featured mods, and events panel overridden. Anything in those areas that belongs in the
base game should still be migrated there — this exception covers news, not everything that
happens to share a file with it.

Do not treat this exception as precedent. Adding anything else non-emergency needs the same
explicit justification and its own note here.

## Contents

- `modinfo.json` — the mod manifest.
- `badge_uber_vip.png` — the mod icon referenced by the manifest.
- `README.md` — this file.
- `ui/main/game/start/` — the temporary news exception described above.
