/**
 * src/controllers/songController.js
 * Xử lý logic bài hát: Lấy danh sách, Phát nhạc, Upload Thêm/Xóa nhạc
 */

const db = require('../config/database');
const fs = require('fs');
const path = require('path');

// 1. Lấy danh sách bài hát
exports.getAllSongs = (req, res) => {
    const protocol = req.protocol;
    const host = req.get('host');
    
    // Lấy từ khóa tìm kiếm từ URL (Ví dụ: /api/songs?q=SonTung)
    const searchQuery = req.query.q;

    let sql = "SELECT * FROM songs";
    let params = [];

    // Nếu có từ khóa tìm kiếm -> Sửa câu lệnh SQL
    if (searchQuery) {
        sql += " WHERE title LIKE ? OR artist LIKE ?";
        // Dấu % để tìm gần đúng (chứa từ khóa là được)
        params = [`%${searchQuery}%`, `%${searchQuery}%`];
    }

    db.all(sql, params, (err, rows) => {
        if (err) {
            if(err.message.includes('no such table')) return res.json({data:[]});
            return res.status(500).json({ error: err.message });
        }

        const songs = rows.map(song => {
            // Logic xử lý ảnh (như cũ)
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

// 2. Stream nhạc (Hỗ trợ tua)
exports.streamSong = (req, res) => {
    const songId = req.params.id;
    
    db.get("SELECT file_path FROM songs WHERE id = ?", [songId], (err, row) => {
        if (!row) return res.status(404).send("Không tìm thấy bài hát");

        const musicPath = path.resolve(__dirname, '../../public/music', row.file_path);
        
        if (!fs.existsSync(musicPath)) return res.status(404).send("File nhạc bị thiếu trên server");

        const stat = fs.statSync(musicPath);
        const fileSize = stat.size;
        const range = req.headers.range;

        if (range) {
            const parts = range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
            const chunksize = (end - start) + 1;
            const file = fs.createReadStream(musicPath, { start, end });
            const head = { 'Content-Range': `bytes ${start}-${end}/${fileSize}`, 'Content-Length': chunksize, 'Content-Type': 'audio/mpeg' };
            res.writeHead(206, head);
            file.pipe(res);
        } else {
            const head = { 'Content-Length': fileSize, 'Content-Type': 'audio/mpeg' };
            res.writeHead(200, head);
            fs.createReadStream(musicPath).pipe(res);
        }
    });
};

// Phát Video (Hỗ trợ tua)
exports.streamVideo = (req, res) => {
    const songId = req.params.id;
    db.get("SELECT video_path FROM songs WHERE id = ?", [songId], (err, row) => {
        if (!row || !row.video_path) return res.status(404).send("Không có video");

        const videoPath = path.resolve(__dirname, '../../public/videos', row.video_path);
        if (!fs.existsSync(videoPath)) return res.status(404).send("File video lỗi");

        const stat = fs.statSync(videoPath);
        const fileSize = stat.size;
        const range = req.headers.range;

        if (range) {
            const parts = range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
            const chunksize = (end - start) + 1;
            const file = fs.createReadStream(videoPath, { start, end });
            const head = { 
                'Content-Range': `bytes ${start}-${end}/${fileSize}`, 
                'Accept-Ranges': 'bytes', 
                'Content-Length': chunksize, 
                'Content-Type': 'video/mp4' 
            };
            res.writeHead(206, head);
            file.pipe(res);
        } else {
            const head = { 'Content-Length': fileSize, 'Content-Type': 'video/mp4' };
            res.writeHead(200, head);
            fs.createReadStream(videoPath).pipe(res);
        }
    });
};

// ============================================================
// 3. ADMIN: THÊM NHẠC MỚI (ĐÃ CẬP NHẬT ĐỂ HỖ TRỢ UPLOAD FILE)
// ============================================================
exports.addSongAdmin = (req, res) => {
    try {
        const { title, artist } = req.body;

        if (!req.files || !req.files['musicFile']) {
            return res.status(400).json({ error: "Thiếu file nhạc!" });
        }

        const musicFilename = req.files['musicFile'][0].filename;
        const imageFilename = req.files['imageFile'] ? req.files['imageFile'][0].filename : "";
        
        // Lấy tên file video (nếu có)
        const videoFilename = req.files['videoFile'] ? req.files['videoFile'][0].filename : null;

        // Lưu vào DB (Thêm cột video_path)
        db.run("INSERT INTO songs (title, artist, file_path, image_path, video_path) VALUES (?, ?, ?, ?, ?)", 
            [title, artist, musicFilename, imageFilename, videoFilename], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Thêm thành công!", id: this.lastID });
        });

    } catch (error) {
        res.status(500).json({ error: "Lỗi upload" });
    }
};

// 4. Admin: Xóa nhạc
exports.deleteSong = (req, res) => {
    const songId = req.params.id;
    
    // (Nâng cao: Có thể thêm code xóa file mp3 khỏi ổ cứng tại đây nếu muốn)

    db.run("DELETE FROM songs WHERE id = ?", [songId], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        
        // Dọn dẹp dữ liệu liên quan
        db.run("DELETE FROM playlist_items WHERE song_id = ?", [songId]);
        db.run("DELETE FROM history WHERE song_id = ?", [songId]);

        res.json({ message: "Đã xóa bài hát vĩnh viễn" });
    });
};