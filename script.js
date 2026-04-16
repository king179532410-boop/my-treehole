// 全局变量
let ribbons = []; // 存储所有丝带
let currentLang = 'cn'; // 默认中文
let currentScene = 'summer'; // 默认夏·夜晚
// 背景图映射
const sceneBgMap = {
  spring: 'bg-spring.jpg',
  summer: 'bg-summer.jpg',
  autumn: 'bg-autumn.jpg',
  winter: 'bg-winter.jpg'
};
// 语言文本映射
const langTextMap = {
  cn: {
    placeholder: '写下你的心里话吧～',
    publish: '发布',
    myRibbon: '我的丝带',
    codeCheck: '凭码查看',
    tieOne: '+ 系上一条',
    randomMeet: '随机遇见',
    viewAll: '查看全部',
    emptyTip: '请输入想发布的内容～'
  },
  en: {
    placeholder: 'Write down your thoughts～',
    publish: 'Publish',
    myRibbon: 'My Ribbons',
    codeCheck: 'Check by Code',
    tieOne: '+ Tie a Ribbon',
    randomMeet: 'Random Meet',
    viewAll: 'View All',
    emptyTip: 'Please enter content to publish～'
  }
};

// 页面加载完成初始化
window.onload = function() {
  // 加载本地丝带
  loadRibbons();
  // 更新丝带数量
  updateRibbonCount();
  // 绑定所有事件
  bindEvents();
  // 初始化文本（默认中文）
  updateLangText();
};

// 绑定所有按钮事件
function bindEvents() {
  // 1. 发布按钮 - 打开输入弹窗
  document.querySelector('.publish-btn').addEventListener('click', function() {
    document.getElementById('input-modal').style.display = 'block';
  });

  // 2. 提交发布 - 生成丝带
  document.getElementById('submit-btn').addEventListener('click', publishRibbon);

  // 3. 语言按钮 - 显示/隐藏语言弹窗
  const langBtn = document.getElementById('lang-btn');
  const langModal = document.getElementById('lang-modal');
  langBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    langModal.style.display = langModal.style.display === 'flex' ? 'none' : 'flex';
  });
  // 语言选项点击
  document.querySelectorAll('.lang-item').forEach(item => {
    item.addEventListener('click', function() {
      currentLang = this.dataset.lang;
      langBtn.textContent = currentLang.toUpperCase();
      updateLangText(); // 更新所有文本
      langModal.style.display = 'none';
    });
  });

  // 4. 场景按钮 - 显示/隐藏场景弹窗
  const sceneBtn = document.getElementById('scene-btn');
  const sceneModal = document.getElementById('scene-modal');
  sceneBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    sceneModal.style.display = sceneModal.style.display === 'flex' ? 'none' : 'flex';
  });
  // 场景选项点击 - 切换背景图
  document.querySelectorAll('.scene-item').forEach(item => {
    item.addEventListener('click', function() {
      currentScene = this.dataset.scene;
      // 更新按钮文字
      sceneBtn.textContent = this.textContent;
      // 切换背景图（核心）
      document.body.style.backgroundImage = `url('${sceneBgMap[currentScene]}')`;
      sceneModal.style.display = 'none';
    });
  });

  // 5. 随机遇见按钮
  document.querySelector('.random-btn').addEventListener('click', showRandomRibbon);

  // 6. 点击空白处关闭弹窗
  document.addEventListener('click', function() {
    langModal.style.display = 'none';
    sceneModal.style.display = 'none';
  });

  // 7. 我的丝带/凭码查看（占位，可后续扩展）
  document.querySelector('.my-ribbon-btn').addEventListener('click', () => alert('功能待扩展～'));
  document.querySelector('.code-btn').addEventListener('click', () => alert('功能待扩展～'));
}

// 发布丝带
function publishRibbon() {
  const text = document.getElementById('input-text').value.trim();
  if (!text) {
    alert(langTextMap[currentLang].emptyTip);
    return;
  }

  // 创建新丝带数据
  const newRibbon = {
    text: text,
    x: Math.random() * 80 + 10, // 10%-90% 随机位置
    y: Math.random() * 80 + 10,
    rotate: Math.random() * 60 - 30, // -30° 到 30° 随机旋转
    time: new Date().toLocaleDateString() // 日期
  };

  // 添加并渲染
  ribbons.push(newRibbon);
  renderRibbon(newRibbon);
  // 保存到本地
  saveRibbons();
  // 更新数量
  updateRibbonCount();
  // 清空并关闭弹窗
  document.getElementById('input-text').value = '';
  document.getElementById('input-modal').style.display = 'none';
}

// 渲染单条丝带
function renderRibbon(ribbon) {
  const ribbonEl = document.createElement('div');
  ribbonEl.className = 'ribbon';
  ribbonEl.innerText = ribbon.text;
  // 随机位置和旋转
  ribbonEl.style.left = `${ribbon.x}%`;
  ribbonEl.style.top = `${ribbon.y}%`;
  ribbonEl.style.setProperty('--rotate', ribbon.rotate);
  // 鼠标悬停显示日期（模仿原站）
  ribbonEl.title = `发布于 ${ribbon.time}`;
  // 添加到页面
  document.body.appendChild(ribbonEl);
}

// 更新语言文本
function updateLangText() {
  const texts = langTextMap[currentLang];
  document.getElementById('input-text').placeholder = texts.placeholder;
  document.getElementById('submit-btn').textContent = texts.publish;
  document.querySelector('.my-ribbon-btn').textContent = texts.myRibbon;
  document.querySelector('.code-btn').textContent = texts.codeCheck;
  document.querySelector('.publish-btn').textContent = texts.tieOne;
  document.querySelector('.random-btn').textContent = texts.randomMeet;
  document.querySelector('.all-btn').textContent = texts.viewAll;
}

// 显示随机丝带（滚动到随机位置）
function showRandomRibbon() {
  if (ribbons.length === 0) {
    alert(currentLang === 'cn' ? '暂无丝带～' : 'No ribbons yet～');
    return;
  }
  const randomIdx = Math.floor(Math.random() * ribbons.length);
  const randomRibbon = document.querySelectorAll('.ribbon')[randomIdx];
  // 高亮显示
  randomRibbon.style.background = 'rgba(60, 179, 113, 0.8)';
  setTimeout(() => {
    randomRibbon.style.background = 'rgba(0, 0, 0, 0.7)';
  }, 2000);
}

// 更新丝带数量
function updateRibbonCount() {
  document.getElementById('ribbon-count').textContent = ribbons.length;
}

// 保存丝带到本地存储
function saveRibbons() {
  localStorage.setItem('tiedstory_ribbons', JSON.stringify(ribbons));
}

// 加载本地存储的丝带
function loadRibbons() {
  const saved = localStorage.getItem('tiedstory_ribbons');
  if (saved) {
    ribbons = JSON.parse(saved);
    ribbons.forEach(ribbon => renderRibbon(ribbon));
  }
}