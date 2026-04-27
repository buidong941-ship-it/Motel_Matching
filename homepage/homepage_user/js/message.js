// ==========================================
// BIẾN TOÀN CỤC
// ==========================================
let currentActiveContactId = null;
let currentContactName = null;

// ==========================================
// 1. LOAD BADGE TIN NHẮN CHƯA ĐỌC KHI MỞ TRANG
// ==========================================

async function loadMessageBadge() {
    const userId = localStorage.getItem('userId');
    if (!userId) return;

    try {
        const res = await fetch(`/api/messages/unread-count?user_id=${userId}`);
        const data = await res.json();
        const badge = document.getElementById('message-badge');
        if (badge) {
            badge.textContent = data.count > 0 ? data.count : '';
            badge.style.display = data.count > 0 ? 'flex' : 'none';
        }
    } catch {
        // Không làm gì nếu API chưa sẵn sàng
    }
}

// ==========================================
// 2. XỬ LÝ DROPDOWN DANH SÁCH HỘI THOẠI
// ==========================================

function toggleMessagePanel(event) {
    event.stopPropagation();

    const notifPanel = document.getElementById('notificationPanel');
    if (notifPanel && notifPanel.classList.contains('show')) {
        notifPanel.classList.remove('show');
    }

    const panel = document.getElementById('messagePanel');
    panel.classList.toggle('show');

    if (panel.classList.contains('show')) {
        loadConversations();
    }
}

async function loadConversations() {
    const userId = localStorage.getItem('userId');
    const list = document.getElementById('conversation-list');
    list.innerHTML = '<div class="notif-empty">Đang tải...</div>';

    try {
        const res = await fetch(`/api/conversations?user_id=${userId}`);
        if (!res.ok) throw new Error('API error');
        const data = await res.json();

        if (data.length === 0) {
            list.innerHTML = '<div class="notif-empty">Chưa có cuộc trò chuyện nào</div>';
            return;
        }

        list.innerHTML = data.map(conv => `
            <div class="conversation-item ${conv.unread_count > 0 ? 'unread' : ''}"
                 onclick="openChatPopup(event, ${conv.contact_id}, '${escapeHtml(conv.contact_name)}', '${conv.contact_avatar || ''}')">
                <img class="conversation-avatar"
                     src="${conv.contact_avatar || 'https://via.placeholder.com/48'}"
                     alt="${escapeHtml(conv.contact_name)}" />
                <div class="conversation-info">
                    <div class="conversation-name">${escapeHtml(conv.contact_name)}</div>
                    <div class="conversation-preview">${escapeHtml(conv.last_message || '')}</div>
                </div>
                ${conv.unread_count > 0 ? `<span class="conv-unread-badge">${conv.unread_count}</span>` : ''}
            </div>
        `).join('');

    } catch {
        // Fallback mock data khi chưa có server
        list.innerHTML = `
            <div class="conversation-item unread" onclick="openChatPopup(event, 2, 'Trần Cảnh (Chủ trọ)', 'https://via.placeholder.com/48')">
                <img class="conversation-avatar" src="https://via.placeholder.com/48" />
                <div class="conversation-info">
                    <div class="conversation-name">Trần Cảnh (Chủ trọ)</div>
                    <div class="conversation-preview">Phòng vẫn còn nhé bạn!</div>
                </div>
            </div>
            <div class="conversation-item" onclick="openChatPopup(event, 3, 'Nguyễn Văn A (Bạn ghép)', 'https://via.placeholder.com/48')">
                <img class="conversation-avatar" src="https://via.placeholder.com/48" />
                <div class="conversation-info">
                    <div class="conversation-name">Nguyễn Văn A (Bạn ghép)</div>
                    <div class="conversation-preview">Ok chốt cuối tuần dọn qua nhé.</div>
                </div>
            </div>
        `;
    }
}

// ==========================================
// 3. XỬ LÝ POPUP CHAT Ở GÓC MÀN HÌNH
// ==========================================

function openChatPopup(event, contactId, contactName, contactAvatar) {
    event.stopPropagation();

    document.getElementById('messagePanel').classList.remove('show');

    currentActiveContactId = contactId;
    currentContactName = contactName;

    document.getElementById('chatName').textContent = contactName;
    document.getElementById('chatAvatar').src = contactAvatar || 'https://via.placeholder.com/36';

    const popup = document.getElementById('messagePopup');
    popup.classList.add('show');

    loadMessagesForContact(contactId);
    document.getElementById('messageInput').focus();
}

function closeChatPopup() {
    document.getElementById('messagePopup').classList.remove('show');
    currentActiveContactId = null;
    currentContactName = null;
}

async function loadMessagesForContact(contactId) {
    const userId = localStorage.getItem('userId');
    const body = document.getElementById('messageBody');
    body.innerHTML = '<div style="text-align:center;color:#aaa;font-size:13px;padding:20px">Đang tải...</div>';

    try {
        const res = await fetch(`/api/messages?user_id=${userId}&contact_id=${contactId}`);
        if (!res.ok) throw new Error('API error');
        const data = await res.json();

        if (data.length === 0) {
            body.innerHTML = '<div style="text-align:center;color:#aaa;font-size:13px;padding:20px">Chưa có tin nhắn nào. Hãy bắt đầu cuộc trò chuyện!</div>';
        } else {
            body.innerHTML = data.map(msg => {
                const isSent = parseInt(msg.sender_id) === parseInt(userId);
                const time = formatTime(msg.created_at);
                return `
                    <div class="message ${isSent ? 'sent' : 'received'}">
                        <p>${escapeHtml(msg.content)}</p>
                        <span class="time">${time}</span>
                    </div>
                `;
            }).join('');
        }

        // Cập nhật badge sau khi đọc tin nhắn
        loadMessageBadge();

    } catch {
        // Fallback mock
        body.innerHTML = `
            <div class="message received">
                <p>Tin nhắn test từ ${escapeHtml(currentContactName || 'người dùng')}</p>
                <span class="time">10:00</span>
            </div>
        `;
    }

    scrollMessageToBottom();
}

// ==========================================
// 4. GỬI TIN NHẮN
// ==========================================

async function sendNewMessage() {
    if (!currentActiveContactId) return;

    const input = document.getElementById('messageInput');
    const text = input.value.trim();
    if (!text) return;

    const userId = localStorage.getItem('userId');
    const body = document.getElementById('messageBody');

    // Hiển thị ngay lập tức (optimistic update)
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    const msgDiv = document.createElement('div');
    msgDiv.className = 'message sent';
    msgDiv.innerHTML = `<p>${escapeHtml(text)}</p><span class="time">${h}:${m}</span>`;
    body.appendChild(msgDiv);
    input.value = '';
    scrollMessageToBottom();

    // Gọi API lưu vào DB
    try {
        const res = await fetch('/api/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: userId,
                contact_id: currentActiveContactId,
                content: text
            })
        });

        if (!res.ok) {
            console.warn('Gửi tin nhắn thất bại, message chỉ hiển thị tạm thời.');
        }
    } catch (err) {
        console.warn('Không thể kết nối server:', err.message);
    }
}

// ==========================================
// 5. TIỆN ÍCH
// ==========================================

function handleEnterMessage(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        sendNewMessage();
    }
}

function scrollMessageToBottom() {
    const body = document.getElementById('messageBody');
    body.scrollTop = body.scrollHeight;
}

/** Format ISO date string → HH:MM */
function formatTime(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Tránh XSS khi render nội dung người dùng */
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// ==========================================
// 6. AVATAR MENU (xem profile / chat đầy đủ)
// ==========================================

function toggleAvatarMenu(event) {
    event.stopPropagation();
    const menu = document.getElementById('avatarMenu');
    menu.classList.toggle('show');
}

function viewFullChat() {
    window.location.href = `./chat.html?contact_id=${currentActiveContactId}&name=${encodeURIComponent(currentContactName)}`;
}

function viewProfile() {
    window.location.href = `./profile.html?user_id=${currentActiveContactId}`;
}

// ==========================================
// 7. CLICK OUTSIDE → ĐÓNG PANEL
// ==========================================

document.addEventListener('click', function (event) {
    const msgPanel = document.getElementById('messagePanel');
    const notifPanel = document.getElementById('notificationPanel');

    if (msgPanel && msgPanel.classList.contains('show') && !event.target.closest('.action-icon[title="Tin nhắn"]')) {
        msgPanel.classList.remove('show');
    }

    if (notifPanel && notifPanel.classList.contains('show') && !event.target.closest('.action-icon[title="Thông báo"]')) {
        notifPanel.classList.remove('show');
    }

    const avatarMenu = document.getElementById('avatarMenu');
    if (avatarMenu && avatarMenu.classList.contains('show') && !event.target.closest('.chat-avatar-container')) {
        avatarMenu.classList.remove('show');
    }
});

// ==========================================
// 8. KHỞI ĐỘNG: load badge khi trang được mở
// ==========================================
document.addEventListener('DOMContentLoaded', loadMessageBadge);