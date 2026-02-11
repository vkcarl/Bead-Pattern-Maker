#!/bin/bash

echo ""
echo "=========================================="
echo "   像素珠转换器 - 本地服务器启动中..."
echo "=========================================="
echo ""
echo "请稍候，浏览器将自动打开..."
echo "如未自动打开，请手动访问: http://localhost:8000"
echo ""
echo "【关闭此窗口即可停止服务器】"
echo ""

# 获取脚本所在目录
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR/out"

# 1秒后打开浏览器
(sleep 1 && open "http://localhost:8000") &

# 启动服务器
if command -v python3 &> /dev/null; then
    python3 -m http.server 8000
elif command -v python &> /dev/null; then
    python -m http.server 8000
else
    echo ""
    echo "=========================================="
    echo "  错误：未找到 Python！"
    echo ""
    echo "  请打开终端输入以下命令安装："
    echo "  xcode-select --install"
    echo "=========================================="
    echo ""
    read -p "按回车键退出..."
fi