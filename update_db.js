/**
 * migrate.js (FIXED)
 * CHỨC NĂNG: Cập nhật Database an toàn cho SQLite
 * - Thêm cột mà không dùng 'DEFAULT CURRENT_TIMESTAMP' để tránh lỗi.
 * - Tự động điền ngày giờ hiện tại cho dữ liệu cũ.
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error("❌ Không tìm thấy database:", err.message);
    else console.log("✅ Đang kết nối tới Database hiện tại...");
});

db.serialize(() => {
    console.log("⏳ Đang tiến hành nâng cấp (Phiên bản Fix lỗi)...");

    // 1. TẠO BẢNG ALBUMS (Nếu chưa có)
    db.run(`CREATE TABLE IF NOT EXISTS albums (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        artist TEXT,
        genre TEXT,
        image_path TEXT,
        description TEXT,
        created_at TEXT
    )`);

    // 2. HÀM THÊM CỘT AN TOÀN (Bỏ Default động)
    const addColumn = (table, colName, colType) => {
        const sql = `ALTER TABLE ${table} ADD COLUMN ${colName} ${colType}`;
        db.run(sql, (err) => {
            if (err) {
                if (err.message.includes("duplicate column name")) {
                    console.log(`ℹ️  Cột '${colName}' đã tồn tại trong bảng '${table}'. Bỏ qua.`);
                } else {
                    console.error(`❌ Lỗi thêm cột ${colName} vào ${table}:`, err.message);
                }
            } else {
                console.log(`✅ Đã thêm cột '${colName}' vào bảng '${table}'`);
                
                // Sau khi thêm cột, lấp đầy dữ liệu cũ bằng thời gian hiện tại
                if(colName === 'created_at' || colName === 'added_at') {
                    const now = new Date().toISOString();
                    db.run(`UPDATE ${table} SET ${colName} = ? WHERE ${colName} IS NULL`, [now], (e) => {
                        if(!e) console.log(`   -> Đã cập nhật thời gian cho dữ liệu cũ trong '${table}'`);
                    });
                }
            }
        });
    };

    // 3. THỰC HIỆN THÊM CỘT (Dạng TEXT, không có DEFAULT)
    // SQLite lưu ngày tháng dạng chuỗi, nên để TEXT là chuẩn nhất
    
    // Bảng Users
    addColumn('users', 'created_at', 'TEXT');
    addColumn('users', 'is_locked', 'INTEGER DEFAULT 0');

    // Bảng Songs
    addColumn('songs', 'album_id', 'INTEGER'); // Không cần REFERENCES ở lệnh ALTER trong SQLite cũ
    addColumn('songs', 'created_at', 'TEXT');
    addColumn('songs', 'listen_count', 'INTEGER DEFAULT 0');

    // Bảng Playlists
    addColumn('playlists', 'created_at', 'TEXT');

    // Bảng Likes
    addColumn('likes', 'created_at', 'TEXT');

    // Bảng Playlist Items
    addColumn('playlist_items', 'added_at', 'TEXT');
});

setTimeout(() => {
    db.close((err) => {
        if (!err) console.log("\n🎉 NÂNG CẤP HOÀN TẤT! Dữ liệu cũ đã được cập nhật.");
        else console.error(err);
    });
}, 2000);