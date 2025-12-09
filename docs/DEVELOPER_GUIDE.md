# Developer Guide - Memory Graph System

A technical reference for developers working with or extending the Memory Graph system.

> **📚 Documentation Index:**
> - [Quick Start](QUICK_START.md) - For end users
> - [User Guide](MEMORY_GRAPH_README.md) - For end users
> - [Developer Guide](DEVELOPER_GUIDE.md) - You are here
> - [Main README](../README.md) - Project overview

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [File-by-File Reference](#file-by-file-reference)
3. [Data Flow](#data-flow)
4. [Component Interactions](#component-interactions)
5. [Extension Points](#extension-points)
6. [Performance Considerations](#performance-considerations)

---

## Architecture Overview

### System Layers

The Memory Graph system follows a clean layered architecture:

```
┌─────────────────────────────────────────┐
│         Presentation Layer               │
│  (memory-graph.html, memory-graph.css)  │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│         Application Layer                │
│       (memory-graph-app.js)              │
│  - State management                      │
│  - Event coordination                    │
│  - User interaction handling             │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│         UI Component Layer               │
│  (graph-renderer, timeline-view,         │
│   entity-panel, search-engine)           │
│  - Specialized UI components             │
│  - Visual representation                 │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│         Business Logic Layer             │
│       (memory-processor.js)              │
│  - Entity extraction algorithms          │
│  - Relationship computation              │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│         Data Access Layer                │
│         (db-manager.js)                  │
│  - IndexedDB operations                  │
│  - Data persistence                      │
└─────────────────────────────────────────┘
```

### Design Patterns Used

- **Separation of Concerns**: Each file has a single, well-defined responsibility
- **Dependency Injection**: Components receive their dependencies (e.g., `dbManager`)
- **Observer Pattern**: Callbacks for events (`onNodeClick`, `onProgress`, etc.)
- **Factory Pattern**: Entity creation with deduplication in processor
- **Repository Pattern**: `db-manager.js` abstracts data access

---

## File-by-File Reference

### Core Application Files

#### `memory-graph.html` (291 lines)
**Purpose**: Application shell and UI structure  
**Responsibility**: DOM structure, no logic

**Key Sections:**
- **Welcome Screen**: First-time user onboarding with feature showcase
- **Processing Screen**: Progress visualization during conversation processing
- **Main App**: Primary interface with graph, sidebar, and panels
- **Modals**: Stats and settings dialogs

**Notable Elements:**
```html
<canvas id="graph-canvas"></canvas>  <!-- Graph rendering surface -->
<div id="timeline-container"></div>  <!-- Timeline view -->
<div id="right-panel"></div>         <!-- Entity details panel -->
```

**Developer Notes:**
- All JavaScript loaded at end for better performance
- No inline styles or scripts (clean separation)
- Uses semantic HTML5 elements
- Accessibility attributes included (ARIA where needed)

---

#### `memory-graph.css` (1,160 lines)
**Purpose**: Complete styling for the application  
**Responsibility**: Visual presentation, layout, animations

**Key Sections:**
1. **CSS Variables** (`:root`): Color palette, spacing constants
2. **Welcome/Processing Screens**: Gradient backgrounds, animations
3. **Main App Layout**: Flexbox-based responsive layout
4. **Component Styles**: Individual component styling
5. **Responsive Design**: Media queries for mobile/tablet

**Notable Features:**
```css
--color-person: #3b82f6;     /* Color coding by entity type */
--transition: all 0.2s ease;  /* Consistent transitions */
--shadow-lg: ...;             /* Elevation system */
```

**Developer Notes:**
- Uses CSS custom properties for easy theming
- Mobile-first responsive design
- Smooth animations with `transition` and `@keyframes`
- Scrollbar customization for better UX
- Dark mode support ready (variables defined)

---

#### `memory-graph-app.js` (595 lines)
**Purpose**: Main application controller and state manager  
**Responsibility**: Coordinates all components, manages app state, handles user interactions

**Class: `MemoryGraphApp`**

**Key Methods:**
```javascript
initialize()              // App startup, DB init, check existing data
startProcessing()        // Load and process conversations.json
showMainApp()            // Initialize all components and views
setupEventListeners()    // Wire up all UI interactions
performSearch(query)     // Execute search and update UI
showEntityDetails(entity) // Display entity panel
```

**State Management:**
```javascript
this.state = {
  currentView: 'graph',           // Current view mode
  selectedFilters: [...],         // Active entity type filters
  searchQuery: '',                // Current search
  breadcrumb: ['Overview'],       // Navigation history
  history: [],                    // Navigation stack
  historyIndex: -1                // Current position in history
}
```

**Component References:**
```javascript
this.dbManager        // Database operations
this.processor        // Entity extraction
this.graphRenderer    // Graph visualization
this.timelineView     // Timeline component
this.entityPanel      // Detail panel
this.searchEngine     // Search functionality
```

**Developer Notes:**
- Single entry point for entire application
- Manages component lifecycle (initialization, destruction)
- Implements event delegation for efficiency
- Handles keyboard shortcuts
- Coordinates data flow between components
- **Extension Point**: Add new views by extending `currentView` state

---

### Data Layer

#### `db-manager.js` (401 lines)
**Purpose**: IndexedDB abstraction layer  
**Responsibility**: All database operations, persistence, indexing

**Class: `DBManager`**

**Database Schema:**
```javascript
stores: {
  entities: {
    keyPath: 'id',
    indices: ['type', 'name', 'firstSeen', 'lastSeen']
  },
  conversations: {
    keyPath: 'id',
    indices: ['timestamp', 'date']
  },
  relationships: {
    autoIncrement: true,
    indices: ['source', 'target', ['source', 'target']]
  },
  searchIndex: {
    keyPath: 'word'  // Inverted index for full-text search
  },
  timeline: {
    keyPath: 'date'
  },
  metadata: {
    keyPath: 'key'   // Global settings and stats
  }
}
```

**Key Methods:**
```javascript
// Entity operations
saveEntity(entity)                    // Insert or update entity
getEntity(entityId)                   // Retrieve single entity
getAllEntities()                      // Retrieve all entities
getEntitiesByType(type)              // Filter by type
searchEntitiesByName(searchTerm)     // Name-based search

// Conversation operations
saveConversation(conversation)        // Store conversation metadata
getConversation(convId)              // Retrieve conversation
getConversationsByDateRange(start, end)  // Date-filtered retrieval

// Relationship operations
saveRelationship(source, target, metadata)  // Store entity link
getEntityRelationships(entityId)     // Get all related entities

// Search index operations
addToSearchIndex(word, entityId)     // Build inverted index
searchIndex(query)                   // Fast word-based search

// Timeline operations
saveTimeline(timeline)               // Store timeline data
getTimeline()                        // Retrieve full timeline
getTimelineRange(start, end)         // Date-filtered timeline
```

**Performance Features:**
- **Multiple Indices**: Fast lookups by type, date, name
- **Compound Index**: Fast relationship queries
- **Inverted Index**: O(1) word lookup for search
- **Batch Operations**: Transaction-based writes
- **Promise-based API**: Clean async handling

**Developer Notes:**
- All operations return Promises
- Automatic index creation on first run
- Transaction management abstracted
- Error handling built-in
- **Extension Point**: Add new stores/indices as needed

---

### Business Logic Layer

#### `memory-processor.js` (513 lines)
**Purpose**: Entity extraction and relationship computation  
**Responsibility**: Parse conversations, extract entities, build graph

**Class: `MemoryProcessor`**

**Processing Pipeline:**
```
conversations.json
       ↓
processBatch(100 conversations)
       ↓
processConversation(single conv)
       ↓
extractMessages(from mapping)
       ↓
extractEntities(from text)
   ↓   ↓   ↓   ↓   ↓   ↓
   P   R   K   Q   T   Pa   (entity types)
       ↓
getOrCreateEntity(deduplication)
       ↓
updateTimeline(date tracking)
       ↓
computeRelationships(links)
       ↓
saveToDatabase(IndexedDB)
```

**Entity Extraction Methods:**

```javascript
extractPeople(text)        // Pattern: "[First Last]", "with Alex"
extractProjects(text)      // Pattern: "working on X", "building Y"
extractKnowledge(text)     // Pattern: "I learned", "TIL"
extractQuestions(text, messages)  // Pattern: "?" in user messages
extractThoughts(text)      // Pattern: "I think", "my idea"
extractPatterns()          // (Future) Frequency analysis
```

**Entity Types & Patterns:**

| Type | Pattern Examples | Confidence |
|------|------------------|------------|
| **person** | `[A-Z][a-z]+ [A-Z][a-z]+`, `with/by/from [Name]` | Medium |
| **project** | `working on X`, `building X`, `project called X` | High |
| **knowledge** | `I learned that...`, `TIL:`, `discovered that...` | High |
| **question** | User messages ending in `?` | Very High |
| **thought** | `I think`, `my idea is`, `what if` | High |
| **pattern** | Recurring topics (future: LLM-based) | TBD |

**Deduplication Strategy:**
```javascript
normalizeEntityName(name)  // Lowercase, remove punctuation
findExistingEntity(key, type)  // Check for duplicates
// Only creates new entity if no match found
```

**Relationship Computation:**
```javascript
// Entities are linked if they appear in the same conversation
for each conversation:
  for each pair of entities:
    entity1.links.push(entity2.id)
    entity2.links.push(entity1.id)
```

**Progress Reporting:**
```javascript
this.onProgress({
  processed: 2500,
  total: 5000,
  percentage: 50.0,
  entitiesFound: 3421,
  recentBatch: 100
})
```

**Developer Notes:**
- Processes 100 conversations per batch (configurable)
- Regex-based extraction (fast but ~80% accuracy)
- Context window: ±100 chars around match
- Summary length: 50 chars for names
- **Extension Point**: Add new entity types in `extractEntities()`
- **Extension Point**: Replace regex with LLM for higher accuracy

---

#### `processing-worker.js` (300 lines)
**Purpose**: Web Worker for background processing  
**Responsibility**: Offload heavy computation to separate thread

**Worker API:**
```javascript
// Send to worker
postMessage({
  action: 'process',
  data: { conversations, batchSize: 100 }
})

// Receive from worker
onmessage = (e) => {
  switch (e.data.type) {
    case 'progress':  // { processed, total, percentage, entitiesFound }
    case 'complete':  // { entities, conversations, timeline }
    case 'error':     // { error }
  }
}
```

**Contains Duplicate Logic:**
- Same extraction functions as `memory-processor.js`
- Self-contained (no imports in Web Workers)
- Message-based communication only

**Developer Notes:**
- Optional: Can use `memory-processor.js` directly in main thread
- Better for large datasets (5000+ conversations)
- Prevents UI freezing during processing
- **Trade-off**: Code duplication vs. performance

---

### UI Component Layer

#### `graph-renderer.js` (713 lines)
**Purpose**: High-performance graph visualization  
**Responsibility**: Canvas rendering, physics simulation, user interactions

**Class: `GraphRenderer`**

**Rendering Pipeline:**
```
requestAnimationFrame
       ↓
updatePhysics()        // Force-directed layout
       ↓
updateVisibleElements() // Viewport culling
       ↓
render()               // Draw to canvas
  ├─ renderEdges()
  └─ renderNodes()
       ↓
requestAnimationFrame  // Loop
```

**Force-Directed Layout:**
```javascript
Physics Simulation:
- Center Force: Pulls nodes toward center
- Repulsion Force: Pushes nodes apart (inverse square)
- Link Force: Attracts connected nodes
- Damping: Stabilizes over time

Parameters:
  nodeRadius: 8px
  linkDistance: 100px
  repulsionStrength: 300
  centerForce: 0.01
  damping: 0.8
  alphaDecay: 0.02  // Simulation cooldown rate
```

**Viewport Culling:**
```javascript
// Only render nodes within visible viewport + margin
updateVisibleElements() {
  visibleNodes = nodes.filter(node => 
    node.x >= viewLeft && 
    node.x <= viewRight &&
    node.y >= viewTop && 
    node.y <= viewBottom
  )
}
```

**Interaction Handling:**
```javascript
Mouse Events:
- mousedown: Start drag or pan
- mousemove: Update drag/pan, update hover
- mouseup: End drag, detect click
- wheel: Zoom (scale viewport)

Touch Events:
- touchstart: Begin gesture
- touchmove: Pan or pinch-zoom
- Two-finger pinch: Scale calculation
```

**Level-of-Detail Rendering:**
```javascript
// Show labels only when zoomed in or hovering
const showLabels = viewport.scale > 0.5
if (showLabels || isHovered || isSelected) {
  renderLabel(node)
}
```

**State Management:**
```javascript
viewport: {
  offsetX, offsetY,      // Pan position
  scale,                 // Zoom level (0.1 - 5.0)
  minScale, maxScale
}

interaction: {
  isDragging,            // Node being dragged
  isPanning,             // Background panning
  draggedNode,           // Current dragged node
  hoveredNode,           // Node under cursor
  selectedNode,          // Clicked node
  mouseX, mouseY         // Cursor position
}

simulationAlpha: 0.0-1.0 // Physics simulation heat
```

**Callbacks:**
```javascript
this.onNodeClick = (node) => { }   // Node clicked
this.onNodeHover = (node) => { }   // Node hovered
```

**Public API:**
```javascript
loadData(entities, onComplete)     // Initialize graph
start()                            // Start animation loop
stop()                             // Stop rendering
focusOnNode(nodeId, animated)     // Center on node
resetViewport()                    // Fit all nodes
filterByType(types)                // Show/hide types
highlightNodes(nodeIds)            // Highlight search results
selectNode(node)                   // Select node
clearSelection()                   // Deselect
resize(width, height)              // Handle container resize
```

**Performance Optimizations:**
1. **Viewport Culling**: Only render visible nodes
2. **RequestAnimationFrame**: 60 FPS target
3. **Level-of-Detail**: Conditional label rendering
4. **Canvas API**: Direct pixel manipulation (fast)
5. **Spatial Partitioning**: Only check nearby nodes for repulsion

**Developer Notes:**
- Uses Canvas 2D (not WebGL, for simplicity)
- Physics simulation cools over time (`alphaDecay`)
- Node dragging reheats simulation
- Color palette defined in constructor
- **Extension Point**: Replace with WebGL for >10k nodes
- **Extension Point**: Add clustering for large graphs

---

#### `timeline-view.js` (489 lines)
**Purpose**: Timeline visualization component  
**Responsibility**: Date-based navigation, swim lane rendering

**Class: `TimelineView`**

**Layout Structure:**
```
┌─────────┬───────────────────────────────────────┐
│ Labels  │  Scrollable Timeline Canvas            │
│         │                                        │
│ People  │  ●  ●    ●   ● ●   ●  ●   ●  ●   ●   │
│ Project │     ● ●    ●       ●   ●   ●          │
│ Know.   │  ●   ●  ●  ●  ●  ●   ●  ●   ●  ●  ●   │
│ Quest.  │   ●    ●     ●    ●    ●     ●        │
│ Thought │     ●   ●   ●   ●    ●   ●   ●  ●     │
│ Pattern │  ●      ●       ●       ●        ●    │
│         │                                        │
│         │  │   │   │   │   │   │   │   │   │   │
│         │  Jan Feb Mar Apr May Jun Jul Aug Sep  │
└─────────┴───────────────────────────────────────┘
```

**Swim Lane Configuration:**
```javascript
swimLanes: {
  person:    { label: 'People',    color: '#3b82f6', y: 0 },
  project:   { label: 'Projects',  color: '#10b981', y: 1 },
  knowledge: { label: 'Knowledge', color: '#f59e0b', y: 2 },
  question:  { label: 'Questions', color: '#8b5cf6', y: 3 },
  thought:   { label: 'Thoughts',  color: '#ec4899', y: 4 },
  pattern:   { label: 'Patterns',  color: '#06b6d4', y: 5 }
}
```

**Rendering:**
```javascript
dayWidth = 30px        // Horizontal space per day
laneHeight = 40px      // Vertical space per type
dotSize = 8px          // Entity marker size
dotSize (multiple) = min(8 + count, 24px)  // Scales with count
```

**Interaction:**
```javascript
Click single day → onDateClick({ date, entities, conversations })
Click-drag range → onRangeSelect({ start, end })
Hover dot → tooltip with entity details
```

**Tooltip Content:**
```javascript
{
  date: '2024-01-15',
  type: 'People',
  entities: [entity1, entity2, ...],  // Max 5 shown
  conversations: 12
}
```

**Public API:**
```javascript
loadData()                        // Load from DB and render
render()                          // Redraw timeline
filterByType(types)              // Show/hide lanes
highlightDate(date)              // Scroll to and highlight
getEntitiesInRange(start, end)  // Query entities by date
getConversationsInRange(start, end)  // Query conversations
```

**Developer Notes:**
- Canvas-based rendering for performance
- Horizontal scroll container
- Date markers every 7 days or month start
- Entity count shown as number on dot if >1
- **Extension Point**: Add vertical timeline mode
- **Extension Point**: Zoom in/out time granularity

---

#### `entity-panel.js` (427 lines)
**Purpose**: Entity detail sidebar panel  
**Responsibility**: Display entity information, backlinks, relationships

**Class: `EntityPanel`**

**Panel Structure:**
```
┌──────────────────────────────────────┐
│  Entity Name                    [×]   │
├──────────────────────────────────────┤
│  [type badge]  15 occurrences        │
│  Jan 15 → Dec 9                      │
│                                       │
│  Description text...                 │
│                                       │
│  🔗 Related Entities (8)             │
│  ● Project Alpha → [view]            │
│  ● John Smith → [view]               │
│  ● Machine Learning → [view]         │
│                                       │
│  💬 Conversations (23)               │
│  💬 Discussion about X (Nov 5)       │
│  💬 Planning session (Oct 22)        │
│                                       │
│  📅 Timeline                          │
│  December 2024  (5 days)             │
│  November 2024  (8 days)             │
│                                       │
│  ⬅ Backlinks                         │
│  ● Another Project                   │
│  ● Sarah Johnson                     │
└──────────────────────────────────────┘
```

**Sections:**

1. **Header**
   - Entity name
   - Type badge (color-coded)
   - Occurrence count
   - Date range (first → last seen)

2. **Description**
   - Extracted context snippet
   - Hidden if empty

3. **Related Entities**
   - Direct links (entities appearing together)
   - Sorted by occurrence count
   - Click to navigate

4. **Conversations**
   - List of source conversations
   - Sorted by date (most recent first)
   - Limited to 20, "show more" button
   - Click to view conversation (callback)

5. **Timeline**
   - Grouped by month
   - Shows activity frequency
   - Compact monthly view

6. **Backlinks**
   - Entities that link TO this one
   - Obsidian/Logseq style
   - Bidirectional navigation

**Navigation:**
```javascript
// Clicking related entity or backlink
navigateToEntity(entityId) {
  // 1. Fetch entity
  // 2. Update panel
  // 3. Fire callback to update graph
}
```

**Callbacks:**
```javascript
this.onEntityClick(entity)        // Navigate to entity
this.onConversationClick(convId)  // View conversation
this.onClose()                    // Panel closed
```

**Public API:**
```javascript
show(entity)        // Display entity details
hide()              // Close panel
isVisible()         // Check visibility state
refresh()           // Reload current entity data
```

**Developer Notes:**
- Slide-in animation from right
- Auto-scrolls to top on new entity
- Lazy loads related entities (async)
- HTML escaping for security
- **Extension Point**: Add edit mode for manual corrections
- **Extension Point**: Add entity merge UI

---

#### `search-engine.js` (433 lines)
**Purpose**: Fast full-text search with fuzzy matching  
**Responsibility**: Query entities, rank results, provide suggestions

**Class: `SearchEngine`**

**Search Algorithm:**
```
Query: "maching learing"
      ↓
1. Tokenize: ["maching", "learing"]
      ↓
2. IndexedDB Search (exact words)
      ↓
3. Fuzzy Search (Levenshtein distance ≤2)
   - "maching" → "machine" (distance: 1) ✓
   - "learing" → "learning" (distance: 1) ✓
      ↓
4. Score Results
   - Exact name match: +100
   - Name starts with query: +50
   - Name contains term: +10
   - Description contains: +5
   - Recent (7 days): +10
   - Popular (high occurrence): +log(count)*2
      ↓
5. Sort by Score (descending)
      ↓
6. Return Top 50
```

**Fuzzy Matching:**
```javascript
levenshteinDistance(str1, str2)
// Edit distance calculation
// Allows: insertion, deletion, substitution
// Threshold: ≤2 edits or ≤33% of term length

Examples:
"progect" → "project" (1 edit) ✓
"pythom" → "python" (1 edit) ✓
"machien" → "machine" (2 edits) ✓
"xyz" → "project" (>5 edits) ✗
```

**Search Options:**
```javascript
search(query, {
  types: ['person', 'project'],   // Filter by type
  dateRange: { start, end },      // Filter by date
  maxResults: 50,                 // Limit results
  fuzzy: true                     // Enable fuzzy matching
})
```

**Result Scoring:**
```javascript
score = 0
if (name.toLowerCase() === query) score += 100
if (name.startsWith(query)) score += 50
if (name.includes(query)) score += 10
if (description.includes(query)) score += 5
score += log(occurrences + 1) * 2
if (daysSinceLastSeen < 7) score += 10
else if (daysSinceLastSeen < 30) score += 5

return results.sort((a, b) => b.score - a.score)
```

**Auto-complete Suggestions:**
```javascript
getSuggestions(partialQuery, maxSuggestions = 10)
// Returns entities starting with query
// Sorted by popularity (occurrence count)
// Fast prefix matching
```

**Advanced Search:**
```javascript
advancedSearch({
  query: 'machine learning',
  types: ['knowledge', 'project'],
  dateRange: { start: '2024-01-01', end: '2024-12-31' },
  minOccurrences: 5,
  maxOccurrences: 100,
  hasLinks: true,
  sortBy: 'relevance' | 'occurrences' | 'recent' | 'alphabetical'
})
```

**Caching:**
```javascript
cache: {
  allEntities: [...],      // Cached entity list
  lastUpdated: timestamp   // Cache invalidation
}
// Cache valid for 5 minutes
// Reduces DB queries
```

**Public API:**
```javascript
search(query, options)               // Main search
getSuggestions(partial, max)        // Autocomplete
getRecentEntities(max)              // Recently seen
getPopularEntities(max)             // Most occurring
getEntitiesByType(type)             // Type filter
searchConversations(query, max)     // Search conv titles
advancedSearch(params)              // Complex queries
findRelatedEntities(entityId, max)  // Co-occurrence
getSearchStats()                    // Statistics
clearCache()                        // Force refresh
```

**Developer Notes:**
- Two-phase search: exact then fuzzy
- IndexedDB inverted index for speed
- Result caching reduces DB load
- Levenshtein with early termination (performance)
- **Extension Point**: Add boolean operators (AND, OR, NOT)
- **Extension Point**: Add semantic search (embeddings)
- **Extension Point**: Add search history

---

## Data Flow

### Conversation Processing Flow

```
User clicks "Process Conversations"
         ↓
memory-graph-app.js: startProcessing()
         ↓
Fetch conversations.json
         ↓
Create MemoryProcessor instance
         ↓
┌────────────────────────────────────────┐
│  MemoryProcessor.processConversations  │
│  (batches of 100)                      │
│         ↓                              │
│  For each conversation:                │
│    ├─ extractMessages()                │
│    ├─ extractEntities()                │
│    │   ├─ extractPeople()              │
│    │   ├─ extractProjects()            │
│    │   ├─ extractKnowledge()           │
│    │   ├─ extractQuestions()           │
│    │   └─ extractThoughts()            │
│    ├─ getOrCreateEntity()              │
│    │   └─ deduplication                │
│    └─ updateTimeline()                 │
│         ↓                              │
│  After all batches:                    │
│    ├─ computeRelationships()           │
│    └─ buildSearchIndex()               │
└────────────────────────────────────────┘
         ↓
DBManager.saveToDatabase()
   ├─ saveEntity() × N
   ├─ saveConversation() × N
   ├─ saveTimeline()
   └─ addToSearchIndex() × N
         ↓
Progress callbacks to UI
         ↓
Complete! Load main app
```

### Search Flow

```
User types in search bar
         ↓
memory-graph-app.js: debounced input event
         ↓
SearchEngine.search(query)
         ↓
┌────────────────────────────────────┐
│  1. Tokenize query                  │
│  2. Try IndexedDB exact match       │
│  3. If no results, fuzzy search     │
│  4. Apply filters (type, date)      │
│  5. Score results                   │
│  6. Sort by score                   │
└────────────────────────────────────┘
         ↓
Return results array
         ↓
memory-graph-app.js: showSearchResults()
         ↓
Update left sidebar with results
         ↓
GraphRenderer.highlightNodes(resultIds)
         ↓
Visual feedback on graph
```

### Entity Selection Flow

```
User clicks node in graph
         ↓
GraphRenderer: click event
         ↓
GraphRenderer.onNodeClick(node)
         ↓
memory-graph-app.js: showEntityDetails(entity)
         ↓
EntityPanel.show(entity)
         ↓
┌────────────────────────────────────┐
│  EntityPanel loads:                 │
│  ├─ DBManager.getEntity()           │
│  ├─ loadRelatedEntities()           │
│  │   └─ DBManager.getEntity() × N   │
│  ├─ loadConversations()             │
│  │   └─ DBManager.getConversation() │
│  ├─ loadTimeline()                  │
│  │   └─ DBManager.getTimeline()     │
│  └─ loadBacklinks()                 │
│      └─ DBManager.getAllEntities()  │
└────────────────────────────────────┘
         ↓
Panel slides in from right
         ↓
GraphRenderer.selectNode(node)
         ↓
Node highlighted in graph
```

---

## Component Interactions

### Dependency Graph

```
memory-graph-app.js
  ├─→ DBManager
  ├─→ MemoryProcessor → DBManager
  ├─→ GraphRenderer
  ├─→ TimelineView → DBManager
  ├─→ EntityPanel → DBManager
  └─→ SearchEngine → DBManager

All components depend on DBManager
App coordinates all components
```

### Communication Patterns

**1. Callback Pattern (Component → App)**
```javascript
// Component notifies app of user action
graphRenderer.onNodeClick = (node) => {
  app.showEntityDetails(node.data)
}

timelineView.onDateClick = (entry) => {
  app.filterByDate(entry.date)
}

entityPanel.onEntityClick = (entity) => {
  app.navigateToEntity(entity.id)
}
```

**2. Direct Method Call (App → Component)**
```javascript
// App commands component
app.graphRenderer.focusOnNode(entityId)
app.entityPanel.show(entity)
app.searchEngine.search(query)
```

**3. Shared State (via DBManager)**
```javascript
// Components read from common source
dbManager.getEntity(id)
  .then(entity => {
    // Used by: GraphRenderer, EntityPanel, SearchEngine
  })
```

---

## Extension Points

### Adding a New Entity Type

**1. Update `memory-processor.js`:**
```javascript
// Add extraction function
extractLocations(text) {
  const locations = [];
  const pattern = /(?:in|at|from)\s+([A-Z][a-zA-Z\s]{2,20})/g;
  // ... extraction logic
  return locations;
}

// Call in extractEntities()
extractEntities(text, messages) {
  const entities = [];
  entities.push(...this.extractPeople(text));
  entities.push(...this.extractProjects(text));
  entities.push(...this.extractLocations(text));  // NEW
  // ...
  return entities;
}
```

**2. Update color palette in all files:**
```javascript
// graph-renderer.js
this.colors = {
  person: '#3b82f6',
  project: '#10b981',
  location: '#ef4444',  // NEW
  // ...
};

// memory-graph.css
--color-location: #ef4444;  /* NEW */
```

**3. Update UI filters:**
```html
<!-- memory-graph.html -->
<label class="filter-option">
  <input type="checkbox" id="filter-location" checked />
  <span class="filter-dot" style="background-color: #ef4444"></span>
  <span class="filter-label">Locations</span>
  <span class="filter-count" id="count-location">0</span>
</label>
```

```javascript
// memory-graph-app.js
['person', 'project', 'knowledge', 'question', 'thought', 'pattern', 'location'].forEach(type => {
  // ... event listener setup
});
```

**4. Update timeline:**
```javascript
// timeline-view.js
this.swimLanes = {
  // ...
  location: { label: 'Locations', color: '#ef4444', y: 6 }
};
```

### Replacing Rule-Based Extraction with LLM

**Option 1: OpenAI API**
```javascript
// memory-processor.js
async extractEntitiesWithLLM(text) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
    },
    body: JSON.stringify({
      model: 'gpt-4',
      messages: [{
        role: 'system',
        content: 'Extract entities: people, projects, knowledge, questions, thoughts. Return JSON.'
      }, {
        role: 'user',
        content: text
      }],
      response_format: { type: 'json_object' }
    })
  });
  
  const data = await response.json();
  return JSON.parse(data.choices[0].message.content);
}
```

**Option 2: Local LLM (Ollama)**
```javascript
async extractEntitiesWithOllama(text) {
  const response = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    body: JSON.stringify({
      model: 'llama2',
      prompt: `Extract entities from this text as JSON:\n${text}`,
      stream: false
    })
  });
  
  const data = await response.json();
  return JSON.parse(data.response);
}
```

### Adding Graph Layouts

```javascript
// graph-renderer.js
class GraphRenderer {
  setLayout(layoutType) {
    switch(layoutType) {
      case 'force-directed':
        this.updatePhysics = this.forceDirectedPhysics;
        break;
      case 'hierarchical':
        this.updatePhysics = this.hierarchicalLayout;
        break;
      case 'circular':
        this.updatePhysics = this.circularLayout;
        break;
    }
  }
  
  hierarchicalLayout() {
    // Topological sort + layering
    const layers = this.computeLayers();
    layers.forEach((layer, y) => {
      layer.forEach((node, x) => {
        node.x = x * this.options.layerSpacing;
        node.y = y * this.options.layerHeight;
      });
    });
  }
  
  circularLayout() {
    // Arrange nodes in a circle
    const radius = Math.min(this.width, this.height) / 3;
    this.nodes.forEach((node, i) => {
      const angle = (i / this.nodes.length) * Math.PI * 2;
      node.x = this.width/2 + Math.cos(angle) * radius;
      node.y = this.height/2 + Math.sin(angle) * radius;
    });
  }
}
```

### Adding Export Formats

```javascript
// memory-graph-app.js
async exportToGraphML() {
  const entities = await this.dbManager.getAllEntities();
  
  let graphml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  graphml += '<graphml xmlns="http://graphml.graphdrawing.org/xmlns">\n';
  graphml += '  <graph edgedefault="undirected">\n';
  
  // Nodes
  entities.forEach(entity => {
    graphml += `    <node id="${entity.id}">\n`;
    graphml += `      <data key="name">${entity.name}</data>\n`;
    graphml += `      <data key="type">${entity.type}</data>\n`;
    graphml += `    </node>\n`;
  });
  
  // Edges
  entities.forEach(entity => {
    entity.links.forEach(targetId => {
      graphml += `    <edge source="${entity.id}" target="${targetId}"/>\n`;
    });
  });
  
  graphml += '  </graph>\n</graphml>';
  
  // Download
  const blob = new Blob([graphml], { type: 'application/xml' });
  // ... download logic
}
```

---

## Performance Considerations

### Bottlenecks

1. **Initial Processing** (1-2 min for 5K conversations)
   - **Cause**: Regex matching on large text
   - **Solution**: Use Web Worker (`processing-worker.js`)
   - **Future**: Parallel processing, better algorithms

2. **Graph Rendering** (drops below 60 FPS with >5K nodes)
   - **Cause**: Canvas draw calls for many nodes
   - **Solution**: Viewport culling (already implemented)
   - **Future**: WebGL renderer, spatial indexing

3. **Search on Large Datasets** (>100ms with 10K entities)
   - **Cause**: Full scan in fuzzy search
   - **Solution**: IndexedDB inverted index (already implemented)
   - **Future**: Better fuzzy algorithm (BK-tree)

### Optimization Checklist

✅ **Implemented:**
- Viewport culling in renderer
- Incremental processing with progress
- IndexedDB with multiple indices
- Result caching in search engine
- Debounced search input
- RequestAnimationFrame for rendering
- Level-of-detail (LOD) rendering

❌ **Not Yet Implemented:**
- Spatial indexing (quadtree) for faster neighbor queries
- WebGL renderer for >10K nodes
- Virtual scrolling for entity lists
- Lazy loading of conversations
- IndexedDB cursor-based pagination
- Web Worker by default
- Service Worker for offline

### Memory Usage

**Typical Memory Profile (5K conversations):**
```
Entities in memory: ~3K entities × 500 bytes = ~1.5 MB
Nodes in renderer: ~3K nodes × 200 bytes = ~600 KB
IndexedDB: ~10-20 MB (persistent)
Canvas buffers: ~5 MB
Total: ~25-30 MB
```

**Large Dataset (50K conversations):**
```
Entities: ~20K × 500 bytes = ~10 MB
Nodes: ~20K × 200 bytes = ~4 MB
IndexedDB: ~100-200 MB
Total: ~200-250 MB
```

**Mitigation:**
- Don't load all entities at once (use pagination)
- Lazy load entity details
- Limit visible nodes with filters
- Clear search cache periodically

---

## Testing Considerations

### Unit Testing

```javascript
// Example: Testing entity extraction
describe('MemoryProcessor', () => {
  it('should extract people from text', () => {
    const processor = new MemoryProcessor(mockDB);
    const text = "I met with John Smith yesterday";
    const people = processor.extractPeople(text);
    
    expect(people).toHaveLength(1);
    expect(people[0].name).toBe("John Smith");
    expect(people[0].type).toBe("person");
  });
  
  it('should deduplicate entities', () => {
    const entities = new Map();
    const id1 = processor.getOrCreateEntity(
      { type: 'person', name: 'John Smith' }, 
      'conv1', 123, entities
    );
    const id2 = processor.getOrCreateEntity(
      { type: 'person', name: 'john smith' },  // lowercase
      'conv2', 456, entities
    );
    
    expect(id1).toBe(id2);  // Should be same entity
    expect(entities.size).toBe(1);
  });
});
```

### Integration Testing

```javascript
// Example: Testing full workflow
describe('Memory Graph Integration', () => {
  it('should process conversations and search', async () => {
    const app = new MemoryGraphApp();
    await app.initialize();
    
    // Load test data
    const conversations = loadTestConversations();
    await app.processor.processConversations(conversations);
    
    // Search should find entities
    const results = await app.searchEngine.search('project');
    expect(results.length).toBeGreaterThan(0);
    
    // Graph should render
    expect(app.graphRenderer.nodes.length).toBeGreaterThan(0);
  });
});
```

### Performance Testing

```javascript
// Measure processing time
console.time('processing');
await processor.processConversations(conversations);
console.timeEnd('processing');
// Expected: <2000ms for 5K conversations

// Measure render FPS
let frameCount = 0;
const startTime = performance.now();
graphRenderer.start();
setTimeout(() => {
  const fps = frameCount / ((performance.now() - startTime) / 1000);
  console.log(`FPS: ${fps}`);
  // Expected: >55 FPS with <5K nodes
}, 5000);
```

---

## Debugging Tips

### Common Issues

**1. Entities Not Extracted**
```javascript
// Add debug logging in memory-processor.js
extractEntities(text, messages) {
  const entities = [];
  const people = this.extractPeople(text);
  console.log('Extracted people:', people.length);  // DEBUG
  entities.push(...people);
  return entities;
}
```

**2. Graph Not Rendering**
```javascript
// Check canvas size
console.log('Canvas:', canvas.width, canvas.height);
// Should not be 0x0

// Check node count
console.log('Nodes:', graphRenderer.nodes.length);
// Should be >0
```

**3. Search Returns No Results**
```javascript
// Check IndexedDB
const allEntities = await dbManager.getAllEntities();
console.log('Total entities in DB:', allEntities.length);

// Check search index
const indexEntry = await dbManager.searchIndex('test');
console.log('Index entry:', indexEntry);
```

### Browser DevTools

**IndexedDB Inspector:**
```
Chrome DevTools → Application → Storage → IndexedDB
→ MemoryGraphDB
  → entities (view all records)
  → searchIndex (check inverted index)
```

**Canvas Performance:**
```
Chrome DevTools → Performance → Record
→ Look for long frames (>16ms)
→ Identify bottlenecks in updatePhysics() or render()
```

**Memory Profiler:**
```
Chrome DevTools → Memory → Take heap snapshot
→ Look for detached DOM nodes
→ Check for memory leaks in event listeners
```

---

## Future Improvements

### Short-Term (v3.1)
- [ ] Entity merging UI
- [ ] Manual entity editing
- [ ] List view for browsing
- [ ] Export to GraphML/Gephi
- [ ] Keyboard navigation

### Medium-Term (v3.5)
- [ ] LLM-based entity extraction
- [ ] Semantic search with embeddings
- [ ] Collaborative features (share graphs)
- [ ] Advanced filtering (boolean queries)
- [ ] Conversation preview in panel

### Long-Term (v4.0)
- [ ] Real-time processing (watch conversations.json)
- [ ] Multi-source import (Slack, Email, etc.)
- [ ] AI chat over graph ("Tell me about...")
- [ ] Mobile app (React Native)
- [ ] Plugin system for extensibility

---

This guide should give you a solid understanding of how the Memory Graph system works. Happy coding! 🚀

