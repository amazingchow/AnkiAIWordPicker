// 这个脚本在后台持续运行，负责管理 IndexedDB 数据库的创建、读取和写入。

console.log("'AnkiAIWordPicker' - Background script loaded successfully.");

const DB_NAME = "WordCollectorDB";
const STORE_NAME = "words";
let db;

// 初始化数据库
function initDB() {
    const request = indexedDB.open(DB_NAME, 1);

    request.onsuccess = (event) => {
        db = event.target.result;
        console.log("'AnkiAIWordPicker' - Database opened successfully.");
    };

    request.onupgradeneeded = (event) => {
        const db = event.target.result;
        // 创建一个名为 'words' 的对象存储空间（类似数据库的表）
        // 使用 'text' 字段作为主键，确保不会重复保存相同的文本
        const objectStore = db.createObjectStore(STORE_NAME, { keyPath: "text" });
        // 为 'timestamp' 字段创建索引，方便未来按时间排序
        objectStore.createIndex("timestamp", "timestamp", { unique: false });
        console.log("'AnkiAIWordPicker' - Database upgrade complete.");
    };

    request.onerror = (event) => {
        console.error("'AnkiAIWordPicker' - Database error:", event.target.errorCode);
    };
}

// 添加文本到数据库
function addTextToDB(text) {
    if (!db) {
        console.error("'AnkiAIWordPicker' - Database is not initialized.");
        return;
    }

    // 创建一个读写事务
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const objectStore = transaction.objectStore(STORE_NAME);

    const record = {
        text: text,
        timestamp: new Date().toISOString(),
    };

    // 添加记录
    const request = objectStore.add(record);

    request.onsuccess = () => {
        console.log("'AnkiAIWordPicker' - Text added to DB:", record);
    };

    request.onerror = (event) => {
        // 如果文本已存在（因为text是主键），这里会报错，这正好可以防止重复
        if (event.target.error.name === "ConstraintError") {
            console.log("'AnkiAIWordPicker' - Text already exists in DB, not adding again.");
        } else {
            console.error("'AnkiAIWordPicker' - Error adding text to DB:", event.target.error);
        }
    };
}

// 监听来自 content.js 的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "WORD_COLLECTOR_EXTENSION_SAVE_TEXT") {
        addTextToDB(message.data);
        // 发送响应以确认消息已处理
        sendResponse({ success: true, message: "Text saved successfully" });
    }
    // 返回 true 表示我们将异步发送响应
    return true;
});

// 插件安装或启动时初始化数据库
initDB();
