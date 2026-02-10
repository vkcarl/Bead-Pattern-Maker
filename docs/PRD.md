# 拼豆图案转换器 - 产品需求文档 (PRD)

## 1. 产品概述

### 1.1 产品名称
拼豆图案转换器 (Bead Pattern Converter)

### 1.2 产品定位
面向拼豆手工爱好者的浏览器端工具应用。用户上传任意图片，系统自动将其转换为 Artkal 拼豆图案，支持预览、手动编辑和导出打印。

### 1.3 目标用户
- 拼豆 / 像素珠手工爱好者
- 需要将照片、插画等转换为拼豆图纸的创作者
- 手工教育场景中的教师和学生

### 1.4 核心价值
- 将任意图片自动转换为高质量拼豆图案，省去人工逐格配色的繁琐过程
- 使用感知色差算法（CIEDE2000）确保颜色匹配准确
- 全程浏览器端运行，无需上传图片到服务器，保护隐私

---

## 2. 功能需求

### 2.1 图片上传

| 项目 | 说明 |
|------|------|
| 上传方式 | 拖拽上传 / 点击选择文件 |
| 支持格式 | JPG, PNG, GIF, WebP |
| 文件限制 | 仅限图片类型 (image/*) |
| 上传后操作 | 左侧显示原图预览，可移除重新上传 |

### 2.2 拼豆板尺寸配置

| 项目 | 说明 |
|------|------|
| 预设尺寸 | 29x29 (单板), 58x29, 29x58, 58x58 (四板拼接) |
| 自定义尺寸 | 宽/高各 5~200 颗，支持任意矩形 |
| 默认值 | 29x29 |

### 2.3 图片转换

| 项目 | 说明 |
|------|------|
| 降采样算法 | 面积平均法 (Area-average resampling)，对每个目标格子内的所有源像素取加权平均 |
| 透明度处理 | 透明像素按 alpha 权重混合，完全透明视为白色 |
| 颜色匹配 | RGB → CIELAB → CIEDE2000 色差 → k-d 树最近邻搜索 |
| 色板 | Artkal C 系列 5mm 拼豆，共 174 色 (C01-C157 + CE01-CE17) |
| 性能优化 | 6-bit 量化 RGB 缓存 (262,144 个 key)，避免重复计算 |

### 2.4 图案预览

| 项目 | 说明 |
|------|------|
| 渲染方式 | HTML5 Canvas 单画布渲染 |
| 珠子样式 | 圆形珠子 + 中心小孔，模拟真实拼豆外观 |
| 视口裁剪 | 仅绘制可见区域内的珠子，大图案下不卡顿 |
| 缩放 | 鼠标滚轮缩放 (0.3x ~ 15x)，以光标为中心 |
| 平移 | Alt + 鼠标拖拽 或 鼠标中键拖拽 |
| 网格线 | 可开关，显示每颗珠子的边界 |
| 板分割线 | 每 29 颗珠子绘制加粗分割线，标记实际拼豆板边界 |
| 珠子编号 | 可开关，在珠子上显示 Artkal 色号（缩放足够大时） |

### 2.5 手动编辑

| 项目 | 说明 |
|------|------|
| 工具切换 | 选择工具 (V) / 画笔工具 (B) |
| 编辑操作 | 画笔模式下，从调色板选择颜色后点击珠子即可替换 |
| 调色板 | 支持搜索（按名称或编号），高亮已使用颜色 |
| 撤销/重做 | Ctrl+Z 撤销 / Ctrl+Y 重做，最多 50 步历史 |

### 2.6 用量统计

| 项目 | 说明 |
|------|------|
| 统计内容 | 每种颜色的编号、名称、色块预览、使用数量 |
| 排序 | 按使用数量降序 |
| 汇总 | 显示总颜色数和总珠子数 |
| 更新 | 编辑珠子后实时更新 |

### 2.7 导出

| 导出格式 | 说明 |
|----------|------|
| PDF | 横版 A4 第一页为图案网格（自适应缩放+板分割线+色号标注），纵版后续页为颜色图例表（色块+编号+名称+数量+总计） |
| PNG | 带色号标注的高清图片 (每颗珠子 30px)，可直接打印或分享 |

---

## 3. 非功能需求

### 3.1 性能

| 指标 | 目标 |
|------|------|
| 首屏加载 | < 2s (生产构建) |
| 58x58 图案转换 | < 1s |
| Canvas 渲染帧率 | 缩放/平移时 ≥ 30fps |
| 内存占用 | 174 色 k-d 树 + 量化缓存 < 5MB |

### 3.2 兼容性

| 项目 | 要求 |
|------|------|
| 浏览器 | Chrome 90+, Firefox 88+, Safari 15+, Edge 90+ |
| 设备 | 桌面端为主（需要鼠标进行精确编辑） |
| 分辨率 | 支持 Retina 高清屏 (devicePixelRatio 适配) |

### 3.3 隐私与安全

- 所有图片处理在浏览器端完成，图片数据不会离开用户设备
- 不需要任何后端服务或用户登录
- 无第三方追踪或数据收集

---

## 4. 技术架构

### 4.1 技术栈

| 层 | 技术 |
|----|------|
| 框架 | Next.js 16 + React 19 |
| 样式 | Tailwind CSS 4 |
| 语言 | TypeScript 5 |
| PDF 生成 | jsPDF |
| 图片处理 | Canvas API (浏览器原生) |
| 构建工具 | Turbopack |

### 4.2 核心算法

#### 颜色匹配流程
```
源像素 RGB → sRGB 线性化 → XYZ (D65) → CIELAB → CIEDE2000 色差 → k-d 树最近邻 → Artkal 色号
```

#### 关键选型理由
- **CIEDE2000 vs RGB 欧氏距离**: RGB 距离在蓝紫色系严重失准，CIEDE2000 是 CIE 推荐的感知色差标准
- **k-d 树 vs 暴力搜索**: 174 色 O(log n) vs O(n)，单次匹配快 ~7 倍
- **Canvas vs DOM**: 58x58 = 3364 个珠子，DOM 节点方案渲染性能不可接受

### 4.3 项目结构

```
src/
├── app/                    # Next.js 页面
│   ├── layout.tsx
│   ├── page.tsx           # 主页面（串联所有组件）
│   └── globals.css
├── components/            # React 组件
│   ├── BeadGrid.tsx       # Canvas 拼豆网格
│   ├── BeadStats.tsx      # 用量统计
│   ├── BoardConfig.tsx    # 板尺寸配置
│   ├── ColorPicker.tsx    # 调色板选择器
│   ├── ExportPanel.tsx    # 导出面板
│   ├── ImageUploader.tsx  # 图片上传
│   └── Toolbar.tsx        # 工具栏
├── data/
│   └── artkal-colors.ts   # 174 色 Artkal 数据
├── hooks/
│   ├── usePatternState.ts # useReducer 状态 + 撤销重做
│   ├── useZoomPan.ts      # 缩放平移逻辑
│   └── useImageUpload.ts  # 文件上传逻辑
├── lib/
│   ├── color-convert.ts   # RGB → Lab 转换
│   ├── color-diff.ts      # CIEDE2000 算法
│   ├── color-match.ts     # 颜色匹配 + 缓存
│   ├── kd-tree.ts         # Lab 空间 k-d 树
│   ├── image-processor.ts # 图片降采样 + 量化
│   ├── export-pdf.ts      # PDF 导出
│   └── export-image.ts    # PNG 导出
└── types/
    └── index.ts           # TypeScript 类型定义
```

---

## 5. 数据模型

### 5.1 核心类型

```typescript
// 图案数据
interface Pattern {
  width: number;          // 列数
  height: number;         // 行数
  grid: number[][];       // grid[row][col] = 色板索引 (-1 = 空)
}

// Artkal 颜色
interface ArtkalColor {
  id: string;             // 编号，如 "C01"
  name: string;           // 名称，如 "White"
  hex: string;            // 十六进制色值
  r: number; g: number; b: number;
  series: string;         // "C" 或 "CE"
}

// 应用状态
interface PatternState {
  originalImage: string | null;
  pattern: Pattern | null;
  history: Pattern[];     // 最多 50 步
  historyIndex: number;
  boardWidth: number;
  boardHeight: number;
  zoom: number;           // 0.3 ~ 15
  panX: number;
  panY: number;
  selectedTool: 'select' | 'paint';
  selectedColorIndex: number | null;
  showGridLines: boolean;
  showBeadCodes: boolean;
  isProcessing: boolean;
}
```

---

## 6. 未来迭代方向（不在当前版本范围内）

- 支持 Perler、Hama 等其他品牌色板
- 多图层支持
- 图案分享（生成可分享链接）
- 移动端触控优化
- 自动调色板精简（减少使用颜色数量）
- 批量导出多板拼接的分页图纸
- PWA 离线支持
