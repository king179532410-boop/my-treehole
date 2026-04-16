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
  storageBucket: "treehole-e83ef.appspot.com",
  messagingSenderId: "167495637236",
  appId: "1:167495637236:web:842c2600dc5d2fe196a6a1",
  measurementId: "G-4EXVLHC6B6"
};

const sceneMap = {
  spring:{img:'https://your-cdn.com/spring-night.webp',name:'春·夜晚'},
  summer:{img:'https://your-cdn.com/summer-night.webp',name:'夏·夜晚'},
  autumn:{img:'https://your-cdn.com/autumn-night.webp',name:'秋·夜晚'},
  winter:{img:'https://your-cdn.com/winter-night.webp',name:'冬·夜晚'}
};
const sceneKeys = Object.keys(sceneMap);
let currentSceneIndex = 1;

const moodColorMap = {
  joy: "#FF5E7D", hope: "#7B61FF", love: "#4CC9FF", miss: "#2ECC71",
  hesitate: "#F1C40F", plain: "#E67E22", lonely: "#9B59B6"
};
const colorMoodMap = Object.fromEntries(Object.entries(moodColorMap).map(([k,v])=>[v,k]));

let db;
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
    const firebaseCdnList = [
      'https://www.gstatic.com/firebasejs/9.22.1/firebase-app-compat.js',
      'https://cdn.bootcdn.net/ajax/libs/firebase/9.22.1/firebase-app-compat.js'
    ];
    const dbCdnList = [
      'https://www.gstatic.com/firebasejs/9.22.1/firebase-database-compat.js',
      'https://cdn.bootcdn.net/ajax/libs/firebase/9.22.1/firebase-database-compat.js'
    ];

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
    initFirebase().then(() => {
      firebaseReady = true;
      syncWhispersFromCloud();
    }).catch(err => {
      console.error("Firebase 初始化失败：", err);
      showLocalModeTip();
    });
  }
};

function initFirebase() {
  return new Promise((resolve, reject) => {
    try {
      if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
      }
      db = firebase.database();
      
      const connectedRef = db.ref('.info/connected');
      let connectAttempts = 0;
      const maxAttempts = 3;
      
      const checkConnection = (snapshot) => {
        connectAttempts++;
        if (snapshot.val() === true) {
          resolve();
        } else if (connectAttempts < maxAttempts) {
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
      
      connectedRef.once('value', checkConnection, connectError);
      
      setTimeout(() => {
        reject(new Error("数据库连接超时"));
      }, 10000);
      
    } catch (error) {
      reject(error);
    }
  });
}

function syncWhispersFromCloud() {
  if (!firebaseReady || !db) return;
  
  const whispersRef = db.ref('whispers');
  whispersRef.off('value');
  whispersRef.on('value', (snapshot) => {
    const cloudData = snapshot.val() || {};
    whispers = Object.values(cloudData).map(item => ({
      id: item.id || '',
      text: item.text || '',
      x: item.x || 0,
      y: item.y || 0,
      likeCount: item.likeCount || 0,
      liked: item.liked || false,
      replies: item.replies || [],
      color: item.color || "#E67E22",
      mood: item.mood || "plain",
      time: item.time || new Date().toLocaleString(),
      forceShow: item.forceShow || false,
      isMine: item.isMine || false
    }));
    document.querySelectorAll('.whisper').forEach(el => el.remove());
    whispers.forEach((w, i) => renderWhisper(w, i));
    updateWhisperCount();
    keepMinCount();
  }, (error) => {
    console.error("同步云端数据失败：", error);
    showLocalModeTip();
  });
}

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

function updateWhisperInCloud(whisperId, updateData) {
  if (!firebaseReady || !db || !whisperId) return;
  
  const whisperRef = db.ref(`whispers/${whisperId}`);
  whisperRef.update(updateData);
}

function showLocalModeTip() {
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

function getRandomWhisperPosition() {
  const whisperWidth = 192;
  const whisperHeight = 108;
  const maxX = window.innerWidth - whisperWidth - 20;
  const maxY = window.innerHeight - whisperHeight - 20;
  const xPercent = Math.max(5, Math.min(90, (Math.random() * maxX / window.innerWidth) * 100));
  const yPercent = Math.max(5, Math.min(90, (Math.random() * maxY / window.innerHeight) * 100));
  return { x: xPercent, y: yPercent };
}

function publishWhisper(){
  let t = document.getElementById('input-text').value.trim();
  if(!t){alert('请写下您的心念～');return;}
  const select = document.getElementById('mood-select');
  const mood = select.value;
  const color = moodColorMap[mood] || "#E67E22";
  
  const { x: randomX, y: randomY } = getRandomWhisperPosition();
  
  let newWhisper = {
    text:t, 
    x:randomX, 
    y:randomY, 
    likeCount:0, 
    liked:false, 
    replies:[],
    color:color, 
    mood:mood, 
    time:new Date().toLocaleString(),
    forceShow:true, 
    isMine: true
  };
  
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

function preloadBgImages() {
  Object.values(sceneMap).forEach(scene => {
    if (scene.img) {
      const img = new Image();
      img.src = scene.img;
    }
  });
}

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
  const initialScene = sceneMap.summer;
  bgContainer.style.background = initialScene.img 
    ? `url(${initialScene.img}) center/cover no-repeat #1a1720` 
    : '#1a1720';
  document.getElementById('scene-display').textContent = sceneMap.summer.name;
  
  setInterval(()=>{
    currentSceneIndex = (currentSceneIndex + 1) % sceneKeys.length;
    const key = sceneKeys[currentSceneIndex];
    currentScene = key;
    const scene = sceneMap[key];
    bgContainer.style.background = scene.img 
      ? `url(${scene.img}) center/cover no-repeat #1a1720` 
      : '#1a1720';
    document.getElementById('scene-display').textContent = scene.name;
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
    if(currentDetailId === -1 || !whispers[currentDetailId]) return;
    let w = whispers[currentDetailId];
    w.liked = !w.liked;
    w.likeCount = w.liked ? w.likeCount + 1 : Math.max(0, w.likeCount - 1);
    document.getElementById('detail-heart').classList.toggle('active',w.liked);
    document.getElementById('detail-like-count').textContent = w.likeCount;
    if (firebaseReady && db && w.id) {
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
    if(currentRandomId === -1 || !whispers[currentRandomId]) return;
    let w = whispers[currentRandomId];
    w.liked = !w.liked;
    w.likeCount = w.liked ? w.likeCount + 1 : Math.max(0, w.likeCount - 1);
    document.getElementById('random-heart').classList.toggle('active',w.liked);
    document.getElementById('random-like-count').textContent = w.likeCount;
    if (firebaseReady && db && w.id) {
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
  if (!w) return;
  let el = document.createElement('div');
  el.className = 'whisper show';
  el.innerText = w.text || '';
  el.style.left = `${w.x || 0}%`;
  el.style.top = `${w.y || 0}%`;
  el.style.setProperty('--top-color', w.color || "#E67E22");
  
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