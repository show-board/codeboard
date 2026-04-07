# CodeBoard - VibeCoding Multi-Project Kanban

CodeBoard is a macOS desktop application designed specifically for VibeCoding (AI-driven programming) scenarios. It is used to manage the real-time status, task progress, and project memory of multiple AI Agent projects.

## Core Features

* **Multi-Project Kanban** — A horizontally scrollable project column view that displays the status of each project's session and tasks in real time.
* **Task Tracking** — AI Agents report task progress via API/CLI, and the board automatically updates and sends system notifications.
* **Project Memory** — Categorized management of project knowledge bases (e.g., development structures, technical solutions, bug records), with Agents able to read and update information with each conversation.
* **Multi-Agent Support** — Supports integration with major AI Agents such as Cursor Agent, Claude Code, and OpenClaw.
* **Mac Native Experience** — Features such as frosted glass effects, system tray, system notifications, and a hidden title bar.

## Technology Stack

| Layer              | Technology                           |
| ------------------ | ------------------------------------ |
| Desktop Framework  | Electron 33                          |
| Frontend           | React 18 + TypeScript + Tailwind CSS |
| State Management   | Zustand                              |
| Animation          | Framer Motion                        |
| Backend API        | Express + better-sqlite3             |
| Build Tools        | electron-vite + Vite 6               |
| Package Management | pnpm                                 |

## Quick Start

### System Requirements

| Dependency      | Version           | Notes                     |
| --------------- | ----------------- | ------------------------- |
| macOS           | >= 13.0 (Ventura) | Desktop app runtime       |
| Node.js         | >= 20.x           | Runtime (LTS recommended) |
| pnpm            | >= 9.x            | Package manager           |
| Xcode CLI Tools | Latest            | Native module compilation |
| Python          | 3.x               | node-gyp dependency       |

### Installation from Source

```bash
# 1. Clone the repository
git clone <repo-url> codeboard
cd codeboard

# 2. Install pnpm (if not already installed)
npm install -g pnpm

# 3. Install project dependencies
pnpm install

# 4. Start in development mode
pnpm dev
```

After startup, the CodeBoard desktop app will open automatically, and the API server will listen on `http://127.0.0.1:2585`.

### Build and Package

```bash
# Build the production version
pnpm build

# Package as macOS .dmg installer
pnpm dist

cd codeboard && npx electron-builder --mac --arm64 2>&1

cd scodeboard && npx electron-builder --mac --x64 2>&1
```

The packaged output will be located in the `release/` directory.

### Install CLI Tool

```bash
cd cli
pnpm install && pnpm build
npm install -g .

# Verify
codeboard --help
```

---

## Network Issues & Mirror Configuration

In environments with network restrictions, `pnpm install` or packaging may fail to download dependencies. Below are recommended mirror configurations:

### npm/pnpm Mirror

```bash
# Use the Taobao npm mirror
pnpm config set registry https://registry.npmmirror.com

# Or use Huawei Cloud mirror
pnpm config set registry https://mirrors.huaweicloud.com/repository/npm/
```

### Electron Download Mirror

Packaging requires downloading Electron binaries. It’s recommended to configure a mirror:

```bash
# Option 1: Set environment variables (recommended)
export ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/"
export ELECTRON_BUILDER_BINARIES_MIRROR="https://npmmirror.com/mirrors/electron-builder-binaries/"

# Option 2: Write to .npmrc file (permanent effect)
cat >> .npmrc << 'EOF'
electron_mirror=https://npmmirror.com/mirrors/electron/
electron_builder_binaries_mirror=https://npmmirror.com/mirrors/electron-builder-binaries/
EOF

# Then rebuild the package
pnpm dist
```

### Manually Download Electron (Fallback)

If mirrors are unavailable, you can manually download Electron and place it in the cache directory:

```bash
# 1. Download the corresponding version (e.g., v33.4.11 arm64)
# https://npmmirror.com/mirrors/electron/33.4.11/electron-v33.4.11-darwin-arm64.zip

# 2. Place it in the Electron cache directory
mkdir -p ~/Library/Caches/electron
cp electron-v33.4.11-darwin-arm64.zip ~/Library/Caches/electron/

# 3. Rebuild the package
pnpm dist
```

### node-gyp / better-sqlite3 Compilation Issues

```bash
# Ensure Xcode CLI Tools are installed
xcode-select --install

# Ensure Python 3 is available
python3 --version

# If better-sqlite3 ABI version mismatch occurs, manually rebuild
npx node-gyp rebuild \
  --directory=node_modules/.pnpm/better-sqlite3@11.10.0/node_modules/better-sqlite3
```

---

## Configure AI Agents

CodeBoard uses Skill files to guide AI Agents in automatically connecting to the kanban. It supports various agents:

| Agent        | Installation Guide                                               |
| ------------ | ---------------------------------------------------------------- |
| Cursor Agent | [docs/AGENT-SETUP-CURSOR.md](docs/AGENT-SETUP-CURSOR.md)         |
| Claude Code  | [docs/AGENT-SETUP-CLAUDECODE.md](docs/AGENT-SETUP-CLAUDECODE.md) |
| OpenClaw     | [docs/AGENT-SETUP-OPENCLEW.md](docs/AGENT-SETUP-OPENCLEW.md)     |

---

## Project Structure

```
codeboard/
├── electron/              # Electron main process + preload scripts
│   ├── main/
│   │   ├── index.ts       # Main process entry (window, tray, IPC)
│   │   ├── server/        # API server (runs in a separate process)
│   │   ├── db/            # Database schema
│   │   └── services/      # Business services (memory, notifications, recommendations)
│   └── preload/
│       └── index.ts       # Context bridge (contextBridge)
├── src/                   # Renderer process (React)
│   ├── App.tsx            # Root component
│   ├── components/        # UI components (Board, Sidebar, Modals, etc.)
│   ├── stores/            # Zustand state management
│   ├── hooks/             # Custom hooks
│   ├── types/             # TypeScript type definitions
│   └── styles/            # Global CSS
├── cli/                   # CodeBoard CLI tool
├── skills/                # Agent Skills
│   ├── codeboard/         # Main Skill for Kanban integration (SKILL.md + references/)
│   └── install-codeboard-skills/  # Cursor installation guide (linked to ~/.cursor/skills)
├── docs/                  # Documentation
│   ├── API.md             # API documentation
│   ├── ARCHITECTURE.md    # Architecture design
│   ├── INSTALL.md         # Installation guide
│   └── AGENT-SETUP-*.md   # Agent setup guides
└── test/                  # Test scripts
```

---

## Documentation Index

| Document                                                 | Description                                    |
| -------------------------------------------------------- | ---------------------------------------------- |
| [docs/INSTALL.md](docs/INSTALL.md)                       | Application installation and setup             |
| [docs/API.md](docs/API.md)                               | REST API documentation                         |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)             | System architecture design                     |
| [skills/codeboard/SKILL.md](skills/codeboard/SKILL.md)   | Main Skill for Agent Kanban integration        |
| [docs/AGENT-SETUP-CURSOR.md](docs/AGENT-SETUP-CURSOR.md) | Cursor Rules + Skills installation (must-read) |

## Open Source License

[Apache-2.0 license](https://github.com/show-board/codeboard#Apache-2.0-1-ov-file)