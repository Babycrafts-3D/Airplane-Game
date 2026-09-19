import { Resvg } from '@resvg/resvg-js';
import { writeFileSync, mkdirSync } from 'node:fs';

const svg = (maskable) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7fd6ff"/><stop offset="1" stop-color="#2f8fdc"/></linearGradient>
    <linearGradient id="sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2f97dc"/><stop offset="1" stop-color="#1d6fc2"/></linearGradient>
  </defs>
  <rect width="512" height="512" rx="${maskable ? 0 : 112}" fill="url(#sky)"/>
  <ellipse cx="256" cy="430" rx="230" ry="120" fill="#6fd3ee" opacity="0.6"/>
  <ellipse cx="256" cy="445" rx="200" ry="95" fill="#f4dfa4"/>
  <ellipse cx="256" cy="440" rx="184" ry="84" fill="#86d066"/>
  <rect x="226" y="372" width="60" height="150" rx="10" fill="#525a68"/>
  <rect x="254" y="392" width="4" height="18" fill="#fff"/><rect x="254" y="424" width="4" height="18" fill="#fff"/><rect x="254" y="456" width="4" height="18" fill="#fff"/>
  <circle cx="176" cy="426" r="22" fill="#3f9a4c"/><circle cx="150" cy="446" r="18" fill="#5cb85f"/><circle cx="340" cy="430" r="24" fill="#3f9a4c"/><circle cx="366" cy="454" r="16" fill="#5cb85f"/>
  <path d="M110 236c0-22 18-38 40-33 8-22 32-34 54-26 14-22 46-25 62-6 24-6 46 10 46 32 18 2 30 16 30 32 0 18-16 32-34 32H142c-18 0-32-14-32-31z" fill="#fff" opacity="0.95"/>
  <g transform="translate(256 200) rotate(-22)">
    <path d="M-92 0h150c18 0 34 8 34 16s-16 16-34 16h-150c-10 0-18-8-18-16s8-16 18-16z" fill="#ff7a59"/>
    <path d="M-30 -4l-46 -60h24l70 60z" fill="#ffb59c"/>
    <path d="M-30 36l-46 60h24l70 -60z" fill="#ffb59c"/>
    <path d="M-86 0l-28 -36h18l40 36z" fill="#ff5a3c"/>
    <circle cx="58" cy="16" r="7" fill="#12294a"/><circle cx="32" cy="16" r="7" fill="#12294a"/><circle cx="6" cy="16" r="7" fill="#12294a"/>
  </g>
</svg>`;

mkdirSync('public/icons', { recursive: true });
const out = (name, size, maskable) => {
  const r = new Resvg(svg(maskable), { fitTo: { mode: 'width', value: size } });
  writeFileSync(`public/icons/${name}`, r.render().asPng());
};
out('icon-192.png', 192, false);
out('icon-512.png', 512, false);
out('icon-512-maskable.png', 512, true);
out('apple-touch-icon.png', 180, true);
out('icon-1024.png', 1024, true);
console.log('icons written');

// Android launcher icons (legacy + adaptive foreground)
import { existsSync } from 'node:fs';
const dens = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
if (existsSync('android/app/src/main/res')) {
  for (const [d, m] of Object.entries(dens)) {
    const dir = `android/app/src/main/res/mipmap-${d}`;
    mkdirSync(dir, { recursive: true });
    const legacy = new Resvg(svg(false), { fitTo: { mode: 'width', value: Math.round(48 * m) } }).render().asPng();
    writeFileSync(`${dir}/ic_launcher.png`, legacy);
    writeFileSync(`${dir}/ic_launcher_round.png`, new Resvg(svg(true), { fitTo: { mode: 'width', value: Math.round(48 * m) } }).render().asPng());
    // adaptive foreground: 108dp canvas with the artwork in the inner 72dp safe zone
    const fg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 108 108"><g transform="translate(18 18) scale(0.140625)">${svg(true).replace(/^[\s\S]*?<rect[^>]*\/>/, '').replace('</svg>', '')}</g></svg>`;
    writeFileSync(`${dir}/ic_launcher_foreground.png`, new Resvg(fg, { fitTo: { mode: 'width', value: Math.round(108 * m) } }).render().asPng());
  }
  mkdirSync('android/app/src/main/res/values', { recursive: true });
  writeFileSync('android/app/src/main/res/values/ic_launcher_background.xml', '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#2F8FDC</color>\n</resources>\n');
  console.log('android icons written');
}
