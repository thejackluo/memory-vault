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
  async showWelcomeScreen() {
    document.getElementById('welcome-screen').style.display = 'flex';
    
    const button = document.getElementById('start-processing');
    const historyButton = document.getElementById('view-history');
    const note = document.getElementById('progress-note');
    
    // Setup mode switcher
    const modeRadios = document.querySelectorAll('input[name="process-mode"]');
    const incrementalControls = document.getElementById('incremental-controls');
    const rangeControls = document.getElementById('range-controls');
    
    modeRadios.forEach(radio => {
      radio.addEventListener('change', (e) => {
        if (e.target.value === 'incremental') {
          incrementalControls.style.display = 'block';
          rangeControls.style.display = 'none';
        } else {
          incrementalControls.style.display = 'none';
          rangeControls.style.display = 'block';
        }
      });
    });
    
    // Load conversations.json to check status
    try {
      const response = await fetch('conversations.json');
      if (response.ok) {
        const conversations = await response.json();
        const totalConversations = conversations.length;
        
        // Set max values for range inputs
        document.getElementById('range-start').max = totalConversations - 1;
        document.getElementById('range-end').max = totalConversations;
        document.getElementById('range-end').value = Math.min(50, totalConversations);
        
        // Check processing status
        const stats = await this.dbManager.getProcessingStats(totalConversations);
        
        if (stats.processedUpToIndex > 0) {
          note.innerHTML = `
            <strong>Progress:</strong> ${stats.processedUpToIndex.toLocaleString()} of ${totalConversations.toLocaleString()} processed (${stats.percentComplete}%)<br>
            <span style="color: rgba(255,255,255,0.7);">Remaining: ${stats.remaining.toLocaleString()} conversations</span>
          `;
          
          if (stats.remaining > 0) {
            button.textContent = 'Continue Processing';
          } else {
            button.textContent = 'All Processed! (Reprocess if needed)';
          }
        }
      }
    } catch (error) {
      // conversations.json not loaded yet, that's ok
      console.log('Could not load conversations.json:', error);
    }
    
    button.addEventListener('click', () => {
      this.startProcessing();
    });
    
    historyButton.addEventListener('click', async () => {
      await this.showProcessingHistory();
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
      
      // Determine processing mode and parameters
      const mode = document.querySelector('input[name="process-mode"]:checked').value;
      let maxToProcess = null;
      let customRange = null;
      
      if (mode === 'incremental') {
        const processCountInput = document.getElementById('process-count');
        maxToProcess = processCountInput ? parseInt(processCountInput.value) : null;
      } else {
        // Range mode
        const startIndex = parseInt(document.getElementById('range-start').value) || 0;
        const endIndex = parseInt(document.getElementById('range-end').value) || conversations.length;
        customRange = { start: startIndex, end: endIndex };
      }
      
      // Create processor
      this.processor = new MemoryProcessor(this.dbManager);
      
      // Load and apply minimum occurrences setting
      const minOcc = await this.dbManager.getMetadata('minOccurrences');
      if (minOcc) {
        this.processor.minOccurrences = minOcc;
      }
      
      // Process with progress updates
      await this.processor.processConversations(conversations, (progress) => {
        if (progress.alreadyComplete) {
          document.getElementById('processing-status').textContent = 
            `All ${progress.totalInFile.toLocaleString()} conversations already processed!`;
          document.getElementById('progress-fill').style.width = '100%';
          document.getElementById('progress-percent').textContent = '100%';
          document.getElementById('processed-count').textContent = progress.totalInFile.toLocaleString();
          document.getElementById('entities-found').textContent = progress.entitiesFound.toLocaleString();
          return;
        }
        
        // Show current chunk being processed
        const rangeStart = (progress.startIndex + 1).toLocaleString();
        const rangeEnd = (progress.currentGlobalIndex || progress.startIndex).toLocaleString();
        const totalInFile = progress.totalInFile.toLocaleString();
        
        document.getElementById('processed-count').textContent = 
          `${rangeStart} - ${rangeEnd} of ${totalInFile}`;
        document.getElementById('entities-found').textContent = progress.entitiesFound.toLocaleString();
        document.getElementById('progress-percent').textContent = progress.percentage + '%';
        document.getElementById('progress-fill').style.width = progress.percentage + '%';
        
        document.getElementById('processing-status').textContent = 
          `Processing conversations ${rangeStart} to ${progress.endIndex.toLocaleString()}...`;
      }, maxToProcess, customRange);
      
      // Processing complete
      const newProcessedUpTo = await this.dbManager.getMetadata('processedUpToIndex') || 0;
      const remaining = conversations.length - newProcessedUpTo;
      
      document.getElementById('processing-status').textContent = 'Optimizing entities (filtering sparse data)...';
      await new Promise(resolve => setTimeout(resolve, 300));
      
      document.getElementById('processing-status').textContent = 'Building search index...';
      await new Promise(resolve => setTimeout(resolve, 300));
      
      if (remaining > 0) {
        document.getElementById('processing-status').textContent = 
          `Complete! ${remaining.toLocaleString()} conversations remaining. Loading graph...`;
      } else {
        document.getElementById('processing-status').textContent = 
          'Complete! All conversations processed. Loading graph...';
      }
      await new Promise(resolve => setTimeout(resolve, 500));
      
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
    
    document.getElementById('show-history')?.addEventListener('click', async () => {
      await this.showProcessingHistory();
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
    
    document.getElementById('close-history')?.addEventListener('click', () => {
      document.getElementById('history-modal').style.display = 'none';
    });
    
    // Settings actions
    document.getElementById('export-data')?.addEventListener('click', () => {
      this.exportData();
    });
    
    document.getElementById('reprocess-data')?.addEventListener('click', () => {
      if (confirm('This will reprocess all conversations from scratch. Continue?')) {
        this.reprocessData();
      }
    });
    
    document.getElementById('process-new')?.addEventListener('click', () => {
      this.processNewConversations();
    });
    
    document.getElementById('clear-data')?.addEventListener('click', () => {
      if (confirm('This will delete all processed data. Are you sure?')) {
        this.clearData();
      }
    });
    
    // Minimum occurrences setting
    const minOccInput = document.getElementById('setting-min-occurrences');
    if (minOccInput) {
      // Load saved value
      this.dbManager.getMetadata('minOccurrences').then(saved => {
        if (saved) minOccInput.value = saved;
      });
      
      // Save on change
      minOccInput.addEventListener('change', async () => {
        await this.dbManager.saveMetadata('minOccurrences', parseInt(minOccInput.value));
        alert('Setting saved! Reprocess data to apply the filter.');
      });
    }
    
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
   * Reprocess data from scratch
   */
  async reprocessData() {
    if (confirm('This will delete all data and start from conversation 1. Continue?')) {
      await this.dbManager.clearAll();
      await this.dbManager.saveMetadata('processedUpToIndex', 0);
      document.getElementById('main-app').style.display = 'none';
      location.reload(); // Refresh to show welcome screen
    }
  }

  /**
   * Process next batch of conversations
   */
  async processNewConversations() {
    document.getElementById('settings-modal').style.display = 'none';
    document.getElementById('main-app').style.display = 'none';
    location.reload(); // Go back to welcome screen which will show continue option
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

  /**
   * Show processing history modal
   */
  async showProcessingHistory() {
    const modal = document.getElementById('history-modal');
    if (!modal) return;

    try {
      // Load conversations.json to get total count
      const response = await fetch('conversations.json');
      const conversations = response.ok ? await response.json() : [];
      const totalConversations = conversations.length;

      // Get processing stats and history
      const stats = await this.dbManager.getProcessingStats(totalConversations);
      const history = await this.dbManager.getProcessingHistory();
      const processedConvs = await this.dbManager.getAllProcessedConversations();

      // Display stats
      const statsContainer = document.getElementById('history-stats');
      statsContainer.innerHTML = `
        <div class="stat-card">
          <div class="stat-number">${stats.processedUpToIndex.toLocaleString()}</div>
          <div class="stat-label">Last Index Processed</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">${stats.totalProcessed.toLocaleString()}</div>
          <div class="stat-label">Conversations Processed</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">${stats.remaining.toLocaleString()}</div>
          <div class="stat-label">Remaining</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">${stats.percentComplete}%</div>
          <div class="stat-label">Complete</div>
        </div>
      `;

      // Visualize conversation status
      this.renderConversationStatusTimeline(totalConversations, stats.processedUpToIndex);

      // Display history log
      const historyContainer = document.getElementById('history-entries');
      if (history.length === 0) {
        historyContainer.innerHTML = '<p style="color: var(--gray-500); text-align: center; padding: 2rem;">No processing history yet</p>';
      } else {
        historyContainer.innerHTML = history.reverse().map(entry => {
          const date = new Date(entry.timestamp);
          const range = `${entry.startIndex.toLocaleString()} - ${entry.endIndex.toLocaleString()}`;
          const count = entry.conversationsProcessed || (entry.endIndex - entry.startIndex);
          
          return `
            <div style="background: var(--gray-50); padding: 1rem; border-radius: 8px; margin-bottom: 0.5rem; border-left: 4px solid #3b82f6;">
              <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.5rem;">
                <div>
                  <strong style="font-size: 1rem;">Conversations ${range}</strong>
                  <div style="font-size: 0.875rem; color: var(--gray-600); margin-top: 0.25rem;">
                    ${count.toLocaleString()} processed • ${(entry.entitiesFound || 0).toLocaleString()} entities found
                  </div>
                </div>
                <div style="text-align: right; font-size: 0.875rem; color: var(--gray-500);">
                  ${date.toLocaleDateString()}<br>${date.toLocaleTimeString()}
                </div>
              </div>
            </div>
          `;
        }).join('');
      }

      // Show modal
      modal.style.display = 'flex';

      // Setup close button
      const closeBtn = document.getElementById('close-history');
      if (closeBtn) {
        closeBtn.onclick = () => {
          modal.style.display = 'none';
        };
      }
    } catch (error) {
      console.error('Failed to show processing history:', error);
      alert('Failed to load processing history: ' + error.message);
    }
  }

  /**
   * Render conversation status timeline visualization
   */
  renderConversationStatusTimeline(totalConversations, processedUpToIndex) {
    const container = document.getElementById('status-timeline');
    if (!container) return;

    // Create visual blocks showing processed vs unprocessed
    const blocksToShow = Math.min(100, totalConversations); // Show max 100 blocks
    const conversationsPerBlock = Math.ceil(totalConversations / blocksToShow);
    
    let html = '<div style="display: flex; flex-wrap: wrap; gap: 4px;">';
    
    for (let i = 0; i < blocksToShow; i++) {
      const startIdx = i * conversationsPerBlock;
      const endIdx = Math.min((i + 1) * conversationsPerBlock, totalConversations);
      const isProcessed = startIdx < processedUpToIndex;
      
      const color = isProcessed ? '#10b981' : 'var(--gray-300)';
      const title = `Conversations ${startIdx}-${endIdx - 1}${isProcessed ? ' (Processed)' : ' (Not Processed)'}`;
      
      html += `<div style="width: ${100 / Math.min(20, blocksToShow)}%; min-width: 30px; height: 40px; background: ${color}; border-radius: 4px; cursor: help;" title="${title}"></div>`;
    }
    
    html += '</div>';
    
    // Add summary text
    html += `
      <div style="margin-top: 1rem; text-align: center; font-size: 0.875rem; color: var(--gray-600);">
        Showing ${totalConversations.toLocaleString()} total conversations
        ${conversationsPerBlock > 1 ? ` (each block = ~${conversationsPerBlock.toLocaleString()} conversations)` : ''}
      </div>
    `;
    
    container.innerHTML = html;
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

