---
id: "shot-ff"
title: "首帧（FF）"
titleEn: "First Frame (FF)"
author: "知识库整理"
cover: ""
tags: ["镜头类型", "首帧"]
tagsEn: ["Shot Types", "First Frame"]
readingTime: 2
createdAt: "2026-03-12"
updatedAt: "2026-03-12"
featured: false
published: true
---

# 首帧（First Frame）

首帧（First Frame）是 AI 视频生成领域中特有的概念，指视频片段的第一帧画面的构图与内容设计。与传统电影中的"开场镜头"概念类似，但在 AI 视频工具（如 Kling、Runway、Pika 等）的语境中，首帧往往需要通过图片输入或提示词精确描述来控制生成结果。

## 核心特点

**为什么首帧重要**：AI 视频模型在生成视频时，通常以首帧状态作为运动的起点。首帧的构图、光线、角色姿态，直接决定了整段视频的视觉基调与运动方向。一个设计不当的首帧可能导致后续帧的运动混乱或不符合预期。

**首帧的典型元素**：
- 主体的位置与姿态
- 环境背景的基本状态
- 光源方向与光线质量
- 镜头景别（与后续镜头的景别衔接关系）

## 在 AI 视频提示词中的应用

不同的 AI 视频工具对首帧的控制方式不同：

- **图生视频**：直接上传一张图片作为首帧，模型从该状态开始生成运动
- **文生视频**：通过提示词描述首帧状态，再描述期望的运动

在文生视频中，清晰描述"当前状态"（首帧）与"期望变化"（运动）是提示词写作的核心技巧。

## AI 提示词参考

> First frame: [describe the static starting composition]; then [describe the motion or change]

**示例**：

> First frame: a woman standing at a rain-soaked window, looking outside, candlelight behind her. Camera slowly pushes in as she turns toward the lens.

**使用建议**：在使用支持首帧控制的 AI 工具时，将首帧描述与运动描述分开撰写，能大幅提升生成质量和可控性。
