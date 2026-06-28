@echo off
chcp 65001 >nul
title 答题通 PWA 本地服务器
echo ================================
echo   答题通 PWA 本地服务器 
echo ================================
echo.
echo 访问地址:
echo   本机: http://localhost:8888
echo   手机: http://[本机IP]:8888
echo.
echo 按 Ctrl+C 停止服务器
echo ================================
echo.

:: 优先使用系统 Python，如无则尝试常见路径
set PYTHON=
for %%p in (python python3 py) do (
    where %%p >nul 2>&1 && set PYTHON=%%p && goto :found
)
echo [错误] 未找到 Python，请先安装 Python 3
pause
exit /b 1

:found
%PYTHON% -m http.server 8888 --bind 0.0.0.0
