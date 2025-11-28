/**
 * src/controllers/authController.js
 * Xử lý Đăng ký, Đăng nhập và Quản lý User (Admin)
 */

const db = require('../config/database');

// 1. ĐĂNG KÝ
exports.register = (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Thiếu thông tin đăng nhập" });

    // Mặc định tạo user thường (role='user') và trạng thái mở (is_locked=0)
    const sql = "INSERT INTO users (username, password, role, is_locked) VALUES (?, ?, 'user', 0)";
    
    db.run(sql, [username, password], function(err) {
        if (err) {
            if (err.message.includes('UNIQUE')) return res.status(400).json({ error: "Tên đăng nhập đã tồn tại" });
            return res.status(500).json({ error: err.message });
        }
        res.json({ message: "Đăng ký thành công! Hãy đăng nhập." });
    });
};

// 2. ĐĂNG NHẬP (CÓ KIỂM TRA BỊ KHÓA)
exports.login = (req, res) => {
    const { username, password } = req.body;
    
    db.get("SELECT * FROM users WHERE username = ? AND password = ?", [username, password], (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        
        // Kiểm tra sai tài khoản/mật khẩu
        if (!user) {
            return res.status(401).json({ error: "Sai tài khoản hoặc mật khẩu" });
        }

        // --- QUAN TRỌNG: KIỂM TRA TÀI KHOẢN CÓ BỊ KHÓA KHÔNG ---
        if (user.is_locked === 1) {
            return res.status(403).json({ error: "Tài khoản của bạn đã bị KHÓA bởi Admin!" });
        }

        // Đăng nhập thành công
        res.json({ 
            message: "Thành công", 
            user: { id: user.id, username: user.username, role: user.role } 
        });
    });
};

// ============================================================
// 3. CÁC HÀM QUẢN LÝ DÀNH CHO ADMIN (GIỮ LẠI ĐỂ ADMIN DÙNG)
// ============================================================

// Lấy danh sách tất cả user
exports.getAllUsers = (req, res) => {
    db.all("SELECT id, username, role, is_locked FROM users", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ data: rows });
    });
};

// Xóa user (Xóa sạch dữ liệu liên quan)
exports.deleteUser = (req, res) => {
    const targetId = req.params.id;
    if (parseInt(targetId) === req.userId) return res.status(400).json({ error: "Không thể tự xóa chính mình!" });

    db.serialize(() => {
        db.run("DELETE FROM playlists WHERE user_id = ?", [targetId]);
        db.run("DELETE FROM history WHERE user_id = ?", [targetId]);
        db.run("DELETE FROM users WHERE id = ?", [targetId], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Đã xóa người dùng thành công" });
        });
    });
};

// Khóa / Mở khóa user
exports.toggleLockUser = (req, res) => {
    const targetId = req.params.id;
    if (parseInt(targetId) === req.userId) return res.status(400).json({ error: "Không thể tự khóa chính mình!" });

    db.get("SELECT is_locked FROM users WHERE id = ?", [targetId], (err, user) => {
        if (!user) return res.status(404).json({ error: "User không tồn tại" });
        
        const newStatus = user.is_locked === 1 ? 0 : 1; // Đảo trạng thái
        
        db.run("UPDATE users SET is_locked = ? WHERE id = ?", [newStatus, targetId], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: newStatus === 1 ? "Đã KHÓA tài khoản" : "Đã MỞ KHÓA tài khoản" });
        });
    });
};