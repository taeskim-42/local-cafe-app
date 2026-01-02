/**
 * Pass 템플릿 이미지 생성 스크립트
 *
 * 최소 요구사항을 충족하는 기본 이미지를 생성합니다.
 * 실제 배포 시에는 디자인된 이미지로 교체하세요.
 */

const fs = require('fs');
const path = require('path');

const PASS_DIR = path.join(__dirname, '../src/lib/wallet/apple/pass-template.pass');

// PNG 헤더 + IHDR + IDAT + IEND 를 직접 생성하는 함수
function createPNG(width, height, r, g, b) {
  // 간단한 단색 PNG 생성
  const png = require('zlib');

  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(25);
  ihdr.writeUInt32BE(13, 0); // length
  ihdr.write('IHDR', 4);
  ihdr.writeUInt32BE(width, 8);
  ihdr.writeUInt32BE(height, 12);
  ihdr.writeUInt8(8, 16); // bit depth
  ihdr.writeUInt8(2, 17); // color type (RGB)
  ihdr.writeUInt8(0, 18); // compression
  ihdr.writeUInt8(0, 19); // filter
  ihdr.writeUInt8(0, 20); // interlace
  const ihdrCrc = crc32(ihdr.slice(4, 21));
  ihdr.writeUInt32BE(ihdrCrc, 21);

  // Raw image data (filter byte + RGB for each row)
  const rawData = Buffer.alloc(height * (1 + width * 3));
  for (let y = 0; y < height; y++) {
    const rowStart = y * (1 + width * 3);
    rawData[rowStart] = 0; // filter byte
    for (let x = 0; x < width; x++) {
      const pixelStart = rowStart + 1 + x * 3;
      rawData[pixelStart] = r;
      rawData[pixelStart + 1] = g;
      rawData[pixelStart + 2] = b;
    }
  }

  // Compress with zlib
  const compressed = png.deflateSync(rawData);

  // IDAT chunk
  const idat = Buffer.alloc(compressed.length + 12);
  idat.writeUInt32BE(compressed.length, 0);
  idat.write('IDAT', 4);
  compressed.copy(idat, 8);
  const idatCrc = crc32(Buffer.concat([Buffer.from('IDAT'), compressed]));
  idat.writeUInt32BE(idatCrc, compressed.length + 8);

  // IEND chunk
  const iend = Buffer.from([0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130]);

  return Buffer.concat([signature, ihdr, idat, iend]);
}

// CRC32 계산
function crc32(data) {
  let crc = 0xFFFFFFFF;
  const table = [];

  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }

  for (let i = 0; i < data.length; i++) {
    crc = table[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8);
  }

  return (crc ^ 0xFFFFFFFF) >>> 0;
}

// 이미지 생성
const images = [
  // icon: 29x29, 58x58, 87x87 (커피 브라운)
  { name: 'icon.png', width: 29, height: 29 },
  { name: 'icon@2x.png', width: 58, height: 58 },
  { name: 'icon@3x.png', width: 87, height: 87 },
  // logo: 160x50, 320x100
  { name: 'logo.png', width: 160, height: 50 },
  { name: 'logo@2x.png', width: 320, height: 100 },
  // strip: 375x123, 750x246
  { name: 'strip.png', width: 375, height: 123 },
  { name: 'strip@2x.png', width: 750, height: 246 },
];

// 커피 브라운 색상 (RGB: 139, 69, 19 = #8B4513)
const r = 139, g = 69, b = 19;

console.log('Pass 이미지 생성 중...\n');

images.forEach(img => {
  const filePath = path.join(PASS_DIR, img.name);
  const png = createPNG(img.width, img.height, r, g, b);
  fs.writeFileSync(filePath, png);
  console.log(`✓ ${img.name} (${img.width}x${img.height})`);
});

console.log('\n이미지 생성 완료!');
console.log(`경로: ${PASS_DIR}`);
