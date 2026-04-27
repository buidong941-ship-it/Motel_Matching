const express = require('express');
const router = express.Router();
const db = require('../db');

// ============================================================
// GET /api/conversations?user_id=5
// Lấy danh sách hội thoại của user (dùng cho dropdown chat)
// Trả về: [{ conversation_id, contact_id, contact_name, contact_avatar, last_message, last_message_time, unread_count }]
// ============================================================
router.get('/conversations', async (req, res) => {
    const { user_id } = req.query;

    if (!user_id) {
        return res.status(400).json({ error: 'Thiếu user_id' });
    }

    try {
        const [rows] = await db.query(`
            SELECT
                conv.id                 AS conversation_id,
                contact.id              AS contact_id,
                contact.fullname        AS contact_name,
                contact.avatar          AS contact_avatar,
                last_msg.content        AS last_message,
                last_msg.created_at     AS last_message_time,
                COUNT(unread.id)        AS unread_count
            FROM Conversations conv

            -- Tìm bản ghi participant của chính mình
            JOIN ConversationParticipants me
                ON me.conversation_id = conv.id AND me.user_id = ?

            -- Tìm người kia trong cuộc hội thoại
            JOIN ConversationParticipants other
                ON other.conversation_id = conv.id AND other.user_id != ?

            JOIN Users contact ON contact.id = other.user_id

            -- Lấy tin nhắn cuối cùng
            LEFT JOIN Messages last_msg
                ON last_msg.id = (
                    SELECT id FROM Messages
                    WHERE conversation_id = conv.id
                    ORDER BY created_at DESC
                    LIMIT 1
                )

            -- Đếm tin nhắn chưa đọc (do người kia gửi)
            LEFT JOIN Messages unread
                ON  unread.conversation_id = conv.id
                AND unread.sender_id != ?
                AND unread.is_read = FALSE

            GROUP BY
                conv.id,
                contact.id,
                contact.fullname,
                contact.avatar,
                last_msg.content,
                last_msg.created_at

            ORDER BY last_msg.created_at DESC
        `, [user_id, user_id, user_id]);

        res.json(rows);
    } catch (err) {
        console.error('[GET /conversations]', err);
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// ============================================================
// GET /api/messages?user_id=5&contact_id=2
// Lấy lịch sử tin nhắn giữa 2 người (50 tin nhắn mới nhất)
// Đồng thời đánh dấu các tin nhắn chưa đọc là đã đọc
// ============================================================
router.get('/messages', async (req, res) => {
    const { user_id, contact_id } = req.query;

    if (!user_id || !contact_id) {
        return res.status(400).json({ error: 'Thiếu user_id hoặc contact_id' });
    }

    try {
        // Tìm conversation chứa đúng 2 người này
        const [[conv]] = await db.query(`
            SELECT cp1.conversation_id
            FROM ConversationParticipants cp1
            JOIN ConversationParticipants cp2
                ON cp1.conversation_id = cp2.conversation_id
            WHERE cp1.user_id = ? AND cp2.user_id = ?
            LIMIT 1
        `, [user_id, contact_id]);

        // Nếu chưa có cuộc hội thoại → trả về mảng rỗng
        if (!conv) {
            return res.json([]);
        }

        const conversationId = conv.conversation_id;

        // Đánh dấu đã đọc các tin nhắn do contact gửi
        await db.query(`
            UPDATE Messages
            SET is_read = TRUE
            WHERE conversation_id = ? AND sender_id = ? AND is_read = FALSE
        `, [conversationId, contact_id]);

        // Lấy 50 tin nhắn mới nhất (sắp xếp cũ → mới để hiển thị đúng thứ tự)
        const [messages] = await db.query(`
            SELECT
                m.id,
                m.sender_id,
                m.content,
                m.is_read,
                m.created_at
            FROM Messages m
            WHERE m.conversation_id = ?
            ORDER BY m.created_at ASC
            LIMIT 50
        `, [conversationId]);

        res.json(messages);
    } catch (err) {
        console.error('[GET /messages]', err);
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// ============================================================
// POST /api/messages
// Gửi tin nhắn mới
// Body: { user_id, contact_id, content }
// Tự động tạo Conversation nếu chưa tồn tại
// ============================================================
router.post('/messages', async (req, res) => {
    const { user_id, contact_id, content } = req.body;

    if (!user_id || !contact_id || !content?.trim()) {
        return res.status(400).json({ error: 'Thiếu dữ liệu' });
    }

    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        // 1. Tìm conversation đã tồn tại giữa 2 người
        const [[existing]] = await conn.query(`
            SELECT cp1.conversation_id
            FROM ConversationParticipants cp1
            JOIN ConversationParticipants cp2
                ON cp1.conversation_id = cp2.conversation_id
            WHERE cp1.user_id = ? AND cp2.user_id = ?
            LIMIT 1
        `, [user_id, contact_id]);

        let conversationId;

        if (existing) {
            conversationId = existing.conversation_id;
        } else {
            // 2. Tạo Conversation mới (không gắn post_id cụ thể)
            const [convResult] = await conn.query(`
                INSERT INTO Conversations (post_id) VALUES (NULL)
            `);
            conversationId = convResult.insertId;

            // 3. Thêm 2 participants
            await conn.query(`
                INSERT INTO ConversationParticipants (conversation_id, user_id)
                VALUES (?, ?), (?, ?)
            `, [conversationId, user_id, conversationId, contact_id]);
        }

        // 4. Lưu tin nhắn
        const [msgResult] = await conn.query(`
            INSERT INTO Messages (conversation_id, sender_id, content)
            VALUES (?, ?, ?)
        `, [conversationId, user_id, content.trim()]);

        // 5. Tạo notification cho người nhận
        await conn.query(`
            INSERT INTO Notifications (user_id, sender_id, type, message)
            VALUES (?, ?, 'message', ?)
        `, [contact_id, user_id, content.trim().substring(0, 100)]);

        await conn.commit();

        res.status(201).json({
            id: msgResult.insertId,
            conversation_id: conversationId,
            sender_id: parseInt(user_id),
            content: content.trim(),
            is_read: false,
            created_at: new Date()
        });
    } catch (err) {
        await conn.rollback();
        console.error('[POST /messages]', err);
        res.status(500).json({ error: 'Lỗi server' });
    } finally {
        conn.release();
    }
});

// ============================================================
// GET /api/messages/unread-count?user_id=5
// Tổng số tin nhắn chưa đọc (dùng cho badge icon chat)
// ============================================================
router.get('/messages/unread-count', async (req, res) => {
    const { user_id } = req.query;

    if (!user_id) {
        return res.status(400).json({ error: 'Thiếu user_id' });
    }

    try {
        const [[{ count }]] = await db.query(`
            SELECT COUNT(*) AS count
            FROM Messages m
            JOIN ConversationParticipants cp
                ON cp.conversation_id = m.conversation_id AND cp.user_id = ?
            WHERE m.sender_id != ? AND m.is_read = FALSE
        `, [user_id, user_id]);

        res.json({ count });
    } catch (err) {
        console.error('[GET /messages/unread-count]', err);
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// ============================================================
// PATCH /api/messages/read-all?user_id=5&contact_id=2
// Đánh dấu toàn bộ tin nhắn trong 1 cuộc trò chuyện là đã đọc
// ============================================================
router.patch('/messages/read-all', async (req, res) => {
    const { user_id, contact_id } = req.query;

    if (!user_id || !contact_id) {
        return res.status(400).json({ error: 'Thiếu user_id hoặc contact_id' });
    }

    try {
        const [[conv]] = await db.query(`
            SELECT cp1.conversation_id
            FROM ConversationParticipants cp1
            JOIN ConversationParticipants cp2
                ON cp1.conversation_id = cp2.conversation_id
            WHERE cp1.user_id = ? AND cp2.user_id = ?
            LIMIT 1
        `, [user_id, contact_id]);

        if (!conv) {
            return res.json({ success: true, updated: 0 });
        }

        const [result] = await db.query(`
            UPDATE Messages
            SET is_read = TRUE
            WHERE conversation_id = ? AND sender_id = ? AND is_read = FALSE
        `, [conv.conversation_id, contact_id]);

        res.json({ success: true, updated: result.affectedRows });
    } catch (err) {
        console.error('[PATCH /messages/read-all]', err);
        res.status(500).json({ error: 'Lỗi server' });
    }
});

module.exports = router;
