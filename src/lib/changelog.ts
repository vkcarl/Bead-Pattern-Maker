/**
 * 版本变更日志
 * 每次发布新版本时，更新 APP_VERSION 并在 changelog 数组最前面添加新条目
 */

export const APP_VERSION = '1.0.4';

export interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  changes: string[];
}

export const changelog: ChangelogEntry[] = [
  {
    version: '1.0.4',
    date: '2026-04-13',
    title: '轮廓强化（边缘感知）',
    changes: [
      '新增轮廓强化选项 — 边缘感知模式',
      '生成拼豆图前使用，开启后可保留更多边缘细节'
    ],
  },
  {
    version: '1.0.3',
    date: '2026-04-08',
    title: '全局颜色替换 & 限色生成',
    changes: [
      '新增全局颜色替换功能',
      '新增色板子集选择 + 限色生成'
    ],
  },
  {
    version: '1.0.2',
    date: '2026-03-30',
    title: '编辑体验增强',
    changes: [
      '新增色块消除功能（指定背景色块进行消除）',
      '画笔工具支持多种形状（单点/整行/整列/九宫格）批量编辑',
      '杂色消除独立后处理，减少图片杂色点',
      '支持取色后颜色高亮 — 仅取色笔触发高亮'
    ],
  },
];

/**
 * 获取自上次访问以来所有未见过的版本更新
 * @param lastSeenVersion 上次用户看到的版本号，null 表示首次访问
 * @returns 未见过的变更日志条目（从新到旧）
 */
export function getUnseenChanges(lastSeenVersion: string | null): ChangelogEntry[] {
  if (!lastSeenVersion) return changelog; // 首次访问，展示全部
  const lastSeenIdx = changelog.findIndex(entry => entry.version === lastSeenVersion);
  if (lastSeenIdx === -1) return changelog; // 找不到旧版本，展示全部
  if (lastSeenIdx === 0) return []; // 已经是最新版本
  return changelog.slice(0, lastSeenIdx);
}
