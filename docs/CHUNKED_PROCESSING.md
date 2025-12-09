# Chunked Processing Guide

## How It Works

The Memory Graph system now supports **manual chunked processing** - you control exactly how many conversations to process at a time.

### Why Chunked Processing?

1. **Test with small batches** - Start with 500 conversations to test
2. **Avoid hot-reload issues** - Process in chunks so reloads don't lose progress
3. **Build incrementally** - Each chunk adds to the existing graph
4. **Resume anytime** - Pick up exactly where you left off

---

## Step-by-Step Guide

### First Time: Process First 500

1. Open `memory-graph.html`
2. Set "Number of conversations to process": **500**
3. Click "Process Conversations"
4. Wait ~5-10 seconds
5. **Result**: Conversations 1-500 are now in your graph

### Continue: Process Next 500

6. Click Settings (⚙️) → "Continue Processing More Conversations"
7. Set number: **500** (or any amount)
8. Click "Process Conversations"
9. **Result**: Conversations 501-1000 are now added to your graph

### Keep Going: Process All Remaining

10. Repeat step 6-8 until all conversations processed
11. Welcome screen shows: "All Processed!"

---

## How the Progress Tracking Works

### Behind the Scenes

```
IndexedDB stores: processedUpToIndex

First run:  processedUpToIndex = 0
Process 500: → processes 1-500 → sets processedUpToIndex = 500
Process 500: → processes 501-1000 → sets processedUpToIndex = 1000
Process 500: → processes 1001-1500 → sets processedUpToIndex = 1500
...and so on
```

### What You See

**Welcome Screen:**
```
Progress: 500 of 5,340 processed
Remaining: 4,840 conversations
[Continue Processing] button
```

**Processing Screen:**
```
Processing conversations 501 to 1,000...
Progress: 45%
Entities Found: 1,234
```

**After Processing:**
```
Complete! 4,340 conversations remaining.
```

---

## Usage Patterns

### Pattern 1: Test First, Then Scale
```
1. Process 100 conversations (test)
2. Check graph looks good
3. Process 500 more
4. Process 1,000 more
5. Process all remaining
```

### Pattern 2: Daily Incremental
```
Day 1: Process 500
Day 2: Process 500 more
Day 3: Process 500 more
...continue until done
```

### Pattern 3: Variable Chunks
```
1. Process 500 (initial test)
2. Process 2,000 (good, go bigger)
3. Process 2,840 (finish remaining)
```

---

## Important Notes

### ✅ What Happens

- **Entities are merged**: If "John Smith" appears in conversations 1-500 AND 501-1000, it's treated as the same entity
- **Links are preserved**: Relationships from previous chunks remain
- **Timeline is continuous**: Shows activity across all processed conversations
- **Search includes all**: Search works across all processed data

### ❌ What Doesn't Happen

- **No reprocessing**: Previously processed conversations are NOT reprocessed
- **No data loss**: Hot reload won't lose your progress (data is in IndexedDB)
- **No duplicates**: Same entities are merged across chunks

### 🔄 If Something Goes Wrong

**Reset Everything:**
1. Settings → "Reset & Start From Conversation 1"
2. Confirms you want to delete all data
3. Starts fresh from conversation 1

**Clear All Data:**
1. Settings → "Clear All Data"
2. Deletes everything from IndexedDB
3. Welcome screen reappears

---

## Example: Processing 5,340 Conversations

### Scenario: Process in chunks of 500

```
Chunk 1: 1-500     → 5-10 sec  → Total entities: ~400
Chunk 2: 501-1000  → 5-10 sec  → Total entities: ~750
Chunk 3: 1001-1500 → 5-10 sec  → Total entities: ~1,100
Chunk 4: 1501-2000 → 5-10 sec  → Total entities: ~1,450
...
Chunk 11: 5001-5340 → 3-7 sec  → Total entities: ~2,800

Total time: ~60-70 seconds (spread across multiple sessions)
Total entities: ~2,800 (dense, meaningful entities)
```

### Scenario: Process in chunks of 1,000

```
Chunk 1: 1-1000    → 10-15 sec → Total entities: ~750
Chunk 2: 1001-2000 → 10-15 sec → Total entities: ~1,450
Chunk 3: 2001-3000 → 10-15 sec → Total entities: ~2,100
Chunk 4: 3001-4000 → 10-15 sec → Total entities: ~2,500
Chunk 5: 4001-5000 → 10-15 sec → Total entities: ~2,700
Chunk 6: 5001-5340 → 3-7 sec   → Total entities: ~2,800

Total time: ~60-70 seconds (spread across 6 sessions)
```

---

## Under the Hood

### Database Schema

```javascript
IndexedDB stores:
- processedUpToIndex: 1500      // Next: process from 1501
- lastProcessedTime: 1702345678 // Timestamp
- minOccurrences: 2             // Entity filtering threshold

entities: [
  { id: "person_john_smith_...", occurrences: 5, ... },
  { id: "project_memory_graph_...", occurrences: 12, ... },
  ...
]

conversations: [
  { id: "conv_123", entities: ["person_...", "project_..."], ... },
  ...
]
```

### Processing Flow

```
User sets: 500 conversations
App loads: processedUpToIndex = 0
App slices: conversations[0:500]
Processor: Process each conversation
  → Extract entities
  → Check for existing entities (fuzzy match)
  → Merge if found, create if new
  → Build relationships
Save to IndexedDB
Update: processedUpToIndex = 500
Done!
```

---

## FAQs

**Q: What if I close the browser mid-processing?**  
A: The chunk being processed may be incomplete. Just run again - it will pick up from the last completed chunk.

**Q: Can I change the chunk size?**  
A: Yes! Enter any number. Common values: 100 (testing), 500 (safe), 1000 (faster), 5000 (all at once).

**Q: Does it use more disk space?**  
A: No. Each chunk adds to the same database. Total size depends on entities found, not chunks used.

**Q: Can I process chunks out of order?**  
A: No. It always processes sequentially: 1-500, then 501-1000, etc. This ensures consistency.

**Q: What if I want to reprocess a specific range?**  
A: Not currently supported. Use "Reset & Start From Conversation 1" to start over.

**Q: How do I know which conversations are processed?**  
A: The welcome screen shows "Progress: X of Y processed". The next click processes from X+1.

---

## Tips

### 🎯 For Development
- Use 100-500 conversations while testing
- Hot reload won't lose progress
- Easy to reset and try again

### ⚡ For Production Use
- Start with 500 to verify everything works
- Then increase to 1,000 or 2,000 per chunk
- Or just set to total conversations and process all at once

### 🔍 For Testing Entity Extraction
- Process 100 conversations
- Check quality of extracted entities
- Adjust `minOccurrences` in settings if needed
- Reset and reprocess with new settings

---

**Happy chunked processing! 🚀**

