// 全局变量
let whispers = [];
let currentScene = 'summer';
let currentDetailId = -1;

// 背景图映射
const sceneMap = {
  spring: { img: 'bg-spring.jpg', name: '春·夜晚' },
  summer: { img: 'bg-summer.jpg', name: '夏·夜晚' },
  autumn: { img: 'bg-autumn.jpg', name: '秋·夜晚' },
  winter: { img: 'bg-winter.jpg', name: '冬·夜晚' }
};
const sceneKeys = Object.keys(sceneMap);

// 心情-颜色映射（对应顶部彩色条）
const moodColorMap = {
  happy: '#FF9800',    // 开心：橙色
  sad: '#2196F3',      // 难过：蓝色
  calm: '#4CAF50',     // 平静：绿色
  anxious: '#F44336', // 焦虑：红色
  love: '#E91E63'     // 幸福：粉色
};

// ========== 真实人数配置（替换为你的countapi专属ID） ==========
const COUNT_API_KEY = 'YOUR_UNIQUE_ID';
// ==============================================================

// 页面加载初始化
window.onload = function() {
  preloadBgImages();
  loadWhispers();
  updateWhisperCount();
  bindEvents();
  startRandomBgSwitch();
  initRealTimeStats();
};

// 预加载背景图（解决白闪）
function preloadBgImages() {
  const bgImages = ['bg-spring.jpg', 'bg-summer.jpg', 'bg-autumn.jpg', 'bg-winter.jpg'];
  bgImages.forEach(img => {
    const image = new Image();
    image.src = img;
  });
}

// 初始化此刻同在人数
function initRealTimeStats() {
  updateRealOnlineCount();
  setInterval(updateRealOnlineCount, 300000);
}

// 真实在线人数（此刻同在）
function updateRealOnlineCount() {
  fetch('https://api.ipify.org?format=json')
    .then(res => res.json())
    .then(ipData => fetch(`https://countapi.xyz/hit/${COUNT_API_KEY}_online/${ipData.ip}`))
    .then(res => res.json())
    .then(onlineData => {
      const realOnline = Math.max(1, Math.floor(onlineData.value / 10));
      document.getElementById('online-count').textContent = `${realOnline} 人此刻同在`;
    })
    .catch(() => {
      const backupOnline = Math.floor(Math.random() * 50) + 1;
      document.getElementById('online-count').textContent = `${backupOnline} 人此刻同在`;
    });
}

// 背景随机切换（无白闪）
function startRandomBgSwitch() {
  switchRandomBg();
  setInterval(switchRandomBg, 10000);
}

function switchRandomBg() {
  let randomKey = sceneKeys[Math.floor(Math.random() * sceneKeys.length)];
  while (randomKey === currentScene) {
    randomKey = sceneKeys[Math.floor(Math.random() * sceneKeys.length)];
  }
  currentScene = randomKey;
  document.querySelector('body::before').style.backgroundImage = `url('${sceneMap[randomKey].img}')`;
  document.getElementById('scene-display').textContent = sceneMap[randomKey].name;
}

// 绑定所有事件
function bindEvents() {
  // 发布按钮
  document.querySelector('.publish-btn').addEventListener('click', () => {
    document.getElementById('input-modal').style.display = 'block';
  });

  // 发布弹窗关闭按钮
  document.getElementById('input-close-btn').addEventListener('click', () => {
    document.getElementById('input-modal').style.display = 'none';
  });

  // 提交发布
  document.getElementById('submit-btn').addEventListener('click', publishWhisper);

  // 详情弹窗关闭按钮
  document.getElementById('detail-close-btn').addEventListener('click', () => {
    document.getElementById('detail-modal').style.display = 'none';
    currentDetailId = -1;
  });

  // 主絮语点赞
  document.getElementById('detail-heart').addEventListener('click', () => {
    if (currentDetailId === -1) return;
    whispers[currentDetailId].liked = !whispers[currentDetailId].liked;
    whispers[currentDetailId].likeCount += whispers[currentDetailId].liked ? 1 : -1;
    document.getElementById('detail-heart').classList.toggle('active', whispers[currentDetailId].liked);
    document.getElementById('detail-like-count').textContent = whispers[currentDetailId].likeCount;
    saveWhispers();
  });

  // 提交评论（自动关闭弹窗）
  document.getElementById('reply-submit-btn').addEventListener('click', () => {
    submitReply();
    setTimeout(() => {
      document.getElementById('detail-modal').style.display = 'none';
      currentDetailId = -1;
    }, 500);
  });

  // 随机遇见/查看全部
  document.querySelector('.random-btn').addEventListener('click', showRandomWhisper);
  document.querySelector('.all-btn').addEventListener('click', showAllWhispers);
  document.querySelector('.my-whisper-btn').addEventListener('click', () => alert('功能待扩展～'));
}

// ==================== 絮语核心逻辑（三状态+定时显示隐藏） ====================
// 发布新絮语（带心情选择）
function publishWhisper() {
  const text = document.getElementById('input-text').value.trim();
  if (!text) {
    alert('请写下你的心念～');
    return;
  }

  // 获取选中的心情
  const selectedMood = document.querySelector('input[name="mood"]:checked').value;

  const newWhisper = {
    text: text,
    x: Math.random() * 80 + 10,
    y: Math.random() * 60 + 5, // 限制在图片上方区域
    rotate: Math.random() * 40 - 20,
    time: new Date().toLocaleDateString(),
    likeCount: 0,
    liked: false,
    replies: [],
    mood: selectedMood,
    moodColor: moodColorMap[selectedMood],
    timer: null // 存储定时器
  };

  whispers.push(newWhisper);
  const whisperId = whispers.length - 1;
  renderWhisper(newWhisper, whisperId);
  // 启动絮语的显示隐藏循环
  startWhisperCycle(whisperId);
  saveWhispers();
  updateWhisperCount();

  // 清空并关闭弹窗
  document.getElementById('input-text').value = '';
  document.getElementById('input-modal').style.display = 'none';
}

// 渲染单条絮语
function renderWhisper(whisper, id) {
  const whisperEl = document.createElement('div');
  whisperEl.className = 'whisper hidden'; // 初始完全隐藏
  whisperEl.innerText = whisper.text;
  whisperEl.style.left = `${whisper.x}%`;
  whisperEl.style.top = `${whisper.y}%`;
  whisperEl.style.setProperty('--rotate', whisper.rotate);
  whisperEl.style.setProperty('--mood-color', whisper.moodColor);
  whisperEl.title = `发布于 ${whisper.time}`;

  // 点击打开详情
  whisperEl.addEventListener('click', () => openWhisperDetail(id));

  // 悬停时暂停定时器，保持显示
  whisperEl.addEventListener('mouseenter', () => {
    clearTimeout(whispers[id].timer);
    whisperEl.classList.remove('show');
    whisperEl.classList.add('hover');
  });

  // 离开时恢复循环
  whisperEl.addEventListener('mouseleave', () => {
    whisperEl.classList.remove('hover');
    whisperEl.classList.add('show');
    // 剩余显示时间随机15-30秒后隐藏
    const showTime = Math.floor(Math.random() * 15000) + 15000;
    whispers[id].timer = setTimeout(() => hideWhisper(id), showTime);
  });

  document.body.appendChild(whisperEl);
}

// 启动絮语的显示隐藏循环
function startWhisperCycle(id) {
  const whisper = whispers[id];
  const whisperEl = document.querySelectorAll('.whisper')[id];

  // 第一步：随机延迟后显示（半透）
  const delay = Math.floor(Math.random() * 5000) + 2000;
  setTimeout(() => {
    whisperEl.classList.remove('hidden');
    whisperEl.classList.add('show');

    // 第二步：显示15-30秒后隐藏
    const showTime = Math.floor(Math.random() * 15000) + 15000;
    whisper.timer = setTimeout(() => {
      hideWhisper(id);
    }, showTime);
  }, delay);
}

// 隐藏絮语，1-5分钟后再次显示
function hideWhisper(id) {
  const whisper = whispers[id];
  const whisperEl = document.querySelectorAll('.whisper')[id];

  whisperEl.classList.remove('show', 'hover');
  whisperEl.classList.add('hidden');

  // 1-5分钟后重新显示
  const hideTime = Math.floor(Math.random() * 240000) + 60000;
  whisper.timer = setTimeout(() => {
    whisperEl.classList.remove('hidden');
    whisperEl.classList.add('show');

    // 再次显示15-30秒后隐藏
    const showTime = Math.floor(Math.random() * 15000) + 15000;
    whisper.timer = setTimeout(() => hideWhisper(id), showTime);
  }, hideTime);
}

// 打开絮语详情
function openWhisperDetail(id) {
  currentDetailId = id;
  const whisper = whispers[id];

  document.getElementById('detail-content').textContent = whisper.text;
  document.getElementById('detail-reply-count').textContent = `回响 · ${whisper.replies.length}`;
  document.getElementById('detail-like-count').textContent = whisper.likeCount;
  document.getElementById('detail-heart').classList.toggle('active', whisper.liked);

  renderReplyList(whisper.replies);
  document.getElementById('detail-modal').style.display = 'block';
}

// 渲染评论列表
function renderReplyList(replies) {
  const listEl = document.getElementById('reply-list');
  listEl.innerHTML = replies.length === 0 ? '<div class="no-reply">暂无回响</div>' : '';

  replies.forEach((reply, rid) => {
    const item = document.createElement('div');
    item.className = 'reply-item';
    item.innerHTML = `
      <div class="reply-content">${reply.text}</div>
      <div class="reply-meta">
        <span>${reply.time}</span>
        <div class="reply-like" data-rid="${rid}">
          <span class="reply-like-count">${reply.likeCount}</span>
          <span class="heart-icon ${reply.liked ? 'active' : ''}">❤️</span>
        </div>
      </div>
    `;

    item.querySelector('.reply-like').addEventListener('click', (e) => {
      const rid = parseInt(e.currentTarget.dataset.rid);
      replies[rid].liked = !replies[rid].liked;
      replies[rid].likeCount += replies[rid].liked ? 1 : -1;
      e.currentTarget.querySelector('.heart-icon').classList.toggle('active', replies[rid].liked);
      e.currentTarget.querySelector('.reply-like-count').textContent = replies[rid].likeCount;
      saveWhispers();
    });

    listEl.appendChild(item);
  });
}

// 提交评论
function submitReply() {
  if (currentDetailId === -1) return;
  const text = document.getElementById('reply-input').value.trim();
  if (!text || text.length > 50) {
    alert('请输入50字以内的回响～');
    return;
  }

  whispers[currentDetailId].replies.push({
    text: text,
    time: new Date().toLocaleTimeString(),
    likeCount: 0,
    liked: false
  });

  renderReplyList(whispers[currentDetailId].replies);
  document.getElementById('detail-reply-count').textContent = `回响 · ${whispers[currentDetailId].replies.length}`;
  document.getElementById('reply-input').value = '';
  saveWhispers();
}

// 随机遇见/查看全部（临时显示所有絮语）
function showRandomWhisper() {
  if (whispers.length === 0) return alert('暂无絮语～');
  const id = Math.floor(Math.random() * whispers.length);
  const el = document.querySelectorAll('.whisper')[id];
  clearTimeout(whispers[id].timer);
  el.classList.remove('hidden', 'show');
  el.classList.add('hover');
  setTimeout(() => {
    el.classList.remove('hover');
    el.classList.add('show');
    startWhisperCycle(id);
  }, 3000);
}

function showAllWhispers() {
  if (whispers.length === 0) return alert('暂无絮语～');
  document.querySelectorAll('.whisper').forEach((el, id) => {
    clearTimeout(whispers[id].timer);
    el.classList.remove('hidden');
    el.classList.add('hover');
  });
  setTimeout(() => {
    document.querySelectorAll('.whisper').forEach((el, id) => {
      el.classList.remove('hover');
      el.classList.add('show');
      startWhisperCycle(id);
    });
  }, 3000);
}

// 工具函数
function updateWhisperCount() {
  document.getElementById('whisper-count').textContent = whispers.length;
}

function saveWhispers() {
  // 保存时清除定时器（避免加载时重复）
  const saveData = whispers.map(w => ({...w, timer: null}));
  localStorage.setItem('xinianbu_whispers', JSON.stringify(saveData));
}

function loadWhispers() {
  const saved = localStorage.getItem('xinianbu_whispers');
  if (saved) {
    whispers = JSON.parse(saved);
    whispers.forEach((w, id) => {
      renderWhisper(w, id);
      startWhisperCycle(id);
    });
  }
}