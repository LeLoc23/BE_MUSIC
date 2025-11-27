/**
 * FILE KHỞI TẠO DATABASE (ĐÃ FIX LỖI ASYNC)
 * Chức năng: Tạo bảng và thêm dữ liệu mẫu.
 * Cách chạy: node init_db.js
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error("❌ Lỗi tạo file DB:", err.message);
    else console.log("✅ Đang kết nối để khởi tạo dữ liệu...");
});

db.serialize(() => {
    console.log("⏳ Đang tạo các bảng dữ liệu...");

    // 1. Tạo các bảng
    db.run(`CREATE TABLE IF NOT EXISTS songs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        artist TEXT NOT NULL,
        file_path TEXT NOT NULL, 
        image_path TEXT 
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL, 
        role TEXT NOT NULL DEFAULT 'user'
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS playlists (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        FOREIGN KEY(user_id) REFERENCES users(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS playlist_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        playlist_id INTEGER NOT NULL,
        song_id INTEGER NOT NULL,
        FOREIGN KEY(playlist_id) REFERENCES playlists(id),
        FOREIGN KEY(song_id) REFERENCES songs(id),
        UNIQUE(playlist_id, song_id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        song_id INTEGER NOT NULL,
        played_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id),
        FOREIGN KEY(song_id) REFERENCES songs(id)
    )`);

    console.log("⏳ Đang thêm dữ liệu mẫu...");

    // 2. Thêm User
    db.run("INSERT OR IGNORE INTO users (username, password, role) VALUES ('admin', '123456', 'admin')");
    db.run("INSERT OR IGNORE INTO users (username, password, role) VALUES ('user1', '123456', 'user')");

    // 3. Thêm Nhạc (Và đóng kết nối ở đây)
    db.get("SELECT count(*) as count FROM songs", (err, row) => {
        if (err) {
            console.error(err.message);
            return;
        }

        if (row.count === 0) {
            const stmt = db.prepare("INSERT INTO songs (title, artist, file_path, image_path) VALUES (?, ?, ?, ?)");
            
            // --- SỬA TÊN FILE Ở ĐÂY CHO ĐÚNG VỚI FOLDER PUBLIC CỦA BẠN ---
            stmt.run("Bài Hát Demo 1", "Sơn Tùng MTP", "bai1.mp3", "cover.jpg");
            stmt.run("Bài Hát Demo 2", "MONO", "bai2.mp3", "cover.jpg");
            // stmt.run("Mưa đỏ", "Nguyễn Hùng", "Muado.mp3", "cover.jpg");
            
            // Quan trọng: finalize() chạy xong mới được close()
            stmt.finalize(() => {
                console.log("✅ Đã thêm nhạc mẫu.");
                closeDB(); // Đóng kết nối sau khi thêm xong
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