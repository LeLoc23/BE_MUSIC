/**
 * update_db_stats.js
 * Chức năng: Thêm cột listen_count (đếm lượt nghe)
 */
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    console.log("📊 Đang cập nhật Database cho thống kê...");

    // Thêm cột listen_count, mặc định là 0
    db.run("ALTER TABLE songs ADD COLUMN listen_count INTEGER DEFAULT 0", (err) => {
        if (err && !err.message.includes('duplicate column')) {
            console.error("Lỗi:", err.message);
        } else {
            console.log("✅ Đã thêm cột 'listen_count' thành công.");
        }
    });
});

setTimeout(() => { db.close(); }, 1000);

