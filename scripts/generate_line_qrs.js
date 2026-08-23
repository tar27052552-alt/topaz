const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

const links = [
  { file: 'qr_main.svg', url: 'https://line.me/ti/g2/zMDLLEMtlmLQO3BFmlJU3bKuuqPwUSiJP-ultA?utm_source=invitation&utm_medium=link_copy&utm_campaign=default' },
  { file: 'qr_takraw.svg', url: 'https://line.me/ti/g/qGKycLzNaL' },
  { file: 'qr_volleyball.svg', url: 'https://line.me/ti/g/YxS-JRnecn' },
  { file: 'qr_basketball.svg', url: 'https://line.me/ti/g/Bv_M7LGSzS' },
  { file: 'qr_football_sr_m.svg', url: 'https://line.me/ti/g/Uu5vQcKSHU' },
  { file: 'qr_football_jr_m.svg', url: 'https://line.me/ti/g/w__kfxvXcf' },
  { file: 'qr_running16.svg', url: 'https://line.me/ti/g/rXh8QPWHsH' },
  { file: 'qr_football_f.svg', url: 'https://line.me/ti/g/2tSuPCZUMG' },
  { file: 'qr_athletics.svg', url: 'https://line.me/ti/g/yD352A6Aha' },
  { file: 'qr_sports.svg', url: 'https://line.me/ti/g2/zMDLLEMtlmLQO3BFmlJU3bKuuqPwUSiJP-ultA?utm_source=invitation&utm_medium=link_copy&utm_campaign=default' }
];

const imgDir = path.resolve(__dirname, '../public/images');
if (!fs.existsSync(imgDir)) fs.mkdirSync(imgDir, { recursive: true });

async function generateAll() {
  for (const item of links) {
    const filePath = path.join(imgDir, item.file);
    const svg = await QRCode.toString(item.url, {
      type: 'svg',
      color: {
        dark: '#bf360c', // Elegant Amber / Orange-dark
        light: '#ffffff'
      },
      margin: 1
    });
    fs.writeFileSync(filePath, svg, 'utf8');
    console.log(`[OK] Generated: ${item.file}`);
  }
  console.log('✅ All LINE QR Code SVGs created successfully!');
}

generateAll();
