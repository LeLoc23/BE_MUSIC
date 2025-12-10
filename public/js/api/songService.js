// Đây là nơi chuyên đi lấy dữ liệu từ Server (Backend)

// 1. Hàm lấy danh sách bài hát
export async function getAllSongs() {
    try {
        // KIỂM TRA LẠI FILE server.js xem đường dẫn là /songs hay /api/songs
        // Theo dự án gốc thường là '/songs' hoặc '/get_songs'
        const response = await fetch('/songs'); 
        
        if (!response.ok) throw new Error("Không thể tải bài hát");
        return await response.json();
    } catch (error) {
        console.error("Lỗi fetch songs:", error);
        return [];
    }
}

// 2. Hàm tìm kiếm (Nếu backend đã có chức năng này)
export async function searchSongs(keyword) {
    try {
        const response = await fetch(`/search?q=${encodeURIComponent(keyword)}`);
        return await response.json();
    } catch (error) {
        return [];
    }
}