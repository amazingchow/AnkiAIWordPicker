### 调试技巧

- Popup的调试: 右键点击插件图标，选择“审查弹出内容”，可以像调试普通网页一样打开DevTools。
- Content Script的调试: 直接在被注入的网页上按 F12 打开DevTools，在Console和Sources面板中可以看到你的脚本。
- Background Script的调试: 在 chrome://extensions 页面，找到你的插件，点击“Service Worker”链接，会打开一个专门的DevTools窗口。
