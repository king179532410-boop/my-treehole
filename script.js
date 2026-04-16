let whispers = [];
let myWhispers = [];
let currentScene = 'summer';
let currentDetailId = -1;
let currentRandomId = -1;
let hoverTimer = null;

const firebaseConfig = {
  apiKey: "AIzaSyCiK-17PbgUroDp0pPI-f_P5V_0hnPM0BM",
  authDomain: "treehole-e83ef.firebaseapp.com",
  databaseURL: "https://treehole-e83ef-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "treehole-e83ef",
  storageBucket: "treehole-e83ef.firebasestorage.app",
  messagingSenderId: "167495637236",
  appId: "1:167495637236:web:842c2600dc5d2fe196a6a1",
  measurementId: "G-4EXVLHC6B6"
};

const sceneMap = {
  spring:{img:'',name:'春·夜晚'},
  summer:{img:'',name:'夏·夜晚'},
  autumn:{img:'',name:'秋·夜晚'},
  winter:{img:'',name:'冬·夜晚'}
};
const sceneKeys = Object.keys(sceneMap);
let currentSceneIndex = 1;

const moodColorMap = {
  joy: "#FF5E7D", hope: "#7B61FF", love: "#4CC9FF", miss: "#2ECC71",
  hesitate: "#F1C40F", plain: "#E67E22", lonely: "#9B59B6"
};
const colorMoodMap = Object.fromEntries(Object.entries(moodColorMap).map(([k,v])=>[v,k]));

let db;
// 新增：标记 Firebase 是否加载/初始化成功
let firebaseReady = false;

window.onload = function(){
  const bgContainer = document.createElement('div');
  bgContainer.id = 'bg-container';
  document.body.appendChild(bgContainer);
  
  preloadBgImages();
  loadMyWhispers();
  bindEvents();
  startBgCarousel();
  initRealTimeStats();
  
  if (!window.firebase) {
    // 备选CDN（优先官方，失败换备用）
    const firebaseCdnList = [
      'https://www.gstatic.com/firebasejs/9.22.1/firebase-app-compat.js',
      'https://cdn.bootcdn.net/ajax/libs/firebase/9.22.1/firebase-app-compat.js'
    ];
    const dbCdnList = [
      'https://www.gstatic.com/firebasejs/9.22.1/firebase-database-compat.js',
      'https://cdn.bootcdn.net/ajax/libs/firebase/9.22.1/firebase-database-compat.js'
    ];

    // 加载脚本的通用函数
    function loadScript(cdnList, timeout = 10000) {
      return new Promise((resolve, reject) => {
        const load = (index) => {
          if (index >= cdnList.length) {
            reject(new Error("所有CDN加载失败"));
            return;
          }
          const script = document.createElement('script');
          script.src = cdnList[index];
          script.timeout = timeout;
          script.onload = () => resolve(script);
          script.onerror = () => load(index + 1);
          script.ontimeout = () => load(index + 1);
          document.head.appendChild(script);
        };
        load(0);
      });
    }

    // 加载Firebase App
    loadScript(firebaseCdnList)
      .then(() => loadScript(dbCdnList))
      .then(() => {
        initFirebase().then(() => {
          firebaseReady = true;
          syncWhispersFromCloud();
        }).catch(err => {
          console.error("Firebase 初始化失败：", err);
          showLocalModeTip();
        });
      })
      .catch(err => {
        console.warn("Firebase 脚本加载失败：", err);
        showLocalModeTip();
      });
  } else {
    // 原有逻辑
    initFirebase().then(() => {
      firebaseReady = true;
      syncWhispersFromCloud();
    }).catch(err => {
      console.error("Firebase 初始化失败：", err);
      showLocalModeTip();
    });
  }
};

// 【修改点】优化 initFirebase：增加重试机制 + 超时处理
function initFirebase() {
  return new Promise((resolve, reject) => {
    try {
      if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
      }
      db = firebase.database();
      
      // 优化：增加重试机制 + 超时处理
      const connectedRef = db.ref('.info/connected');
      let connectAttempts = 0;
      const maxAttempts = 3; // 最多重试3次
      
      const checkConnection = (snapshot) => {
        connectAttempts++;
        if (snapshot.val() === true) {
          resolve();
        } else if (connectAttempts < maxAttempts) {
          // 重试监听
          setTimeout(() => {
            connectedRef.once('value', checkConnection, connectError);
          }, 1000);
        } else {
          reject(new Error("数据库连接失败（多次重试后仍未成功）"));
        }
      };
      
      const connectError = (err) => {
        if (connectAttempts < maxAttempts) {
          connectAttempts++;
          setTimeout(() => {
            connectedRef.once('value', checkConnection, connectError);
          }, 1000);
        } else {
          reject(err);
        }
      };
      
      // 首次检测
      connectedRef.once('value', checkConnection, connectError);
      
      // 增加整体超时（10秒）
      setTimeout(() => {
        // 如果还没有 resolve 或 reject，则强制 reject
        // 注意：这里需要确保 Promise 状态未被改变，简单实现下直接 reject 即可，Promise 会忽略后续的 resolve/reject
        reject(new Error("数据库连接超时"));
      }, 10000);
      
    } catch (error) {
      reject(error);
    }
  });
}

// 优化：增加错误回调 + 判空 firebaseReady
function syncWhispersFromCloud() {
  if (!firebaseReady || !db) return;
  
  const whispersRef = db.ref('whispers');
  // 新增：移除旧监听，避免重复监听导致端口冲突
  whispersRef.off('value');
  // 新增：监听事件增加错误回调
  whispersRef.on('value', (snapshot) => {
    const cloudData = snapshot.val() || {};
    whispers = Object.values(cloudData);
    document.querySelectorAll('.whisper').forEach(el => el.remove());
    whispers.forEach((w, i) => renderWhisper(w, i));
    updateWhisperCount();
    keepMinCount();
  }, (error) => {
    // 捕获监听错误，避免端口报错
    console.error("同步云端数据失败：", error);
    showLocalModeTip();
  });
}

// 优化：发布前判断 firebaseReady
function publishWhisperToCloud(whisperData) {
  if (!firebaseReady || !db) return null;
  
  const whispersRef = db.ref('whispers');
  const newWhisperRef = whispersRef.push();
  whisperData.id = newWhisperRef.key;
  newWhisperRef.set(whisperData);
  myWhispers.push(whisperData);
  saveMyWhispers();
  return whisperData;
}

// 优化：更新前判断 firebaseReady
function updateWhisperInCloud(whisperId, updateData) {
  if (!firebaseReady || !db) return;
  
  const whisperRef = db.ref(`whispers/${whisperId}`);
  whisperRef.update(updateData);
}

// 新增：本地模式提示
function showLocalModeTip() {
  // 避免重复添加
  if (document.getElementById('local-mode-tip')) return;

  const tip = document.createElement('div');
  tip.id = 'local-mode-tip';
  tip.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0,0,0,0.8);
    color: #C8C0B0;
    padding: 8px 16px;
    border-radius: 4px;
    font-size: 12px;
    z-index: 9999;
    pointer-events: none;
  `;
  tip.innerText = "云端服务暂不可用，已进入本地模式（仅本地保存数据）";
  document.body.appendChild(tip);
  setTimeout(() => {
    if(tip.parentNode) tip.parentNode.removeChild(tip);
  }, 5000);
}

// 优化：发布函数增加本地降级
function publishWhisper(){
  let t = document.getElementById('input-text').value.trim();
  if(!t){alert('请写下您的心念～');return;}
  const select = document.getElementById('mood-select');
  const mood = select.value;
  const color = moodColorMap[mood];
  const maxTop = 85;
  const randomX = Math.random()*70+10;
  const randomY = Math.random()*(maxTop - 10) + 10;
  
  let newWhisper = {
    text:t, x:randomX, y:randomY, likeCount:0, liked:false, replies:[],
    color:color, mood:mood, time:new Date().toLocaleString(),
    forceShow:true, isMine: true
  };
  
  // 仅当 Firebase 就绪时才同步云端
  if (firebaseReady && db) {
    const cloudWhisper = publishWhisperToCloud(newWhisper);
    if (cloudWhisper) {
      setTimeout(() => {
        if (cloudWhisper.id) {
          updateWhisperInCloud(cloudWhisper.id, { forceShow: false });
        }
      }, 60000);
    }
  } else {
    // 本地降级：仅保存到 localStorage
    // 生成一个临时ID用于本地展示一致性
    newWhisper.id = 'local_' + Date.now();
    whispers.push(newWhisper);
    myWhispers.push(newWhisper);
    saveMyWhispers();
    renderWhisper(newWhisper, whispers.length - 1);
  }
  updateWhisperCount();
  document.getElementById('input-text').value='';
  document.getElementById('input-modal').style.display='none';
}

// 以下函数保持不变（仅上文修改了核心逻辑，其余无需改动）
function preloadBgImages(){}
function initRealTimeStats(){
  updateRealOnlineCount();
  setInterval(updateRealOnlineCount, 300000);
}
function updateRealOnlineCount(){
  let n = Math.floor(Math.random()*50)+1;
  document.getElementById('online-count').textContent = `${n} 人此刻同在`;
}
function startBgCarousel(){
  const bgContainer = document.getElementById('bg-container');
  bgContainer.style.background = '#1a1720';
  document.getElementById('scene-display').textContent = sceneMap.summer.name;
  setInterval(()=>{
    currentSceneIndex = (currentSceneIndex + 1) % sceneKeys.length;
    const key = sceneKeys[currentSceneIndex];
    currentScene = key;
    document.getElementById('scene-display').textContent = sceneMap[key].name;
  }, 20000);
}

function bindEvents(){
  document.querySelector('.publish-btn').onclick = ()=>{
    document.getElementById('input-modal').style.display = 'block';
  };
  document.getElementById('input-close-btn').onclick = ()=>{
    document.getElementById('input-modal').style.display = 'none';
  };
  document.getElementById('submit-btn').onclick = publishWhisper;
  document.getElementById('detail-close-btn').onclick = ()=>{
    document.getElementById('detail-modal').style.display = 'none';
    currentDetailId = -1;
  };
  document.getElementById('detail-heart').onclick = ()=>{
    if(currentDetailId===-1 || !whispers[currentDetailId] || !whispers[currentDetailId].id)return;
    let w = whispers[currentDetailId];
    w.liked = !w.liked;
    w.likeCount += w.liked?1:-1;
    document.getElementById('detail-heart').classList.toggle('active',w.liked);
    document.getElementById('detail-like-count').textContent = w.likeCount;
    // 仅 Firebase 就绪时更新云端
    if (firebaseReady && db) {
      updateWhisperInCloud(w.id, {liked: w.liked, likeCount: w.likeCount});
    }
  };
  document.getElementById('reply-submit-btn').onclick = ()=>{
    submitReply(currentDetailId, 'detail');
    setTimeout(()=>{
      document.getElementById('detail-modal').style.display = 'none';
      currentDetailId = -1;
    },500);
  };
  document.querySelector('.random-btn').onclick = showRandomWhisperModal;
  document.getElementById('random-close-btn').onclick = ()=>{
    document.getElementById('random-modal').style.display = 'none';
    currentRandomId = -1;
  };
  document.getElementById('random-heart').onclick = ()=>{
    if(currentRandomId===-1 || !whispers[currentRandomId] || !whispers[currentRandomId].id)return;
    let w = whispers[currentRandomId];
    w.liked = !w.liked;
    w.likeCount += w.liked?1:-1;
    document.getElementById('random-heart').classList.toggle('active',w.liked);
    document.getElementById('random-like-count').textContent = w.likeCount;
    // 仅 Firebase 就绪时更新云端
    if (firebaseReady && db) {
      updateWhisperInCloud(w.id, {liked: w.liked, likeCount: w.likeCount});
    }
  };
  document.getElementById('random-reply-submit-btn').onclick = ()=>{
    submitReply(currentRandomId, 'random');
  };
  document.querySelector('.all-btn').onclick = ()=>{
    renderAllWhispersList('all');
    document.getElementById('all-list-modal').style.display = 'block';
  };
  document.querySelectorAll('.color-tag, .all-tag').forEach(tag=>{
    tag.onclick = ()=>{
      document.querySelectorAll('.color-tag, .all-tag').forEach(t=>t.classList.remove('active'));
      tag.classList.add('active');
      const color = tag.dataset.color;
      renderAllWhispersList(color);
    };
  });
  document.getElementById('all-close-btn').onclick = ()=>{
    document.getElementById('all-list-modal').style.display = 'none';
  };
  document.querySelector('.my-whisper-btn').onclick = showMyWhispersList;
  document.getElementById('my-close-btn').onclick = ()=>{
    document.getElementById('my-list-modal').style.display = 'none';
  };
}

function renderWhisper(w, id){
  let el = document.createElement('div');
  el.className = 'whisper show';
  el.innerText = w.text;
  el.style.left = w.x+'%';
  el.style.top = w.y+'%';
  el.style.setProperty('--top-color', w.color);
  
  el.onmouseenter = ()=>{
    clearTimeout(hoverTimer);
    el.classList.add('hover');
  };
  el.onmouseleave = ()=>{
    hoverTimer = setTimeout(()=>{
      el.classList.remove('hover');
    }, 1000);
  };
  el.onclick = ()=>openWhisperDetail(id);
  document.body.appendChild(el);
}

function openWhisperDetail(id){
  if (id === -1 || !whispers[id]) return;
  currentDetailId = id;
  let w = whispers[id];
  document.getElementById('detail-top-bar').style.background = w.color;
  document.getElementById('detail-content').textContent = w.text;
  document.getElementById('detail-reply-count').textContent = `回响 · ${w.replies.length}`;
  document.getElementById('detail-like-count').textContent = w.likeCount;
  document.getElementById('detail-heart').classList.toggle('active',w.liked);
  renderReplyList(w.replies, 'detail');
  document.getElementById('detail-modal').style.display = 'block';
}

function renderReplyList(list, type){
  const listEl = type === 'detail' ? document.getElementById('reply-list') : document.getElementById('random-reply-list');
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
    item.querySelector('.reply-like').onclick = (e)=>{
      const rId = parseInt(e.currentTarget.dataset.rid);
      const currentId = type === 'detail' ? currentDetailId : currentRandomId;
      if(currentId === -1 || !whispers[currentId]) return;
      let rep = whispers[currentId].replies[rId];
      if (!rep) return;
      
      rep.liked = !rep.liked;
      rep.likeCount += rep.liked?1:-1;
      e.currentTarget.querySelector('.heart-icon').classList.toggle('active',rep.liked);
      e.currentTarget.querySelector('.reply-like-count').textContent = rep.likeCount;
      // 仅 Firebase 就绪时更新云端
      if (firebaseReady && db && whispers[currentId].id) {
        updateWhisperInCloud(whispers[currentId].id, {replies: whispers[currentId].replies});
      }
    };
    listEl.appendChild(item);
  });
}

function submitReply(id, type){
  if(id===-1 || !whispers[id]) return;
  const inputEl = type === 'detail' ? document.getElementById('reply-input') : document.getElementById('random-reply-input');
  let t = inputEl.value.trim();
  if(!t||t.length>50){alert('请输入50字以内的心念～');return;}
  whispers[id].replies.push({
    text:t, time:new Date().toLocaleTimeString(), likeCount:0, liked:false
  });
  // 仅 Firebase 就绪时更新云端
  if (firebaseReady && db && whispers[id].id) {
    updateWhisperInCloud(whispers[id].id, {replies: whispers[id].replies});
  }
  renderReplyList(whispers[id].replies, type);
  if(type === 'detail'){
    document.getElementById('detail-reply-count').textContent = `回响 · ${whispers[id].replies.length}`;
  }else{
    document.getElementById('random-reply-count').textContent = `回响 · ${whispers[id].replies.length}`;
  }
  inputEl.value='';
}

function showRandomWhisperModal(){
  if(!whispers.length){alert('暂无心念～');return;}
  currentRandomId = Math.floor(Math.random()*whispers.length);
  let w = whispers[currentRandomId];
  document.getElementById('random-top-bar').style.background = w.color;
  document.getElementById('random-content').textContent = w.text;
  document.getElementById('random-reply-count').textContent = `回响 · ${w.replies.length}`;
  document.getElementById('random-like-count').textContent = w.likeCount;
  document.getElementById('random-heart').classList.toggle('active',w.liked);
  renderReplyList(w.replies, 'random');
  document.getElementById('random-modal').style.display = 'block';
}

function renderAllWhispersList(filterColor){
  let contentEl = document.getElementById('all-list-content');
  contentEl.innerHTML = '';
  let filteredWhispers = filterColor === 'all' ? whispers : whispers.filter(w => w.color === filterColor);
  if(filteredWhispers.length === 0){
    contentEl.innerHTML = '<div style="width:100%; text-align:center; padding:50px; color:#C8C0B0;">暂无该心情的念语</div>';
    return;
  }
  filteredWhispers.forEach((w, idx)=>{
    const originalId = whispers.findIndex(item => item.id === w.id);
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
    item.onclick = ()=>{
      document.getElementById('all-list-modal').style.display = 'none';
      openWhisperDetail(originalId);
    };
    contentEl.appendChild(item);
  });
}

function showMyWhispersList(){
  if(!myWhispers.length){alert('您还未发布任何心念～');return;}
  let contentEl = document.getElementById('my-list-content');
  contentEl.innerHTML = '';
  myWhispers.forEach((w, id)=>{
    let item = document.createElement('div');
    item.className = 'my-list-item';
    item.style.setProperty('--item-color', w.color);
    item.innerHTML = `
      <div class="my-item-content">${w.text}</div>
      <div class="all-item-meta">
        <span>${w.time}</span>
        <span>回响 · ${w.replies.length}</span>
      </div>
    `;
    item.onclick = ()=>{
      document.getElementById('my-list-modal').style.display = 'none';
      let whisperId = whispers.findIndex(item => item.id === w.id || (item.text === w.text && item.time === w.time));
      if(whisperId !== -1) openWhisperDetail(whisperId);
    };
    contentEl.appendChild(item);
  });
  document.getElementById('my-list-modal').style.display = 'block';
}

function keepMinCount(){
  let show = document.querySelectorAll('.whisper.show');
  let min = Math.min(5, Math.max(3, whispers.length));
  if(show.length < min){
    let hids = document.querySelectorAll('.whisper.hidden');
    for(let i=0; i<min-show.length; i++){
      if(hids[i]) hids[i].classList.remove('hidden');
    }
  }
}

function updateWhisperCount(){
  document.getElementById('whisper-count').textContent = whispers.length;
}

function saveMyWhispers(){
  localStorage.setItem('xinianbu_my', JSON.stringify(myWhispers));
}
function loadMyWhispers(){
  let d = localStorage.getItem('xinianbu_my');
  if(d) myWhispers = JSON.parse(d);
}