# Waste Busters website

The website for Waste Busters, waste clearance and rubbish removal in
Camberley: www.wastebustersservices.co.uk (the domain is Tom's, at 123 Reg).

Plain HTML and CSS, built from `src/` into `docs/`, which GitHub Pages
publishes. No packages, no cookies, no tracking.

## Changing it

1. Edit a page in `src/pages/` (each starts with a comment holding its title,
   description and address), or the shared header and footer in
   `src/layout.html`, or the look in `src/css/site.css`.
2. Run `node build.js`.
3. Commit `src/` and `docs/` together and push. GitHub Pages publishes within
   a minute or two.

To look at it first: `python -m http.server 4180 --bind 127.0.0.1 --directory docs`
and open http://localhost:4180.

## The quote form

It posts to Graftday, the CRM, at the address in `site.config.json`
(`/enquire/<form id>`, routes/enquire.js in the CRM). Each enquiry becomes a
job on the Waste Busters pipeline "via Website", with its photos, and the
business gets an email. The CRM sends the customer back to `/thanks/` here.
The form id is made with `node db/website-form.js 1 --new` in the CRM; the HQ
switch "Website quote form" must be on for it to take anything.

## Images

`node tools/images.js <folder of job photos>` remakes the logo sizes, icons and
the before and after pairs. It borrows sharp from the CRM checkout at
C:\wastebusters-crm. The job photos come only from finished jobs whose
customer allowed photos to be used, chosen by eye so that none shows a house
number, a readable number plate, a face or another firm's van. Re-encoding
strips the photos' metadata, including the GPS position a phone records.

## Fonts

Archivo and Atkinson Hyperlegible Next, both under the SIL Open Font
License, served from `docs/fonts/` rather than from Google, so visitors'
details are not sent to anyone else.
