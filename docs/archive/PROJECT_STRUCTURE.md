# Premium Gift Box - Project Structure

```
premium-gift-box/
├── 📁 config/                 # Build and development configuration
│   ├── .eslintrc.js          # ESLint configuration
│   ├── .prettierrc           # Prettier formatting configuration
│   ├── postcss.config.js     # PostCSS configuration
│   └── rollup.config.js      # Rollup bundler configuration
│
├── 📁 docs/                  # Documentation files
│   └── ...                   # Project documentation
│
├── 📁 public/                # Built assets (generated)
│   ├── script.js             # Compiled JavaScript
│   ├── script.min.js         # Minified JavaScript
│   ├── script.js.map         # Source map for debugging
│   ├── styles.css            # Compiled CSS
│   └── styles.min.css        # Minified CSS
│
├── 📁 src/                   # Source code
│   ├── 📁 assets/           # Static assets
│   │   ├── icons/           # Icon files
│   │   └── images/          # Image files
│   │
│   ├── 📁 css/              # Stylesheet source
│   │   ├── base.css         # Base styles and resets
│   │   ├── main.css         # Main CSS entry point
│   │   ├── variables.css    # CSS custom properties
│   │   └── 📁 components/   # Component stylesheets
│   │       ├── buttons.css  # Button components
│   │       ├── cards.css    # Card components
│   │       ├── header.css   # Header component
│   │       └── hero.css     # Hero section component
│   │
│   └── 📁 js/               # JavaScript source
│       ├── config.js        # Application configuration
│       ├── main.js          # Main JavaScript entry point
│       └── 📁 modules/      # JavaScript modules
│           ├── forms.js     # Form handling
│           ├── navigation.js # Navigation functionality
│           ├── psychology.js # Conversion optimization
│           └── slideshow.js  # Slideshow component
│
├── 📁 web/                  # Web-specific files (organized)
│   ├── .htaccess           # Apache server configuration
│   ├── index.html          # Main HTML file (original)
│   ├── manifest.json       # PWA manifest
│   ├── robots.txt          # SEO robots file
│   ├── sitemap.xml         # SEO sitemap
│   └── sw.js              # Service worker
│
├── 📄 .gitignore           # Git ignore patterns
├── 📄 CHANGELOG.md         # Version history
├── 📄 DEPLOYMENT.md        # Deployment instructions
├── 📄 index.html           # Main entry point (copy)
├── 📄 package.json         # Node.js dependencies and scripts
├── 📄 PROJECT_STRUCTURE.md # This file
└── 📄 README.md           # Project documentation
```

## 🏗️ Architecture

### Build System
- **PostCSS**: CSS processing with autoprefixer
- **Rollup**: JavaScript bundling and tree-shaking
- **ESLint**: Code quality and consistency
- **Prettier**: Code formatting

### Development Workflow
```bash
npm run dev      # Development server
npm run build    # Production build
npm run lint     # Code quality check
npm run format   # Code formatting
```

### File Organization
- **config/**: All build configuration centralized
- **src/**: Source code with modular architecture
- **public/**: Generated build files
- **web/**: Web deployment files
- **docs/**: Project documentation

This structure provides clear separation of concerns and maintains professional development standards.