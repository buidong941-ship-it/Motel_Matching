const express = require('express');
const cors = require('cors'); 

const app = express();
const port = 3000;
const pool = require('./db');

// Middleware
app.use(cors());
app.use(express.json());

// ===== MOUNT ROUTES =====
const authRoutes = require('./routes/auth');
const notificationRoutes = require('./routes/notifications');

app.use('/api', authRoutes);                    // /api/login, /api/register, /api/forgot-password
app.use('/api/notifications', notificationRoutes); // /api/notifications/...

// ===== KHỞI ĐỘNG SERVER =====
app.listen(port, () => {
    console.log(`Server Node.js đang chạy tại http://127.0.0.1:${port}`);
});

process.on('SIGINT', async () => {
    console.log('Đang shutdown...');
    await pool.end(); // đóng MySQL pool
    process.exit(0);
});