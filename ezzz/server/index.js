const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

const client = require('./bot/index');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
});

// ========== API Routes ==========
app.get('/api/status', (req, res) => {
    try { res.json(client.getBotStatus()); } 
    catch (err) { res.json({ isRunning: false, ping: 0, guilds: 0, users: 0, commands: 0 }); }
});

app.get('/api/commands', (req, res) => {
    try { res.json(client.getBotCommands()); } 
    catch (err) { res.json([]); }
});

app.post('/api/start', async (req, res) => {
    console.log('🚀 /api/start called');
    console.log('📨 Body:', req.body);
    
    try {
        const { token } = req.body;
        if (!token) {
            console.log('❌ Token empty');
            return res.status(400).json({ success: false, message: '❌ التوكن فارغ!' });
        }
        
        console.log('⏳ Starting bot...');
        const result = await client.loginWithToken(token);
        console.log('✅ Result:', result);
        res.json(result);
    } catch (error) {
        console.error('❌ Error:', error);
        res.status(500).json({ success: false, message: '❌ خطأ: ' + error.message });
    }
});

app.post('/api/stop', async (req, res) => {
    console.log('⏹️ /api/stop called');
    try {
        const result = await client.logoutBot();
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, message: '❌ خطأ: ' + error.message });
    }
});

// ========== Static Files ==========
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 404
app.use((req, res) => {
    console.log('❌ 404:', req.path);
    res.status(404).json({ error: 'Not Found', path: req.path });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🌐 Dashboard: http://localhost:${PORT}`);
});
