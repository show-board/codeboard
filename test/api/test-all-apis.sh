#!/bin/bash
# ============================================================
# CodeBoard API 全接口测试脚本
# 依次测试所有 API 端点，记录测试结果
# 使用方法: bash test/api/test-all-apis.sh
# ============================================================

BASE_URL="http://127.0.0.1:2585"
PASS=0
FAIL=0
PROJECT_ID="test_proj_$(date +%s)"
SESSION_ID="sess_$(date +%s)"
TASK_ID="task_$(date +%s)"

# 输出带颜色的测试结果
pass() { echo -e "  ✅ \033[32mPASS\033[0m: $1"; ((PASS++)); }
fail() { echo -e "  ❌ \033[31mFAIL\033[0m: $1 - $2"; ((FAIL++)); }

# 执行测试请求
test_api() {
  local method="$1"
  local path="$2"
  local data="$3"
  local desc="$4"
  
  echo -e "\n🔹 测试: $desc ($method $path)"
  
  if [ "$method" = "GET" ]; then
    RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL$path")
  elif [ "$method" = "DELETE" ]; then
    RESPONSE=$(curl -s -w "\n%{http_code}" -X DELETE "$BASE_URL$path")
  else
    RESPONSE=$(curl -s -w "\n%{http_code}" -X "$method" -H "Content-Type: application/json" -d "$data" "$BASE_URL$path")
  fi
  
  HTTP_CODE=$(echo "$RESPONSE" | tail -1)
  BODY=$(echo "$RESPONSE" | sed \$d)
  
  echo "  状态码: $HTTP_CODE"
  echo "  响应: $(echo $BODY | head -c 200)"
  
  if [ "$HTTP_CODE" -ge 200 ] && [ "$HTTP_CODE" -lt 400 ]; then
    pass "$desc"
  else
    fail "$desc" "HTTP $HTTP_CODE"
  fi
}

echo "============================================"
echo "  CodeBoard API 测试 - $(date)"
echo "  服务地址: $BASE_URL"
echo "============================================"

# 1. 健康检查
test_api "GET" "/api/health" "" "健康检查"

# 2. 获取 API 文档
test_api "GET" "/api/docs" "" "获取 API 文档"

# 3. 获取用户设置
test_api "GET" "/api/settings" "" "获取用户设置"

# 4. 更新用户设置
test_api "PUT" "/api/settings" '{"nickname":"TestUser","motto":"Testing!"}' "更新用户设置"

# 5. 注册项目
test_api "POST" "/api/projects/register" "{\"project_id\":\"$PROJECT_ID\",\"name\":\"测试项目-$PROJECT_ID\",\"description\":\"API自动测试创建的项目\"}" "注册新项目"

# 6. 获取所有项目
test_api "GET" "/api/projects" "" "获取所有项目"

# 7. 获取单个项目
test_api "GET" "/api/projects/$PROJECT_ID" "" "获取单个项目详情"

# 8. 更新项目信息
test_api "PUT" "/api/projects/$PROJECT_ID" '{"name":"测试项目-已更新","description":"更新后的描述"}' "更新项目信息"

# 9. 测试项目连接
test_api "POST" "/api/projects/$PROJECT_ID/test" '{}' "测试项目连接"

# 10. 修改项目颜色
test_api "PATCH" "/api/projects/$PROJECT_ID/color" '{"color":"#FF0000"}' "修改项目颜色"

# 11. 发送 session_start
test_api "POST" "/api/tasks/update" "{\"project_id\":\"$PROJECT_ID\",\"session_id\":\"$SESSION_ID\",\"task_id\":\"$TASK_ID\",\"type\":\"session_start\",\"goal\":\"测试API功能\",\"task_list\":[{\"name\":\"测试1\",\"status\":\"queued\"},{\"name\":\"测试2\",\"status\":\"queued\"}]}" "推送 session_start"

# 12. 发送 task_start
TASK_ID2="task_$(date +%s)_2"
test_api "POST" "/api/tasks/update" "{\"project_id\":\"$PROJECT_ID\",\"session_id\":\"$SESSION_ID\",\"task_id\":\"$TASK_ID2\",\"type\":\"task_start\",\"task_name\":\"测试任务1\",\"task_plan\":\"执行API测试\"}" "推送 task_start"

# 13. 发送 task_complete
TASK_ID3="task_$(date +%s)_3"
test_api "POST" "/api/tasks/update" "{\"project_id\":\"$PROJECT_ID\",\"session_id\":\"$SESSION_ID\",\"task_id\":\"$TASK_ID3\",\"type\":\"task_complete\",\"task_name\":\"测试任务1\",\"task_summary\":\"API测试通过\"}" "推送 task_complete"

# 14. 发送 session_complete
TASK_ID4="task_$(date +%s)_4"
test_api "POST" "/api/tasks/update" "{\"project_id\":\"$PROJECT_ID\",\"session_id\":\"$SESSION_ID\",\"task_id\":\"$TASK_ID4\",\"type\":\"session_complete\",\"task_summary\":\"全部API测试完成\",\"summary\":\"测试总结\"}" "推送 session_complete"

# 15. 获取 Session 列表
test_api "GET" "/api/sessions/$PROJECT_ID" "" "获取项目Session列表"

# 16. 获取任务更新记录
test_api "GET" "/api/tasks/$SESSION_ID" "" "获取任务更新记录"

# 17. 获取记忆分类
test_api "GET" "/api/memories/$PROJECT_ID/categories" "" "获取记忆分类"

# 18. 创建记忆分类
test_api "POST" "/api/memories/$PROJECT_ID/categories" '{"name":"test-category","description":"测试分类"}' "创建记忆分类"

# 19. 创建记忆文档
test_api "POST" "/api/memories/$PROJECT_ID/documents" '{"category_id":1,"title":"测试文档","file_name":"test-doc.md","content":"# 测试\n\n这是测试文档内容"}' "创建记忆文档"

# 20. 获取记忆文档列表
test_api "GET" "/api/memories/$PROJECT_ID/documents" "" "获取记忆文档列表"

# 21. 批量同步记忆
test_api "POST" "/api/memories/$PROJECT_ID/sync" '{"files":[{"category_id":1,"title":"同步文档","file_name":"sync-test.md","content":"# 同步测试\n\n批量同步内容"}]}' "批量同步记忆"

# 22. 获取推荐
test_api "GET" "/api/recommendations" "" "获取推荐任务"

# 23. 获取未读通知
test_api "GET" "/api/notifications/unread" "" "获取未读通知"

# 24. 标记通知已读
test_api "POST" "/api/notifications/read" "{\"project_id\":\"$PROJECT_ID\"}" "标记通知已读"

# 25. 项目状态变更 - 隐藏
test_api "PATCH" "/api/projects/$PROJECT_ID/status" '{"status":"hidden"}' "隐藏项目"

# 26. 项目状态变更 - 恢复
test_api "PATCH" "/api/projects/$PROJECT_ID/status" '{"status":"visible"}' "恢复项目"

# 27. 项目状态变更 - 丢弃
test_api "PATCH" "/api/projects/$PROJECT_ID/status" '{"status":"trashed"}' "丢弃到垃圾篓"

# 28. 永久删除项目
test_api "DELETE" "/api/projects/$PROJECT_ID" "" "永久删除项目"

# 29. 404 测试
test_api "GET" "/api/nonexistent" "" "404 路径测试"

echo -e "\n============================================"
echo "  测试完成: ✅ $PASS 通过, ❌ $FAIL 失败"
echo "============================================"
