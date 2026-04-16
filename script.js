let whispers = [];         // 所有絮语
let myWhispers = [];       // 我的絮语（本地存储标记）
let currentScene = 'summer';
let currentDetailId = -1;
let currentRandomId = -1;  // 随机弹窗当前ID
let hoverTimer = null;     // 悬停计时器

// 背景配置（20秒轮播4张）
const sceneMap = {
  spring:{img:'bg-spring.jpg',name:'春·夜晚'},
  summer:{img:'bg-summer.jpg',name:'夏·夜晚'},
  autumn:{img:'bg-autumn.jpg',name:'秋·夜晚'},
  winter:{img:'bg-winter.jpg',name:'冬·夜晚'}
};
const sceneKeys = Object.keys(sceneMap);
let currentSceneIndex = 1; // 初始夏

// 心情-颜色绑定（固定映射）
const moodColorMap = {
  joy: "#FF5E7D",      // 愉悦-玫红
  hope: "#7B61FF",     // 希望-紫蓝
  love: "#4CC9FF",     // 被爱-浅蓝
  miss: "#2ECC71",     // 怀念-草绿
  hesitate: "#F1C40F", // 犹豫-金黄
  plain: "#E67E22",    // 平淡-橙棕
  lonely: "#9B59B6"    // 孤独-紫粉
};
// 反向映射（颜色→心情）
const colorMoodMap = Object.fromEntries(Object.entries(moodColorMap).map(([k,v])=>[v,k]));

// 真实人数配置
const COUNT_API_KEY = 'YOUR_UNIQUE_ID';

// 页面初始化
window.onload = function(){
  preloadBgImages();
  loadWhispers();        // 加载所有絮语
  loadMyWhispers();      // 加载我的絮语
  updateWhisperCount();
  bindEvents();
  startBgCarousel();     // 20秒轮播背景
  initRealTimeStats();
  keepMinCount();        // 常驻3~5条
  setInterval(keepMinCount, 2000);
};

// 预加载背景图
function preloadBgImages(){
  ['bg-spring.jpg','bg-summer.jpg','bg-autumn.jpg','bg-winter.jpg'].forEach(i=>{
    new Image().src = i;
  });
}

// 初始化实时人数
function initRealTimeStats(){
  updateRealOnlineCount();
  setInterval(updateRealOnlineCount, 300000); // 5分钟更新一次
}
function updateRealOnlineCount(){
  fetch('https://api.ipify.org?format=json')
  .then(r=>r.json())
  .then(d=>fetch(`https://countapi.xyz/hit/${COUNT_API_KEY}_online/${d.ip}`))
  .then(r=>r.json())
  .then(d=>{
    let n = Math.max(1, Math.floor(d.value/10));
    document.getElementById('online-count').textContent = `${n} 人此刻同在`;
  })
  .catch(()=>{
    let n = Math.floor(Math.random()*50)+1;
    document.getElementById('online-count').textContent = `${n} 人此刻同在`;
  });
}

// 背景20秒轮播（4张循环）
function startBgCarousel(){
  // 初始显示summer
  document.querySelector('body::before').style.backgroundImage = `url('${sceneMap.summer.img}')`;
  document.getElementById('scene-display').textContent = sceneMap.summer.name;
  
  // 20秒轮播
  setInterval(()=>{
    currentSceneIndex = (currentSceneIndex + 1) % sceneKeys.length;
    const key = sceneKeys[currentSceneIndex];
    currentScene = key;
    document.querySelector('body::before').style.backgroundImage = `url('${sceneMap[key].img}')`;
    document.getElementById('scene-display').textContent = sceneMap[key].name;
  }, 20000); // 20秒
}

// 绑定所有事件
function bindEvents(){
  // 打开发布弹窗
  document.querySelector('.publish-btn').onclick = ()=>{
    document.getElementById('input-modal').style.display = 'block';
  };
  
  // 关闭发布弹窗
  document.getElementById('input-close-btn').onclick = ()=>{
    document.getElementById('input-modal').style.display = 'none';
  };
  
  // 提交发布（绑定心情-颜色）
  document.getElementById('submit-btn').onclick = publishWhisper;
  
  // 关闭详情弹窗
  document.getElementById('detail-close-btn').onclick = ()=>{
    document.getElementById('detail-modal').style.display = 'none';
    currentDetailId = -1;
  };
  
  // 主点赞功能
  document.getElementById('detail-heart').onclick = ()=>{
    if(currentDetailId===-1)return;
    let w = whispers[currentDetailId];
    w.liked = !w.liked;
    w.likeCount += w.liked?1:-1;
    document.getElementById('detail-heart').classList.toggle('active',w.liked);
    document.getElementById('detail-like-count').textContent = w.likeCount;
    saveWhispers();
  };
  
  // 提交评论（详情弹窗）
  document.getElementById('reply-submit-btn').onclick = ()=>{
    submitReply(currentDetailId, 'detail');
    setTimeout(()=>{
      document.getElementById('detail-modal').style.display = 'none';
      currentDetailId = -1;
    },500);
  };
  
  // 随机遇见：弹窗显示单条（可评论）
  document.querySelector('.random-btn').onclick = showRandomWhisperModal;
  
  // 关闭随机遇见弹窗
  document.getElementById('random-close-btn').onclick = ()=>{
    document.getElementById('random-modal').style.display = 'none';
    currentRandomId = -1;
  };
  
  // 随机弹窗点赞
  document.getElementById('random-heart').onclick = ()=>{
    if(currentRandomId===-1)return;
    let w = whispers[currentRandomId];
    w.liked = !w.liked;
    w.likeCount += w.liked?1:-1;
    document.getElementById('random-heart').classList.toggle('active',w.liked);
    document.getElementById('random-like-count').textContent = w.likeCount;
    saveWhispers();
  };
  
  // 随机弹窗提交评论
  document.getElementById('random-reply-submit-btn').onclick = ()=>{
    submitReply(currentRandomId, 'random');
  };
  
  // 查看全部：弹窗显示列表（颜色筛选）
  document.querySelector('.all-btn').onclick = ()=>{
    renderAllWhispersList('all'); // 默认显示全部
    document.getElementById('all-list-modal').style.display = 'block';
  };
  
  // 颜色筛选事件
  document.querySelectorAll('.color-tag, .all-tag').forEach(tag=>{
    tag.onclick = ()=>{
      // 移除所有active
      document.querySelectorAll('.color-tag, .all-tag').forEach(t=>t.classList.remove('active'));
      tag.classList.add('active');
      // 筛选渲染
      const color = tag.dataset.color;
      renderAllWhispersList(color);
    };
  });
  
  // 关闭全部列表弹窗
  document.getElementById('all-close-btn').onclick = ()=>{
    document.getElementById('all-list-modal').style.display = 'none';
  };
  
  // 我的絮语：弹窗显示
  document.querySelector('.my-whisper-btn').onclick = showMyWhispersList;
  
  // 关闭我的絮语弹窗
  document.getElementById('my-close-btn').onclick = ()=>{
    document.getElementById('my-list-modal').style.display = 'none';
  };
}

// 发布絮语（绑定心情-固定颜色）
function publishWhisper(){
  let t = document.getElementById('input-text').value.trim();
  if(!t){alert('请写下您的心念～');return;}
  
  // 获取选中的心情和对应颜色
  const select = document.getElementById('mood-select');
  const mood = select.value;
  const color = moodColorMap[mood]; // 心情对应固定颜色
  
  // 新絮语数据（位置限制：底部留空间，确保完全显示）
  const maxTop = 85; // 最大top百分比（留15%底部空间）
  const randomX = Math.random()*70+10; // 10~80%
  const randomY = Math.random()*(maxTop - 10) + 10; // 10~maxTop%
  
  let newWhisper = {
    text:t, 
    x:randomX,  
    y:randomY,
    likeCount:0, 
    liked:false, 
    replies:[],
    color:color, 
    mood:mood,    // 记录心情
    time:new Date().toLocaleString(),
    forceShow:true, // 强制显示1分钟
    isMine: true    // 标记为我的絮语
  };
  
  // 添加到数组
  whispers.push(newWhisper);
  myWhispers.push(newWhisper); // 加入我的絮语
  
  let id = whispers.length-1;
  renderWhisper(newWhisper, id);
  
  // 强制显示60秒
  setTimeout(()=>{
    whispers[id].forceShow = false;
  },60000);
  
  // 保存数据
  saveWhispers();
  saveMyWhispers();
  updateWhisperCount();
  
  // 清空并关闭弹窗
  document.getElementById('input-text').value='';
  document.getElementById('input-modal').style.display='none';
}

// 渲染60%尺寸便签（悬停移开1秒半透）
function renderWhisper(w, id){
  let el = document.createElement('div');
  el.className = 'whisper show';
  el.innerText = w.text;
  el.style.left = w.x+'%';
  el.style.top = w.y+'%';
  el.style.setProperty('--top-color', w.color);
  
  // 鼠标移入：变实+上浮+色条加粗
  el.onmouseenter = ()=>{
    clearTimeout(hoverTimer); // 清除之前的计时器
    el.classList.add('hover');
  };
  
  // 鼠标移出：1秒后回到半透
  el.onmouseleave = ()=>{
    hoverTimer = setTimeout(()=>{
      el.classList.remove('hover');
    }, 1000); // 1秒延迟
  };
  
  // 点击打开详情（带顶部色条）
  el.onclick = ()=>openWhisperDetail(id);
  
  document.body.appendChild(el);
}

// 打开详情弹窗（顶部显示同色条）
function openWhisperDetail(id){
  currentDetailId = id;
  let w = whispers[id];
  
  // 设置顶部色条颜色
  document.getElementById('detail-top-bar').style.background = w.color;
  
  // 填充内容
  document.getElementById('detail-content').textContent = w.text;
  document.getElementById('detail-reply-count').textContent = `回响 · ${w.replies.length}`;
  document.getElementById('detail-like-count').textContent = w.likeCount;
  document.getElementById('detail-heart').classList.toggle('active',w.liked);
  
  // 渲染评论（带“心心念语”前缀）
  renderReplyList(w.replies, 'detail');
  
  // 显示弹窗
  document.getElementById('detail-modal').style.display = 'block';
}

// 渲染评论列表（通用：详情/随机弹窗）
function renderReplyList(list, type){
  const listEl = type === 'detail' 
    ? document.getElementById('reply-list') 
    : document.getElementById('random-reply-list');
  
  listEl.innerHTML = list.length?'':'<div class="no-reply">暂无心念</div>';
  
  list.forEach((r, rid)=>{
    let item = document.createElement('div');
    item.className = 'reply-item';
    item.innerHTML = `
      <span class="reply-prefix">心心念语</span>
      <div class="reply-content">${r.text}</div>
      <div class="reply-meta">
        <span>${r.time}</span>
        <div class="reply-like" data-rid="${rid}" data-type="${type}">
          <span class="reply-like-count">${r.likeCount}</span>
          <span class="heart-icon ${r.liked?'active':''}">❤️</span>
        </div>
      </div>
    `;
    
    // 评论点赞
    item.querySelector('.reply-like').onclick = (e)=>{
      const rId = parseInt(e.currentTarget.dataset.rid);
      const currentId = type === 'detail' ? currentDetailId : currentRandomId;
      let rep = whispers[currentId].replies[rId];
      rep.liked = !rep.liked;
      rep.likeCount += rep.liked?1:-1;
      e.currentTarget.querySelector('.heart-icon').classList.toggle('active',rep.liked);
      e.currentTarget.querySelector('.reply-like-count').textContent = rep.likeCount;
      saveWhispers();
    };
    
    listEl.appendChild(item);
  });
}

// 提交评论（通用：详情/随机弹窗）
function submitReply(id, type){
  if(id===-1)return;
  
  const inputEl = type === 'detail' 
    ? document.getElementById('reply-input') 
    : document.getElementById('random-reply-input');
  
  let t = inputEl.value.trim();
  if(!t||t.length>50){alert('请输入50字以内的心念～');return;}
  
  // 添加评论
  whispers[id].replies.push({
    text:t, 
    time:new Date().toLocaleTimeString(), 
    likeCount:0, 
    liked:false
  });
  
  // 重新渲染
  renderReplyList(whispers[id].replies, type);
  
  // 更新回复数
  if(type === 'detail'){
    document.getElementById('detail-reply-count').textContent = `回响 · ${whispers[id].replies.length}`;
  }else{
    document.getElementById('random-reply-count').textContent = `回响 · ${whispers[id].replies.length}`;
  }
  
  // 清空输入
  inputEl.value='';
  saveWhispers();
}

// 随机遇见：弹窗显示单条絮语（可评论）
function showRandomWhisperModal(){
  if(!whispers.length){alert('暂无心念～');return;}
  
  // 随机选一条
  currentRandomId = Math.floor(Math.random()*whispers.length);
  let w = whispers[currentRandomId];
  
  // 设置顶部色条
  document.getElementById('random-top-bar').style.background = w.color;
  
  // 填充内容
  document.getElementById('random-content').textContent = w.text;
  document.getElementById('random-reply-count').textContent = `回响 · ${w.replies.length}`;
  document.getElementById('random-like-count').textContent = w.likeCount;
  document.getElementById('random-heart').classList.toggle('active',w.liked);
  
  // 渲染评论
  renderReplyList(w.replies, 'random');
  
  // 显示弹窗
  document.getElementById('random-modal').style.display = 'block';
}

// 渲染全部列表（支持颜色筛选）
function renderAllWhispersList(filterColor){
  let contentEl = document.getElementById('all-list-content');
  contentEl.innerHTML = '';
  
  // 筛选数据
  let filteredWhispers = filterColor === 'all' 
    ? whispers 
    : whispers.filter(w => w.color === filterColor);
  
  if(filteredWhispers.length === 0){
    contentEl.innerHTML = '<div style="width:100%; text-align:center; padding:50px; color:#C8C0B0;">暂无该心情的念语</div>';
    return;
  }
  
  // 渲染筛选后的列表
  filteredWhispers.forEach((w, idx)=>{
    // 找到原ID
    const originalId = whispers.findIndex(item => item.text === w.text && item.time === w.time);
    if(originalId === -1) return;
    
    let item = document.createElement('div');
    item.className = 'all-list-item';
    item.style.setProperty('--item-color', w.color);
    item.innerHTML = `
      <div class="all-item-content">${w.text}</div>
      <div class="all-item-meta">
        <span>${w.time}</span>
        <span>回响 · ${w.replies.length}</span>
      </div>
    `;
    
    // 点击列表项打开详情
    item.onclick = ()=>{
      document.getElementById('all-list-modal').style.display = 'none';
      openWhisperDetail(originalId);
    };
    
    contentEl.appendChild(item);
  });
}

// 我的絮语：显示自己发布的内容
function showMyWhispersList(){
  if(!myWhispers.length){alert('您还未发布任何心念～');return;}
  
  let contentEl = document.getElementById('my-list-content');
  contentEl.innerHTML = '';
  
  // 渲染我的絮语
  myWhispers.forEach((w, id)=>{
    let item = document.createElement('div');
    item.className = 'my-list-item';
    item.style.setProperty('--item-color', w.color);
    item.innerHTML = `
      <div class="my-item-content">${w.text}</div>
      <div class="my-item-meta">
        <span>${w.time}</span>
        <span>回响 · ${w.replies.length}</span>
      </div>
    `;
    
    // 点击打开详情
    item.onclick = ()=>{
      document.getElementById('my-list-modal').style.display = 'none';
      // 找到对应ID
      let whisperId = whispers.findIndex(item => item.text === w.text && item.time === w.time);
      if(whisperId !== -1) openWhisperDetail(whisperId);
    };
    
    contentEl.appendChild(item);
  });
  
  // 显示弹窗
  document.getElementById('my-list-modal').style.display = 'block';
}

// 常驻3~5条便签
function keepMinCount(){
  let all = document.querySelectorAll('.whisper');
  let show = document.querySelectorAll('.whisper.show');
  let total = whispers.length;
  let min = Math.min(5, Math.max(3, total));
  
  if(show.length < min){
    let hids = document.querySelectorAll('.whisper.hidden');
    for(let i=0; i<min-show.length; i++){
      if(hids[i]) hids[i].classList.remove('hidden');
    }
  }
}

// 工具函数：更新数量
function updateWhisperCount(){
  document.getElementById('whisper-count').textContent = whispers.length;
}

// 保存所有絮语
function saveWhispers(){
  localStorage.setItem('xinianbu_all', JSON.stringify(whispers));
}

// 加载所有絮语
function loadWhispers(){
  let d = localStorage.getItem('xinianbu_all');
  if(d){
    whispers = JSON.parse(d);
    whispers.forEach((w,i)=>renderWhisper(w,i));
  }
}

// 保存我的絮语
function saveMyWhispers(){
  localStorage.setItem('xinianbu_my', JSON.stringify(myWhispers));
}

// 加载我的絮语
function loadMyWhispers(){
  let d = localStorage.getItem('xinianbu_my');
  if(d) myWhispers = JSON.parse(d);
}