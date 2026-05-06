// ===== POSTS.JS - Tải và hiển thị bài đăng =====

const API_BASE = "http://127.0.0.1:3000";

// ─── MOCK DATA (xem trước giao diện khi server chưa chạy) ─────────────────────
const MOCK_POSTS = [
    {
        id: 1,
        post_type: "room_for_rent",
        title: "Phòng trọ cao cấp gần ĐH Khoa Học Tự Nhiên, full nội thất",
        price: 3500000,
        area: 25,
        address: "144 Trần Phú, Phường 4",
        district: "Quận 5",
        city: "TP.HCM",
        is_available: true,
        image_url: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=400&h=200&fit=crop"
    },
    {
        id: 2,
        post_type: "find_roommate",
        title: "Cần tìm 1 bạn nữ ở ghép căn hộ 2 phòng ngủ gần Landmark 81",
        budget: 2800000,
        preferred_location: "Bình Thạnh, TP.HCM",
        gender_preference: "female",
        image_url: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&h=200&fit=crop"
    },
    {
        id: 3,
        post_type: "find_room",
        title: "Sinh viên năm 3 cần tìm phòng trọ khu vực Quận 7",
        budget: 2000000,
        preferred_location: "Quận 7, TP.HCM",
        image_url: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400&h=200&fit=crop"
    }
];

// ─── Tải danh sách bài đăng khi mở trang ─────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
    loadPosts();
});

// ─── Gọi API lấy bài đăng đã duyệt ──────────────────────────────────────────
async function loadPosts() {
    const grid = document.getElementById("post-grid");

    try {
        const res = await fetch(`${API_BASE}/api/posts?status=approved`);
        if (!res.ok) throw new Error("API error");
        const posts = await res.json();

        if (posts.length === 0) {
            grid.innerHTML = `<p style="color:#888; text-align:center; padding:40px;">Chưa có bài đăng nào.</p>`;
            return;
        }

        grid.innerHTML = posts.map(post => createPostCard(post)).join("");

    } catch (err) {
        // Fallback mock data khi chưa có server (giống loadConversations trong message.js)
        console.warn("[Preview Mode] Dùng mock data cho danh sách bài đăng:", err.message);
        grid.innerHTML = MOCK_POSTS.map(post => createPostCard(post)).join("");
    }
}

// ─── Tạo HTML cho 1 post card ────────────────────────────────────────────────
function createPostCard(post) {
    const badgeMap = {
        "room_for_rent": { label: "Cho thuê", cls: "rent_out" },
        "find_roommate": { label: "Tìm người ở ghép", cls: "find_roommate" },
        "find_room": { label: "Tìm phòng", cls: "find_room" }
    };
    const badge = badgeMap[post.post_type] || { label: "Khác", cls: "" };

    const imageUrl = post.image_url || "https://via.placeholder.com/400x200?text=Không+có+ảnh";

    const priceText = post.price
        ? formatPrice(post.price) + " đ/tháng"
        : post.budget
            ? "Ngân sách: " + formatPrice(post.budget) + " đ/tháng"
            : "Liên hệ";

    const addressText = post.district
        ? `${post.district}, ${post.city || ""}`
        : post.address || post.preferred_location || "Chưa cập nhật địa chỉ";

    const extraInfo = post.area
        ? `<span class="post-meta-chip">📐 ${post.area} m²</span>`
        : "";

    const statusChip = post.post_type === "room_for_rent"
        ? `<span class="post-meta-chip ${post.is_available ? "available" : "unavailable"}">
               ${post.is_available ? "🟢 Còn phòng" : "🔴 Hết phòng"}
           </span>`
        : "";

    return `
        <div class="post-card" onclick="goToPostDetail(${post.id})">
            <div class="post-image-wrap">
                <img src="${imageUrl}" alt="${post.title}" class="post-image">
                <span class="post-card-badge ${badge.cls}">${badge.label}</span>
            </div>
            <div class="post-info">
                <h3 class="post-title">${post.title}</h3>
                <p class="post-price">${priceText}</p>
                <div class="post-meta-row">${extraInfo}${statusChip}</div>
                <p class="post-address">📍 ${addressText}</p>
            </div>
        </div>
    `;
}

// ─── Format giá tiền: 3500000 → "3.500.000" ──────────────────────────────────
function formatPrice(value) {
    return Number(value).toLocaleString("vi-VN");
}

// ─── Chuyển sang trang chi tiết bài đăng ─────────────────────────────────────
function goToPostDetail(postId) {
    window.location.href = `./posts_detail.html?id=${postId}`;
}
