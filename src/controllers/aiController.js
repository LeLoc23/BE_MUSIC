/**
 * src/controllers/aiController.js
 * PHIÊN BẢN: ULTIMATE HYBRID COMBINED
 * 1. ChatGPT lọc từ khóa.
 * 2. Tìm song song: Python (Local) + YouTube API.
 * 3. Gộp kết quả trả về cả hai.
 */
const db = require('../config/database');
const { spawn } = require('child_process');
const youtubesearchapi = require("youtube-search-api");
const OpenAI = require('openai');

// CẤU HÌNH OPENAI (DÁN KEY CỦA BẠN VÀO ĐÂY)
const openai = new OpenAI({
    apiKey: "" 
});

exports.searchByEmotion = async (req, res) => {
    try {
        const userText = req.body.text; 
        if (!userText) return res.status(400).json({ error: "Chưa nhập nội dung" });

        // =========================================================
        // BƯỚC 1: HỎI CHATGPT ĐỂ LẤY TỪ KHÓA
        // =========================================================
        let refinedKeyword = userText; 
        let aiMessage = "";

        try {
            const completion = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "system",
                        content: "Bạn là DJ âm nhạc. Hãy rút gọn câu nói của người dùng thành 3-5 từ khóa quan trọng nhất để tìm bài hát (tên bài, ca sĩ, thể loại, tâm trạng). Chỉ trả về từ khóa."
                    },
                    { role: "user", content: `Người dùng: "${userText}"` }
                ],
                temperature: 0.5,
            });

            refinedKeyword = completion.choices[0].message.content.replace(/[.,]/g, '');
            aiMessage = `ChatGPT hiểu bạn: "${refinedKeyword}"`;
            console.log(`🤖 OpenAI: "${userText}" -> "${refinedKeyword}"`);

        } catch (openaiError) {
            console.error("⚠️ Lỗi OpenAI (Dùng từ khóa gốc):", openaiError.message);
            aiMessage = "Tìm kiếm trực tiếp (AI đang bận)";
        }

        // =========================================================
        // BƯỚC 2: GỌI PYTHON ĐỂ TÌM TRONG DB (LOCAL)
        // =========================================================
        const pythonProcess = spawn('python', ['recommend_engine.py', refinedKeyword]);
        
        let dataString = '';

        pythonProcess.stdout.on('data', (data) => {
            dataString += data.toString();
        });

        pythonProcess.on('close', async (code) => {
            try {
                // --- TÁC VỤ 1: LẤY KẾT QUẢ TỪ PYTHON (LOCAL) ---
                const recommendedIds = JSON.parse(dataString || "[]");
                
                const getLocalSongs = new Promise((resolve) => {
                    if (recommendedIds.length === 0) return resolve([]);

                    const placeholders = recommendedIds.map(() => '?').join(',');
                    const sql = `SELECT * FROM songs WHERE id IN (${placeholders})`;

                    db.all(sql, recommendedIds, (err, rows) => {
                        if (err || !rows) return resolve([]);

                        const protocol = req.protocol;
                        const host = req.get('host');
                        
                        // Sắp xếp theo thứ tự gợi ý
                        const sorted = recommendedIds.map(id => rows.find(s => s.id === id)).filter(s => s);
                        
                        const formatted = sorted.map(song => ({
                            ...song,
                            is_youtube: false,
                            image_url: (!song.image_path) ? "https://via.placeholder.com/150" : (song.image_path.startsWith('http') ? song.image_path : `${protocol}://${host}/public/images/${song.image_path}`),
                            stream_url: `${protocol}://${host}/api/stream/${song.id}`,
                            video_url: song.video_path ? `${protocol}://${host}/api/stream-video/${song.id}` : null
                        }));
                        resolve(formatted);
                    });
                });

                // --- TÁC VỤ 2: LẤY KẾT QUẢ TỪ YOUTUBE ---
                const getYoutubeSongs = async () => {
                    try {
                        const ytData = await youtubesearchapi.GetListByKeyword(`Bài hát ${refinedKeyword}`, false, 5);
                        return ytData.items.map(item => ({
                            id: item.id,                  
                            title: item.title,            
                            artist: item.channelTitle,    
                            genre: "YouTube Result",
                            year: new Date().getFullYear(),
                            image_url: item.thumbnail.thumbnails[0].url, 
                            is_youtube: true,
                            video_url: `https://www.youtube.com/embed/${item.id}?autoplay=1` 
                        }));
                    } catch (e) {
                        console.error("Lỗi tìm YouTube:", e);
                        return [];
                    }
                };

                // --- BƯỚC 3: GỘP KẾT QUẢ (COMBINE) ---
                const [localResults, youtubeResults] = await Promise.all([getLocalSongs, getYoutubeSongs()]);
                const combinedData = [...localResults, ...youtubeResults];

                return res.json({ 
                    ai_analysis: [aiMessage, `Tìm thấy ${localResults.length} bài trong máy & ${youtubeResults.length} bài YouTube`], 
                    source: "combined",
                    data: combinedData 
                });

            } catch (parseError) {
                console.error("Lỗi xử lý:", parseError);
                return res.json({ ai_analysis: ["Lỗi hệ thống"], data: [] });
            }
        });

    } catch (error) {
        res.status(500).json({ error: "Lỗi Server" });
    }
};

exports.getRecommendations = (req, res) => { res.json({data:[]}); };