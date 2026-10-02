// Checks what build.js made, by reading the finished pages in docs/ the way a
// browser and a search engine will, not by looking for lines in the source.
//
//   node build.js            then            node tools/check.js
//
// It exists because the site now has more than one page and a hidden label
// (JSON-LD) made by the build, and the faults that matter are the quiet ones:
// a link to a page that is not there, a label that says something the page
// does not, a quote form copied without its trap. Each rule below is a
// promise the site makes or a rule Google sets. It changes nothing.
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', 'docs');
const SITE = 'https://www.wastebustersservices.co.uk';
const faults = [];
const fault = (where, what) => faults.push(`${where}: ${what}`);

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e =>
    e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]);
}
const files = walk(OUT);
const rel = f => '/' + path.relative(OUT, f).split(path.sep).join('/');

// A site address ("/garage-clearance/", "/img/a.jpg?v=1") to the file behind it.
function fileFor(url) {
  const clean = url.split('#')[0].split('?')[0];
  const f = path.join(OUT, clean);
  if (clean.endsWith('/')) return path.join(f, 'index.html');
  return f;
}
const exists = url => fs.existsSync(fileFor(url)) && fs.statSync(fileFor(url)).isFile();

// What a visitor can read: the tags gone, the head, scripts and styles too.
const visible = html => html
  .replace(/<head[\s\S]*?<\/head>/, ' ').replace(/<script[\s\S]*?<\/script>/g, ' ')
  .replace(/<!--[\s\S]*?-->/g, ' ').replace(/<\/?(?:a|strong|span|em)\b[^>]*>/g, '').replace(/<[^>]+>/g, ' ')
  .replace(/&amp;/g, '&').replace(/&middot;/g, ' ').replace(/&copy;/g, ' ').replace(/&#9733;/g, ' ')
  .replace(/\s+/g, ' ');
const attr = (html, re) => { const m = re.exec(html); return m ? m[1] : null; };
const unesc = s => s.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

// The long dashes, which the owner never wants in anything written for him
// or his customers, in any file a visitor is sent.
for (const f of files.filter(f => /\.(html|css|js|xml|txt)$/.test(f))) {
  if (/[\u2012\u2013\u2014\u2015]/.test(fs.readFileSync(f, 'utf8'))) fault(rel(f), 'has a long dash in it');
}

const pages = files.filter(f => f.endsWith('.html')).map(f => ({ f, where: rel(f), html: fs.readFileSync(f, 'utf8') }));
const home = pages.find(p => p.where === '/index.html');
const indexable = [];
const idsOf = html => new Set([...html.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]));

for (const p of pages) {
  const { html, where } = p;
  const text = visible(html);

  if (html.includes('{{')) fault(where, 'has an unfilled placeholder');
  const h1s = (html.match(/<h1[\s>]/g) || []).length;
  if (h1s !== 1) fault(where, `has ${h1s} main headings, it should have exactly one`);

  const title = attr(html, /<title>([\s\S]*?)<\/title>/);
  const description = attr(html, /<meta name="description" content="([^"]*)">/);
  const canonical = attr(html, /<link rel="canonical" href="([^"]*)">/);
  const robots = attr(html, /<meta name="robots" content="([^"]*)">/);
  if (!title) fault(where, 'has no title');
  if (!description) fault(where, 'has no description');
  if (!canonical || !canonical.startsWith(SITE + '/')) fault(where, `canonical address is not on ${SITE}`);
  const expected = where === '/404.html' ? '/404.html' : where.replace(/index\.html$/, '');
  if (canonical && canonical !== SITE + expected) fault(where, `canonical says ${canonical}, the page is at ${expected}`);
  if (robots !== 'noindex') indexable.push({ where, title, description, canonical });
  // Google shows about 155 characters under a result and cuts the rest, so
  // the reason to choose us has to fit inside that.
  if (robots !== 'noindex' && description && unesc(description).length > 155) fault(where, `description is ${unesc(description).length} characters, Google cuts it at about 155`);

  // Every link, picture and file the page asks this site for is really there.
  const ids = idsOf(html);
  const asked = [
    ...[...html.matchAll(/\s(?:href|src)="([^"]+)"/g)].map(m => m[1]),
    ...[...html.matchAll(/\ssrcset="([^"]+)"/g)].flatMap(m => m[1].split(',').map(s => s.trim().split(/\s+/)[0])),
    attr(html, /<meta property="og:image" content="([^"]*)">/) || '',
  ];
  for (let url of asked) {
    if (url.startsWith(SITE)) url = url.slice(SITE.length) || '/';
    if (url.startsWith('#')) {
      if (url.length > 1 && !ids.has(url.slice(1))) fault(where, `links to ${url}, which is not on the page`);
    } else if (url.startsWith('/')) {
      if (!exists(url)) fault(where, `links to ${url}, which does not exist`);
      const hash = url.split('#')[1];
      if (hash && exists(url) && !idsOf(fs.readFileSync(fileFor(url), 'utf8')).has(hash)) fault(where, `links to ${url}, and that page has nothing called #${hash}`);
    } else if (!/^(https:|tel:|mailto:)/.test(url)) {
      fault(where, `has a link that is neither on this site nor a full address: ${url}`);
    }
  }
  for (const id of ids) {
    if ((html.match(new RegExp(`\\sid="${id}"`, 'g')) || []).length > 1) fault(where, `uses the id ${id} twice`);
  }

  // The quote form: the one trap, under the name no browser fills in, sent
  // to Graftday. A box called "company" is the old trap, which threw away
  // real enquiries.
  const forms = (html.match(/<form[\s>]/g) || []).length;
  if (forms > 1) fault(where, 'has more than one form');
  if (forms === 1) {
    if (!/<input[^>]*name="wf_check"/.test(html)) fault(where, 'quote form has no wf_check trap');
    if (/name="company"/.test(html)) fault(where, 'quote form still has the old "company" trap');
    if (!/<form[^>]*action="https:\/\/app\.graftday\.com\/enquire\/wf_[\w-]+"/.test(html)) fault(where, 'quote form does not post to Graftday (was the build run with FORM_ACTION set?)');
    for (const need of ['name', 'phone', 'email', 'postcode', 'description', 'photos', 'ref']) {
      if (!new RegExp(`name="${need}"`).test(html)) fault(where, `quote form has lost its ${need} box`);
    }
  }
  if (!text.includes('07765 229125')) fault(where, 'does not show the phone number');

  // The owner's choices: town only, never the street or the postcode.
  if (/Berkshire Road|GU15/i.test(html)) fault(where, 'shows the street or the postcode, which the owner chose to keep off the site');
  if (/google-analytics|googletagmanager|fonts\.googleapis|fonts\.gstatic|maps\.googleapis/i.test(html)) fault(where, 'loads something from Google, which the privacy page says the site does not');

  // The hidden label. It must be real JSON, say nothing the page does not
  // show, and never carry a rating or a review.
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m => m[1]);
  if (blocks.length !== 1) fault(where, `has ${blocks.length} label blocks, it should have one`);
  for (const block of blocks) {
    let data;
    try { data = JSON.parse(block); } catch (e) { fault(where, `label is not valid JSON: ${e.message}`); continue; }
    if (/aggregateRating|"review"|ratingValue|reviewCount|streetAddress|postalCode|"geo"/i.test(block)) fault(where, 'label carries a rating, a review or a street address');
    const graph = data['@graph'] || [];
    const business = graph.find(x => x['@type'] === 'LocalBusiness');
    if (!business) { fault(where, 'label has no business in it'); continue; }
    if (business.telephone !== '+447765229125') fault(where, `label phone is ${business.telephone}`);
    if (!html.includes(`href="tel:${business.telephone}"`)) fault(where, 'label phone is not the number the page rings');
    if (!text.includes(business.email)) fault(where, 'label email is not shown on the page');
    if (!text.includes('Camberley, Surrey')) fault(where, 'label says Camberley, Surrey and the page does not');
    if (!text.includes('7am to 7pm')) fault(where, 'label gives opening hours the page does not show');
    for (const town of business.areaServed || []) {
      if (!text.includes(town)) fault(where, `label says we cover ${town}, which the page does not name`);
    }
    for (const link of business.sameAs || []) {
      if (!html.includes(`href="${link}"`)) fault(where, `label points at ${link}, which the page does not link to`);
    }
    // A page with no job photo lists no picture. Every picture the label
    // does list has to be one the page shows: the picture a shared link uses
    // (share.jpg) is on no page, so it does not belong here.
    const pictures = business.image || [];
    for (const img of [business.logo, ...pictures]) {
      if (!img.startsWith(SITE) || !exists(img.slice(SITE.length))) fault(where, `label picture ${img} does not exist`);
    }
    for (const img of pictures) {
      const slug = path.basename(img, '.jpg');
      if (!/-after\.jpg$/.test(img) || !html.includes(`/img/${slug}-sm.jpg`)) fault(where, `label picture ${path.basename(img)} is not a photo on the page`);
    }
    const service = graph.find(x => x['@type'] === 'Service');
    if (service) {
      if (!text.includes(service.name)) fault(where, `label names the service "${service.name}", which the page does not say`);
      if (service.url !== canonical) fault(where, 'label service address is not this page');
      for (const town of service.areaServed || []) {
        if (!text.includes(town)) fault(where, `label says the service covers ${town}, which the page does not name`);
      }
    }
    const faq = graph.find(x => x['@type'] === 'FAQPage');
    const asked = (html.match(/<details/g) || []).length;
    if ((faq ? faq.mainEntity.length : 0) !== asked) fault(where, 'label questions do not match the questions on the page');
    for (const q of faq ? faq.mainEntity : []) {
      if (!text.includes(q.name)) fault(where, `label question "${q.name}" is not on the page`);
      if (!text.includes(q.acceptedAnswer.text)) fault(where, `label answer to "${q.name}" is not the answer on the page`);
    }
  }
}

// Pages meant to be found: each in the sitemap, each with its own title and
// description, each reachable from the home page.
const sitemapXml = fs.readFileSync(path.join(OUT, 'sitemap.xml'), 'utf8');
const sitemap = [...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
// Each address carries the day its page last changed, a real day and not one
// that has not happened yet: Google stops reading these dates once it catches
// one being wrong.
const dated = [...sitemapXml.matchAll(/<url><loc>([^<]+)<\/loc><lastmod>(\d{4}-\d{2}-\d{2})<\/lastmod><\/url>/g)];
if (dated.length !== sitemap.length) fault('/sitemap.xml', 'has an address with no date beside it (or a date not written as year-month-day)');
for (const [, loc, day] of dated) {
  const t = new Date(day + 'T00:00:00').getTime();
  if (Number.isNaN(t) || t > Date.now()) fault('/sitemap.xml', `gives ${loc} the date ${day}, which is not a day that has happened`);
}
for (const p of indexable) {
  if (!sitemap.includes(p.canonical)) fault(p.where, 'is not in the sitemap');
  for (const other of indexable) {
    if (other === p) continue;
    if (other.title === p.title) fault(p.where, `has the same title as ${other.where}`);
    if (other.description === p.description) fault(p.where, `has the same description as ${other.where}`);
  }
  const address = p.canonical.slice(SITE.length);
  if (address !== '/' && !home.html.includes(`href="${address}"`)) fault(p.where, 'is not linked from the home page');
  if (unesc(p.title).length > 65) fault(p.where, `title is ${unesc(p.title).length} characters, Google cuts it at about 60`);
}
for (const u of sitemap) {
  if (!indexable.some(p => p.canonical === u)) fault('/sitemap.xml', `lists ${u}, which is not a page meant to be found`);
}

// The trap is only a trap if the stylesheet takes it off the page.
const css = fs.readFileSync(path.join(OUT, 'css', 'site.css'), 'utf8');
if (!/\.field--trap\s*\{\s*display:\s*none;?\s*\}/.test(css)) fault('/css/site.css', 'does not hide the trap with display: none');
// A link written into a page and then hidden by the stylesheet is a hidden
// link as far as Google is concerned, whatever the reason. If a page should
// not show a link, leave the link out of the page.
if (/aria-current[^{]*\{[^}]*display:\s*none/.test(css)) fault('/css/site.css', 'hides a link to the page you are on; leave the link out of the page instead');

if (faults.length) {
  console.error(faults.join('\n'));
  console.error(`\n${faults.length} thing(s) to fix before this is published.`);
  process.exit(1);
}
console.log(`checked ${pages.length} pages (${indexable.length} in the sitemap): links, headings, labels, form and trap all hold.`);
