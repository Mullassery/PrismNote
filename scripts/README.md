# Build and Utility Scripts

This directory contains build, installation, and utility scripts for PrismNote.

## Build Scripts

### build.sh
General build script for Linux/macOS.
```bash
./scripts/build.sh
```

### build-macos.sh
Optimized build script for macOS with platform detection.
```bash
./scripts/build-macos.sh
```

## Installation Scripts

### install.sh
Automated installation script for development setup.
```bash
./scripts/install.sh
```

### setup-homebrew-taps.sh
Create and configure Homebrew tap repositories.
```bash
./scripts/setup-homebrew-taps.sh
```

## Utility Scripts

### capture_screenshots.py
Screenshot capture utility for documentation.
```bash
python3 ./scripts/capture_screenshots.py
```

## Homebrew Completions

### homebrew-completions/
Shell completion files for Homebrew installation.

- Bash completion
- Zsh completion
- Fish completion

## Usage

Most scripts require:
- Rust toolchain (rustc, cargo)
- Node.js 16+ (npm)
- Python 3.8+

For development setup, run:
```bash
./scripts/install.sh
```

For production build:
```bash
./scripts/build.sh
```

## Development

To add a new script:
1. Place it in this directory
2. Make it executable: `chmod +x scripts/your-script.sh`
3. Update this README with documentation
4. Add to .gitignore if it generates artifacts

## CI/CD Integration

These scripts are used in GitHub Actions workflows. See `.github/workflows/` for CI/CD configuration.
