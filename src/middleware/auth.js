// src/middleware/auth.js

// 1. Kiểm tra User thường (Đã đăng nhập)
exports.checkUser = (req, res, next) => {
    const userId = req.headers['x-user-id'];
    if (!userId) return res.status(401).json({ error: "Vui lòng đăng nhập" });
    req.userId = parseInt(userId);
    next();
};

// 2. Kiểm tra Admin (Quyền cao nhất)
exports.checkAdmin = (req, res, next) => {
    const role = req.headers['x-user-role']; 
    if (role !== 'admin') return res.status(403).json({ error: "Từ chối: Cần quyền Admin tối cao" });
    next();
};

// 3. Kiểm tra Manager 
exports.checkManager = (req, res, next) => {
    const role = req.headers['x-user-role'];
    // Cho phép nếu là 'admin' HOẶC 'manager'
    if (role === 'admin' || role === 'manager') {
        next();
    } else {
        return res.status(403).json({ error: "Từ chối: Cần quyền Quản lý" });
    }
};