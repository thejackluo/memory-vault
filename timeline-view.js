/**
 * Timeline View - Horizontal scrollable timeline with entity activity
 * Shows when entities appeared over time with swim lanes by type
 */

class TimelineView {
  constructor(container, dbManager) {
    this.container = container;
    this.dbManager = dbManager;
    this.timeline = [];
    this.entities = new Map();
    this.selectedRange = null;
    this.onDateClick = null;
    this.onEntityClick = null;
    this.onRangeSelect = null;
    
    // Visual settings
    this.swimLanes = {
      person: { label: 'People', color: '#3b82f6', y: 0 },
      project: { label: 'Projects', color: '#10b981', y: 1 },
      knowledge: { label: 'Knowledge', color: '#f59e0b', y: 2 },
      question: { label: 'Questions', color: '#8b5cf6', y: 3 },
      thought: { label: 'Thoughts', color: '#ec4899', y: 4 },
      pattern: { label: 'Patterns', color: '#06b6d4', y: 5 }
    };
    
    this.laneHeight = 40;
    this.dotSize = 8;
    this.dotSizeHover = 12;
    
    // Initialize UI
    this.createUI();
  }

  /**
   * Create the timeline UI
   */
  createUI() {
    this.container.innerHTML = `
      <div class="timeline-wrapper">
        <div class="timeline-controls">
          <button id="timeline-reset" class="timeline-btn">Reset View</button>
          <button id="timeline-today" class="timeline-btn">Today</button>
          <div class="timeline-info">
            <span id="timeline-range-display">Select a date range</span>
          </div>
        </div>
        <div class="timeline-canvas-wrapper">
          <div class="timeline-labels" id="timeline-labels"></div>
          <div class="timeline-scroll" id="timeline-scroll">
            <canvas id="timeline-canvas"></canvas>
          </div>
        </div>
      </div>
    `;
    
    this.canvas = document.getElementById('timeline-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.scrollContainer = document.getElementById('timeline-scroll');
    this.labelsContainer = document.getElementById('timeline-labels');
    this.rangeDisplay = document.getElementById('timeline-range-display');
    
    // Setup event listeners
    this.setupEventListeners();
  }

  /**
   * Load timeline data from database
   */
  async loadData() {
    try {
      // Get timeline and entities
      this.timeline = await this.dbManager.getTimeline();
      const allEntities = await this.dbManager.getAllEntities();
      
      // Create entity map
      this.entities.clear();
      allEntities.forEach(entity => {
        this.entities.set(entity.id, entity);
      });
      
      // Render timeline
      this.render();
    } catch (error) {
      console.error('Failed to load timeline data:', error);
    }
  }

  /**
   * Render the timeline
   */
  render() {
    if (this.timeline.length === 0) {
      this.canvas.width = 0;
      this.canvas.height = 0;
      return;
    }
    
    // Calculate dimensions
    const dayWidth = 30; // Width per day
    const totalDays = this.timeline.length;
    const canvasWidth = Math.max(totalDays * dayWidth, this.scrollContainer.clientWidth);
    const canvasHeight = Object.keys(this.swimLanes).length * this.laneHeight;
    
    // Set canvas size
    this.canvas.width = canvasWidth;
    this.canvas.height = canvasHeight;
    
    // Render swim lanes
    this.renderSwimLanes();
    
    // Render labels
    this.renderLabels();
    
    // Render timeline markers
    this.renderTimelineMarkers(dayWidth);
    
    // Render entity dots
    this.renderEntityDots(dayWidth);
  }

  /**
   * Render swim lane backgrounds
   */
  renderSwimLanes() {
    let y = 0;
    for (const [type, lane] of Object.entries(this.swimLanes)) {
      // Alternating background
      if (lane.y % 2 === 0) {
        this.ctx.fillStyle = '#f9fafb';
      } else {
        this.ctx.fillStyle = '#ffffff';
      }
      this.ctx.fillRect(0, y, this.canvas.width, this.laneHeight);
      
      // Bottom border
      this.ctx.strokeStyle = '#e5e7eb';
      this.ctx.lineWidth = 1;
      this.ctx.beginPath();
      this.ctx.moveTo(0, y + this.laneHeight);
      this.ctx.lineTo(this.canvas.width, y + this.laneHeight);
      this.ctx.stroke();
      
      y += this.laneHeight;
    }
  }

  /**
   * Render lane labels
   */
  renderLabels() {
    this.labelsContainer.innerHTML = '';
    
    for (const [type, lane] of Object.entries(this.swimLanes)) {
      const label = document.createElement('div');
      label.className = 'timeline-label';
      label.style.height = `${this.laneHeight}px`;
      label.style.lineHeight = `${this.laneHeight}px`;
      label.style.borderLeft = `4px solid ${lane.color}`;
      label.textContent = lane.label;
      this.labelsContainer.appendChild(label);
    }
  }

  /**
   * Render timeline markers (dates)
   */
  renderTimelineMarkers(dayWidth) {
    this.ctx.font = '11px Inter, system-ui, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'top';
    
    this.timeline.forEach((entry, index) => {
      const x = index * dayWidth + dayWidth / 2;
      const date = new Date(entry.date);
      
      // Show date label for first day of month or every 7 days
      const showLabel = date.getDate() === 1 || index % 7 === 0;
      
      if (showLabel) {
        // Draw vertical line
        this.ctx.strokeStyle = '#d1d5db';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(x, 0);
        this.ctx.lineTo(x, this.canvas.height);
        this.ctx.stroke();
        
        // Draw date text at top
        this.ctx.fillStyle = '#6b7280';
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        this.ctx.save();
        this.ctx.translate(x, -20);
        this.ctx.rotate(-Math.PI / 4);
        this.ctx.fillText(dateStr, 0, 0);
        this.ctx.restore();
      } else {
        // Draw subtle tick mark
        this.ctx.strokeStyle = '#e5e7eb';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(x, 0);
        this.ctx.lineTo(x, 10);
        this.ctx.stroke();
      }
    });
  }

  /**
   * Render entity dots on timeline
   */
  renderEntityDots(dayWidth) {
    this.timeline.forEach((entry, dateIndex) => {
      const x = dateIndex * dayWidth + dayWidth / 2;
      
      // Group entities by type for this date
      const entitiesByType = {};
      entry.entities.forEach(entityId => {
        const entity = this.entities.get(entityId);
        if (entity && this.swimLanes[entity.type]) {
          if (!entitiesByType[entity.type]) {
            entitiesByType[entity.type] = [];
          }
          entitiesByType[entity.type].push(entity);
        }
      });
      
      // Draw dots for each type
      for (const [type, entities] of Object.entries(entitiesByType)) {
        const lane = this.swimLanes[type];
        const y = lane.y * this.laneHeight + this.laneHeight / 2;
        
        // Draw a single dot representing all entities of this type on this date
        // Size based on number of entities (max 3x)
        const size = Math.min(this.dotSize + entities.length, this.dotSize * 3);
        
        this.ctx.beginPath();
        this.ctx.arc(x, y, size / 2, 0, Math.PI * 2);
        this.ctx.fillStyle = lane.color;
        this.ctx.fill();
        
        // Draw count if > 1
        if (entities.length > 1) {
          this.ctx.fillStyle = '#ffffff';
          this.ctx.font = 'bold 10px Inter, system-ui, sans-serif';
          this.ctx.textAlign = 'center';
          this.ctx.textBaseline = 'middle';
          this.ctx.fillText(entities.length, x, y);
        }
      }
    });
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Reset button
    document.getElementById('timeline-reset')?.addEventListener('click', () => {
      this.selectedRange = null;
      this.rangeDisplay.textContent = 'Select a date range';
      if (this.onRangeSelect) {
        this.onRangeSelect(null);
      }
    });
    
    // Today button
    document.getElementById('timeline-today')?.addEventListener('click', () => {
      const today = new Date().toISOString().split('T')[0];
      const index = this.timeline.findIndex(e => e.date === today);
      if (index >= 0) {
        const scrollPos = index * 30 - this.scrollContainer.clientWidth / 2;
        this.scrollContainer.scrollLeft = scrollPos;
      }
    });
    
    // Canvas interactions
    let isSelecting = false;
    let selectionStart = null;
    
    this.canvas.addEventListener('mousedown', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left + this.scrollContainer.scrollLeft;
      const y = e.clientY - rect.top;
      
      isSelecting = true;
      selectionStart = { x, y };
    });
    
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left + this.scrollContainer.scrollLeft;
      const y = e.clientY - rect.top;
      
      // Show tooltip on hover
      this.showTooltip(x, y, e.clientX, e.clientY);
      
      if (isSelecting && selectionStart) {
        // Visual feedback for range selection
        this.canvas.style.cursor = 'col-resize';
      }
    });
    
    this.canvas.addEventListener('mouseup', (e) => {
      if (isSelecting && selectionStart) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left + this.scrollContainer.scrollLeft;
        
        const dayWidth = 30;
        const startDay = Math.floor(selectionStart.x / dayWidth);
        const endDay = Math.floor(x / dayWidth);
        
        if (startDay !== endDay) {
          // Range selection
          const [minDay, maxDay] = [Math.min(startDay, endDay), Math.max(startDay, endDay)];
          if (minDay >= 0 && maxDay < this.timeline.length) {
            this.selectedRange = {
              start: this.timeline[minDay].date,
              end: this.timeline[maxDay].date
            };
            
            this.rangeDisplay.textContent = `${this.selectedRange.start} to ${this.selectedRange.end}`;
            
            if (this.onRangeSelect) {
              this.onRangeSelect(this.selectedRange);
            }
          }
        } else {
          // Single date click
          if (startDay >= 0 && startDay < this.timeline.length) {
            const entry = this.timeline[startDay];
            if (this.onDateClick) {
              this.onDateClick(entry);
            }
          }
        }
      }
      
      isSelecting = false;
      selectionStart = null;
      this.canvas.style.cursor = 'default';
    });
    
    // Resize observer
    if (window.ResizeObserver) {
      const resizeObserver = new ResizeObserver(() => {
        this.render();
      });
      resizeObserver.observe(this.container);
    }
  }

  /**
   * Show tooltip on hover
   */
  showTooltip(canvasX, canvasY, screenX, screenY) {
    const dayWidth = 30;
    const dayIndex = Math.floor(canvasX / dayWidth);
    const laneIndex = Math.floor(canvasY / this.laneHeight);
    
    if (dayIndex < 0 || dayIndex >= this.timeline.length) {
      this.hideTooltip();
      return;
    }
    
    const entry = this.timeline[dayIndex];
    const laneTypes = Object.keys(this.swimLanes);
    
    if (laneIndex < 0 || laneIndex >= laneTypes.length) {
      this.hideTooltip();
      return;
    }
    
    const laneType = laneTypes[laneIndex];
    const entitiesOfType = entry.entities
      .map(id => this.entities.get(id))
      .filter(e => e && e.type === laneType);
    
    if (entitiesOfType.length > 0) {
      this.showTooltipAt(screenX, screenY, {
        date: entry.date,
        type: this.swimLanes[laneType].label,
        entities: entitiesOfType,
        conversations: entry.conversations.length
      });
    } else {
      this.hideTooltip();
    }
  }

  /**
   * Show tooltip at position
   */
  showTooltipAt(x, y, data) {
    let tooltip = document.getElementById('timeline-tooltip');
    if (!tooltip) {
      tooltip = document.createElement('div');
      tooltip.id = 'timeline-tooltip';
      tooltip.className = 'timeline-tooltip';
      document.body.appendChild(tooltip);
    }
    
    const entityList = data.entities.slice(0, 5).map(e => `• ${e.name}`).join('<br>');
    const moreText = data.entities.length > 5 ? `<br>...and ${data.entities.length - 5} more` : '';
    
    tooltip.innerHTML = `
      <div class="tooltip-date">${data.date}</div>
      <div class="tooltip-type">${data.type}</div>
      <div class="tooltip-entities">${entityList}${moreText}</div>
      <div class="tooltip-convs">${data.conversations} conversation${data.conversations !== 1 ? 's' : ''}</div>
    `;
    
    tooltip.style.left = (x + 10) + 'px';
    tooltip.style.top = (y + 10) + 'px';
    tooltip.style.display = 'block';
  }

  /**
   * Hide tooltip
   */
  hideTooltip() {
    const tooltip = document.getElementById('timeline-tooltip');
    if (tooltip) {
      tooltip.style.display = 'none';
    }
  }

  /**
   * Filter timeline by entity type
   */
  filterByType(types) {
    // Re-render with filtered types
    this.render();
  }

  /**
   * Highlight specific date
   */
  highlightDate(date) {
    const index = this.timeline.findIndex(e => e.date === date);
    if (index >= 0) {
      const scrollPos = index * 30 - this.scrollContainer.clientWidth / 2;
      this.scrollContainer.scrollTo({
        left: scrollPos,
        behavior: 'smooth'
      });
      
      // Add visual highlight
      // TODO: Draw highlight overlay on canvas
    }
  }

  /**
   * Get entities in date range
   */
  getEntitiesInRange(startDate, endDate) {
    const entitySet = new Set();
    
    this.timeline.forEach(entry => {
      if (entry.date >= startDate && entry.date <= endDate) {
        entry.entities.forEach(id => entitySet.add(id));
      }
    });
    
    return Array.from(entitySet).map(id => this.entities.get(id)).filter(e => e);
  }

  /**
   * Get conversations in date range
   */
  getConversationsInRange(startDate, endDate) {
    const convIds = [];
    
    this.timeline.forEach(entry => {
      if (entry.date >= startDate && entry.date <= endDate) {
        convIds.push(...entry.conversations);
      }
    });
    
    return convIds;
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TimelineView;
}

