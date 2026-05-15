// Generates the 4 Expo app icons from a single SVG design.
// Run with: node scripts/generate-icons.js
//
// Design: dark tire (donut with tread blocks) wrapping a gray rim, white "DC"
// monogram centered. Blue (#2196F3) background for icon.png/favicon.png;
// transparent background for adaptive-icon.png/splash-icon.png so Android's
// adaptive masking and Expo's splash background show through.

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const OUT_DIR = path.join(__dirname, '..', 'assets');
const SIZE = 1024;

const BLUE = '#2196F3';
const TIRE = '#171717';
const TREAD_DARK = '#000000';
const RIM = '#3a3a3a';
const RIM_RING = '#8a8a8a';
const HUB = '#1f1f1f';
const TEXT = '#ffffff';
const TEXT_ACCENT = '#2196F3';

function treadBlocks({ cx, cy, rOuter, rInner, count }) {
  // Generate `count` thin radial blocks around the tire to suggest tread.
  let out = '';
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * 360;
    const w = 22;
    const h = rOuter - rInner;
    const y = cy - rOuter; // start at top of the ring
    out += `<rect x="${cx - w / 2}" y="${y}" width="${w}" height="${h}" rx="6" fill="${TREAD_DARK}" transform="rotate(${angle} ${cx} ${cy})"/>\n`;
  }
  return out;
}

function tireSvg({ withBackground }) {
  const cx = SIZE / 2;
  const cy = SIZE / 2;

  // Tire: outer black donut.
  const tireOuterR = 440;
  const tireInnerR = 300;
  // Tread strip just inside the outer edge.
  const treadOuterR = tireOuterR - 4;
  const treadInnerR = tireOuterR - 80;
  // Inner plate (clean dark disc where the monogram sits).
  const plateR = tireInnerR - 18;
  // Subtle ring on the inner plate.
  const innerRingR = plateR - 26;

  const bg = withBackground
    ? `<rect width="${SIZE}" height="${SIZE}" fill="${BLUE}"/>`
    : '';

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
  ${bg}

  <!-- Tire body: black ring -->
  <circle cx="${cx}" cy="${cy}" r="${tireOuterR}" fill="${TIRE}"/>

  <!-- Outer rim highlight to suggest sidewall edge -->
  <circle cx="${cx}" cy="${cy}" r="${tireOuterR - 12}" fill="none" stroke="#2c2c2c" stroke-width="3"/>

  <!-- Tread blocks around the outer ring -->
  <g>
    ${treadBlocks({ cx, cy, rOuter: treadOuterR, rInner: treadInnerR, count: 24 })}
  </g>

  <!-- Inner rim disc (clean, no spokes — keeps the DC monogram readable) -->
  <circle cx="${cx}" cy="${cy}" r="${tireInnerR}" fill="${HUB}"/>
  <circle cx="${cx}" cy="${cy}" r="${tireInnerR}" fill="none" stroke="${RIM_RING}" stroke-width="4"/>

  <!-- Recessed plate behind the monogram -->
  <circle cx="${cx}" cy="${cy}" r="${plateR}" fill="${RIM}"/>
  <circle cx="${cx}" cy="${cy}" r="${innerRingR}" fill="none" stroke="${RIM_RING}" stroke-width="3"/>

  <!-- "DC" monogram centered -->
  <text x="${cx}" y="${cy + 75}"
        font-family="Arial Black, Helvetica, sans-serif"
        font-size="230"
        font-weight="900"
        fill="${TEXT}"
        text-anchor="middle"
        letter-spacing="-8">DC</text>
</svg>`.trim();
}

async function writeIcon(name, svg, finalSize = SIZE, options = {}) {
  const buffer = Buffer.from(svg);
  const pipeline = sharp(buffer).resize(finalSize, finalSize, {
    fit: 'contain',
    background: options.background ?? { r: 0, g: 0, b: 0, alpha: 0 },
  });
  const outPath = path.join(OUT_DIR, name);
  await pipeline.png({ compressionLevel: 9 }).toFile(outPath);
  const stat = fs.statSync(outPath);
  console.log(`wrote ${name} (${finalSize}x${finalSize}, ${stat.size} bytes)`);
}

async function main() {
  if (!fs.existsSync(OUT_DIR)) {
    throw new Error(`assets dir not found: ${OUT_DIR}`);
  }

  const withBg = tireSvg({ withBackground: true });
  const transparent = tireSvg({ withBackground: false });

  // 1) Main app icon — solid blue background.
  await writeIcon('icon.png', withBg, 1024);

  // 2) Android adaptive icon foreground — must keep safe zone (66% of canvas)
  //    so masking shapes don't clip the design. Render the tire SVG into a
  //    transparent 1024x1024 with the artwork shrunk to 66%.
  const adaptiveSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
  <g transform="translate(${SIZE * 0.17} ${SIZE * 0.17}) scale(0.66)">
    ${tireSvg({ withBackground: false }).replace(/<svg[^>]*>|<\/svg>/g, '')}
  </g>
</svg>`.trim();
  await writeIcon('adaptive-icon.png', adaptiveSvg, 1024);

  // 3) Splash icon — transparent, sits on the splash backgroundColor (#fff).
  await writeIcon('splash-icon.png', transparent, 1024);

  // 4) Favicon — small, with background for visibility.
  await writeIcon('favicon.png', withBg, 48);

  console.log('All icons generated.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
