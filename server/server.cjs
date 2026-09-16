
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const fs = require('fs-extra');
const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;

const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const PORT = Number(process.env.PORT) || 7002;
const DB_FILE = path.join(__dirname, 'db.json');
const DIST_DIR = path.join(__dirname, '../dist');

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public'))); // Serve public files
if (fs.existsSync(DIST_DIR)) {
    app.use(express.static(DIST_DIR));
}

const xlsx = require('xlsx');

const generateTeamPin = () => Math.floor(1000 + Math.random() * 9000).toString();

const DEFAULT_SEASON_ID = 'season-1-2026';
const DEFAULT_SEASON = {
    id: 'season-1-2026',
    name: 'Season 1 - 2026',
    year: 2026,
    isArchived: false,
    createdAt: 1773600000000
};

// Initial Data Structure
const INITIAL_DATA = {
    currentSeasonId: DEFAULT_SEASON_ID,
    seasons: [
        {
            ...DEFAULT_SEASON,
            players: [],
            teams: [],
            auction: { currentPlayerId: null, currentBid: 0, biddingTeamIds: [], isActive: false },
            auctionLog: []
        }
    ],
    players: [],
    teams: [],
    auction: {
        currentPlayerId: null,
        currentBid: 0,
        biddingTeamIds: [],
        isActive: false
    },
    auctionLog: []
};

function normalizeAppData(data) {
    if (!data) data = {};
    if (!data.seasons || !Array.isArray(data.seasons) || data.seasons.length === 0) {
        data.seasons = [
            {
                ...DEFAULT_SEASON,
                players: data.players || [],
                teams: data.teams || [],
                auction: data.auction || { currentPlayerId: null, currentBid: 0, biddingTeamIds: [], isActive: false },
                auctionLog: data.auctionLog || []
            }
        ];
        data.currentSeasonId = DEFAULT_SEASON_ID;
    }
    if (!data.currentSeasonId) {
        data.currentSeasonId = data.seasons[0].id;
    }

    const currentSeason = data.seasons.find(s => s.id === data.currentSeasonId) || data.seasons[0];
    data.players = currentSeason.players || [];
    data.teams = currentSeason.teams || [];
    data.auction = currentSeason.auction || { currentPlayerId: null, currentBid: 0, biddingTeamIds: [], isActive: false };
    data.auctionLog = currentSeason.auctionLog || [];
    return data;
}

// Load Data
let appData = { ...INITIAL_DATA };

async function initDb() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS app_state (
                id INT PRIMARY KEY,
                data JSONB NOT NULL,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);
    } catch (err) {
        console.error('Error initializing PostgreSQL table:', err.message);
    }
}

async function loadData() {
    await initDb();
    try {
        const res = await pool.query('SELECT data FROM app_state WHERE id = 1');
        if (res.rows.length > 0 && res.rows[0].data) {
            const data = normalizeAppData(res.rows[0].data);
            if (Array.isArray(data.teams)) {
                data.teams = data.teams.map(team => ({
                    ...team,
                    pin: String(team.pin || generateTeamPin()).trim()
                }));
            }
            appData = data;
            console.log('Data loaded successfully from PostgreSQL database (Seasons count: ' + appData.seasons.length + ')');
            await fs.writeJson(DB_FILE, appData, { spaces: 2 });
            return;
        }
    } catch (err) {
        console.error('Error loading data from PostgreSQL:', err.message);
    }

    try {
        if (await fs.pathExists(DB_FILE)) {
            const rawData = await fs.readJson(DB_FILE);
            const data = normalizeAppData(rawData);
            if (Array.isArray(data.teams)) {
                data.teams = data.teams.map(team => ({
                    ...team,
                    pin: String(team.pin || generateTeamPin()).trim()
                }));
            }
            appData = data;
            console.log('Data loaded from disk db.json, migrating to PostgreSQL...');
            await saveData();
        } else {
            // Try to seed from Excel files in public/data
            const playersFile = path.join(__dirname, '../public/data/Players.xlsx');
            const teamsFile = path.join(__dirname, '../public/data/Teams.xlsx');

            let seeded = false;

            // Load photos logic (shared for players and managers)
            const photosDir = path.join(__dirname, '../public/photos');
            let photoFiles = [];
            try {
                if (await fs.pathExists(photosDir)) {
                    photoFiles = await fs.readdir(photosDir);
                }
            } catch (e) {
                console.error("Could not read photos dir", e);
            }

            const findPhotoUrl = (pid) => {
                if (!pid) return undefined;
                const pidStr = String(pid).toLowerCase().trim();
                const match = photoFiles.find(f => {
                    const fLower = f.toLowerCase();
                    if (fLower.startsWith(pidStr + '.')) return true;
                    if (fLower.startsWith('id ' + pidStr + '.')) return true;
                    return false;
                });
                return match ? `/photos/${match}` : undefined;
            };

            if (await fs.pathExists(playersFile)) {
                console.log('Seeding players from Excel...');
                const wb = xlsx.readFile(playersFile);
                const ws = wb.Sheets[wb.SheetNames[0]];
                const data = xlsx.utils.sheet_to_json(ws);

                if (data.length > 0) {
                    console.log("DEBUG: First Player Row:", JSON.stringify(data[0], null, 2));
                }

                appData.players = data.map(item => {
                    const pid = item['Photo ID'] || item['ID'];
                    return {
                        id: crypto.randomUUID(),
                        name: String(item['Full Name'] || item['Name'] || item['Player Name']).trim(),
                        department: String(item['Dept Name (Office)'] || item['Dept'] || item['Department']).trim(),
                        position: String(item['Primary Playing Position'] || item['Position']).trim(),
                        category: String(item['Category']).trim(),
                        basePrice: item['Category'] === 'A' ? 15000 : item['Category'] === 'B' ? 10000 : 5000,
                        status: 'UNSOLD', // Default
                        photoId: pid,
                        photoUrl: findPhotoUrl(pid)
                    };
                });
                seeded = true;
            }

            if (await fs.pathExists(teamsFile)) {
                console.log('Seeding teams from Excel...');
                const wb = xlsx.readFile(teamsFile);
                const ws = wb.Sheets[wb.SheetNames[0]];
                const data = xlsx.utils.sheet_to_json(ws);

                if (data.length > 0) {
                    console.log("DEBUG: First Team Row:", JSON.stringify(data[0], null, 2));
                }

                const teams = [];
                const managers = [];

                data.forEach(item => {
                    const teamId = crypto.randomUUID();
                    const managerName = String(item['Manager Name'] || item['Owner Name'] || item['Manager'] || item['Owner']).trim();

                    teams.push({
                        id: teamId,
                        name: String(item['Team Name'] || item['Name']).trim(),
                        manager: managerName,
                        pin: String(item['Team PIN'] || item['PIN'] || generateTeamPin()).trim(),
                        initialBudget: Number(item['Budget'] || 130000),
                        remainingBudget: Number(item['Budget'] || 130000)
                    });

                    // Create Manager Player Object
                    const primaryPos = item['Primary Playing Position'];
                    const secondaryPos = item['Secondary Playing Position'];
                    const position = [primaryPos, secondaryPos].filter(Boolean).join(' / ') || 'Manager';
                    const pid = item['Photo ID'];

                    managers.push({
                        id: crypto.randomUUID(),
                        name: managerName,
                        department: String(item['Dept Name (Office)'] || 'Management').trim(),
                        position: position,
                        category: 'M',
                        basePrice: 0,
                        status: 'MANAGER',
                        photoId: pid,
                        photoUrl: findPhotoUrl(pid),
                        teamId: teamId,
                        soldPrice: 0,
                        auctionRound: 0
                    });
                });

                appData.teams = teams;
                appData.players = [...appData.players, ...managers];
                seeded = true;
            }

            if (seeded) {
                console.log(`Seeded ${appData.players.length} players and ${appData.teams.length} teams.`);
                await saveData();
            } else {
                await saveData();
            }
        }
    } catch (err) {
        console.error('Error loading data:', err);
    }
}

async function saveData() {
    try {
        await fs.writeJson(DB_FILE, appData, { spaces: 2 });
    } catch (err) {
        console.error('Error saving data to disk db.json:', err);
    }

    try {
        await pool.query(
            `INSERT INTO app_state (id, data, updated_at)
             VALUES (1, $1, NOW())
             ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW();`,
            [JSON.stringify(appData)]
        );
        console.log('Data saved to PostgreSQL database');
    } catch (err) {
        console.error('Error saving data to PostgreSQL database:', err.message);
    }
}


// Socket.IO
io.on('connection', (socket) => {
    const timestamp = new Date().toLocaleString("en-US", { timeZone: "Asia/Dhaka" });
    const clientIp = socket.handshake.address;
    const userAgent = socket.handshake.headers['user-agent'];
    const activeSessions = io.engine.clientsCount;

    console.log(`[${timestamp}] New Connection Details:
    - Socket ID: ${socket.id}
    - Remote IP: ${clientIp}
    - User Agent: ${userAgent}
    - Total Active Sessions: ${activeSessions}
    `);

    // Send current state to new client
    socket.emit('init_state', appData);

    socket.on('update_data', async (newData) => {
        if (newData.seasons) appData.seasons = newData.seasons;
        if (newData.currentSeasonId) appData.currentSeasonId = newData.currentSeasonId;
        if (newData.players) appData.players = newData.players;
        if (newData.teams) appData.teams = newData.teams;
        if (newData.auction) appData.auction = newData.auction;
        if (newData.auctionLog) appData.auctionLog = newData.auctionLog;

        // Keep current season synced in seasons array
        if (appData.seasons && appData.currentSeasonId) {
            const idx = appData.seasons.findIndex(s => s.id === appData.currentSeasonId);
            if (idx !== -1) {
                appData.seasons[idx] = {
                    ...appData.seasons[idx],
                    players: appData.players,
                    teams: appData.teams,
                    auction: appData.auction,
                    auctionLog: appData.auctionLog
                };
            }
        }

        await saveData();
        io.emit('state_update', appData);
    });

    // Specific event for clearer intent if needed
    socket.on('bid_update', async (auctionState) => {
        appData.auction = auctionState;
        await saveData();
        io.emit('state_update', appData); // Broadcast full state to keep sync
    });

    socket.on('disconnect', (reason) => {
        const timestamp = new Date().toLocaleString("en-US", { timeZone: "Asia/Dhaka" });
        const activeSessions = io.engine.clientsCount;

        console.log(`[${timestamp}] Disconnection Details:
        - Socket ID: ${socket.id}
        - Reason: ${reason}
        - Remaining Active Sessions: ${activeSessions}
        `);
    });
});

const archiver = require('archiver');

app.get('/api/export-facebook', async (req, res) => {
    const zipPath = path.join(__dirname, '../facebook_exports.zip');
    const exportFolder = path.join(__dirname, '../facebook_exports');

    if (fs.existsSync(zipPath)) {
        return res.download(zipPath, 'BBFF_Auction_Facebook_Exports.zip');
    }

    if (fs.existsSync(exportFolder)) {
        res.attachment('BBFF_Auction_Facebook_Exports.zip');
        const archive = archiver('zip', { zlib: { level: 9 } });

        archive.on('error', (err) => {
            console.error('Archiver error:', err);
            if (!res.headersSent) res.status(500).send({ error: err.message });
        });

        archive.pipe(res);
        archive.directory(exportFolder, false);
        return archive.finalize();
    }

    res.status(404).json({ error: 'Export files not found.' });
});

app.get('/api/files', async (req, res) => {
    // List files in public/data
    try {
        const dataDir = path.join(__dirname, '../public/data');
        await fs.ensureDir(dataDir);
        const files = await fs.readdir(dataDir);
        res.json({ files });
    } catch (e) {
        res.status(500).json({ error: e.toString() });
    }
});

app.get(/.*/, (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
        return next();
    }

    const indexPath = path.join(DIST_DIR, 'index.html');
    if (fs.existsSync(indexPath)) {
        return res.sendFile(indexPath);
    }

    return next();
});

loadData().then(() => {
    server.listen(PORT, '0.0.0.0', () => {
        console.log(`Server running on port ${PORT}`);
    });
});
