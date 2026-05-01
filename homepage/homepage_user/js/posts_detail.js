// ===== POSTS_DETAIL.JS - Logic trang chi tiết bài đăng =====

const API_BASE = "http://127.0.0.1:3000";

// ─── Trạng thái gallery ───────────────────────────────────────────────────────
let galleryImages = [];
let currentImageIndex = 0;

// ─── Khởi động khi DOM sẵn sàng ──────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
    const params = new URLSearchParams(window.location.search);
    const postId = params.get("id");

    if (!postId) {
        showError("Không tìm thấy ID bài đăng.");
        return;
    }

    // Tải song song: chi tiết bài + ảnh + comments
    Promise.all([
        loadPostDetail(postId),
        loadImages(postId),
        loadComments(postId)
    ]);
});

// ─── Tải chi tiết bài đăng ───────────────────────────────────────────────────
async function loadPostDetail(postId) {
    try {
        const res = await fetch(`${API_BASE}/api/posts/${postId}`);
        if (!res.ok) throw new Error("Không tìm thấy bài đăng.");
        const post = await res.json();
        renderPostDetail(post);
    } catch (err) {
        console.error("Lỗi tải chi tiết bài đăng:", err);
        showError("Không thể tải bài đăng. Vui lòng thử lại sau.");
    }
}

// ─── Render thông tin bài đăng ────────────────────────────────────────────────
function renderPostDetail(post) {
    document.title = `${post.title} - 4D_Trọ.vn`;

    const badgeMap = {
        "room_for_rent": { label: "Cho thuê",         cls: "room_for_rent" },
        "find_roommate": { label: "Tìm người ở ghép", cls: "find_roommate" },
        "find_room":     { label: "Tìm phòng",        cls: "find_room" }
    };
    const badge = badgeMap[post.post_type] || { label: "Khác", cls: "" };

    // Badge + tiêu đề
    const badgeEl = document.getElementById("detail-badge");
    if (badgeEl) {
        badgeEl.textContent = badge.label;
        badgeEl.className = `detail-badge ${badge.cls}`;
    }

    setText("detail-title", post.title);
    setText("detail-date", `Đăng lúc: ${formatDate(post.created_at)}`);

    // Chips thông tin
    if (post.post_type === "room_for_rent") {
        setText("chip-price",    post.price    ? formatPrice(post.price) + " đ/tháng" : "Liên hệ");
        setText("chip-area",     post.area     ? post.area + " m²"                   : "—");
        setText("chip-address",  post.address  || "Chưa cập nhật");
        setText("chip-district", post.district ? `${post.district}, ${post.city}`    : post.city || "—");
        setText("chip-status",   post.is_available ? "Còn phòng" : "Đã hết phòng");
        hideEl("chip-wrap-budget");
        hideEl("chip-wrap-gender");
    } else {
        setText("chip-budget",   post.budget   ? "Ngân sách: " + formatPrice(post.budget) + " đ/tháng" : "Liên hệ");
        setText("chip-location", post.preferred_location || "Linh hoạt");
        setText("chip-gender",   mapGender(post.gender_preference));
        hideEl("chip-wrap-price");
        hideEl("chip-wrap-area");
        hideEl("chip-wrap-status");
        hideEl("chip-wrap-district");
        // Dùng address hoặc preferred_location
        setText("chip-address",  post.preferred_location || "Chưa cập nhật");
    }

    // Nội dung mô tả
    const contentEl = document.getElementById("detail-content-text");
    if (contentEl) contentEl.textContent = post.content || post.roommate_desc || "Không có mô tả.";

    // Thông tin tác giả (sidebar)
    const avatarEl = document.getElementById("author-avatar");
    if (avatarEl) avatarEl.src = post.avatar || "https://via.placeholder.com/64";
    setText("author-name",  post.fullname || "Ẩn danh");
    setText("author-phone", post.phone    ? `📞 ${post.phone}` : "Chưa cung cấp SĐT");

    // Nút liên hệ: gắn post_id & owner_id vào dataset
    const btnContact = document.getElementById("btn-contact");
    if (btnContact) {
        btnContact.dataset.postId  = post.id;
        btnContact.dataset.ownerId = post.user_id;
    }

    // Hiển thị phần còn ẩn
    showEl("detail-layout");
    hideEl("loading-state");
}

// ─── Tải và render gallery ảnh ────────────────────────────────────────────────
async function loadImages(postId) {
    try {
        const res = await fetch(`${API_BASE}/api/posts/${postId}/images`);
        const images = await res.json();

        galleryImages = images.length > 0
            ? images.map(img => img.image_url)
            : ["https://via.placeholder.com/960x420?text=Không+có+ảnh"];

        renderGallery();
    } catch (err) {
        console.error("Lỗi tải ảnh:", err);
        galleryImages = ["https://via.placeholder.com/960x420?text=Không+có+ảnh"];
        renderGallery();
    }
}

function renderGallery() {
    const mainImg = document.getElementById("gallery-main");
    const dotsWrap = document.getElementById("gallery-dots");

    if (mainImg) mainImg.src = galleryImages[0];

    if (dotsWrap) {
        dotsWrap.innerHTML = galleryImages.map((_, i) =>
            `<div class="gallery-dot ${i === 0 ? 'active' : ''}" onclick="goToSlide(${i})"></div>`
        ).join("");
    }

    // Ẩn nav nếu chỉ có 1 ảnh
    if (galleryImages.length <= 1) {
        hideEl("gallery-prev");
        hideEl("gallery-next");
    }
}

function goToSlide(index) {
    currentImageIndex = (index + galleryImages.length) % galleryImages.length;
    const mainImg = document.getElementById("gallery-main");
    if (mainImg) {
        mainImg.style.opacity = "0";
        setTimeout(() => {
            mainImg.src = galleryImages[currentImageIndex];
            mainImg.style.opacity = "1";
        }, 200);
    }
    // Cập nhật dots
    document.querySelectorAll(".gallery-dot").forEach((dot, i) => {
        dot.classList.toggle("active", i === currentImageIndex);
    });
}

function prevSlide() { goToSlide(currentImageIndex - 1); }
function nextSlide() { goToSlide(currentImageIndex + 1); }

// ─── Tải và render bình luận ──────────────────────────────────────────────────
async function loadComments(postId) {
    try {
        const res = await fetch(`${API_BASE}/api/posts/${postId}/comments`);
        const comments = await res.json();
        renderComments(comments);
    } catch (err) {
        console.error("Lỗi tải bình luận:", err);
    }
}

function renderComments(comments) {
    const countEl = document.getElementById("comments-count");
    if (countEl) countEl.textContent = comments.length;

    const listEl = document.getElementById("comment-list");
    if (!listEl) return;

    if (comments.length === 0) {
        listEl.innerHTML = `<p class="comments-empty">Chưa có bình luận nào. Hãy là người đầu tiên!</p>`;
        return;
    }

    listEl.innerHTML = comments.map(c => `
        <div class="comment-item">
            <img class="comment-avatar"
                 src="${c.avatar || 'https://via.placeholder.com/38'}"
                 alt="${c.fullname}">
            <div class="comment-body">
                <div class="comment-bubble">
                    <div class="comment-author">${escapeHtml(c.fullname || 'Ẩn danh')}</div>
                    <div class="comment-text">${escapeHtml(c.content)}</div>
                </div>
                <div class="comment-time">${timeAgo(c.created_at)}</div>
            </div>
        </div>
    `).join("");
}

// ─── Gửi bình luận mới ────────────────────────────────────────────────────────
async function submitComment() {
    const userId = localStorage.getItem("userId");
    if (!userId) {
        alert("Bạn cần đăng nhập để bình luận.");
        return;
    }

    const textarea = document.getElementById("comment-textarea");
    const content  = textarea ? textarea.value.trim() : "";
    if (!content) {
        alert("Nội dung bình luận không được để trống.");
        return;
    }

    const params = new URLSearchParams(window.location.search);
    const postId = params.get("id");

    try {
        const res = await fetch(`${API_BASE}/api/posts/${postId}/comments`, {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ user_id: parseInt(userId), content })
        });

        if (!res.ok) throw new Error("Lỗi khi gửi bình luận.");

        const newComment = await res.json();

        // Xóa ô nhập
        if (textarea) textarea.value = "";

        // Thêm comment mới lên đầu danh sách
        const listEl = document.getElementById("comment-list");
        const emptyMsg = listEl.querySelector(".comments-empty");
        if (emptyMsg) emptyMsg.remove();

        const newEl = document.createElement("div");
        newEl.className = "comment-item";
        newEl.innerHTML = `
            <img class="comment-avatar"
                 src="${newComment.avatar || 'https://via.placeholder.com/38'}"
                 alt="${newComment.fullname}">
            <div class="comment-body">
                <div class="comment-bubble">
                    <div class="comment-author">${escapeHtml(newComment.fullname || 'Ẩn danh')}</div>
                    <div class="comment-text">${escapeHtml(newComment.content)}</div>
                </div>
                <div class="comment-time">Vừa xong</div>
            </div>
        `;
        listEl.prepend(newEl);

        // Cập nhật số lượng
        const countEl = document.getElementById("comments-count");
        if (countEl) countEl.textContent = parseInt(countEl.textContent || "0") + 1;

    } catch (err) {
        console.error("Lỗi gửi bình luận:", err);
        alert("Không thể gửi bình luận. Vui lòng thử lại.");
    }
}

// ─── Liên hệ tác giả ─────────────────────────────────────────────────────────
async function contactOwner() {
    const userId = localStorage.getItem("userId");
    if (!userId) {
        alert("Bạn cần đăng nhập để liên hệ.");
        return;
    }

    const btn    = document.getElementById("btn-contact");
    const postId = btn?.dataset.postId;
    if (!postId) return;

    try {
        const res = await fetch(`${API_BASE}/api/posts/${postId}/contact`, {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ requester_id: parseInt(userId) })
        });

        const data = await res.json();
        if (!res.ok) {
            alert(data.error || "Không thể tạo cuộc trò chuyện.");
            return;
        }

        // Chuyển sang trang chat với conversation_id
        window.location.href = `chat.html?conversation_id=${data.conversation_id}`;
    } catch (err) {
        console.error("Lỗi liên hệ:", err);
        alert("Không thể kết nối. Vui lòng thử lại sau.");
    }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}

function showEl(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = "";
}

function hideEl(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = "none";
}

function formatPrice(val) {
    return Number(val).toLocaleString("vi-VN");
}

function formatDate(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function mapGender(g) {
    return { male: "Nam", female: "Nữ", any: "Không yêu cầu" }[g] || "Không yêu cầu";
}

function escapeHtml(str) {
    return (str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function showError(msg) {
    const el = document.getElementById("loading-state");
    if (el) {
        el.id = "error-state";
        el.className = "error-state";
        el.textContent = "⚠️ " + msg;
    }
}
