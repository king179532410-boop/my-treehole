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

// 新增：显示无数据或加载失败的提示
function showNoWhisperTip() {
  // 如果已经存在提示则不重复添加
  if (document.getElementById('no-whisper-tip')) return;
  
  const tip = document.createElement('div');
  tip.id = 'no-whisper-tip';
  tip.style.position = 'fixed';
  tip.style.top = '50%';
  tip.style.left = '50%';
  tip.style.transform = 'translate(-50%, -50%)';
  tip.style.color = '#C8C0B0';
  tip.style.fontSize = '16px';
  tip.style.textAlign = 'center';
  tip.style.zIndex = '9999';
  tip.innerHTML = '风很轻，云很淡<br>暂无心念回响<br><span style="font-size:12px; opacity:0.7;">(若持续显示请检查网络连接)</span>';
  document.body.appendChild(tip);
}

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
    const script = document.createElement('script');
    script.src = 'https://www.gstatic.com/firebasejs/9.22.1/firebase-app-compat.js';
    
    // 主 Firebase 脚本加载失败容错
    script.onerror = () => {
      showNoWhisperTip();
      alert("核心功能加载失败，请检查网络或稍后重试");
    };

    script.onload = () => {
      const dbScript = document.createElement('script');
      dbScript.src = 'https://www.gstatic.com/firebasejs/9.22.1/firebase-database-compat.js';
      
      // 增加 script 加载失败的容错
      dbScript.onerror = () => {
        showNoWhisperTip();
        alert("数据模块加载失败，请检查网络或稍后重试");
      };

      dbScript.onload = () => {
        // 增加 Firebase 加载后的错误捕获
        initFirebase().then(() => {
          syncWhispersFromCloud();
        }).catch((err) => {
          console.error("Firebase Init Error:", err);
          showNoWhisperTip();
          updateWhisperCount();
        });
      };
      document.head.appendChild(dbScript);
    };
    document.head.appendChild(script);
  } else {
    initFirebase().then(() => {
      syncWhispersFromCloud();
    }).catch((err) => {
      console.error("Firebase Init Error:", err);
      showNoWhisperTip();
      updateWhisperCount();
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
      resolve();
    } catch (error) {
      console.error("Firebase 初始化失败：", error);
      reject(error); // 捕获错误，避免阻塞
    }
  });
}

function syncWhispersFromCloud() {
  const whispersRef = db.ref('whispers');
  whispersRef.on('value', (snapshot) => {
    const cloudData = snapshot.val() || {};
    whispers = Object.values(cloudData);
    
    // 移除旧的 whisper 元素
    document.querySelectorAll('.whisper').forEach(el => el.remove());
    
    // 如果有数据，移除提示
    if (whispers.length > 0) {
      const tip = document.getElementById('no-whisper-tip');
      if (tip) tip.remove();
    } else {
      // 如果云端没数据，也显示提示
      showNoWhisperTip();
    }

    whispers.forEach((w, i) => renderWhisper(w, i));
    updateWhisperCount();
    keepMinCount();
  }, (error) => {
    console.error("Sync Error:", error);
    showNoWhisperTip();
  });
}

function publishWhisperToCloud(whisperData) {
  const whispersRef = db.ref('whispers');
  const newWhisperRef = whispersRef.push();
  whisperData.id = newWhisperRef.key;
  newWhisperRef.set(whisperData);
  myWhispers.push(whisperData);
  saveMyWhispers();
  return whisperData;
}

function updateWhisperInCloud(whisperId, updateData) {
  const whisperRef = db.ref(`whispers/${whisperId}`);
  whisperRef.update(updateData);
}

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
    if(currentDetailId===-1 || !whispers[currentDetailId].id)return;
    let w = whispers[currentDetailId];
    w.liked = !w.liked;
    w.likeCount += w.liked?1:-1;
    document.getElementById('detail-heart').classList.toggle('active',w.liked);
    document.getElementById('detail-like-count').textContent = w.likeCount;
    updateWhisperInCloud(w.id, {liked: w.liked, likeCount: w.likeCount});
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
    if(currentRandomId===-1 || !whispers[currentRandomId].id)return;
    let w = whispers[currentRandomId];
    w.liked = !w.liked;
    w.likeCount += w.liked?1:-1;
    document.getElementById('random-heart').classList.toggle('active',w.liked);
    document.getElementById('random-like-count').textContent = w.likeCount;
    updateWhisperInCloud(w.id, {liked: w.liked, likeCount: w.likeCount});
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
  
  if (db) {
    publishWhisperToCloud(newWhisper);
    setTimeout(() => {
      if (newWhisper.id) {
        updateWhisperInCloud(newWhisper.id, { forceShow: false });
      }
    }, 60000);
  }
  updateWhisperCount();
  document.getElementById('input-text').value='';
  document.getElementById('input-modal').style.display='none';
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
      if(currentId === -1 || !whispers[currentId].id) return;
      let rep = whispers[currentId].replies[rId];
      rep.liked = !rep.liked;
      rep.likeCount += rep.liked?1:-1;
      e.currentTarget.querySelector('.heart-icon').classList.toggle('active',rep.liked);
      e.currentTarget.querySelector('.reply-like-count').textContent = rep.likeCount;
      updateWhisperInCloud(whispers[currentId].id, {replies: whispers[currentId].replies});
    };
    listEl.appendChild(item);
  });
}

function submitReply(id, type){
  if(id===-1 || !whispers[id].id)return;
  const inputEl = type === 'detail' ? document.getElementById('reply-input') : document.getElementById('random-reply-input');
  let t = inputEl.value.trim();
  if(!t||t.length>50){alert('请输入50字以内的心念～');return;}
  whispers[id].replies.push({
    text:t, time:new Date().toLocaleTimeString(), likeCount:0, liked:false
  });
  updateWhisperInCloud(whispers[id].id, {replies: whispers[id].replies});
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