// 这个脚本负责从 IndexedDB 读取数据并展示在 popup.html 中，同时处理下载按钮的点击事件。

const DB_NAME = "WordCollectorDB";
const STORE_NAME = "words";
let db;

// DOM 元素
const wordList = document.getElementById("word-list");
const statusDiv = document.getElementById("status");
const downloadBtn = document.getElementById("download-btn");
const prevBtn = document.getElementById("prev-btn");
const nextBtn = document.getElementById("next-btn");
const pageInfo = document.getElementById("page-info");

// 分页配置
const ITEMS_PER_PAGE = 20;
let currentPage = 1;
let totalItems = 0;
let allWords = [];

function displayWords() {
    if (!db || allWords.length === 0) {
        wordList.innerHTML = "";
        statusDiv.textContent = "No words saved yet. Go copy some English text!";
        updatePagination();
        return;
    }

    // 计算分页
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const pageWords = allWords.slice(startIndex, endIndex);

    // 清空列表
    wordList.innerHTML = "";

    // 显示当前页的单词
    pageWords.forEach((word) => {
        const li = document.createElement("li");
        li.textContent = word.text;
        li.title = word.text; // 鼠标悬浮时显示完整内容
        wordList.appendChild(li);
    });

    // 更新状态和分页信息
    statusDiv.textContent = `Total: ${totalItems} items.`;
    updatePagination();
}

function updatePagination() {
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

    // 更新页码信息
    pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;

    // 更新按钮状态
    prevBtn.disabled = currentPage <= 1;
    nextBtn.disabled = currentPage >= totalPages;
}

function loadAllWords() {
    if (!db) return;

    statusDiv.textContent = "Loading words...";

    const transaction = db.transaction([STORE_NAME], "readonly");
    const objectStore = transaction.objectStore(STORE_NAME);
    const request = objectStore.getAll();

    request.onsuccess = (event) => {
        allWords = event.target.result || [];

        if (allWords.length > 0) {
            // 按时间戳降序排序，最新的在最上面
            allWords.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            totalItems = allWords.length;
            currentPage = 1; // 重置到第一页
            displayWords();
        } else {
            totalItems = 0;
            currentPage = 1;
            displayWords();
        }
    };

    request.onerror = (event) => {
        statusDiv.textContent = "Error loading words.";
        console.error("'AnkiAIWordPicker' - Error fetching words in popup:", event.target.error);
    };
}

// 分页按钮事件
prevBtn.addEventListener("click", () => {
    if (currentPage > 1) {
        currentPage--;
        displayWords();
    }
});

nextBtn.addEventListener("click", () => {
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
    if (currentPage < totalPages) {
        currentPage++;
        displayWords();
    }
});

// 下载功能 - 分页从数据库读取
downloadBtn.addEventListener("click", async () => {
    if (!db) return;

    statusDiv.textContent = "Downloading words...";
    downloadBtn.disabled = true;

    try {
        const allDownloadedWords = [];
        let offset = 0;
        const batchSize = 100; // 每次读取100条记录

        while (true) {
            const batch = await getWordsBatch(offset, batchSize);
            if (batch.length === 0) break;

            allDownloadedWords.push(...batch);
            offset += batchSize;
        }

        if (allDownloadedWords.length > 0) {
            // 按时间戳排序
            allDownloadedWords.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

            // 将所有文本拼接成一个字符串，每个占一行
            const textContent = allDownloadedWords.map((item) => item.text).join("\n");

            // 创建一个 Blob 对象
            const blob = new Blob([textContent], { type: "text/plain;charset=utf-8" });

            // 创建一个下载链接并模拟点击
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `my_collected_words_${new Date().toISOString().split("T")[0]}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url); // 释放内存

            statusDiv.textContent = `Downloaded ${allDownloadedWords.length} words successfully.`;
        } else {
            statusDiv.textContent = "No words to download.";
        }
    } catch (error) {
        statusDiv.textContent = "Error downloading words.";
        console.error("'AnkiAIWordPicker' - Error downloading words:", error);
    } finally {
        downloadBtn.disabled = false;
    }
});

// 分页从数据库读取数据的函数
function getWordsBatch(offset, limit) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], "readonly");
        const objectStore = transaction.objectStore(STORE_NAME);

        // 使用游标来分页读取
        const request = objectStore.openCursor();
        const results = [];
        let count = 0;
        let skipped = 0;

        request.onsuccess = (event) => {
            const cursor = event.target.result;

            if (cursor) {
                // 跳过前面的记录
                if (skipped < offset) {
                    skipped++;
                    cursor.continue();
                    return;
                }

                // 收集当前批次的记录
                if (count < limit) {
                    results.push(cursor.value);
                    count++;
                    cursor.continue();
                } else {
                    resolve(results);
                }
            } else {
                // 游标结束
                resolve(results);
            }
        };

        request.onerror = (event) => {
            reject(event.target.error);
        };
    });
}

function openDB() {
    const request = indexedDB.open(DB_NAME, 1);

    request.onsuccess = (event) => {
        db = event.target.result;
        console.log("'AnkiAIWordPicker' - Database opened successfully in popup.");
        loadAllWords();
    };

    request.onerror = (event) => {
        statusDiv.textContent = "Could not open database.";
        console.error("'AnkiAIWordPicker' - Database error in popup:", event.target.error);
    };
}

// 打开数据库并加载单词
openDB();
