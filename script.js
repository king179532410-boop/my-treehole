// 先引入Firebase SDK（改用CDN直接引入v8版本，兼容更好）
(function() {
  // 加载Firebase App核心库
  const firebaseAppScript = document.createElement('script');
  firebaseAppScript.src = 'https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js';
  firebaseAppScript.async = false;
  
  // 加载Firebase实时数据库库
  const firebaseDbScript = document.createElement('script');
  firebaseDbScript.src = 'https://www.gstatic.com/firebasejs/8.10.1/firebase-database.js';
  firebaseDbScript.async = false;

  // 先加载app，再加载database，加载完成后初始化
  firebaseAppScript.onload = function() {
    firebaseDbScript.onload = function() {
      // ========== Firebase配置（你的专属信息） ==========
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
      // 初始化Firebase
      if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
      }
      const database = firebase.database();

      // ========== 全局变量 ==========
      let currentWhispers = []; // 所有絮语
      let myWhispers = []; // 我的絮语
      let currentScene = "夏·夜晚"; // 默认场景
      let onlineCount = 0; // 在线人数

      // ========== DOM元素获取 ==========
      const publishBtn = document.querySelector('.publish-btn');
      const inputModal = document.getElementById('input-modal');
      const inputCloseBtn = document.getElementById('input-close-btn');
      const submitBtn = document.getElementById('submit-btn');
      const inputText = document.getElementById('input-text');
      const moodSelect = document.getElementById('mood-select');
      const detailModal = document.getElementById('detail-modal');
      const detailCloseBtn = document.getElementById('detail-close-btn');
      const detailContent = document.getElementById('detail-content');
      const detailTopBar = document.getElementById('detail-top-bar');
      const detailReplyCount = document.getElementById('detail-reply-count');
      const detailLikeCount = document.getElementById('detail-like-count');
      const detailHeart = document.getElementById('detail-heart');
      const replyList = document.getElementById('reply-list');
      const replyInput = document.getElementById('reply-input');
      const replySubmitBtn = document.getElementById('reply-submit-btn');
      const randomBtn = document.querySelector('.random-btn');
      const randomModal = document.getElementById('random-modal');
      const randomCloseBtn = document.getElementById('random-close-btn');
      const randomContent = document.getElementById('random-content');
      const randomTopBar = document.getElementById('random-top-bar');
      const randomReplyCount = document.getElementById('random-reply-count');
      const randomLikeCount = document.getElementById('random-like-count');
      const randomHeart = document.getElementById('random-heart');
      const randomReplyList = document.getElementById('random-reply-list');
      const randomReplyInput = document.getElementById('random-reply-input');
      const randomReplySubmitBtn = document.getElementById('random-reply-submit-btn');
      const allBtn = document.querySelector('.all-btn');
      const allListModal = document.getElementById('all-list-modal');
      const allCloseBtn = document.getElementById('all-close-btn');
      const allListContent = document.getElementById('all-list-content');
      const colorTags = document.querySelectorAll('.color-tag');
      const allTag = document.querySelector('.all-tag');
      const myWhisperBtn = document.querySelector('.my-whisper-btn');
      const myListModal = document.getElementById('my-list-modal');
      const myCloseBtn = document.getElementById('my-close-btn');
      const myListContent = document.getElementById('my-list-content');
      const whisperCount = document.getElementById('whisper-count');
      const onlineCountEl = document.getElementById('online-count');
      const sceneDisplay = document.getElementById('scene-display');

      // ========== 初始化页面 ==========
      function initPage() {
        loadWhispers(); // 加载絮语
        listenOnlineCount(); // 监听在线人数
        switchScene(); // 切换场景
        console.log("页面初始化完成，Firebase连接成功");
      }

      // ========== 加载所有絮语 ==========
      function loadWhispers() {
        database.ref('whispers').on('value', (snapshot) => {
          const data = snapshot.val();
          currentWhispers = data ? Object.keys(data).map(key => ({
            id: key,
            ...data[key]
          })) : [];
          
          // 过滤我的絮语
          const myWhisperIds = JSON.parse(localStorage.getItem('myWhisperIds') || '[]');
          myWhispers = currentWhispers.filter(whisper => myWhisperIds.includes(whisper.id));
          
          // 更新总数
          whisperCount.textContent = currentWhispers.length;
          renderMyWhispers();
        }, (error) => {
          console.error("加载絮语失败：", error);
          alert("加载数据失败，请检查网络或Firebase配置");
        });
      }

      // ========== 监听在线人数 ==========
      function listenOnlineCount() {
        const onlineRef = database.ref('.info/connected');
        const userCountRef = database.ref('onlineUsers');
        
        onlineRef.on('value', (snapshot) => {
          if (snapshot.val()) {
            const userRef = userCountRef.push();
            userRef.onDisconnect().remove();
            userRef.set(true);
          }
        });
        
        userCountRef.on('value', (snapshot) => {
          onlineCount = snapshot.numChildren();
          onlineCountEl.textContent = `${onlineCount} 人此刻同在`;
        });
      }

      // ========== 切换场景 ==========
      function switchScene() {
        const scenes = ['春·清晨', '夏·夜晚', '秋·午后', '冬·黄昏'];
        setInterval(() => {
          currentScene = scenes[Math.floor(Math.random() * scenes.length)];
          sceneDisplay.textContent = currentScene;
        }, 30000);
      }

      // ========== 发布絮语 ==========
      function publishWhisper() {
        const content = inputText.value.trim();
        if (!content) {
          alert("请输入想发布的内容～");
          return;
        }
        
        // 获取心情和颜色
        const selectedOption = moodSelect.options[moodSelect.selectedIndex];
        const mood = selectedOption.value;
        const color = selectedOption.dataset.color;
        
        // 构造数据
        const whisperData = {
          content,
          mood,
          color,
          like: 0,
          replies: [],
          createTime: new Date().toLocaleString()
        };
        
        // 保存到Firebase
        const newWhisperRef = database.ref('whispers').push();
        const whisperId = newWhisperRef.key;
        newWhisperRef.set(whisperData).then(() => {
          // 记录我的絮语ID
          const myWhisperIds = JSON.parse(localStorage.getItem('myWhisperIds') || '[]');
          myWhisperIds.push(whisperId);
          localStorage.setItem('myWhisperIds', JSON.stringify(myWhisperIds));
          
          inputText.value = '';
          inputModal.style.display = 'none';
          loadWhispers();
          alert("发布成功～");
        }).catch((error) => {
          console.error("发布失败：", error);
          alert("发布失败，请重试");
        });
      }

      // ========== 打开详情弹窗 ==========
      function openDetailModal(whisper) {
        detailContent.textContent = whisper.content;
        detailTopBar.style.background = whisper.color;
        detailReplyCount.textContent = `回响 · ${whisper.replies ? whisper.replies.length : 0}`;
        detailLikeCount.textContent = whisper.like || 0;
        
        renderReplies(whisper.replies || [], replyList);
        
        // 绑定点赞
        detailHeart.onclick = () => likeWhisper(whisper.id, 'detail');
        // 绑定回复
        replySubmitBtn.onclick = () => submitReply(whisper.id, replyInput, 'detail');
        
        detailModal.style.display = 'block';
      }

      // ========== 打开随机遇见弹窗 ==========
      function openRandomModal() {
        if (currentWhispers.length === 0) {
          alert('暂无絮语，先来发布一条吧～');
          return;
        }
        
        const randomWhisper = currentWhispers[Math.floor(Math.random() * currentWhispers.length)];
        
        randomContent.textContent = randomWhisper.content;
        randomTopBar.style.background = randomWhisper.color;
        randomReplyCount.textContent = `回响 · ${randomWhisper.replies ? randomWhisper.replies.length : 0}`;
        randomLikeCount.textContent = randomWhisper.like || 0;
        
        renderReplies(randomWhisper.replies || [], randomReplyList);
        
        randomHeart.onclick = () => likeWhisper(randomWhisper.id, 'random');
        randomReplySubmitBtn.onclick = () => submitReply(randomWhisper.id, randomReplyInput, 'random');
        
        randomModal.style.display = 'block';
      }

      // ========== 打开全部列表 ==========
      function openAllListModal() {
        renderAllWhispers();
        allListModal.style.display = 'block';
      }

      // ========== 渲染全部絮语 ==========
      function renderAllWhispers(filterColor = 'all') {
        allListContent.innerHTML = '';
        
        let filteredWhispers = currentWhispers;
        if (filterColor !== 'all') {
          filteredWhispers = currentWhispers.filter(whisper => whisper.color === filterColor);
        }
        
        if (filteredWhispers.length === 0) {
          allListContent.innerHTML = '<p class="empty-tip">暂无相关絮语～</p>';
          return;
        }
        
        filteredWhispers.forEach(whisper => {
          const item = document.createElement('div');
          item.className = 'whisper-item';
          item.innerHTML = `
            <div class="whisper-color-bar" style="background:${whisper.color}"></div>
            <p class="whisper-text">${whisper.content}</p>
            <div class="whisper-meta">
              <span>回响 · ${whisper.replies ? whisper.replies.length : 0}</span>
              <span>❤️ ${whisper.like || 0}</span>
            </div>
          `;
          item.onclick = () => openDetailModal(whisper);
          allListContent.appendChild(item);
        });
      }

      // ========== 渲染我的絮语 ==========
      function renderMyWhispers() {
        myListContent.innerHTML = '';
        
        if (myWhispers.length === 0) {
          myListContent.innerHTML = '<p class="empty-tip">你还没有发布任何絮语～</p>';
          return;
        }
        
        myWhispers.forEach(whisper => {
          const item = document.createElement('div');
          item.className = 'whisper-item';
          item.innerHTML = `
            <div class="whisper-color-bar" style="background:${whisper.color}"></div>
            <p class="whisper-text">${whisper.content}</p>
            <div class="whisper-meta">
              <span>回响 · ${whisper.replies ? whisper.replies.length : 0}</span>
              <span>❤️ ${whisper.like || 0}</span>
            </div>
          `;
          item.onclick = () => openDetailModal(whisper);
          myListContent.appendChild(item);
        });
      }

      // ========== 渲染回复列表 ==========
      function renderReplies(replies, container) {
        container.innerHTML = '';
        
        if (replies.length === 0) {
          container.innerHTML = '<p class="empty-reply">暂无回响，先来留言吧～</p>';
          return;
        }
        
        replies.forEach(reply => {
          const replyItem = document.createElement('div');
          replyItem.className = 'reply-item';
          replyItem.innerHTML = `<p>${reply.content}</p><span>${reply.time}</span>`;
          container.appendChild(replyItem);
        });
      }

      // ========== 点赞絮语 ==========
      function likeWhisper(whisperId, type) {
        const whisperRef = database.ref(`whispers/${whisperId}`);
        whisperRef.once('value').then((snapshot) => {
          const whisper = snapshot.val();
          const newLikeCount = (whisper.like || 0) + 1;
          whisperRef.update({ like: newLikeCount }).then(() => {
            if (type === 'detail') detailLikeCount.textContent = newLikeCount;
            if (type === 'random') randomLikeCount.textContent = newLikeCount;
            loadWhispers();
          });
        }).catch((error) => {
          console.error("点赞失败：", error);
          alert("点赞失败，请重试");
        });
      }

      // ========== 提交回复 ==========
      function submitReply(whisperId, inputEl, type) {
        const content = inputEl.value.trim();
        if (!content || content.length > 50) {
          alert('请输入50字以内的回复～');
          return;
        }
        
        const replyData = {
          content,
          time: new Date().toLocaleString()
        };
        
        const whisperRef = database.ref(`whispers/${whisperId}`);
        whisperRef.once('value').then((snapshot) => {
          const whisper = snapshot.val();
          const replies = whisper.replies || [];
          replies.push(replyData);
          
          whisperRef.update({ replies }).then(() => {
            inputEl.value = '';
            loadWhispers();
            
            if (type === 'detail') {
              detailReplyCount.textContent = `回响 · ${replies.length}`;
              renderReplies(replies, replyList);
            }
            if (type === 'random') {
              randomReplyCount.textContent = `回响 · ${replies.length}`;
              renderReplies(replies, randomReplyList);
            }
          });
        }).catch((error) => {
          console.error("回复失败：", error);
          alert("回复失败，请重试");
        });
      }

      // ========== 绑定事件 ==========
      function bindEvents() {
        // 发布按钮
        publishBtn?.addEventListener('click', () => {
          inputModal.style.display = 'block';
        });
        
        // 关闭发布弹窗
        inputCloseBtn?.addEventListener('click', () => {
          inputModal.style.display = 'none';
        });
        
        // 提交絮语
        submitBtn?.addEventListener('click', publishWhisper);
        
        // 关闭详情弹窗
        detailCloseBtn?.addEventListener('click', () => {
          detailModal.style.display = 'none';
        });
        
        // 随机遇见
        randomBtn?.addEventListener('click', openRandomModal);
        
        // 关闭随机弹窗
        randomCloseBtn?.addEventListener('click', () => {
          randomModal.style.display = 'none';
        });
        
        // 查看全部
        allBtn?.addEventListener('click', openAllListModal);
        
        // 关闭全部列表
        allCloseBtn?.addEventListener('click', () => {
          allListModal.style.display = 'none';
        });
        
        // 颜色筛选
        colorTags.forEach(tag => {
          tag?.addEventListener('click', () => {
            colorTags.forEach(t => t.classList.remove('active'));
            allTag.classList.remove('active');
            tag.classList.add('active');
            renderAllWhispers(tag.dataset.color);
          });
        });
        
        // 全部标签
        allTag?.addEventListener('click', () => {
          colorTags.forEach(t => t.classList.remove('active'));
          allTag.classList.add('active');
          renderAllWhispers();
        });
        
        // 我的絮语
        myWhisperBtn?.addEventListener('click', () => {
          renderMyWhispers();
          myListModal.style.display = 'block';
        });
        
        // 关闭我的絮语
        myCloseBtn?.addEventListener('click', () => {
          myListModal.style.display = 'none';
        });
        
        // 点击弹窗外部关闭
        window.addEventListener('click', (e) => {
          if (e.target === inputModal) inputModal.style.display = 'none';
          if (e.target === detailModal) detailModal.style.display = 'none';
          if (e.target === randomModal) randomModal.style.display = 'none';
          if (e.target === allListModal) allListModal.style.display = 'none';
          if (e.target === myListModal) myListModal.style.display = 'none';
        });
      }

      // ========== 启动程序 ==========
      // 等待DOM加载完成
      document.addEventListener('DOMContentLoaded', function() {
        initPage();
        bindEvents();
      });
    };
    document.body.appendChild(firebaseDbScript);
  };
  document.body.appendChild(firebaseAppScript);
})();