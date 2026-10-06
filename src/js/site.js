// The only script on the site, and it only looks after the quote form. The
// form works without it; this makes it kinder on a phone.
(function () {
  var form = document.getElementById('quote-form');
  if (!form) return;

  // A made-up reference for this visit. Graftday treats a second send with
  // the same one as the same enquiry, so a double tap on Send, or pressing it
  // again when the signal drops, never makes a second job.
  var ref = document.getElementById('q-ref');
  var refValue = '';
  if (window.crypto && crypto.getRandomValues) {
    var bytes = crypto.getRandomValues(new Uint8Array(12));
    refValue = 'web-' + Array.prototype.map.call(bytes, function (b) {
      return ('0' + b.toString(16)).slice(-2);
    }).join('');
  }
  // A function of its own because a reload empties the form and then needs
  // the reference put back (see "fresh" further down).
  function giveRef() { if (ref && refValue) ref.value = refValue; }
  giveRef();

  // THE PHOTOS. Until October 2026 the picker was left as the browser draws
  // it: it says "sofa.jpg" or "3 files", there is no way to take one back
  // out, and choosing again throws away what was chosen before. The owner
  // met that on the roofer's website, which has the same form, and asked for
  // a way to remove a wrong one. It was built and reviewed there first
  // (3 October 2026) and brought here on 6 October. Each chosen photo is
  // shown under the picker as a small picture with its name and a Remove
  // button, and choosing again ADDS, because on a phone people pick one photo
  // at a time.
  //
  // The picker itself still does the sending: after every change our list is
  // written back into it, so what the customer sees listed is exactly what
  // the browser sends, and the form is still an ordinary form.
  var input = document.getElementById('q-photos');
  var list = document.getElementById('q-photo-list');
  var clearAll = document.getElementById('q-photo-clear');
  var problem = document.getElementById('q-photo-problem');
  var live = document.getElementById('q-photo-live');
  // All five or none: a form without them gets the plain picker, and the
  // rest of this script (the reference, the double send) still runs. The
  // form is one shared piece (src/parts/quote-form.html), so every page that
  // has it has all five, and tools/check.js fails the build if one goes.
  var picker = !!(input && list && clearAll && problem && live);
  // Five photos at most and none bigger than 12 MB, said plainly the moment
  // they are chosen, rather than refused after a long upload on one bar.
  var MAX = 5;
  var MAX_BYTES = 12 * 1024 * 1024;
  // One entry for each photo listed: the file, its row in the page, its
  // Remove button, and the address of its small picture.
  var chosen = [];
  // When a photo was last taken out, and for how long afterwards a press is
  // not trusted. See "A PRESS MEANT FOR SOMETHING THAT HAS MOVED" below.
  var lastRemove = 0;
  var SETTLE = 700;
  var sayTimer;
  var slice = function (files) { return Array.prototype.slice.call(files || []); };

  // Writing a list of files back into the picker needs the browser to let a
  // script make one ("new DataTransfer()"). iPhones before iOS 14.5 do not.
  // There the picker is left to work as it always did (choosing again
  // replaces), the photos are still shown, and one "Remove all photos" button
  // stands in for the Remove on each.
  var canBuild = (function () {
    try { return !!new DataTransfer().items; } catch (e) { return false; }
  })();

  function countWords() {
    return chosen.length === 0 ? 'No photos chosen.'
      : chosen.length === 1 ? '1 photo chosen.' : chosen.length + ' photos chosen.';
  }

  // Read out by a screen reader when it next pauses, for somebody who cannot
  // see the list change. Emptied first and filled a moment later: the same
  // words twice running (the same oversized photo chosen again) are otherwise
  // not read the second time.
  function say(text) {
    clearTimeout(sayTimer);
    live.textContent = '';
    sayTimer = setTimeout(function () { live.textContent = text; }, 100);
  }

  // The same refusal for somebody who can see: it stays on the page under the
  // list until the next change, where a browser's own bubble is gone in a few
  // seconds and on some phones never appears.
  function showProblem(text) {
    problem.textContent = text;
    problem.hidden = !text;
  }

  function makeEntry(file) {
    var entry = { file: file, url: '', row: document.createElement('li'), button: null };
    entry.row.className = 'photo';
    // Said to be a list item, which looks like saying it twice. Safari stops
    // calling a list a list once its bullets are styled away (ours are, and
    // each row is drawn as a grid), so VoiceOver on an iPhone would lose
    // "list, 3 items". The list in the page says role="list" for the same
    // reason. Chrome and Firefox are told nothing new by either.
    entry.row.setAttribute('role', 'listitem');

    // The small picture is the phone's own copy of the photo, shown straight
    // from its memory: nothing is sent anywhere until Send is pressed. A kind
    // of photo this browser cannot draw (an iPhone's HEIC on a PC) leaves the
    // grey frame with its drawn placeholder, and the name still says which.
    var frame = document.createElement('span');
    frame.className = 'photo__thumb';
    try { entry.url = URL.createObjectURL(file); } catch (e) { entry.url = ''; }
    if (entry.url) {
      var img = document.createElement('img');
      img.alt = '';
      img.addEventListener('error', function () {
        if (img.parentNode) img.parentNode.removeChild(img);
      });
      img.src = entry.url;
      frame.appendChild(img);
    }
    entry.row.appendChild(frame);

    // textContent, never innerHTML: a file's name is whatever its owner (or
    // somebody else) called it.
    var name = document.createElement('span');
    name.className = 'photo__name';
    name.textContent = file.name;
    entry.row.appendChild(name);

    if (canBuild) {
      // Reads "Remove" and is announced as "Remove sofa.jpg", so five of
      // them in a row can be told apart without seeing the page.
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'photo__remove';
      button.textContent = 'Remove';
      var which = document.createElement('span');
      which.className = 'visually-hidden';
      which.textContent = ' ' + file.name;
      button.appendChild(which);
      button.addEventListener('click', function () { remove(entry); });
      entry.row.appendChild(button);
      entry.button = button;
    }
    return entry;
  }

  // Takes a row off the page and hands its small picture's memory back.
  function drop(entry) {
    if (entry.row.parentNode) entry.row.parentNode.removeChild(entry.row);
    if (entry.url) URL.revokeObjectURL(entry.url);
  }

  function show() {
    list.hidden = !chosen.length;
    clearAll.hidden = canBuild || !chosen.length;
  }

  // Our list, written into the picker. With nothing left the picker is
  // emptied the ordinary way, so the form is exactly as if no photo had ever
  // been chosen.
  function fillPicker() {
    if (!chosen.length) { input.value = ''; return; }
    var transfer = new DataTransfer();
    chosen.forEach(function (c) { transfer.items.add(c.file); });
    input.files = transfer.files;
    // A browser that quietly ignores the line above is treated the same as
    // one that refuses it out loud (the two callers catch this).
    if (input.files.length !== chosen.length) throw new Error('The picker did not take the list');
  }

  function empty() {
    chosen.forEach(drop);
    chosen = [];
    input.value = '';
    input.setCustomValidity('');
    showProblem('');
    show();
  }

  // Newly picked photos, added to the ones already listed. Anything refused
  // is left out and named, and what was already chosen is never lost over it:
  // a sixth photo, or one that is too big, should not cost the other five.
  // "quiet" is for photos the browser put back by itself when the page was
  // returned to: nothing new has happened, so nothing is read out.
  function add(picked, quiet) {
    var added = [], tooBig = [], over = [], twice = [];
    picked.forEach(function (f) {
      var already = chosen.some(function (c) {
        return c.file.name === f.name && c.file.size === f.size && c.file.lastModified === f.lastModified;
      });
      if (already) twice.push(f);
      else if (f.size > MAX_BYTES) tooBig.push(f);
      else if (chosen.length >= MAX) over.push(f);
      else {
        var entry = makeEntry(f);
        chosen.push(entry);
        list.appendChild(entry.row);
        added.push(f);
      }
    });
    // A browser that says it can build a list and then will not take it gets
    // the old iPhone's treatment from here on, with the picker's own choice.
    try { fillPicker(); } catch (e) { canBuild = false; plain(picked, quiet); return; }
    show();
    // Nothing picked at all is the picker closed with Cancel (some browsers
    // empty it when that happens, which is why it has just been refilled).
    if (!picked.length) return;

    var said = [];
    if (tooBig.length) {
      said.push(tooBig.length === 1
        ? tooBig[0].name + ' is too big to send. Try a smaller one.'
        : tooBig.length + ' of those photos are too big to send. Try smaller ones.');
    }
    if (over.length) {
      said.push('Up to ' + MAX + ' photos can be sent, so '
        + (over.length === 1 ? over[0].name + ' was' : over.length + ' of those were') + ' not added.');
    }
    if (twice.length) {
      said.push(twice.length === 1
        ? twice[0].name + ' is already chosen.'
        : twice.length + ' of those are already chosen.');
    }
    showProblem(said.join(' '));
    if (quiet) return;
    var news = added.length === 1 ? [added[0].name + ' added.']
      : added.length ? [added.length + ' photos added.'] : [];
    say(news.concat(said, countWords()).join(' '));
  }

  // Where the browser cannot build a list (see canBuild): the picker's own
  // choice is shown as it stands. Too many, or one too big, cannot be taken
  // out for them here, so the picker is marked as wrong in the words this
  // form has always used, and the form will not send until they choose again
  // or remove them all.
  function plain(picked, quiet) {
    chosen.forEach(drop);
    chosen = picked.map(makeEntry);
    chosen.forEach(function (c) { list.appendChild(c.row); });
    var tooBig = picked.some(function (f) { return f.size > MAX_BYTES; });
    var text = picked.length > MAX ? 'Please choose up to ' + MAX + ' photos.'
      : tooBig ? 'One of those photos is too big to send. Try a smaller one.' : '';
    input.setCustomValidity(text);
    showProblem(text);
    show();
    if (quiet) return;
    say((text ? text + ' ' : '') + countWords());
    input.reportValidity();
  }

  function take(picked, quiet) {
    if (canBuild) add(picked, quiet);
    else plain(picked, quiet);
  }

  function remove(entry) {
    // Once Send has been pressed the browser has already gathered what it is
    // sending. Taking a photo off the list now would show one thing and send
    // another.
    if (form.dataset.sending) return;
    var at = chosen.indexOf(entry);
    if (at < 0) return;
    lastRemove = Date.now();
    chosen.splice(at, 1);
    drop(entry);
    // If the picker will not take the shorter list, the photo is still in
    // it and would still be sent. The one thing this list must never do is
    // show a photo as gone when it is not, so it is drawn again from what
    // the picker really holds, and the customer is told what does work.
    try { fillPicker(); } catch (e) {
      canBuild = false;
      plain(slice(input.files), true);
      var sorry = 'That photo could not be taken out by itself. Press Remove all photos and choose again.';
      showProblem(sorry);
      (clearAll.hidden ? input : clearAll).focus();
      say(sorry);
      return;
    }
    showProblem('');
    show();
    // The button that was pressed has gone, and the keyboard's place on the
    // page with it. It goes to the next photo's Remove, or the one before,
    // or back to the picker when none are left.
    var next = chosen[at] || chosen[at - 1];
    (next ? next.button : input).focus();
    say(entry.file.name + ' removed. ' + countWords());
  }

  // WHILE THE FORM IS ON ITS WAY the Remove buttons are switched off, so they
  // look, and are announced as, out of use. Five photos on one bar of signal
  // can take a minute, which is when somebody spots the wrong one and presses
  // it; a button that looked live and silently did nothing would be worse.
  // (The check at the top of "remove" stays, as the backstop.)
  //
  // The picker itself must NOT be switched off. This runs before the browser
  // gathers what to send, and a switched-off field is left out of it: every
  // photo would be dropped. So a press on the picker is refused instead (in
  // the listener below), it is faded by the stylesheet from the mark
  // "data-sending" on the form, and a screen reader is told with
  // aria-disabled, which changes nothing about what is sent.
  function lock(on) {
    chosen.forEach(function (c) { if (c.button) c.button.disabled = on; });
    clearAll.disabled = on;
    if (on) input.setAttribute('aria-disabled', 'true');
    else input.removeAttribute('aria-disabled');
  }

  // A key held down is sent again and again by the keyboard. See below.
  function heldKey(e) {
    if (e.repeat && (e.key === 'Enter' || e.keyCode === 13)) e.preventDefault();
  }

  if (picker) {
    input.addEventListener('change', function () { take(slice(input.files), false); });
    clearAll.addEventListener('click', function () {
      if (form.dataset.sending) return;
      lastRemove = Date.now();
      empty();
      input.focus();
      say('All photos removed.');
    });

    // A PRESS MEANT FOR SOMETHING THAT HAS MOVED. Taking a photo out pulls
    // everything below it up the page at once, so the second half of a
    // double tap on Remove (or of a mouse's double click) lands on whatever
    // is now under the thumb: the next photo's Remove, or Send itself. On
    // the roofer's site, before this was added, a double tap on the only
    // photo SENT the enquiry, every time, at the very moment the customer
    // was taking a wrong photo out (Chrome and Firefox, 3 October 2026). So
    // for a moment after a photo goes, a press made with a finger or a mouse
    // anywhere on the page does nothing.
    //
    // On the whole page, where the roofer's site listens on its form alone.
    // Here the line under the form is a link ("Prefer WhatsApp?"), and the
    // footer's links come straight after it. Tried on 6 October 2026 with the
    // form alone guarded: on a phone 320px wide, a double tap on "Remove all
    // photos" emptied the list and the second tap landed on that link, which
    // took the customer off the page to WhatsApp, away from a form they had
    // just filled in.
    //
    // 700ms, because a computer counts two clicks up to half a second apart
    // as a double click and a slow hand needs a little over. A second Remove
    // pressed on purpose comes later than that; if it does not, it is
    // pressed again and nothing is lost. A clock that jumps (gap below 0)
    // lets the press through: better the old fault than a dead form.
    //
    // Not the keyboard. "detail" counts the clicks of a mouse or a finger
    // and is 0 for a press made with Enter or Space. Nothing moves under a
    // key, and the keyboard's place is put on the next Remove on purpose, so
    // that several can be taken out one after another.
    //
    // Listening on the way down ("true") puts this ahead of the buttons' own
    // listeners, of the form's send, and of a link being followed.
    document.addEventListener('click', function (e) {
      var gap = Date.now() - lastRemove;
      var moved = e.detail && gap >= 0 && gap < SETTLE;
      // And while it is sending the picker is shut (see "lock"): a photo
      // chosen now would be listed and never sent.
      var shut = form.dataset.sending && e.target === input;
      if (moved || shut) { e.preventDefault(); e.stopPropagation(); }
    }, true);

    // The keyboard has a double press of its own: a key held down. A held
    // Enter pressed each Remove the keyboard had just been moved to, one
    // after another, and a list of four was empty almost at once. So here
    // only the first press of a held key counts. On these three and not on
    // the whole form: in the "What needs clearing?" box a held Enter is how
    // somebody makes space.
    [input, list, clearAll].forEach(function (el) { el.addEventListener('keydown', heldKey); });
  }

  // RELOADING GIVES AN EMPTY FORM. Firefox puts back what was typed, and the
  // chosen photo, when a page is reloaded (Chrome does not). Somebody who
  // reloads wants a clean form, so on a reload it is emptied and given this
  // visit's new reference.
  //
  // Only on a reload. Coming BACK to the page (after sending, or from the
  // privacy notice) keeps what was typed and chosen, on purpose: the
  // customer who goes Back to add the photo they forgot should not have to
  // type it all again, and Graftday files a changed second send as a second
  // enquiry (routes/enquire.js in the app, "visitReference").
  //
  // Not done with autocomplete="off": on the form it would also stop a phone
  // offering the customer's own name, number and postcode, which is most of
  // what makes the form quick to fill in.
  var reloaded = (function () {
    try {
      var entry = performance.getEntriesByType('navigation')[0];
      // The second is the old way of asking, for browsers without the first.
      return entry ? entry.type === 'reload' : performance.navigation.type === 1;
    } catch (e) { return false; }
  })();
  // Set by anything the customer does to the form. See "pageshow" below.
  var touched = false;
  form.addEventListener('input', function () { touched = true; });

  function fresh() {
    form.reset();
    if (picker) empty();
    giveRef();
  }
  // Photos the browser has put back by itself (a return to the page) are
  // listed, so the list never says less than the picker is about to send.
  function listRestored() {
    if (picker && !chosen.length && input.files && input.files.length) take(slice(input.files), true);
  }
  // "Remove all photos" is in the page with a name of its own, and Firefox
  // carries a button's switched-off state over a reload or a return to the
  // page. It is switched back on here as well as in "pageshow", so it is
  // never off while the rest of the page is still loading.
  if (picker) lock(false);
  // Known and accepted: this first emptying wipes anything typed between the
  // reloaded page appearing and this script arriving, because the "touched"
  // note above cannot be made before the script is there. While the browser
  // still holds the script from a moment ago (GitHub Pages lets it be kept
  // for ten minutes) that gap is nothing. When it has to be fetched again on
  // one bar of signal it can be a second or more, and Firefox shows the old
  // answers for that long (tried with the script held back 3 seconds,
  // 6 October 2026). It costs a few letters at most. Closing it needs
  // autocomplete="off", refused above for what it does to a phone.
  if (reloaded) fresh();
  else listRestored();

  // Photos can take a while to go on a phone, so the button says so, and a
  // second press while it is going does nothing.
  form.addEventListener('submit', function (e) {
    var button = form.querySelector('button[type="submit"]');
    if (form.dataset.sending) { e.preventDefault(); return; }
    form.dataset.sending = '1';
    if (button) { button.disabled = true; button.textContent = 'Sending, please wait…'; }
    if (picker) lock(true);
  });
  // Coming back to the page (the back button restores it as it was), the
  // form is ready to send again.
  window.addEventListener('pageshow', function (e) {
    delete form.dataset.sending;
    var button = form.querySelector('button[type="submit"]');
    if (button) { button.disabled = false; button.textContent = 'Send for a free quote'; }
    if (picker) lock(false);
    // Shown again exactly as it was left, photos and their list included.
    if (e.persisted) return;
    // The page has only now finished loading. Firefox has put the old answers
    // back before this script first runs, so the emptying further up is the
    // one that does the work. It is done once more here for a browser that
    // puts them back later than that. Unless the customer has started typing
    // since the script arrived: on one bar of signal this moment can be
    // several seconds after the form appeared, and wiping what they have just
    // written would be worse than the problem.
    if (reloaded && !touched) fresh();
    else listRestored();
  });
})();
