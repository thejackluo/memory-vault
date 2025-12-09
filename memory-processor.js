/**
 * Memory Processor - Incremental conversation processor with hybrid entity extraction
 * Processes conversations in batches and extracts entities (people, projects, knowledge, questions, thoughts, patterns)
 */

class MemoryProcessor {
  constructor(dbManager) {
    this.dbManager = dbManager;
    this.batchSize = 500; // Process 500 conversations at a time (increased for speed)
    this.processedCount = 0;
    this.totalConversations = 0;
    this.entities = new Map(); // entity_id -> entity object
    this.conversationEntities = new Map(); // conv_id -> [entity_ids]
    this.timeline = new Map(); // date -> {entities, conversations}
    this.onProgress = null; // Callback for progress updates
    this.minOccurrences = 2; // Minimum occurrences to keep entity (filter sparse entities)
  }

  /**
   * Main processing entry point
   */
  async processConversations(conversations, onProgress, resumeMode = false) {
    this.onProgress = onProgress;
    
    // Load existing entities if resuming
    if (resumeMode) {
      await this.loadExistingEntities();
    }
    
    // Filter out already processed conversations
    const conversationsToProcess = await this.filterNewConversations(conversations);
    
    if (conversationsToProcess.length === 0) {
      if (this.onProgress) {
        this.onProgress({
          processed: conversations.length,
          total: conversations.length,
          percentage: 100,
          entitiesFound: this.entities.size,
          recentBatch: 0,
          alreadyProcessed: true
        });
      }
      return {
        entities: Array.from(this.entities.values()),
        conversations: this.conversationEntities,
        timeline: this.buildTimeline()
      };
    }
    
    this.totalConversations = conversationsToProcess.length;
    this.processedCount = 0;

    // Process in batches
    for (let i = 0; i < conversationsToProcess.length; i += this.batchSize) {
      const batch = conversationsToProcess.slice(i, i + this.batchSize);
      await this.processBatch(batch);
      
      this.processedCount = Math.min(i + this.batchSize, conversationsToProcess.length);
      
      // Report progress
      if (this.onProgress) {
        this.onProgress({
          processed: this.processedCount,
          total: this.totalConversations,
          percentage: (this.processedCount / this.totalConversations * 100).toFixed(1),
          entitiesFound: this.entities.size,
          recentBatch: batch.length,
          resumeMode: resumeMode
        });
      }

      // Allow UI to update (shorter delay for larger batches)
      await this.sleep(5);
    }

    // Filter out sparse entities before saving
    this.filterSparseEntities();

    // Save all data to IndexedDB
    await this.saveToDatabase();
    
    // Mark as processed
    await this.dbManager.saveMetadata('lastProcessedTime', Date.now());
    await this.dbManager.saveMetadata('totalConversationsProcessed', conversations.length);

    return {
      entities: Array.from(this.entities.values()),
      conversations: this.conversationEntities,
      timeline: this.buildTimeline()
    };
  }

  /**
   * Load existing entities from database (for resume mode)
   */
  async loadExistingEntities() {
    const existingEntities = await this.dbManager.getAllEntities();
    existingEntities.forEach(entity => {
      this.entities.set(entity.id, entity);
    });
    
    const existingConversations = await this.dbManager.getAllConversations();
    existingConversations.forEach(conv => {
      this.conversationEntities.set(conv.id, conv);
    });
  }

  /**
   * Filter out already processed conversations
   */
  async filterNewConversations(conversations) {
    const processedConvIds = new Set();
    
    // Get all processed conversation IDs from database
    const existingConvs = await this.dbManager.getAllConversations();
    existingConvs.forEach(conv => processedConvIds.add(conv.id));
    
    // Return only new conversations
    return conversations.filter(conv => {
      const convId = conv.id || conv.conversation_id;
      return !processedConvIds.has(convId);
    });
  }

  /**
   * Filter out sparse entities (low occurrence count)
   */
  filterSparseEntities() {
    const toDelete = [];
    
    for (const [entityId, entity] of this.entities) {
      if (entity.occurrences < this.minOccurrences) {
        toDelete.push(entityId);
        
        // Remove from conversation entities
        for (const [convId, convData] of this.conversationEntities) {
          convData.entities = convData.entities.filter(id => id !== entityId);
        }
      }
    }
    
    // Remove sparse entities
    toDelete.forEach(id => this.entities.delete(id));
    
    // Remove broken links
    for (const entity of this.entities.values()) {
      entity.links = entity.links.filter(linkId => this.entities.has(linkId));
    }
  }

  /**
   * Process a batch of conversations
   */
  async processBatch(batch) {
    for (const conversation of batch) {
      await this.processConversation(conversation);
    }
  }

  /**
   * Process a single conversation
   */
  async processConversation(conversation) {
    const convId = conversation.id || conversation.conversation_id;
    const title = conversation.title || 'Untitled';
    const timestamp = conversation.create_time || conversation.update_time || Date.now() / 1000;
    const date = new Date(timestamp * 1000).toISOString().split('T')[0];

    // Extract messages from conversation
    const messages = this.extractMessages(conversation);
    const fullText = messages.map(m => m.content).join('\n\n');

    // Extract entities from full conversation text
    const extractedEntities = this.extractEntities(fullText, messages);

    // Store conversation metadata
    const convData = {
      id: convId,
      title: title,
      timestamp: timestamp,
      date: date,
      entities: []
    };

    // Process each extracted entity
    for (const extracted of extractedEntities) {
      const entityId = this.getOrCreateEntity(extracted, convId, timestamp);
      convData.entities.push(entityId);
      
      // Update entity-conversation links
      const entity = this.entities.get(entityId);
      if (!entity.conversations.includes(convId)) {
        entity.conversations.push(convId);
      }
      entity.lastSeen = Math.max(entity.lastSeen, timestamp);
      entity.occurrences++;
    }

    // Store conversation data
    this.conversationEntities.set(convId, convData);

    // Update timeline
    this.updateTimeline(date, convData.entities, convId);
  }

  /**
   * Extract messages from conversation mapping structure
   */
  extractMessages(conversation) {
    const messages = [];
    const mapping = conversation.mapping || {};
    
    // Find all nodes with messages
    for (const nodeId in mapping) {
      const node = mapping[nodeId];
      if (node.message && node.message.content && node.message.content.parts) {
        const parts = node.message.content.parts;
        const role = node.message.author?.role || 'unknown';
        
        for (const part of parts) {
          if (typeof part === 'string' && part.trim().length > 0) {
            messages.push({
              role: role,
              content: part,
              timestamp: node.message.create_time
            });
          }
        }
      }
    }
    
    return messages;
  }

  /**
   * Extract entities from text using hybrid approach (rule-based)
   */
  extractEntities(text, messages) {
    const entities = [];
    
    // Extract people
    entities.push(...this.extractPeople(text));
    
    // Extract projects
    entities.push(...this.extractProjects(text));
    
    // Extract knowledge
    entities.push(...this.extractKnowledge(text));
    
    // Extract questions
    entities.push(...this.extractQuestions(text, messages));
    
    // Extract thoughts
    entities.push(...this.extractThoughts(text));
    
    // Extract patterns (requires multiple conversations, done in post-processing)
    
    return entities;
  }

  /**
   * Extract people mentions
   */
  extractPeople(text) {
    const people = [];
    
    // Pattern 1: Capitalized names (simple heuristic)
    const namePattern = /\b([A-Z][a-z]+ (?:[A-Z][a-z]+))\b/g;
    let match;
    while ((match = namePattern.exec(text)) !== null) {
      const name = match[1];
      // Filter out common false positives
      if (!this.isCommonNonName(name)) {
        people.push({
          type: 'person',
          name: name,
          context: this.getContext(text, match.index, 100)
        });
      }
    }
    
    // Pattern 2: Single capitalized names preceded by person indicators
    const personIndicators = /(?:with|by|from|to|for|about|ask|meet|talk|call|email|message)\s+([A-Z][a-z]+)\b/gi;
    while ((match = personIndicators.exec(text)) !== null) {
      const name = match[1];
      if (name.length > 2 && !this.isCommonNonName(name)) {
        people.push({
          type: 'person',
          name: name,
          context: this.getContext(text, match.index, 100)
        });
      }
    }
    
    return people;
  }

  /**
   * Extract project mentions
   */
  extractProjects(text) {
    const projects = [];
    
    // Pattern 1: "working on X", "building X", "project called X"
    const projectPatterns = [
      /(?:working on|building|creating|developing|making)\s+(?:a\s+)?(?:new\s+)?([A-Z][a-zA-Z\s]{3,30})/gi,
      /(?:project|app|application|system|tool|website|platform)\s+(?:called|named)\s+([A-Z][a-zA-Z\s]{3,30})/gi,
      /(?:my|our|the)\s+([A-Z][a-zA-Z\s]{3,30})\s+(?:project|app|application|system|tool)/gi
    ];
    
    for (const pattern of projectPatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const name = match[1].trim();
        if (name.length > 3 && name.length < 50) {
          projects.push({
            type: 'project',
            name: name,
            context: this.getContext(text, match.index, 150)
          });
        }
      }
    }
    
    return projects;
  }

  /**
   * Extract knowledge/learnings
   */
  extractKnowledge(text) {
    const knowledge = [];
    
    // Pattern: Learning indicators
    const learningPatterns = [
      /(?:I learned|I discovered|I found out|I realized|I understood)\s+(?:that\s+)?([^.!?]{10,200})[.!?]/gi,
      /(?:TIL|Today I learned):\s*([^.!?\n]{10,200})[.!?\n]/gi,
      /(?:interesting|fascinating|cool):\s+([^.!?\n]{10,200})[.!?\n]/gi
    ];
    
    for (const pattern of learningPatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const concept = match[1].trim();
        knowledge.push({
          type: 'knowledge',
          name: this.summarize(concept, 50),
          description: concept,
          context: this.getContext(text, match.index, 150)
        });
      }
    }
    
    return knowledge;
  }

  /**
   * Extract questions
   */
  extractQuestions(text, messages) {
    const questions = [];
    
    // Find messages from user that contain questions
    for (const message of messages) {
      if (message.role === 'user') {
        const questionMatches = message.content.match(/[^.!?]*\?/g);
        if (questionMatches) {
          for (const question of questionMatches) {
            const q = question.trim();
            if (q.length > 10) {
              questions.push({
                type: 'question',
                name: this.summarize(q, 60),
                description: q,
                context: q
              });
            }
          }
        }
      }
    }
    
    return questions;
  }

  /**
   * Extract thoughts/ideas
   */
  extractThoughts(text) {
    const thoughts = [];
    
    // Pattern: First-person reflections and opinions
    const thoughtPatterns = [
      /(?:I think|I believe|I feel|my opinion is|in my view)\s+(?:that\s+)?([^.!?]{10,200})[.!?]/gi,
      /(?:my idea is|my thought is|what if)\s+([^.!?]{10,200})[.!?]/gi
    ];
    
    for (const pattern of thoughtPatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const thought = match[1].trim();
        thoughts.push({
          type: 'thought',
          name: this.summarize(thought, 50),
          description: thought,
          context: this.getContext(text, match.index, 150)
        });
      }
    }
    
    return thoughts;
  }

  /**
   * Get or create entity, handle duplicates
   */
  getOrCreateEntity(extracted, convId, timestamp) {
    // Generate a unique key for deduplication
    const key = this.normalizeEntityName(extracted.name);
    const existingId = this.findExistingEntity(key, extracted.type);
    
    if (existingId) {
      return existingId;
    }
    
    // Create new entity
    const entityId = `${extracted.type}_${key}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const entity = {
      id: entityId,
      type: extracted.type,
      name: extracted.name,
      description: extracted.description || extracted.context || '',
      firstSeen: timestamp,
      lastSeen: timestamp,
      occurrences: 0,
      conversations: [],
      links: [], // Will be computed later
      metadata: {
        normalizedKey: key,
        context: extracted.context
      }
    };
    
    this.entities.set(entityId, entity);
    return entityId;
  }

  /**
   * Find existing entity by normalized key and type (with fuzzy matching)
   */
  findExistingEntity(normalizedKey, type) {
    // First try exact match
    for (const [id, entity] of this.entities) {
      if (entity.type === type && entity.metadata.normalizedKey === normalizedKey) {
        return id;
      }
    }
    
    // Try fuzzy match for similar names (edit distance <= 2)
    if (normalizedKey.length > 5) {
      for (const [id, entity] of this.entities) {
        if (entity.type === type) {
          const distance = this.levenshteinDistance(
            entity.metadata.normalizedKey, 
            normalizedKey
          );
          // Allow small variations (typos, plurals, etc.)
          if (distance <= 2) {
            return id;
          }
        }
      }
    }
    
    return null;
  }

  /**
   * Calculate Levenshtein distance for fuzzy matching
   */
  levenshteinDistance(str1, str2) {
    const len1 = str1.length;
    const len2 = str2.length;
    const matrix = [];

    if (len1 === 0) return len2;
    if (len2 === 0) return len1;

    for (let i = 0; i <= len1; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        );
      }
    }

    return matrix[len1][len2];
  }

  /**
   * Normalize entity name for deduplication
   */
  normalizeEntityName(name) {
    return name.toLowerCase().trim().replace(/[^\w\s]/g, '');
  }

  /**
   * Update timeline
   */
  updateTimeline(date, entityIds, convId) {
    if (!this.timeline.has(date)) {
      this.timeline.set(date, {
        date: date,
        entities: new Set(),
        conversations: []
      });
    }
    
    const entry = this.timeline.get(date);
    entityIds.forEach(id => entry.entities.add(id));
    entry.conversations.push(convId);
  }

  /**
   * Build timeline array from map
   */
  buildTimeline() {
    const timeline = [];
    for (const [date, data] of this.timeline) {
      timeline.push({
        date: date,
        entities: Array.from(data.entities),
        conversations: data.conversations
      });
    }
    return timeline.sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Compute entity relationships based on co-occurrence in conversations
   */
  computeRelationships() {
    for (const [convId, convData] of this.conversationEntities) {
      const entities = convData.entities;
      
      // Create links between entities that appear in the same conversation
      for (let i = 0; i < entities.length; i++) {
        for (let j = i + 1; j < entities.length; j++) {
          const entity1 = this.entities.get(entities[i]);
          const entity2 = this.entities.get(entities[j]);
          
          if (entity1 && entity2) {
            if (!entity1.links.includes(entities[j])) {
              entity1.links.push(entities[j]);
            }
            if (!entity2.links.includes(entities[i])) {
              entity2.links.push(entities[i]);
            }
          }
        }
      }
    }
  }

  /**
   * Save all data to IndexedDB
   */
  async saveToDatabase() {
    // Compute relationships before saving
    this.computeRelationships();
    
    // Save entities
    for (const entity of this.entities.values()) {
      await this.dbManager.saveEntity(entity);
    }
    
    // Save conversations
    for (const convData of this.conversationEntities.values()) {
      await this.dbManager.saveConversation(convData);
    }
    
    // Save timeline
    const timeline = this.buildTimeline();
    await this.dbManager.saveTimeline(timeline);
    
    // Build and save search index
    await this.buildSearchIndex();
  }

  /**
   * Build search index for fast searching
   */
  async buildSearchIndex() {
    for (const entity of this.entities.values()) {
      const searchText = `${entity.name} ${entity.description}`.toLowerCase();
      const words = searchText.split(/\s+/).filter(w => w.length > 2);
      
      for (const word of words) {
        await this.dbManager.addToSearchIndex(word, entity.id);
      }
    }
  }

  /**
   * Utility: Get context around a position in text
   */
  getContext(text, position, radius) {
    const start = Math.max(0, position - radius);
    const end = Math.min(text.length, position + radius);
    return text.substring(start, end).trim();
  }

  /**
   * Utility: Summarize text to max length
   */
  summarize(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  }

  /**
   * Utility: Check if a name is a common non-person word
   */
  isCommonNonName(name) {
    const common = [
      'ChatGPT', 'The', 'This', 'That', 'There', 'What', 'Where', 'When', 'Why', 'How',
      'Can', 'Will', 'Would', 'Could', 'Should', 'May', 'Might', 'Must',
      'Yes', 'No', 'True', 'False', 'Error', 'Success', 'Warning', 'Info'
    ];
    return common.includes(name);
  }

  /**
   * Utility: Sleep helper for async batching
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MemoryProcessor;
}

