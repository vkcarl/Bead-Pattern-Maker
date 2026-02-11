@echo off
chcp 65001 >nul 2>&1
title 像素珠转换器

echo.
echo ==========================================
echo    像素珠转换器 - 本地服务器启动中...
echo ==========================================
echo.
echo 请稍候，浏览器将自动打开...
echo 如未自动打开，请手动访问: http://localhost:8000
echo.
echo 【关闭此窗口即可停止服务器】
echo.

:: 切换到 out 目录
cd /d "%~dp0out"

:: 启动浏览器（延迟1秒让服务器先启动）
start /b cmd /c "ping 127.0.0.1 -n 2 >nul && start http://localhost:8000"

:: 尝试用 python 或 python3 启动服务器
where python >nul 2>&1
if %errorlevel% equ 0 (
    python -m http.server 8000
) else (
    where python3 >nul 2>&1
    if %errorlevel% equ 0 (
        python3 -m http.server 8000
    ) else (
        echo.
        echo ==========================================
        echo   错误：未找到 Python！
        echo.
        echo   请从 Microsoft Store 安装 Python 3
        echo   或访问 https://www.python.org 下载安装
        echo ==========================================
        echo.
        pause
    )
)