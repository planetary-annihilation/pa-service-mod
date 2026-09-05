// PA Service Mod - main menu news and events.
//
// The base game owns the whole news/events UI (ui/main/game/start/). This mod supplies
// only the data for it, so it shadows no base file: no start.html, no start.css, no start.js.
//
// modinfo.json registers this file against the 'start' scene, so it runs from
// loadSceneMods('start') in the base game's start.js. That call sits after
// `model = new LoginViewModel()` but before ko.applyBindings() and before model.setup(),
// which is what makes plain assignment onto the view model work here.
//
// ES5 only - PA's Coherent UI engine has no ES6.

(function ()
{
    'use strict';

    var ROOT = 'coui://ui/mods/pa-service-mod/';

    function warn(msg)
    {
        console.warn('[pa-service-mod] ' + msg);
    }

    // Synchronous read, mirroring the status check in helpers.js loadScript().
    // Base's loadHtml() would do the same job but ignores the HTTP status, so a
    // missing file comes back looking like content.
    function readText(url)
    {
        var xhr = new XMLHttpRequest();

        try
        {
            xhr.open('GET', url, false);
            xhr.send('');
        }
        catch (e)
        {
            warn('could not read ' + url + ': ' + e.message);
            return null;
        }

        if (xhr.status > 200 && xhr.status !== 304)
        {
            warn('could not read ' + url + ' (status ' + xhr.status + ')');
            return null;
        }

        return xhr.responseText;
    }

    function readJson(url)
    {
        var text = readText(url);

        if (!text)
            return null;

        try
        {
            return JSON.parse(text);
        }
        catch (e)
        {
            warn('malformed JSON in ' + url + ': ' + e.message);
            return null;
        }
    }

    function isArray(value)
    {
        return Object.prototype.toString.call(value) === '[object Array]';
    }

    // ----- news -----
    // FEATURED_NEWS is a hook the base game leaves for locally-baked posts: fetchNews()
    // prepends it to the remote pa_update feed and drops remote duplicates by url. Nothing
    // in setup() reassigns it, so assigning it here is enough - contrast with events below.
    function loadNews(model)
    {
        if (!('FEATURED_NEWS' in model))
        {
            warn('client has no FEATURED_NEWS hook; leaving news to the remote feed');
            return;
        }

        var index = readJson(ROOT + 'news/index.json');

        if (!isArray(index))
        {
            warn('no usable news index; leaving news to the remote feed');
            return;
        }

        var posts = [];

        for (var i = 0; i < index.length; i++)
        {
            var entry = index[i] || {};

            if (!entry.file)
            {
                warn('news index entry ' + i + ' has no file; skipping it');
                continue;
            }

            var timestamp = Date.parse(entry.date);

            if (isNaN(timestamp))
            {
                warn('news entry ' + entry.file + ' has an unreadable date; skipping it');
                continue;
            }

            // One unreadable post must not take out the rest of the feed.
            var content = readText(ROOT + 'news/posts/' + entry.file);

            if (content === null)
            {
                warn('skipping news post ' + entry.file);
                continue;
            }

            posts.push({
                title: entry.title || '',
                url: entry.url || '',
                timestamp: timestamp,
                content: content
            });
        }

        // Newest first, so index.json order never decides what players see.
        posts.sort(function (a, b) { return b.timestamp - a.timestamp; });

        model.FEATURED_NEWS = posts;
    }

    // ----- events -----
    function loadEvents(model)
    {
        if (typeof model.applyAnnouncements !== 'function')
        {
            warn('client has no announcements panel; skipping events');
            return;
        }

        var events = readJson(ROOT + 'events/events.json');

        // Only take the panel over once we know we have something valid to put in it.
        // Bailing out here leaves the base game's remote fetch intact rather than
        // suppressing it and leaving a permanently empty panel.
        if (!isArray(events))
        {
            warn('no usable events file; leaving the panel to the remote feed');
            return;
        }

        // setup() calls applyAnnouncements(PLACEHOLDER_ANNOUNCEMENTS) and then
        // fetchAnnouncements() on the very next line, so applying our data here would be
        // clobbered a moment later. Taking over the second call instead wins that race,
        // and keeps working when the PLACEHOLDER block is eventually deleted from base.
        model.fetchAnnouncements = function ()
        {
            model.applyAnnouncements(events);
        };
    }

    // This mod is enabled by default for every player, so nothing in here may be allowed
    // to break the main menu. Any failure degrades to the stock base game behaviour.
    try
    {
        var vm = (typeof model !== 'undefined') ? model : null;

        if (!vm)
        {
            warn('no view model in this scene; nothing to do');
            return;
        }

        loadNews(vm);
        loadEvents(vm);
    }
    catch (e)
    {
        console.error('[pa-service-mod] news/events injection failed: ' + (e && e.message));
    }
})();
