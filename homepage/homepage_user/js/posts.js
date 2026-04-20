// ===== POSTS.JS - Tải và hiển thị bài đăng =====

const API_BASE = "http://127.0.0.1:3000";

// Tải danh sách bài đăng mới nhất khi mở trang
document.addEventListener("DOMContentLoaded", () => {
    loadPosts();
});

// Gọi API lấy bài đăng đã duyệt
async function loadPosts() {
    const grid = document.getElementById("post-grid");

    try {
        const res = await fetch(`${API_BASE}/api/posts?status=approved`);
        const posts = await res.json();

        if (posts.length === 0) {
            grid.innerHTML = `<p style="color:#888;">Chưa có bài đăng nào.</p>`;
            return;
        }

        grid.innerHTML = posts.map(post => createPostCard(post)).join("");

    } catch (err) {
        console.error("Lỗi tải bài đăng:", err);
        grid.innerHTML = `<p style="color:red;">Không thể tải bài đăng. Vui lòng thử lại sau.</p>`;
    }
}

// Tạo HTML cho 1 post card
function createPostCard(post) {
    // Xác định badge theo loại bài đăng
    const badgeMap = {
        "room_for_rent": { label: "Cho thuê", class: "rent_out" },
        "find_roommate": { label: "Tìm người ở ghép", class: "find_roommate" },
        "find_room":     { label: "Tìm phòng", class: "find_room" }
    };
    const badge = badgeMap[post.post_type] || { label: "Khác", class: "" };

    // Lấy ảnh đầu tiên hoặc placeholder
    const imageUrl = post.image_url || "https://via.placeholder.com/400x200?text=Không+có+ảnh";

    // Hiển thị giá hoặc ngân sách tùy loại bài
    const priceText = post.price
        ? formatPrice(post.price) + " đ/tháng"
        : post.budget
            ? "Ngân sách: " + formatPrice(post.budget) + " đ/tháng"
            : "Liên hệ";

    // Địa chỉ
    const addressText = post.address || post.preferred_location || "Chưa cập nhật địa chỉ";

    return `
        <div class="post-card" onclick="goToPostDetail(${post.id})">
            <img src="${imageUrl}" alt="${post.title}" class="post-image">
            <div class="post-info">
                <span class="badge ${badge.class}">${badge.label}</span>
                <h3 class="post-title">${post.title}</h3>
                <p class="post-price">${priceText}</p>
                <p class="post-address">📍 ${addressText}</p>
            </div>
        </div>
    `;
}

// Format giá tiền: 2500000 → "2.500.000"
function formatPrice(value) {
    return Number(value).toLocaleString("vi-VN");
}

// Chuyển đến trang chi tiết bài đăng
function goToPostDetail(postId) {
    window.location.href = `post_detail.html?id=${postId}`;
}
