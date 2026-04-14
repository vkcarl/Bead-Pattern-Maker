'use client';

import { useState } from 'react';

export function AuthorInfo() {
  const [showQrCode, setShowQrCode] = useState(false);

  return (
    <div className="flex items-center gap-2 text-xs text-gray-500">
      {/* 小红书 icon + 昵称链接 */}
      <a
        href="https://www.xiaohongshu.com/user/profile/63b7d2e70000000027029077"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 hover:text-red-500 transition-colors"
      >
        <img
          src="/xiaohongshu-icon.svg"
          alt="小红书"
          className="w-4 h-4"
        />
        <span>@Ciroccc</span>
      </a>

      {/* 二维码 icon + 悬浮放大 */}
      <div
        className="relative"
        onMouseEnter={() => setShowQrCode(true)}
        onMouseLeave={() => setShowQrCode(false)}
      >
        <button
          className="flex items-center gap-1 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
          aria-label="显示小红书二维码"
        >
          {/* 二维码 icon (SVG) */}
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75zM16.5 16.5h.75v.75h-.75v-.75z"
            />
          </svg>
          <span>二维码</span>
        </button>

        {/* 悬浮弹出的二维码大图 */}
        {showQrCode && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 z-50 animate-in fade-in duration-200">
            <div className="relative bg-white rounded-xl shadow-2xl border border-gray-200 p-3 w-52">
              <img
                src="/xiaohongshu-qrcode.jpg"
                alt="小红书二维码 - Ciroccc"
                className="w-full h-auto rounded-lg"
              />
              <p className="text-center text-xs text-gray-400 mt-1.5">扫码关注小红书</p>
              {/* 小三角箭头 */}
              <div className="absolute left-1/2 -translate-x-1/2 -bottom-[6px] w-3 h-3 bg-white border-r border-b border-gray-200 rotate-45" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}