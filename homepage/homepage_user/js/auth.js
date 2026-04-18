// Hàm đóng/mở menu tài khoản
function toggleUserMenu(event) {
    // Ngăn chặn sự kiện click lan ra ngoài
    event.stopPropagation();
    const dropdown = document.getElementById("userDropdown");
    dropdown.classList.toggle("show");
}

// Hàm xử lý đăng xuất
function logout() {
    // Xóa thông tin đăng nhập (nếu dùng localStorage)
    localStorage.removeItem("userId");
    localStorage.removeItem("username");

    // Chuyển hướng về trang chủ lúc chưa đăng nhập
    window.location.href = "homepage.html";
}

// Click ra ngoài thì tự động đóng menu
window.onclick = function (event) {
    // Đóng dropdown user
    if (!event.target.closest('.user-profile')) {
        document.getElementById("userDropdown")?.classList.remove('show');
    }
    // Đóng panel thông báo
    if (!event.target.closest('.action-icon')) {
        document.getElementById("notificationPanel")?.classList.remove('show');
    }
}

