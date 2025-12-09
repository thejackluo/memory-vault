/**
 * Memory Graph Application - Main application controller
 * Ties together all components and manages application state
 */

class MemoryGraphApp {
  constructor() {
    // Core components
    this.dbManager = null;
    this.processor = null;
    this.graphRenderer = null;
    this.timelineView = null;
    this.entityPanel = null;
    this.searchEngine = null;
    
    // Application state
    this.state = {
      currentView: 'graph', // 'graph', 'timeline', 'list'
      selectedFilters: ['person', 'project', 'knowledge', 'question', 'thought', 'pattern'],
      searchQuery: '',
      breadcrumb: ['Overview'],
      history: [],
      historyIndex: -1
    };
    
    // Initialize
    this.initialize();
  }

  /**
   * Initialize the application
   */
  async initialize() {
    try {
      // Initialize database
      this.dbManager = new DBManager();
      await this.dbManager.initialize();
      
      // Initialize components
      this.searchEngine = new SearchEngine(this.dbManager);
      
      // Check if data already exists
      const stats = await this.dbManager.getStats();
      
      if (stats.totalEntities > 0) {
        // Data exists, skip to main app
        await this.showMainApp();
      } else {
        // Show welcome screen
        this.showWelcomeScreen();
      }
    } catch (error) {
      console.error('Failed to initialize app:', error);
      alert('Failed to initialize application. Please refresh the page.');
    }
  }

  /**
   * Show welcome screen
   */
  showWelcomeScreen() {
    document.getElementById('welcome-screen').style.display = 'flex';
    
    document.getElementById('start-processing').addEventListener('click', () => {
      this.startProcessing();
    });
  }

  /**
   * Start processing conversations
   */
  async startProcessing() {
    document.getElementById('welcome-screen').style.display = 'none';
    document.getElementById('processing-screen').style.display = 'flex';
    
    try {
      // Load conversations.json
      document.getElementById('processing-status').textContent = 'Loading conversations.json...';
      
      const response = await fetch('conversations.json');
      if (!response.ok) {
        throw new Error('Failed to load conversations.json. Make sure it is in the same directory.');
      }
      
      const conversations = await response.json();
      
      // Create processor
      this.processor = new MemoryProcessor(this.dbManager);
      
      // Process with progress updates
      await this.processor.processConversations(conversations, (progress) => {
        document.getElementById('processed-count').textContent = progress.processed.toLocaleString();
        document.getElementById('entities-found').textContent = progress.entitiesFound.toLocaleString();
        document.getElementById('progress-percent').textContent = progress.percentage + '%';
        document.getElementById('progress-fill').style.width = progress.percentage + '%';
        document.getElementById('processing-status').textContent = 
          `Processing batch ${Math.ceil(progress.processed / 100)} of ${Math.ceil(progress.total / 100)}...`;
      });
      
      // Processing complete
      document.getElementById('processing-status').textContent = 'Building search index...';
      await new Promise(resolve => setTimeout(resolve, 500));
      
      document.getElementById('processing-status').textContent = 'Complete! Loading graph...';
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Show main app
      await this.showMainApp();
    } catch (error) {
      console.error('Processing error:', error);
      document.getElementById('processing-status').textContent = `Error: ${error.message}`;
      document.getElementById('processing-status').style.color = '#ef4444';
    }
  }

  /**
   * Show main application
   */
  async showMainApp() {
    // Hide other screens
    document.getElementById('welcome-screen').style.display = 'none';
    document.getElementById('processing-screen').style.display = 'none';
    document.getElementById('main-app').style.display = 'flex';
    
    // Initialize graph renderer
    const canvas = document.getElementById('graph-canvas');
    const resizeCanvas = () => {
      const container = canvas.parentElement;
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      if (this.graphRenderer) {
        this.graphRenderer.resize(canvas.width, canvas.height);
      }
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    this.graphRenderer = new GraphRenderer(canvas);
    
    // Set up graph callbacks
    this.graphRenderer.onNodeClick = (node) => {
      this.showEntityDetails(node.data);
    };
    
    this.graphRenderer.onNodeHover = (node) => {
      // Optional: Show quick preview
    };
    
    // Load graph data
    const entities = await this.dbManager.getAllEntities();
    this.graphRenderer.loadData(entities, () => {
      this.graphRenderer.start();
      this.graphRenderer.resetViewport();
    });
    
    // Initialize entity panel
    this.entityPanel = new EntityPanel(document.getElementById('right-panel'), this.dbManager);
    this.entityPanel.onEntityClick = (entity) => {
      this.graphRenderer.focusOnNode(entity.id);
    };
    this.entityPanel.onClose = () => {
      this.graphRenderer.clearSelection();
    };
    
    // Initialize timeline view
    this.timelineView = new TimelineView(document.getElementById('timeline-container'), this.dbManager);
    this.timelineView.onDateClick = (entry) => {
      // Filter graph to show entities from this date
      const entityIds = entry.entities.map(id => id);
      this.graphRenderer.highlightNodes(entityIds);
    };
    this.timelineView.onRangeSelect = (range) => {
      if (range) {
        const entities = this.timelineView.getEntitiesInRange(range.start, range.end);
        this.graphRenderer.highlightNodes(entities.map(e => e.id));
      } else {
        this.graphRenderer.highlightNodes([]);
      }
    };
    
    // Setup event listeners
    this.setupEventListeners();
    
    // Update stats
    await this.updateStats();
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Search
    const searchInput = document.getElementById('search-input');
    const searchSuggestions = document.getElementById('search-suggestions');
    let searchTimeout;
    
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      const query = e.target.value.trim();
      
      if (query.length < 2) {
        searchSuggestions.style.display = 'none';
        this.clearSearchResults();
        return;
      }
      
      searchTimeout = setTimeout(async () => {
        // Show suggestions
        const suggestions = await this.searchEngine.getSuggestions(query);
        if (suggestions.length > 0) {
          searchSuggestions.innerHTML = suggestions.map(s => `
            <div class="suggestion-item" data-entity-id="${s.id}">
              <span class="suggestion-type">${s.type}</span>
              <span class="suggestion-text">${s.text}</span>
            </div>
          `).join('');
          searchSuggestions.style.display = 'block';
          
          // Add click handlers
          searchSuggestions.querySelectorAll('.suggestion-item').forEach(item => {
            item.addEventListener('click', async () => {
              const entityId = item.dataset.entityId;
              const entity = await this.dbManager.getEntity(entityId);
              if (entity) {
                this.graphRenderer.focusOnNode(entityId);
                await this.showEntityDetails(entity);
              }
              searchSuggestions.style.display = 'none';
              searchInput.value = '';
            });
          });
        } else {
          searchSuggestions.style.display = 'none';
        }
        
        // Perform search
        await this.performSearch(query);
      }, 300);
    });
    
    // Hide suggestions on outside click
    document.addEventListener('click', (e) => {
      if (!searchInput.contains(e.target) && !searchSuggestions.contains(e.target)) {
        searchSuggestions.style.display = 'none';
      }
    });
    
    // Filters
    ['person', 'project', 'knowledge', 'question', 'thought', 'pattern'].forEach(type => {
      document.getElementById(`filter-${type}`)?.addEventListener('change', (e) => {
        if (e.target.checked) {
          this.state.selectedFilters.push(type);
        } else {
          this.state.selectedFilters = this.state.selectedFilters.filter(t => t !== type);
        }
        this.applyFilters();
      });
    });
    
    // View buttons
    document.getElementById('view-timeline')?.addEventListener('click', () => {
      this.toggleTimelineView();
    });
    
    document.getElementById('view-list')?.addEventListener('click', () => {
      // TODO: Implement list view
      alert('List view coming soon!');
    });
    
    document.getElementById('reset-view')?.addEventListener('click', () => {
      this.graphRenderer.resetViewport();
      this.graphRenderer.clearSelection();
      this.entityPanel.hide();
    });
    
    document.getElementById('show-stats')?.addEventListener('click', () => {
      this.showStatsModal();
    });
    
    document.getElementById('show-settings')?.addEventListener('click', () => {
      this.showSettingsModal();
    });
    
    // Graph controls
    document.getElementById('zoom-in')?.addEventListener('click', () => {
      this.graphRenderer.viewport.scale *= 1.2;
    });
    
    document.getElementById('zoom-out')?.addEventListener('click', () => {
      this.graphRenderer.viewport.scale /= 1.2;
    });
    
    document.getElementById('fit-view')?.addEventListener('click', () => {
      this.graphRenderer.resetViewport();
    });
    
    // Modal close buttons
    document.getElementById('close-stats')?.addEventListener('click', () => {
      document.getElementById('stats-modal').style.display = 'none';
    });
    
    document.getElementById('close-settings')?.addEventListener('click', () => {
      document.getElementById('settings-modal').style.display = 'none';
    });
    
    // Settings actions
    document.getElementById('export-data')?.addEventListener('click', () => {
      this.exportData();
    });
    
    document.getElementById('reprocess-data')?.addEventListener('click', () => {
      if (confirm('This will reprocess all conversations. Continue?')) {
        this.reprocessData();
      }
    });
    
    document.getElementById('clear-data')?.addEventListener('click', () => {
      if (confirm('This will delete all processed data. Are you sure?')) {
        this.clearData();
      }
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Escape to close panel
      if (e.key === 'Escape') {
        if (this.entityPanel.isVisible()) {
          this.entityPanel.hide();
        }
      }
      // Ctrl/Cmd + F for search
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        searchInput.focus();
      }
    });
  }

  /**
   * Perform search
   */
  async performSearch(query) {
    const results = await this.searchEngine.search(query, {
      types: this.state.selectedFilters,
      maxResults: 50
    });
    
    this.showSearchResults(results);
    
    // Highlight in graph
    this.graphRenderer.highlightNodes(results.map(r => r.id));
  }

  /**
   * Show search results
   */
  showSearchResults(results) {
    const section = document.getElementById('search-results-section');
    const container = document.getElementById('search-results');
    
    if (results.length === 0) {
      section.style.display = 'none';
      return;
    }
    
    section.style.display = 'block';
    container.innerHTML = results.map(entity => `
      <div class="search-result-item" data-entity-id="${entity.id}">
        <div class="result-dot" style="background-color: ${this.getTypeColor(entity.type)}"></div>
        <div class="result-info">
          <div class="result-name">${this.escapeHtml(entity.name)}</div>
          <div class="result-meta">${entity.type} • ${entity.occurrences} occurrences</div>
        </div>
      </div>
    `).join('');
    
    // Add click handlers
    container.querySelectorAll('.search-result-item').forEach(item => {
      item.addEventListener('click', async () => {
        const entityId = item.dataset.entityId;
        const entity = await this.dbManager.getEntity(entityId);
        if (entity) {
          this.graphRenderer.focusOnNode(entityId);
          await this.showEntityDetails(entity);
        }
      });
    });
  }

  /**
   * Clear search results
   */
  clearSearchResults() {
    document.getElementById('search-results-section').style.display = 'none';
    this.graphRenderer.highlightNodes([]);
  }

  /**
   * Apply filters
   */
  applyFilters() {
    this.graphRenderer.filterByType(this.state.selectedFilters);
  }

  /**
   * Show entity details
   */
  async showEntityDetails(entity) {
    await this.entityPanel.show(entity);
    
    // Update breadcrumb
    this.updateBreadcrumb(['Overview', `${entity.type}: ${entity.name}`]);
  }

  /**
   * Update breadcrumb
   */
  updateBreadcrumb(path) {
    const breadcrumb = document.getElementById('breadcrumb');
    breadcrumb.innerHTML = path.map((item, index) => {
      const isLast = index === path.length - 1;
      return `<span class="breadcrumb-item ${isLast ? 'active' : ''}">${item}</span>`;
    }).join('<span class="breadcrumb-separator">→</span>');
  }

  /**
   * Toggle timeline view
   */
  async toggleTimelineView() {
    const container = document.getElementById('timeline-container');
    
    if (container.style.display === 'none') {
      container.style.display = 'block';
      await this.timelineView.loadData();
      document.getElementById('view-timeline').classList.add('active');
    } else {
      container.style.display = 'none';
      document.getElementById('view-timeline').classList.remove('active');
    }
  }

  /**
   * Update statistics
   */
  async updateStats() {
    const stats = await this.dbManager.getStats();
    
    // Update filter counts
    Object.entries(stats.entityTypes).forEach(([type, count]) => {
      const el = document.getElementById(`count-${type}`);
      if (el) el.textContent = count;
    });
  }

  /**
   * Show stats modal
   */
  async showStatsModal() {
    const modal = document.getElementById('stats-modal');
    const content = document.getElementById('stats-content');
    
    const stats = await this.dbManager.getStats();
    const searchStats = await this.searchEngine.getSearchStats();
    
    content.innerHTML = `
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-number">${stats.totalEntities.toLocaleString()}</div>
          <div class="stat-label">Total Entities</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">${stats.totalConversations.toLocaleString()}</div>
          <div class="stat-label">Conversations</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">${searchStats.entitiesWithLinks.toLocaleString()}</div>
          <div class="stat-label">Connected Entities</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">${searchStats.totalLinks.toLocaleString()}</div>
          <div class="stat-label">Total Links</div>
        </div>
      </div>
      
      <h3>Entities by Type</h3>
      <div class="type-stats">
        ${Object.entries(stats.entityTypes).map(([type, count]) => `
          <div class="type-stat">
            <span class="type-stat-dot" style="background-color: ${this.getTypeColor(type)}"></span>
            <span class="type-stat-label">${type}</span>
            <span class="type-stat-count">${count}</span>
          </div>
        `).join('')}
      </div>
      
      ${stats.dateRange ? `
        <h3>Date Range</h3>
        <p>${stats.dateRange.start} to ${stats.dateRange.end}</p>
      ` : ''}
    `;
    
    modal.style.display = 'flex';
  }

  /**
   * Show settings modal
   */
  showSettingsModal() {
    document.getElementById('settings-modal').style.display = 'flex';
  }

  /**
   * Export data
   */
  async exportData() {
    try {
      const entities = await this.dbManager.getAllEntities();
      const conversations = await this.dbManager.getAllConversations();
      const timeline = await this.dbManager.getTimeline();
      
      const exportData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        entities: entities,
        conversations: conversations,
        timeline: timeline
      };
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `memory-graph-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      
      alert('Memory graph exported successfully!');
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export data: ' + error.message);
    }
  }

  /**
   * Reprocess data
   */
  async reprocessData() {
    await this.dbManager.clearAll();
    document.getElementById('main-app').style.display = 'none';
    await this.startProcessing();
  }

  /**
   * Clear data
   */
  async clearData() {
    await this.dbManager.clearAll();
    location.reload();
  }

  /**
   * Get type color
   */
  getTypeColor(type) {
    const colors = {
      person: '#3b82f6',
      project: '#10b981',
      knowledge: '#f59e0b',
      question: '#8b5cf6',
      thought: '#ec4899',
      pattern: '#06b6d4'
    };
    return colors[type] || '#6b7280';
  }

  /**
   * Escape HTML
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.memoryGraphApp = new MemoryGraphApp();
  });
} else {
  window.memoryGraphApp = new MemoryGraphApp();
}

