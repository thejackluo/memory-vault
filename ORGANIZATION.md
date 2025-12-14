# Memory Vault - Organized Repository Structure

## Overview
The repository has been reorganized for better clarity and maintainability. All files are now categorized into logical folders.

---

## 📁 Directory Structure

```
memory-vault/
│
├── 🌐 Main Applications (Root)
│   ├── memory-graph.html          # Memory Graph app (main)
│   ├── index.html                 # Conversation Viewer (main)
│   └── chat-optimized.html        # All-in-one optimized viewer
│
├── 📜 js/                         # JavaScript Modules
│   ├── memory-graph-app.js        # Memory Graph application controller
│   ├── db-manager.js              # IndexedDB database management
│   ├── memory-processor.js        # Entity extraction & processing
│   ├── graph-renderer.js          # Canvas-based graph visualization
│   ├── timeline-view.js           # Timeline component
│   ├── entity-panel.js            # Entity detail panel
│   ├── search-engine.js           # Search functionality
│   ├── processing-worker.js       # Web Worker for background processing
│   └── app.js                     # Conversation viewer logic
│
├── 🎨 css/                        # Stylesheets
│   ├── memory-graph.css           # Memory Graph styles
│   └── style.css                  # Conversation Viewer styles
│
├── 💾 data/                       # Your ChatGPT Export Data
│   ├── conversations.json         # Your conversation history
│   ├── assets.json                # Media file mappings
│   ├── group_chats.json           # Group conversations
│   ├── shared_conversations.json  # Shared conversations
│   ├── message_feedback.json      # Message feedback data
│   ├── shopping.json              # Shopping-related data
│   ├── user.json                  # User profile
│   └── [media files]/             # Images, audio, video (if any)
│
├── 📚 docs/                       # Documentation
│   ├── QUICK_START.md             # 3-minute quick start
│   ├── BATCH_PROCESSING_GUIDE.md  # Batch processing guide
│   ├── MEMORY_GRAPH_README.md     # Memory Graph documentation
│   ├── DEVELOPER_GUIDE.md         # Technical reference
│   ├── ASSETS_README.md           # Media handling guide
│   └── CHUNKED_PROCESSING.md      # Chunked processing info
│
├── 🧪 tests/                      # Test & Legacy Files
│   ├── test_latex_links.html      # LaTeX rendering tests
│   ├── chat-fast.html             # Lightweight viewer (legacy)
│   └── chat.html                  # Original viewer (legacy)
│
└── 📄 Documentation Files (Root)
    ├── README.md                  # Main project documentation
    ├── WHATS_NEW.md               # Latest features
    ├── FIXES_APPLIED.md           # Recent improvements
    └── ORGANIZATION.md            # This file
```

---

## 🎯 What Goes Where

### Root Directory
**Purpose:** Main application entry points and important documentation
- HTML files that users open directly
- README and documentation files
- Configuration files (.gitignore, etc.)

### js/
**Purpose:** All JavaScript code modules
- Application controllers
- Database management
- UI components
- Processing engines
- Utility functions

### css/
**Purpose:** All stylesheets
- Memory Graph styles
- Conversation Viewer styles
- Component-specific styles

### data/
**Purpose:** User's ChatGPT export data (gitignored)
- All JSON files from ChatGPT export
- Media files (images, audio, video)
- ⚠️ **Note:** These are your private data files - they're gitignored by default

### docs/
**Purpose:** Comprehensive documentation
- User guides
- Developer documentation
- Feature-specific guides
- API references

### tests/
**Purpose:** Test files and legacy viewers
- Testing utilities
- Older versions kept for reference
- Development test pages

---

## 🔗 File References Updated

All file paths have been updated throughout the codebase:

### HTML Files
- `memory-graph.html` → References `css/memory-graph.css` and `js/*.js`
- `index.html` → References `css/style.css` and `js/app.js`

### JavaScript Files
- `js/memory-graph-app.js` → References `data/conversations.json`
- `js/app.js` → References `data/conversations.json` and `data/assets.json`

### Documentation
- `README.md` → Updated with new structure
- All docs reference correct file paths

---

## 🚀 Getting Started

### For Users:
1. **Place your ChatGPT export files in the `data/` folder:**
   ```
   data/
   ├── conversations.json
   ├── assets.json
   └── [other JSON files]
   ```

2. **Open the application you want:**
   - **Memory Graph:** Open `memory-graph.html`
   - **Conversation Viewer:** Open `index.html`
   - **Optimized Viewer:** Open `chat-optimized.html`

3. **Everything just works!** The apps automatically load data from the `data/` folder.

### For Developers:
- **JavaScript modules:** See `js/` folder
- **Styles:** See `css/` folder
- **Documentation:** See `docs/` folder
- **Tests:** See `tests/` folder

---

## 📦 Benefits of This Organization

### ✅ Clarity
- Easy to find files by type
- Clear separation of concerns
- Logical folder names

### ✅ Maintainability
- JavaScript modules in one place
- Styles separated from logic
- Data isolated from code

### ✅ Scalability
- Easy to add new modules
- Simple to update styles
- Clear structure for new features

### ✅ Clean Root
- Only essential files in root
- No clutter
- Professional appearance

### ✅ Git-Friendly
- User data properly gitignored
- Code files properly tracked
- Clear what should be versioned

---

## 🔄 Migration Notes

**What Changed:**
- Moved 9 JavaScript files → `js/`
- Moved 2 CSS files → `css/`
- Moved 7 JSON files → `data/`
- Moved 3 test files → `tests/`
- Updated all file references in HTML and JS files
- Updated .gitignore for new structure

**What Stayed the Same:**
- Main HTML files remain in root (easy access)
- Documentation files in root (visibility)
- docs/ folder structure unchanged
- Functionality unchanged - everything works the same!

---

## 🎓 Best Practices

### Adding New Files

**New JavaScript Module:**
```
1. Create file in js/ folder
2. Reference it in HTML: <script src="js/your-module.js"></script>
3. Document in DEVELOPER_GUIDE.md
```

**New Stylesheet:**
```
1. Create file in css/ folder
2. Reference it in HTML: <link rel="stylesheet" href="css/your-style.css">
3. Follow existing naming conventions
```

**New Test File:**
```
1. Create file in tests/ folder
2. Add .gitignore entry if needed
3. Document purpose in filename or comments
```

### File Naming Conventions

**JavaScript:** `kebab-case.js` (e.g., `memory-graph-app.js`)
**CSS:** `kebab-case.css` (e.g., `memory-graph.css`)
**HTML:** `kebab-case.html` (e.g., `memory-graph.html`)
**Documentation:** `SCREAMING_SNAKE_CASE.md` (e.g., `README.md`)

---

## 🔧 Troubleshooting

### "Files not loading"
**Cause:** File path references might be incorrect
**Solution:** Check browser console (F12) for 404 errors, verify paths

### "conversations.json not found"
**Cause:** Data files not in `data/` folder
**Solution:** Move all ChatGPT export JSON files to `data/` folder

### "Styles not applying"
**Cause:** CSS file path incorrect
**Solution:** Verify CSS files are in `css/` and HTML references are correct

---

## 📝 Summary

**Old Structure (Messy):**
```
memory-vault/
├── app.js
├── db-manager.js
├── entity-panel.js
├── memory-graph-app.js
├── conversations.json
├── assets.json
├── style.css
├── memory-graph.css
└── [50+ mixed files in root]
```

**New Structure (Organized):**
```
memory-vault/
├── js/          # All JavaScript
├── css/         # All styles
├── data/        # All data
├── docs/        # All documentation
├── tests/       # All tests
└── [3 main HTML files + docs]
```

**Result:** Clean, professional, maintainable repository structure! 🎉

---

**Last Updated:** December 9, 2025  
**Version:** 3.2.0  
**Status:** ✅ Fully Organized




