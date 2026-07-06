# StudyForge

> **An open-source, local-first AI study platform.**

StudyForge is a modern study application that transforms notes, textbooks, lectures, and other learning materials into comprehensive active recall question banks using the AI provider of your choice.

Unlike subscription-based study platforms, StudyForge is designed around a **Bring Your Own AI** philosophy. Use Gemini today, switch to another provider tomorrow, or eventually run everything locally with your preferred LLM.

## ✨ Features

* 📚 Deck management
* 🤖 AI-powered question generation
* 📝 Built-in question editor
* 📥 JSON import/export
* 🎯 Practice Quiz mode
* 📖 Flashcard study mode
* 📊 Study statistics
* 🏆 XP, levels, and progression
* 🔥 Daily streak tracking
* 🌙 Modern dark interface
* 💾 Local-first data storage
* 🔌 Provider-agnostic AI architecture

## 🚀 Vision

StudyForge aims to become a free and open-source alternative to AI-powered study platforms by providing:

* Complete ownership of your data
* Local-first design
* Offline studying
* Configurable learning workflows
* Support for multiple AI providers
* No subscriptions
* No vendor lock-in

## 🛠️ Current Status

**Version:** v0.0.1-alpha

This project is currently in active development.

Expect:

* Frequent UI changes
* New features
* Bugs
* Breaking changes

## 🧠 AI Providers

The long-term goal is to support multiple providers through a unified interface, including:

* Google Gemini
* Anthropic Claude
* OpenAI
* OpenRouter
* Ollama (local)
* LM Studio (local)

## 🖥️ Local Development

### Prerequisites

* Node.js
* npm

### Installation

```bash
npm install
```

Create a `.env.local` file:

```env
GEMINI_API_KEY=your_api_key_here
```

Start the development server:

```bash
npm run dev
```

## 🎯 Roadmap

### Alpha

* [x] Deck management
* [x] AI question generation
* [x] JSON import pipeline
* [x] Study interface

### Beta

* [ ] Advanced Practice Quiz
* [ ] Spaced repetition
* [ ] Achievement system
* [ ] Adaptive review
* [ ] Statistics dashboard
* [ ] Prompt templates
* [ ] Multi-provider AI support

### Version 1.0

* [ ] Tauri desktop application
* [ ] Full offline study support
* [ ] Plugin architecture
* [ ] Complete accessibility support
* [ ] Comprehensive testing
* [ ] Stable release

## 🤝 Contributing

Contributions, bug reports, feature requests, and suggestions are welcome as the project matures.

## 📄 License

License to be determined.

## ❤️ Philosophy

Learning tools should empower learners—not lock them into subscriptions or proprietary ecosystems.

StudyForge keeps your decks, your progress, and your learning under your control while letting you choose the AI that best fits your needs.
