// ===== POSTS_DETAIL ROUTE =====
// Các API endpoint cho trang chi tiết bài đăng

const express = require('express');
const router = express.Router();
const pool = require('../db');

// ─── GET /api/posts/:id ───────────────────────────────────────────────────────
// Lấy thông tin chi tiết 1 bài đăng (gộp RoomDetails hoặc RoommateDetails)
router.get('/posts/:id', async (req, res) => {
    const postId = req.params.id;
    try {
        // Lấy bài đăng + thông tin tác giả + ảnh đầu tiên
        const [rows] = await pool.query(
            `SELECT p.id, p.title, p.content, p.post_type, p.status, p.created_at,
                    u.id AS user_id, u.fullname, u.avatar, u.phone,
                    rd.price, rd.area, rd.address, rd.city, rd.district, rd.is_available,
                    rm.budget, rm.preferred_location, rm.gender_preference, rm.description AS roommate_desc,
                    (SELECT image_url FROM Images WHERE post_id = p.id LIMIT 1) AS thumbnail
             FROM Posts p
             LEFT JOIN Users u ON u.id = p.user_id
             LEFT JOIN RoomDetails rd ON rd.post_id = p.id
             LEFT JOIN RoommateDetails rm ON rm.post_id = p.id
             WHERE p.id = ? AND p.status = 'approved'`,
            [postId]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Bài đăng không tồn tại hoặc chưa được duyệt.' });
        }

        res.json(rows[0]);
    } catch (err) {
        console.error('Lỗi GET /api/posts/:id', err);
        res.status(500).json({ error: 'Lỗi server.' });
    }
});

// ─── GET /api/posts/:id/images ────────────────────────────────────────────────
// Lấy tất cả ảnh của bài đăng
router.get('/posts/:id/images', async (req, res) => {
    const postId = req.params.id;
    try {
        const [images] = await pool.query(
            'SELECT id, image_url FROM Images WHERE post_id = ? ORDER BY id ASC',
            [postId]
        );
        res.json(images);
    } catch (err) {
        console.error('Lỗi GET /api/posts/:id/images', err);
        res.status(500).json({ error: 'Lỗi server.' });
    }
});

// ─── GET /api/posts/:id/comments ─────────────────────────────────────────────
// Lấy danh sách bình luận của bài đăng
router.get('/posts/:id/comments', async (req, res) => {
    const postId = req.params.id;
    try {
        const [comments] = await pool.query(
            `SELECT c.id, c.content, c.created_at,
                    u.id AS user_id, u.fullname, u.avatar
             FROM Comments c
             LEFT JOIN Users u ON u.id = c.user_id
             WHERE c.post_id = ?
             ORDER BY c.created_at ASC`,
            [postId]
        );
        res.json(comments);
    } catch (err) {
        console.error('Lỗi GET /api/posts/:id/comments', err);
        res.status(500).json({ error: 'Lỗi server.' });
    }
});

// ─── POST /api/posts/:id/comments ────────────────────────────────────────────
// Đăng bình luận mới (yêu cầu đăng nhập)
router.post('/posts/:id/comments', async (req, res) => {
    const postId = req.params.id;
    const { user_id, content } = req.body;

    if (!user_id || !content || content.trim() === '') {
        return res.status(400).json({ error: 'Thiếu thông tin bình luận.' });
    }

    try {
        const [result] = await pool.query(
            'INSERT INTO Comments (post_id, user_id, content) VALUES (?, ?, ?)',
            [postId, user_id, content.trim()]
        );

        // Lấy lại comment vừa tạo (kèm thông tin user)
        const [newComment] = await pool.query(
            `SELECT c.id, c.content, c.created_at,
                    u.id AS user_id, u.fullname, u.avatar
             FROM Comments c
             LEFT JOIN Users u ON u.id = c.user_id
             WHERE c.id = ?`,
            [result.insertId]
        );

        // Tạo notification cho chủ bài đăng (nếu không phải tự comment vào bài mình)
        const [postOwner] = await pool.query(
            'SELECT user_id FROM Posts WHERE id = ?',
            [postId]
        );
        if (postOwner.length > 0 && postOwner[0].user_id !== user_id) {
            await pool.query(
                `INSERT INTO Notifications (user_id, sender_id, post_id, type, message)
                 VALUES (?, ?, ?, 'comment', ?)`,
                [postOwner[0].user_id, user_id, postId, 'Ai đó đã bình luận vào bài đăng của bạn.']
            );
        }

        res.status(201).json(newComment[0]);
    } catch (err) {
        console.error('Lỗi POST /api/posts/:id/comments', err);
        res.status(500).json({ error: 'Lỗi server.' });
    }
});

// ─── POST /api/posts/:id/contact ─────────────────────────────────────────────
// Liên hệ chủ bài đăng → tạo/lấy conversation rồi trả về conversation_id
router.post('/posts/:id/contact', async (req, res) => {
    const postId = req.params.id;
    const { requester_id } = req.body;

    if (!requester_id) {
        return res.status(400).json({ error: 'Bạn cần đăng nhập để liên hệ.' });
    }

    try {
        // Lấy owner của bài đăng
        const [postRows] = await pool.query(
            'SELECT user_id FROM Posts WHERE id = ?',
            [postId]
        );
        if (postRows.length === 0) {
            return res.status(404).json({ error: 'Bài đăng không tồn tại.' });
        }

        const ownerId = postRows[0].user_id;

        if (ownerId === requester_id) {
            return res.status(400).json({ error: 'Bạn không thể liên hệ chính mình.' });
        }

        // Kiểm tra conversation đã tồn tại chưa
        const [existing] = await pool.query(
            `SELECT c.id FROM Conversations c
             JOIN ConversationParticipants cp1 ON cp1.conversation_id = c.id AND cp1.user_id = ?
             JOIN ConversationParticipants cp2 ON cp2.conversation_id = c.id AND cp2.user_id = ?
             WHERE c.post_id = ?
             LIMIT 1`,
            [requester_id, ownerId, postId]
        );

        if (existing.length > 0) {
            return res.json({ conversation_id: existing[0].id });
        }

        // Tạo conversation mới
        const [convResult] = await pool.query(
            'INSERT INTO Conversations (post_id) VALUES (?)',
            [postId]
        );
        const convId = convResult.insertId;

        // Thêm 2 participants
        await pool.query(
            'INSERT INTO ConversationParticipants (conversation_id, user_id) VALUES (?, ?), (?, ?)',
            [convId, requester_id, convId, ownerId]
        );

        res.status(201).json({ conversation_id: convId });
    } catch (err) {
        console.error('Lỗi POST /api/posts/:id/contact', err);
        res.status(500).json({ error: 'Lỗi server.' });
    }
});

module.exports = router;
