const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Trỏ ra ngoài thư mục gốc để lấy file database.db
const dbPath = path.resolve(__dirname, '../../database.db');

console.log("📂 Đang ghi dữ liệu vào file:", path.resolve(__dirname, '../../database.db'));
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error("❌ Lỗi kết nối DB:", err.message);
    else console.log("✅ [DB] Đã kết nối tới SQLite.");
});

module.exports = db;