// DOM元素
const importForm = document.getElementById('import-form');
const importResult = document.getElementById('import-result');
const callBtn = document.getElementById('call-btn');
const clearBtn = document.getElementById('clear-btn');
const callResult = document.getElementById('call-result');
const callCount = document.getElementById('call-count');
const historyList = document.getElementById('history-list');
const statsContent = document.getElementById('stats-content');

// 初始化页面
function initPage() {
    updateCallCount();
    loadHistory();
    loadStats();
}

// 更新点名计数
function updateCallCount() {
    fetch('/api/history')
        .then(response => response.json())
        .then(history => {
            callCount.textContent = `已点名: ${history.length}`;
        })
        .catch(error => console.error('Error:', error));
}

// 加载历史记录
function loadHistory() {
    fetch('/api/history')
        .then(response => response.json())
        .then(history => {
            if (history.length === 0) {
                historyList.innerHTML = '<div class="history-placeholder">暂无历史记录</div>';
                return;
            }
            
            historyList.innerHTML = '';
            history.forEach(item => {
                const historyItem = document.createElement('div');
                historyItem.className = 'history-item';
                historyItem.innerHTML = `
                    <div class="history-name">${item.name}</div>
                    <div class="history-time">${item.time}</div>
                `;
                historyList.appendChild(historyItem);
            });
        })
        .catch(error => console.error('Error:', error));
}

// 加载统计数据
function loadStats() {
    fetch('/api/stats')
        .then(response => response.json())
        .then(stats => {
            if (stats.total_students === 0) {
                statsContent.innerHTML = '<div class="stats-placeholder">暂无统计数据</div>';
                return;
            }
            
            // 更新统计内容
            statsContent.innerHTML = `
                <div class="stats-item">
                    <span class="stats-label">学生总数:</span>
                    <span class="stats-value">${stats.total_students}</span>
                </div>
                <div class="stats-item">
                    <span class="stats-label">总点名次数:</span>
                    <span class="stats-value">${stats.total_calls}</span>
                </div>
                <div class="stats-item">
                    <span class="stats-label">平均每人被点:</span>
                    <span class="stats-value">${(stats.total_calls / stats.total_students).toFixed(1)}次</span>
                </div>
            `;
            
            // 绘制图表
            drawStatsChart(stats);
        })
        .catch(error => console.error('Error:', error));
}

// 绘制统计图表
function drawStatsChart(stats) {
    const ctx = document.createElement('canvas');
    ctx.className = 'stats-chart';
    statsContent.appendChild(ctx);
    
    // 准备图表数据
    const labels = stats.student_stats.slice(0, 10).map(item => item.name);
    const data = stats.student_stats.slice(0, 10).map(item => item.count);
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: '被点次数',
                data: data,
                backgroundColor: 'rgba(100, 255, 218, 0.6)',
                borderColor: 'rgba(100, 255, 218, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(136, 146, 176, 0.1)'
                    },
                    ticks: {
                        color: 'rgba(136, 146, 176, 0.8)'
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: 'rgba(136, 146, 176, 0.8)',
                        maxRotation: 45,
                        minRotation: 45
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

// 导入文件表单提交
importForm.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const formData = new FormData(this);
    
    fetch('/api/import', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            importResult.className = 'result success';
            importResult.textContent = `成功导入 ${data.count} 名学生`;
            // 清空表单
            this.reset();
            // 重新加载统计数据
            loadStats();
        } else {
            importResult.className = 'result error';
            importResult.textContent = data.error;
        }
        
        // 3秒后清空结果
        setTimeout(() => {
            importResult.textContent = '';
            importResult.className = 'result';
        }, 3000);
    })
    .catch(error => {
        importResult.className = 'result error';
        importResult.textContent = '导入失败，请重试';
        console.error('Error:', error);
    });
});

// 点名按钮点击事件
callBtn.addEventListener('click', function() {
    // 禁用按钮防止重复点击
    callBtn.disabled = true;
    callBtn.textContent = '点名中...';
    
    // 显示加载动画
    callResult.innerHTML = `
        <div class="call-loading">
            <div class="loading-spinner"></div>
            <div class="loading-text">正在随机选择...</div>
        </div>
    `;
    
    // 模拟随机滚动效果
    let rollCount = 0;
    const maxRolls = 20;
    const rollInterval = setInterval(() => {
        fetch('/api/students')
            .then(response => response.json())
            .then(students => {
                if (students.length === 0) {
                    clearInterval(rollInterval);
                    callBtn.disabled = false;
                    callBtn.textContent = '开始点名';
                    callResult.innerHTML = '<div class="result-placeholder">学生列表为空，请先导入学生名单</div>';
                    return;
                }
                
                const randomIndex = Math.floor(Math.random() * students.length);
                const randomStudent = students[randomIndex];
                
                callResult.innerHTML = `
                    <div class="call-name">${randomStudent.name}</div>
                `;
                
                rollCount++;
                if (rollCount >= maxRolls) {
                    clearInterval(rollInterval);
                    // 发送点名请求
                    fetch('/api/call', {
                        method: 'POST'
                    })
                    .then(response => response.json())
                    .then(data => {
                        if (data.error) {
                            callResult.innerHTML = `<div class="result-placeholder">${data.error}</div>`;
                        } else {
                            // 显示最终结果
                            callResult.innerHTML = `
                                <div class="call-name">${data.name}</div>
                                <div class="call-info">已被点到 ${data.count} 次</div>
                            `;
                            
                            // 添加动画效果
                            const callNameElement = callResult.querySelector('.call-name');
                            callNameElement.style.animation = 'glow 2s ease-in-out infinite alternate';
                            
                            // 更新页面数据
                            updateCallCount();
                            loadHistory();
                            loadStats();
                        }
                        
                        // 恢复按钮
                        callBtn.disabled = false;
                        callBtn.textContent = '开始点名';
                    })
                    .catch(error => {
                        console.error('Error:', error);
                        callBtn.disabled = false;
                        callBtn.textContent = '开始点名';
                        callResult.innerHTML = '<div class="result-placeholder">点名失败，请重试</div>';
                    });
                }
            })
            .catch(error => {
                console.error('Error:', error);
                clearInterval(rollInterval);
                callBtn.disabled = false;
                callBtn.textContent = '开始点名';
            });
    }, 100);
});


// 清空按钮点击事件
clearBtn.addEventListener('click', function() {
    if (confirm('确定要清空所有数据吗？此操作不可恢复。')) {
        fetch('/api/clear', {
            method: 'POST'
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // 重置页面
                callResult.innerHTML = '<div class="result-placeholder">点击开始点名</div>';
                callCount.textContent = '已点名: 0';
                historyList.innerHTML = '<div class="history-placeholder">暂无历史记录</div>';
                statsContent.innerHTML = '<div class="stats-placeholder">暂无统计数据</div>';
                
                // 显示成功提示
                const result = document.createElement('div');
                result.className = 'result success';
                result.textContent = '数据已清空';
                result.style.position = 'fixed';
                result.style.top = '20px';
                result.style.right = '20px';
                result.style.zIndex = '1000';
                document.body.appendChild(result);
                
                // 3秒后移除提示
                setTimeout(() => {
                    result.remove();
                }, 3000);
            }
        })
        .catch(error => {
            console.error('Error:', error);
        });
    }
});

// 添加CSS样式用于加载动画
const style = document.createElement('style');
style.textContent = `
    .call-loading {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
    }
    
    .loading-spinner {
        width: 60px;
        height: 60px;
        border: 4px solid rgba(100, 255, 218, 0.2);
        border-top: 4px solid #64ffda;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin-bottom: 20px;
    }
    
    .loading-text {
        color: #8892b0;
        font-size: 1.1rem;
    }
    
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
`;
document.head.appendChild(style);

// 页面加载完成后初始化
window.onload = initPage;