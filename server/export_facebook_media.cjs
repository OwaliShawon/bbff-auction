const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });
const { Pool } = require('pg');
const fs = require('fs-extra');
const https = require('https');
const http = require('http');

const EXPORT_DIR = path.join(__dirname, '../facebook_exports');

function downloadImage(url, filePath) {
  return new Promise((resolve, reject) => {
    if (url.startsWith('data:image')) {
      // Base64 image
      const base64Data = url.replace(/^data:image\/\w+;base64,/, "");
      fs.writeFile(filePath, base64Data, 'base64', (err) => {
        if (err) reject(err);
        else resolve();
      });
      return;
    }

    const client = url.startsWith('https') ? https : http;
    client.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        if (res.headers.location) {
          return downloadImage(res.headers.location, filePath).then(resolve).catch(reject);
        }
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`Failed to download ${url}, status code: ${res.statusCode}`));
      }
      const fileStream = fs.createWriteStream(filePath);
      res.pipe(fileStream);
      fileStream.on('finish', () => {
        fileStream.close(() => resolve());
      });
    }).on('error', (err) => reject(err));
  });
}

function sanitizeFilename(str) {
  return str.replace(/[^a-zA-Z0-9 _-]/g, '').trim().replace(/\s+/g, '_');
}

async function exportFacebookMedia() {
  console.log('--- Starting Facebook Media Export ---');

  // 1. Fetch data from PG / db.json
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  let appData;
  try {
    const res = await pool.query('SELECT data FROM app_state WHERE id = 1');
    if (res.rows.length > 0 && res.rows[0].data) {
      appData = res.rows[0].data;
      console.log('Loaded data from PostgreSQL DB.');
    }
  } catch (e) {
    console.error('PG load error:', e.message);
  }

  if (!appData) {
    appData = await fs.readJson(path.join(__dirname, 'db.json'));
    console.log('Loaded data from db.json.');
  }

  // 2. Prepare Folders
  const catADir = path.join(EXPORT_DIR, '01_Category_A');
  const catBDir = path.join(EXPORT_DIR, '02_Category_B');
  const catCDir = path.join(EXPORT_DIR, '03_Category_C');
  const teamsDir = path.join(EXPORT_DIR, '04_Teams');

  await fs.emptyDir(EXPORT_DIR);
  await fs.ensureDir(catADir);
  await fs.ensureDir(catBDir);
  await fs.ensureDir(catCDir);
  await fs.ensureDir(teamsDir);

  const captionLines = [
    '==================================================',
    '🏆 BBFF INTRA LEAGUE SEASON 1 - PLAYER & TEAM PROFILES',
    '==================================================\n\n'
  ];

  // 3. Export Players
  let successCount = 0;
  let failCount = 0;

  console.log(`Processing ${appData.players.length} players...`);

  for (let i = 0; i < appData.players.length; i++) {
    const p = appData.players[i];
    const cat = p.category || 'C';
    let targetDir = catCDir;
    if (cat === 'A') targetDir = catADir;
    if (cat === 'B') targetDir = catBDir;

    const safeName = sanitizeFilename(p.name);
    const safeNick = p.nickname ? `_(${sanitizeFilename(p.nickname)})` : '';
    const filename = `${String(i + 1).padStart(2, '0')}_[Cat_${cat}]_${safeName}${safeNick}.jpg`;
    const filePath = path.join(targetDir, filename);

    // Write caption block
    captionLines.push(`--- PLAYER #${i + 1}: ${p.name.toUpperCase()} ---`);
    if (p.nickname) captionLines.push(`• Nickname: ${p.nickname}`);
    captionLines.push(`• Category: Category ${p.category}`);
    captionLines.push(`• Base Price: ৳${(p.basePrice || 0).toLocaleString()} BDT`);
    captionLines.push(`• Position: ${p.position}`);
    if (p.department) captionLines.push(`• Department: ${p.department}`);
    if (p.jerseyNumber) captionLines.push(`• Jersey Number: ${p.jerseyNumber}`);
    if (p.jerseySize) captionLines.push(`• Jersey Size: ${p.jerseySize}`);
    captionLines.push('--------------------------------------------------\n');

    if (p.photoUrl) {
      try {
        await downloadImage(p.photoUrl, filePath);
        successCount++;
        console.log(`[${i + 1}/${appData.players.length}] Saved: ${filename}`);
      } catch (err) {
        failCount++;
        console.error(`[${i + 1}/${appData.players.length}] Failed photo for ${p.name}: ${err.message}`);
      }
    } else {
      console.log(`[${i + 1}/${appData.players.length}] No photo for ${p.name}`);
    }
  }

  // 4. Export Teams
  console.log(`\nProcessing ${appData.teams.length} teams...`);
  captionLines.push('\n==================================================');
  captionLines.push('🛡️ REGISTERED TEAMS');
  captionLines.push('==================================================\n');

  for (let j = 0; j < appData.teams.length; j++) {
    const t = appData.teams[j];
    const safeTeamName = sanitizeFilename(t.name);

    captionLines.push(`--- TEAM #${j + 1}: ${t.name.toUpperCase()} ---`);
    captionLines.push(`• Team Manager: ${t.manager}`);
    captionLines.push(`• Starting Budget: ৳${(t.initialBudget || 150000).toLocaleString()} BDT`);
    captionLines.push('--------------------------------------------------\n');

    if (t.logoUrl) {
      const teamFilename = `${String(j + 1).padStart(2, '0')}_${safeTeamName}_Logo.jpg`;
      const teamFilePath = path.join(teamsDir, teamFilename);
      try {
        await downloadImage(t.logoUrl, teamFilePath);
        console.log(`Saved Team Logo: ${teamFilename}`);
      } catch (e) {
        console.error(`Failed logo for team ${t.name}:`, e.message);
      }
    }
  }

  // Write Facebook Caption Text File
  const captionFilePath = path.join(EXPORT_DIR, 'Facebook_Post_Captions.txt');
  await fs.writeFile(captionFilePath, captionLines.join('\n'), 'utf-8');

  console.log(`\n✅ Facebook Export Complete!`);
  console.log(`- Folder Path: ${EXPORT_DIR}`);
  console.log(`- Downloaded Photos: ${successCount} players`);
  console.log(`- Captions File: ${captionFilePath}`);

  await pool.end();
}

exportFacebookMedia().catch(console.error);
