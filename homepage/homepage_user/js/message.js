// Biến toàn cục để nhớ xem đang chat với ai trong Popup
let currentActiveContactId = null; 

// ==========================================
// 1. XỬ LÝ DROPDOWN DANH SÁCH HỘI THOẠI
// ==========================================

// Mở/đóng panel danh sách tin nhắn từ Header
function toggleMessagePanel(event) {
    event.stopPropagation();
    
    // Đóng panel notification nếu đang mở để khỏi đè nhau
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

// Lấy danh sách những người đã nhắn tin với mình
async function loadConversations() {
    const userId = localStorage.getItem("userId");
    const list = document.getElementById("conversation-list");

    try {
        // Gọi API lấy danh sách cuộc trò chuyện (Dựa theo bảng Conversations)
        const res = await fetch(`/api/conversations?user_id=${userId}`);
        const data = await res.json(); // Data giả lập

        if (data.length === 0) {
            list.innerHTML = `<div class="notif-empty">Chưa có cuộc trò chuyện nào</div>`;
            return;
        }

        // Render danh sách
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
        list.innerHTML = `<div class="notif-empty">Bắt đầu trò chuyện với mọi người!</div>`;
        
        // MOCK DATA ĐỂ BẠN TEST GIAO DIỆN KHI CHƯA CÓ API:
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

// Click vào 1 hội thoại -> Mở khung chat góc dưới
function openChatPopup(event, contactId, contactName, contactAvatar) {
    event.stopPropagation(); // Ngăn sự kiện click lan ra ngoài làm đóng menu
    
    // Đóng dropdown panel
    document.getElementById("messagePanel").classList.remove("show");

    // Cập nhật thông tin UI của Popup
    currentActiveContactId = contactId;
    document.getElementById("chatName").textContent = contactName;
    document.getElementById("chatAvatar").src = contactAvatar || 'https://via.placeholder.com/30';

    // Hiển thị khung chat
    const popup = document.getElementById("messagePopup");
    popup.classList.add("show");
    
    // Gọi API lấy tin nhắn chi tiết
    loadMessagesForContact(contactId);
    
    // Focus vào ô chat
    document.getElementById("messageInput").focus();
}

// Nút X đóng khung chat
function closeChatPopup() {
    document.getElementById("messagePopup").classList.remove("show");
    currentActiveContactId = null; // Reset
}

// Tải chi tiết tin nhắn của 1 cuộc hội thoại
async function loadMessagesForContact(contactId) {
    const userId = localStorage.getItem("userId");
    const body = document.getElementById("messageBody");
    body.innerHTML = ''; // Clear tin nhắn cũ

    try {
        const res = await fetch(`/api/messages?user_id=${userId}&contact_id=${contactId}`);
        const data = await res.json();

        // Render y như logic cũ của bạn...
    } catch (err) {
        // UI Mẫu khi chưa có API
        body.innerHTML = `
            <div class="message received">
                <p>Tin nhắn test từ ${document.getElementById("chatName").textContent}</p>
                <span class="time">10:00 AM</span>
            </div>
        `;
    }
    scrollMessageToBottom();
}

// Gửi tin nhắn mới
async function sendNewMessage() {
    if (!currentActiveContactId) return; // Nếu chưa mở chat với ai thì ko gửi
    
    const input = document.getElementById("messageInput");
    const text = input.value.trim();
    if (text === "") return;

    // Hiển thị tin nhắn gửi đi
    const body = document.getElementById("messageBody");
    const msgDiv = document.createElement("div");
    msgDiv.className = "message sent"; 
    
    const now = new Date();
    msgDiv.innerHTML = `<p>${text}</p><span class="time">${now.getHours()}:${now.getMinutes()}</span>`;
    
    body.appendChild(msgDiv);
    input.value = ""; 
    scrollMessageToBottom();

    // Gọi API lưu vào DB bảng Messages...
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

// Ẩn panel khi click ra ngoài
document.addEventListener("click", function(event) {
    const msgPanel = document.getElementById("messagePanel");
    const notifPanel = document.getElementById("notificationPanel");

    // Click ra ngoài panel tin nhắn thì đóng
    if (msgPanel && msgPanel.classList.contains("show") && !event.target.closest('.action-icon[title="Tin nhắn"]')) {
        msgPanel.classList.remove("show");
    }

    // Click ra ngoài panel thông báo thì đóng
    if (notifPanel && notifPanel.classList.contains("show") && !event.target.closest('.action-icon[title="Thông báo"]')) {
        notifPanel.classList.remove("show");
    }
});