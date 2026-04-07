#!/bin/bash
# ============================================================
# CodeBoard CLI 测试脚本
# 测试所有 CLI 命令
# 使用方法: bash test/cli/test-cli.sh
# ============================================================

echo "============================================"
echo "  CodeBoard CLI 测试 - $(date)"
echo "============================================"

# 1. 版本
echo -e "\n🔹 codeboard --version"
codeboard --version

# 2. 帮助
echo -e "\n🔹 codeboard --help"
codeboard --help

# 3. 配置查看
echo -e "\n🔹 codeboard config --show"
codeboard config --show

# 4. 服务状态
echo -e "\n🔹 codeboard status"
codeboard status

# 5. 项目列表
echo -e "\n🔹 codeboard project list"
codeboard project list

# 6. 推送任务更新测试
PROJECT_ID="test_cli_$(date +%s)"
SESSION_ID="sess_cli_$(date +%s)"
TASK_ID="task_cli_$(date +%s)"

echo -e "\n🔹 注册测试项目"
curl -s -X POST http://127.0.0.1:2585/api/projects/register \
  -H "Content-Type: application/json" \
  -d "{\"project_id\":\"$PROJECT_ID\",\"name\":\"CLI测试项目\",\"description\":\"CLI自动测试\"}" | head -c 200
echo ""

echo -e "\n🔹 codeboard push (session_start)"
codeboard push "$PROJECT_ID" "$SESSION_ID" "$TASK_ID" session_start '{"goal":"CLI测试","task_list":[{"name":"test","status":"queued"}]}'

echo -e "\n🔹 codeboard push (task_complete)"
codeboard push "$PROJECT_ID" "$SESSION_ID" "${TASK_ID}_2" task_complete '{"task_name":"test","task_summary":"CLI测试通过"}'

echo -e "\n🔹 codeboard push (session_complete)"
codeboard push "$PROJECT_ID" "$SESSION_ID" "${TASK_ID}_3" session_complete '{"summary":"CLI测试全部完成"}'

# 7. 记忆管理
echo -e "\n🔹 codeboard memory list $PROJECT_ID"
codeboard memory list "$PROJECT_ID"

# 8. 项目状态
echo -e "\n🔹 codeboard status $PROJECT_ID"
codeboard status "$PROJECT_ID"

echo -e "\n============================================"
echo "  CLI 测试完成"
echo "============================================"
