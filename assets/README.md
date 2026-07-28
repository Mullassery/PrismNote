# Assets

This directory contains media assets for PrismNote documentation and branding.

## Subdirectories

### screenshots/
Application screenshots and UI examples for documentation.

- App interface screenshots
- Feature demonstrations
- UI component examples
- Tutorial screenshots

Used in:
- README.md
- Documentation guides
- Release notes
- GitHub wiki

### logos/
Brand logos and icon assets.

- Primary logo (color, monochrome)
- Favicon
- Social media icons
- Badge assets

### diagrams/
Architecture and design diagrams.

- System architecture
- Data flow diagrams
- Component relationships
- Process flows

## Usage Guidelines

### Screenshots
- Format: PNG (preferred) or WebP for smaller file size
- Resolution: Minimum 1280x800 for clarity
- Compression: Use tools like `pngquant` or `webp` for web optimization
- Organization: Group by feature or workflow
- Naming: Descriptive names (e.g., `multi-terminal-split.png`)

### Logos
- Format: SVG (preferred) with PNG fallback
- Include both color and monochrome versions
- Minimum size: 64x64px for raster versions
- Files: original and optimized versions

### Diagrams
- Format: SVG preferred, PNG/PDF acceptable
- Tools: Draw.io, Excalidraw, or similar
- Source files: Keep in version control if possible
- Exported format: PNG for web, PDF for print

## Asset Guidelines

- Keep file sizes small (optimize before commit)
- Use descriptive filenames
- Document source files externally if not in repo
- Maintain consistent style across assets
- Include alt-text in documentation

## Adding New Assets

1. Save to appropriate subdirectory (screenshots, logos, or diagrams)
2. Optimize file size: `pngquant --speed 1 --strip -- *.png`
3. Update relevant documentation with asset reference
4. Commit with descriptive message

## License

All assets are proprietary to PrismNote. See main LICENSE file for details.
