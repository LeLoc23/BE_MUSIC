/**
 * src/controllers/songController.js
 * Xử lý logic bài hát: Tìm kiếm, Phát nhạc/Video, Upload Thêm/Sửa/Xóa/Ẩn nhạc
 * CẬP NHẬT:Hỗ trợ update file media
 */

const db = require('../config/database');
const fs = require('fs');
const path = require('path');

// --- HÀM PHỤ: XÓA DẤU TIẾNG VIỆT ---
function removeVietnameseTones(str) {
    if (!str) return "";
    str = str.normalize('NFD').replace(/[\u0300-\u036f]/g, "");
    str = str.replace(/đ/g, "d").replace(/Đ/g, "D");
    return str;
}

// 1. Lấy danh sách bài hát (CÓ PHÂN TRANG)
exports.getAllSongs = (req, res) => {
    const protocol = req.protocol;
    const host = req.get('host');
    const userRole = req.headers['x-user-role'];

    // --- A. LẤY THAM SỐ PHÂN TRANG ---
    // [FIX] Sửa lỗi mặc định trang 2 thành trang 1
    const page = parseInt(req.query.page) || 1;      
    const limit = parseInt(req.query.limit) || 12;   
    const offset = (page - 1) * limit;               

    // --- B. XÂY DỰNG ĐIỀU KIỆN LỌC (WHERE) ---
    let conditions = [];
    let params = [];

    // 1. Lọc theo Role: Nếu không phải Admin/Manager -> Chỉ lấy bài không ẩn
    if (userRole !== 'admin' && userRole !== 'manager') {
        conditions.push("is_hidden = 0");
    }

    // 2. Lọc theo Tìm kiếm (Nếu có ?q=...)
    if (req.query.q) {
        conditions.push("(title LIKE ? OR artist LIKE ?)");
        const keyword = `%${req.query.q}%`;
        params.push(keyword, keyword);
    }

    // Ghép các điều kiện thành chuỗi SQL WHERE
    const whereSql = conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";

    // --- C. THỰC HIỆN QUERY ---
    
    // Bước 1: Đếm tổng số bài hát
    const countSql = `SELECT COUNT(*) as total FROM songs ${whereSql}`;

    db.get(countSql, params, (err, row) => {
        if (err) {
            if(err.message.includes('no such table')) return res.json({data:[], pagination:{}});
            return res.status(500).json({ error: err.message });
        }

        const totalItems = row ? row.total : 0;
        const totalPages = Math.ceil(totalItems / limit);

        // Bước 2: Lấy dữ liệu chi tiết
        // Sắp xếp theo ID giảm dần (bài mới lên đầu)
        const dataSql = `SELECT * FROM songs ${whereSql} ORDER BY id DESC LIMIT ? OFFSET ?`;
        
        // Gộp tham số tìm kiếm + tham số phân trang
        const dataParams = [...params, limit, offset];

        db.all(dataSql, dataParams, (err2, rows) => {
            if (err2) return res.status(500).json({ error: err2.message });

            // Bước 3: Xử lý đường dẫn ảnh & video
            const result = rows.map(song => {
                let finalImage;
                if (!song.image_path || song.image_path.trim() === "") {
                    // Dùng link online cho ổn định
                    finalImage = "https://placehold.co/150x150?text=Music"; 
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

            // Bước 4: Trả về kết quả kèm thông tin Pagination
            res.json({ 
                data: result,
                pagination: {
                    page: page,
                    limit: limit,
                    totalItems: totalItems,
                    totalPages: totalPages
                }
            });
        });
    });
};

// 2. Stream nhạc
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
        
        const created_at = new Date().toISOString();

        db.run("INSERT INTO songs (title, artist, file_path, image_path, video_path, genre, year, lyrics, is_hidden, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)", 
            [title, artist, musicFilename, imageFilename, videoFilename, genre, year, lyrics, created_at], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Thêm thành công!", id: this.lastID });
        });
    } catch (error) { res.status(500).json({ error: "Lỗi upload" }); }
};

// 5. Admin Update (CẬP NHẬT: Hỗ trợ đổi file Media)
exports.updateSongAdmin = (req, res) => {
    const songId = req.params.id;
    const { title, artist, genre, year, lyrics } = req.body;

    // 1. Các trường thông tin cơ bản
    let sql = "UPDATE songs SET title = ?, artist = ?, genre = ?, year = ?, lyrics = ?";
    let params = [title, artist, genre, year, lyrics];

    // 2. Kiểm tra nếu có file Ảnh mới
    if (req.files && req.files['imageFile']) {
        sql += ", image_path = ?";
        params.push(req.files['imageFile'][0].filename);
    }

    // 3. Kiểm tra nếu có file Video mới
    if (req.files && req.files['videoFile']) {
        sql += ", video_path = ?";
        params.push(req.files['videoFile'][0].filename);
    }

    // 4. Thêm điều kiện WHERE
    sql += " WHERE id = ?";
    params.push(songId);

    // 5. Thực thi Update
    db.run(sql, params, function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Cập nhật thành công!" });
    });
};

// 6. Admin Ẩn/Hiện
exports.toggleHideSong = (req, res) => {
    const songId = req.params.id;
    db.get("SELECT is_hidden FROM songs WHERE id = ?", [songId], (err, row) => {
        if (!row) return res.status(404).json({ error: "Không tìm thấy" });
        const newStatus = row.is_hidden === 1 ? 0 : 1;
        db.run("UPDATE songs SET is_hidden = ? WHERE id = ?", [newStatus, songId], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: newStatus === 1 ? "Đã ẨN bài hát" : "Đã HIỆN bài hát" });
        });
    });
};

// 7. Admin Delete
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