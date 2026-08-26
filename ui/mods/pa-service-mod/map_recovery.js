/* Local Map Recovery
 *
 * Saved and imported systems live in the IndexedDB 'misc' store; the only reference to
 * them is the localStorage key 'systems', which holds a 32 character object key. When
 * that pointer was lost, stock code created a fresh empty object and repointed at it,
 * leaving the real systems in the database with nothing referring to them.
 *
 * This mod looks for those orphans and points the game back at them. It only ever adds:
 * no object is deleted, and a merge is written under a new key so the generation most
 * likely to hold the player's work survives even if the merge is wrong.
 *
 * The scan runs at most once per profile (localStorage 'systems_recovery_scan'), so a
 * list the player emptied on purpose is not resurrected on every launch.
 */

(function () {
    'use strict';

    var DB_NAME = 'misc';
    var POINTER_KEY = 'systems';
    var MARKER_KEY = 'systems_recovery_scan';
    var PREFIX = '[map-recovery] ';

    function log(message) {
        console.log(PREFIX + message);
    }

    function isValidKey(key) {
        return typeof key === 'string' && key.length === 32; /* matches UberUtility.isInvalidUUIDString */
    }

    function makeKey() {
        if (window.UberUtility && UberUtility.createUUIDString)
            return UberUtility.createUUIDString();

        var chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        var key = '';
        for (var i = 0; i < 32; i++)
            key += chars.charAt(Math.floor(Math.random() * chars.length));
        return key;
    }

    /* every db: slot in stock is an array or an object, so _.isEmpty answers this for all
       of them; a primitive payload would be real data, hence the fallthrough */
    function hasData(value) {
        if (value === undefined || value === null)
            return false;

        if (_.isArray(value) || _.isString(value) || _.isPlainObject(value))
            return !_.isEmpty(value);

        return true;
    }

    function openDatabase() {
        var deferred = $.Deferred();
        var request;

        try {
            request = indexedDB.open(DB_NAME); /* no version: never trigger an upgrade */
        }
        catch (e) {
            deferred.resolve(null);
            return deferred.promise();
        }

        request.onsuccess = function (event) {
            var db = event.target.result;

            if (!db || !db.objectStoreNames || !db.objectStoreNames.contains(DB_NAME)) {
                deferred.resolve(null);
                return;
            }

            deferred.resolve(db);
        };

        request.onerror = function () {
            deferred.resolve(null);
        };

        request.onupgradeneeded = function (event) {
            /* the store does not exist on this profile; abort so opening it does not
               create one, and treat it as nothing to recover */
            try {
                event.target.transaction.abort();
            }
            catch (e) {
            }
        };

        return deferred.promise();
    }

    /* resolves every stored object, or null if the store could not be read — "nothing
       here" and "could not look" must not be confused, or a read failure would be taken
       as proof that there is nothing to recover */
    function readAll(db) {
        var deferred = $.Deferred();
        var results = [];
        var request;

        try {
            request = db.transaction([DB_NAME], 'readonly').objectStore(DB_NAME).openCursor();
        }
        catch (e) {
            deferred.resolve(null);
            return deferred.promise();
        }

        request.onsuccess = function (event) {
            var cursor = event.target.result;

            if (!cursor) {
                deferred.resolve(results);
                return;
            }

            if (cursor.value && cursor.value.value !== undefined)
                results.push({ db_key: cursor.value.db_key, value: cursor.value.value });

            cursor.continue();
        };

        request.onerror = function () {
            deferred.resolve(null);
        };

        return deferred.promise();
    }

    function putObject(db, key, value) {
        var deferred = $.Deferred();

        try {
            var transaction = db.transaction([DB_NAME], 'readwrite');
            transaction.objectStore(DB_NAME).put({ db_key: key, value: value });
            transaction.oncomplete = function () { deferred.resolve(key); };
            transaction.onerror = function () { deferred.resolve(null); };
        }
        catch (e) {
            deferred.resolve(null);
        }

        return deferred.promise();
    }

    /* largest surviving generation wins; older ones are merged in behind it, first
       occurrence of a name winning, so repeated losses do not multiply entries */
    function pickAndMerge(records) {
        var candidates = _.filter(records, function (entry) {
            return hasData(entry.value);
        });

        if (!candidates.length)
            return null;

        var best = null;
        var bestWeight = -1;
        _.forEach(candidates, function (entry) {
            var weight = _.isArray(entry.value) ? entry.value.length : 1;
            if (weight > bestWeight) {
                best = entry;
                bestWeight = weight;
            }
        });

        var value = best.value;

        if (_.isArray(value) && candidates.length > 1) {
            var seen = {};
            var merged = [];
            var ordered = [best].concat(_.filter(candidates, function (entry) {
                return entry.db_key !== best.db_key;
            }));

            _.forEach(ordered, function (entry) {
                if (!_.isArray(entry.value))
                    return;

                _.forEach(entry.value, function (item) {
                    var name = item && item.name;
                    if (name && seen[name])
                        return;
                    if (name)
                        seen[name] = true;
                    merged.push(item);
                });
            });

            value = merged;
        }

        return { best: best, value: value, candidates: candidates.length };
    }

    function countOf(value) {
        return _.isArray(value) ? value.length : 1;
    }

    /* the open page already has a systems observable (System Designer, or the service
       mod's start screen list): hand the systems straight to it and let its own db
       extender persist them under whatever key it is holding */
    function liveObservable() {
        if (!window.model || !window.ko)
            return null;

        var candidates = [model.userSystems, model.systems];

        for (var i = 0; i < candidates.length; i++) {
            var observable = candidates[i];
            if (observable && ko.isObservable(observable) && observable.ready)
                return observable;
        }

        return null;
    }

    function restore(db, result) {
        var observable = liveObservable();

        if (observable) {
            observable.ready.always(function () { /* let the extender finish its own read first */
                observable(result.value);
                log('restored ' + countOf(result.value) + ' system(s) into the open page.');
            });
            return;
        }

        if (_.isEqual(result.value, result.best.value)) { /* nothing new to store */
            window.localStorage[POINTER_KEY] = result.best.db_key;
            log('restored ' + countOf(result.value) + ' system(s); pointer now ' + result.best.db_key + '.');
            return;
        }

        var key = makeKey();
        putObject(db, key, result.value).then(function (stored) {
            if (stored) {
                window.localStorage[POINTER_KEY] = key;
                log('restored ' + countOf(result.value) + ' system(s) merged from several generations; pointer now ' + key + '.');
                return;
            }

            window.localStorage[POINTER_KEY] = result.best.db_key;
            log('could not store the merge; pointed at the largest generation instead (' + countOf(result.best.value) + ' system(s)).');
        });
    }

    function run() {
        openDatabase().then(function (db) {
            if (!db)
                return; /* no misc store on this profile: nothing was ever saved here */

            readAll(db).then(function (records) {
                if (!records) {
                    log('could not read the store; leaving everything untouched.');
                    return;
                }

                var pointer = window.localStorage[POINTER_KEY];
                var current;

                if (isValidKey(pointer)) {
                    var pointed = _.find(records, function (entry) { return entry.db_key === pointer; });
                    current = pointed ? pointed.value : undefined;
                }

                if (hasData(current))
                    return; /* healthy profile, stay quiet */

                if (window.localStorage[MARKER_KEY])
                    return; /* already looked once; do not resurrect a deliberately empty list */

                var result = pickAndMerge(records);

                log('scan of "' + DB_NAME + '": ' + records.length + ' object(s), ' +
                    (result ? result.candidates : 0) + ' holding data.');

                window.localStorage[MARKER_KEY] = '1';

                if (!result) {
                    log('nothing recoverable on this profile.');
                    return;
                }

                restore(db, result);
            });
        });
    }

    try {
        run();
    }
    catch (e) {
        console.error(PREFIX + 'failed: ' + e);
    }
})();
