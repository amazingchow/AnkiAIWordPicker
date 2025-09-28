// 配置页面JavaScript文件
console.log("[AnkiAIWordPicker] options.js loaded successfully");

// 配置键名
const CONFIG_KEYS = {
    OPENAI_BASE_URL: "openai_base_url",
    OPENAI_API_KEY: "openai_api_key"
};

// 默认配置
const DEFAULT_CONFIG = {
    [CONFIG_KEYS.OPENAI_BASE_URL]: "https://api.openai.com/v1",
    [CONFIG_KEYS.OPENAI_API_KEY]: ""
};

// DOM元素
const form = document.getElementById("config-form");
const baseUrlInput = document.getElementById("openai-base-url");
const apiKeyInput = document.getElementById("openai-api-key");
const testConnectionBtn = document.getElementById("test-connection");
const resetConfigBtn = document.getElementById("reset-config");
const statusMessage = document.getElementById("status-message");
const apiStatus = document.getElementById("api-status");
const statusIndicator = document.getElementById("status-indicator");
const statusText = document.getElementById("status-text");

// 显示状态消息
function showStatusMessage(message, isError = false) {
    statusMessage.textContent = message;
    statusMessage.className = `status-message ${isError ? 'status-error' : 'status-success'}`;
    statusMessage.style.display = 'block';
    
    // 3秒后自动隐藏
    setTimeout(() => {
        statusMessage.style.display = 'none';
    }, 3000);
}

// 显示API状态
function showApiStatus(isConnected, message) {
    apiStatus.style.display = 'flex';
    statusIndicator.className = `status-indicator ${isConnected ? 'connected' : 'error'}`;
    statusText.textContent = message;
}

// 隐藏API状态
function hideApiStatus() {
    apiStatus.style.display = 'none';
}

// 加载配置
async function loadConfig() {
    try {
        const result = await chrome.storage.sync.get(Object.values(CONFIG_KEYS));
        
        baseUrlInput.value = result[CONFIG_KEYS.OPENAI_BASE_URL] || DEFAULT_CONFIG[CONFIG_KEYS.OPENAI_BASE_URL];
        apiKeyInput.value = result[CONFIG_KEYS.OPENAI_API_KEY] || DEFAULT_CONFIG[CONFIG_KEYS.OPENAI_API_KEY];
        
        console.log("[AnkiAIWordPicker] Configuration loaded successfully");
    } catch (error) {
        console.error("[AnkiAIWordPicker] Error loading configuration:", error);
        showStatusMessage("加载配置失败", true);
    }
}

// 保存配置
async function saveConfig() {
    try {
        const config = {
            [CONFIG_KEYS.OPENAI_BASE_URL]: baseUrlInput.value.trim(),
            [CONFIG_KEYS.OPENAI_API_KEY]: apiKeyInput.value.trim()
        };
        
        // 验证配置
        if (!config[CONFIG_KEYS.OPENAI_BASE_URL]) {
            showStatusMessage("请输入OpenAI Base URL", true);
            return;
        }
        
        if (!config[CONFIG_KEYS.OPENAI_API_KEY]) {
            showStatusMessage("请输入OpenAI API Key", true);
            return;
        }
        
        // 验证URL格式
        try {
            new URL(config[CONFIG_KEYS.OPENAI_BASE_URL]);
        } catch (e) {
            showStatusMessage("请输入有效的URL格式", true);
            return;
        }
        
        // 保存到chrome.storage.sync
        await chrome.storage.sync.set(config);
        
        console.log("[AnkiAIWordPicker] Configuration saved successfully");
        showStatusMessage("配置保存成功！");
        
        // 隐藏API状态，因为配置已更改
        hideApiStatus();
        
    } catch (error) {
        console.error("[AnkiAIWordPicker] Error saving configuration:", error);
        showStatusMessage("保存配置失败", true);
    }
}

// 测试API连接
async function testConnection() {
    const baseUrl = baseUrlInput.value.trim();
    const apiKey = apiKeyInput.value.trim();
    
    if (!baseUrl || !apiKey) {
        showStatusMessage("请先填写完整的配置信息", true);
        return;
    }
    
    try {
        showApiStatus(false, "测试连接中...");
        
        // 发送测试请求到background script
        const response = await chrome.runtime.sendMessage({
            type: "TEST_OPENAI_CONNECTION",
            data: {
                baseUrl: baseUrl,
                apiKey: apiKey
            }
        });
        
        if (response && response.success) {
            showApiStatus(true, "连接成功！");
            showStatusMessage("API连接测试成功！");
        } else {
            showApiStatus(false, response.message || "连接失败");
            showStatusMessage("API连接测试失败: " + (response.message || "未知错误"), true);
        }
        
    } catch (error) {
        console.error("[AnkiAIWordPicker] Error testing connection:", error);
        showApiStatus(false, "连接错误");
        showStatusMessage("连接测试失败: " + error.message, true);
    }
}

// 重置配置
async function resetConfig() {
    if (confirm("确定要重置所有配置吗？这将清除所有已保存的设置。")) {
        try {
            await chrome.storage.sync.clear();
            
            baseUrlInput.value = DEFAULT_CONFIG[CONFIG_KEYS.OPENAI_BASE_URL];
            apiKeyInput.value = DEFAULT_CONFIG[CONFIG_KEYS.OPENAI_API_KEY];
            
            hideApiStatus();
            showStatusMessage("配置已重置");
            
            console.log("[AnkiAIWordPicker] Configuration reset successfully");
        } catch (error) {
            console.error("[AnkiAIWordPicker] Error resetting configuration:", error);
            showStatusMessage("重置配置失败", true);
        }
    }
}

// 事件监听器
form.addEventListener("submit", (e) => {
    e.preventDefault();
    saveConfig();
});

testConnectionBtn.addEventListener("click", testConnection);
resetConfigBtn.addEventListener("click", resetConfig);

// 输入框变化时隐藏API状态
baseUrlInput.addEventListener("input", hideApiStatus);
apiKeyInput.addEventListener("input", hideApiStatus);

// 页面加载时加载配置
document.addEventListener("DOMContentLoaded", loadConfig);
