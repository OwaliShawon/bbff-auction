const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });
const { Pool } = require('pg');
const fs = require('fs-extra');
const xlsx = require('xlsx');
const io = require('socket.io-client');

async function executeCleanStartAndImport() {
  console.log('--- Starting Clean Auction Start & Player Import ---');

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  let appData;
  const res = await pool.query('SELECT data FROM app_state WHERE id = 1');
  if (res.rows.length > 0 && res.rows[0].data) {
    appData = res.rows[0].data;
    console.log('Loaded state from PostgreSQL DB.');
  } else {
    appData = await fs.readJson(path.join(__dirname, 'db.json'));
    console.log('Loaded state from db.json.');
  }

  const getDriveId = (url) => {
    if (!url) return '';
    const m = url.match(/id=([a-zA-Z0-9_-]+)/) || url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    return m ? m[1] : '';
  };

  const basePriceMap = { 'A': 15000, 'B': 10000, 'C': 5000 };
  const deptMap = { 'Defender': 'Def', 'Midfielder': 'Mid', 'Forward': 'FW', 'Goalkeeper': 'GK' };

  const normalizeJersey = (j) => {
    if (j === undefined || j === null) return undefined;
    const str = String(j).trim();
    if (str.includes('(XL)') || str.toLowerCase() === 'xl') return 'XL';
    if (str.includes('(L)') || str.toLowerCase() === 'l') return 'L';
    if (str.includes('(M)') || str.toLowerCase() === 'm') return 'M';
    if (str.includes('(S)') || str.toLowerCase() === 's') return 'S';
    return str;
  };

  const existingDriveIds = new Set();
  const existingCleanNames = new Set();

  appData.players.forEach(p => {
    const driveId = getDriveId(p.photoUrl);
    if (driveId) existingDriveIds.add(driveId);
    if (p.name) existingCleanNames.add(p.name.trim().toLowerCase().replace(/[^a-z]/g, ''));
  });

  const sheetPath = path.join(__dirname, '../sheet.xlsx');
  const wb = xlsx.readFile(sheetPath);
  const sheetRows = xlsx.utils.sheet_to_json(wb.Sheets['Form Responses 1']);

  const newPlayersAdded = [];

  sheetRows.forEach((r) => {
    const photoUrl = r['Player Profile Photo'] || '';
    const driveId = getDriveId(photoUrl);
    const fullName = String(r['Full Name'] || '').trim();
    const cleanName = fullName.toLowerCase().replace(/[^a-z]/g, '');

    const isExisting = (driveId && existingDriveIds.has(driveId)) || existingCleanNames.has(cleanName);

    if (!isExisting) {
      const cat = String(r['Category'] || 'C').trim().toUpperCase();
      const pos = String(r['Primary Position'] || '').trim();

      const newPlayer = {
        id: crypto.randomUUID(),
        name: fullName,
        nickname: String(r['Nick Name'] || '').trim() || undefined,
        category: cat,
        position: pos,
        department: deptMap[pos] || pos,
        basePrice: basePriceMap[cat] || 5000,
        status: 'UNSOLD',
        jerseyNumber: r['Jersey Number'] !== undefined ? String(r['Jersey Number']).trim() : undefined,
        jerseySize: normalizeJersey(r['Jersey Size']),
        photoUrl: driveId ? `https://lh3.googleusercontent.com/d/${driveId}` : undefined,
        auctionRound: 1
      };

      newPlayersAdded.push(newPlayer);
      if (driveId) existingDriveIds.add(driveId);
      existingCleanNames.add(cleanName);
    }
  });

  console.log(`New players to add: ${newPlayersAdded.length}`);

  // Add new players to appData
  appData.players = [...appData.players, ...newPlayersAdded];

  // Reset all players status to UNSOLD (except MANAGER status)
  console.log('Resetting all players status to UNSOLD (except MANAGER status)...');
  let resetPlayerCount = 0;
  appData.players = appData.players.map(p => {
    if (p.status !== 'MANAGER') {
      resetPlayerCount++;
      return {
        ...p,
        status: 'UNSOLD',
        soldPrice: undefined,
        teamId: undefined,
        auctionRound: 1
      };
    }
    return p;
  });

  // Verify MD Shohel and Emamul Haque Hridoy
  const mdShohel = appData.players.find(p => p.name.toLowerCase().includes('shohel'));
  const emamul = appData.players.find(p => p.name.toLowerCase().includes('emamul'));

  console.log('MD Shohel status:', mdShohel ? mdShohel.status : 'not found');
  console.log('Emamul Haque Hridoy status:', emamul ? emamul.status : 'not found');

  // Reset Team Budgets
  console.log('Resetting all team budgets...');
  appData.teams = appData.teams.map(team => ({
    ...team,
    remainingBudget: team.initialBudget || 150000
  }));

  // Reset Auction State & Log
  appData.auction = {
    currentPlayerId: null,
    currentBid: 0,
    biddingTeamIds: [],
    isActive: false,
    lastAction: null
  };

  appData.auctionLog = [];

  console.log(`Final Summary:
  - Total Players: ${appData.players.length}
  - Reset Players: ${resetPlayerCount}
  - New Added Players: ${newPlayersAdded.length}
  - Total Teams: ${appData.teams.length}
  - Auction Active: ${appData.auction.isActive}
  - Auction Log Length: ${appData.auctionLog.length}
  `);

  // Save to PostgreSQL DB
  await pool.query(
    `INSERT INTO app_state (id, data, updated_at)
     VALUES (1, $1, NOW())
     ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW();`,
    [JSON.stringify(appData)]
  );
  console.log('✅ Saved updated appState to PostgreSQL database.');

  // Save to db.json
  await fs.writeJson(path.join(__dirname, 'db.json'), appData, { spaces: 2 });
  console.log('✅ Saved updated appState to db.json.');

  await pool.end();

  // Socket update to running dev server
  const PORT = process.env.PORT || 7002;
  const socket = io(`http://localhost:${PORT}`);
  socket.on('connect', () => {
    console.log('Connected to socket server. Broadcasting state update...');
    socket.emit('update_data', appData);
    setTimeout(() => {
      socket.disconnect();
      console.log('✅ Broadcast complete. Exiting script.');
      process.exit(0);
    }, 1000);
  });
  socket.on('connect_error', (err) => {
    console.log('Socket broadcast note:', err.message);
    process.exit(0);
  });
}

executeCleanStartAndImport().catch(err => {
  console.error('Error executing script:', err);
  process.exit(1);
});
