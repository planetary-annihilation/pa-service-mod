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

## Temporary exception: main menu news and events

**The main menu news and events are hosted here for now.** They are the one thing in this mod
that is not an emergency hotfix, and they are here deliberately and temporarily.

There is currently nowhere else to put them. The base game reads news from the `pa_update` bucket
and events from the `pa_events` bucket, but neither is writable by the people who publish this
content, so a post would otherwise have to wait for a game build. Hosting it here is the same
fast-deployment argument that justifies the mod existing at all, which is why this exception is
tolerable — but it is still an exception.

This exception ends when `pa_update` and `pa_events` can be written directly. At that point the
content moves to the buckets and this mod goes back to being empty. Until then, treat it as the
only permitted resident.

### How it works

The mod **shadows no base game file**. The entire news and events UI — the article list, the
expanding reader, the events panel, the countdowns, the styling — belongs to the base game in
`ui/main/game/start/`. This mod only supplies the data for it.

`modinfo.json` registers `ui/mods/pa-service-mod/inject.js` against the `start` scene. The base
game calls `loadSceneMods('start')` after building the start screen view model but before binding
it, so `inject.js` assigns the news posts onto the `FEATURED_NEWS` hook the base game leaves for
exactly this purpose, and takes over `fetchAnnouncements` for the events panel. If a future client
does not have those hooks, `inject.js` logs and does nothing, and the main menu behaves as stock.

That is the important property: this exception costs one small data file registered against one
scene, not an override of a base game file. Deleting the mod restores stock behaviour exactly.

### Publishing a news post

1. Write the post as an HTML fragment in `ui/mods/pa-service-mod/news/posts/`, named
   `YYYY-MM-DD-short-slug.html`. It is a fragment, not a document — no `<html>` or `<body>`.
2. Put any images in `ui/mods/pa-service-mod/img/` and reference them as
   `coui://ui/mods/pa-service-mod/img/<file>`. **Check the file size**; see the note below.
3. Add an entry to `ui/mods/pa-service-mod/news/index.json` with `title`, `url` (the Steam news
   link), `date` (ISO 8601 UTC) and `file`. Order does not matter — posts are sorted newest first.
4. Bump `version` and `date` in `modinfo.json`.

Posts are shown ahead of the remote `pa_update` feed, and a remote post with the same `url` is
dropped in favour of the local one.

### Publishing an event

Edit `ui/mods/pa-service-mod/events/events.json` and bump `version` in `modinfo.json`. The schema
is the base game's, documented above `ANNOUNCEMENTS_URL` in `ui/main/game/start/start.js`. Events
with `enabled: false`, or whose `endTime` has passed, are hidden automatically.

While this file exists the mod owns the events panel outright and the remote `pa_events` fetch is
suppressed, so an empty array means "no events", not "fall back to the bucket".

### Outstanding

`img/news_helios.gif` is 30 MB, of roughly 43 MB of images in total. Every player downloads that,
on a mod whose entire justification is deploying quickly. It should be re-encoded, and new posts
should not add images on that scale.

Do not treat this exception as precedent. Adding anything else non-emergency needs the same
explicit justification and its own note here.

## Contents

- `modinfo.json` — the mod manifest.
- `badge_uber_vip.png` — the mod icon referenced by the manifest.
- `README.md` — this file.
- `ui/mods/pa-service-mod/` — the temporary news and events exception described above.
  - `inject.js` — supplies the data to the base game's start screen.
  - `news/index.json`, `news/posts/` — the news posts.
  - `events/events.json` — the events panel content.
  - `img/` — images used by both.
