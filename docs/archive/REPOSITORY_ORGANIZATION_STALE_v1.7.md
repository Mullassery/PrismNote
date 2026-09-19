# Repository Organization Guide

**Date:** 2026-07-28  
**Version:** v1.7.0  
**Status:** ✅ Complete

---

## Overview

The PrismNote repository has been reorganized for better maintainability and professional structure. All files are now organized into logical directories with clear purposes.

## Directory Structure

```
prismnote/
├── README.md                          # Main project README
├── LICENSE                            # Proprietary license
├── Dockerfile                         # Docker build configuration
├── Cargo.toml                         # Rust workspace
├── Cargo.lock                         # Cargo lock file
├── pyproject.toml                     # Python package configuration
├── rust-toolchain.toml                # Rust version pinning
├── Makefile                           # Build automation
│
├── /docs                              # Complete documentation
│   ├── README.md                      # Documentation index
│   ├── GETTING_STARTED.md             # Installation & setup
│   ├── PRODUCT_VISION.md              # Vision and strategy
│   │
│   ├── /guides                        # Feature guides
│   │   ├── MULTI_LANGUAGE_SUPPORT.md
│   │   ├── MULTI_TERMINAL_GUIDE.md
│   │   ├── AI_MCP_INTEGRATION.md
│   │   └── EXECUTION_BACKENDS.md
│   │
│   ├── /reference                     # Technical reference
│   │   ├── SECURITY.md
│   │   ├── KEYBOARD_STRESS_RESULTS.md
│   │   └── RELEASE_SYNC_VERIFICATION.md
│   │
│   ├── /development                   # Developer documentation
│   │   ├── CONTRIBUTING.md
│   │   ├── ROADMAP.md
│   │   └── HOMEBREW_TAP_SETUP.md
│   │
│   └── /archive                       # Historical documentation
│       ├── COMPREHENSIVE_IMPROVEMENT_PLAN.md
│       ├── LANGUAGE_SUPPORT_AUDIT.md
│       ├── UI_UX_AUDIT.md
│       └── [other completed project docs]
│
├── /scripts                           # Build and utility scripts
│   ├── README.md                      # Script documentation
│   ├── build.sh                       # Linux/macOS build
│   ├── build-macos.sh                 # macOS-specific build
│   ├── build-release-binaries.sh      # Release build script
│   ├── install.sh                     # Development setup
│   ├── setup-homebrew-taps.sh         # Homebrew tap setup
│   ├── capture_screenshots.py         # Documentation screenshots
│   └── /homebrew-completions         # Shell completion files
│       ├── prismnote.bash
│       ├── prismnote.fish
│       └── _prismnote (zsh)
│
├── /assets                            # Media and branding assets
│   ├── README.md                      # Asset guidelines
│   ├── /screenshots                   # UI screenshots
│   │   ├── ai_available_without_notebook.png
│   │   ├── ai_tab_chainlit_design.png
│   │   ├── final_screenshot.png
│   │   └── [other screenshots...]
│   ├── /logos                         # Brand logos
│   ├── /diagrams                      # Architecture diagrams
│   └── /design                        # Design system assets
│
├── /frontend                          # React/TypeScript UI
│   ├── README.md
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── /src                           # React components and hooks
│   ├── /public                        # Static assets
│   ├── /tests                         # Frontend tests
│   └── tests/                         # Playwright E2E tests
│
├── /python                            # Python package
│   ├── prismnote/
│   │   ├── __init__.py
│   │   ├── _cli.py                    # CLI launcher
│   │   ├── middleware.py
│   │   └── [other Python modules]
│   ├── pyproject.toml
│   └── README.md
│
├── /crates                            # Rust backend
│   └── /server                        # Main Rust server
│       ├── Cargo.toml
│       └── src/
│
├── /examples                          # Example notebooks
│   └── basic_analysis.py
│
├── /tests                             # Integration tests
│   └── test_python_bindings.py
│
├── /.github                           # GitHub configuration
│   ├── workflows/                     # CI/CD workflows
│   ├── ISSUE_TEMPLATE/
│   └── PULL_REQUEST_TEMPLATE/
│
└── /.gitignore                        # Git ignore rules
```

---

## Key Changes

### What Moved

**Documentation at Root** → **`/docs` Subdirectories**
- Getting started: `/docs/GETTING_STARTED.md`
- Guides: `/docs/guides/`
- Reference: `/docs/reference/`
- Development: `/docs/development/`
- Archive: `/docs/archive/`

**Build Scripts at Root** → **`/scripts`**
- `build.sh` → `/scripts/build.sh`
- `install.sh` → `/scripts/install.sh`
- `capture_screenshots.py` → `/scripts/capture_screenshots.py`

**Screenshot Images at Root** → **`/assets/screenshots`**
- All `.png` files organized by context

**Homebrew Configuration** → **Consolidated**
- Removed duplicate `homebrew/`, `homebrew-formulas/`, `Formula/` directories
- Homebrew completions in `/scripts/homebrew-completions/`
- Setup docs in `/docs/development/HOMEBREW_TAP_SETUP.md`

**Historical Docs** → **`/docs/archive/`**
- Completed project documentation moved to archive
- Keeps main `/docs` focused on current version

### What's Clean at Root

Only essential files remain at project root:
- `README.md` - Main project overview
- `LICENSE` - Proprietary license
- `Cargo.toml` - Rust workspace
- `pyproject.toml` - Python configuration
- `Dockerfile` - Docker build
- `.gitignore` - Git configuration

No build artifacts, no scattered markdown, no duplicates.

---

## Navigation Guide

### For Users

1. **Start here:** `README.md`
2. **Installation:** `docs/GETTING_STARTED.md`
3. **Features:** `docs/guides/` (pick your interest)
4. **Keyboard shortcuts:** `docs/reference/KEYBOARD_STRESS_RESULTS.md`

### For Contributors

1. **Contributing:** `docs/development/CONTRIBUTING.md`
2. **Roadmap:** `docs/development/ROADMAP.md`
3. **Building:** `scripts/` (read script READMEs)
4. **Homebrew:** `docs/development/HOMEBREW_TAP_SETUP.md`

### For Maintainers

1. **Release process:** `docs/reference/RELEASE_SYNC_VERIFICATION.md`
2. **Security:** `docs/reference/SECURITY.md`
3. **Project vision:** `docs/PRODUCT_VISION.md`

---

## Benefits of This Structure

✅ **Better Discoverability**
- Users quickly find what they need
- Clear separation of guides vs. reference vs. development

✅ **Professional Appearance**
- Clean root directory
- Organized GitHub interface
- Easy for new contributors to navigate

✅ **Maintainability**
- Documentation scales with project
- Archive keeps completed work accessible but out of the way
- Scripts are easy to find and update

✅ **Collaboration**
- Clear file organization reduces confusion
- Easier to find where to add new docs
- Consistent structure across teams

✅ **Build Automation**
- Scripts organized logically
- Completions bundled with scripts
- Easy to discover and run build commands

---

## Adding New Content

### Adding Documentation

1. **User/feature guide?** → `/docs/guides/`
2. **Technical reference?** → `/docs/reference/`
3. **Developer content?** → `/docs/development/`
4. **Completing a project?** → Move to `/docs/archive/` when done

Example:
```bash
# New guide
docs/guides/MY_NEW_FEATURE.md

# New reference
docs/reference/API_ENDPOINT.md

# Development doc
docs/development/BUILD_FROM_SOURCE.md
```

### Adding Scripts

1. Place script in `/scripts/`
2. Make executable: `chmod +x scripts/my-script.sh`
3. Update `/scripts/README.md` with documentation
4. Add to `.gitignore` if it generates artifacts

### Adding Assets

1. Screenshots: `/assets/screenshots/`
2. Logos: `/assets/logos/`
3. Diagrams: `/assets/diagrams/`
4. Update `/assets/README.md` with usage guidelines

---

## GitHub Integration

### Repository Settings

- **Primary Branch:** `main`
- **Documentation:** Hosted from `/docs`
- **CI/CD:** Workflows in `/.github/workflows/`
- **Releases:** Synced from `/docs/reference/RELEASE_SYNC_VERIFICATION.md`

### Discovery

- GitHub automatically shows `README.md` on project page
- `/docs` is easily navigable via GitHub web UI
- `/assets` images link correctly in documentation

---

## Version History

- **v1.7.0** (2026-07-28): Major repository reorganization
  - Moved 26+ scattered docs into organized structure
  - Consolidated build scripts into `/scripts`
  - Organized screenshots into `/assets`
  - Removed duplicate directories
  - Updated README with structure diagram

---

## Migration Checklist

- [x] Create `/docs` subdirectories (guides, reference, development, archive)
- [x] Move documentation files to appropriate locations
- [x] Move build scripts to `/scripts`
- [x] Move screenshots to `/assets/screenshots`
- [x] Create index files (README.md in each major directory)
- [x] Update main README with structure diagram
- [x] Remove duplicate directories
- [x] Clean build artifacts
- [x] Update links in documentation
- [x] Commit and push organized structure
- [x] Remove all Deepnote/Hex references
- [x] Sync release across PyPI, GitHub, Homebrew

---

## Questions?

- **Using PrismNote?** → See `docs/GETTING_STARTED.md`
- **Contributing?** → See `docs/development/CONTRIBUTING.md`
- **Building from source?** → See `scripts/README.md`
- **Report issues?** → GitHub Issues

---

**Result: Professional, organized, scalable repository structure ready for production use and community contribution.**
