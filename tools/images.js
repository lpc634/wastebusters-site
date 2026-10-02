// Prepares the site's images from their originals: the logo and favicons, the
// picture a shared link shows, and the before and after job photos. Run with
// node from any folder:
//
//   node tools/images.js <folder of job photos>
//
// sharp is borrowed from the CRM's checkout so this site needs no packages of
// its own. Photos are re-encoded, which drops their metadata: a phone photo
// carries the GPS position it was taken at, which on a clearance job is the
// customer's address.
const fs = require('fs');
const path = require('path');
const sharp = require('C:/wastebusters-crm/node_modules/sharp');

const OUT = path.join(__dirname, '..', 'docs', 'img');
const LOGO = 'C:/Users/Lance Carstairs/Desktop/Waste Busters/Subject.png';
const ROUND = 'C:/Users/Lance Carstairs/Desktop/Waste Busters/Waste Busters logo (fits circle).png';
const photos = process.argv[2];

// Which job photos, and what each pair shows. Chosen by eye on 26 Sept 2026
// from finished jobs whose customer allowed photos to be used: nothing with a
// house number, a readable number plate, a face or another firm's van.
const PAIRS = [
  { job: 67,  slug: 'garden-rubbish' },
  { job: 185, slug: 'builders-rubble' },
  { job: 199, slug: 'garage-boxes' },
  { job: 243, slug: 'flat-clearance' },
  { job: 265, slug: 'green-waste' },
  { job: 181, slug: 'garden-junk' },
];

async function variant(input, name, width, height) {
  const base = sharp(input).rotate().resize(width, height, { fit: 'cover', position: 'attention' });
  await base.clone().webp({ quality: 72 }).toFile(path.join(OUT, `${name}.webp`));
  await base.clone().jpeg({ quality: 76, mozjpeg: true }).toFile(path.join(OUT, `${name}.jpg`));
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });

  // The mascot, transparent, for the header and hero.
  for (const w of [96, 192, 480]) {
    await sharp(LOGO).resize(w).png({ compressionLevel: 9, palette: true }).toFile(path.join(OUT, `logo-${w}.png`));
    await sharp(LOGO).resize(w).webp({ quality: 90 }).toFile(path.join(OUT, `logo-${w}.webp`));
  }
  // Icons from the version that sits inside its circle, so nothing is cropped.
  await sharp(ROUND).resize(32).png().toFile(path.join(OUT, 'favicon-32.png'));
  await sharp(ROUND).resize(180).flatten({ background: '#ffffff' }).png().toFile(path.join(OUT, 'apple-touch-icon.png'));
  await sharp(ROUND).resize(512).png().toFile(path.join(OUT, 'icon-512.png'));

  // The picture shown when the link is sent on WhatsApp or posted on Facebook:
  // 1200 by 630, the mascot on the site's near-black with the hero's faint
  // brick and red band. It was the round icon, which those apps show as a
  // small square beside the words. No words in it: the app prints the page's
  // title underneath, and the site's fonts are not installed for sharp to
  // draw with. No job photo either, so nothing about a customer's home is
  // ever attached to a shared link.
  const W = 1200, H = 630, BAND = 14;
  const backdrop = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <defs>
      <pattern id="brick" width="72" height="48" patternUnits="userSpaceOnUse"><path d="M0 23.5h72M0 47.5h72M36 0v24M.5 24v24" stroke="#ffffff" stroke-opacity=".055" fill="none"/></pattern>
      <radialGradient id="glow" cx="85%" cy="10%" r="90%"><stop offset="0" stop-color="#cc242c" stop-opacity=".16"/><stop offset=".6" stop-color="#cc242c" stop-opacity="0"/></radialGradient>
    </defs>
    <rect width="100%" height="100%" fill="#141213"/>
    <rect width="100%" height="100%" fill="url(#brick)"/>
    <rect width="100%" height="100%" fill="url(#glow)"/>
    <rect y="${H - BAND}" width="100%" height="${BAND}" fill="#cc242c"/>
  </svg>`);
  const mascot = await sharp(LOGO).resize({ height: 470 }).png().toBuffer();
  await sharp(backdrop).composite([{ input: mascot, gravity: 'centre' }])
    .jpeg({ quality: 86, mozjpeg: true }).toFile(path.join(OUT, 'share.jpg'));

  if (photos) {
    const files = fs.readdirSync(photos);
    for (const p of PAIRS) {
      for (const kind of ['before', 'after']) {
        const file = files.find(f => f.startsWith(`job${p.job}-${kind}-`) && /\.(jpe?g|png)$/i.test(f));
        if (!file) throw new Error(`no ${kind} photo for job ${p.job}`);
        const src = path.join(photos, file);
        await variant(src, `${p.slug}-${kind}`, 640, 800);
        await variant(src, `${p.slug}-${kind}-sm`, 320, 400);
      }
    }
  }
  console.log(fs.readdirSync(OUT).length, 'files in docs/img');
})().catch(e => { console.error(e); process.exit(1); });
