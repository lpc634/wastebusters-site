// The only script on the site, and it only looks after the quote form. The
// form works without it; this makes it kinder on a phone.
(function () {
  var form = document.getElementById('quote-form');
  if (!form) return;

  // A made-up reference for this visit. Graftday treats a second send with
  // the same one as the same enquiry, so a double tap on Send, or pressing it
  // again when the signal drops, never makes a second job.
  var ref = document.getElementById('q-ref');
  if (ref && window.crypto && crypto.getRandomValues) {
    var bytes = crypto.getRandomValues(new Uint8Array(12));
    ref.value = 'web-' + Array.prototype.map.call(bytes, function (b) {
      return ('0' + b.toString(16)).slice(-2);
    }).join('');
  }

  // Five photos at most and none bigger than 12 MB, said plainly the moment
  // they are chosen, rather than refused after a long upload on one bar.
  var input = document.getElementById('q-photos');
  var MAX = 5;
  var MAX_BYTES = 12 * 1024 * 1024;
  if (input) {
    input.addEventListener('change', function () {
      var files = Array.prototype.slice.call(input.files || []);
      var tooBig = files.some(function (f) { return f.size > MAX_BYTES; });
      if (files.length > MAX) input.setCustomValidity('Please choose up to ' + MAX + ' photos.');
      else if (tooBig) input.setCustomValidity('One of those photos is too big to send. Try a smaller one.');
      else input.setCustomValidity('');
      input.reportValidity();
    });
  }

  // Photos can take a while to go on a phone, so the button says so, and a
  // second press while it is going does nothing.
  form.addEventListener('submit', function (e) {
    var button = form.querySelector('button[type="submit"]');
    if (form.dataset.sending) { e.preventDefault(); return; }
    form.dataset.sending = '1';
    if (button) { button.disabled = true; button.textContent = 'Sending, please wait…'; }
  });
  // Coming back to the page (the back button restores it as it was), the
  // form is ready to send again.
  window.addEventListener('pageshow', function () {
    delete form.dataset.sending;
    var button = form.querySelector('button[type="submit"]');
    if (button) { button.disabled = false; button.textContent = 'Send for a free quote'; }
  });
})();
