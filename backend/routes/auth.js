const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const pool = require('../db');

// --- API ĐĂNG NHẬP ---
router.post('/login', async (req, res) => {
    // Frontend của bạn gửi 'username', ta sẽ map nó với cột 'login_name' trong CSDL
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: "Vui lòng nhập đầy đủ tài khoản và mật khẩu!" });
    }

    try {
        const [rows] = await pool.execute(
            'SELECT id, login_name, password, role FROM Users WHERE login_name = ?',
            [username]
        );

        if (rows.length === 0) {
            return res.status(401).json({ error: "Tài khoản không tồn tại!" });
        }

        const user = rows[0];
        // So sánh mật khẩu băm
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ error: "Sai mật khẩu!" });
        }

        // Trả về role để frontend điều hướng (Admin / User)
        res.status(200).json({ 
            message: "Đăng nhập thành công!",
            userId: user.id,
            username: user.login_name,
            role: user.role
        });

    } catch (error) {
        console.error("Lỗi server (Login):", error);
        res.status(500).json({ error: "Lỗi hệ thống từ server." });
    }
});

// --- API QUÊN / ĐỔI MẬT KHẨU ---
router.post('/forgot-password', async (req, res) => {
    // Lấy thêm email theo đúng CSDL chuẩn mới
    const { username, email, phone, new_password } = req.body;

    if (!username || !email || !phone || !new_password) {
        return res.status(400).json({ error: "Vui lòng cung cấp đủ thông tin xác thực!" });
    }

    try {
        const [rows] = await pool.execute(
            'SELECT id FROM Users WHERE login_name = ? AND email = ? AND phone = ?',
            [username, email, phone]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: "Thông tin xác minh không chính xác!" });
        }

        const saltRounds = 10; 
        const hashedPassword = await bcrypt.hash(new_password, saltRounds);

        // Update vào cột password
        await pool.execute(
            'UPDATE Users SET password = ? WHERE login_name = ? AND email = ? AND phone = ?',
            [hashedPassword, username, email, phone]
        );

        res.status(200).json({ message: "Đổi mật khẩu thành công! Hãy đăng nhập bằng mật khẩu mới." });

    } catch (error) {
        console.error("Lỗi server (Forgot Password):", error);
        res.status(500).json({ error: "Lỗi hệ thống từ server." });
    }
});

// --- API ĐĂNG KÝ TÀI KHOẢN ---
router.post('/register', async (req, res) => {
    // Lấy đủ trường từ frontend
    const { fullname, username, email, CCCD, birthday, phone, password } = req.body;

    if (!fullname || !username || !email || !CCCD || !birthday || !phone || !password) {
        return res.status(400).json({ error: "Vui lòng nhập đầy đủ thông tin!" });
    }

    try {
        // Kiểm tra xem tên đăng nhập HOẶC email đã tồn tại chưa
        const [existingUsers] = await pool.execute(
            'SELECT id FROM Users WHERE login_name = ? OR email = ?',
            [username, email]
        );

        if (existingUsers.length > 0) {
            return res.status(409).json({ error: "Tên đăng nhập hoặc Email này đã có người sử dụng!" });
        }

        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Lưu bản ghi chuẩn
        await pool.execute(
            'INSERT INTO Users (fullname, login_name, email, password, phone, CCCD, birthday) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [fullname, username, email, hashedPassword, phone, CCCD, birthday]
        );

        res.status(201).json({ message: "Đăng ký tài khoản thành công!" });

    } catch (error) {
        console.error("Lỗi server (Register):", error);
        res.status(500).json({ error: "Lỗi hệ thống từ server." });
    }
});

module.exports = router;
