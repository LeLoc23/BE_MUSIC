/**
 * src/controllers/likeController.js
 * Xử lý logic Yêu thích (Like/Unlike)
 */

const db = require('../config/database');

// 1. Thả tim / Bỏ tim (Toggle Like)
exports.toggleLike = (req, res) => {
    const { song_id } = req.body;
    const userId = req.userId;

    // Kiểm tra xem đã like chưa
    db.get("SELECT * FROM likes WHERE user_id = ? AND song_id = ?", [userId, song_id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });

        if (row) {
            // Nếu đã like rồi -> Xóa (Unlike)
            db.run("DELETE FROM likes WHERE user_id = ? AND song_id = ?", [userId, song_id], (err) => {
                if(err) return res.status(500).json({ error: err.message });
                res.json({ message: "Unliked", status: false }); // status false = chưa like
            });
        } else {
            // Nếu chưa like -> Thêm (Like)
            db.run("INSERT INTO likes (user_id, song_id) VALUES (?, ?)", [userId, song_id], (err) => {
                if(err) return res.status(500).json({ error: err.message });
                res.json({ message: "Liked", status: true }); // status true = đã like
            });
        }
    });
};

// 2. Lấy danh sách bài hát đã Like
exports.getLikedSongs = (req, res) => {
    const protocol = req.protocol;
    const host = req.get('host');
    
    const sql = `
        SELECT s.* FROM songs s
        JOIN likes l ON s.id = l.song_id
        WHERE l.user_id = ?
        ORDER BY l.created_at DESC
    `;

    db.all(sql, [req.userId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        const songs = rows.map(song => {
            // Logic xử lý ảnh giống songController
            let finalImage;
            if (!song.image_path || song.image_path.trim() === "") {
                finalImage = "https://via.placeholder.com/150?text=Music"; 
            } else if (song.image_path.startsWith('http')) {
                finalImage = song.image_path; 
            } else {
                finalImage = `${protocol}://${host}/public/images/${song.image_path}`; 
            }

            return {
                ...song,
                image_url: finalImage,
                stream_url: `${protocol}://${host}/api/stream/${song.id}`,
                video_url: song.video_path ? `${protocol}://${host}/api/stream-video/${song.id}` : null,
                is_liked: true // Đánh dấu là đã thích
            };
        });
        res.json({ data: songs });
    });
};

// 3. Lấy danh sách ID các bài đã like (Để tô màu trái tim ở trang chủ)
exports.getLikedIds = (req, res) => {
    db.all("SELECT song_id FROM likes WHERE user_id = ?", [req.userId], (err, rows) => {
        if (err) return res.json([]);
        const ids = rows.map(r => r.song_id);
        res.json(ids);
    });
};