/**
 * Entity Panel - Detail panel showing entity information, backlinks, and relationships
 * Similar to Obsidian/Logseq panels
 */

class EntityPanel {
  constructor(container, dbManager) {
    this.container = container;
    this.dbManager = dbManager;
    this.currentEntity = null;
    this.onEntityClick = null;
    this.onConversationClick = null;
    this.onClose = null;
    
    // Create UI
    this.createUI();
  }

  /**
   * Create the panel UI
   */
  createUI() {
    this.container.innerHTML = `
      <div class="entity-panel" id="entity-panel" style="display: none;">
        <div class="entity-panel-header">
          <h2 id="entity-name" class="entity-name"></h2>
          <button id="entity-close" class="entity-close-btn" title="Close">✕</button>
        </div>
        
        <div class="entity-panel-content">
          <div class="entity-metadata">
            <div class="entity-type-badge" id="entity-type"></div>
            <div class="entity-stats">
              <span id="entity-occurrences"></span>
              <span id="entity-date-range"></span>
            </div>
          </div>
          
          <div class="entity-description" id="entity-description"></div>
          
          <div class="entity-section">
            <h3 class="section-title">
              <span class="section-icon">🔗</span>
              Related Entities (<span id="related-count">0</span>)
            </h3>
            <div id="related-entities" class="related-entities-list"></div>
          </div>
          
          <div class="entity-section">
            <h3 class="section-title">
              <span class="section-icon">💬</span>
              Conversations (<span id="conversations-count">0</span>)
            </h3>
            <div id="entity-conversations" class="conversations-list"></div>
          </div>
          
          <div class="entity-section">
            <h3 class="section-title">
              <span class="section-icon">📅</span>
              Timeline
            </h3>
            <div id="entity-timeline" class="entity-timeline"></div>
          </div>
          
          <div class="entity-section">
            <h3 class="section-title">
              <span class="section-icon">⬅</span>
              Backlinks
            </h3>
            <div id="entity-backlinks" class="backlinks-list"></div>
          </div>
        </div>
      </div>
    `;
    
    this.panel = document.getElementById('entity-panel');
    this.setupEventListeners();
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Close button
    document.getElementById('entity-close')?.addEventListener('click', () => {
      this.hide();
      if (this.onClose) {
        this.onClose();
      }
    });
    
    // Close on escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isVisible()) {
        this.hide();
        if (this.onClose) {
          this.onClose();
        }
      }
    });
  }

  /**
   * Show entity details
   */
  async show(entity) {
    this.currentEntity = entity;
    this.panel.style.display = 'flex';
    
    // Update basic info
    document.getElementById('entity-name').textContent = entity.name;
    document.getElementById('entity-type').textContent = entity.type;
    document.getElementById('entity-type').className = `entity-type-badge entity-type-${entity.type}`;
    
    // Update description
    const descEl = document.getElementById('entity-description');
    if (entity.description && entity.description.trim()) {
      descEl.textContent = entity.description;
      descEl.style.display = 'block';
    } else {
      descEl.style.display = 'none';
    }
    
    // Update stats
    document.getElementById('entity-occurrences').textContent = 
      `${entity.occurrences} occurrence${entity.occurrences !== 1 ? 's' : ''}`;
    
    const firstDate = new Date(entity.firstSeen * 1000).toLocaleDateString();
    const lastDate = new Date(entity.lastSeen * 1000).toLocaleDateString();
    document.getElementById('entity-date-range').textContent = 
      `${firstDate} → ${lastDate}`;
    
    // Load and display related entities
    await this.loadRelatedEntities(entity);
    
    // Load and display conversations
    await this.loadConversations(entity);
    
    // Load and display timeline
    await this.loadTimeline(entity);
    
    // Load and display backlinks
    await this.loadBacklinks(entity);
    
    // Animate in
    this.panel.classList.add('entity-panel-visible');
  }

  /**
   * Hide the panel
   */
  hide() {
    this.panel.classList.remove('entity-panel-visible');
    setTimeout(() => {
      this.panel.style.display = 'none';
      this.currentEntity = null;
    }, 300);
  }

  /**
   * Check if panel is visible
   */
  isVisible() {
    return this.panel.style.display !== 'none';
  }

  /**
   * Load and display related entities
   */
  async loadRelatedEntities(entity) {
    const container = document.getElementById('related-entities');
    const countEl = document.getElementById('related-count');
    
    if (!entity.links || entity.links.length === 0) {
      container.innerHTML = '<div class="empty-state">No related entities</div>';
      countEl.textContent = '0';
      return;
    }
    
    // Get related entity details
    const relatedEntities = [];
    for (const linkedId of entity.links) {
      const linkedEntity = await this.dbManager.getEntity(linkedId);
      if (linkedEntity) {
        relatedEntities.push(linkedEntity);
      }
    }
    
    // Sort by occurrences (most common first)
    relatedEntities.sort((a, b) => b.occurrences - a.occurrences);
    
    countEl.textContent = relatedEntities.length;
    
    // Render related entities
    container.innerHTML = relatedEntities.map(related => `
      <div class="related-entity-item" data-entity-id="${related.id}">
        <div class="related-entity-dot" style="background-color: ${this.getTypeColor(related.type)}"></div>
        <div class="related-entity-info">
          <div class="related-entity-name">${this.escapeHtml(related.name)}</div>
          <div class="related-entity-meta">${related.type} • ${related.occurrences} occurrences</div>
        </div>
        <button class="related-entity-view-btn" data-entity-id="${related.id}" title="View details">→</button>
      </div>
    `).join('');
    
    // Add click handlers
    container.querySelectorAll('.related-entity-view-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const entityId = btn.dataset.entityId;
        this.navigateToEntity(entityId);
      });
    });
    
    container.querySelectorAll('.related-entity-item').forEach(item => {
      item.addEventListener('click', () => {
        const entityId = item.dataset.entityId;
        this.navigateToEntity(entityId);
      });
    });
  }

  /**
   * Load and display conversations
   */
  async loadConversations(entity) {
    const container = document.getElementById('entity-conversations');
    const countEl = document.getElementById('conversations-count');
    
    if (!entity.conversations || entity.conversations.length === 0) {
      container.innerHTML = '<div class="empty-state">No conversations</div>';
      countEl.textContent = '0';
      return;
    }
    
    countEl.textContent = entity.conversations.length;
    
    // Get conversation details (limit to 20 most recent)
    const conversations = [];
    const maxConvs = 20;
    const convIds = entity.conversations.slice(-maxConvs);
    
    for (const convId of convIds) {
      const conv = await this.dbManager.getConversation(convId);
      if (conv) {
        conversations.push(conv);
      }
    }
    
    // Sort by timestamp (most recent first)
    conversations.sort((a, b) => b.timestamp - a.timestamp);
    
    // Render conversations
    container.innerHTML = conversations.map(conv => {
      const date = new Date(conv.timestamp * 1000).toLocaleDateString();
      return `
        <div class="conversation-item" data-conv-id="${conv.id}">
          <div class="conversation-icon">💬</div>
          <div class="conversation-info">
            <div class="conversation-title">${this.escapeHtml(conv.title)}</div>
            <div class="conversation-date">${date}</div>
          </div>
        </div>
      `;
    }).join('');
    
    if (entity.conversations.length > maxConvs) {
      container.innerHTML += `
        <div class="show-more-btn">
          +${entity.conversations.length - maxConvs} more conversations
        </div>
      `;
    }
    
    // Add click handlers
    container.querySelectorAll('.conversation-item').forEach(item => {
      item.addEventListener('click', () => {
        const convId = item.dataset.convId;
        if (this.onConversationClick) {
          this.onConversationClick(convId);
        }
      });
    });
  }

  /**
   * Load and display timeline
   */
  async loadTimeline(entity) {
    const container = document.getElementById('entity-timeline');
    
    // Get full timeline
    const fullTimeline = await this.dbManager.getTimeline();
    
    // Filter timeline entries that include this entity
    const entityTimeline = fullTimeline.filter(entry => 
      entry.entities.includes(entity.id)
    );
    
    if (entityTimeline.length === 0) {
      container.innerHTML = '<div class="empty-state">No timeline data</div>';
      return;
    }
    
    // Group by month for compact display
    const byMonth = {};
    entityTimeline.forEach(entry => {
      const date = new Date(entry.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!byMonth[monthKey]) {
        byMonth[monthKey] = [];
      }
      byMonth[monthKey].push(entry);
    });
    
    // Render timeline
    container.innerHTML = Object.entries(byMonth)
      .sort((a, b) => b[0].localeCompare(a[0])) // Most recent first
      .map(([monthKey, entries]) => {
        const date = new Date(monthKey + '-01');
        const monthName = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
        return `
          <div class="timeline-month">
            <div class="timeline-month-name">${monthName}</div>
            <div class="timeline-month-count">${entries.length} ${entries.length === 1 ? 'day' : 'days'}</div>
          </div>
        `;
      })
      .join('');
  }

  /**
   * Load and display backlinks
   */
  async loadBacklinks(entity) {
    const container = document.getElementById('entity-backlinks');
    
    // Find all entities that link to this entity
    const allEntities = await this.dbManager.getAllEntities();
    const backlinks = allEntities.filter(e => 
      e.links && e.links.includes(entity.id)
    );
    
    if (backlinks.length === 0) {
      container.innerHTML = '<div class="empty-state">No backlinks</div>';
      return;
    }
    
    // Sort by occurrences
    backlinks.sort((a, b) => b.occurrences - a.occurrences);
    
    // Render backlinks
    container.innerHTML = backlinks.map(backlink => `
      <div class="backlink-item" data-entity-id="${backlink.id}">
        <div class="backlink-dot" style="background-color: ${this.getTypeColor(backlink.type)}"></div>
        <div class="backlink-info">
          <div class="backlink-name">${this.escapeHtml(backlink.name)}</div>
          <div class="backlink-type">${backlink.type}</div>
        </div>
      </div>
    `).join('');
    
    // Add click handlers
    container.querySelectorAll('.backlink-item').forEach(item => {
      item.addEventListener('click', () => {
        const entityId = item.dataset.entityId;
        this.navigateToEntity(entityId);
      });
    });
  }

  /**
   * Navigate to another entity
   */
  async navigateToEntity(entityId) {
    const entity = await this.dbManager.getEntity(entityId);
    if (entity) {
      if (this.onEntityClick) {
        this.onEntityClick(entity);
      }
      await this.show(entity);
    }
  }

  /**
   * Get color for entity type
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
   * Update panel for current entity (refresh data)
   */
  async refresh() {
    if (this.currentEntity) {
      const updatedEntity = await this.dbManager.getEntity(this.currentEntity.id);
      if (updatedEntity) {
        await this.show(updatedEntity);
      }
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = EntityPanel;
}

