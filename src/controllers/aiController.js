/**
 * src/controllers/aiController.js
 * PHIÊN BẢN: DJ AI + Python + YouTube
 * Logic: ChatGPT lọc từ khóa -> Gửi cho Python tìm -> Nếu rỗng thì tìm YouTube
 */
const db = require('../config/database');
const { spawn } = require('child_process');
const youtubesearchapi = require("youtube-search-api");
const OpenAI = require('openai');

// 👇 DÁN KEY MỚI CỦA BẠN VÀO ĐÂY (Key cũ trong code bạn gửi đã bị lỗi 401)
const openai = new OpenAI({
    apiKey: "" 
});

exports.searchByEmotion = async (req, res) => {
    try {
        const userText = req.body.text; 
        if (!userText) return res.status(400).json({ error: "Chưa nhập nội dung" });

        // =========================================================
        // BƯỚC 1: GỌI OPENAI (Prompt "DJ Âm Nhạc" của bạn)
        // =========================================================
        let refinedKeyword = userText; // Mặc định dùng từ gốc nếu AI lỗi
        let aiMessage = "";

        try {
            const completion = await openai.chat.completions.create({
                model: "gpt-4o-mini", // Model nhanh & rẻ
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

            // Lấy kết quả từ ChatGPT (VD: "buồn, thất tình, ballad")
            const textResponse = completion.choices[0].message.content;
            
            // Làm sạch chuỗi (bỏ dấu chấm câu thừa nếu có)
            refinedKeyword = textResponse.replace(/\./g, '');
            
            aiMessage = `DJ AI đã lọc từ khóa: "${refinedKeyword}"`;
            console.log(`🤖 OpenAI: "${userText}" -> "${refinedKeyword}"`);

        } catch (openaiError) {
            console.error("⚠️ Lỗi OpenAI (Sẽ dùng từ khóa gốc):", openaiError.message);
            aiMessage = "AI đang bận, đang tìm kiếm trực tiếp...";
            // Nếu lỗi Key (401) hoặc hết tiền (429), code sẽ tự động chạy tiếp xuống dưới với 'userText' gốc
        }

        // =========================================================
        // BƯỚC 2: GỬI TỪ KHÓA (ĐÃ LỌC) VÀO PYTHON (Thay cho SQL LIKE cũ)
        // =========================================================
        // Lý do: Python TF-IDF tìm thông minh hơn SQL LIKE
        const pythonProcess = spawn('python', ['recommend_engine.py', refinedKeyword]);
        
        let dataString = '';

        pythonProcess.stdout.on('data', (data) => {
            dataString += data.toString();
        });

        pythonProcess.on('close', async (code) => {
            try {
                const recommendedIds = JSON.parse(dataString || "[]");

                // --- TRƯỜNG HỢP A: TÌM THẤY TRONG MÁY (LOCAL) ---
                if (recommendedIds.length > 0) {
                    const placeholders = recommendedIds.map(() => '?').join(',');
                    const sql = `SELECT * FROM songs WHERE id IN (${placeholders})`;

                    db.all(sql, recommendedIds, (err, rows) => {
                        if (err) return res.status(500).json({ error: err.message });

                        // Sắp xếp theo đúng thứ tự gợi ý
                        const sortedSongs = recommendedIds.map(id => rows.find(s => s.id === id)).filter(s => s);
                        
                        const protocol = req.protocol;
                        const host = req.get('host');
                        
                        const finalData = sortedSongs.map(song => ({
                            ...song,
                            is_youtube: false,
                            image_url: (!song.image_path) ? "https://via.placeholder.com/150" : (song.image_path.startsWith('http') ? song.image_path : `${protocol}://${host}/public/images/${song.image_path}`),
                            stream_url: `${protocol}://${host}/api/stream/${song.id}`,
                            video_url: song.video_path ? `${protocol}://${host}/api/stream-video/${song.id}` : null
                        }));

                        return res.json({ 
                            ai_analysis: [aiMessage, "Đã tìm thấy trong thư viện"], 
                            source: "local",
                            data: finalData 
                        });
                    });
                } 
                
                // --- TRƯỜNG HỢP B: KHÔNG TÌM THẤY -> TÌM YOUTUBE ---
                else {
                    console.log(`Python không thấy. Tìm YouTube cho: '${refinedKeyword}'`);
                    
                    const ytData = await youtubesearchapi.GetListByKeyword(`Bài hát ${refinedKeyword}`, false, 5);
                    
                    const youtubeSongs = ytData.items.map(item => ({
                        id: item.id,                  
                        title: item.title,            
                        artist: item.channelTitle,    
                        genre: "YouTube Result",
                        year: new Date().getFullYear(),
                        image_url: item.thumbnail.thumbnails[0].url, 
                        is_youtube: true,
                        video_url: `https://www.youtube.com/embed/${item.id}?autoplay=1` 
                    }));

                    return res.json({ 
                        ai_analysis: [aiMessage, "Không có trong máy -> Đề xuất từ YouTube"], 
                        source: "youtube",
                        data: youtubeSongs 
                    });
                }

            } catch (parseError) {
                console.error("Lỗi xử lý JSON:", parseError);
                return res.json({ ai_analysis: ["Lỗi hệ thống AI"], data: [] });
            }
        });

    } catch (error) {
        res.status(500).json({ error: "Lỗi Server: " + error.message });
    }
};

// Hàm Recommendation phụ (Giữ nguyên)
exports.getRecommendations = (req, res) => { res.json({data:[]}); };