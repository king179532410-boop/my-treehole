// 全局变量
let whispers = []; // 存储所有絮语
let currentScene = 'summer'; // 当前场景
// 背景图映射 + 场景名称
const sceneMap = {
  spring: { img: 'bg-spring.jpg', name: '春·夜晚' },
  summer: { img: 'bg-summer.jpg', name: '夏·夜晚' },
  autumn: { img: 'bg-autumn.jpg', name: '秋·夜晚' },
  winter: { img: 'bg-winter.jpg', name: '冬·夜晚' }
};
const sceneKeys = Object.keys(sceneMap); // 场景列表：spring/summer/autumn/winter

// 页面加载完成初始化
window.onload = function() {
  // 1. 加载本地絮语
  loadWhispers();
  // 2. 更新絮语数量
  updateWhisperCount();
  // 3. 绑定按钮事件
  bindEvents();
  // 4. 启动背景随机自动切换（每10秒换一次）
  startRandomBgSwitch();
  // 5. 初始化实时人数统计
  initRealTimeStats();
};

// 1. 背景随机自动切换（核心）
function startRandomBgSwitch() {
  // 立即切换一次
  switchRandomBg();
  // 每10秒切换一次（可改时间：1000=1秒）
  setInterval(switchRandomBg, 10000);
}

// 随机切换背景图
function switchRandomBg() {
  // 随机选一个场景（排除当前场景，避免重复）
  let randomKey = sceneKeys[Math.floor(Math.random() * sceneKeys.length)];
  while (randomKey === currentScene) {
    randomKey = sceneKeys[Math.floor(Math.random() * sceneKeys.length)];
  }
  // 更新当前场景
  currentScene = randomKey;
  // 切换背景图
  document.body.style.backgroundImage = `url('${sceneMap[randomKey].img}')`;
  // 更新场景显示文字
  document.getElementById('scene-display').textContent = sceneMap[randomKey].name;
}

// 2. 初始化实时人数（免费第三方接口，无需后端）
function initRealTimeStats() {
  // ========== 替换这里的 YOUR_UNIQUE_KEY ==========
  // 先去 https://countapi.xyz/ 随便输一个唯一名称（比如你的GitHub用户名），替换下面的 YOUR_UNIQUE_KEY
  const countApiKey = 'YOUR_UNIQUE_KEY'; // 示例：const countApiKey = 'zhangsan123';
  // =================================================

  // 实时到访人数（累计访问量）
  fetch(`https://api.countapi.xyz/hit/${countApiKey}/visits`)
    .then(res => res.json())
    .then(data => {
      document.getElementById('visit-count').textContent = `${data.value} 人到访过`;
    })
    .catch(err => {
      // 接口出错时显示随机数（备用）
      document.getElementById('visit-count').textContent = `${Math.floor(Math.random() * 1000) + 100} 人到访过`;
    });

  // 实时在线人数（模拟真实在线，每30秒更新）
  updateOnlineCount();
  setInterval(updateOnlineCount, 30000);
}

// 更新在线人数
function updateOnlineCount() {
  // 随机模拟在线人数（5-100人，也可接真实接口）
  const onlineNum = Math.floor(Math.random() * 95) + 5;
  document.getElementById('online-count').textContent = `${onlineNum} 人在线`;
}

// 3. 绑定所有按钮事件
function bindEvents() {
  // 发布按钮 - 打开输入弹窗
  document.querySelector('.publish-btn').addEventListener('click', function() {
    document.getElementById('input-modal').style.display = 'block';
  });

  // 提交发布 - 生成絮语
  document.getElementById('submit-btn').addEventListener('click', publishWhisper);

  // 随机遇见按钮
  document.querySelector('.random-btn').addEventListener('click', showRandomWhisper);

  // 我的絮语（占位）
  document.querySelector('.my-whisper-btn').addEventListener('click', () => alert('功能待扩展～'));

  // 查看全部（显示所有絮语）
  document.querySelector('.all-btn').addEventListener('click', () => {
    if (whispers.length === 0) {
      alert('暂无絮语～');
      return;
    }
    // 高亮所有絮语2秒
    document.querySelectorAll('.whisper').forEach(el => {
      el.style.background = 'rgba(60, 179, 113, 0.8)';
      setTimeout(() => {
        el.style.background = 'rgba(0, 0, 0, 0.7)';
      }, 2000);
    });
  });
}

// 发布絮语
function publishWhisper() {
  const text = document.getElementById('input-text').value.trim();
  if (!text) {
    alert('请输入想发布的内容～');
    return;
  }

  // 创建新絮语数据
  const newWhisper = {
    text: text,
    x: Math.random() * 80 + 10, // 10%-90% 随机位置
    y: Math.random() * 80 + 10,
    rotate: Math.random() * 60 - 30, // -30° 到 30° 随机旋转
    time: new Date().toLocaleDateString() // 日期
  };

  // 添加并渲染
  whispers.push(newWhisper);
  renderWhisper(newWhisper);
  // 保存到本地
  saveWhispers();
  // 更新数量
  updateWhisperCount();
  // 清空并关闭弹窗
  document.getElementById('input-text').value = '';
  document.getElementById('input-modal').style.display = 'none';
}

// 渲染单条絮语
function renderWhisper(whisper) {
  const whisperEl = document.createElement('div');
  whisperEl.className = 'whisper';
  whisperEl.innerText = whisper.text;
  // 随机位置和旋转
  whisperEl.style.left = `${whisper.x}%`;
  whisperEl.style.top = `${whisper.y}%`;
  whisperEl.style.setProperty('--rotate', whisper.rotate);
  // 鼠标悬停显示日期
  whisperEl.title = `发布于 ${whisper.time}`;
  // 添加到页面
  document.body.appendChild(whisperEl);
}

// 更新絮语数量
function updateWhisperCount() {
  document.getElementById('whisper-count').textContent = whispers.length;
}

// 显示随机絮语
function showRandomWhisper() {
  if (whispers.length === 0) {
    alert('暂无絮语～');
    return;
  }
  const randomIdx = Math.floor(Math.random() * whispers.length);
  const randomWhisper = document.querySelectorAll('.whisper')[randomIdx];
  // 高亮显示
  randomWhisper.style.background = 'rgba(60, 179, 113, 0.8)';
  setTimeout(() => {
    randomWhisper.style.background = 'rgba(0, 0, 0, 0.7)';
  }, 2000);
}

// 保存絮语到本地存储
function saveWhispers() {
  localStorage.setItem('tiedstory_whispers', JSON.stringify(whispers));
}

// 加载本地存储的絮语
function loadWhispers() {
  const saved = localStorage.getItem('tiedstory_whispers');
  if (saved) {
    whispers = JSON.parse(saved);
    whispers.forEach(whisper => renderWhisper(whisper));
  }
}