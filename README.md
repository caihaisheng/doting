# 答题通 — 税务师「必刷550题」PWA

移动端刷题应用，支持章节练习、模拟考试、错题收藏，可添加到手机主屏幕离线使用。

## 在线访问

- **GitHub Pages**：`https://你的用户名.github.io/datitong/`
- **Gitee Pages**：`https://你的用户名.gitee.io/datitong/`（国内访问更快）

## 本地运行

```bash
# 任意 HTTP 服务器即可
python -m http.server 8888
# 浏览器打开 http://localhost:8888
```

## 功能

- 按科目 → 章节逐题练习
- 随机模拟考试（差异化评分）
- 自动评分 + 错题逐题回顾
- 错题自动收藏，随时复习
- PWA 离线支持，添加到主屏幕

## 技术栈

纯前端 PWA：HTML + CSS + JS + IndexedDB + Service Worker，无需服务器。
