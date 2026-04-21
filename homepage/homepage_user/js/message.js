// Mở/đóng panel tin nhắn
function toggleNotification(event) {
    event.stopPropagation();
    const panel = document.getElementById("notificationPanel");
    panel.classList.toggle("show");

    if (panel.classList.contains("show")) {
        loadNotifications(); // gọi API khi mở
    }
}

// Gọi API lấy danh sách tin nhan
async function loadNotifications() {
    const userId = localStorage.getItem("userId");
    const list = document.getElementById("mess-list");

    try {
        const res = await fetch(`/api/message?user_id=${userId}`);
        const data = await res.json();

        if (data.length === 0) {
            list.innerHTML = `<div class="notif-empty">Không có thông báo nào</div>`;
            return;
        }

        list.innerHTML = data.map(n => `
            <div class="notif-item ${n.is_read ? '' : 'unread'}" 
                 onclick="handleNotifClick(${n.id}, ${n.post_id})">
                <img class="notif-avatar" 
                     src="${n.sender_avatar || 'https://via.placeholder.com/38'}" />
                <div>
                    <div class="notif-text">${n.message}</div>
                    <div class="notif-time">${timeAgo(n.created_at)}</div>
                </div>
            </div>
        `).join('');

        // Cập nhật badge chính xác từ API
        await loadUnreadCount();

    } catch (err) {
        list.innerHTML = `<div class="notif-empty">Lỗi tải thông báo</div>`;
    }
}

// Click vào thông báo → đánh dấu đọc + chuyển trang
async function handleNotifClick(notifId, postId) {
    await fetch(`/api/notifications/${notifId}/read`, { method: 'PATCH' });
    if (postId) window.location.href = `post_detail.html?id=${postId}`;
}

// Đánh dấu tất cả đã đọc
async function markAllRead() {
    const userId = localStorage.getItem("userId");
    await fetch(`/api/notifications/read-all?user_id=${userId}`, { method: 'PATCH' });
    loadNotifications();
}

// Gọi API đếm số thông báo chưa đọc (chính xác, không bị giới hạn bởi LIMIT 20)
async function loadUnreadCount() {
    const userId = localStorage.getItem("userId");
    if (!userId) return;

    try {
        const res = await fetch(`/api/notifications/unread-count?user_id=${userId}`);
        const data = await res.json();
        const badge = document.getElementById("notif-badge");
        badge.textContent = data.count || '0';
    } catch (err) {
        console.error("Lỗi đếm thông báo chưa đọc:", err);
    }
}

// Tự động load badge khi mở trang
document.addEventListener("DOMContentLoaded", () => {
    loadUnreadCount();
});