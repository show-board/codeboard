# 第一阶段：项目初始化与确认

## Step 1: 检查 `.dashboard/project.yaml`

在项目根目录下检查是否存在 `.dashboard/project.yaml` 文件：

```bash
# 检查文件是否存在
ls .dashboard/project.yaml
```

**如果不存在**，执行以下操作：

1. 创建 `.dashboard/` 目录和 `project.yaml` 文件：

```yaml
# .dashboard/project.yaml
project_name: "你的项目名称"
project_description: "项目简要描述"
project_id: "proj_<当前时间戳>"  # 格式: proj_20260404153500，创建后不可修改
created_at: "2026-04-04T15:35:00Z"
```

2. 创建本地记忆目录：

```bash
mkdir -p .dashboard/memories
```

3. 向看板注册项目：

```bash
curl -X POST http://127.0.0.1:2585/api/projects/register \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": "proj_20260404153500",
    "name": "项目名称",
    "description": "项目描述"
  }'
```

如果返回 `{"success": false, "error": "项目 ID 或名称已存在"}`, 则修改 `project.yaml` 中的 name 后重试（ID 使用新的时间戳）。

**如果已存在**，读取配置并测试连接：

```bash
curl -X POST http://127.0.0.1:2585/api/projects/<project_id>/test
```

返回 `{"available": true}` 表示连接正常。如果返回不可用，重新发送注册请求。

如果认为项目名称或描述需要更新：

```bash
curl -X PUT http://127.0.0.1:2585/api/projects/<project_id> \
  -H "Content-Type: application/json" \
  -d '{"name": "新名称", "description": "新描述"}'
```
