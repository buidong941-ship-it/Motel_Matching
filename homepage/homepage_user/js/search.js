// ===== SEARCH.JS - Logic tìm kiếm bài đăng =====

// Hàm tìm kiếm bài đăng
function searchPosts() {
    const postType = document.getElementById("postTypeFilter").value;
    const keyword = document.getElementById("searchInput").value.trim();
    const price = document.getElementById("priceFilter").value;

    // TODO: Gọi API tìm kiếm và hiển thị kết quả
    console.log("Tìm kiếm:", { postType, keyword, price });
}
