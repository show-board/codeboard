# CLI 快捷命令

除了 curl 调用 API，也可使用 `codeboard` CLI：

```bash
# 项目注册
codeboard project register --name "项目名" --desc "描述"

# 推送任务更新
codeboard push <project_id> <session_id> <task_id> session_start '{"goal":"目标","task_list":[...]}'
codeboard push <project_id> <session_id> <task_id> task_start '{"task_name":"任务名"}'
codeboard push <project_id> <session_id> <task_id> task_complete '{"task_summary":"完成总结"}'
codeboard push <project_id> <session_id> <task_id> session_complete '{"summary":"Session总结"}'

# 记忆管理
codeboard memory list <project_id>
codeboard memory get <project_id> <category_name>
codeboard memory push <project_id> ./path/to/file.md --category <category_name>
codeboard memory sync <project_id>

# 状态查看
codeboard status
codeboard status <project_id>
```
