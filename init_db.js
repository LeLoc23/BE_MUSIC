/**
 * FILE KHỞI TẠO DATABASE (CẬP NHẬT FULL TÍNH NĂNG ADMIN)
 * Chức năng: Tạo bảng và thêm dữ liệu mẫu.
 * Cách chạy: 
 * 1. Xóa file database.db cũ đi.
 * 2. Chạy lệnh: node init_db.js
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Tạo file database.db ngay tại thư mục gốc
const dbPath = path.resolve(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error("❌ Lỗi tạo file DB:", err.message);
    else console.log("✅ Đang kết nối để khởi tạo dữ liệu...");
});

db.serialize(() => {
    console.log("⏳ Đang tạo các bảng dữ liệu...");

    // 1. Bảng Songs (Thêm cột video_path)
    db.run(`CREATE TABLE IF NOT EXISTS songs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        artist TEXT NOT NULL,
        file_path TEXT NOT NULL, 
        image_path TEXT,
        video_path TEXT 
    )`);

    // 2. Bảng Users (CẬP NHẬT: Thêm cột is_locked để Admin khóa user)
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL, 
        role TEXT NOT NULL DEFAULT 'user',
        is_locked INTEGER DEFAULT 0  -- 0: Hoạt động, 1: Bị khóa
    )`);

    // 3. Bảng Playlists
    db.run(`CREATE TABLE IF NOT EXISTS playlists (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        FOREIGN KEY(user_id) REFERENCES users(id)
    )`);

    // 4. Bảng Playlist Items
    db.run(`CREATE TABLE IF NOT EXISTS playlist_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        playlist_id INTEGER NOT NULL,
        song_id INTEGER NOT NULL,
        FOREIGN KEY(playlist_id) REFERENCES playlists(id),
        FOREIGN KEY(song_id) REFERENCES songs(id),
        UNIQUE(playlist_id, song_id)
    )`);

    // 5. Bảng History
    db.run(`CREATE TABLE IF NOT EXISTS history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        song_id INTEGER NOT NULL,
        played_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id),
        FOREIGN KEY(song_id) REFERENCES songs(id)
    )`);

    console.log("⏳ Đang thêm dữ liệu mẫu...");

    // 6. LIKES (MỚI THÊM) - Lưu bài hát yêu thích
    db.run(`CREATE TABLE IF NOT EXISTS likes (
        user_id INTEGER NOT NULL,
        song_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, song_id), -- Một người chỉ like 1 bài 1 lần
        FOREIGN KEY(user_id) REFERENCES users(id),
        FOREIGN KEY(song_id) REFERENCES songs(id)
    )`);

    console.log("⏳ Đang thêm dữ liệu mẫu...");

    // Thêm User mẫu (Admin và User thường)
    // Admin: admin / 123456
    db.run("INSERT OR IGNORE INTO users (username, password, role, is_locked) VALUES ('admin', '123456', 'admin', 0)");
    // User: user1 / 123456
    db.run("INSERT OR IGNORE INTO users (username, password, role, is_locked) VALUES ('user1', '123456', 'user', 0)");

    // Thêm Nhạc mẫu
    db.get("SELECT count(*) as count FROM songs", (err, row) => {
        if (err) {
            console.error(err.message);
            return;
        }

        if (row.count === 0) {
            const stmt = db.prepare("INSERT INTO songs (title, artist, file_path, image_path) VALUES (?, ?, ?, ?)");
            
            // --- SỬA TÊN FILE Ở ĐÂY CHO KHỚP VỚI THƯ MỤC PUBLIC CỦA BẠN ---
            // Lưu ý: Nếu bạn có file ad.png thì sửa cover.jpg thành ad.png
            stmt.run("Bài Hát Demo 1", "Sơn Tùng MTP", "bai1.mp3", "ad.png");
            stmt.run("Bài Hát Demo 2", "MONO", "bai2.mp3", "ad.png");
            
            stmt.finalize(() => {
                console.log("✅ Đã thêm nhạc mẫu.");
                closeDB(); // Đóng kết nối sau khi xong
            });
        } else {
            console.log("ℹ️ Nhạc đã có sẵn, không thêm mới.");
            closeDB(); // Đóng kết nối nếu không làm gì
        }
    });
});

// Hàm đóng kết nối an toàn
function closeDB() {
    db.close((err) => {
        if (err) console.error(err.message);
        console.log("🎉 KHỞI TẠO THÀNH CÔNG! Bây giờ hãy chạy 'node server.js'");
    });
}