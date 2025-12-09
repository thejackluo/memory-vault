/**
 * Search Engine - Full-text search with IndexedDB and filtering
 * Supports fuzzy matching, type filtering, and date range filtering
 */

class SearchEngine {
  constructor(dbManager) {
    this.dbManager = dbManager;
    this.cache = {
      allEntities: null,
      lastUpdated: null
    };
  }

  /**
   * Perform a search query
   */
  async search(query, options = {}) {
    const {
      types = [],           // Filter by entity types
      dateRange = null,     // {start: 'YYYY-MM-DD', end: 'YYYY-MM-DD'}
      maxResults = 50,      // Maximum results to return
      fuzzy = true          // Enable fuzzy matching
    } = options;

    // Handle empty query
    if (!query || query.trim().length === 0) {
      return this.getRecentEntities(maxResults);
    }

    const searchTerm = query.toLowerCase().trim();
    
    // Try IndexedDB search first (fast but exact)
    let results = await this.dbManager.searchIndex(searchTerm);
    
    // If no results or fuzzy is enabled, do full scan with fuzzy matching
    if (results.length === 0 || fuzzy) {
      const allEntities = await this.getAllEntities();
      const fuzzyResults = this.fuzzySearch(allEntities, searchTerm);
      
      // Merge results, prioritizing exact matches
      const exactIds = new Set(results.map(r => r.id));
      fuzzyResults.forEach(result => {
        if (!exactIds.has(result.id)) {
          results.push(result);
        }
      });
    }
    
    // Apply filters
    if (types.length > 0) {
      const typeSet = new Set(types);
      results = results.filter(entity => typeSet.has(entity.type));
    }
    
    if (dateRange) {
      const startTime = new Date(dateRange.start).getTime() / 1000;
      const endTime = new Date(dateRange.end).getTime() / 1000;
      results = results.filter(entity => 
        entity.firstSeen >= startTime && entity.lastSeen <= endTime
      );
    }
    
    // Score and sort results
    results = this.scoreResults(results, searchTerm);
    
    // Limit results
    return results.slice(0, maxResults);
  }

  /**
   * Fuzzy search through entities
   */
  fuzzySearch(entities, query) {
    const results = [];
    const queryTerms = query.split(/\s+/);
    
    for (const entity of entities) {
      const searchText = `${entity.name} ${entity.description}`.toLowerCase();
      
      // Check if all query terms are present (fuzzy)
      let score = 0;
      let matches = 0;
      
      for (const term of queryTerms) {
        if (term.length < 2) continue;
        
        // Exact match in name
        if (entity.name.toLowerCase().includes(term)) {
          score += 10;
          matches++;
        }
        // Exact match in description
        else if (entity.description.toLowerCase().includes(term)) {
          score += 5;
          matches++;
        }
        // Fuzzy match (edit distance)
        else if (this.fuzzyMatch(searchText, term)) {
          score += 2;
          matches++;
        }
      }
      
      if (matches > 0) {
        results.push({ ...entity, _searchScore: score });
      }
    }
    
    return results;
  }

  /**
   * Check if term fuzzy matches text (allows 1-2 character differences)
   */
  fuzzyMatch(text, term) {
    // Simple fuzzy matching: check if term appears with small variations
    const words = text.split(/\s+/);
    
    for (const word of words) {
      if (this.levenshteinDistance(word, term) <= Math.min(2, Math.floor(term.length / 3))) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Calculate Levenshtein distance (edit distance)
   */
  levenshteinDistance(str1, str2) {
    const len1 = str1.length;
    const len2 = str2.length;
    const matrix = [];

    if (len1 === 0) return len2;
    if (len2 === 0) return len1;

    // Initialize matrix
    for (let i = 0; i <= len1; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j;
    }

    // Fill matrix
    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,      // deletion
          matrix[i][j - 1] + 1,      // insertion
          matrix[i - 1][j - 1] + cost // substitution
        );
      }
    }

    return matrix[len1][len2];
  }

  /**
   * Score and sort search results
   */
  scoreResults(results, query) {
    const queryLower = query.toLowerCase();
    
    results.forEach(entity => {
      let score = entity._searchScore || 0;
      
      // Boost exact name matches
      if (entity.name.toLowerCase() === queryLower) {
        score += 100;
      }
      // Boost name starts with query
      else if (entity.name.toLowerCase().startsWith(queryLower)) {
        score += 50;
      }
      
      // Boost by occurrence count (popular entities)
      score += Math.log(entity.occurrences + 1) * 2;
      
      // Boost recent entities
      const daysSinceLastSeen = (Date.now() / 1000 - entity.lastSeen) / 86400;
      if (daysSinceLastSeen < 7) {
        score += 10;
      } else if (daysSinceLastSeen < 30) {
        score += 5;
      }
      
      entity._searchScore = score;
    });
    
    // Sort by score (highest first)
    return results.sort((a, b) => b._searchScore - a._searchScore);
  }

  /**
   * Get all entities (with caching)
   */
  async getAllEntities() {
    // Use cache if available and recent (< 5 minutes old)
    if (this.cache.allEntities && this.cache.lastUpdated) {
      const age = Date.now() - this.cache.lastUpdated;
      if (age < 5 * 60 * 1000) {
        return this.cache.allEntities;
      }
    }
    
    // Fetch from database
    const entities = await this.dbManager.getAllEntities();
    this.cache.allEntities = entities;
    this.cache.lastUpdated = Date.now();
    
    return entities;
  }

  /**
   * Get recent entities (by last seen)
   */
  async getRecentEntities(maxResults = 20) {
    const allEntities = await this.getAllEntities();
    return allEntities
      .sort((a, b) => b.lastSeen - a.lastSeen)
      .slice(0, maxResults);
  }

  /**
   * Get popular entities (by occurrence count)
   */
  async getPopularEntities(maxResults = 20) {
    const allEntities = await this.getAllEntities();
    return allEntities
      .sort((a, b) => b.occurrences - a.occurrences)
      .slice(0, maxResults);
  }

  /**
   * Get entities by type
   */
  async getEntitiesByType(type) {
    return await this.dbManager.getEntitiesByType(type);
  }

  /**
   * Get suggestions for autocomplete
   */
  async getSuggestions(partialQuery, maxSuggestions = 10) {
    if (!partialQuery || partialQuery.length < 2) {
      return [];
    }
    
    const query = partialQuery.toLowerCase();
    const allEntities = await this.getAllEntities();
    
    // Find entities that start with query
    const suggestions = allEntities
      .filter(entity => entity.name.toLowerCase().startsWith(query))
      .sort((a, b) => b.occurrences - a.occurrences)
      .slice(0, maxSuggestions);
    
    return suggestions.map(entity => ({
      text: entity.name,
      type: entity.type,
      id: entity.id
    }));
  }

  /**
   * Search conversations
   */
  async searchConversations(query, maxResults = 20) {
    const allConversations = await this.dbManager.getAllConversations();
    const queryLower = query.toLowerCase();
    
    const results = allConversations
      .filter(conv => 
        conv.title.toLowerCase().includes(queryLower)
      )
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, maxResults);
    
    return results;
  }

  /**
   * Advanced search with complex queries
   */
  async advancedSearch(searchParams) {
    const {
      query = '',
      types = [],
      dateRange = null,
      minOccurrences = 0,
      maxOccurrences = Infinity,
      hasLinks = null,  // true/false/null (any)
      sortBy = 'relevance' // 'relevance', 'occurrences', 'recent', 'alphabetical'
    } = searchParams;
    
    // Start with basic search
    let results = await this.search(query, { types, dateRange, maxResults: 1000 });
    
    // Apply additional filters
    results = results.filter(entity => {
      // Occurrence range
      if (entity.occurrences < minOccurrences || entity.occurrences > maxOccurrences) {
        return false;
      }
      
      // Has links filter
      if (hasLinks !== null) {
        const entityHasLinks = entity.links && entity.links.length > 0;
        if (hasLinks !== entityHasLinks) {
          return false;
        }
      }
      
      return true;
    });
    
    // Sort results
    switch (sortBy) {
      case 'occurrences':
        results.sort((a, b) => b.occurrences - a.occurrences);
        break;
      case 'recent':
        results.sort((a, b) => b.lastSeen - a.lastSeen);
        break;
      case 'alphabetical':
        results.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'relevance':
      default:
        // Already sorted by relevance from scoreResults
        break;
    }
    
    return results;
  }

  /**
   * Get search statistics
   */
  async getSearchStats() {
    const allEntities = await this.getAllEntities();
    
    const stats = {
      totalEntities: allEntities.length,
      byType: {},
      totalOccurrences: 0,
      averageOccurrences: 0,
      entitiesWithLinks: 0,
      totalLinks: 0
    };
    
    allEntities.forEach(entity => {
      // Count by type
      stats.byType[entity.type] = (stats.byType[entity.type] || 0) + 1;
      
      // Total occurrences
      stats.totalOccurrences += entity.occurrences;
      
      // Links
      if (entity.links && entity.links.length > 0) {
        stats.entitiesWithLinks++;
        stats.totalLinks += entity.links.length;
      }
    });
    
    stats.averageOccurrences = stats.totalOccurrences / stats.totalEntities;
    
    return stats;
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache = {
      allEntities: null,
      lastUpdated: null
    };
  }

  /**
   * Find related entities (entities that frequently appear together)
   */
  async findRelatedEntities(entityId, maxResults = 10) {
    const entity = await this.dbManager.getEntity(entityId);
    if (!entity) return [];
    
    // Get all entities that share conversations
    const relatedCounts = new Map();
    
    for (const convId of entity.conversations) {
      const conv = await this.dbManager.getConversation(convId);
      if (conv) {
        conv.entities.forEach(otherId => {
          if (otherId !== entityId) {
            relatedCounts.set(otherId, (relatedCounts.get(otherId) || 0) + 1);
          }
        });
      }
    }
    
    // Sort by co-occurrence count
    const related = Array.from(relatedCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, maxResults);
    
    // Get entity details
    const results = [];
    for (const [otherId, count] of related) {
      const otherEntity = await this.dbManager.getEntity(otherId);
      if (otherEntity) {
        results.push({
          ...otherEntity,
          _coOccurrenceCount: count
        });
      }
    }
    
    return results;
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SearchEngine;
}

