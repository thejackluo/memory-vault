/**
 * Database Manager - IndexedDB wrapper for memory graph storage
 * Manages entities, conversations, relationships, and search indices
 */

class DBManager {
  constructor() {
    this.dbName = 'MemoryGraphDB';
    this.dbVersion = 1;
    this.db = null;
  }

  /**
   * Initialize the database
   */
  async initialize() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        reject(new Error('Failed to open database'));
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Create entities store
        if (!db.objectStoreNames.contains('entities')) {
          const entityStore = db.createObjectStore('entities', { keyPath: 'id' });
          entityStore.createIndex('type', 'type', { unique: false });
          entityStore.createIndex('name', 'name', { unique: false });
          entityStore.createIndex('firstSeen', 'firstSeen', { unique: false });
          entityStore.createIndex('lastSeen', 'lastSeen', { unique: false });
        }

        // Create conversations store
        if (!db.objectStoreNames.contains('conversations')) {
          const convStore = db.createObjectStore('conversations', { keyPath: 'id' });
          convStore.createIndex('timestamp', 'timestamp', { unique: false });
          convStore.createIndex('date', 'date', { unique: false });
        }

        // Create relationships store
        if (!db.objectStoreNames.contains('relationships')) {
          const relStore = db.createObjectStore('relationships', { autoIncrement: true });
          relStore.createIndex('source', 'source', { unique: false });
          relStore.createIndex('target', 'target', { unique: false });
          relStore.createIndex('sourceTarget', ['source', 'target'], { unique: true });
        }

        // Create search index store
        if (!db.objectStoreNames.contains('searchIndex')) {
          const searchStore = db.createObjectStore('searchIndex', { keyPath: 'word' });
        }

        // Create timeline store
        if (!db.objectStoreNames.contains('timeline')) {
          const timelineStore = db.createObjectStore('timeline', { keyPath: 'date' });
        }

        // Create metadata store for global settings
        if (!db.objectStoreNames.contains('metadata')) {
          db.createObjectStore('metadata', { keyPath: 'key' });
        }
      };
    });
  }

  /**
   * Save an entity to the database
   */
  async saveEntity(entity) {
    return this.performTransaction('entities', 'readwrite', (store) => {
      return store.put(entity);
    });
  }

  /**
   * Get an entity by ID
   */
  async getEntity(entityId) {
    return this.performTransaction('entities', 'readonly', (store) => {
      return store.get(entityId);
    });
  }

  /**
   * Get all entities
   */
  async getAllEntities() {
    return this.performTransaction('entities', 'readonly', (store) => {
      return store.getAll();
    });
  }

  /**
   * Get entities by type
   */
  async getEntitiesByType(type) {
    return this.performTransaction('entities', 'readonly', (store) => {
      const index = store.index('type');
      return index.getAll(type);
    });
  }

  /**
   * Search entities by name (partial match)
   */
  async searchEntitiesByName(searchTerm) {
    const allEntities = await this.getAllEntities();
    const term = searchTerm.toLowerCase();
    return allEntities.filter(entity => 
      entity.name.toLowerCase().includes(term) ||
      entity.description.toLowerCase().includes(term)
    );
  }

  /**
   * Save a conversation
   */
  async saveConversation(conversation) {
    return this.performTransaction('conversations', 'readwrite', (store) => {
      return store.put(conversation);
    });
  }

  /**
   * Get a conversation by ID
   */
  async getConversation(convId) {
    return this.performTransaction('conversations', 'readonly', (store) => {
      return store.get(convId);
    });
  }

  /**
   * Get all conversations
   */
  async getAllConversations() {
    return this.performTransaction('conversations', 'readonly', (store) => {
      return store.getAll();
    });
  }

  /**
   * Get conversations by date range
   */
  async getConversationsByDateRange(startDate, endDate) {
    return this.performTransaction('conversations', 'readonly', (store) => {
      const index = store.index('date');
      const range = IDBKeyRange.bound(startDate, endDate);
      return index.getAll(range);
    });
  }

  /**
   * Save a relationship between entities
   */
  async saveRelationship(sourceId, targetId, metadata = {}) {
    const relationship = {
      source: sourceId,
      target: targetId,
      ...metadata
    };
    
    return this.performTransaction('relationships', 'readwrite', (store) => {
      return store.put(relationship);
    });
  }

  /**
   * Get relationships for an entity
   */
  async getEntityRelationships(entityId) {
    return this.performTransaction('relationships', 'readonly', async (store) => {
      const sourceIndex = store.index('source');
      const targetIndex = store.index('target');
      
      const asSource = await this.promisifyRequest(sourceIndex.getAll(entityId));
      const asTarget = await this.promisifyRequest(targetIndex.getAll(entityId));
      
      return [...asSource, ...asTarget];
    });
  }

  /**
   * Add word to search index
   */
  async addToSearchIndex(word, entityId) {
    return this.performTransaction('searchIndex', 'readwrite', async (store) => {
      const existing = await this.promisifyRequest(store.get(word));
      
      if (existing) {
        if (!existing.entities.includes(entityId)) {
          existing.entities.push(entityId);
        }
        return store.put(existing);
      } else {
        return store.put({
          word: word,
          entities: [entityId]
        });
      }
    });
  }

  /**
   * Search using the search index
   */
  async searchIndex(query) {
    const words = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const entityIds = new Set();
    
    for (const word of words) {
      const result = await this.performTransaction('searchIndex', 'readonly', (store) => {
        return store.get(word);
      });
      
      if (result && result.entities) {
        result.entities.forEach(id => entityIds.add(id));
      }
    }
    
    // Get full entity objects
    const entities = [];
    for (const id of entityIds) {
      const entity = await this.getEntity(id);
      if (entity) {
        entities.push(entity);
      }
    }
    
    return entities;
  }

  /**
   * Save timeline data
   */
  async saveTimeline(timeline) {
    const promises = timeline.map(entry => 
      this.performTransaction('timeline', 'readwrite', (store) => {
        return store.put(entry);
      })
    );
    return Promise.all(promises);
  }

  /**
   * Get full timeline
   */
  async getTimeline() {
    return this.performTransaction('timeline', 'readonly', (store) => {
      return store.getAll();
    });
  }

  /**
   * Get timeline for date range
   */
  async getTimelineRange(startDate, endDate) {
    return this.performTransaction('timeline', 'readonly', (store) => {
      const range = IDBKeyRange.bound(startDate, endDate);
      return store.getAll(range);
    });
  }

  /**
   * Save metadata
   */
  async saveMetadata(key, value) {
    return this.performTransaction('metadata', 'readwrite', (store) => {
      return store.put({ key, value });
    });
  }

  /**
   * Get metadata
   */
  async getMetadata(key) {
    const result = await this.performTransaction('metadata', 'readonly', (store) => {
      return store.get(key);
    });
    return result ? result.value : null;
  }

  /**
   * Clear all data (for reset)
   */
  async clearAll() {
    const stores = ['entities', 'conversations', 'relationships', 'searchIndex', 'timeline', 'metadata'];
    const promises = stores.map(storeName => 
      this.performTransaction(storeName, 'readwrite', (store) => {
        return store.clear();
      })
    );
    return Promise.all(promises);
  }

  /**
   * Get database statistics
   */
  async getStats() {
    const [entities, conversations, timeline] = await Promise.all([
      this.getAllEntities(),
      this.getAllConversations(),
      this.getTimeline()
    ]);

    const entityTypes = {};
    entities.forEach(e => {
      entityTypes[e.type] = (entityTypes[e.type] || 0) + 1;
    });

    return {
      totalEntities: entities.length,
      totalConversations: conversations.length,
      timelineEntries: timeline.length,
      entityTypes: entityTypes,
      dateRange: timeline.length > 0 ? {
        start: timeline[0].date,
        end: timeline[timeline.length - 1].date
      } : null
    };
  }

  /**
   * Perform a transaction with promise wrapper
   */
  performTransaction(storeName, mode, operation) {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      try {
        const transaction = this.db.transaction([storeName], mode);
        const store = transaction.objectStore(storeName);
        const request = operation(store);

        if (request && request.then) {
          // Operation returned a promise
          request.then(resolve).catch(reject);
        } else if (request) {
          // Operation returned an IDBRequest
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        } else {
          // No request returned
          transaction.oncomplete = () => resolve();
          transaction.onerror = () => reject(transaction.error);
        }
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Convert IDBRequest to Promise
   */
  promisifyRequest(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Close the database connection
   */
  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  /**
   * Delete the entire database (for complete reset)
   */
  static async deleteDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase('MemoryGraphDB');
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DBManager;
}

