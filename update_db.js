/**
 * FILE CẬP NHẬT DATABASE (KHÔNG MẤT DỮ LIỆU CŨ)
 * Chức năng: Thêm cột mới vào bảng đã có.
 */
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    console.log("🔄 Đang cập nhật Database...");

    // 1. Thêm cột 'is_locked' vào bảng users
    db.run("ALTER TABLE users ADD COLUMN is_locked INTEGER DEFAULT 0", (err) => {
        if (err) {
            if (err.message.includes('duplicate column')) {
                console.log("✅ Bảng 'users' đã có cột 'is_locked'. Bỏ qua.");
            } else {
                console.error("❌ Lỗi users:", err.message);
            }
        } else {
            console.log("🎉 Đã thêm cột 'is_locked' vào bảng 'users'.");
        }
    });

    // 2. Thêm cột 'video_path' vào bảng songs (Nếu bạn chưa có)
    db.run("ALTER TABLE songs ADD COLUMN video_path TEXT", (err) => {
        if (err) {
            if (err.message.includes('duplicate column')) {
                console.log("✅ Bảng 'songs' đã có cột 'video_path'. Bỏ qua.");
            } else {
                console.error("❌ Lỗi songs:", err.message);
            }
        } else {
            console.log("🎉 Đã thêm cột 'video_path' vào bảng 'songs'.");
        }
    });
});

// Đóng kết nối
setTimeout(() => {
    db.close();
    console.log("---------------------------------------------------");
    console.log("🏁 Cập nhật hoàn tất! Bạn có thể chạy lại 'node server.js'");
}, 1000);