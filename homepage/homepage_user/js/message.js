// Biến toàn cục
let currentActiveContactId = null;
let currentContactName = null; // ← thêm để không phải lấy lại từ DOM

// ==========================================
// 1. XỬ LÝ DROPDOWN DANH SÁCH HỘI THOẠI
// ==========================================

function toggleMessagePanel(event) {
    event.stopPropagation();

    const notifPanel = document.getElementById("notificationPanel");
    if (notifPanel && notifPanel.classList.contains("show")) {
        notifPanel.classList.remove("show");
    } 

    const panel = document.getElementById("messagePanel");
    panel.classList.toggle("show");

    if (panel.classList.contains("show")) {
        loadConversations();
    }
}

async function loadConversations() {
    const userId = localStorage.getItem("userId");
    const list = document.getElementById("conversation-list");

    try {
        const res = await fetch(`/api/conversations?user_id=${userId}`);
        const data = await res.json();

        if (data.length === 0) {
            list.innerHTML = `<div class="notif-empty">Chưa có cuộc trò chuyện nào</div>`;
            return;
        }

        list.innerHTML = data.map(conv => `
            <div class="conversation-item ${conv.unread_count > 0 ? 'unread' : ''}" 
                 onclick="openChatPopup(event, ${conv.contact_id}, '${conv.contact_name}', '${conv.contact_avatar}')">
                <img class="conversation-avatar" src="${conv.contact_avatar || 'https://via.placeholder.com/48'}" />
                <div class="conversation-info">
                    <div class="conversation-name">${conv.contact_name}</div>
                    <div class="conversation-preview">${conv.last_message}</div>
                </div>
            </div>
        `).join('');

    } catch (err) {
        // FIX 1: Bỏ dòng list.innerHTML đầu tiên, chỉ render mock data 1 lần
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
// 2. XỬ LÝ POPUP CHAT Ở GÓC MÀN HÌNH
// ==========================================

function openChatPopup(event, contactId, contactName, contactAvatar) {
    event.stopPropagation();

    document.getElementById("messagePanel").classList.remove("show");

    currentActiveContactId = contactId;
    currentContactName = contactName; // FIX 2: lưu tên vào biến thay vì đọc lại từ DOM

    document.getElementById("chatName").textContent = contactName;
    document.getElementById("chatAvatar").src = contactAvatar || 'https://via.placeholder.com/30';

    const popup = document.getElementById("messagePopup");
    popup.classList.add("show");

    loadMessagesForContact(contactId);

    document.getElementById("messageInput").focus();
}

function closeChatPopup() {
    document.getElementById("messagePopup").classList.remove("show");
    currentActiveContactId = null;
    currentContactName = null;
}

async function loadMessagesForContact(contactId) {
    const userId = localStorage.getItem("userId");
    const body = document.getElementById("messageBody");
    body.innerHTML = '';

    try {
        const res = await fetch(`/api/messages?user_id=${userId}&contact_id=${contactId}`);
        const data = await res.json();
        // render data...

    } catch (err) {
        // FIX 2: dùng currentContactName thay vì đọc lại từ DOM
        body.innerHTML = `
            <div class="message received">
                <p>Tin nhắn test từ ${currentContactName}</p>
                <span class="time">10:00</span>
            </div>
        `;
    }
    scrollMessageToBottom();
}

async function sendNewMessage() {
    if (!currentActiveContactId) return;

    const input = document.getElementById("messageInput");
    const text = input.value.trim();
    if (text === "") return;

    const body = document.getElementById("messageBody");
    const msgDiv = document.createElement("div");
    msgDiv.className = "message sent";

    // FIX 3: padStart để tránh "9:5" → "09:05"
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    msgDiv.innerHTML = `<p>${text}</p><span class="time">${h}:${m}</span>`;

    body.appendChild(msgDiv);
    input.value = "";
    scrollMessageToBottom();

    // Gọi API lưu vào DB...
}

// ==========================================
// 3. TIỆN ÍCH & SỰ KIỆN CLICK OUTSIDE
// ==========================================

function handleEnterMessage(event) {
    if (event.key === "Enter") {
        event.preventDefault();
        sendNewMessage();
    }
}

function scrollMessageToBottom() {
    const body = document.getElementById("messageBody");
    body.scrollTop = body.scrollHeight;
}

document.addEventListener("click", function (event) {
    const msgPanel = document.getElementById("messagePanel");
    const notifPanel = document.getElementById("notificationPanel");

    if (msgPanel && msgPanel.classList.contains("show") && !event.target.closest('.action-icon[title="Tin nhắn"]')) {
        msgPanel.classList.remove("show");
    }

    if (notifPanel && notifPanel.classList.contains("show") && !event.target.closest('.action-icon[title="Thông báo"]')) {
        notifPanel.classList.remove("show");
    }
});


// MESSAGE POPUP
function toggleAvatarMenu(event) {
    event.stopPropagation();
    const menu = document.getElementById("avatarMenu");
    menu.classList.toggle("show");
}

function viewFullChat() {
    // Truyền contactId sang chat.html qua URL
    window.location.href = `./chat.html?contact_id=${currentActiveContactId}&name=${encodeURIComponent(currentContactName)}`;
}

function viewProfile() {
    window.location.href = `./profile.html?user_id=${currentActiveContactId}`;
}

// Đóng menu khi click ra ngoài — thêm vào document click listener có sẵn
document.addEventListener("click", function(event) {
    const avatarMenu = document.getElementById("avatarMenu");
    if (avatarMenu && avatarMenu.classList.contains("show") && !event.target.closest(".chat-avatar-container")) {
        avatarMenu.classList.remove("show");
    }
});