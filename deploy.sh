#!/bin/bash
# 答题通一键部署脚本 (Vercel)

echo "🚀 答题通部署脚本"
echo "=================="

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 请先安装 Node.js: https://nodejs.org/"
    exit 1
fi

# 检查 Vercel CLI
if ! command -v vercel &> /dev/null; then
    echo "📦 正在安装 Vercel CLI..."
    npm install -g vercel
fi

# 登录 Vercel
echo ""
echo "🔐 请在浏览器中完成登录..."
vercel login

# 部署
echo ""
echo "🚀 正在部署..."
vercel --prod

echo ""
echo "✅ 部署完成！"
echo "📱 访问地址："
vercel ls --prod

echo ""
echo "💡 提示："
echo "  - 每次修改代码后，运行 'vercel --prod' 即可更新"
echo "  - 可以在 Vercel 控制台绑定自定义域名"
echo "  - 支持 HTTPS，PWA 功能完整可用"
