// ===== APP.JS - Entry point, khởi tạo chung =====

// Hiển thị tên user từ localStorage
document.addEventListener('DOMContentLoaded', function () {
    const username = localStorage.getItem("username");
    if (username) {
        const displayEl = document.getElementById("displayUsername");
        if (displayEl) displayEl.textContent = username;
    }
});
