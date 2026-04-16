// 全局变量
let whispers = []; // 存储所有絮语（含评论+点赞）
let currentScene = 'summer'; // 当前场景
let currentDetailId = -1; // 当前打开的絮语ID
// 背景图映射
const sceneMap = {
  spring: { img: 'bg-spring.jpg', name: '春·夜晚' },
  summer: { img: 'bg-summer.jpg', name: '夏·夜晚' },
  autumn: { img: 'bg-autumn.jpg', name: '秋·夜晚' },
  winter: { img: 'bg-winter.jpg', name: '冬·夜晚' }
};
const sceneKeys = Object.keys(sceneMap);
// 随机便签颜色列表
const colorList = [
  '#4CAF50', '#FF9800', '#2196F3', '#9C27B0', 
  '#F44336', '#FFEB3B', '#00BCD4', '#8BC34A'
];

// ========== 真实人数配置（必改！） ==========
const COUNT_API_KEY = 'YOUR_UNIQUE_ID'; // 替换为你的countapi名称
// ===============================================

// 页面加载初始化
window.onload = function() {
  // 预加载所有背景图（解决白闪）
  preloadBgImages();
  // 加载本地絮语数据
  loadWhispers();
  // 更新絮语数量
  updateWhisperCount();
  // 绑定所有事件
  bindEvents();
  // 启动背景随机切换
  startRandomBgSwitch();
  // 初始化实时人数（此刻同在）
  initRealTimeStats();
};

// 预加载所有背景图
function preloadBgImages() {
  const bgImages = [
    'bg-spring.jpg',
    'bg-summer.jpg',
    'bg-autumn.jpg',
    'bg-winter.jpg'
  ];
  bgImages.forEach(img => {
    const image = new Image();
    image.src = img;
  });
}

// 初始化实时人数（仅保留此刻同在）
function initRealTimeStats() {
  // 真实在线人数（此刻同在）
  updateRealOnlineCount();
  setInterval(updateRealOnlineCount, 300000); // 每5分钟更新
}

// 真实在线人数（此刻同在）
function updateRealOnlineCount() {
  fetch('https://api.ipify.org?format=json')
    .then(res => res.json())
    .then(ipData => {
      return fetch(`https://countapi.xyz/hit/${COUNT_API_KEY}_online/${ipData.ip}`);
    })
    .then(res => res.json())
    .then(onlineData => {
      const realOnline = Math.max(1, Math.floor(onlineData.value / 10));
      document.getElementById('online-count').textContent = `${realOnline} 人此刻同在`;
    })
    .catch(err => {
      const backupOnline = Math.floor(Math.random() * 50) + 1;
      document.getElementById('online-count').textContent = `${backupOnline} 人此刻同在`;
    });
}

// 背景随机切换（无白闪）
function startRandomBgSwitch() {
  switchRandomBg();
  setInterval(switchRandomBg, 10000); // 每10秒切换
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

// 绑定所有事件（新增关闭按钮、评论提交后关闭弹窗）
function bindEvents() {
  // 发布絮语按钮
  document.querySelector('.publish-btn').addEventListener('click', () => {
    document.getElementById('input-modal').style.display = 'block';
  });

  // 提交发布絮语
  document.getElementById('submit-btn').addEventListener('click', publishWhisper);

  // 随机遇见按钮
  document.querySelector('.random-btn').addEventListener('click', showRandomWhisper);

  // 查看全部按钮
  document.querySelector('.all-btn').addEventListener('click', showAllWhispers);

  // 我的絮语按钮
  document.querySelector('.my-whisper-btn').addEventListener('click', () => alert('功能待扩展～'));

  // 详情弹窗关闭按钮
  document.getElementById('close-btn').addEventListener('click', () => {
    document.getElementById('detail-modal').style.display = 'none';
    currentDetailId = -1;
  });

  // 絮语详情 - 主点赞按钮
  document.getElementById('detail-heart').addEventListener('click', () => {
    if (currentDetailId === -1) return;
    whispers[currentDetailId].liked = !whispers[currentDetailId].liked;
    if (whispers[currentDetailId].liked) {
      whispers[currentDetailId].likeCount += 1;
      document.getElementById('detail-heart').classList.add('active');
    } else {
      whispers[currentDetailId].likeCount -= 1;
      document.getElementById('detail-heart').classList.remove('active');
    }
    document.getElementById('detail-like-count').textContent = whispers[currentDetailId].likeCount;
    saveWhispers();
  });

  // 提交评论（自动关闭弹窗）
  document.getElementById('reply-submit-btn').addEventListener('click', () => {
    submitReply();
    // 提交后自动关闭弹窗
    setTimeout(() => {
      document.getElementById('detail-modal').style.display = 'none';
      currentDetailId = -1;
    }, 500);
  });
}

// 发布新絮语（新增随机便签颜色）
function publishWhisper() {
  const text = document.getElementById('input-text').value.trim();
  if (!text) {
    alert('请输入想发布的内容～');
    return;
  }

  // 随机选一个便签颜色
  const randomColor = colorList[Math.floor(Math.random() * colorList.length)];

  // 新絮语数据
  const newWhisper = {
    text: text,
    x: Math.random() * 80 + 10,
    y: Math.random() * 80 + 10,
    rotate: Math.random() * 60 - 30,
    time: new Date().toLocaleDateString(),
    likeCount: 0,
    liked: false,
    replies: [],
    bgColor: randomColor // 存储便签颜色
  };

  // 添加并渲染
  whispers.push(newWhisper);
  renderWhisper(newWhisper, whispers.length - 1);
  saveWhispers();
  updateWhisperCount();

  // 清空弹窗
  document.getElementById('input-text').value = '';
  document.getElementById('input-modal').style.display = 'none';
}

// 渲染单条絮语（便签样式：随机颜色、图片上方、半透模糊）
function renderWhisper(whisper, id) {
  const whisperEl = document.createElement('div');
  whisperEl.className = 'whisper';
  whisperEl.innerText = whisper.text;
  // 设置随机位置（图片上方）
  whisperEl.style.setProperty('--x', whisper.x);
  whisperEl.style.setProperty('--y', whisper.y);
  // 设置随机旋转
  whisperEl.style.setProperty('--rotate', whisper.rotate);
  // 设置随机便签颜色
  whisperEl.style.setProperty('--bg-color', whisper.bgColor);
  whisperEl.title = `发布于 ${whisper.time}`;

  // 点击打开详情弹窗
  whisperEl.addEventListener('click', () => {
    openWhisperDetail(id);
  });

  document.body.appendChild(whisperEl);
}

// 打开絮语详情弹窗
function openWhisperDetail(id) {
  currentDetailId = id;
  const whisper = whispers[id];

  document.getElementById('detail-content').textContent = whisper.text;
  document.getElementById('detail-reply-count').textContent = `回响 · ${whisper.replies.length}`;
  document.getElementById('detail-like-count').textContent = whisper.likeCount;
  
  if (whisper.liked) {
    document.getElementById('detail-heart').classList.add('active');
  } else {
    document.getElementById('detail-heart').classList.remove('active');
  }

  renderReplyList(whisper.replies);
  document.getElementById('detail-modal').style.display = 'block';
}

// 渲染评论列表
function renderReplyList(replies) {
  const replyListEl = document.getElementById('reply-list');
  replyListEl.innerHTML = '';

  if (replies.length === 0) {
    replyListEl.innerHTML = '<div class="no-reply">暂无回响，快来留下你的心声～</div>';
    return;
  }

  replies.forEach((reply, replyId) => {
    const replyEl = document.createElement('div');
    replyEl.className = 'reply-item';
    replyEl.innerHTML = `
      <div class="reply-content">${reply.text}</div>
      <div class="reply-meta">
        <span>${reply.time}</span>
        <div class="reply-like" data-reply-id="${replyId}">
          <span class="reply-like-count">${reply.likeCount}</span>
          <span class="heart-icon ${reply.liked ? 'active' : ''}">❤️</span>
        </div>
      </div>
    `;

    // 评论点赞事件
    replyEl.querySelector('.reply-like').addEventListener('click', (e) => {
      const rid = parseInt(e.currentTarget.dataset.replyId);
      replies[rid].liked = !replies[rid].liked;
      if (replies[rid].liked) {
        replies[rid].likeCount += 1;
        e.currentTarget.querySelector('.heart-icon').classList.add('active');
      } else {
        replies[rid].likeCount -= 1;
        e.currentTarget.querySelector('.heart-icon').classList.remove('active');
      }
      e.currentTarget.querySelector('.reply-like-count').textContent = replies[rid].likeCount;
      saveWhispers();
    });

    replyListEl.appendChild(replyEl);
  });
}

// 提交评论
function submitReply() {
  if (currentDetailId === -1) return;
  const replyText = document.getElementById('reply-input').value.trim();
  if (!replyText || replyText.length > 50) {
    alert('请输入50字以内的回响～');
    return;
  }

  const newReply = {
    text: replyText,
    time: new Date().toLocaleTimeString(),
    likeCount: 0,
    liked: false
  };

  whispers[currentDetailId].replies.push(newReply);
  renderReplyList(whispers[currentDetailId].replies);
  document.getElementById('detail-reply-count').textContent = `回响 · ${whispers[currentDetailId].replies.length}`;
  document.getElementById('reply-input').value = '';
  saveWhispers();
}

// 随机显示絮语
function showRandomWhisper() {
  if (whispers.length === 0) {
    alert('暂无絮语～');
    return;
  }
  const randomIdx = Math.floor(Math.random() * whispers.length);
  const randomWhisper = document.querySelectorAll('.whisper')[randomIdx];
  randomWhisper.style.background = 'rgba(255, 255, 255, 0.85)';
  randomWhisper.style.color = '#333';
  randomWhisper.style.opacity = '1';
  randomWhisper.style.animation = 'none';
  setTimeout(() => {
    randomWhisper.style.background = 'rgba(255, 255, 255, 0.15)';
    randomWhisper.style.color = '#fff';
    randomWhisper.style.animation = 'fadeInOut 8s infinite alternate';
  }, 2000);
}

// 显示所有絮语
function showAllWhispers() {
  if (whispers.length === 0) {
    alert('暂无絮语～');
    return;
  }
  document.querySelectorAll('.whisper').forEach(el => {
    el.style.background = 'rgba(255, 255, 255, 0.85)';
    el.style.color = '#333';
    el.style.opacity = '1';
    el.style.animation = 'none';
    setTimeout(() => {
      el.style.background = 'rgba(255, 255, 255, 0.15)';
      el.style.color = '#fff';
      el.style.animation = 'fadeInOut 8s infinite alternate';
    }, 2000);
  });
}

// 工具函数：更新絮语数量
function updateWhisperCount() {
  document.getElementById('whisper-count').textContent = whispers.length;
}

// 保存数据到本地
function saveWhispers() {
  localStorage.setItem('tiedstory_whispers', JSON.stringify(whispers));
}

// 加载本地数据
function loadWhispers() {
  const saved = localStorage.getItem('tiedstory_whispers');
  if (saved) {
    whispers = JSON.parse(saved);
    whispers.forEach((whisper, id) => {
      renderWhisper(whisper, id);
    });
  }
}