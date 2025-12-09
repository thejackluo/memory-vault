# Batch Processing & Conversation Tracking Guide

## Overview

Memory Vault now includes powerful batch processing capabilities and comprehensive conversation tracking. You can process conversations in flexible ways and see exactly which conversations have been parsed.

## New Features

### 1. **Flexible Processing Modes**

#### Incremental Mode (Default)
- Continues from where you left off
- Processes the next N conversations
- Perfect for gradually building your memory graph

**Example:**
- First run: Process conversations 0-500
- Second run: Process conversations 500-1000
- Third run: Process conversations 1000-1500

#### Custom Range Mode
- Process any specific range of conversations
- Useful for reprocessing specific sections
- Great for testing or focused analysis

**Example:**
- Process conversations 100-200
- Process conversations 5000-6000
- Process conversations 0-10000

### 2. **Processing History Tracking**

Every processing operation is now logged with:
- Start and end indices
- Number of conversations processed
- Number of entities discovered
- Timestamp of operation

View your complete processing history from:
- Welcome screen → "View Processing History" button
- Main app → History icon (📜) in top bar

### 3. **Conversation Status Visualization**

See at a glance:
- Which conversations have been processed ✅
- Which conversations remain unprocessed ⬜
- Visual timeline showing processing progress
- Exact counts and percentages

### 4. **Processing Statistics**

Track important metrics:
- Last index processed
- Total conversations processed
- Remaining conversations
- Percent complete
- Number of processing operations

## How to Use

### Initial Processing

1. **Open `memory-graph.html` in your browser**

2. **Choose your processing mode:**
   - **Incremental**: Process the next 500 (or custom amount)
   - **Custom Range**: Process a specific range (e.g., 0-1000)

3. **Click "Process Conversations"**

4. **Wait for processing to complete**
   - Progress bar shows real-time status
   - See conversations processed and entities found

### Continuing Processing

After your first processing run:

1. **Return to the welcome screen**
   - The app shows your current progress
   - See how many conversations remain

2. **Process more conversations:**
   - Incremental mode automatically continues from where you left off
   - Or use range mode for specific sections

3. **View processing history:**
   - Click "View Processing History" to see all past operations
   - Visual timeline shows which conversations are processed

### Custom Range Processing

To process specific conversation ranges:

1. **Select "Custom Range" mode**

2. **Enter start and end indices:**
   - Start: 0-based index (first conversation = 0)
   - End: Exclusive index (end = 100 means up to conversation 99)

3. **Examples:**
   ```
   Range 0-500:     First 500 conversations
   Range 500-1000:  Conversations 500-999
   Range 2000-2500: Conversations 2000-2499
   ```

4. **Click "Process Conversations"**

### Viewing Processing History

From the **Welcome Screen** or **Main App**:

1. **Click "View Processing History"** or the history icon (📜)

2. **See comprehensive statistics:**
   - Total processed conversations
   - Remaining conversations
   - Percent complete

3. **View visual timeline:**
   - Green blocks = Processed conversations
   - Gray blocks = Unprocessed conversations
   - Hover over blocks for details

4. **Review processing log:**
   - Chronological list of all processing operations
   - See when each batch was processed
   - View entities found in each batch

## Use Cases

### Scenario 1: Testing First
```
1. Process 100 conversations to test
2. Review the memory graph
3. Adjust settings if needed
4. Process more conversations
```

### Scenario 2: Batch Processing Large Collections
```
1. Process 500 conversations at a time
2. After each batch, review new entities
3. Continue until all conversations processed
```

### Scenario 3: Reprocessing Specific Periods
```
1. Check processing history to identify date ranges
2. Use custom range to reprocess specific conversations
3. For example: reprocess 2023 conversations (indices 5000-8000)
```

### Scenario 4: Incremental Daily Updates
```
1. Export new ChatGPT conversations weekly
2. Use incremental mode to process only new conversations
3. Your memory graph grows automatically
```

## Processing Best Practices

### Start Small
- Process 100-500 conversations first
- Review the results
- Adjust minimum occurrence settings if needed

### Process in Chunks
- Don't try to process 10,000 conversations at once
- 500-1000 conversations per batch is optimal
- Allows you to review progress and results

### Use Custom Ranges for Reprocessing
- If you change settings (like minimum occurrences)
- Reprocess specific ranges instead of starting over
- More efficient than reprocessing everything

### Monitor Processing History
- Regularly check the processing history
- Identify gaps in processing
- Track when different sections were processed

## Technical Details

### Database Storage

The system now tracks:

1. **Processing History**
   - All processing operations logged
   - Includes timestamps, ranges, and results

2. **Conversation Status**
   - Each processed conversation marked in database
   - Tracks when it was last processed
   - Stores conversation index

3. **Progress Metadata**
   - `processedUpToIndex`: Last sequential index processed
   - `lastProcessedTime`: Timestamp of last processing
   - `minOccurrences`: Entity filtering threshold

### Performance

Processing speed depends on:
- Number of conversations
- Conversation length
- Entity extraction complexity
- Your computer's performance

**Typical speeds:**
- 500 conversations: 5-10 seconds
- 1000 conversations: 10-20 seconds
- 5000 conversations: 50-100 seconds

### Data Persistence

All progress is saved to IndexedDB:
- Survives browser refreshes
- Persists across sessions
- Can be exported/imported

## Troubleshooting

### "All conversations already processed"
**Solution:** Your database has reached the end of the file. Options:
1. Use custom range to reprocess specific conversations
2. Reset and start over (Settings → Reset & Start From Conversation 1)
3. Process new conversations after exporting more from ChatGPT

### Processing seems stuck
**Solution:** 
1. Check browser console (F12) for errors
2. Ensure conversations.json is properly formatted
3. Try processing a smaller batch first

### Want to start fresh
**Solution:**
1. Go to Settings
2. Click "Reset & Start From Conversation 1"
3. Confirm the action
4. All data will be cleared and you can start over

### Processed wrong range
**Solution:**
1. Processing is additive - conversations won't be duplicated
2. To redo with different settings, reset and reprocess
3. Or continue processing additional conversations

## Example Workflows

### Workflow 1: First-Time User
```
Day 1:
- Process conversations 0-500
- Explore the graph
- Review entities found

Day 2:
- Process conversations 500-1500
- See how graph grows
- Adjust settings if needed

Week 2:
- Continue processing in 1000-conversation batches
- Until all conversations processed
```

### Workflow 2: Power User
```
Initial:
- Process all conversations in 2000-conversation batches
- Takes 30-60 minutes for 20,000 conversations

Weekly:
- Export new ChatGPT conversations
- Use incremental mode to process only new ones
- Takes 1-2 minutes per week
```

### Workflow 3: Selective Processing
```
Goal: Focus on specific time periods

1. Check conversation timestamps
2. Identify index ranges for target periods
3. Use custom range to process:
   - 2022: conversations 0-5000
   - 2023: conversations 5001-15000
   - 2024: conversations 15001-25000
4. Compare entities across different periods
```

## FAQ

**Q: Can I process the same conversation twice?**
A: The system tracks processed conversations to avoid duplicates. However, using custom ranges may reprocess conversations with updated settings.

**Q: What happens if I close the browser during processing?**
A: Progress is saved incrementally. The system will continue from the last completed batch.

**Q: Can I process conversations in any order?**
A: Yes, with custom range mode. However, incremental mode processes sequentially for consistency.

**Q: How do I know which conversations haven't been processed?**
A: Use the "View Processing History" feature to see the visual timeline and identify gaps.

**Q: Does processing take up a lot of storage?**
A: IndexedDB storage is efficient. Expect ~5-10MB per 1000 conversations processed, mostly from entity data.

**Q: Can I export my processing history?**
A: Yes, use "Export Memory Graph" in settings. It includes all processing history and metadata.

## Summary

The new batch processing system gives you:
- ✅ Complete control over what gets processed
- ✅ Full visibility into processing status
- ✅ Efficient incremental updates
- ✅ Flexible custom range processing
- ✅ Comprehensive tracking and history

Process your conversations your way, at your pace!

