# 🚀 Grok-dev — The First Agentic IDE for Mobile

> **Code anywhere. Build everywhere.** The world's first truly agentic IDE built natively for mobile phones — bringing Cursor, VS Code, and Claude Code power to your pocket.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-iOS%20%7C%20Android-blue.svg)]
[![Built with Expo](https://img.shields.io/badge/Built%20with-Expo-000.svg?logo=expo)](https://expo.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6.svg?logo=typescript)](https://typescriptlang.org)
[![React Native](https://img.shields.io/badge/React%20Native-0.76-61DAFB.svg?logo=react)](https://reactnative.dev)

---

## 🌟 What Makes Grok-dev Special?

| Traditional Mobile Editors | **Grok-dev** |
|---------------------------|--------------|
| Syntax highlighting only | **Full agentic AI coding assistant** |
| No terminal access | **Integrated terminal & shell** |
| Single file editing | **Multi-file workspace with git** |
| No AI context | **RAG-powered codebase awareness** |
| Desktop-only workflows | **Native mobile-first UX** |

**Grok-dev is the first IDE where the AI doesn't just autocomplete — it *understands* your entire project, writes features end-to-end, refactors across files, and executes commands — all from your phone.**

---

## ✨ Features

### 🤖 Agentic AI Assistant
- **Multi-model support**: Grok, Gemini, OpenAI, Anthropic — switch seamlessly
- **Codebase RAG**: Vector embeddings + semantic search for full-project context
- **Autonomous coding**: Write, edit, refactor, test, and debug across multiple files
- **Natural language → code**: "Add dark mode with persistence" → done

### 📱 Mobile-First Architecture
- **Native performance**: Expo + React Native + Reanimated 3
- **Touch-optimized**: Gesture-based navigation, swipe actions, haptic feedback
- **Offline-first**: Local-first architecture with background sync
- **Split-screen ready**: Works beautifully on foldables & tablets

### 🛠️ Full Development Environment
- **File explorer**: Tree view with git status, search, drag-drop
- **Code editor**: Monaco-based with LSP, IntelliSense, multi-cursor
- **Integrated terminal**: Full shell with PTY support
- **GitHub integration**: Clone, commit, push, PRs, issues — native UI
- **Diff viewer**: Side-by-side, inline, unified diffs with syntax highlighting

### 🔐 Enterprise-Grade
- **Encrypted credentials**: Secure storage for API keys, tokens
- **OAuth providers**: GitHub, Google, custom providers
- **Rate limiting & auth middleware**: Production-ready backend
- **Prisma + PostgreSQL**: Type-safe database layer

---

## 🏗️ Architecture

```
Grok-dev/
├── grokdev/                 # 📱 Mobile App (Expo + React Native)
│   ├── app/                 # Expo Router file-based routing
│   │   ├── (tabs)/          # Main tab navigation
│   │   │   ├── chat/        # AI chat interface
│   │   │   ├── explorer.tsx # File explorer
│   │   │   ├── editor.tsx   # Code editor (Monaco)
│   │   │   ├── github.tsx   # GitHub integration
│   │   │   └── settings.tsx # App settings
│   │   ├── editor.tsx       # Full-screen editor
│   │   └── diff.tsx         # Diff viewer
│   ├── components/          # Reusable UI components
│   ├── store/               # Zustand state management
│   ├── constants/           # Theme, config
│   └── assets/              # Icons, images, onboarding
│
├── grokdev-api/             # 🖥️ Backend API (Node + TypeScript)
│   ├── src/
│   │   ├── routes/          # API endpoints
│   │   │   ├── auth.ts      # Authentication
│   │   │   ├── chat.ts      # AI chat + RAG
│   │   │   ├── github.ts    # GitHub OAuth + API
│   │   │   └── repos.ts     # Repository management
│   │   ├── services/
│   │   │   ├── ai.service.ts      # Multi-model AI orchestration
│   │   │   ├── rag.service.ts     # Vector search + embeddings
│   │   │   └── github.service.ts  # GitHub API wrapper
│   │   ├── middleware/      # Auth, rate limiting
│   │   └── utils/           # Encryption, helpers
│   └── prisma/              # Database schema
│
└── tweets-30days.md         # 📈 Development journey
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- Expo CLI (`npm install -g @expo/cli`)
- PostgreSQL database
- API keys: Grok, Gemini, OpenAI, Anthropic (at least one)

### Backend Setup
```bash
cd grokdev-api
cp .env.example .env  # Configure your environment
npm install
npx prisma migrate dev
npm run dev           # Starts on http://localhost:3000
```

### Mobile App Setup
```bash
cd grokdev
cp .env.example .env  # Configure API URL, keys
npm install
npx expo start        # Scan QR with Expo Go or run on simulator
```

### Environment Variables

**grokdev-api/.env**
```env
DATABASE_URL="postgresql://user:pass@localhost:5432/grokdev"
JWT_SECRET="your-super-secret-jwt-key"
ENCRYPTION_KEY="32-char-encryption-key-here"

# AI Providers (at least one required)
GROK_API_KEY="xai-..."
GEMINI_API_KEY="..."
OPENAI_API_KEY="sk-..."
ANTHROPIC_API_KEY="sk-ant-..."

# GitHub OAuth
GITHUB_CLIENT_ID="..."
GITHUB_CLIENT_SECRET="..."
GITHUB_CALLBACK_URL="http://localhost:3000/api/github/callback"

PORT=3000
NODE_ENV=development
```

**grokdev/.env**
```env
EXPO_PUBLIC_API_URL="http://localhost:3000"
EXPO_PUBLIC_WS_URL="ws://localhost:3000"
```

---

## 🎯 Roadmap

### ✅ Completed (v0.1)
- [x] Multi-model AI chat with streaming
- [x] RAG-powered codebase indexing
- [x] File explorer with git integration
- [x] Monaco-based code editor
- [x] GitHub OAuth + repo management
- [x] Diff viewer (side-by-side, inline)
- [x] Encrypted credential storage
- [x] Onboarding flow
- [x] Dark/light theme system

### 🚧 In Progress (v0.2)
- [ ] Terminal/PTY integration
- [ ] Background sync & offline queue
- [ ] Push notifications for CI/CD
- [ ] Plugin/extension system
- [ ] Collaborative editing (CRDTs)

### 🔮 Future (v1.0+)
- [ ] iPad/macOS Catalyst support
- [ ] Self-hosted backend option
- [ ] Team workspaces & sharing
- [ ] AI-powered code review
- [ ] App Store / Play Store release

---

## 🤝 Contributing

We welcome contributions! Grok-dev is **MIT licensed** and open source.

```bash
# 1. Fork the repo
# 2. Create a feature branch
git checkout -b feature/amazing-feature

# 3. Make your changes
# 4. Run tests & lint
npm run lint && npm run typecheck

# 5. Submit a PR 🎉
```

### Development Guidelines
- **TypeScript strict mode** — no `any` without justification
- **Expo Router** — file-based routing only
- **Zustand** — for global state, React Query for server state
- **NativeWind/Tailwind** — utility-first styling
- **Conventional Commits** — `feat:`, `fix:`, `docs:`, etc.

---

## 📄 License

**MIT License** — see [LICENSE](LICENSE) for details.

```
Copyright (c) 2026 Frankemsinwa

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction...
```

---

## 🙏 Acknowledgments

- **Expo team** — for making React Native development delightful
- **Monaco Editor** — for the best code editing experience
- **xAI, Google, OpenAI, Anthropic** — for pushing AI boundaries
- **Cursor, VS Code, Claude Code** — for inspiring what's possible
- **The open source community** — you make this possible

---

## 📱 Screenshots

| Chat | Editor | Explorer | GitHub |
|------|--------|----------|--------|
| ![Chat](grokdev/assets/onboarding/step1.png) | ![Editor](grokdev/assets/onboarding/step2.png) | ![Explorer](grokdev/assets/onboarding/step3.png) | ![GitHub](grokdev/assets/Grok-trans.png) |

---

## 🌐 Links

- **Repository**: [github.com/Frankemsinwa/Grok-dev](https://github.com/Frankemsinwa/Grok-dev)
- **Issues**: [Report a bug / Request a feature](https://github.com/Frankemsinwa/Grok-dev/issues)
- **Discussions**: [Join the conversation](https://github.com/Frankemsinwa/Grok-dev/discussions)

---

<div align="center">

**Built with ❤️ by [Frankemsinwa](https://github.com/Frankemsinwa)**

*The first agentic IDE for mobile. The best agentic IDE for mobile.*

⭐ **Star this repo if you believe coding on mobile should be first-class!**

</div>