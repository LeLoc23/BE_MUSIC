/**
 * src/controllers/playlistController.js
 * Xử lý logic Playlist & Lịch sử nghe
 */

const db = require('../config/database');

// --- PLAYLIST ---

// 1. Lấy danh sách Playlist của User
exports.getUserPlaylists = (req, res) => {
    db.all("SELECT * FROM playlists WHERE user_id = ?", [req.userId], (err, rows) => {
        if(err) return res.status(500).json({error: err.message});
        res.json({ data: rows || [] });
    });
};

// 2. Xem chi tiết Playlist (Có Video + Xử lý ảnh)
exports.getPlaylistDetail = (req, res) => {
    const playlistId = req.params.id;
    const protocol = req.protocol; 
    const host = req.get('host');
    
    const sql = `SELECT s.* FROM songs s JOIN playlist_items pi ON s.id = pi.song_id WHERE pi.playlist_id = ?`;
    
    db.all(sql, [playlistId], (err, rows) => {
        if(err) return res.status(500).json({error: err.message});
        
        const songs = (rows || []).map(song => {
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
                video_url: song.video_path ? `${protocol}://${host}/api/stream-video/${song.id}` : null
            };
        });
        res.json({ data: songs });
    });
};

// 3. Tạo Playlist
exports.createPlaylist = (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "Tên Playlist không được để trống" });

    db.run("INSERT INTO playlists (user_id, name) VALUES (?, ?)", [req.userId, name], function(err) {
        if(err) return res.status(500).json({error: err.message});
        res.json({ message: "Tạo thành công", id: this.lastID });
    });
};

// 4. Thêm bài vào Playlist (CÓ CHẶN TRÙNG LẶP)
exports.addSongToPlaylist = (req, res) => {
    const { playlist_id, song_id } = req.body;

    // Kiểm tra quyền sở hữu
    db.get("SELECT id FROM playlists WHERE id = ? AND user_id = ?", [playlist_id, req.userId], (err, row) => {
        if (!row) return res.status(403).json({ error: "Không có quyền hoặc Playlist không tồn tại" });
        
        // Thêm bài hát (Dùng INSERT bình thường, bắt lỗi nếu trùng)
        db.run("INSERT INTO playlist_items (playlist_id, song_id) VALUES (?, ?)", [playlist_id, song_id], function(err) {
            if (err) {
                // Mã lỗi 19 (SQLITE_CONSTRAINT) = Vi phạm khóa UNIQUE (đã tồn tại)
                if (err.message.includes('UNIQUE') || err.errno === 19) {
                    return res.status(409).json({ error: "Bài hát này ĐÃ CÓ trong playlist rồi!" });
                }
                return res.status(500).json({ error: err.message });
            }
            res.json({ message: "Đã thêm vào playlist thành công" });
        });
    });
};

// 5. Xóa Playlist
exports.deletePlaylist = (req, res) => {
    const plId = req.params.id;
    db.get("SELECT id FROM playlists WHERE id = ? AND user_id = ?", [plId, req.userId], (err, row) => {
        if (!row) return res.status(403).json({ error: "Không có quyền" });
        
        // Xóa items trước
        db.run("DELETE FROM playlist_items WHERE playlist_id = ?", [plId], () => {
            // Xóa playlist sau
            db.run("DELETE FROM playlists WHERE id = ?", [plId], () => res.json({ message: "Đã xóa playlist" }));
        });
    });
};

// 6. Xóa bài khỏi Playlist
exports.removeSongFromPlaylist = (req, res) => {
    const { playlist_id, song_id } = req.body;
    
    db.get("SELECT id FROM playlists WHERE id = ? AND user_id = ?", [playlist_id, req.userId], (err, row) => {
        if (!row) return res.status(403).json({ error: "Không có quyền" });
        
        db.run("DELETE FROM playlist_items WHERE playlist_id = ? AND song_id = ?", [playlist_id, song_id], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Đã xóa bài hát khỏi playlist" });
        });
    });
};

// --- HISTORY ---

// 7. Lấy lịch sử
exports.getHistory = (req, res) => {
    db.all("SELECT s.title, h.played_at FROM history h JOIN songs s ON h.song_id = s.id WHERE h.user_id = ? ORDER BY h.played_at DESC", [req.userId], (err, rows) => res.json({ data: rows || [] }));
};

// 8. Lưu lịch sử
exports.addToHistory = (req, res) => {
    db.run("INSERT INTO history (user_id, song_id) VALUES (?, ?)", [req.userId, req.body.song_id], () => res.json({ message: "Saved" }));
};