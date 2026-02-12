#!/bin/bash

echo "正在打包拼豆图案转换器..."

# 获取脚本所在目录
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# 创建临时目录
TEMP_DIR="拼豆图案转换器"
rm -rf "$TEMP_DIR" 2>/dev/null
mkdir -p "$TEMP_DIR"

# 复制需要的文件
cp -r out "$TEMP_DIR/"
cp 启动应用.bat "$TEMP_DIR/"
cp 启动应用.command "$TEMP_DIR/"
cp 小白使用说明.md "$TEMP_DIR/"

# 创建ZIP文件
ZIP_NAME="拼豆图案转换器.zip"
rm -f "$ZIP_NAME" 2>/dev/null
zip -r "$ZIP_NAME" "$TEMP_DIR"

# 清理临时目录
rm -rf "$TEMP_DIR"

echo ""
echo "=========================================="
echo "  打包完成！"
echo "  文件：$ZIP_NAME"
echo "  大小：$(du -h "$ZIP_NAME" | cut -f1)"
echo "=========================================="
echo ""
echo "现在可以将 $ZIP_NAME 发送给朋友了！"