const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

console.log('🚀 Server starting...');

const client = require('../bot/index');

// Middleware - لازم يكون قبل كل شي
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// Logs
app.use((req, res, next) => {
    console.log(`📡 ${req.method} ${req.path} - ${new Date().toLocaleTimeString()}`);
    next();
});

// ========== API Routes - لازم تكون قبل static ==========
app.get('/api/status', (req, res) => {
    try {
        res.json(client.getBotStatus());
    } catch (err) {
        res.json({ isRunning: false, ping: 0, guilds: 0, users: 0, commands: 0 });
    }
});

app.get('/api/commands', (req, res) => {
    try {
        res.json(client.getBotCommands());
    } catch (err) {
        res.json([]);
    }
});

app.post('/api/start', async (req, res) => {
    console.log('🚀 /api/start called');
    console.log('📨 Request body:', req.body);
    
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

// Music API
app.post('/api/music/play', (req, res) => {
    res.json({ success: true, message: 'Use !play in Discord' });
});

app.post('/api/music/stop', (req, res) => {
    res.json({ success: true, message: 'Use !stop in Discord' });
});

app.post('/api/music/skip', (req, res) => {
    res.json({ success: true, message: 'Use !skip in Discord' });
});

app.get('/api/music/queue', (req, res) => {
    res.json({ queue: [] });
});

// ========== Static Files - لازم تكون بعد API ==========
app.use(express.static(path.join(__dirname, '..', 'public')));

// صفحة رئيسية
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// معالجة الأخطاء
app.use((err, req, res, next) => {
    console.error('Express error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🌐 Dashboard running on port ${PORT}`);
});
