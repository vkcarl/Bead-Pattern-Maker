/**
 * 版本变更日志
 * 每次发布新版本时，更新 APP_VERSION 并在 changelog 数组最前面添加新条目
 */

export const APP_VERSION = '1.0.8';

export interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  changes: string[];
}

export const changelog: ChangelogEntry[] = [
  {
    version: '1.0.8',
    date: '2026-09-29',
    title: '画笔支持拖动连续涂色',
    changes: [
      '电脑端：按住鼠标左键拖动，经过的格子都会涂上颜色',
      '手机端：长按 1 秒后拖动即可连续涂色，轻点仍为单格涂色',
      '整行 / 整列 / 九宫格画笔同样支持拖动涂色',
      '一次拖动只算一步，撤销时整笔一起撤回',
    ],
  },
  {
    version: '1.0.7',
    date: '2026-08-26',
    title: 'PNG 支持高清导出',
    changes: [
      'PNG 导出支持多档清晰度选择（标准 / 高清 / 超清），满足高清打印需求'
    ],
  },
  {
    version: '1.0.6',
    date: '2026-04-14',
    title: '新增内置 Mard 295 色板',
    changes: [
      '新增内置 Mard 295 色板',
    ],
  },
  {
    version: '1.0.5',
    date: '2026-04-14',
    title: '原图参考层叠加',
    changes: [
      '新增原图参考层 — 编辑时可对照原图进行二次创作',
      '按住空格键临时显示原图，松开即隐藏',
      '点击工具栏👁按钮可锁定常驻显示，支持透明度调节（5%~80%）',
    ],
  },
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
