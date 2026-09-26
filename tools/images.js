// Prepares the site's images from their originals: the logo and favicons, and
// the before and after job photos. Run with node from any folder:
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
