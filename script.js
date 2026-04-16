let whispers = [];
let currentScene = 'summer';
let currentDetailId = -1;

// 背景配置
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

window.onload = function(){
  preloadBgImages();
  loadWhispers();
  updateWhisperCount();
  bindEvents();
  startRandomBgSwitch();
  initRealTimeStats();
  // 常驻显示控制
  setInterval(keepMinCount, 2000);
};

// 预加载背景
function preloadBgImages(){
  ['bg-spring.jpg','bg-summer.jpg','bg-autumn.jpg','bg-winter.jpg'].forEach(i=>{
    new Image().src = i;
  });
}

// 此刻同在
function initRealTimeStats(){
  updateRealOnlineCount();
  setInterval(updateRealOnlineCount, 300000);
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

// 背景切换
function startRandomBgSwitch(){
  switchRandomBg();
  setInterval(switchRandomBg, 10000);
}
function switchRandomBg(){
  let k = sceneKeys[Math.floor(Math.random()*sceneKeys.length)];
  while(k===currentScene) k=sceneKeys[Math.floor(Math.random()*sceneKeys.length)];
  currentScene = k;
  document.querySelector('body::before').style.backgroundImage = `url('${sceneMap[k].img}')`;
  document.getElementById('scene-display').textContent = sceneMap[k].name;
}

// 事件绑定
function bindEvents(){
  // 打开发布
  document.querySelector('.publish-btn').onclick = ()=>{
    document.getElementById('input-modal').style.display = 'block';
  };
  // 关闭发布
  document.getElementById('input-close-btn').onclick = ()=>{
    document.getElementById('input-modal').style.display = 'none';
  };
  // 提交发布
  document.getElementById('submit-btn').onclick = publishWhisper;
  // 关闭详情
  document.getElementById('detail-close-btn').onclick = ()=>{
    document.getElementById('detail-modal').style.display = 'none';
    currentDetailId = -1;
  };
  // 主点赞
  document.getElementById('detail-heart').onclick = ()=>{
    if(currentDetailId===-1)return;
    let w = whispers[currentDetailId];
    w.liked = !w.liked;
    w.likeCount += w.liked?1:-1;
    document.getElementById('detail-heart').classList.toggle('active',w.liked);
    document.getElementById('detail-like-count').textContent = w.likeCount;
    saveWhispers();
  };
  // 提交评论
  document.getElementById('reply-submit-btn').onclick = ()=>{
    submitReply();
    setTimeout(()=>{
      document.getElementById('detail-modal').style.display = 'none';
      currentDetailId = -1;
    },500);
  };
  // 随机/全部
  document.querySelector('.random-btn').onclick = showRandomWhisper;
  document.querySelector('.all-btn').onclick = showAllWhispers;
  document.querySelector('.my-whisper-btn').onclick = ()=>alert('功能待扩展');
}

// 发布絮语：新发布直接显示1分钟
function publishWhisper(){
  let t = document.getElementById('input-text').value.trim();
  if(!t){alert('请写下心念');return;}
  let c = colorList[Math.floor(Math.random()*colorList.length)];
  let w = {
    text:t, x:Math.random()*75+10, y:Math.random()*55+10,
    likeCount:0, liked:false, replies:[],
    color:c, time:new Date().toLocaleString(),
    forceShow:true // 强制显示1分钟
  };
  whispers.push(w);
  let id = whispers.length-1;
  renderWhisper(w,id);
  // 强制显示60秒
  setTimeout(()=>{
    whispers[id].forceShow = false;
  },60000);
  saveWhispers();
  updateWhisperCount();
  document.getElementById('input-text').value='';
  document.getElementById('input-modal').style.display='none';
}

// 渲染便签
function renderWhisper(w,id){
  let el = document.createElement('div');
  el.className = 'whisper show';
  el.innerText = w.text;
  el.style.left = w.x+'%';
  el.style.top = w.y+'%';
  el.style.setProperty('--top-color',w.color);
  // 鼠标移入变实10秒
  el.onmouseenter = ()=>{
    el.classList.add('hover');
    clearTimeout(window.hoverTimer);
    window.hoverTimer = setTimeout(()=>{
      el.classList.remove('hover');
    },10000);
  };
  // 点击打开详情
  el.onclick = ()=>openWhisperDetail(id);
  document.body.appendChild(el);
}

// 常驻3~5条，少于不消失
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

// 打开详情
function openWhisperDetail(id){
  currentDetailId = id;
  let w = whispers[id];
  document.getElementById('detail-content').textContent = w.text;
  document.getElementById('detail-reply-count').textContent = `回响 · ${w.replies.length}`;
  document.getElementById('detail-like-count').textContent = w.likeCount;
  document.getElementById('detail-heart').classList.toggle('active',w.liked);
  renderReplyList(w.replies);
  document.getElementById('detail-modal').style.display = 'block';
}

// 渲染评论
function renderReplyList(list){
  let el = document.getElementById('reply-list');
  el.innerHTML = list.length?'':'<div class="no-reply">暂无回响</div>';
  list.forEach((r,rid)=>{
    let i = document.createElement('div');
    i.className = 'reply-item';
    i.innerHTML = `
      <div class="reply-content">${r.text}</div>
      <div class="reply-meta">
        <span>${r.time}</span>
        <div class="reply-like" data-rid="${rid}">
          <span class="reply-like-count">${r.likeCount}</span>
          <span class="heart-icon ${r.liked?'active':''}">❤️</span>
        </div>
      </div>
    `;
    i.querySelector('.reply-like').onclick = (e)=>{
      let rId = parseInt(e.currentTarget.dataset.rid);
      let rep = whispers[currentDetailId].replies[rId];
      rep.liked = !rep.liked;
      rep.likeCount += rep.liked?1:-1;
      e.currentTarget.querySelector('.heart-icon').classList.toggle('active',rep.liked);
      e.currentTarget.querySelector('.reply-like-count').textContent = rep.likeCount;
      saveWhispers();
    };
    el.appendChild(i);
  });
}

// 提交评论
function submitReply(){
  if(currentDetailId===-1)return;
  let t = document.getElementById('reply-input').value.trim();
  if(!t||t.length>50){alert('50字以内');return;}
  whispers[currentDetailId].replies.push({
    text:t, time:new Date().toLocaleTimeString(), likeCount:0, liked:false
  });
  renderReplyList(whispers[currentDetailId].replies);
  document.getElementById('detail-reply-count').textContent = `回响 · ${whispers[currentDetailId].replies.length}`;
  document.getElementById('reply-input').value='';
  saveWhispers();
}

// 随机/全部
function showRandomWhisper(){
  if(!whispers.length){alert('暂无');return;}
  let id = Math.floor(Math.random()*whispers.length);
  let el = document.querySelectorAll('.whisper')[id];
  el.classList.add('hover');
  setTimeout(()=>el.classList.remove('hover'),3000);
}
function showAllWhispers(){
  if(!whispers.length){alert('暂无');return;}
  document.querySelectorAll('.whisper').forEach(e=>e.classList.add('hover'));
  setTimeout(()=>document.querySelectorAll('.whisper').forEach(e=>e.classList.remove('hover')),3000);
}

// 工具
function updateWhisperCount(){
  document.getElementById('whisper-count').textContent = whispers.length;
}
function saveWhispers(){
  localStorage.setItem('xinianbu',JSON.stringify(whispers));
}
function loadWhispers(){
  let d = localStorage.getItem('xinianbu');
  if(d){
    whispers = JSON.parse(d);
    whispers.forEach((w,i)=>renderWhisper(w,i));
  }
}