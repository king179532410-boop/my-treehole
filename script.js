// 全局变量
let db;

// 等待页面+Firebase完全加载
document.addEventListener('DOMContentLoaded', async function() {
  // 1. Firebase配置（复制你的真实配置，别改格式）
  const firebaseConfig = {
    apiKey: "AIzaSyCik-17PbgUrpD0pPI-f_P5V_0hnPM0BM",
    authDomain: "treehole-e83ef.firebaseapp.com",
    projectId: "treehole-e83ef",
    storageBucket: "treehole-e83ef.firebasestorage.app",
    messagingSenderId: "167495637236",
    appId: "1:167495637236:web:33d3580bd0b1621196a6a1",
    measurementId: "G-YWCS7J2BH8"
  };

  // 2. 初始化Firebase（兼容模式）
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }
  // 3. 初始化数据库
  db = firebase.firestore();

  // 4. 加载已有丝带
  await loadRibbons();
});

// 发布丝带
async function publishRibbon() {
  // 检查数据库是否初始化
  if (!db) {
    alert("网站初始化中，请等2秒再试～");
    return;
  }

  // 获取输入内容
  let content = document.getElementById("content").value.trim();
  if (!content) {
    alert("请输入想发布的内容哦～");
    return;
  }

  try {
    // 存入数据库
    await db.collection("ribbons").add({
      content: content,
      time: firebase.firestore.FieldValue.serverTimestamp()
    });
    alert("发布成功！🎀");
    document.getElementById("content").value = ""; // 清空输入框
    await loadRibbons(); // 刷新列表
  } catch (error) {
    alert("发布失败：" + error.message);
    console.log("发布错误详情：", error);
  }
}

// 加载所有丝带
async function loadRibbons() {
  if (!db) {
    console.log("数据库还没初始化");
    return;
  }

  const list = document.getElementById("ribbonList");
  list.innerHTML = "加载中...";

  try {
    // 获取数据库中的丝带数据
    const snapshot = await db.collection("ribbons").get();
    list.innerHTML = "";

    // 倒序展示（最新的在最上面）
    const ribbons = [];
    snapshot.forEach(doc => ribbons.push({ id: doc.id, ...doc.data() }));
    ribbons.reverse();

    // 渲染每个丝带卡片
    ribbons.forEach(item => {
      let timeText = "刚刚";
      if (item.time && item.time.toDate) {
        timeText = new Date(item.time.toDate()).toLocaleString();
      }
      list.innerHTML += `
        <div class="ribbon">
          <div class="text">${item.content}</div>
          <div class="time">发布时间：${timeText}</div>
        </div>
      `;
    });

    // 如果没有数据
    if (ribbons.length === 0) {
      list.innerHTML = "<div style='text-align:center; color:#999; padding:20px;'>还没有心事丝带，快来发布第一条吧～</div>";
    }
  } catch (error) {
    list.innerHTML = "<div style='text-align:center; color:#ff4444; padding:20px;'>加载失败，请刷新页面重试</div>";
    console.log("加载错误详情：", error);
  }
}