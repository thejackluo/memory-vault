/**
 * Graph Renderer - Custom Canvas renderer for memory graph visualization
 * Features: Force-directed layout, level-of-detail rendering, interactive controls
 */

class GraphRenderer {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = canvas.width;
    this.height = canvas.height;
    
    // Options
    this.options = {
      nodeRadius: 8,
      nodeRadiusHover: 12,
      edgeWidth: 1,
      edgeWidthHover: 2,
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: 12,
      forceStrength: 0.1,
      centerForce: 0.01,
      repulsionStrength: 300,
      linkDistance: 100,
      damping: 0.8,
      ...options
    };
    
    // Data
    this.nodes = [];
    this.edges = [];
    this.nodeMap = new Map(); // id -> node
    
    // Viewport state
    this.viewport = {
      offsetX: 0,
      offsetY: 0,
      scale: 1,
      minScale: 0.1,
      maxScale: 5
    };
    
    // Interaction state
    this.interaction = {
      isDragging: false,
      isPanning: false,
      draggedNode: null,
      hoveredNode: null,
      selectedNode: null,
      mouseX: 0,
      mouseY: 0,
      lastMouseX: 0,
      lastMouseY: 0
    };
    
    // Animation state
    this.animationFrame = null;
    this.isRunning = false;
    this.simulationAlpha = 1.0;
    this.alphaDecay = 0.02;
    
    // Callbacks
    this.onNodeClick = null;
    this.onNodeHover = null;
    
    // Color palette by entity type
    this.colors = {
      person: '#3b82f6',      // Blue
      project: '#10b981',     // Green
      knowledge: '#f59e0b',   // Amber
      question: '#8b5cf6',    // Purple
      thought: '#ec4899',     // Pink
      pattern: '#06b6d4',     // Cyan
      default: '#6b7280'      // Gray
    };
    
    // Setup event listeners
    this.setupEventListeners();
    
    // Performance optimization
    this.visibleNodes = [];
    this.visibleEdges = [];
  }

  /**
   * Load data into the renderer
   */
  loadData(entities, onComplete) {
    this.nodes = [];
    this.edges = [];
    this.nodeMap.clear();
    
    // Safety check: ensure we have valid canvas dimensions
    if (this.width <= 0 || this.height <= 0) {
      console.warn('Canvas dimensions are invalid, using defaults', this.width, this.height);
      this.width = 800;
      this.height = 600;
    }
    
    // Create nodes
    entities.forEach((entity, index) => {
      const node = {
        id: entity.id,
        label: entity.name,
        type: entity.type,
        data: entity,
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        vx: 0,
        vy: 0,
        fx: null, // Fixed position (when dragged)
        fy: null,
        radius: this.options.nodeRadius,
        visible: true
      };
      this.nodes.push(node);
      this.nodeMap.set(entity.id, node);
    });
    
    // Create edges from entity links
    const edgeSet = new Set(); // Prevent duplicate edges
    entities.forEach(entity => {
      if (entity.links && entity.links.length > 0) {
        entity.links.forEach(targetId => {
          const sourceNode = this.nodeMap.get(entity.id);
          const targetNode = this.nodeMap.get(targetId);
          
          if (sourceNode && targetNode) {
            // Create unique edge key (sorted to prevent A->B and B->A duplicates)
            const edgeKey = [entity.id, targetId].sort().join('_');
            
            if (!edgeSet.has(edgeKey)) {
              this.edges.push({
                source: sourceNode,
                target: targetNode,
                strength: 1
              });
              edgeSet.add(edgeKey);
            }
          }
        });
      }
    });
    
    // Initialize layout
    this.initializeLayout();
    
    if (onComplete) {
      onComplete();
    }
  }

  /**
   * Initialize force-directed layout
   */
  initializeLayout() {
    // Center nodes initially
    const centerX = this.width / 2;
    const centerY = this.height / 2;
    
    this.nodes.forEach(node => {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 200 + 100;
      node.x = centerX + Math.cos(angle) * radius;
      node.y = centerY + Math.sin(angle) * radius;
    });
    
    this.simulationAlpha = 1.0;
  }

  /**
   * Start the simulation/rendering loop
   */
  start() {
    console.log('GraphRenderer.start() called', {
      nodes: this.nodes.length,
      edges: this.edges.length,
      width: this.width,
      height: this.height,
      isRunning: this.isRunning
    });
    
    this.isRunning = true;
    this.animate();
  }

  /**
   * Stop the simulation
   */
  stop() {
    this.isRunning = false;
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }

  /**
   * Main animation loop
   */
  animate() {
    if (!this.isRunning) return;
    
    // Run physics simulation (but only if alpha is high enough)
    if (this.simulationAlpha > 0.01) {
      this.updatePhysics();
      this.simulationAlpha -= this.alphaDecay;
    }
    
    // Always update visible nodes/edges (viewport culling)
    this.updateVisibleElements();
    
    // Always render (even after simulation settles)
    this.render();
    
    // Continue animation loop indefinitely while running
    this.animationFrame = requestAnimationFrame(() => this.animate());
  }

  /**
   * Update physics simulation (force-directed layout)
   */
  updatePhysics() {
    const alpha = this.simulationAlpha;
    
    // Apply forces to each node
    this.nodes.forEach(node => {
      if (node.fx !== null) {
        node.x = node.fx;
        node.y = node.fy;
        node.vx = 0;
        node.vy = 0;
        return;
      }
      
      // Center force (pull towards center)
      const centerX = this.width / 2;
      const centerY = this.height / 2;
      node.vx += (centerX - node.x) * this.options.centerForce * alpha;
      node.vy += (centerY - node.y) * this.options.centerForce * alpha;
      
      // Repulsion force (push away from other nodes)
      this.nodes.forEach(other => {
        if (node === other) return;
        
        const dx = other.x - node.x;
        const dy = other.y - node.y;
        const distSq = dx * dx + dy * dy + 1; // +1 to avoid division by zero
        const dist = Math.sqrt(distSq);
        
        if (dist < 200) { // Only apply repulsion to nearby nodes
          const force = this.options.repulsionStrength / distSq;
          node.vx -= (dx / dist) * force * alpha;
          node.vy -= (dy / dist) * force * alpha;
        }
      });
    });
    
    // Apply link forces (attract connected nodes)
    this.edges.forEach(edge => {
      const dx = edge.target.x - edge.source.x;
      const dy = edge.target.y - edge.source.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const force = (dist - this.options.linkDistance) * this.options.forceStrength * alpha;
      
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      
      if (edge.source.fx === null) {
        edge.source.vx += fx;
        edge.source.vy += fy;
      }
      
      if (edge.target.fx === null) {
        edge.target.vx -= fx;
        edge.target.vy -= fy;
      }
    });
    
    // Update positions
    this.nodes.forEach(node => {
      if (node.fx !== null) return;
      
      // Apply velocity with damping
      node.x += node.vx;
      node.y += node.vy;
      node.vx *= this.options.damping;
      node.vy *= this.options.damping;
    });
  }

  /**
   * Update visible elements based on viewport (culling)
   */
  updateVisibleElements() {
    const margin = 100; // Extra margin for smooth scrolling
    const viewLeft = -this.viewport.offsetX / this.viewport.scale - margin;
    const viewRight = (this.width - this.viewport.offsetX) / this.viewport.scale + margin;
    const viewTop = -this.viewport.offsetY / this.viewport.scale - margin;
    const viewBottom = (this.height - this.viewport.offsetY) / this.viewport.scale + margin;
    
    // Filter visible nodes (check both visibility flag AND viewport bounds)
    const totalNodes = this.nodes.length;
    const visibleFlaggedNodes = this.nodes.filter(node => node.visible !== false);
    
    this.visibleNodes = this.nodes.filter(node => 
      node.visible !== false &&  // Check visibility flag
      node.x >= viewLeft && node.x <= viewRight &&
      node.y >= viewTop && node.y <= viewBottom
    );
    
    // Debug: Log if no nodes are visible (only on first frame or when count changes significantly)
    if (this.visibleNodes.length === 0 && totalNodes > 0) {
      console.warn('No visible nodes!', {
        totalNodes,
        visibleFlagged: visibleFlaggedNodes.length,
        viewport: { viewLeft, viewRight, viewTop, viewBottom },
        scale: this.viewport.scale,
        offset: { x: this.viewport.offsetX, y: this.viewport.offsetY },
        sampleNode: this.nodes[0] ? { x: this.nodes[0].x, y: this.nodes[0].y, visible: this.nodes[0].visible } : null
      });
    }
    
    // Filter visible edges (only if both nodes are visible)
    const visibleNodeIds = new Set(this.visibleNodes.map(n => n.id));
    this.visibleEdges = this.edges.filter(edge =>
      visibleNodeIds.has(edge.source.id) && visibleNodeIds.has(edge.target.id)
    );
  }

  /**
   * Render the graph
   */
  render() {
    // Clear canvas
    this.ctx.clearRect(0, 0, this.width, this.height);
    
    // Safety check: ensure we have valid dimensions
    if (this.width <= 0 || this.height <= 0) {
      console.warn('Cannot render: invalid canvas dimensions', this.width, this.height);
      return;
    }
    
    // Save context state
    this.ctx.save();
    
    // Apply viewport transform
    this.ctx.translate(this.viewport.offsetX, this.viewport.offsetY);
    this.ctx.scale(this.viewport.scale, this.viewport.scale);
    
    // Render edges
    this.renderEdges();
    
    // Render nodes
    this.renderNodes();
    
    // Restore context state
    this.ctx.restore();
  }

  /**
   * Render edges
   */
  renderEdges() {
    this.ctx.strokeStyle = 'rgba(100, 116, 139, 0.2)'; // Slate-500 with transparency
    this.ctx.lineWidth = this.options.edgeWidth / this.viewport.scale;
    
    this.visibleEdges.forEach(edge => {
      this.ctx.beginPath();
      this.ctx.moveTo(edge.source.x, edge.source.y);
      this.ctx.lineTo(edge.target.x, edge.target.y);
      this.ctx.stroke();
    });
  }

  /**
   * Render nodes
   */
  renderNodes() {
    const showLabels = this.viewport.scale > 0.5; // Only show labels when zoomed in
    
    this.visibleNodes.forEach(node => {
      const isHovered = this.interaction.hoveredNode === node;
      const isSelected = this.interaction.selectedNode === node;
      const radius = (isHovered || isSelected) ? this.options.nodeRadiusHover : this.options.nodeRadius;
      
      // Draw node circle
      this.ctx.beginPath();
      this.ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
      this.ctx.fillStyle = this.colors[node.type] || this.colors.default;
      this.ctx.fill();
      
      // Draw border for selected/hovered nodes
      if (isHovered || isSelected) {
        this.ctx.strokeStyle = isSelected ? '#ffffff' : 'rgba(255, 255, 255, 0.6)';
        this.ctx.lineWidth = 2 / this.viewport.scale;
        this.ctx.stroke();
      }
      
      // Draw label
      if (showLabels || isHovered || isSelected) {
        this.ctx.fillStyle = '#1f2937'; // Gray-900
        this.ctx.font = `${this.options.fontSize / this.viewport.scale}px ${this.options.fontFamily}`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'top';
        
        const labelY = node.y + radius + 5;
        const maxWidth = 150 / this.viewport.scale;
        const label = this.truncateText(node.label, maxWidth);
        
        // Draw text background
        const metrics = this.ctx.measureText(label);
        const padding = 4 / this.viewport.scale;
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        this.ctx.fillRect(
          node.x - metrics.width / 2 - padding,
          labelY - padding,
          metrics.width + padding * 2,
          (this.options.fontSize / this.viewport.scale) + padding * 2
        );
        
        // Draw text
        this.ctx.fillStyle = '#1f2937';
        this.ctx.fillText(label, node.x, labelY);
      }
    });
  }

  /**
   * Truncate text to fit width
   */
  truncateText(text, maxWidth) {
    const metrics = this.ctx.measureText(text);
    if (metrics.width <= maxWidth) return text;
    
    let truncated = text;
    while (truncated.length > 0 && this.ctx.measureText(truncated + '...').width > maxWidth) {
      truncated = truncated.slice(0, -1);
    }
    return truncated + '...';
  }

  /**
   * Setup event listeners for interaction
   */
  setupEventListeners() {
    // Mouse down
    this.canvas.addEventListener('mousedown', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      const worldPos = this.screenToWorld(mouseX, mouseY);
      const clickedNode = this.findNodeAtPosition(worldPos.x, worldPos.y);
      
      if (clickedNode) {
        this.interaction.isDragging = true;
        this.interaction.draggedNode = clickedNode;
        clickedNode.fx = clickedNode.x;
        clickedNode.fy = clickedNode.y;
      } else {
        this.interaction.isPanning = true;
      }
      
      this.interaction.lastMouseX = mouseX;
      this.interaction.lastMouseY = mouseY;
    });
    
    // Mouse move
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      if (this.interaction.isDragging && this.interaction.draggedNode) {
        const worldPos = this.screenToWorld(mouseX, mouseY);
        this.interaction.draggedNode.fx = worldPos.x;
        this.interaction.draggedNode.fy = worldPos.y;
        this.simulationAlpha = Math.max(this.simulationAlpha, 0.3); // Reheat simulation
      } else if (this.interaction.isPanning) {
        const dx = mouseX - this.interaction.lastMouseX;
        const dy = mouseY - this.interaction.lastMouseY;
        this.viewport.offsetX += dx;
        this.viewport.offsetY += dy;
      } else {
        // Update hovered node
        const worldPos = this.screenToWorld(mouseX, mouseY);
        const hoveredNode = this.findNodeAtPosition(worldPos.x, worldPos.y);
        
        if (hoveredNode !== this.interaction.hoveredNode) {
          this.interaction.hoveredNode = hoveredNode;
          this.canvas.style.cursor = hoveredNode ? 'pointer' : 'default';
          
          if (this.onNodeHover) {
            this.onNodeHover(hoveredNode);
          }
        }
      }
      
      this.interaction.lastMouseX = mouseX;
      this.interaction.lastMouseY = mouseY;
    });
    
    // Mouse up
    this.canvas.addEventListener('mouseup', (e) => {
      if (this.interaction.isDragging && this.interaction.draggedNode) {
        const draggedNode = this.interaction.draggedNode;
        
        // Check if it was a click (no significant movement)
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const dx = mouseX - this.interaction.lastMouseX;
        const dy = mouseY - this.interaction.lastMouseY;
        
        if (Math.abs(dx) < 5 && Math.abs(dy) < 5) {
          // It's a click
          this.selectNode(draggedNode);
          if (this.onNodeClick) {
            this.onNodeClick(draggedNode);
          }
        }
        
        draggedNode.fx = null;
        draggedNode.fy = null;
      }
      
      this.interaction.isDragging = false;
      this.interaction.isPanning = false;
      this.interaction.draggedNode = null;
    });
    
    // Mouse wheel (zoom)
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      const zoom = e.deltaY > 0 ? 0.9 : 1.1;
      const newScale = Math.max(this.viewport.minScale, 
                               Math.min(this.viewport.maxScale, 
                                       this.viewport.scale * zoom));
      
      // Zoom towards mouse position
      const worldBefore = this.screenToWorld(mouseX, mouseY);
      this.viewport.scale = newScale;
      const worldAfter = this.screenToWorld(mouseX, mouseY);
      
      this.viewport.offsetX += (worldAfter.x - worldBefore.x) * this.viewport.scale;
      this.viewport.offsetY += (worldAfter.y - worldBefore.y) * this.viewport.scale;
    });
    
    // Touch support for mobile
    let lastTouchDistance = null;
    
    this.canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        lastTouchDistance = Math.sqrt(dx * dx + dy * dy);
      }
    });
    
    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (lastTouchDistance) {
          const zoom = distance / lastTouchDistance;
          this.viewport.scale = Math.max(this.viewport.minScale,
                                        Math.min(this.viewport.maxScale,
                                                this.viewport.scale * zoom));
        }
        
        lastTouchDistance = distance;
      }
    });
  }

  /**
   * Convert screen coordinates to world coordinates
   */
  screenToWorld(screenX, screenY) {
    return {
      x: (screenX - this.viewport.offsetX) / this.viewport.scale,
      y: (screenY - this.viewport.offsetY) / this.viewport.scale
    };
  }

  /**
   * Find node at position
   */
  findNodeAtPosition(x, y) {
    for (let i = this.visibleNodes.length - 1; i >= 0; i--) {
      const node = this.visibleNodes[i];
      const dx = x - node.x;
      const dy = y - node.y;
      const distSq = dx * dx + dy * dy;
      const radius = node === this.interaction.hoveredNode ? 
                    this.options.nodeRadiusHover : this.options.nodeRadius;
      
      if (distSq <= radius * radius) {
        return node;
      }
    }
    return null;
  }

  /**
   * Select a node
   */
  selectNode(node) {
    this.interaction.selectedNode = node;
  }

  /**
   * Clear selection
   */
  clearSelection() {
    this.interaction.selectedNode = null;
  }

  /**
   * Focus on a node (center and zoom)
   */
  focusOnNode(nodeId, animated = true) {
    const node = this.nodeMap.get(nodeId);
    if (!node) return;
    
    const targetScale = 1.5;
    const targetX = this.width / 2 - node.x * targetScale;
    const targetY = this.height / 2 - node.y * targetScale;
    
    if (animated) {
      this.animateViewport(targetX, targetY, targetScale);
    } else {
      this.viewport.offsetX = targetX;
      this.viewport.offsetY = targetY;
      this.viewport.scale = targetScale;
    }
    
    this.selectNode(node);
  }

  /**
   * Animate viewport transition
   */
  animateViewport(targetX, targetY, targetScale, duration = 500) {
    const startX = this.viewport.offsetX;
    const startY = this.viewport.offsetY;
    const startScale = this.viewport.scale;
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = this.easeInOutCubic(progress);
      
      this.viewport.offsetX = startX + (targetX - startX) * eased;
      this.viewport.offsetY = startY + (targetY - startY) * eased;
      this.viewport.scale = startScale + (targetScale - startScale) * eased;
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    animate();
  }

  /**
   * Easing function
   */
  easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  /**
   * Reset viewport to show all nodes
   */
  resetViewport() {
    // Calculate bounding box of visible nodes only
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    
    const visibleNodes = this.nodes.filter(node => node.visible !== false);
    
    // Safety check: if no visible nodes, reset to default view
    if (visibleNodes.length === 0) {
      this.viewport.scale = 1;
      this.viewport.offsetX = 0;
      this.viewport.offsetY = 0;
      return;
    }
    
    visibleNodes.forEach(node => {
      minX = Math.min(minX, node.x);
      maxX = Math.max(maxX, node.x);
      minY = Math.min(minY, node.y);
      maxY = Math.max(maxY, node.y);
    });
    
    const width = maxX - minX;
    const height = maxY - minY;
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    
    // Calculate scale to fit all nodes (add padding)
    const padding = 200;
    const scaleX = width > 0 ? this.width / (width + padding) : 1;
    const scaleY = height > 0 ? this.height / (height + padding) : 1;
    const scale = Math.min(scaleX, scaleY, 1);
    
    this.viewport.scale = scale;
    this.viewport.offsetX = this.width / 2 - centerX * scale;
    this.viewport.offsetY = this.height / 2 - centerY * scale;
  }

  /**
   * Resize canvas
   */
  resize(width, height) {
    const oldWidth = this.width;
    const oldHeight = this.height;
    
    this.width = width;
    this.height = height;
    this.canvas.width = width;
    this.canvas.height = height;
    
    // If we have nodes and dimensions changed significantly, rescale their positions
    if (this.nodes.length > 0 && oldWidth > 0 && oldHeight > 0) {
      const scaleX = width / oldWidth;
      const scaleY = height / oldHeight;
      
      this.nodes.forEach(node => {
        node.x *= scaleX;
        node.y *= scaleY;
      });
    }
  }

  /**
   * Filter nodes by type
   */
  filterByType(types) {
    const typeSet = new Set(types);
    this.nodes.forEach(node => {
      node.visible = types.length === 0 || typeSet.has(node.type);
    });
  }

  /**
   * Highlight nodes matching search
   */
  highlightNodes(nodeIds) {
    const idSet = new Set(nodeIds);
    this.nodes.forEach(node => {
      node.highlighted = idSet.has(node.id);
    });
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GraphRenderer;
}

