#!/usr/bin/env python3
"""
CodeBoard 项目初始化状态检测脚本
运行: python3 scripts/init_project_judge.py

功能：
  1. 检查当前目录下是否存在 .dashboard/project.yaml
  2. 验证 project.yaml 中是否包含必要的 KV（project_id, project_name）
  3. 尝试连接 CodeBoard API 验证项目是否已注册
  4. 输出结构化的检测结果供 Agent 决策

退出码：
  0 = 项目已初始化且连接正常
  1 = 项目未初始化或配置不完整（需要 Agent 执行初始化流程）
  2 = 项目配置存在但看板连接异常（CodeBoard 可能未运行）
"""

import json
import os
import re
import sys
import urllib.request
import urllib.error
from pathlib import Path

# CodeBoard API 地址（可通过环境变量覆盖）
CODEBOARD_API = os.environ.get("CODEBOARD_API", "http://127.0.0.1:2585")

# 从当前工作目录开始向上查找项目根目录（含 .dashboard/project.yaml 的目录）
def find_project_root() -> Path | None:
    """向上递归查找包含 .dashboard/project.yaml 的目录"""
    current = Path.cwd()
    for parent in [current, *current.parents]:
        if (parent / ".dashboard" / "project.yaml").exists():
            return parent
        # 到达文件系统根目录或 home 目录时停止
        if parent == parent.parent or parent == Path.home():
            break
    return None


def parse_project_yaml(yaml_path: Path) -> dict:
    """简易解析 YAML 格式的 project.yaml（不依赖第三方库）"""
    result = {}
    text = yaml_path.read_text(encoding="utf-8", errors="ignore")
    for line in text.splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        # 匹配 key: value 或 key: "value" 格式
        m = re.match(r'^(\w+):\s*"?([^"]*)"?\s*$', line)
        if m:
            result[m.group(1)] = m.group(2).strip()
    return result


def check_api_health() -> bool:
    """检查 CodeBoard API 是否可达"""
    try:
        req = urllib.request.Request(f"{CODEBOARD_API}/api/health", method="GET")
        with urllib.request.urlopen(req, timeout=3) as resp:
            data = json.loads(resp.read())
            return data.get("success", False)
    except Exception:
        return False


def check_project_registered(project_id: str) -> dict:
    """检查项目是否已在 CodeBoard 中注册"""
    try:
        url = f"{CODEBOARD_API}/api/projects/{project_id}/test"
        req = urllib.request.Request(url, method="POST",
                                     headers={"Content-Type": "application/json"},
                                     data=b"{}")
        with urllib.request.urlopen(req, timeout=3) as resp:
            return json.loads(resp.read())
    except Exception as e:
        return {"success": False, "error": str(e)}


def main():
    print("=" * 60)
    print("  CodeBoard 项目初始化状态检测")
    print("=" * 60)
    print()

    # Step 1: 查找项目根目录
    project_root = find_project_root()
    if not project_root:
        # 检查当前目录是否就是项目根
        cwd = Path.cwd()
        print(f"[FAIL] 未找到 .dashboard/project.yaml")
        print(f"       当前目录: {cwd}")
        print()
        print("  需要执行初始化：")
        print("  1. mkdir -p .dashboard/memories")
        print("  2. 创建 .dashboard/project.yaml（包含 project_id, project_name 等）")
        print("  3. 调用 POST /api/projects/register 注册项目")
        print()
        print("STATUS: NOT_INITIALIZED")
        sys.exit(1)

    yaml_path = project_root / ".dashboard" / "project.yaml"
    print(f"[OK]   项目根目录: {project_root}")
    print(f"[OK]   配置文件: {yaml_path}")
    print()

    # Step 2: 解析 project.yaml
    config = parse_project_yaml(yaml_path)

    # 检查必要字段
    required_keys = ["project_id", "project_name"]
    missing_keys = [k for k in required_keys if not config.get(k)]

    if missing_keys:
        print(f"[FAIL] project.yaml 缺少必要字段: {', '.join(missing_keys)}")
        print(f"       当前内容: {json.dumps(config, ensure_ascii=False, indent=2)}")
        print()
        print("  需要补充以下字段:")
        for key in missing_keys:
            if key == "project_id":
                print(f'    {key}: "proj_<时间戳>"')
            elif key == "project_name":
                print(f'    {key}: "你的项目名称"')
        print()
        print("STATUS: INCOMPLETE_CONFIG")
        sys.exit(1)

    project_id = config["project_id"]
    project_name = config.get("project_name", "")
    print(f"[OK]   project_id: {project_id}")
    print(f"[OK]   project_name: {project_name}")

    # 检查可选但推荐的字段
    optional_keys = ["project_description", "created_at"]
    for key in optional_keys:
        if config.get(key):
            print(f"[OK]   {key}: {config[key]}")
        else:
            print(f"[WARN] {key}: 未设置（建议补充）")
    print()

    # Step 3: 检查 memories 目录
    memories_dir = project_root / ".dashboard" / "memories"
    if memories_dir.exists():
        memory_files = list(memories_dir.glob("*.md"))
        print(f"[OK]   memories 目录存在，含 {len(memory_files)} 个文件")
    else:
        print(f"[WARN] memories 目录不存在，建议创建: mkdir -p .dashboard/memories")
    print()

    # Step 4: 检查 CodeBoard API 连接
    print("--- 检查 CodeBoard 连接 ---")
    print(f"API 地址: {CODEBOARD_API}")

    if not check_api_health():
        print(f"[FAIL] CodeBoard API 不可达")
        print(f"       请确认 CodeBoard 桌面应用正在运行")
        print()
        print("STATUS: API_UNREACHABLE")
        sys.exit(2)

    print(f"[OK]   API 健康检查通过")

    # Step 5: 检查项目是否已注册
    result = check_project_registered(project_id)
    if result.get("available") or result.get("success"):
        print(f"[OK]   项目已在看板中注册")
        print()
        print("=" * 60)
        print("  所有检查通过！项目已正确初始化。")
        print("=" * 60)
        print()
        print("STATUS: INITIALIZED")
        sys.exit(0)
    else:
        print(f"[FAIL] 项目未在看板中注册")
        print(f"       需要执行: POST /api/projects/register")
        print(f'       Body: {{"project_id":"{project_id}","name":"{project_name}","description":""}}')
        print()
        print("STATUS: NOT_REGISTERED")
        sys.exit(1)


if __name__ == "__main__":
    main()
