# Premium Gift Box - Project Structure

## Current Clean Structure

```
D:\Cardose\
├── src/                    # Source code (development)
│   ├── css/               # CSS source files
│   ├── js/                # JavaScript modules
│   └── assets/            # Raw assets
│
├── public/                 # Built/compiled files
│   ├── styles.css         # Compiled CSS
│   ├── script.js          # Bundled JavaScript
│   └── assets/            # Optimized assets
│
├── web/                    # Production-ready website
│   ├── index.html         # Main HTML
│   ├── manifest.json      # PWA manifest
│   ├── sw.js              # Service worker
│   └── public/            # Copy of public folder
│
├── config/                 # Build configurations
│   ├── postcss.config.cjs
│   └── rollup.config.js
│
├── docs/                   # Documentation
├── build/                  # Build scripts
├── tools/                  # Development tools
│
├── package.json           # Dependencies
├── package-lock.json      # Lock file
└── index.html             # Development HTML
```

## Files We Should Keep:
1. ✅ `/src` - Source code
2. ✅ `/public` - Built files
3. ✅ `/web` - Production website
4. ✅ `/config` - Build configs
5. ✅ `package.json` & `package-lock.json`
6. ✅ Documentation files (.md)

## Files We Removed:
1. ❌ `live_exact.html` - Test file
2. ❌ `npm_exact.html` - Test file
3. ❌ `port_3000.html` - Test file
4. ❌ `live_server.html` - Test file
5. ❌ Folders with bash commands as names
6. ❌ `nul` files - Windows null device artifacts

## How to Run:
- **Development**: `npm run dev` (serves from /web)
- **Build**: `npm run build`
- **Production**: Deploy /web folder contents