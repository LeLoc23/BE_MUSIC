/**
 * src/controllers/statsController.js
 * Xử lý báo cáo số liệu
 */
const db = require('../config/database');

// 1. Lấy số liệu tổng quan (Dashboard)
exports.getGeneralStats = (req, res) => {
    const stats = {};

    // Dùng Promise để chạy nhiều câu lệnh SQL tuần tự cho dễ kiểm soát
    // 1. Đếm tổng User
    db.get("SELECT count(*) as total FROM users", [], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        stats.totalUsers = row.total;

        // 2. Đếm User bị khóa
        db.get("SELECT count(*) as locked FROM users WHERE is_locked = 1", [], (err, row) => {
            stats.lockedUsers = row.locked;

            // 3. Đếm tổng bài hát
            db.get("SELECT count(*) as total FROM songs", [], (err, row) => {
                stats.totalSongs = row.total;

                // 4. Tổng lượt nghe toàn hệ thống
                db.get("SELECT sum(listen_count) as totalListens FROM songs", [], (err, row) => {
                    stats.totalListens = row.totalListens || 0;
                    
                    // Trả về kết quả cuối cùng
                    res.json(stats);
                });
            });
        });
    });
};

// 2. Báo cáo Top bài hát nghe nhiều nhất
exports.getTopListened = (req, res) => {
    // Lấy 5 bài nghe nhiều nhất
    const sql = "SELECT title, artist, listen_count FROM songs ORDER BY listen_count DESC LIMIT 5";
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ data: rows });
    });
};

// 3. Báo cáo Top bài hát được Yêu thích nhiều nhất
exports.getTopLiked = (req, res) => {
    // Join bảng likes và songs để đếm
    const sql = `
        SELECT s.title, s.artist, COUNT(l.user_id) as like_count 
        FROM songs s 
        JOIN likes l ON s.id = l.song_id 
        GROUP BY s.id 
        ORDER BY like_count DESC 
        LIMIT 5
    `;
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ data: rows });
    });
};

// 4. API Tăng lượt nghe (Gọi khi bấm Play)
exports.incrementListenCount = (req, res) => {
    const songId = req.params.id;
    db.run("UPDATE songs SET listen_count = listen_count + 1 WHERE id = ?", [songId], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Đã tăng view" });
    });
};