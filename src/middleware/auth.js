exports.checkAdmin = (req, res, next) => {
    const role = req.headers['x-user-role']; 
    if (role !== 'admin') return res.status(403).json({ error: "Từ chối: Cần quyền Admin" });
    next();
};

exports.checkUser = (req, res, next) => {
    const userId = req.headers['x-user-id'];
    if (!userId) return res.status(401).json({ error: "Vui lòng đăng nhập" });
    req.userId = parseInt(userId);
    next();
};