import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score
import joblib
import os

print("🚀 BƯỚC 1: TẠO DỮ LIỆU LỊCH SỬ (MOCK DATA)...")
# Giả lập 2000 Task/Sprint từ quá khứ
np.random.seed(42)
n_samples = 2000

# 1. Cycle Time (Thời gian code): Từ 0.1 ngày đến 15 ngày
cycle_time = np.random.uniform(0.1, 15.0, n_samples)

# 2. Story Points (Độ lớn task): Chọn ngẫu nhiên trong dãy Fibonacci
sp = np.random.choice([1, 2, 3, 5, 8, 13], n_samples)

# 3. Bug Count (Số bug phát sinh): Từ 0 đến 5 bug
bug_count = np.random.randint(0, 6, n_samples)

# 4. Logic Quyết định (y) - Trễ hạn (1) hay Đúng hạn (0)?
# Xây dựng luật (Rule) ngầm để AI học: 
# Nếu làm lâu (>6 ngày), việc to (>5 SP) và nhiều bug (>2) thì khả năng fail cực cao.
is_delayed = []
for i in range(n_samples):
    risk_score = (cycle_time[i] * 1.5) + (sp[i] * 0.8) + (bug_count[i] * 2.5)
    # Thêm một chút nhiễu (noise) để dữ liệu giống thực tế
    risk_score += np.random.normal(0, 3) 
    
    if risk_score > 18:
        is_delayed.append(1) # 1 = Trễ hạn / Rủi ro cao
    else:
        is_delayed.append(0) # 0 = An toàn

# Đóng gói thành DataFrame (CSV)
df = pd.DataFrame({
    'cycle_time': cycle_time,
    'sp': sp,
    'bug_count': bug_count,
    'is_delayed': is_delayed
})

print(f"✅ Đã tạo xong {n_samples} dữ liệu mẫu.")
print(f"📊 Tỷ lệ trễ hạn: {df['is_delayed'].mean() * 100:.1f}%\n")

print("🧠 BƯỚC 2: BẮT ĐẦU HUẤN LUYỆN AI (RANDOM FOREST)...")
# Chia dữ liệu: 80% để học (Train), 20% để làm bài kiểm tra (Test)
X = df[['cycle_time', 'sp', 'bug_count']] # Đầu vào (Features)
y = df['is_delayed']                      # Kết quả (Target)

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Khởi tạo thuật toán AI (Rừng ngẫu nhiên với 100 cây quyết định)
model = RandomForestClassifier(n_estimators=100, random_state=42, max_depth=5)

# Bắt đầu dạy học
model.fit(X_train, y_train)

# Làm bài kiểm tra
y_pred = model.predict(X_test)
accuracy = accuracy_score(y_test, y_pred)
print(f"🎯 Điểm số bài kiểm tra (Độ chính xác của AI): {accuracy * 100:.2f}%")

# Lưu não bộ AI vào thư mục models/
os.makedirs("models", exist_ok=True)
model_path = "models/sprint_risk_model.pkl"
joblib.dump(model, model_path)
print(f"💾 Đã lưu 'bộ não' AI thành công tại: {model_path}")