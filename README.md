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
  taken, the licence paragraph and "Where we work".
- **Before and after pairs** are in `src/pairs.json`, with the words that
  describe each photo. A page shows one with `{{pair:garage-boxes}}`. To say
  where a job was, add `"town": "Frimley"` to its pair: town only, never a
  street, and only once the owner has said naming it is fine with that
  customer.

### The Google rating

`googleReviews` in `site.config.json` holds the rating, the number of reviews
and the day they were read off the profile. Change all three whenever a review
arrives. The build warns once the date is more than two weeks old. To stop
showing a number at all, delete `"count"`: every mention then reads "5.0 on
Google".

The rating is shown on the page and never put in the hidden label for search
engines. Google's rules do not allow a business to mark up its own reviews.

## Pages about one kind of job

`/house-clearance/`, `/garage-clearance/`, `/garden-waste-removal/` and
`/builders-waste-removal/`, added in October 2026 so that each kind of job has
a page of its own to be found by. Each is its own file in `src/pages/`,
written by hand from what the business has actually said and from its own
photos, with `"service"` in its settings comment. The build adds the page to
the sitemap, gives it the line back to the home page, and describes it in the
hidden label.

A new one also needs a link in three places: its card on the home page, the
footer in `src/layout.html`, and "What else we clear" in `src/parts/area.html`.
The check fails if the home page does not link to it.

Rules that are not to be broken, because Google penalises the first and the
second would be untrue:

- **No page per town.** The same page with the town name swapped is a doorway
  page. A town earns a page only when there are real jobs with photos there.
- **Nothing invented.** No prices, years in business, team size, guarantees or
  extra reviews. If the owner has not said it, it does not go on a page.

## The hidden label (JSON-LD)

`build.js` makes it for each page from `site.config.json` and from what that
page shows: the towns only if the page names them, the job photos only if the
page has them, the questions read back out of the page's own "Common
questions". It gives the town and county and never the street or postcode,
which matches the footer and the hidden address on Google. `tools/check.js`
fails if the label says anything the page does not.

## The check

`node tools/check.js` reads the built pages in `docs/` and fails, saying what
is wrong, if a link or picture is missing, a page has more or fewer than one
main heading, a long dash has crept in, the label is not valid or says more
than the page, two pages share a title or description, a page meant to be
found is missing from the sitemap or not linked from the home page, or a quote
form has lost its trap. Run it after every build.

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
