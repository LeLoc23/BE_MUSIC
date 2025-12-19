/**
 * update_passwords.js
 * Script này dùng để cập nhật toàn bộ mật khẩu cũ (plain text) sang MD5
 */
const sqlite3 = require('sqlite3').verbose();
const crypto = require('crypto');

// Kết nối database cũ
const db = new sqlite3.Database('./database.db');

// Hàm mã hóa MD5
function hashMD5(password) {
    return crypto.createHash('md5').update(password).digest('hex');
}

console.log("⏳ Đang bắt đầu cập nhật mật khẩu...");

db.serialize(() => {
    // 1. Lấy tất cả user
    db.all("SELECT id, username, password FROM users", [], (err, rows) => {
        if (err) {
            console.error("Lỗi đọc database:", err);
            return;
        }

        let count = 0;
        rows.forEach((user) => {
            // Kiểm tra xem mật khẩu này đã là MD5 chưa?
            // MD5 luôn có độ dài 32 ký tự và chỉ chứa số + chữ cái a-f
            const isMD5 = (user.password.length === 32 && /^[0-9a-fA-F]+$/.test(user.password));

            if (isMD5) {
                console.log(`⏩ User [${user.username}] đã được mã hóa trước đó. Bỏ qua.`);
            } else {
                // Nếu chưa mã hóa -> Tiến hành mã hóa
                const newPass = hashMD5(user.password);
                
                db.run("UPDATE users SET password = ? WHERE id = ?", [newPass, user.id], (updateErr) => {
                    if (updateErr) console.error(`❌ Lỗi update user ${user.username}:`, updateErr);
                    else console.log(`✅ Đã mã hóa user [${user.username}]: ${user.password} -> ${newPass}`);
                });
                count++;
            }
        });
        
        // Lưu ý: Vì db.run là bất đồng bộ nên dòng này có thể hiện ra trước khi chạy xong hết.
        // Nhưng với database nhỏ thì không vấn đề gì.
        console.log(`\n--- Đã tìm thấy ${rows.length} user. Đang xử lý cập nhật... ---`);
    });
});

// Đợi vài giây cho chắc rồi đóng kết nối (vì SQLite nodejs không có Promise native ở bản này)
setTimeout(() => {
    db.close((err) => {
        if (!err) console.log("\n🎉 HOÀN TẤT! Database đã được cập nhật MD5.");
    });
}, 2000);