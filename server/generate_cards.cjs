const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });
const { Pool } = require('pg');
const fs = require('fs-extra');
const https = require('https');
const http = require('http');

let puppeteer;
try {
  puppeteer = require('puppeteer');
} catch (e) {
  console.log('Waiting for puppeteer...');
}

const EXPORT_DIR = path.join(__dirname, '../facebook_exports');

function fetchImageAsBase64(url) {
  return new Promise((resolve) => {
    if (!url) return resolve('');
    if (url.startsWith('data:image')) return resolve(url);

    const client = url.startsWith('https') ? https : http;
    client.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        if (res.headers.location) {
          return fetchImageAsBase64(res.headers.location).then(resolve);
        }
      }
      if (res.statusCode !== 200) return resolve('');

      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        const mime = res.headers['content-type'] || 'image/jpeg';
        resolve(`data:${mime};base64,${buffer.toString('base64')}`);
      });
    }).on('error', () => resolve(''));
  });
}

function sanitizeFilename(str) {
  return str.replace(/[^a-zA-Z0-9 _-]/g, '').trim().replace(/\s+/g, '_');
}

function getPlayerCardHtml(player, photoBase64) {
  const cat = player.category || 'C';
  const catColors = {
    'A': { bg: '#eab308', text: '#000', label: 'CATEGORY A' },
    'B': { bg: '#3b82f6', text: '#fff', label: 'CATEGORY B' },
    'C': { bg: '#10b981', text: '#fff', label: 'CATEGORY C' }
  };
  const badgeStyle = catColors[cat] || catColors['C'];

  const placeholderSvg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 24 24" fill="none" stroke="%2394a3b8" stroke-width="1.5"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>`;
  const imageSrc = photoBase64 || placeholderSvg;

  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;800;900&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Outfit', sans-serif; }
  body {
    width: 1080px;
    height: 1350px;
    background: radial-gradient(circle at 50% 20%, #1e293b 0%, #0f172a 70%, #020617 100%);
    color: #fff;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 50px 60px;
    position: relative;
    overflow: hidden;
  }
  /* Background Hex Overlay */
  body::before {
    content: '';
    position: absolute;
    top: -100px; left: -100px; right: -100px; bottom: -100px;
    background-image: radial-gradient(rgba(245, 158, 11, 0.08) 2px, transparent 2px);
    background-size: 36px 36px;
    pointer-events: none;
  }
  /* Top Branding Header */
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 2px solid rgba(245, 158, 11, 0.3);
    padding-bottom: 20px;
    z-index: 10;
  }
  .brand-title {
    font-size: 26px;
    font-weight: 900;
    letter-spacing: 2px;
    color: #f59e0b;
    text-transform: uppercase;
  }
  .brand-sub {
    font-size: 14px;
    font-weight: 600;
    color: #94a3b8;
    letter-spacing: 1px;
  }
  .cat-badge {
    background: ${badgeStyle.bg};
    color: ${badgeStyle.text};
    font-size: 20px;
    font-weight: 900;
    padding: 10px 24px;
    border-radius: 50px;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.4);
  }
  /* Photo Container */
  .photo-container {
    display: flex;
    justify-content: center;
    align-items: center;
    margin: 30px 0;
    z-index: 10;
  }
  .photo-frame {
    width: 600px;
    height: 600px;
    border-radius: 36px;
    padding: 12px;
    background: linear-gradient(135deg, #f59e0b 0%, #3b82f6 50%, #1e293b 100%);
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
  }
  .photo-img {
    width: 100%;
    height: 100%;
    border-radius: 26px;
    object-fit: cover;
    background: #1e293b;
    display: block;
  }
  /* Details Section */
  .info-section {
    text-align: center;
    z-index: 10;
  }
  .player-name {
    font-size: 48px;
    font-weight: 900;
    letter-spacing: -0.5px;
    color: #ffffff;
    line-height: 1.1;
    text-transform: uppercase;
    text-shadow: 0 4px 10px rgba(0,0,0,0.5);
  }
  .player-nick {
    font-size: 24px;
    font-weight: 800;
    color: #f59e0b;
    margin-top: 6px;
    text-transform: uppercase;
    letter-spacing: 2px;
  }
  .player-pos {
    font-size: 22px;
    font-weight: 700;
    color: #cbd5e1;
    margin-top: 8px;
    text-transform: uppercase;
    letter-spacing: 1px;
  }
  /* Grid Badges */
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 20px;
    margin-top: 30px;
    z-index: 10;
  }
  .stat-card {
    background: rgba(30, 41, 59, 0.7);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 20px;
    padding: 20px 15px;
    text-align: center;
    backdrop-filter: blur(10px);
  }
  .stat-label {
    font-size: 13px;
    font-weight: 800;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    margin-bottom: 6px;
  }
  .stat-val {
    font-size: 28px;
    font-weight: 900;
    color: #f59e0b;
  }
  .stat-val-green {
    color: #10b981;
  }
  .stat-val-blue {
    color: #38bdf8;
  }
  /* Footer */
  .footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-top: 1px solid rgba(255,255,255,0.1);
    padding-top: 20px;
    font-size: 14px;
    color: #64748b;
    font-weight: 600;
    z-index: 10;
  }
</style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand-title">BBFF INTRA LEAGUE S1</div>
      <div class="brand-sub">OFFICIAL PLAYER AUCTION CARD 2026</div>
    </div>
    <div class="cat-badge">${badgeStyle.label}</div>
  </div>

  <div class="photo-container">
    <div class="photo-frame">
      <img class="photo-img" src="${imageSrc}" alt="${player.name}"/>
    </div>
  </div>

  <div class="info-section">
    <div class="player-name">${player.name}</div>
    ${player.nickname ? `<div class="player-nick">" ${player.nickname} "</div>` : ''}
    <div class="player-pos">${player.position} ${player.department ? `• ${player.department}` : ''}</div>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">Base Price</div>
        <div class="stat-val stat-val-green">৳${(player.basePrice || 0).toLocaleString()}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Jersey No</div>
        <div class="stat-val stat-val-blue">${player.jerseyNumber ? `#${player.jerseyNumber}` : 'N/A'}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Jersey Size</div>
        <div class="stat-val">${player.jerseySize || 'N/A'}</div>
      </div>
    </div>
  </div>

  <div class="footer">
    <div>ORGANIZED BY BBFF MANAGEMENT</div>
    <div>WWW.BBFF-AUCTION.COM</div>
  </div>
</body>
</html>
  `;
}

function getTeamCardHtml(team, logoBase64) {
  const placeholderSvg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 24 24" fill="none" stroke="%2394a3b8" stroke-width="1.5"><path d="M12 2L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-3z"/></svg>`;
  const logoSrc = logoBase64 || placeholderSvg;

  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;800;900&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Outfit', sans-serif; }
  body {
    width: 1080px;
    height: 1350px;
    background: radial-gradient(circle at 50% 20%, #1e1b4b 0%, #0f172a 70%, #020617 100%);
    color: #fff;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 50px 60px;
    position: relative;
    overflow: hidden;
  }
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 2px solid rgba(129, 140, 248, 0.3);
    padding-bottom: 20px;
    z-index: 10;
  }
  .brand-title {
    font-size: 26px;
    font-weight: 900;
    letter-spacing: 2px;
    color: #818cf8;
    text-transform: uppercase;
  }
  .brand-sub {
    font-size: 14px;
    font-weight: 600;
    color: #94a3b8;
    letter-spacing: 1px;
  }
  .team-badge {
    background: #6366f1;
    color: #fff;
    font-size: 20px;
    font-weight: 900;
    padding: 10px 24px;
    border-radius: 50px;
    text-transform: uppercase;
    letter-spacing: 1.5px;
  }
  .logo-container {
    display: flex;
    justify-content: center;
    align-items: center;
    margin: 40px 0;
    z-index: 10;
  }
  .logo-frame {
    width: 550px;
    height: 550px;
    border-radius: 40px;
    padding: 20px;
    background: linear-gradient(135deg, #6366f1 0%, #38bdf8 100%);
    box-shadow: 0 25px 50px -12px rgba(99, 102, 241, 0.5);
  }
  .logo-img {
    width: 100%;
    height: 100%;
    border-radius: 30px;
    object-fit: contain;
    background: #0f172a;
    padding: 30px;
    display: block;
  }
  .info-section {
    text-align: center;
    z-index: 10;
  }
  .team-name {
    font-size: 52px;
    font-weight: 900;
    letter-spacing: -0.5px;
    color: #ffffff;
    text-transform: uppercase;
  }
  .manager-name {
    font-size: 26px;
    font-weight: 700;
    color: #818cf8;
    margin-top: 10px;
    text-transform: uppercase;
  }
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 25px;
    margin-top: 35px;
    z-index: 10;
  }
  .stat-card {
    background: rgba(30, 41, 59, 0.7);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 20px;
    padding: 25px;
    text-align: center;
  }
  .stat-label {
    font-size: 14px;
    font-weight: 800;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    margin-bottom: 8px;
  }
  .stat-val {
    font-size: 32px;
    font-weight: 900;
    color: #10b981;
  }
  .footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-top: 1px solid rgba(255,255,255,0.1);
    padding-top: 20px;
    font-size: 14px;
    color: #64748b;
    font-weight: 600;
  }
</style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand-title">BBFF INTRA LEAGUE S1</div>
      <div class="brand-sub">OFFICIAL TEAM FRANCHISE PROFILE 2026</div>
    </div>
    <div class="team-badge">REGISTERED TEAM</div>
  </div>

  <div class="logo-container">
    <div class="logo-frame">
      <img class="logo-img" src="${logoSrc}" alt="${team.name}"/>
    </div>
  </div>

  <div class="info-section">
    <div class="team-name">${team.name}</div>
    <div class="manager-name">TEAM MANAGER: ${team.manager}</div>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">STARTING PURSE</div>
        <div class="stat-val">৳${(team.initialBudget || 150000).toLocaleString()}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">TEAM SQUAD LIMIT</div>
        <div class="stat-val" style="color:#38bdf8;">MIN 9 PLAYERS</div>
      </div>
    </div>
  </div>

  <div class="footer">
    <div>ORGANIZED BY BBFF MANAGEMENT</div>
    <div>WWW.BBFF-AUCTION.COM</div>
  </div>
</body>
</html>
  `;
}

async function runCardGenerator() {
  console.log('--- Generating Profile Cards for Players & Teams ---');

  if (!puppeteer) {
    puppeteer = require('puppeteer');
  }

  // 1. Fetch DB
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  let appData;
  const res = await pool.query('SELECT data FROM app_state WHERE id = 1');
  if (res.rows.length > 0 && res.rows[0].data) {
    appData = res.rows[0].data;
  } else {
    appData = await fs.readJson(path.join(__dirname, 'db.json'));
  }

  const cardsDir = path.join(EXPORT_DIR, 'Cards');
  const catACardsDir = path.join(cardsDir, '01_Category_A_Cards');
  const catBCardsDir = path.join(cardsDir, '02_Category_B_Cards');
  const catCCardsDir = path.join(cardsDir, '03_Category_C_Cards');
  const teamCardsDir = path.join(cardsDir, '04_Team_Cards');

  await fs.ensureDir(catACardsDir);
  await fs.ensureDir(catBCardsDir);
  await fs.ensureDir(catCCardsDir);
  await fs.ensureDir(teamCardsDir);

  // 2. Launch Puppeteer
  const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  const launchOptions = {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  };
  if (fs.existsSync(chromePath)) {
    launchOptions.executablePath = chromePath;
  }

  const browser = await puppeteer.launch(launchOptions);
  const page = await browser.newPage();
  await page.setViewport({ width: 1080, height: 1350, deviceScaleFactor: 1 });

  // 3. Generate Player Cards
  console.log(`Generating visual cards for ${appData.players.length} players...`);
  for (let i = 0; i < appData.players.length; i++) {
    const p = appData.players[i];
    const cat = p.category || 'C';
    let targetDir = catCCardsDir;
    if (cat === 'A') targetDir = catACardsDir;
    if (cat === 'B') targetDir = catBCardsDir;

    const safeName = sanitizeFilename(p.name);
    const safeNick = p.nickname ? `_(${sanitizeFilename(p.nickname)})` : '';
    const filename = `${String(i + 1).padStart(2, '0')}_[Cat_${cat}]_${safeName}${safeNick}_Card.jpg`;
    const filePath = path.join(targetDir, filename);

    console.log(`[${i + 1}/${appData.players.length}] Rendering card: ${filename}`);

    let photoBase64 = '';
    if (p.photoUrl) {
      photoBase64 = await fetchImageAsBase64(p.photoUrl);
    }

    const html = getPlayerCardHtml(p, photoBase64);
    await page.setContent(html, { waitUntil: 'load' });
    await page.screenshot({ path: filePath, type: 'jpeg', quality: 95 });
  }

  // 4. Generate Team Cards
  console.log(`\nGenerating visual cards for ${appData.teams.length} teams...`);
  for (let j = 0; j < appData.teams.length; j++) {
    const t = appData.teams[j];
    const safeTeamName = sanitizeFilename(t.name);
    const filename = `${String(j + 1).padStart(2, '0')}_${safeTeamName}_Team_Card.jpg`;
    const filePath = path.join(teamCardsDir, filename);

    console.log(`[${j + 1}/${appData.teams.length}] Rendering team card: ${filename}`);

    let logoBase64 = '';
    if (t.logoUrl) {
      logoBase64 = await fetchImageAsBase64(t.logoUrl);
    }

    const html = getTeamCardHtml(t, logoBase64);
    await page.setContent(html, { waitUntil: 'load' });
    await page.screenshot({ path: filePath, type: 'jpeg', quality: 95 });
  }

  await browser.close();
  await pool.end();

  console.log('\n✅ All Visual Profile Cards generated successfully!');
  console.log(`Cards location: ${cardsDir}`);
}

runCardGenerator().catch(console.error);
