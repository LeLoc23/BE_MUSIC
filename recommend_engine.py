# recommend_engine.py
import sys
import json
import sqlite3
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

# Ngưỡng chấp nhận (0.0 -> 1.0). Nếu độ giống thấp hơn số này coi như không tìm thấy.
# Đặt 0.05 để nếu có chút liên quan cũng lấy, nếu không liên quan tí nào thì bỏ.
THRESHOLD = 0.05 

if len(sys.argv) < 2:
    print(json.dumps([]))
    sys.exit()

user_input = sys.argv[1] # Ví dụ: "buồn", "vui", "nhẹ nhàng"

try:
    conn = sqlite3.connect('database.db')
    # Lấy dữ liệu: Gộp Tên + Thể loại + Lời bài hát để phân tích toàn diện
    query = "SELECT id, title, IFNULL(genre, '') || ' ' || IFNULL(lyrics, '') as content FROM songs"
    df = pd.read_sql_query(query, conn)
    conn.close()

    if df.empty:
        print(json.dumps([]))
        sys.exit()

    # Thêm câu nhập của user vào cuối dataframe để so sánh
    user_row = pd.DataFrame({'id': [-1], 'title': ['Input'], 'content': [user_input]})
    df_combined = pd.concat([user_row, df], ignore_index=True)

    # Tính toán vector
    tfidf = TfidfVectorizer(stop_words='english')
    try:
        tfidf_matrix = tfidf.fit_transform(df_combined['content'])
    except ValueError:
        # Lỗi này xảy ra nếu từ điển rỗng (user nhập từ quá lạ)
        print(json.dumps([]))
        sys.exit()

    # Tính độ tương đồng của dòng User (index 0) với toàn bộ bài hát
    cosine_sim = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix)

    # Lấy kết quả
    sim_scores = list(enumerate(cosine_sim[0]))
    
    # Bỏ qua phần tử đầu tiên (chính là user input)
    sim_scores = sim_scores[1:]
    
    # Sắp xếp điểm cao nhất lên đầu
    sim_scores = sorted(sim_scores, key=lambda x: x[1], reverse=True)

    result_ids = []
    for i, score in sim_scores[:5]: # Lấy top 5
        if score > THRESHOLD: # Chỉ lấy bài nào có độ giống > ngưỡng
            # i-1 vì df gốc bị lệch 1 dòng do thêm user_row
            real_index = i - 1
            if real_index >= 0:
                result_ids.append(int(df.iloc[real_index]['id']))

    print(json.dumps(result_ids))

except Exception as e:
    print(json.dumps([]))