# Memory Graph Quick Start

Get your interactive knowledge graph up and running in 3 minutes!

## What You'll Get

Transform your ChatGPT conversations into a beautiful, interactive graph showing:
- **👥 People** you've discussed
- **🚀 Projects** you're working on
- **💡 Knowledge** you've learned
- **❓ Questions** you've asked
- **💭 Thoughts** and ideas
- **🔗 Connections** between everything

## Prerequisites

✅ Modern web browser (Chrome, Firefox, Safari, Edge)  
✅ Your `conversations.json` file from ChatGPT export

> **Don't have your data?** Go to [ChatGPT Settings](https://chat.openai.com/settings) → Data Controls → Export Data

## Installation (30 seconds)

### Option 1: Simple (Just Drop Files)
1. Put `conversations.json` in the same folder as `memory-graph.html`
2. Double-click `memory-graph.html`
3. Done! 🎉

### Option 2: With Local Server (Recommended)
```bash
# In the project folder
python -m http.server 8000

# Then open: http://localhost:8000/memory-graph.html
```

## First Run - Chunked Processing (NEW!)

**You control how many conversations to process at a time!**

1. **Welcome Screen**: Beautiful intro with 6 feature cards
2. **Set Amount**: Enter how many conversations to process (e.g., 500)
3. **Click "Process Conversations"**: Starts processing that chunk
4. **Watch Progress**: Live stats show which conversations are being processed
5. **Graph Appears**: Your memory graph loads with smooth animation

> 💡 **Recommended**: Start with 500 conversations to test (~5-10 seconds)

### Continue Processing More

6. Want more? Settings → "Continue Processing More Conversations"
7. Set amount again (e.g., 500)
8. Processes the NEXT 500 (builds on existing graph!)
9. Repeat until all conversations processed

> ⏱️ Each 500 conversations: ~5-10 seconds  
> Full 5,000 conversations: ~60 seconds total (can spread across multiple sessions)

### Benefits of Chunked Processing

✅ **No hot-reload issues** - Progress saved after each chunk  
✅ **Test first** - Try 100-500 conversations before committing  
✅ **Resume anytime** - Pick up exactly where you left off  
✅ **Build incrementally** - Each chunk adds to the existing graph  

> 📖 **See**: [Chunked Processing Guide](CHUNKED_PROCESSING.md) for detailed examples

## Subsequent Visits (Instant!)

**Good news**: Data persists between sessions!

- Data saved in your browser (IndexedDB)
- Welcome screen shows progress (e.g., "500 of 5,340 processed")
- Button changes to "Continue Processing"
- Only processes remaining conversations

## Using Your Memory Graph

### 🔍 Search for Anything
- Type in the top search bar
- Get instant suggestions
- Click to jump to any entity

### 🎯 Click on Nodes
- Click any bubble (node) in the graph
- See full details in the right panel
- Navigate to related entities
- Jump to source conversations

### 📅 View Timeline
- Click the 📅 button (top right)
- Scroll through time
- Click dates to filter
- Drag to select date ranges

### 🎨 Filter by Type
- Use checkboxes in left sidebar
- Toggle entity types on/off
- Mix and match to focus

### 🧭 Navigate the Graph
- **Pan**: Click and drag background
- **Zoom**: Scroll wheel
- **Focus**: Click a node
- **Reset**: Click 🔄 button

## Pro Tips

### 🚀 Performance
- **Adjust Entity Density**: Settings → Minimum occurrences (default: 2)
  - Higher = denser graph with frequently-mentioned entities only
  - Lower = includes more entities (may be sparse)
- Hide unused entity types to improve speed
- Use search instead of scrolling for large graphs
- Export your data periodically as backup

### 🔄 Incremental Processing
- **First Run**: Processes all conversations (~30-40 sec)
- **Subsequent Runs**: Instant load from saved data
- **Adding New**: Only processes new conversations
- **Settings → Process New Conversations**: Update with new data

### 🎯 Discovery
- Start with "People" to see your network
- Check "Projects" to track your work
- Browse "Knowledge" to see what you've learned
- Explore "Thoughts" for your ideas

### 🔗 Connections
- Click on any entity to see its connections
- Use backlinks to trace references
- Follow the relationship graph
- Timeline shows when connections formed

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + F` | Focus search |
| `Escape` | Close panels |
| `Scroll` | Zoom in/out |

## Common Questions

### "Processing is taking forever!"
- Should take 30-40 seconds for 5,000 conversations
- If much slower, check browser console for errors
- Close other tabs to free up memory
- **New in v3.1**: 5x faster than before!

### "Do I need to reprocess every time?"
- No! Processing is done once and saved
- Data persists in IndexedDB (browser storage)
- Next visit: Instant load
- Only processes new conversations if you add more

### "How do I add new conversations?"
1. Export new data from ChatGPT
2. Replace `conversations.json` with updated file
3. Click "Resume / Add New Conversations"
4. Only new conversations will be processed (very fast!)

### "I found a duplicate entity"
- Entity merging UI is planned for future version
- For now, they'll appear as separate nodes

### "Can I edit entities?"
- Manual editing coming in future version
- You can export and manually edit the JSON

### "Where is my data stored?"
- In your browser's IndexedDB (local only)
- No data sent to any server
- Survives browser restarts
- Clearing browser data will delete it

### "How accurate is entity extraction?"
- ~80% accuracy with rule-based approach
- Some false positives/negatives expected
- LLM-based extraction planned for higher accuracy

## Export Your Graph

1. Click ⚙️ (Settings) button
2. Click "Export Memory Graph"
3. Save the JSON file as backup

You can share this file with others or reimport it later!

## File Checklist

Make sure you have all these files in the same directory:

```
✅ conversations.json          (your ChatGPT export)
✅ memory-graph.html           (main app)
✅ memory-graph.css            (styling)
✅ memory-graph-app.js         (app logic)
✅ db-manager.js               (database)
✅ memory-processor.js         (entity extraction)
✅ graph-renderer.js           (visualization)
✅ timeline-view.js            (timeline)
✅ entity-panel.js             (detail panel)
✅ search-engine.js            (search)
✅ processing-worker.js        (optional, for Web Workers)
```

## Troubleshooting

### Error: "Failed to load conversations.json"
**Fix**: Make sure `conversations.json` is in the same folder as `memory-graph.html`

### Error: "Browser not supported"
**Fix**: Use a modern browser (Chrome 90+, Firefox 88+, Safari 14+)

### Graph is laggy with many nodes
**Fix**: 
- Use filters to hide entity types
- Search for specific entities
- Close other browser tabs

### Data disappeared after refresh
**Fix**: 
- IndexedDB data persists normally
- Check if you cleared browser data
- Export your graph regularly as backup

## Next Steps

Once you're familiar with the basics:

1. **Explore Timeline**: See how your interests evolved
2. **Find Patterns**: Look for recurring themes
3. **Track Projects**: Monitor what you're working on
4. **Discover Connections**: See how ideas relate
5. **Export Stats**: Check the 📊 button for insights

## Need More Help?

📖 Full documentation: See `MEMORY_GRAPH_README.md`  
💬 Technical details: See `.cursor-changes`  
🐛 Issues: Check the troubleshooting section above

---

**Ready?** Open `memory-graph.html` and start exploring! 🚀

---

*Made with ❤️ to help you explore your knowledge*

