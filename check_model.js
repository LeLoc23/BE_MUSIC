const { GoogleGenerativeAI } = require("@google/generative-ai");

// 👇 DÁN KEY CỦA BẠN VÀO ĐÂY
const genAI = new GoogleGenerativeAI("AIzaSyB0de4y6mfEtrQOUYGMQUFmUnxj9frsCdM");

async function checkAvailableModels() {
  try {
    console.log("⏳ Đang hỏi Google danh sách Model...");
    
    // Thủ thuật: Gọi sai để lấy danh sách (hoặc dùng hàm list nếu thư viện hỗ trợ)
    // Tuy nhiên cách chắc ăn nhất với bản free là thử kết nối trực tiếp với model mới nhất
    
    const modelsToTry = ["gemini-1.5-flash", "gemini-pro", "gemini-1.0-pro"];
    
    for (const modelName of modelsToTry) {
        try {
            console.log(`\n👉 Đang thử model: ${modelName}`);
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent("Hello");
            const response = await result.response;
            console.log(`✅ THÀNH CÔNG! Bạn hãy dùng model: "${modelName}"`);
            console.log(`💬 Phản hồi: ${response.text()}`);
            return; // Tìm thấy cái chạy được là dừng luôn
        } catch (e) {
            console.log(`❌ ${modelName}: Không được (${e.status || e.message})`);
        }
    }
    
    console.log("\n⚠️ KHÔNG MODEL NÀO CHẠY ĐƯỢC. Vui lòng kiểm tra lại API KEY.");

  } catch (error) {
    console.error("Lỗi hệ thống:", error);
  }
}

checkAvailableModels();