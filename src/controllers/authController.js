/**
 * src/controllers/authController.js
 * Xử lý: Đăng ký, Đăng nhập (MD5), Quản lý User, Đổi mật khẩu, Lịch sử nghe nhạc
 */

const db = require('../config/database');
const crypto = require('crypto'); // 1. Thư viện mã hóa

// --- HÀM PHỤ: Mã hóa MD5 ---
function hashMD5(password) {
    return crypto.createHash('md5').update(password).digest('hex');
}

// 1. ĐĂNG KÝ
exports.register = (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Thiếu thông tin đăng nhập" });

    // Mã hóa mật khẩu trước khi lưu
    const hashedPassword = hashMD5(password);

    // Mặc định tạo user thường (role='user') và trạng thái mở (is_locked=0)
    const sql = "INSERT INTO users (username, password, role, is_locked) VALUES (?, ?, 'user', 0)";
    
    db.run(sql, [username, hashedPassword], function(err) {
        if (err) {
            if (err.message.includes('UNIQUE')) return res.status(400).json({ error: "Tên đăng nhập đã tồn tại" });
            return res.status(500).json({ error: err.message });
        }
        res.json({ message: "Đăng ký thành công! Hãy đăng nhập." });
    });
};

// 2. ĐĂNG NHẬP (CÓ KIỂM TRA BỊ KHÓA & MD5)
exports.login = (req, res) => {
    const { username, password } = req.body;
    
    // Tìm user theo username trước
    db.get("SELECT * FROM users WHERE username = ?", [username], (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        
        // Nếu không tìm thấy user
        if (!user) return res.status(401).json({ error: "Sai tài khoản hoặc mật khẩu" });

        // Kiểm tra tài khoản bị khóa
        if (user.is_locked === 1) {
            return res.status(403).json({ error: "Tài khoản của bạn đã bị KHÓA bởi Admin!" });
        }

        // Mã hóa mật khẩu nhập vào để so sánh
        const inputHash = hashMD5(password);

        if (inputHash !== user.password) {
            return res.status(401).json({ error: "Sai tài khoản hoặc mật khẩu" });
        }

        // Đăng nhập thành công -> Trả về info (bỏ password)
        const { password: _, ...userWithoutPass } = user;

        res.json({ 
            message: "Thành công", 
            user: userWithoutPass
        });
    });
};

// ============================================================
// 3. CÁC HÀM QUẢN LÝ DÀNH CHO ADMIN
// ============================================================

// Lấy danh sách tất cả user
exports.getAllUsers = (req, res) => {
    db.all("SELECT id, username, role, is_locked FROM users", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ data: rows });
    });
};

// Xóa user
exports.deleteUser = (req, res) => {
    const targetId = req.params.id;
    // Kiểm tra: Nếu có req.userId (từ middleware) thì chặn xóa chính mình
    if (req.userId && parseInt(targetId) === req.userId) return res.status(400).json({ error: "Không thể tự xóa chính mình!" });

    db.serialize(() => {
        db.run("DELETE FROM playlists WHERE user_id = ?", [targetId]);
        db.run("DELETE FROM history WHERE user_id = ?", [targetId]);
        db.run("DELETE FROM likes WHERE user_id = ?", [targetId]);
        db.run("DELETE FROM users WHERE id = ?", [targetId], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Đã xóa người dùng thành công" });
        });
    });
};

// Khóa / Mở khóa user
exports.toggleLockUser = (req, res) => {
    const targetId = req.params.id;
    if (req.userId && parseInt(targetId) === req.userId) return res.status(400).json({ error: "Không thể tự khóa chính mình!" });

    db.get("SELECT is_locked FROM users WHERE id = ?", [targetId], (err, user) => {
        if (!user) return res.status(404).json({ error: "User không tồn tại" });
        
        const newStatus = user.is_locked === 1 ? 0 : 1;
        
        db.run("UPDATE users SET is_locked = ? WHERE id = ?", [newStatus, targetId], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: newStatus === 1 ? "Đã KHÓA tài khoản" : "Đã MỞ KHÓA tài khoản" });
        });
    });
};

// Cập nhật vai trò người dùng
exports.updateUserRole = (req, res) => {
    const targetId = req.params.id;
    const { role } = req.body;

    if (req.userId && parseInt(targetId) === req.userId) {
        return res.status(400).json({ error: "Không thể tự thay đổi quyền của chính mình!" });
    }

    if (role !== 'user' && role !== 'manager') {
        return res.status(400).json({ error: "Role không hợp lệ!" });
    }

    db.run("UPDATE users SET role = ? WHERE id = ?", [role, targetId], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: `Đã cập nhật người dùng thành: ${role.toUpperCase()}` });
    });
};

// ============================================================
// 4. CHỨC NĂNG ĐỔI MẬT KHẨU
// ============================================================
exports.changePassword = (req, res) => {
    const { id, currentPassword, newPassword } = req.body;

    if (!id || !currentPassword || !newPassword) {
        return res.status(400).json({ error: "Vui lòng nhập đủ: ID, Mật khẩu cũ và Mật khẩu mới" });
    }

    db.get("SELECT password FROM users WHERE id = ?", [id], (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!user) return res.status(404).json({ error: "Người dùng không tồn tại" });

        const currentHash = hashMD5(currentPassword);
        
        if (currentHash !== user.password) {
            return res.status(400).json({ error: "Mật khẩu cũ không chính xác!" });
        }

        const newHash = hashMD5(newPassword);

        db.run("UPDATE users SET password = ? WHERE id = ?", [newHash, id], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Đổi mật khẩu thành công! Vui lòng đăng nhập lại." });
        });
    });
};

// ============================================================
// 5. [MỚI] CHỨC NĂNG LỊCH SỬ NGHE NHẠC
// ============================================================

// API: Lưu lịch sử (Gọi khi bấm Play)
exports.addToHistory = (req, res) => {
    // Lấy User ID: Ưu tiên từ token (req.user), middleware (req.userId) hoặc header (x-user-id)
    const userId = req.user ? req.user.id : (req.userId || req.headers['x-user-id']);
    const { song_id, played_at } = req.body;

    if (!userId) return res.status(401).json({ error: "Chưa xác thực người dùng (Thiếu User ID)" });
    if (!song_id) return res.status(400).json({ error: "Thiếu ID bài hát" });

    // Dùng thời gian client gửi lên hoặc lấy giờ hiện tại
    const time = played_at || new Date().toISOString();

    const sql = "INSERT INTO history (user_id, song_id, played_at) VALUES (?, ?, ?)";
    
    db.run(sql, [userId, song_id, time], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Đã lưu lịch sử", historyId: this.lastID });
    });
};

// API: Lấy danh sách lịch sử
exports.getHistory = (req, res) => {
    const userId = req.user ? req.user.id : (req.userId || req.headers['x-user-id']);

    if (!userId) return res.status(401).json({ error: "Chưa xác thực người dùng" });

    // Join bảng history với songs để lấy thông tin chi tiết
    const sql = `
        SELECT h.id as history_id, h.played_at, 
               s.id, s.title, s.artist, s.genre, s.image_path, s.file_path, s.video_path
        FROM history h
        JOIN songs s ON h.song_id = s.id
        WHERE h.user_id = ?
        ORDER BY h.played_at DESC
    `;

    db.all(sql, [userId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        // Xử lý URL ảnh/nhạc để trả về link đầy đủ
        const protocol = req.protocol;
        const host = req.get('host');

        const historyList = rows.map(song => ({
            ...song,
            image_url: (!song.image_path || song.image_path.trim() === "") 
                ? "https://via.placeholder.com/150" 
                : (song.image_path.startsWith('http') ? song.image_path : `${protocol}://${host}/public/images/${song.image_path}`),
            stream_url: `${protocol}://${host}/api/stream/${song.id}`,
            video_url: song.video_path ? `${protocol}://${host}/api/stream-video/${song.id}` : null
        }));

        res.json({ data: historyList });
    });
};