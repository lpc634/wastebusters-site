// Builds the Waste Busters website into docs/, which GitHub Pages publishes.
//
//   node build.js            then            node tools/check.js
//
// No packages: each page in src/pages is a fragment with its settings in a
// JSON comment on the first line, poured into src/layout.html. A static site
// rather than anything cleverer because it is a handful of pages that change
// rarely, it loads instantly on a phone with one bar of signal, and there is
// nothing on a server to break, patch or pay for.
//
// Since October 2026 more than one page asks for a quote (there is a page for
// each main kind of job), so three things are written once and reused:
//
//   {{>name}}       a shared piece, src/parts/name.html. The quote form is
//                   one, so the form and its bot trap are never copied by
//                   hand into a page and left to drift.
//   {{pair:slug}}   a before and after pair from src/pairs.json.
//   {{phone}} etc.  facts about the business from site.config.json.
//
// The hidden label for search engines (the JSON-LD block) is made here from
// those same facts and from what the page actually shows. Written by hand in
// the layout, as it was, it said the same thing on every page whether or not
// the page showed it, and nothing stopped it drifting from the words.
//
// The quote form posts to Graftday (the CRM), which makes each enquiry a job
// on the Waste Busters pipeline. Its address is in site.config.json; set
// FORM_ACTION to point a local build at a test copy instead.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = __dirname;
const SRC = path.join(ROOT, 'src');
const OUT = path.join(ROOT, 'docs');
const SITE = 'https://www.wastebustersservices.co.uk';
const config = JSON.parse(fs.readFileSync(path.join(ROOT, 'site.config.json'), 'utf8'));
const FORM_ACTION = process.env.FORM_ACTION || config.formAction;

const read = f => fs.readFileSync(f, 'utf8');
const layout = read(path.join(SRC, 'layout.html'));
const pairs = JSON.parse(read(path.join(SRC, 'pairs.json')));
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const sentence = list => list.slice(0, -1).join(', ') + ' and ' + list[list.length - 1];

// Content hashes on the stylesheet and script, so a phone that cached last
// week's copy picks up this week's the moment it changes.
function publish(from, to) {
  const body = read(path.join(SRC, from));
  fs.mkdirSync(path.dirname(path.join(OUT, to)), { recursive: true });
  fs.writeFileSync(path.join(OUT, to), body);
  return crypto.createHash('sha1').update(body).digest('hex').slice(0, 8);
}
const cssV = publish('css/site.css', 'css/site.css');
const jsV = publish('js/site.js', 'js/site.js');

// The phone number is typed once, the way people say it; the forms a link
// needs are worked out from it.
const tel = '+44' + config.phone.replace(/\D/g, '').replace(/^0/, '');
const wa = 'https://wa.me/' + tel.slice(1);
const towns = ['Camberley', ...config.mainTowns, ...config.otherTowns];

// The Google rating is typed once too, with the day it was read. It was in
// three places, and was going to be wrong in all three the day the next
// review arrived. Delete "count" from site.config.json and every mention
// drops the number ("5.0 on Google"), for whenever keeping it up to date
// stops being worth it. It is shown on the page and never put in the hidden
// label: Google's rules do not allow a business to mark up its own reviews.
const g = config.googleReviews;
const reviews = g.count
  ? { short: `${g.rating} from ${g.count} Google reviews`, long: `${g.rating} out of 5 from ${g.count} Google reviews`, link: `Read all ${g.count} reviews on Google` }
  : { short: `${g.rating} on Google`, long: `${g.rating} out of 5 on Google`, link: 'Read our reviews on Google' };
const readDaysAgo = Math.floor((Date.now() - new Date(g.readOn).getTime()) / 864e5);
if (!(readDaysAgo <= 14)) {
  console.warn(`CHECK THE REVIEWS: the Google rating in site.config.json (${reviews.short}) was read on ${g.readOn}. Look at the profile, then update "rating", "count" and "readOn".`);
}

const facts = {
  phone: config.phone,
  tel,
  wa,
  // Typed out rather than encoded here: encodeURIComponent leaves the
  // apostrophe in "I'll" bare, which is one character from ending the link.
  waQuote: wa + '?text=Hi%20Waste%20Busters%2C%20could%20I%20get%20a%20quote%3F%20I%27ll%20send%20a%20photo.',
  email: config.email,
  facebook: config.facebook,
  instagram: config.instagram,
  reviewsShort: reviews.short,
  reviewsLong: reviews.long,
  reviewsLink: reviews.link,
  reviewsUrl: g.url,
  towns: towns.map(t => `<li>${esc(t)}</li>`).join(''),
  mainTowns: sentence(config.mainTowns),
  share: SITE + '/img/share.jpg',
  cssV, jsV,
  year: String(new Date().getFullYear()),
  formAction: FORM_ACTION,
};

// A shared piece may use another, but not itself.
function withParts(html, from, inside = []) {
  return html.replace(/\{\{>([\w-]+)\}\}/g, (all, name) => {
    const file = path.join(SRC, 'parts', name + '.html');
    if (!fs.existsSync(file)) throw new Error(`${from}: there is no shared piece src/parts/${name}.html`);
    if (inside.includes(name)) throw new Error(`${from}: the shared piece ${name} uses itself`);
    return withParts(read(file).trimEnd(), `parts/${name}.html`, inside.concat(name));
  });
}

function pairHtml(slug, from) {
  const p = pairs[slug];
  if (!p) throw new Error(`${from}: there is no pair called ${slug} in src/pairs.json`);
  const shot = (kind, alt) => {
    for (const f of [`${slug}-${kind}-sm.webp`, `${slug}-${kind}.webp`, `${slug}-${kind}-sm.jpg`, `${slug}-${kind}.jpg`]) {
      if (!fs.existsSync(path.join(OUT, 'img', f))) throw new Error(`${from}: docs/img/${f} is missing (node tools/images.js makes it)`);
    }
    return `<picture><source srcset="/img/${slug}-${kind}-sm.webp 320w, /img/${slug}-${kind}.webp 640w" sizes="(min-width: 900px) 190px, 45vw" type="image/webp"><img src="/img/${slug}-${kind}-sm.jpg" width="320" height="400" loading="lazy" alt="${esc(alt)}"></picture>`;
  };
  // A town, once the owner has said where the job was and that naming it is
  // fine with the customer: add "town" to the pair in src/pairs.json. Town
  // only, never a street.
  const caption = p.town ? `${p.caption}, ${p.town}` : p.caption;
  return [
    '<figure class="pair">',
    '        <div class="pair__shots">',
    '          ' + shot('before', p.before),
    '          ' + shot('after', p.after),
    '        </div>',
    `        <figcaption>${esc(caption)}</figcaption>`,
    '      </figure>',
  ].join('\n');
}

// The questions on a page, read back out of the page itself, so the label
// can only ever repeat what a visitor can open and read.
const plain = html => html.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
function questionsOn(body, from) {
  const found = [];
  const re = /<details class="faq__item">\s*<summary>([\s\S]*?)<\/summary>\s*<p>([\s\S]*?)<\/p>\s*<\/details>/g;
  let m;
  while ((m = re.exec(body))) found.push({ q: plain(m[1]), a: plain(m[2]) });
  if (found.length !== (body.match(/<details/g) || []).length) {
    throw new Error(`${from}: a question is not written the way the build reads them (a summary, then one paragraph)`);
  }
  const odd = found.find(x => /&\w+;/.test(x.q + x.a));
  if (odd) throw new Error(`${from}: the question "${odd.q}" has an HTML code in it the label cannot carry; type the character itself`);
  return found;
}

// The label. One business, described once, with only what this page shows:
// the towns if the page names them, the job photos if the page has them. No
// street and no postcode, to match the footer and the hidden address on
// Google (the owner's choice). No rating and no review count, ever.
function label(meta, canonical, body, used, shown) {
  const id = SITE + '/#business';
  const area = used.has('towns') ? towns : used.has('mainTowns') ? ['Camberley', ...config.mainTowns] : null;
  const business = {
    '@type': 'LocalBusiness',
    '@id': id,
    name: 'Waste Busters',
    description: 'Waste clearance and rubbish removal in Camberley and about 15 miles around. Upper tier registered waste carrier, licence CBDU638282.',
    url: SITE + '/',
    telephone: tel,
    email: config.email,
    logo: SITE + '/img/icon-512.png',
    image: [...shown.map(slug => `${SITE}/img/${slug}-after.jpg`), facts.share],
    address: { '@type': 'PostalAddress', addressLocality: 'Camberley', addressRegion: 'Surrey', addressCountry: 'GB' },
    openingHoursSpecification: [{
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      opens: '07:00', closes: '19:00',
    }],
    ...(area ? { areaServed: area } : {}),
    sameAs: [config.facebook, config.instagram, g.url],
  };
  const graph = [business];
  if (meta.service) {
    graph.push({
      '@type': 'Service',
      '@id': canonical + '#service',
      name: meta.service,
      url: canonical,
      provider: { '@id': id },
      ...(area ? { areaServed: area } : {}),
    });
    graph.push({
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE + '/' },
        { '@type': 'ListItem', position: 2, name: meta.service, item: canonical },
      ],
    });
  }
  const questions = questionsOn(body, meta.path);
  if (questions.length) {
    graph.push({
      '@type': 'FAQPage',
      '@id': canonical + '#faq',
      mainEntity: questions.map(x => ({ '@type': 'Question', name: x.q, acceptedAnswer: { '@type': 'Answer', text: x.a } })),
    });
  }
  // "<" written as its code, so nothing in the words can close the script tag.
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c');
}

const pages = fs.readdirSync(path.join(SRC, 'pages')).filter(f => f.endsWith('.html'));
const urls = [];
for (const file of pages) {
  const raw = read(path.join(SRC, 'pages', file));
  const m = /^<!--(\{[\s\S]*?\})-->\s*/.exec(raw);
  if (!m) throw new Error(`${file} needs its settings comment on the first line`);
  const meta = JSON.parse(m[1]);
  const canonical = SITE + meta.path;
  const used = new Set();
  const shown = [];
  const fill = {
    ...facts,
    title: esc(meta.title),
    description: esc(meta.description),
    canonical,
    robots: meta.noindex ? 'noindex' : 'index,follow',
  };
  // A page about one kind of job says so in its settings ("service"), and
  // gets the line that leads back to the home page from it.
  if (meta.service) {
    fill.crumb = `<nav class="crumb" aria-label="You are here"><a href="/">Home</a> <span aria-hidden="true">/</span> ${esc(meta.service)}</nav>`;
  }
  // A function rather than a string as the replacement, so a "$" in the copy
  // is never read as a pattern.
  const put = text => text.replace(/\{\{(\w+)(?::([\w-]+))?\}\}/g, (all, key, arg) => {
    if (key === 'pair') { shown.push(arg); return pairHtml(arg, file); }
    if (!(key in fill)) throw new Error(`${file}: nothing to fill {{${key}}} with`);
    used.add(key);
    return fill[key];
  });
  // The page is filled first, so a page and its shared pieces can use the
  // placeholders too, and so the label can be made from what the page shows.
  const body = put(withParts(raw.slice(m[0].length), file));
  fill.content = body;
  fill.schema = label(meta, canonical, body, used, shown);
  // "Free quote" on the phone's bottom bar goes to the form on this page
  // where there is one, and to the home page's otherwise.
  fill.quoteHref = body.includes('id="quote"') ? '#quote' : '/#quote';
  let html = put(layout);
  if (html.includes('{{')) throw new Error(`${file}: a placeholder was left unfilled`);
  // A link to the page you are on says so, for screen readers and so the
  // "what else we clear" list can leave the current page out.
  html = html.split(`href="${meta.path}"`).join(`href="${meta.path}" aria-current="page"`);
  const target = meta.path === '/404.html' ? path.join(OUT, '404.html')
    : path.join(OUT, meta.path, 'index.html');
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, html);
  if (!meta.noindex) urls.push(canonical);
}

// The home page first, then the rest in a steady order.
urls.sort((a, b) => a.length - b.length || a.localeCompare(b));
fs.writeFileSync(path.join(OUT, 'sitemap.xml'),
  '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
  + urls.map(u => `  <url><loc>${u}</loc></url>`).join('\n') + '\n</urlset>\n');
fs.writeFileSync(path.join(OUT, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${SITE}/sitemap.xml\n`);
fs.writeFileSync(path.join(OUT, 'CNAME'), 'www.wastebustersservices.co.uk\n');
// GitHub Pages would otherwise run the folder through Jekyll, which skips
// anything starting with an underscore and slows every publish down.
fs.writeFileSync(path.join(OUT, '.nojekyll'), '');

console.log(`built ${pages.length} page(s), form posts to ${FORM_ACTION}`);
