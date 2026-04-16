let whispers = [];         // 所有絮语
let myWhispers = [];       // 我的絮语（本地存储标记）
let currentScene = 'summer';
let currentDetailId = -1;

// 背景配置（2分钟切换）
const sceneMap = {
  spring:{img:'bg-spring.jpg',name:'春·夜晚'},
  summer:{img:'bg-summer.jpg',name:'夏·夜晚'},
  autumn:{img:'bg-autumn.jpg',name:'秋·夜晚'},
  winter:{img:'bg-winter.jpg',name:'冬·夜晚'}
};
const sceneKeys = Object.keys(sceneMap);

// 大量随机顶部颜色
const colorList = [
  '#FF5E7D','#7B61FF','#4CC9FF','#2ECC71','#F1C40F','#E67E22','#9B59B6',
  '#1ABC9C','#3498DB','#E74C3C','#F39C12','#8E44AD','#27AE60','#16A085',
  '#C0392B','#2980B9','#FD79A8','#6C5CE7','#A29BFE','#55A3FF','#00D2D3'
];

// 真实人数配置
const COUNT_API_KEY = 'YOUR_UNIQUE_ID';

// 页面初始化
window.onload = function(){
  preloadBgImages();
  loadWhispers();        // 加载所有絮语
  loadMyWhispers();      // 加载我的絮语
  updateWhisperCount();
  bindEvents();
  startRandomBgSwitch(); // 2分钟切换背景
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

// 背景2分钟切换
function startRandomBgSwitch(){
  switchRandomBg();
  setInterval(switchRandomBg, 120000); // 120秒=2分钟
}
function switchRandomBg(){
  let k = sceneKeys[Math.floor(Math.random()*sceneKeys.length)];
  while(k===currentScene) k=sceneKeys[Math.floor(Math.random()*sceneKeys.length)];
  currentScene = k;
  document.querySelector('body::before').style.backgroundImage = `url('${sceneMap[k].img}')`;
  document.getElementById('scene-display').textContent = sceneMap[k].name;
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
  
  // 提交发布（标记为我的絮语）
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
  
  // 提交评论（改为“留下您的心念”）
  document.getElementById('reply-submit-btn').onclick = ()=>{
    submitReply();
    setTimeout(()=>{
      document.getElementById('detail-modal').style.display = 'none';
      currentDetailId = -1;
    },500);
  };
  
  // 随机遇见：弹窗显示单条
  document.querySelector('.random-btn').onclick = showRandomWhisperModal;
  
  // 查看全部：弹窗显示列表
  document.querySelector('.all-btn').onclick = showAllWhispersList;
  
  // 我的絮语：弹窗显示
  document.querySelector('.my-whisper-btn').onclick = showMyWhispersList;
  
  // 关闭随机遇见弹窗
  document.getElementById('random-close-btn').onclick = ()=>{
    document.getElementById('random-modal').style.display = 'none';
  };
  
  // 关闭全部列表弹窗
  document.getElementById('all-close-btn').onclick = ()=>{
    document.getElementById('all-list-modal').style.display = 'none';
  };
  
  // 关闭我的絮语弹窗
  document.getElementById('my-close-btn').onclick = ()=>{
    document.getElementById('my-list-modal').style.display = 'none';
  };
}

// 发布絮语（标记为我的絮语）
function publishWhisper(){
  let t = document.getElementById('input-text').value.trim();
  if(!t){alert('请写下您的心念～');return;}
  
  // 随机颜色
  let c = colorList[Math.floor(Math.random()*colorList.length)];
  
  // 新絮语数据
  let newWhisper = {
    text:t, 
    x:Math.random()*70+10,  // 位置随机
    y:Math.random()*50+10,
    likeCount:0, 
    liked:false, 
    replies:[],
    color:c, 
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

// 渲染大尺寸便签
function renderWhisper(w, id){
  let el = document.createElement('div');
  el.className = 'whisper show';
  el.innerText = w.text;
  el.style.left = w.x+'%';
  el.style.top = w.y+'%';
  el.style.setProperty('--top-color', w.color);
  
  // 鼠标移入：变实10秒+上浮+色条加粗
  el.onmouseenter = ()=>{
    el.classList.add('hover');
    clearTimeout(window.hoverTimer);
    window.hoverTimer = setTimeout(()=>{
      el.classList.remove('hover');
    },10000);
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
  renderReplyList(w.replies);
  
  // 显示弹窗
  document.getElementById('detail-modal').style.display = 'block';
}

// 渲染评论列表（增加“心心念语”前缀+浅色）
function renderReplyList(list){
  let el = document.getElementById('reply-list');
  el.innerHTML = list.length?'':'<div class="no-reply">暂无心念</div>';
  
  list.forEach((r, rid)=>{
    let item = document.createElement('div');
    item.className = 'reply-item';
    item.innerHTML = `
      <span class="reply-prefix">心心念语</span>
      <div class="reply-content">${r.text}</div>
      <div class="reply-meta">
        <span>${r.time}</span>
        <div class="reply-like" data-rid="${rid}">
          <span class="reply-like-count">${r.likeCount}</span>
          <span class="heart-icon ${r.liked?'active':''}">❤️</span>
        </div>
      </div>
    `;
    
    // 评论点赞
    item.querySelector('.reply-like').onclick = (e)=>{
      let rId = parseInt(e.currentTarget.dataset.rid);
      let rep = whispers[currentDetailId].replies[rId];
      rep.liked = !rep.liked;
      rep.likeCount += rep.liked?1:-1;
      e.currentTarget.querySelector('.heart-icon').classList.toggle('active',rep.liked);
      e.currentTarget.querySelector('.reply-like-count').textContent = rep.likeCount;
      saveWhispers();
    };
    
    el.appendChild(item);
  });
}

// 提交评论
function submitReply(){
  if(currentDetailId===-1)return;
  let t = document.getElementById('reply-input').value.trim();
  if(!t||t.length>50){alert('请输入50字以内的心念～');return;}
  
  // 添加评论
  whispers[currentDetailId].replies.push({
    text:t, 
    time:new Date().toLocaleTimeString(), 
    likeCount:0, 
    liked:false
  });
  
  // 重新渲染
  renderReplyList(whispers[currentDetailId].replies);
  document.getElementById('detail-reply-count').textContent = `回响 · ${whispers[currentDetailId].replies.length}`;
  
  // 清空输入
  document.getElementById('reply-input').value='';
  saveWhispers();
}

// 随机遇见：弹窗显示单条絮语
function showRandomWhisperModal(){
  if(!whispers.length){alert('暂无心念～');return;}
  
  // 随机选一条
  let randomId = Math.floor(Math.random()*whispers.length);
  let w = whispers[randomId];
  
  // 设置顶部色条
  document.getElementById('random-top-bar').style.background = w.color;
  
  // 填充内容
  document.getElementById('random-content').textContent = w.text;
  
  // 显示弹窗
  document.getElementById('random-modal').style.display = 'block';
}

// 查看全部：网格列表+滚动
function showAllWhispersList(){
  if(!whispers.length){alert('暂无心念～');return;}
  
  let contentEl = document.getElementById('all-list-content');
  contentEl.innerHTML = '';
  
  // 渲染所有絮语为网格列表
  whispers.forEach((w, id)=>{
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
      openWhisperDetail(id);
    };
    
    contentEl.appendChild(item);
  });
  
  // 显示弹窗
  document.getElementById('all-list-modal').style.display = 'block';
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