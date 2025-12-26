/**
 * src/controllers/albumController.js
 * Xử lý: Tạo Album, Xem Album, Thêm/Xóa bài hát trong Album
 */
const db = require('../config/database');

// 1. Tạo Album mới (Admin/Manager)
exports.createAlbum = (req, res) => {
    const { name, artist, genre, description } = req.body;
    
    // Ưu tiên lấy file từ Multer, nếu không có thì lấy text (nếu test postman)
    const image_path = req.file ? req.file.filename : (req.body.image_path || null);

    if (!name) return res.status(400).json({ error: "Tên Album là bắt buộc" });

    const created_at = new Date().toISOString();
    
    const sql = `INSERT INTO albums (name, artist, genre, image_path, description, created_at) 
                 VALUES (?, ?, ?, ?, ?, ?)`;

    db.run(sql, [name, artist, genre, image_path, description, created_at], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Tạo Album thành công", albumId: this.lastID });
    });
};

// 2. Lấy tất cả Album
exports.getAllAlbums = (req, res) => {
    const sql = "SELECT * FROM albums ORDER BY created_at DESC";
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        
        // Xử lý đường dẫn ảnh đầy đủ
        const protocol = req.protocol;
        const host = req.get('host');
        const albums = rows.map(a => ({
            ...a,
            image_url: a.image_path ? `${protocol}://${host}/public/images/${a.image_path}` : "https://via.placeholder.com/150"
        }));

        res.json({ data: albums });
    });
};

// 3. Lấy chi tiết Album (Kèm danh sách bài hát)
exports.getAlbumDetail = (req, res) => {
    const { id } = req.params;
    const protocol = req.protocol;
    const host = req.get('host');
    
    // Lấy thông tin Album
    db.get("SELECT * FROM albums WHERE id = ?", [id], (err, album) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!album) return res.status(404).json({ error: "Album không tồn tại" });

        // Lấy danh sách bài hát thuộc Album này
        db.all("SELECT * FROM songs WHERE album_id = ?", [id], (err2, rows) => {
            if (err2) return res.status(500).json({ error: err2.message });
            
            // Xử lý link nhạc/ảnh cho từng bài hát (để Play được ngay)
            const songs = rows.map(song => ({
                ...song,
                image_url: (!song.image_path || song.image_path.trim() === "") 
                    ? "https://via.placeholder.com/150" 
                    : (song.image_path.startsWith('http') ? song.image_path : `${protocol}://${host}/public/images/${song.image_path}`),
                stream_url: `${protocol}://${host}/api/stream/${song.id}`,
                video_url: song.video_path ? `${protocol}://${host}/api/stream-video/${song.id}` : null
            }));

            res.json({ 
                album: album,
                songs: songs 
            });
        });
    });
};

// ============================================================
// CÁC HÀM MỚI (UPDATE CHO BÀI HÁT)
// ============================================================

// 4. Thêm bài hát có sẵn vào Album (Gán album_id cho bài hát)
exports.addSongToAlbum = (req, res) => {
    const { albumId, songId } = req.body;

    // BƯỚC 1: Kiểm tra bài hát đang thuộc Album nào
    const checkSql = "SELECT album_id, title FROM songs WHERE id = ?";
    db.get(checkSql, [songId], (err, song) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!song) return res.status(404).json({ error: "Không tìm thấy bài hát" });

        // Nếu album_id hiện tại trùng với albumId muốn thêm -> Báo lỗi
        // Lưu ý: Cần so sánh lỏng (==) hoặc ép kiểu vì ID có thể là chuỗi/số
        if (song.album_id == albumId) {
            return res.status(400).json({ error: `Bài hát "${song.title}" đã nằm trong Album này rồi!` });
        }

        // BƯỚC 2: Cập nhật nếu không trùng
        const updateSql = "UPDATE songs SET album_id = ? WHERE id = ?";
        db.run(updateSql, [albumId, songId], function(err2) {
            if (err2) return res.status(500).json({ error: err2.message });
            res.json({ message: "Đã thêm vào Album thành công" });
        });
    });
};

// 5. Gỡ bài hát khỏi Album (Set album_id về NULL)
exports.removeSongFromAlbum = (req, res) => {
    const { songId } = req.body;

    if (!songId) {
        return res.status(400).json({ error: "Thiếu ID bài hát" });
    }

    // Logic: Xóa khỏi album thực chất là set cột album_id thành NULL
    const sql = "UPDATE songs SET album_id = NULL WHERE id = ?";
    
    db.run(sql, [songId], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Đã gỡ bài hát khỏi Album thành công!" });
    });
};

// 6. Xóa Album (Admin/Manager)
exports.deleteAlbum = (req, res) => {
    const albumId = req.params.id;

    // Bước 1: Gỡ tất cả bài hát ra khỏi album này trước
    db.run("UPDATE songs SET album_id = NULL WHERE album_id = ?", [albumId], function(err) {
        if (err) return res.status(500).json({ error: "Lỗi gỡ bài hát: " + err.message });

        // Bước 2: Xóa Album
        db.run("DELETE FROM albums WHERE id = ?", [albumId], function(err2) {
            if (err2) return res.status(500).json({ error: "Lỗi xóa album: " + err2.message });
            res.json({ message: "Đã xóa Album thành công!" });
        });
    });
};