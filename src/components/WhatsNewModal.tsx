'use client';

import { useEffect, useState, useCallback } from 'react';
import { APP_VERSION, getUnseenChanges, type ChangelogEntry } from '@/lib/changelog';

const STORAGE_KEY = 'app_last_seen_version';

export function WhatsNewModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [unseenChanges, setUnseenChanges] = useState<ChangelogEntry[]>([]);

  useEffect(() => {
    try {
      const lastSeen = localStorage.getItem(STORAGE_KEY);
      const changes = getUnseenChanges(lastSeen);
      if (changes.length > 0) {
        setUnseenChanges(changes);
        setIsOpen(true);
      } else {
        // 版本相同，确保存储是最新的
        localStorage.setItem(STORAGE_KEY, APP_VERSION);
      }
    } catch {
      // localStorage 不可用时静默失败
    }
  }, []);

  const handleClose = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, APP_VERSION);
    } catch {
      // 静默失败
    }
    setIsOpen(false);
  }, []);

  if (!isOpen || unseenChanges.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 遮罩层 */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* 弹窗内容 */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[80vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* 头部 */}
        <div className="px-6 pt-6 pb-4 bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🎉</span>
              <h2 className="text-lg font-bold">有新更新！</h2>
            </div>
            <button
              onClick={handleClose}
              className="p-1 rounded-lg hover:bg-white/20 transition-colors"
              title="关闭"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-sm text-blue-100 mt-1">
            当前版本 v{APP_VERSION}
          </p>
        </div>

        {/* 更新内容列表 */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {unseenChanges.map((entry) => (
            <div key={entry.version} className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-800">
                  v{entry.version}
                </span>
                <span className="text-xs text-gray-400">{entry.date}</span>
                {entry.version === unseenChanges[0].version && (
                  <span className="px-1.5 py-0.5 text-[10px] font-medium bg-green-100 text-green-700 rounded-full">
                    最新
                  </span>
                )}
              </div>
              <p className="text-sm font-medium text-indigo-600">{entry.title}</p>
              <ul className="space-y-1">
                {entry.changes.map((change, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
                    {change}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* 底部按钮 */}
        <div className="px-6 py-4 border-t border-gray-100">
          <button
            onClick={handleClose}
            className="w-full py-2.5 px-4 bg-indigo-500 text-white text-sm font-medium rounded-xl hover:bg-indigo-600 active:bg-indigo-700 transition-colors"
          >
            知道了 👍
          </button>
        </div>
      </div>
    </div>
  );
}
