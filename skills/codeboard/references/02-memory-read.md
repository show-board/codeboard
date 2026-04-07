# 第二阶段：记忆读取

## Step 2: 获取记忆分类表

```bash
curl http://127.0.0.1:2585/api/memories/<project_id>/categories
```

返回所有记忆分类列表。初始 9 个默认分类：

| 分类名 | 说明 |
|--------|------|
| project-overview | 项目功能及目的介绍 |
| dev-structure | 项目开发结构及结构描述 |
| session-history | Session 记录及构建历史时间线 |
| tech-details | 技术细节及方案（端口、语言、SQL选型等）|
| code-style | 项目代码风格（强注释）|
| ui-design | UI 设计风格 |
| bug-records | Bug 记录、踩坑、修复记录 |
| vibe-config | VibeCoding 配置（**必读**）|
| reusable-code | 可复用的类及函数列表及作用 |

## Step 3: 分析当前对话，选择需要读取的记忆

根据用户当前的任务需求，判断需要读取哪些记忆分类。**每次必读 `vibe-config`**。

## Step 4: 读取对应记忆内容

```bash
# 获取某分类下的文档列表
curl "http://127.0.0.1:2585/api/memories/<project_id>/documents?category_id=<category_id>"

# 读取单个文档内容
curl http://127.0.0.1:2585/api/memories/<project_id>/documents/<doc_id>
```

> 记忆只在第一次运行时完整读取，后续只做增量更新或按需获取。
> 如果调取的记忆和项目实际情况有偏差，以项目当前实际情况为主，并在最后更新记忆。
