from flask import Flask, render_template, request, jsonify, redirect, url_for
import pandas as pd
import random
import json
import os
import datetime

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key'

# 数据存储路径
STUDENTS_FILE = os.path.join('data', 'students.json')
HISTORY_FILE = os.path.join('data', 'history.json')

# 确保数据目录存在
os.makedirs('data', exist_ok=True)

# 初始化数据文件
def init_data_files():
    if not os.path.exists(STUDENTS_FILE):
        with open(STUDENTS_FILE, 'w', encoding='utf-8') as f:
            json.dump([], f, ensure_ascii=False)
    if not os.path.exists(HISTORY_FILE):
        with open(HISTORY_FILE, 'w', encoding='utf-8') as f:
            json.dump([], f, ensure_ascii=False)

# 加载学生数据
def load_students():
    with open(STUDENTS_FILE, 'r', encoding='utf-8') as f:
        return json.load(f)

# 保存学生数据
def save_students(students):
    with open(STUDENTS_FILE, 'w', encoding='utf-8') as f:
        json.dump(students, f, ensure_ascii=False, indent=2)

# 加载历史数据
def load_history():
    with open(HISTORY_FILE, 'r', encoding='utf-8') as f:
        return json.load(f)

# 保存历史数据
def save_history(history):
    with open(HISTORY_FILE, 'w', encoding='utf-8') as f:
        json.dump(history, f, ensure_ascii=False, indent=2)

# 导入Excel文件
def import_excel(file_path):
    try:
        df = pd.read_excel(file_path)
        students = []
        for _, row in df.iterrows():
            # 假设第一列是学生姓名
            name = str(row.iloc[0]).strip()
            if name and name != 'nan':
                students.append({'name': name, 'count': 0})
        return students
    except Exception as e:
        raise Exception(f"Excel导入失败: {str(e)}")

# 导入TXT文件
def import_txt(file_path):
    try:
        students = []
        with open(file_path, 'r', encoding='utf-8') as f:
            for line in f:
                name = line.strip()
                if name:
                    students.append({'name': name, 'count': 0})
        return students
    except Exception as e:
        raise Exception(f"TXT导入失败: {str(e)}")

# 随机点名
def random_call(students):
    if not students:
        return None
    # 按概率随机选择（被点到次数少的概率更高）
    weights = [1 / (student['count'] + 1) for student in students]
    selected = random.choices(students, weights=weights, k=1)[0]
    return selected

# 根路由
@app.route('/')
def index():
    return render_template('index.html')

# 获取学生列表
@app.route('/api/students', methods=['GET'])
def get_students():
    students = load_students()
    return jsonify(students)

# 导入学生名单
@app.route('/api/import', methods=['POST'])
def import_students():
    try:
        file = request.files['file']
        if not file:
            return jsonify({'error': '请选择文件'}), 400
        
        file_ext = os.path.splitext(file.filename)[1].lower()
        temp_path = os.path.join('data', 'temp_import.' + file_ext[1:])
        file.save(temp_path)
        
        if file_ext in ['.xlsx', '.xls']:
            new_students = import_excel(temp_path)
        elif file_ext == '.txt':
            new_students = import_txt(temp_path)
        else:
            os.remove(temp_path)
            return jsonify({'error': '不支持的文件格式'}), 400
        
        # 保存新学生数据
        save_students(new_students)
        os.remove(temp_path)
        
        return jsonify({'success': True, 'count': len(new_students)})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# 随机点名
@app.route('/api/call', methods=['POST'])
def call_student():
    students = load_students()
    selected = random_call(students)
    
    if not selected:
        return jsonify({'error': '学生列表为空'}), 400
    
    # 更新被点到次数
    for student in students:
        if student['name'] == selected['name']:
            student['count'] += 1
            break
    save_students(students)
    
    # 记录历史
    history = load_history()
    history.append({
        'name': selected['name'],
        'time': datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    })
    save_history(history)
    
    return jsonify({
        'name': selected['name'],
        'count': selected['count']
    })

# 获取历史记录
@app.route('/api/history', methods=['GET'])
def get_history():
    history = load_history()
    return jsonify(history[-50:])  # 返回最近50条记录

# 获取统计数据
@app.route('/api/stats', methods=['GET'])
def get_stats():
    students = load_students()
    history = load_history()
    
    # 计算总点名次数
    total_calls = len(history)
    
    # 计算每个学生的被点次数
    student_stats = []
    for student in students:
        student_stats.append({
            'name': student['name'],
            'count': student['count'],
            'percentage': (student['count'] / total_calls * 100) if total_calls > 0 else 0
        })
    
    # 按被点次数排序
    student_stats.sort(key=lambda x: x['count'], reverse=True)
    
    return jsonify({
        'total_students': len(students),
        'total_calls': total_calls,
        'student_stats': student_stats
    })

# 清空数据
@app.route('/api/clear', methods=['POST'])
def clear_data():
    save_students([])
    save_history([])
    return jsonify({'success': True})

if __name__ == '__main__':
    init_data_files()
    app.run(debug=True, host='0.0.0.0', port=5000)