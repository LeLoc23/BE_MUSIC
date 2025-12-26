/**
 * MAIN SERVER ENTRY POINT
 */
require('dotenv').config();

console.log("1. Bắt đầu chạy Server..."); // Thêm dòng này ở dòng 1
const express = require('express');
const cors = require('cors');
const path = require('path');

// Import Routes từ thư mục src
// Đảm bảo đường dẫn này đúng với cấu trúc thư mục bạn đã tạo
const apiRoutes = require('./src/routes/api'); 

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Cấu hình thư mục public
app.use('/public', express.static(path.resolve(__dirname, 'public')));

// Gắn API Routes
app.use('/api', apiRoutes);

// --- QUAN TRỌNG: ĐOẠN MÃ NÀY GIÚP SERVER CHẠY ---
// Nếu thiếu đoạn này, server chỉ kết nối DB rồi tắt.
app.listen(PORT, () => {
    console.log(`---------------------------------------------`);
    console.log(`🚀 Server đang chạy tại: http://localhost:${PORT}`);
    console.log(`📂 API đã được cấu trúc lại vào thư mục src/`);
    console.log(`---------------------------------------------`);
});