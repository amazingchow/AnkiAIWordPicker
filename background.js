// 这个脚本在后台持续运行，它负责处理事件、管理插件状态、与服务器通信等。在Manifest V3（当前最新标准）中，它以 Service Worker 的形式存在，是事件驱动的，不会一直占用资源。
// 它的任务是管理单词数据的存储和读取。
console.log("[AnkiAIWordPicker] background.js loaded successfully.");

const STORAGE_KEY = "AnkiAIWordPicker";
const CONFIG_KEYS = {
    OPENAI_BASE_URL: "openai_base_url",
    OPENAI_API_KEY: "openai_api_key"
};

// 添加文本到存储
async function addTextToStorage(text) {
    try {
        // 获取现有数据
        const result = await chrome.storage.local.get(STORAGE_KEY);
        
        const words = result[STORAGE_KEY] || [];
        // 检查是否已存在
        if (words.some((word) => word.text === text)) {
            console.log("[AnkiAIWordPicker] Text already exists in storage, not adding again.");
            return false;
        }

        // 添加新记录
        const record = {
            text: text,
            timestamp: new Date().toISOString(),
        };
        words.push(record);

        // 保存更新后的数据
        await chrome.storage.local.set({ [STORAGE_KEY]: words });
        console.log("[AnkiAIWordPicker] Text added to storage:", record);
        return true;
    } catch (error) {
        console.error("[AnkiAIWordPicker] Error adding text to storage:", error);
        return false;
    }
}


// 获取配置
async function getConfig() {
    try {
        const result = await chrome.storage.sync.get(Object.values(CONFIG_KEYS));
        return {
            [CONFIG_KEYS.OPENAI_BASE_URL]: result[CONFIG_KEYS.OPENAI_BASE_URL] || "https://api.openai.com/v1",
            [CONFIG_KEYS.OPENAI_API_KEY]: result[CONFIG_KEYS.OPENAI_API_KEY] || ""
        };
    } catch (error) {
        console.error("[AnkiAIWordPicker] Error getting config:", error);
        return {
            [CONFIG_KEYS.OPENAI_BASE_URL]: "https://api.openai.com/v1",
            [CONFIG_KEYS.OPENAI_API_KEY]: ""
        };
    }
}

// 监听来自 content.js 和 options.js 的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "ANKI_AI_WORD_PICKER_EXT_SAVE_TEXT") {
        addTextToStorage(message.data).then((success) => {
            sendResponse({ success, message: success ? "Text saved successfully" : "Failed to save text" });
        });
        // 返回 true 表示我们将异步发送响应
        return true;
    } else if (message.type === "GET_CONFIG") {
        getConfig().then(config => {
            sendResponse({ success: true, config });
        });
        // 返回 true 表示我们将异步发送响应
        return true;
    }
});
