# Waste Busters website

The website for Waste Busters, waste clearance and rubbish removal in
Camberley: www.wastebustersservices.co.uk (the domain is Tom's, at 123 Reg).

Plain HTML and CSS, built from `src/` into `docs/`, which GitHub Pages
publishes. No packages, no cookies, no tracking.

## Changing it

1. Edit a page in `src/pages/` (each starts with a comment holding its title,
   description and address), or the shared header and footer in
   `src/layout.html`, or the look in `src/css/site.css`.
2. Run `node build.js`, then `node tools/check.js`.
3. Commit `src/` and `docs/` together and push. GitHub Pages publishes within
   a minute or two.

To look at it first: `python -m http.server 4180 --bind 127.0.0.1 --directory docs`
and open http://localhost:4180.

## What is written once

Three things are kept in one place each, so they cannot drift apart:

- **Facts about the business** are in `site.config.json`: the phone number,
  the email address, the Facebook and Instagram pages, the Google rating and
  the towns. A page uses them as `{{phone}}`, `{{email}}`, `{{mainTowns}}` and
  so on (the full list is `facts` in `build.js`).
- **Shared pieces** are in `src/parts/`. A page pulls one in with
  `{{>name}}`. The quote form is one (`quote-form.html`), so it and its trap
  are never copied by hand; so are "How it works", the list of what can't be
  taken, the licence paragraph, "Where we work" and the row of reasons under
  the buttons (`proof.html`).
- **Before and after pairs** are in `src/pairs.json`, with the words that
  describe each photo. A page shows one with `{{pair:garage-boxes}}`. To say
  where a job was, add `"town": "Frimley"` to its pair: town only, never a
  street, and only once the owner has said naming it is fine with that
  customer.

  The words in `pairs.json` say what can be seen in the picture and nothing
  else. Open the picture before writing or changing them. Three were reworded
  on 2 October 2026 because they had been written from the job's name: one
  listed a barbecue and a toy car that are not in the photo, one said rubble
  where the photo shows broken timber, and one said garage where the photo
  shows a hay feeder on the wall. On 3 October the owner said what the three
  jobs really were, and his words are the captions now: an old kitchen rip
  out (`garden-rubbish`), broken up decking (`builders-rubble`) and a stable
  clearance (`garage-boxes`). The file names still carry the old names; they
  are only names, and renaming the images buys nothing. When a caption comes
  from the owner, it wins over what the picture seems to show.

### The Google rating

`googleReviews` in `site.config.json` holds the rating, the number of reviews
and the day they were read off the profile. Change all three whenever a review
arrives. The build warns once the date is more than two weeks old. To stop
showing a number at all, delete `"count"`: every mention then reads "5.0 on
Google".

The rating is shown on the page and never put in the hidden label for search
engines. Google's rules do not allow a business to mark up its own reviews.

## Pages about one kind of job

There is one: `/house-clearance/` (house, flat and garage clearance), added in
October 2026. It matches "House clearance service", one of the categories on
the Google Business Profile, and it is the kind of job the business has said
the most about. Garages and sheds are a section of it (`#garages`), not a page
of their own, because all the site knows about them is one sentence.

A page like this is its own file in `src/pages/`, with `"service"` in its
settings comment. The build adds it to the sitemap, gives it the line back to
the home page, and describes it in the hidden label. It also needs a link in
two places: its card on the home page, and the footer row in
`src/layout.html`. The check fails if the home page does not link to it.

### Why there are not more of them yet

Pages for garage clearance, garden waste and builders' waste were written on
2 October 2026 and taken out again the same night. They are in git, in commit
dc7f14f on this branch, if their layout is wanted back. Once every sentence
that nobody at the business had actually said was removed, each held about one
sentence of its own: the rest was the shared pieces and words already on the
home page. A page like that gives a customer nothing the home page does not,
and Google tends to read it and then not list it.

What each needs before it comes back:

- **Garden:** the owner's answer on whether "garden clearance" is a fair name
  for what he does (does he cut back, or only take away?), since that decides
  the title; whether the waste has to be bagged; and a few sentences in his
  own words. The `green-waste` photo is real garden waste; `garden-rubbish`
  is old doors and roofing sheets by a hedge.
- **Builders' waste:** a photo that shows rubble or hardcore (the one on file
  is broken timber), and a few sentences in his own words: what he takes,
  whether there is a limit, what a trade customer gets.
- **Furniture, appliances, office:** the same. One sentence each today.

Five minutes of the owner talking about a kind of job is enough to write its
page from.

### Rules that are not to be broken

Google penalises the first, and the others would be untrue:

- **No page per town.** The same page with the town name swapped is a doorway
  page. A town earns a page only when there are real jobs with photos there.
- **Nothing invented.** No prices, years in business, team size, guarantees or
  extra reviews. If the owner has not said it, it does not go on a page. That
  includes sensible-sounding advice ("it doesn't need to be bagged", "we'll
  check again before anything goes"): if it describes how the business
  behaves, it has to come from the business.
- **A customer's words stay away from a customer's photos.** The reviews are
  quoted on the home page only, in their own section. A named review placed
  beside one job's photos reads as the same job, and the privacy notice
  promises that photos carry nothing that identifies the customer or their
  home.

## The sitemap's dates

Each address in `docs/sitemap.xml` carries the day its page last changed, so
Google can tell what is new. `pages.lock.json` holds a fingerprint of each
page's title, description and content, and the day that fingerprint first
appeared. The build moves the day only when the fingerprint moves, so a
rebuild with nothing edited changes nothing. Commit `pages.lock.json` with the
pages. Do not edit the dates by hand to make a page look fresh: Google ignores
the dates of a site it has caught doing that.

## The hidden label (JSON-LD)

`build.js` makes it for each page from `site.config.json` and from what that
page shows: the towns only if the page names them, the job photos only if the
page has them (a page with none lists no picture; the picture a shared link
shows is on no page, so it is never listed), the questions read back out of
the page's own "Common questions". It gives the town and county and never the
street or postcode, which matches the footer and the hidden address on Google.
`tools/check.js` fails if the label says anything the page does not.

## The check

`node tools/check.js` reads the built pages in `docs/` and fails, saying what
is wrong, if a link or picture is missing, a page has more or fewer than one
main heading, a long dash has crept in, the label is not valid or says more
than the page (a picture the page does not show included), two pages share a
title or description, a description is too long for Google to show whole, a
page meant to be found is missing from the sitemap or not linked from the home
page, a sitemap address has no date or a date that has not happened yet, the
stylesheet hides a link, or a quote form has lost its trap or a piece of its
list of chosen photos. Run it after every build.

A page deleted from `src/pages/` must have its folder deleted from `docs/` by
hand: the build does not tidy up after itself, and the check will say the
leftover page "is not in the sitemap".

`.gitattributes` keeps the same line endings on every checkout, so a rebuild
on a fresh copy of the repo changes nothing.

## The quote form

It posts to Graftday, the CRM, at the address in `site.config.json`
(`/enquire/<form id>`, routes/enquire.js in the CRM). Each enquiry becomes a
job on the Waste Busters pipeline "via Website", with its photos, and the
business gets an email. The CRM sends the customer back to `/thanks/` here.
The form id is made with `node db/website-form.js 1 --new` in the CRM; the HQ
switch "Website quote form" must be on for it to take anything.

The same form is on the home page and on each page about one kind of job.

### The trap

A box no person sees, which bots that fill in every box they find do fill.
The app thanks whoever sent it and saves nothing.

It was called `company`, and was hidden by moving it off the side of the
page. Tried in Chrome on the roofer's site on 2 October 2026: a customer whose
saved address includes a company name has it put in that box when the browser
fills the form in for them, and their real enquiry is thanked and thrown away.
The people that happens to are business customers. So two things changed,
each of which was enough alone in that test:

- the box is taken out of the page with `display: none`
  (`.field--trap` in `src/css/site.css`), which a browser's own filling-in
  skips;
- it is called `wf_check`, which no browser takes for part of an address.

The app treats either name as the trap. If this site goes up before the app
that knows the new name is deployed, nothing is lost: customers are
unaffected, and a bot that fills the box gets through as an enquiry until the
app catches up.

### The photo picker

Under "Photos" the page lists what the customer has chosen: a small picture,
the file's name and a Remove button for each. Before October 2026 the picker
was the browser's own, which says "3 files", gives no way to take a wrong one
back out, and throws away the first choice when somebody chooses again. It was
built and reviewed on the roofer's site first (3 October) and brought here on
6 October. Choosing again adds to the list, because on a phone people pick one
photo at a time. The list stops at five. A sixth, a photo over 12 MB, or the
same photo twice is left out and named in a line under the list, and the ones
already chosen are kept. Removing the last one leaves the form exactly as if
none had been chosen. A screen reader is told about each change, and each
button is announced with its file's name ("Remove sofa.jpg").

It is all in `src/js/site.js`, and the four pieces it fills in are in the
shared form, `src/parts/quote-form.html`, so every page with the form has it.
The check fails if a form has lost one of them. The picker in the page is
still what sends the photos: the script writes its list back into it after
every change, so what is listed is what goes. With no script at all it is the
plain picker it always was.

The fallback. Writing a list back into the picker needs a browser that lets a
script build one (`new DataTransfer()`), which iPhones before iOS 14.5 do not.
There the picker works as it always did (choosing again replaces), the photos
are still listed, and one "Remove all photos" button stands in for the Remove
on each. Too many photos, or one too big, cannot be taken out for the customer
there, so the form refuses to send until they choose again, in the words it
has always used.

No permission is needed for the small pictures. Each is shown straight from
the customer's own phone, before anything is sent, at an address beginning
`blob:`. This site sends no Content-Security-Policy: GitHub Pages cannot send
headers of ours, and there is no such tag in `src/layout.html`. If a policy is
ever added, its `img-src` must list `blob:` or the list shows grey squares.

A press that lands on something that has moved. Taking a photo out pulls
everything below it up the page, so the second half of a double tap on Remove
(or of a mouse's double click) lands on whatever has slid under the thumb.
Tried here: after a double tap on the only photo, that is the Send button. So
for 700ms after a photo goes, a press made with a finger or a mouse anywhere
on the page does nothing. On the whole page, not only in the form as on the
roofer's site, because here a link sits right under the form ("Prefer
WhatsApp?") with the footer's links after it. With the form alone guarded, a
double tap on "Remove all photos" on a phone 320px wide opened WhatsApp. A
second Remove pressed on purpose comes later than 700ms and works. The
keyboard is not held back (nothing moves under a key), but a key held down
is: only the first press of a held Enter counts, or it would press each
Remove the keyboard had just been moved to and empty the list.

While the form is sending, every Remove is switched off and grey, and the
picker is faded and does nothing: a photo chosen then would have been listed
and never sent. The picker is deliberately not switched off the ordinary way,
because a switched-off field is left out of what a form sends and the photos
would be dropped. Everything is switched back on when the page is shown
again.

The bar at the bottom. On a phone, or in a narrow window, the bar fixed to
the bottom of the screen covered a button reached with the Tab key: measured
before the fix, a Remove came to rest wholly behind it, and at 640px wide so
did Send. The form's boxes and buttons are now held 136px short of the bottom
edge (`scroll-margin-bottom` in `site.css`). Chrome would be content with
84px; Firefox moves the page later, and at 84px still left a Remove 5px
under the bar.

The list says `role="list"` and each row `role="listitem"`, which looks like
saying it twice. Safari stops calling a list a list once its bullets are
styled away, and VoiceOver on an iPhone would lose "list, 3 items".

Reloading the page gives an empty form with a new reference. Firefox
otherwise puts back whatever was typed, and the chosen photo (seen on both
pages as they were before this change). Coming BACK to the page (after
sending, or from the privacy notice) is left alone on purpose: what was typed
and chosen is still there, so a customer who goes back to add the photo they
forgot does not start again, and Graftday files a changed second send as a
second enquiry.

One known cost of the reload. When the script has to be fetched again on a
slow line (GitHub Pages lets a browser keep it for ten minutes, and inside
that there is no gap), Firefox shows the old answers until it arrives, and a
few letters typed in that gap are emptied with them. Once the script has
started, typing is safe. Closing the gap needs `autocomplete="off"` on the
form, which would stop a phone offering the customer's own name, number and
postcode, so it was left.

All of it was tried on 6 October 2026 in Chrome and in Firefox 157, on the
home page and the house clearance page, at 320px, 390px and desktop widths,
against a stand-in receiver on this computer: a copy of the site built with
`FORM_ACTION` pointed at it, never the real form. Not tried on an iPhone:
there is no Safari on this computer. To try a change the same way, build a
copy with `FORM_ACTION=http://localhost:<port>/enquire/wf_...` set; the
check will refuse to pass a build made like that, which is what stops one
being published by mistake.

## Images

`node tools/images.js <folder of job photos>` remakes the logo sizes, icons,
the picture a shared link shows (`share.jpg`) and the before and after pairs.
It borrows sharp from the CRM checkout at C:\wastebusters-crm. The job photos
come only from finished jobs whose customer allowed photos to be used, chosen
by eye so that none shows a house number, a readable number plate, a face or
another firm's van. Re-encoding strips the photos' metadata, including the GPS
position a phone records.

## Fonts

Archivo and Atkinson Hyperlegible Next, both under the SIL Open Font
License, served from `docs/fonts/` rather than from Google, so visitors'
details are not sent to anyone else.
