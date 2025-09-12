// 这个脚本会被注入到你浏览的每个网页中，它的任务是监听复制事件，并把符合条件的文本发送给后台。

console.log("'AnkiAIWordPicker' - Content script loaded successfully");

document.addEventListener("copy", (event) => {
    console.log("'AnkiAIWordPicker' - Copy event detected");

    // 获取用户选择的文本
    const selectedText = window.getSelection().toString().trim();
    console.log("'AnkiAIWordPicker' - Selected text:", selectedText);

    if (!selectedText) {
        // 如果没有选择文本，或者文本为空，则不做任何事
        console.log("'AnkiAIWordPicker' - No text selected, ignoring");
        return;
    }

    // 使用正则表达式判断是否主要是英文内容。
    // 这个正则允许：大小写字母, 数字, 空格, 和一些常用标点符号。
    // 它会排除掉包含中日韩等字符的字符串。
    const englishRegex = /^[a-zA-Z0-9\s.,'?!$€£%&"()[\]{}–—-]+$/;
    const isEnglish = englishRegex.test(selectedText);
    console.log("'AnkiAIWordPicker' - Is English text:", isEnglish);

    if (isEnglish) {
        console.log("'AnkiAIWordPicker' - Copied English text:", selectedText);
        // 发送消息到 background.js 进行保存
        chrome.runtime.sendMessage(
            {
                type: "WORD_COLLECTOR_EXTENSION_SAVE_TEXT",
                data: selectedText,
            },
            (response) => {
                if (chrome.runtime.lastError) {
                    console.error("'AnkiAIWordPicker' - Error sending message:", chrome.runtime.lastError);
                } else if (response && response.success) {
                    console.log("'AnkiAIWordPicker' - Message sent successfully:", response.message);
                } else {
                    console.log("'AnkiAIWordPicker' - Message sent but no response received");
                }
            }
        );
    } else {
        console.log("'AnkiAIWordPicker' - Text is not English, ignoring");
    }
});
