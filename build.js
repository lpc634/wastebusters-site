// Builds the Waste Busters website into docs/, which GitHub Pages publishes.
//
//   node build.js
//
// No packages: each page in src/pages is a fragment with its settings in a
// JSON comment on the first line, poured into src/layout.html. A static site
// rather than anything cleverer because it is a handful of pages that change
// rarely, it loads instantly on a phone with one bar of signal, and there is
// nothing on a server to break, patch or pay for.
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

const pages = fs.readdirSync(path.join(SRC, 'pages')).filter(f => f.endsWith('.html'));
const urls = [];
for (const file of pages) {
  const raw = read(path.join(SRC, 'pages', file));
  const m = /^<!--(\{[\s\S]*?\})-->\s*/.exec(raw);
  if (!m) throw new Error(`${file} needs its settings comment on the first line`);
  const meta = JSON.parse(m[1]);
  const fill = {
    title: meta.title,
    description: meta.description,
    canonical: SITE + meta.path,
    robots: meta.noindex ? 'noindex' : 'index,follow',
    cssV, jsV,
    year: String(new Date().getFullYear()),
    formAction: FORM_ACTION,
  };
  // The page goes in first and the placeholders are filled after, so a page
  // can use them too (the form's address). A function rather than a string as
  // the replacement, so a "$" in the copy is never read as a pattern.
  const html = layout.split('{{content}}').join(raw.slice(m[0].length))
    .replace(/\{\{(\w+)\}\}/g, (all, key) => {
      if (!(key in fill)) throw new Error(`${file}: nothing to fill {{${key}}} with`);
      return fill[key];
    });
  const target = meta.path === '/404.html' ? path.join(OUT, '404.html')
    : path.join(OUT, meta.path, 'index.html');
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, html);
  if (!meta.noindex) urls.push(fill.canonical);
}

fs.writeFileSync(path.join(OUT, 'sitemap.xml'),
  '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
  + urls.map(u => `  <url><loc>${u}</loc></url>`).join('\n') + '\n</urlset>\n');
fs.writeFileSync(path.join(OUT, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${SITE}/sitemap.xml\n`);
fs.writeFileSync(path.join(OUT, 'CNAME'), 'www.wastebustersservices.co.uk\n');
// GitHub Pages would otherwise run the folder through Jekyll, which skips
// anything starting with an underscore and slows every publish down.
fs.writeFileSync(path.join(OUT, '.nojekyll'), '');

console.log(`built ${pages.length} page(s), form posts to ${FORM_ACTION}`);
