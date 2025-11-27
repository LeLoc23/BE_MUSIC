const db = require('../config/database');

exports.register = (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Thiếu thông tin" });

    const sql = "INSERT INTO users (username, password, role) VALUES (?, ?, 'user')";
    db.run(sql, [username, password], function(err) {
        if (err) {
            if (err.message.includes('UNIQUE')) return res.status(400).json({ error: "Tên đăng nhập đã tồn tại" });
            return res.status(500).json({ error: err.message });
        }
        res.json({ message: "Đăng ký thành công!" });
    });
};

exports.login = (req, res) => {
    const { username, password } = req.body;
    db.get("SELECT * FROM users WHERE username = ? AND password = ?", [username, password], (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!user) return res.status(401).json({ error: "Sai tài khoản hoặc mật khẩu" });
        res.json({ 
            message: "Thành công", 
            user: { id: user.id, username: user.username, role: user.role } 
        });
    });
};