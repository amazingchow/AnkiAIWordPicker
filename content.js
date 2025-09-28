// 这个脚本会被注入到浏览的网页中，它可以读取和修改网页的DOM，实现与网页内容的直接交互。
// 它的任务是监听复制事件，并把符合条件的文本发送给后台。
console.log("[AnkiAIWordPicker] content.js loaded successfully");

// 创建确认弹窗的函数
function createConfirmationDialog(text) {
    // 创建弹窗容器
    const dialog = document.createElement("div");
    dialog.id = "anki-word-picker-dialog";
    dialog.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        border: 2px solid #4285f4;
        border-radius: 8px;
        padding: 20px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        z-index: 10000;
        font-family: Arial, sans-serif;
        min-width: 300px;
        max-width: 500px;
    `;

    // 创建弹窗内容
    dialog.innerHTML = `
        <div style="margin-bottom: 15px;">
            <h3 style="margin: 0 0 10px 0; color: #333; font-size: 16px;">添加到词库？</h3>
            <div style="background: #f5f5f5; padding: 10px; border-radius: 4px; margin: 10px 0; max-height: 100px; overflow-y: auto; font-size: 13px; color: #333;">
                ${text}
            </div>
        </div>
        <div style="display: flex; gap: 10px; justify-content: flex-end;">
            <button id="anki-cancel-btn" style="
                padding: 8px 16px;
                background: #ccc;
                color: #333;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
            ">取消</button>
            <button id="anki-confirm-btn" style="
                padding: 8px 16px;
                background: #4285f4;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
            ">添加到词库</button>
        </div>
    `;

    // 创建遮罩层
    const overlay = document.createElement("div");
    overlay.id = "anki-word-picker-overlay";
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        z-index: 9999;
    `;

    // 添加到页面
    document.body.appendChild(overlay);
    document.body.appendChild(dialog);

    // 绑定事件
    const confirmBtn = dialog.querySelector("#anki-confirm-btn");
    const cancelBtn = dialog.querySelector("#anki-cancel-btn");

    return new Promise((resolve) => {
        confirmBtn.addEventListener("click", () => {
            removeDialog();
            resolve(true);
        });

        cancelBtn.addEventListener("click", () => {
            removeDialog();
            resolve(false);
        });

        overlay.addEventListener("click", () => {
            removeDialog();
            resolve(false);
        });
    });

    function removeDialog() {
        if (document.body.contains(dialog)) {
            document.body.removeChild(dialog);
        }
        if (document.body.contains(overlay)) {
            document.body.removeChild(overlay);
        }
    }
}

document.addEventListener("copy", async (event) => {
    // 获取用户选择的文本
    const selectedText = window.getSelection().toString().trim();
    if (!selectedText) {
        // 如果没有选择文本，或者文本为空，则不做任何事
        console.warn("[AnkiAIWordPicker] No text selected, ignoring");
        return;
    }
    console.log("[AnkiAIWordPicker] Selected text:", selectedText);

    // 使用正则表达式判断是否是英文内容
    // 这个正则允许：大小写字母, 数字, 空格, 和一些常用标点符号。
    // 它会排除掉包含中日韩等字符的字符串。
    const englishRegex = /^[a-zA-Z0-9\s.,'?!$€£%&"()[\]{}–—-]+$/;
    const isEnglish = englishRegex.test(selectedText);
    if (isEnglish) {
        // 显示确认弹窗
        try {
            const userConfirmed = await createConfirmationDialog(selectedText);
            if (userConfirmed) {
                // 发送消息到 background.js 进行保存
                chrome.runtime.sendMessage(
                    {
                        type: "ANKI_AI_WORD_PICKER_EXT_SAVE_TEXT",
                        data: selectedText,
                    },
                    (response) => {
                        if (chrome.runtime.lastError) {
                            console.error("[AnkiAIWordPicker] Error sending message:", chrome.runtime.lastError);
                        } else if (response && response.success) {
                            console.log("[AnkiAIWordPicker] Message sent successfully");
                        } else {
                            console.warn("[AnkiAIWordPicker] Message sent but no response received");
                        }
                    }
                );
            } else {
                console.warn("[AnkiAIWordPicker] User cancelled, not saving text");
            }
        } catch (error) {
            console.error("[AnkiAIWordPicker] Error showing confirmation dialog:", error);
        }
    } else {
        console.warn("[AnkiAIWordPicker] Text is not English, ignoring");
    }
});
