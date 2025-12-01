/**
 * src/controllers/songController.js
 * Xử lý logic bài hát: Tìm kiếm thông minh (Tiếng Việt), Phát nhạc, Upload...
 */

const db = require('../config/database');
const fs = require('fs');
const path = require('path');

// --- HÀM PHỤ: XÓA DẤU TIẾNG VIỆT ---
// Giúp biến "Lạc Trôi" -> "lac troi" để so sánh
function removeVietnameseTones(str) {
    if (!str) return "";
    str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a");
    str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e");
    str = str.replace(/ì|í|ị|ỉ|ĩ/g, "i");
    str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o");
    str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u");
    str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y");
    str = str.replace(/đ/g, "d");
    str = str.replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, "A");
    str = str.replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, "E");
    str = str.replace(/Ì|Í|Ị|Ỉ|Ĩ/g, "I");
    str = str.replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, "O");
    str = str.replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, "U");
    str = str.replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, "Y");
    str = str.replace(/Đ/g, "D");
    // Kết hợp các dấu thanh (nếu có tổ hợp)
    str = str.normalize('NFD').replace(/[\u0300-\u036f]/g, "");
    return str;
}

// 1. Lấy danh sách bài hát (TÌM KIẾM THÔNG MINH)
exports.getAllSongs = (req, res) => {
    const protocol = req.protocol;
    const host = req.get('host');
    const searchQuery = req.query.q; // Từ khóa người dùng nhập

    // Lấy TẤT CẢ bài hát lên trước, sau đó lọc bằng JS
    db.all("SELECT * FROM songs", [], (err, rows) => {
        if (err) {
            if(err.message.includes('no such table')) return res.json({data:[]});
            return res.status(500).json({ error: err.message });
        }

        let songs = rows;

        // --- LOGIC TÌM KIẾM GẦN ĐÚNG ---
        if (searchQuery) {
            // 1. Chuyển từ khóa tìm kiếm về dạng không dấu, chữ thường
            const keyword = removeVietnameseTones(searchQuery).toLowerCase().trim();

            // 2. Lọc danh sách
            songs = songs.filter(song => {
                // Chuyển tên bài hát và ca sĩ trong DB về dạng không dấu
                const titleNorm = removeVietnameseTones(song.title).toLowerCase();
                const artistNorm = removeVietnameseTones(song.artist).toLowerCase();

                // Kiểm tra xem có chứa từ khóa không
                return titleNorm.includes(keyword) || artistNorm.includes(keyword);
            });
        }

        //XỬ LÝ ẢNH & URL 
        const result = songs.map(song => {
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

        res.json({ data: result });
    });
};

// 2. Stream nhạc (Hỗ trợ tua)
exports.streamSong = (req, res) => {
    const songId = req.params.id;
    db.get("SELECT file_path FROM songs WHERE id = ?", [songId], (err, row) => {
        if (!row) return res.status(404).send("Not found");
        const musicPath = path.resolve(__dirname, '../../public/music', row.file_path);
        if (!fs.existsSync(musicPath)) return res.status(404).send("File missing");
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
            res.writeHead(206, head); file.pipe(res);
        } else {
            const head = { 'Content-Length': fileSize, 'Content-Type': 'audio/mpeg' };
            res.writeHead(200, head); fs.createReadStream(musicPath).pipe(res);
        }
    });
};

// 3. Stream Video
exports.streamVideo = (req, res) => {
    const songId = req.params.id;
    db.get("SELECT video_path FROM songs WHERE id = ?", [songId], (err, row) => {
        if (!row || !row.video_path) return res.status(404).send("No Video");
        const videoPath = path.resolve(__dirname, '../../public/videos', row.video_path);
        if (!fs.existsSync(videoPath)) return res.status(404).send("File missing");
        const stat = fs.statSync(videoPath);
        const fileSize = stat.size;
        const range = req.headers.range;
        if (range) {
            const parts = range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
            const chunksize = (end - start) + 1;
            const file = fs.createReadStream(videoPath, { start, end });
            const head = { 'Content-Range': `bytes ${start}-${end}/${fileSize}`, 'Content-Length': chunksize, 'Content-Type': 'video/mp4' };
            res.writeHead(206, head); file.pipe(res);
        } else {
            const head = { 'Content-Length': fileSize, 'Content-Type': 'video/mp4' };
            res.writeHead(200, head); fs.createReadStream(videoPath).pipe(res);
        }
    });
};

// 4. Admin Add
exports.addSongAdmin = (req, res) => {
    try {
        const { title, artist, genre, year, lyrics } = req.body;
        if (!req.files || !req.files['musicFile']) return res.status(400).json({ error: "Thiếu file nhạc!" });
        const musicFilename = req.files['musicFile'][0].filename;
        const imageFilename = req.files['imageFile'] ? req.files['imageFile'][0].filename : "";
        const videoFilename = req.files['videoFile'] ? req.files['videoFile'][0].filename : null;
        db.run("INSERT INTO songs (title, artist, file_path, image_path, video_path, genre, year, lyrics) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", 
            [title, artist, musicFilename, imageFilename, videoFilename, genre, year, lyrics], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Thêm thành công!", id: this.lastID });
        });
    } catch (error) { res.status(500).json({ error: "Lỗi upload" }); }
};

// 5. Admin Update
exports.updateSongAdmin = (req, res) => {
    const songId = req.params.id;
    const { title, artist, genre, year, lyrics } = req.body;
    const sql = "UPDATE songs SET title = ?, artist = ?, genre = ?, year = ?, lyrics = ? WHERE id = ?";
    db.run(sql, [title, artist, genre, year, lyrics, songId], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Cập nhật thành công!" });
    });
};

// 6. Admin Delete
exports.deleteSong = (req, res) => {
    const songId = req.params.id;
    db.run("DELETE FROM songs WHERE id = ?", [songId], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        db.run("DELETE FROM playlist_items WHERE song_id = ?", [songId]);
        db.run("DELETE FROM history WHERE song_id = ?", [songId]);
        db.run("DELETE FROM likes WHERE song_id = ?", [songId]);
        res.json({ message: "Đã xóa" });
    });
};