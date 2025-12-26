/**
 * src/controllers/authController.js
 * FINAL VERSION
 * - Đăng ký (Lưu ngày tạo + Ràng buộc độ dài mật khẩu)
 * - Đăng nhập (MD5 + Check khóa)
 * - Quản lý User (Admin)
 * - Đổi mật khẩu (Ràng buộc độ dài)
 * - Lịch sử nghe nhạc (Tự động tăng view)
 */

const db = require('../config/database');
const crypto = require('crypto');

// --- HÀM PHỤ: Mã hóa MD5 ---
function hashMD5(password) {
    return crypto.createHash('md5').update(password).digest('hex');
}

// ============================================================
// 1. CHỨC NĂNG XÁC THỰC (AUTH)
// ============================================================

// ĐĂNG KÝ
exports.register = (req, res) => {
    const { username, password } = req.body;
    
    // 1. Kiểm tra thiếu thông tin
    if (!username || !password) return res.status(400).json({ error: "Thiếu thông tin đăng nhập" });

    // 2. [MỚI] Kiểm tra độ dài mật khẩu
    if (password.length < 6) {
        return res.status(400).json({ error: "Mật khẩu phải có tối thiểu 6 ký tự!" });
    }

    // 3. Mã hóa mật khẩu
    const hashedPassword = hashMD5(password);

    // 4. Lấy thời gian hiện tại
    const created_at = new Date().toISOString();

    // 5. Lưu vào Database
    const sql = "INSERT INTO users (username, password, role, is_locked, created_at) VALUES (?, ?, 'user', 0, ?)";
    
    db.run(sql, [username, hashedPassword, created_at], function(err) {
        if (err) {
            if (err.message.includes('UNIQUE')) return res.status(400).json({ error: "Tên đăng nhập đã tồn tại" });
            return res.status(500).json({ error: err.message });
        }
        res.json({ message: "Đăng ký thành công! Hãy đăng nhập." });
    });
};

// ĐĂNG NHẬP
exports.login = (req, res) => {
    const { username, password } = req.body;
    
    // Tìm user theo username
    db.get("SELECT * FROM users WHERE username = ?", [username], (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        
        // Nếu không tìm thấy user
        if (!user) return res.status(401).json({ error: "Sai tài khoản hoặc mật khẩu" });

        // Kiểm tra tài khoản bị khóa
        if (user.is_locked === 1) {
            return res.status(403).json({ error: "Tài khoản của bạn đã bị KHÓA bởi Admin!" });
        }

        // So sánh mật khẩu (MD5)
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
// 2. CÁC HÀM QUẢN LÝ DÀNH CHO ADMIN
// ============================================================

// Lấy danh sách tất cả user (Kèm ngày tạo)
exports.getAllUsers = (req, res) => {
    db.all("SELECT id, username, role, is_locked, created_at FROM users ORDER BY created_at DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ data: rows });
    });
};

// Xóa user
exports.deleteUser = (req, res) => {
    const targetId = req.params.id;
    // Kiểm tra chặn xóa chính mình
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
// 3. CHỨC NĂNG ĐỔI MẬT KHẨU
// ============================================================
exports.changePassword = (req, res) => {
    const { id, currentPassword, newPassword } = req.body;

    // 1. Kiểm tra thiếu thông tin
    if (!id || !currentPassword || !newPassword) {
        return res.status(400).json({ error: "Vui lòng nhập đủ: ID, Mật khẩu cũ và Mật khẩu mới" });
    }

    // 2. [MỚI] Kiểm tra độ dài mật khẩu mới
    if (newPassword.length < 6) {
        return res.status(400).json({ error: "Mật khẩu mới phải có tối thiểu 6 ký tự!" });
    }

    db.get("SELECT password FROM users WHERE id = ?", [id], (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!user) return res.status(404).json({ error: "Người dùng không tồn tại" });

        const currentHash = hashMD5(currentPassword);
        
        // 3. Kiểm tra mật khẩu cũ
        if (currentHash !== user.password) {
            return res.status(400).json({ error: "Mật khẩu cũ không chính xác!" });
        }

        // 4. Cập nhật mật khẩu mới
        const newHash = hashMD5(newPassword);

        db.run("UPDATE users SET password = ? WHERE id = ?", [newHash, id], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Đổi mật khẩu thành công! Vui lòng đăng nhập lại." });
        });
    });
};

// ============================================================
// 4. CHỨC NĂNG LỊCH SỬ & THỐNG KÊ 
// ============================================================

// API: Lưu lịch sử (Gọi khi bấm Play)
exports.addToHistory = (req, res) => {
    const userId = req.user ? req.user.id : (req.userId || req.headers['x-user-id']);
    const { song_id, played_at } = req.body;

    if (!userId) return res.status(401).json({ error: "Chưa xác thực người dùng" });
    if (!song_id) return res.status(400).json({ error: "Thiếu ID bài hát" });

    const time = played_at || new Date().toISOString();

    // 1. Thêm vào history
    const sqlHistory = "INSERT INTO history (user_id, song_id, played_at) VALUES (?, ?, ?)";
    
    db.run(sqlHistory, [userId, song_id, time], function(err) {
        if (err) return res.status(500).json({ error: "Lỗi lưu lịch sử: " + err.message });
        
        const historyId = this.lastID;

        // 2. Tăng lượt nghe trong bảng songs
        const sqlUpdateCount = "UPDATE songs SET listen_count = listen_count + 1 WHERE id = ?";
        
        db.run(sqlUpdateCount, [song_id], (err2) => {
            if (err2) console.error("Lỗi cập nhật listen_count:", err2.message);
            
            res.json({ message: "Đã lưu lịch sử và tăng lượt nghe", historyId: historyId });
        });
    });
};

// API: Lấy danh sách lịch sử
exports.getHistory = (req, res) => {
    const userId = req.user ? req.user.id : (req.userId || req.headers['x-user-id']);
    if (!userId) return res.status(401).json({ error: "Chưa xác thực người dùng" });

    const sql = `
        SELECT h.id as history_id, h.played_at, 
               s.id as song_id, s.title, s.artist, s.genre, s.image_path, s.file_path, s.video_path
        FROM history h
        JOIN songs s ON h.song_id = s.id
        WHERE h.user_id = ?
        ORDER BY h.played_at DESC
    `;

    db.all(sql, [userId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        const protocol = req.protocol;
        const host = req.get('host');

        const historyList = rows.map(song => ({
            ...song,
            image_url: (!song.image_path || song.image_path.trim() === "") 
                ? "https://via.placeholder.com/150" 
                : (song.image_path.startsWith('http') ? song.image_path : `${protocol}://${host}/public/images/${song.image_path}`),
            stream_url: `${protocol}://${host}/api/stream/${song.song_id}`,
            video_url: song.video_path ? `${protocol}://${host}/api/stream-video/${song.song_id}` : null
        }));

        res.json({ data: historyList });
    });
};