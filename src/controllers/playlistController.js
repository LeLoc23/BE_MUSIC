const db = require('../config/database');

// --- PLAYLIST ---
exports.getUserPlaylists = (req, res) => {
    db.all("SELECT * FROM playlists WHERE user_id = ?", [req.userId], (err, rows) => {
        if(err) return res.status(500).json({error: err.message});
        res.json({ data: rows || [] });
    });
};

exports.getPlaylistDetail = (req, res) => {
    const playlistId = req.params.id;
    const protocol = req.protocol; 
    const host = req.get('host');
    
    const sql = `SELECT s.* FROM songs s JOIN playlist_items pi ON s.id = pi.song_id WHERE pi.playlist_id = ?`;
    db.all(sql, [playlistId], (err, rows) => {
        if(err) return res.status(500).json({error: err.message});
        const songs = (rows || []).map(song => ({
            ...song,
            image_url: `${protocol}://${host}/public/images/${song.image_path}`,
            stream_url: `${protocol}://${host}/api/stream/${song.id}`
        }));
        res.json({ data: songs });
    });
};

exports.createPlaylist = (req, res) => {
    db.run("INSERT INTO playlists (user_id, name) VALUES (?, ?)", [req.userId, req.body.name], function(err) {
        if(err) return res.status(500).json({error: err.message});
        res.json({ message: "Tạo thành công", id: this.lastID });
    });
};

exports.addSongToPlaylist = (req, res) => {
    const { playlist_id, song_id } = req.body;
    db.get("SELECT id FROM playlists WHERE id = ? AND user_id = ?", [playlist_id, req.userId], (err, row) => {
        if (!row) return res.status(403).json({ error: "Không có quyền" });
        db.run("INSERT OR IGNORE INTO playlist_items (playlist_id, song_id) VALUES (?, ?)", [playlist_id, song_id], (err) => {
            if(err) return res.status(500).json({error: err.message});
            res.json({ message: "Đã thêm vào playlist" });
        });
    });
};

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

exports.removeSongFromPlaylist = (req, res) => {
    const { playlist_id, song_id } = req.body;
    db.get("SELECT id FROM playlists WHERE id = ? AND user_id = ?", [playlist_id, req.userId], (err, row) => {
        if (!row) return res.status(403).json({ error: "Không có quyền" });
        db.run("DELETE FROM playlist_items WHERE playlist_id = ? AND song_id = ?", [playlist_id, song_id], () => {
            res.json({ message: "Đã xóa bài hát khỏi playlist" });
        });
    });
};

// --- HISTORY ---
exports.getHistory = (req, res) => {
    db.all("SELECT s.title, h.played_at FROM history h JOIN songs s ON h.song_id = s.id WHERE h.user_id = ? ORDER BY h.played_at DESC", [req.userId], (err, rows) => res.json({ data: rows || [] }));
};

exports.addToHistory = (req, res) => {
    db.run("INSERT INTO history (user_id, song_id) VALUES (?, ?)", [req.userId, req.body.song_id], () => res.json({ message: "Saved" }));
};