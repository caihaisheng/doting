# 答题通部署指南

## 快速部署（推荐）

### 方式一：Vercel（一键部署）

#### 前置要求
- 安装 [Node.js](https://nodejs.org/) (v16+)
- 注册 [Vercel 账号](https://vercel.com/signup)

#### 部署步骤

**Windows 用户：**
```powershell
# 1. 安装 Vercel CLI
npm install -g vercel

# 2. 进入项目目录
cd F:\app答题通\答题通

# 3. 登录 Vercel（会打开浏览器）
vercel login

# 4. 部署到生产环境
vercel --prod
```

**首次部署会询问：**
```
? Set up and deploy “F:\app答题通\答题通”? [Y/n] y
? Which scope do you want to deploy to? 选择你的用户名
? Link to existing project? [y/N] n
? What’s your project’s name? datitong
? In which directory is your code located? ./
? Want to override the settings? [y/N] n
```

**部署成功后：**
```
✅ Preview: https://答题通-xxx.vercel.app
✅ Production: https://答题通.vercel.app
```

#### 后续更新
```powershell
# 修改代码后，重新部署
vercel --prod
```

---

### 方式二：Cloudflare Pages（国内访问最快）

#### 部署步骤

1. **注册 Cloudflare 账号**
   - 访问 https://dash.cloudflare.com/sign-up

2. **上传到 GitHub**
   ```bash
   cd F:\app答题通\答题通
   git init
   git add .
   git commit -m "初始提交"
   git remote add origin https://github.com/你的用户名/datitong.git
   git push -u origin main
   ```

3. **连接 Cloudflare Pages**
   - 进入 Cloudflare Dashboard
   - 点击 Pages → Create a project
   - 选择 "Connect to Git"
   - 授权 GitHub 并选择仓库 `datitong`

4. **配置构建**
   ```
   Framework preset: None
   Build command: (留空)
   Build output directory: /
   ```

5. **点击 "Save and Deploy"**

6. **访问地址**
   ```
   https://答题通.pages.dev
   ```

---

### 方式三：GitHub Pages（适合开源项目）

#### 部署步骤

1. **创建 GitHub 仓库**
   - 访问 https://github.com/new
   - 仓库名：`datitong`
   - 选择 Public

2. **上传代码**
   ```bash
   cd F:\app答题通\答题通
   git init
   git add .
   git commit -m "初始提交"
   git branch -M main
   git remote add origin https://github.com/你的用户名/datitong.git
   git push -u origin main
   ```

3. **开启 GitHub Pages**
   - 进入仓库 Settings → Pages
   - Source: Deploy from a branch
   - Branch: main / root
   - 点击 Save

4. **等待几分钟，访问地址**
   ```
   https://你的用户名.github.io/datitong/
   ```

#### 注意事项

**修改 `sw.js` 文件：**
```javascript
const CACHE_NAME = 'dt-tong-v6';
const FILES_TO_CACHE = [
  '/datitong/',              // ← 添加仓库名
  '/datitong/index.html',
  '/datitong/style.css',
  '/datitong/app.js',
  '/datitong/db.js',
  '/datitong/real_data.js',
  '/datitong/manifest.json',
  '/datitong/icon-192.png',
  '/datitong/icon-512.png'
];
```

**修改 `manifest.json`：**
```json
{
  "start_url": "/datitong/index.html",
  "scope": "/datitong/"
}
```

---

### 方式四：Netlify（拖拽上传，最简单）

#### 部署步骤

1. **访问 Netlify Drop**
   - https://app.netlify.com/drop

2. **拖拽上传**
   - 直接拖拽 `F:\app答题通\答题通` 文件夹到页面

3. **等待上传完成**
   - 自动生成访问地址：`https://随机名称.netlify.app`

4. **自定义域名（可选）**
   - Site settings → Domain management → Add custom domain

---

## 自定义域名配置

### 在 Vercel 绑定域名

```bash
# 1. 添加域名
vercel domains add yourdomain.com

# 2. 在域名服务商添加 DNS 记录
# 类型: A
# 名称: @
# 值: 76.76.21.21

# 3. 验证域名
vercel domains inspect yourdomain.com
```

### 在 Cloudflare 绑定域名

1. 在 Cloudflare Pages 项目中
2. 点击 "Custom domains" → "Set up a custom domain"
3. 输入你的域名
4. 在域名服务商添加 CNAME 记录

---

## PWA 配置说明

### manifest.json 关键配置

```json
{
  "name": "答题通 - 税务师必刷题库",
  "short_name": "答题通",
  "description": "税务师考试必刷550题",
  "start_url": "./index.html",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#f5f5f5",
  "theme_color": "#e74c3c",
  "icons": [
    {
      "src": "./icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "./icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

### 添加到主屏幕

**iOS Safari:**
1. 点击分享按钮
2. 选择"添加到主屏幕"
3. 点击"添加"

**Android Chrome:**
1. 点击菜单按钮
2. 选择"添加到主屏幕"
3. 点击"添加"

---

## 常见问题

### Q: PWA 离线功能不生效？

**A:** 确保：
1. 使用 HTTPS（所有平台默认支持）
2. Service Worker 正确注册
3. manifest.json 配置正确

### Q: 更新代码后用户看到旧版本？

**A:** 修改版本号强制刷新：
```javascript
// index.html
<link rel="stylesheet" href="./style.css?v=7">
<script src="./app.js?v=7"></script>

// sw.js
const CACHE_NAME = 'dt-tong-v7';
```

### Q: 如何查看访问统计？

**A:** 各平台都提供分析功能：
- **Vercel:** Dashboard → Analytics
- **Cloudflare:** Pages → Analytics
- **Netlify:** Site → Analytics

---

## 性能优化建议

### 1. 压缩资源
```bash
# 压缩 JS
npx terser app.js -o app.min.js -c -m

# 压缩 CSS
npx csso style.css -o style.min.css
```

### 2. 图片优化
```bash
# 压缩 PNG
npx pngquant icon-192.png --output icon-192-opt.png
```

### 3. 启用 Gzip 压缩
Vercel/Cloudflare 自动启用，无需配置。

---

## 监控与日志

### Vercel
```bash
# 查看部署日志
vercel logs

# 实时日志
vercel logs --follow
```

### Cloudflare
- Pages → 项目 → Logs

---

## 总结

| 部署平台 | 推荐场景 | 国内速度 | 难度 |
|---------|---------|---------|------|
| **Vercel** | 个人项目、自动化部署 | ⭐⭐⭐⭐ | ⭐ |
| **Cloudflare Pages** | 国内用户、追求速度 | ⭐⭐⭐⭐⭐ | ⭐⭐ |
| **GitHub Pages** | 开源项目、代码公开 | ⭐⭐ | ⭐⭐ |
| **Netlify** | 快速测试、拖拽上传 | ⭐⭐⭐ | ⭐ |

**我的推荐：**
- 🏆 **国内用户：** Cloudflare Pages（速度最快）
- 🚀 **开发者：** Vercel（功能最强大）
- 🎯 **最简单：** Netlify（拖拽上传）
