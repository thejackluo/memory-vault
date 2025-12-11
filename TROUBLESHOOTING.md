# Graph Rendering Troubleshooting Guide

## Problem: Graph appears briefly then disappears

### Quick Fixes to Try

1. **Open Browser DevTools (F12)**
   - Look for console errors or warnings
   - Check for messages starting with "GraphRenderer"

2. **Test with Debug Tool**
   - Open `debug-graph.html` in your browser
   - Click "Test With Sample Data"
   - If this works, the renderer is fine - issue is with data loading

3. **Check Canvas Element**
   - Right-click on the graph area → Inspect Element
   - Find `<canvas id="graph-canvas">`
   - Verify it has `width` and `height` attributes set (not 0)

### Common Issues & Solutions

#### Issue 1: Canvas Has Zero Dimensions
**Symptoms:** Console shows "Canvas dimensions are invalid, using defaults"

**Solution:**
The canvas parent container might not have a size. Check CSS for `.center-area`:
```css
.center-area {
  flex: 1;
  position: relative;
  background: #fafbfc;
  overflow: hidden;
  /* Make sure parent has explicit height */
}
```

#### Issue 2: No Visible Nodes
**Symptoms:** Console shows "No visible nodes!"

**Causes:**
- All nodes filtered out by type filters
- Nodes positioned outside viewport
- Viewport scale too small or offset incorrect

**Solution:**
1. Check browser console for the detailed warning message
2. Look at the `sampleNode` coordinates - are they reasonable?
3. Try clicking "Reset View" button (🔄)
4. Ensure at least one entity type filter is checked

#### Issue 3: Animation Loop Not Running
**Symptoms:** Graph is static, doesn't respond to interaction

**Check:**
- Console should show "GraphRenderer.start() called"
- `isRunning` should be `true`

**Solution:**
Refresh the page. If still not working, check for JavaScript errors in console.

#### Issue 4: Entities Not Loading
**Symptoms:** Console shows "0 nodes" or "Data loaded: 0 nodes"

**Solution:**
1. Check if `data/conversations.json` exists
2. Verify processing completed successfully
3. Check browser console for database errors (IndexedDB)
4. Try clearing browser cache and reprocessing

### Debug Information to Collect

If the graph still doesn't work, collect this information:

1. **Browser Console Output**
   - Copy all messages related to "GraphRenderer"
   - Look for any errors (red text)

2. **Canvas Dimensions**
   ```javascript
   // Run in browser console:
   const canvas = document.getElementById('graph-canvas');
   console.log({
     canvasWidth: canvas.width,
     canvasHeight: canvas.height,
     displayWidth: canvas.clientWidth,
     displayHeight: canvas.clientHeight
   });
   ```

3. **Renderer State**
   ```javascript
   // Run in browser console:
   const app = window.memoryGraphApp;
   if (app && app.graphRenderer) {
     console.log({
       isRunning: app.graphRenderer.isRunning,
       nodes: app.graphRenderer.nodes.length,
       visibleNodes: app.graphRenderer.visibleNodes.length,
       alpha: app.graphRenderer.simulationAlpha
     });
   }
   ```

### Testing Sequence

1. **Test Basic Canvas**
   - Open `debug-graph.html`
   - Click "Test Basic Render"
   - Should see red square, blue circle, green square
   - ✅ If this works: Canvas rendering is OK

2. **Test Graph Renderer**
   - Click "Test With Sample Data"
   - Should see 5 nodes with connecting lines
   - Nodes should move/settle after a few seconds
   - ✅ If this works: Renderer is OK

3. **Test Full Application**
   - Open `memory-graph.html`
   - Process some conversations
   - Check if graph appears
   - ✅ If this works: Everything is OK!

### Still Not Working?

If you've tried all the above and it still doesn't work:

1. **Check Browser Compatibility**
   - Use latest Chrome, Firefox, or Edge
   - Safari may have issues with IndexedDB

2. **Check Data Size**
   - How many entities are being loaded?
   - Very large datasets (>10,000 nodes) may need optimization

3. **Provide Debug Info**
   - Browser version
   - Console output
   - Screenshot of DevTools Elements tab showing canvas
   - Output from the debug commands above

### Performance Tips

If the graph is slow or laggy:

1. **Reduce Entity Count**
   - In Settings, increase "Minimum occurrences" filter
   - This will show only frequently mentioned entities

2. **Process in Smaller Chunks**
   - Process 50-100 conversations at a time
   - This is faster than processing thousands at once

3. **Check Computer Resources**
   - Close other tabs
   - Check Task Manager for high CPU/memory usage

## Recent Fixes Applied

- ✅ Fixed visibility filtering bug in `updateVisibleElements()`
- ✅ Added canvas dimension safety checks
- ✅ Enhanced `resize()` to rescale node positions
- ✅ Added comprehensive debug logging
- ✅ Fixed animation loop to continue rendering after physics settles

See `.cursor-changes` for detailed technical information.

