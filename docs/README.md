# PrismNote Documentation

Welcome to the PrismNote documentation. This guide covers everything you need to know about using, developing, and deploying PrismNote.

## Quick Links

- **New to PrismNote?** → Start with [Getting Started](./guides/GETTING_STARTED.md)
- **Want to contribute?** → See [Contributing Guide](./reference/CONTRIBUTING.md)
- **Looking for roadmap?** → Check [Roadmap](./reference/ROADMAP.md)
- **Need deployment help?** → See [Deployment Guides](./guides/)

## Documentation Structure

### [Guides](./guides/)
Comprehensive guides for using PrismNote features:
- [Multi-Language Support](./guides/MULTI_LANGUAGE_SUPPORT.md) - Execute 15+ programming languages
- [Multi-Terminal Guide](./guides/MULTI_TERMINAL_GUIDE.md) - Split terminals for complex workflows
- [AI & MCP Integration](./guides/AI_MCP_INTEGRATION.md) - AI assistance with Claude, OpenAI, Ollama
- [Execution Backends](./guides/EXECUTION_BACKENDS.md) - Language runtime details

### [Reference](./reference/)
Technical reference documentation:
- [API Reference](./reference/API_REFERENCE.md) - REST API endpoints and schema
- [Security](./reference/SECURITY.md) - Security policies and practices
- [Settings Reference](./reference/SETTINGS_REFERENCE.md) - Configuration options
- [Release Information](./reference/RELEASES.md) - Release notes and version history
- [Release Sync Verification](./reference/RELEASE_SYNC_VERIFICATION.md) - Release process details
- [Code of Conduct](./reference/CODE_OF_CONDUCT.md) - Community standards

### [Development](./development/)
For contributors and developers:
- [Contributing Guide](./development/CONTRIBUTING.md) - How to contribute
- [Roadmap](./development/ROADMAP.md) - Feature roadmap and milestones
- [Homebrew Setup](./development/HOMEBREW_TAP_SETUP.md) - Setting up Homebrew tap

### [Getting Started](./guides/GETTING_STARTED.md)
Step-by-step guide to get up and running with PrismNote:
- Installation instructions for all platforms
- First notebook setup
- Configuration and settings
- Troubleshooting common issues

## Installation

### Quick Install
```bash
# Via pip
pip install prismnote
prismnote

# Via Homebrew (macOS)
brew tap Mullassery/prismnote
brew install prismnote
```

See [Getting Started](./guides/GETTING_STARTED.md) for detailed installation instructions.

## Features

- **15+ Programming Languages** - Python, R, Julia, Rust, C++, Go, Zig, CUDA, SQL, and more
- **Multi-Terminal Splits** - Vertical and horizontal panes for complex workflows
- **AI-Assisted Code** - Claude, OpenAI, and Ollama integration
- **SQL First-Class** - 9+ database backends with direct SQL support
- **Local-First** - Your data stays on your machine
- **Data Exploration** - Visual inspection without code
- **Production Ready** - 100+ tests, comprehensive documentation

## Supported Platforms

- macOS (Intel, Apple Silicon M1-M8)
- Linux (Ubuntu, Fedora, Debian)
- Windows (WSL2)
- Docker

## Project Structure

```
prismnote/
├── frontend/          React/TypeScript UI
├── python/            Python package & CLI
├── crates/            Rust backend
├── docs/              This documentation
├── scripts/           Build and utility scripts
├── assets/            Screenshots and diagrams
└── examples/          Example notebooks
```

## Getting Help

- **Issues** - Report bugs or request features on [GitHub Issues](https://github.com/Mullassery/prismnote/issues)
- **Discussions** - Ask questions or share ideas on [GitHub Discussions](https://github.com/Mullassery/prismnote/discussions)
- **Documentation** - Browse guides and reference docs in this folder

## License

PrismNote is proprietary software. See LICENSE for details.

## Community

- GitHub Repository: https://github.com/Mullassery/prismnote
- PyPI Package: https://pypi.org/project/prismnote/
- Homebrew Tap: https://github.com/Mullassery/homebrew-prismnote
