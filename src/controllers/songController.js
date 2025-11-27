const db = require('../config/database');
const fs = require('fs');
const path = require('path');

exports.getAllSongs = (req, res) => {
    const protocol = req.protocol;
    const host = req.get('host');
    
    db.all("SELECT * FROM songs", [], (err, rows) => {
        if (err) {
            if(err.message.includes('no such table')) return res.json({data:[]});
            return res.status(500).json({ error: err.message });
        }

        const songs = rows.map(song => {
            // Logic xử lý ảnh thông minh
            let finalImage;
            if (!song.image_path || song.image_path.trim() === "") {
                finalImage = "https://via.placeholder.com/150?text=Music"; // Ảnh mặc định
            } else if (song.image_path.startsWith('http')) {
                finalImage = song.image_path; // Link online
            } else {
                finalImage = `${protocol}://${host}/public/images/${song.image_path}`; // Link local
            }

            return {
                ...song,
                image_url: finalImage,
                stream_url: `${protocol}://${host}/api/stream/${song.id}`
            };
        });
        res.json({ data: songs });
    });
};

exports.streamSong = (req, res) => {
    const songId = req.params.id;
    db.get("SELECT file_path FROM songs WHERE id = ?", [songId], (err, row) => {
        if (!row) return res.status(404).send("Không tìm thấy bài hát");

        // Dùng path.resolve để tìm đúng file trong thư mục public
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
            const head = { 'Content-Range': `bytes ${start}-${end}/${fileSize}`, 'Accept-Ranges': 'bytes', 'Content-Length': chunksize, 'Content-Type': 'audio/mpeg' };
            res.writeHead(206, head);
            file.pipe(res);
        } else {
            const head = { 'Content-Length': fileSize, 'Content-Type': 'audio/mpeg' };
            res.writeHead(200, head);
            fs.createReadStream(musicPath).pipe(res);
        }
    });
};

exports.addSongAdmin = (req, res) => {
    const { title, artist, file_path, image_path } = req.body;
    db.run("INSERT INTO songs (title, artist, file_path, image_path) VALUES (?, ?, ?, ?)", 
        [title, artist, file_path, image_path], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Đã thêm nhạc", id: this.lastID });
    });
};