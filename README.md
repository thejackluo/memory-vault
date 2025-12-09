# Memory Vault

A complete toolkit for ChatGPT conversation exports with two powerful tools:

1. **📖 Conversation Viewer** - Browse and read your conversations with a beautiful interface
2. **🧠 Memory Graph** - Transform conversations into an interactive knowledge graph

## Quick Navigation

- 🚀 **New here?** Start with [`QUICK_START.md`](QUICK_START.md) to get the Memory Graph running in 3 minutes
- 📖 **Conversation Viewer?** See [Getting Started](#getting-started) below for the classic viewer
- 🧠 **Memory Graph Details?** See [`MEMORY_GRAPH_README.md`](MEMORY_GRAPH_README.md) for complete documentation

---

## Overview

**Memory Vault** provides two complementary ways to explore your ChatGPT data:

### 🧠 Memory Graph (NEW in v3.0.0)
An interactive knowledge graph that extracts and visualizes entities from your conversations:
- Discover people, projects, knowledge, questions, thoughts, and patterns
- See connections and relationships between entities
- Timeline view showing how your interests evolved
- Backlinks like Obsidian/Logseq
- Fast search across all entities
- **➡️ [Quick Start Guide](QUICK_START.md)** | **[Full Documentation](MEMORY_GRAPH_README.md)**

### 📖 Conversation Viewer
A polished interface for reading your conversation history:
- Browse conversations chronologically
- Full-text search
- LaTeX and markdown rendering
- Media support (images, audio, video)
- Clean, modern design

## Features

- **🎨 Beautiful Interface**: Clean, modern design with a sidebar for easy navigation
- **🔍 Full-Text Search**: Quickly find conversations by keyword or phrase
- **📱 Responsive Design**: Works seamlessly on desktop and mobile devices
- **🖼️ Media Support**: Displays images, audio, and video from your conversations
- **📐 LaTeX Rendering**: Properly renders mathematical notation using KaTeX
- **💬 Markdown Support**: Full markdown rendering for formatted text
- **⚡ Optimized Performance**: Fast loading and smooth scrolling, even with thousands of conversations
- **🌓 Clean Typography**: Uses Inter and Fira Code fonts for excellent readability

## What's Included

### 🧠 Memory Graph System (v3.0.0)

**Main Application:**
- **`memory-graph.html`** - Interactive knowledge graph interface
- **`memory-graph.css`** - Modern styling for the graph system
- **`memory-graph-app.js`** - Application controller

**Core Components:**
- **`db-manager.js`** - IndexedDB storage for entities and relationships
- **`memory-processor.js`** - Intelligent entity extraction engine
- **`graph-renderer.js`** - High-performance Canvas visualization
- **`timeline-view.js`** - Timeline with swim lanes by entity type
- **`entity-panel.js`** - Detail panel with backlinks (Obsidian-style)
- **`search-engine.js`** - Fast full-text search with fuzzy matching
- **`processing-worker.js`** - Optional Web Worker for background processing

**Documentation:**
- **[`QUICK_START.md`](QUICK_START.md)** - Get started in 3 minutes
- **[`MEMORY_GRAPH_README.md`](MEMORY_GRAPH_README.md)** - Complete documentation

### 📖 Conversation Viewers

- **`index.html`** - Modern modular viewer with separate CSS/JS files (recommended)
- **`chat-optimized.html`** - The original all-in-one viewer
- **`chat-fast.html`** - Lightweight version for faster loading
- **`chat.html`** - Original viewer version
- **`test_latex_links.html`** - Testing interface for LaTeX and link rendering

**Modular Files (v2.0.0):**
- **`app.js`** - Application logic with modern ES6+ JavaScript (let/const, arrow functions, template literals)
- **`style.css`** - All styling and CSS rules for the viewer

### Data Files

Your ChatGPT export includes multiple JSON files:

- **`conversations.json`** - Your complete conversation history
- **`group_chats.json`** - Group conversation data
- **`shared_conversations.json`** - Conversations you've shared
- **`message_feedback.json`** - Feedback you've provided on messages
- **`user.json`** - Your user profile information
- **`shopping.json`** - Shopping-related conversations and data
- **`assets.json`** - Mapping of media asset IDs to file paths

**Viewer Documentation:**
- **`ASSETS_README.md`** - Detailed guide on handling images, audio, and video files
- **`README.md`** - This file (viewer documentation)

## Which Tool Should I Use?

### Use Memory Graph When You Want To:
- 🔍 **Discover patterns** and connections across conversations
- 👥 **See all people** you've mentioned in one place
- 🚀 **Track projects** you've worked on over time
- 💡 **Review what you've learned** in a knowledge base
- 📅 **Visualize timeline** of your conversation topics
- 🔗 **Navigate relationships** between entities (like Obsidian)
- ⚡ **Search entities** across all conversations instantly

### Use Conversation Viewer When You Want To:
- 📖 **Read full conversations** from start to finish
- 🔍 **Search specific phrases** within conversation text
- 📐 **View math formulas** with proper LaTeX rendering
- 🖼️ **See images/media** embedded in conversations
- 📱 **Browse chronologically** through conversation history
- 💬 **Export or copy** specific conversation threads

**💡 Pro Tip:** Use both! Start with Memory Graph to discover interesting entities, then use the Conversation Viewer to read the full conversations in detail.

## Getting Started

### 1. Export Your ChatGPT Data

1. Go to [ChatGPT Settings](https://chat.openai.com/settings)
2. Navigate to **Data Controls** → **Export Data**
3. Wait for the export email (can take up to 24 hours)
4. Download and extract the ZIP file

### 2. Set Up the Viewer

1. Copy the extracted files to this directory:
   - All JSON files (`conversations.json`, `assets.json`, etc.)
   - All media files (images, audio, video)
   - Maintain the original directory structure for media files

2. Open `index.html` (or `chat-optimized.html`) in your web browser

3. Browse your conversations!

### 3. Media Files (Optional)

If your conversations include images, audio, or video:

- Ensure all media files are in the same directory as the HTML viewer
- Check `ASSETS_README.md` for detailed setup instructions
- The viewer will automatically load assets based on `assets.json`

## Usage Tips

### Navigation

- **Sidebar**: Click any conversation title to view it
- **Search**: Use the search bar to filter conversations
- **Scroll**: Conversations are loaded efficiently for smooth scrolling

### Viewing Content

- **Code Blocks**: Syntax highlighting for code snippets
- **LaTeX**: Mathematical notation renders automatically
- **Links**: Clickable URLs and references
- **Media**: Images, audio, and video display inline

### Performance

- The modular viewer (`index.html`) separates concerns for better browser caching
- Handles thousands of conversations efficiently with on-demand loading
- Large conversations are virtualized for smooth scrolling
- Media files are loaded on-demand to reduce initial load time
- Modern JavaScript optimizations improve execution speed

## Repository Structure

```
memory-vault/
├── README.md                      # This file (main documentation)
├── QUICK_START.md                # 3-minute quick start for Memory Graph
├── MEMORY_GRAPH_README.md        # Complete Memory Graph documentation
├── ASSETS_README.md              # Media handling guide
│
├── Memory Graph System (v3.0.0)
│   ├── memory-graph.html         # Main graph application
│   ├── memory-graph.css          # Graph styling
│   ├── memory-graph-app.js       # Application controller
│   ├── db-manager.js             # IndexedDB storage
│   ├── memory-processor.js       # Entity extraction
│   ├── graph-renderer.js         # Canvas visualization
│   ├── timeline-view.js          # Timeline component
│   ├── entity-panel.js           # Detail panel
│   ├── search-engine.js          # Search engine
│   └── processing-worker.js      # Web Worker (optional)
│
├── Conversation Viewer (v2.0.0)
│   ├── index.html                # Modern modular viewer (recommended)
│   ├── app.js                    # Application logic (ES6+)
│   ├── style.css                 # Viewer styles
│   ├── chat-optimized.html       # All-in-one viewer (legacy)
│   ├── chat-fast.html            # Lightweight viewer
│   ├── chat.html                 # Original viewer
│   └── test_latex_links.html     # Testing interface
│
└── Your Data Files (from ChatGPT export)
    ├── conversations.json        # Your conversation history
    ├── assets.json               # Media asset mappings
    ├── group_chats.json          # Group conversations
    ├── shared_conversations.json # Shared conversations
    ├── message_feedback.json     # Message feedback data
    ├── shopping.json             # Shopping data
    ├── user.json                 # User profile
    └── [media files]             # Images, audio, video (if any)
```

## Privacy & Security

⚠️ **Important**: Your ChatGPT conversations may contain sensitive or personal information.

- This viewer runs **entirely locally** in your browser
- No data is sent to any server
- Keep this repository private if it contains personal conversations
- Be cautious about committing conversation data to version control
- The `.gitignore` is configured to exclude data files by default

## Technical Details

### Technologies Used

- **HTML5** - Semantic markup
- **CSS3** - Modern styling with flexbox/grid
- **JavaScript (ES6+)** - Modern vanilla JS with let/const, arrow functions, template literals, async/await
- **Marked.js** - Markdown parsing and rendering
- **KaTeX** - LaTeX mathematical notation rendering
- **Inter Font** - Clean, readable typography
- **Fira Code** - Monospace font for code blocks

### Code Quality

- **Modern JavaScript**: Uses ES6+ features including:
  - `const` and `let` instead of `var`
  - Arrow functions for cleaner syntax
  - Template literals for string interpolation
  - Async/await for asynchronous operations
  - Destructuring and spread operators
- **Modular Architecture**: Separate HTML, CSS, and JavaScript files for better maintainability
- **Clean Code**: No inline styles or scripts in HTML (except legacy viewers)

### Browser Compatibility

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Any modern browser with ES6 support

## Troubleshooting

### Images Not Loading

1. Check that media files are in the correct directory
2. Verify filenames match those in `assets.json`
3. See `ASSETS_README.md` for detailed troubleshooting

### Conversations Not Appearing

1. Ensure `conversations.json` is in the same directory as the HTML file
2. Check browser console (F12) for error messages
3. Verify the JSON file is valid and not corrupted

### Performance Issues

1. Use `chat-optimized.html` for best performance
2. Try `chat-fast.html` for even faster loading
3. Close other browser tabs to free up memory
4. Consider splitting very large conversation files

## Contributing

This is a personal archive viewer, but improvements are welcome:

- Bug fixes
- Performance optimizations
- UI/UX enhancements
- Additional viewer features

## License

This repository contains:
- HTML viewers and tools (open for use)
- Personal ChatGPT conversation data (private)

Use the HTML viewers freely for your own ChatGPT exports. Your conversation data remains your property.

## Credits

Created to make ChatGPT conversation exports more accessible and enjoyable to explore.

---

**Note**: Remember to keep your `.gitignore` configured to prevent accidentally committing private conversation data to public repositories.

