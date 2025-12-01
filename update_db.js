/**
 * update_db_v2.js
 * Chức năng: Thêm cột genre, lyrics, year vào bảng songs
 */
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    console.log("🔄 Đang cập nhật Database V2...");

    const columns = [
        "ALTER TABLE songs ADD COLUMN genre TEXT DEFAULT 'Pop'",
        "ALTER TABLE songs ADD COLUMN lyrics TEXT DEFAULT ''",
        "ALTER TABLE songs ADD COLUMN year INTEGER DEFAULT 2024"
    ];

    columns.forEach(cmd => {
        db.run(cmd, (err) => {
            if (err && !err.message.includes('duplicate column')) {
                console.error("Lỗi:", err.message);
            } else {
                console.log("✅ Đã cập nhật cột mới.");
            }
        });
    });
});

setTimeout(() => { db.close(); console.log("🏁 Xong!"); }, 1000);