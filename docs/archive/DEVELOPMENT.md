# Premium Gift Box - Development Guide

## **🚀 Two Development Workflows Available**

### **Option 1: Live Server (Rapid Development)**
**Best for:** Quick CSS/HTML changes, immediate feedback
```bash
# Use Live Server extension in VS Code
# Serves from root directory (index.html)
# Auto-reloads on file changes
```
**Serves:** Raw source files with individual CSS imports
**URL:** `http://127.0.0.1:5500/`
**Features:** ✅ Live reload, ✅ No build step, ✅ Direct file editing

### **Option 2: NPM Development Server (Production-like)**
**Best for:** Testing production build, module development
```bash
npm run dev
# Builds and serves compiled assets
```
**Serves:** Compiled CSS/JS (production-ready)
**URL:** `http://127.0.0.1:3000/`
**Features:** ✅ Compiled assets, ✅ Production testing, ✅ Build optimization

### **Option 3: NPM Watch Mode (Best of Both)**
**Best for:** Active development with auto-compilation
```bash
npm run dev:watch
# Builds once, then watches for changes
```
**Features:** ✅ Auto-rebuild on changes, ✅ Compiled assets, ✅ Live development

---

## **📁 File Structure**

```
D:\Cardose/
├── index.html                 # 🎯 Main production file
├── src/                       # 📝 Source files (development)
│   ├── css/
│   │   ├── main.css          # CSS entry point
│   │   ├── variables.css     # Design system
│   │   ├── base.css          # Reset & typography
│   │   └── components/       # Component styles
│   └── js/
│       ├── main.js           # JS entry point
│       ├── config.js         # App configuration
│       └── modules/          # Feature modules
├── public/                   # 📦 Compiled files (production)
│   ├── styles.css           # Compiled CSS
│   ├── script.js            # Bundled JavaScript
│   └── assets/              # Optimized assets
├── config/                  # ⚙️ Build configurations
│   ├── postcss.config.cjs
│   └── rollup.config.js
└── web/                     # 🌐 PWA files
    ├── manifest.json
    └── sw.js
```

---

## **🔧 Available Commands**

### **Development**
```bash
npm run dev          # Build + serve (production-like)
npm run dev:watch    # Build + watch + serve (auto-rebuild)
npm run serve        # Serve only (assumes already built)
```

### **Building**
```bash
npm run build        # Full production build
npm run build:css    # CSS only
npm run build:js     # JavaScript only
npm run optimize     # Minify assets
```

### **Watching**
```bash
npm run watch        # Watch CSS + JS changes
npm run watch:css    # Watch CSS only
npm run watch:js     # Watch JS only
```

### **Quality**
```bash
npm run lint         # Check code quality
npm run lint:fix     # Fix linting issues
npm run format       # Format code
npm run clean        # Clean build files
```

---

## **🎨 Styling Architecture**

### **CSS Custom Properties (Design System)**
```css
/* Located in: src/css/variables.css */
--gold-primary: #f1d886;      /* Brand gold */
--brown-darkest: #1e0d04;     /* Primary text */
--bg-primary: #ffffff;        /* Background */
```

### **Component Organization**
- `variables.css` - Design tokens
- `base.css` - Reset & typography
- `components/buttons.css` - Button variants
- `components/header.css` - Navigation
- `components/hero.css` - Hero slideshow
- `components/cards.css` - Card layouts

---

## **⚡ JavaScript Modules**

### **Module Responsibilities**
- `main.js` - Application entry point
- `config.js` - Configuration & device detection
- `slideshow.js` - Hero carousel functionality
- `navigation.js` - Header navigation & smooth scrolling
- `psychology.js` - Conversion optimization (popups, notifications)
- `security.js` - Input validation & sanitization
- `forms.js` - Contact form handling

### **All Features Included**
✅ Social proof notifications ("Pak Budi..." popups)
✅ Urgency bars ("Only 3 slots left")
✅ Exit intent popups
✅ Mobile-responsive navigation
✅ Hero slideshow with touch support
✅ Form validation with WhatsApp integration

---

## **🚨 Important Notes**

### **For Live Server Users:**
- Uses individual CSS files loaded directly
- ES6 modules work natively
- Perfect for rapid prototyping

### **For NPM Development:**
- Uses compiled, bundled assets
- Production-like environment
- Better for testing final build

### **Both Versions Are Identical In:**
- ✅ Visual appearance
- ✅ Functionality
- ✅ Performance
- ✅ Mobile responsiveness

---

## **🔧 Troubleshooting**

### **If npm dev doesn't work:**
```bash
npm run clean
npm run build
npm run serve
```

### **If Live Server has issues:**
- Make sure VS Code Live Server extension is installed
- Check that it's serving from the root directory
- Refresh browser cache (Ctrl+F5)

### **For development workflow questions:**
- Live Server = Raw files, faster iteration
- NPM = Compiled files, production testing
- Both work identically for end users

---

## **📞 Contact & Support**

Built for **Premium Gift Box** - Luxury Handcrafted Packaging Solutions
📍 Sukoharjo, Indonesia
📱 WhatsApp: +62 821-4848-9595

Development completed with security-first approach and cross-platform optimization.