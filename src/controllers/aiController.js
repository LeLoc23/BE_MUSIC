/**
 * src/controllers/aiController.js
 * Phiên bản: Sử dụng OpenAI (ChatGPT)
 */
const db = require('../config/database');
const OpenAI = require('openai');

// 👇 DÁN KEY CỦA BẠN VÀO ĐÂY
const openai = new OpenAI({
    apiKey: "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" 
});

exports.searchByEmotion = async (req, res) => {
    try {
        const userText = req.body.text; 

        if (!userText) return res.status(400).json({ error: "Chưa nhập nội dung" });

        // 1. GỌI OPENAI ĐỂ PHÂN TÍCH
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini", // Model nhanh và rẻ nhất của OpenAI hiện tại
            messages: [
                {
                    role: "system",
                    content: "Bạn là một DJ âm nhạc. Nhiệm vụ: Trích xuất 3-5 từ khóa tiếng Việt quan trọng nhất từ câu nói của người dùng để tìm bài hát (tên bài, ca sĩ, tâm trạng, thể loại). Chỉ trả về các từ khóa ngăn cách bởi dấu phẩy. Không trả lời câu văn."
                },
                {
                    role: "user",
                    content: `Người dùng: "${userText}"`
                }
            ],
            temperature: 0.7,
        });

        const text = completion.choices[0].message.content; 
        
        // Tách từ khóa thành mảng
        const keywords = text.split(',').map(k => k.trim());
        console.log("🤖 OpenAI Keywords:", keywords);

        // 2. TÌM TRONG DATABASE (Logic giống cũ)
        let sql = "SELECT * FROM songs WHERE ";
        let params = [];
        let conditions = [];

        keywords.forEach(key => {
            conditions.push(`(title LIKE ? OR artist LIKE ? OR genre LIKE ? OR lyrics LIKE ?)`);
            params.push(`%${key}%`, `%${key}%`, `%${key}%`, `%${key}%`);
        });

        // Fallback: Tìm chính xác câu nhập
        if (conditions.length === 0) {
            conditions.push(`(title LIKE ? OR artist LIKE ?)`);
            params.push(`%${userText}%`, `%${userText}%`);
        }

        sql += conditions.join(" OR ");

        db.all(sql, params, (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            
            const protocol = req.protocol;
            const host = req.get('host');
            
            // Lọc trùng lặp ID (do dùng OR nhiều lần)
            const uniqueSongs = [];
            const map = new Map();
            for (const item of rows) {
                if(!map.has(item.id)){
                    map.set(item.id, true);
                    uniqueSongs.push(item);
                }
            }

            const songs = uniqueSongs.map(song => ({
                ...song,
                image_url: (!song.image_path || song.image_path.trim() === "") ? "https://via.placeholder.com/150" : (song.image_path.startsWith('http') ? song.image_path : `${protocol}://${host}/public/images/${song.image_path}`),
                stream_url: `${protocol}://${host}/api/stream/${song.id}`,
                video_url: song.video_path ? `${protocol}://${host}/api/stream-video/${song.id}` : null
            }));

            res.json({ 
                ai_analysis: keywords, 
                data: songs 
            });
        });

    } catch (error) {
        console.error("Lỗi OpenAI:", error);
        // Kiểm tra lỗi hạn mức (Quota)
        if (error.code === 'insufficient_quota') {
            return res.status(429).json({ error: "Hết tiền trong tài khoản OpenAI rồi!" });
        }
        res.status(500).json({ error: "Lỗi AI: " + error.message });
    }
};