import fs from "node:fs";
import sharp from "sharp";

const source = "public/uploads/2025/10/JPhotography2-819x1024.jpg";

async function avatar(size) {
  const border = Math.max(2, Math.round(size * 0.045));
  const inner = size - border * 2;

  const mask = Buffer.from(`
    <svg width="${inner}" height="${inner}" viewBox="0 0 ${inner} ${inner}">
      <circle cx="${inner / 2}" cy="${inner / 2}" r="${inner / 2}" fill="white"/>
    </svg>
  `);

  const portrait = await sharp(source)
    .extract({ left: 105, top: 20, width: 609, height: 609 })
    .resize(inner, inner, { fit: "cover" })
    .composite([{ input: mask, blend: "dest-in" }])
    .png()
    .toBuffer();

  const base = Buffer.from(`
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <rect width="100%" height="100%" rx="${Math.round(size * 0.18)}" fill="#1e2a3a"/>
      <circle cx="${size / 2}" cy="${size / 2}" r="${inner / 2 + border / 2}" fill="#b08a4f"/>
    </svg>
  `);

  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 8, g: 59, b: 92, alpha: 1 },
    },
  })
    .composite([
      { input: base },
      { input: portrait, left: border, top: border },
    ])
    .png()
    .toBuffer();
}

function ico(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);

  const entries = [];
  let offset = 6 + images.length * 16;

  for (const { size, buffer } of images) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size === 256 ? 0 : size, 0);
    entry.writeUInt8(size === 256 ? 0 : size, 1);
    entry.writeUInt8(0, 2);
    entry.writeUInt8(0, 3);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(buffer.length, 8);
    entry.writeUInt32LE(offset, 12);
    entries.push(entry);
    offset += buffer.length;
  }

  return Buffer.concat([header, ...entries, ...images.map((image) => image.buffer)]);
}

const favicon16 = await avatar(16);
const favicon32 = await avatar(32);
const favicon48 = await avatar(48);
const appleTouchIcon = await avatar(180);
const icon192 = await avatar(192);
const icon512 = await avatar(512);

fs.writeFileSync("public/favicon-16x16.png", favicon16);
fs.writeFileSync("public/favicon-32x32.png", favicon32);
fs.writeFileSync("public/apple-touch-icon.png", appleTouchIcon);
fs.writeFileSync("public/icon-192.png", icon192);
fs.writeFileSync("public/icon-512.png", icon512);
fs.writeFileSync(
  "public/favicon.ico",
  ico([
    { size: 16, buffer: favicon16 },
    { size: 32, buffer: favicon32 },
    { size: 48, buffer: favicon48 },
  ]),
);
