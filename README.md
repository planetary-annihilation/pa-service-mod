# PA Service Mod

Emergency client-side patch channel for Planetary Annihilation, plus the main menu
news and events content.

This mod ships enabled by default for every player. It deploys far faster than a game
build, which is the one thing it is good for and the only reason it exists.

## What belongs in here

**Emergency fixes, and nothing else.** A client-side bug is live, players are affected,
and waiting for a game build is not acceptable. That is the bar.

Anything that is not that belongs in the base game. Code that lives here is invisible to
anyone reading the base game, silently shadows base files, and makes every later change to
those files harder and more surprising to whoever makes it.

**The one standing exception is news and events** (see below). These are content, not code,
and shipping a post without a game build is the same fast-deployment argument that justifies
this mod existing at all.

## News and events

`ui/mods/pa-service-mod/` holds the main menu news posts and events, and
`inject.js` supplies them to the base game.

```
ui/mods/pa-service-mod/
  inject.js            registered against the 'start' scene in modinfo.json
  news/index.json      post metadata: title, url, date, file
  news/posts/*.html    one HTML fragment per post
  events/events.json   events, in the base game's schema
  img/                 images used by posts and events
```

`inject.js` shadows no base game file. `modinfo.json` registers it against the `start`
scene, so it runs from `loadSceneMods('start')` in the base game's `start.js` — after the
view model is built, before it is bound. From there it assigns the posts onto the base
game's `FEATURED_NEWS` hook and takes over `fetchAnnouncements` for the events panel. The
base game owns all of the news and events UI.

Because this mod is on by default, `inject.js` must never be able to break the main menu.
It feature-detects both hooks, skips individual posts that fail to load, and leaves the
remote feeds alone if its own data is unreadable rather than suppressing them and leaving
an empty panel. Any failure degrades to stock base game behaviour.

### Adding a news post

1. Add `news/posts/YYYY-MM-DD-slug.html` — a plain HTML fragment. Normal markup: headings,
   lists, images. No escaping.
2. Put any images in `img/` and reference them as
   `coui://ui/mods/pa-service-mod/img/<file>`.
3. Add an entry to `news/index.json` with `title`, `url`, `date` (ISO 8601) and `file`.
   Posts are sorted newest first by `date`, so position in the file does not matter.
4. Bump `version` and `date` in `modinfo.json`.

Posts are de-duped against the remote `pa_update` feed by `url`, so a post that later
appears in the remote feed will not show twice.

### Adding an event

Add an entry to `events/events.json`. It uses the base game's schema, so an event with
`enabled: false` or an `endTime` in the past is hidden automatically — expired events can
be left in place or removed.

## Shipping an emergency fix

1. Copy the base game file into this repo at its exact base game path, so it shadows it.
2. Make the smallest possible change.
3. Bump `version` and `date` in `modinfo.json`.
4. **Open the matching base game fix, and delete the file from here once it ships.**

Step 4 is the part that gets skipped, and it is the part that matters. A shadow left behind
after the base game is fixed silently reverts that fix for every player.
