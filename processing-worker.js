/**
 * Processing Worker - Web Worker for conversation processing
 * Runs in background thread to avoid blocking the UI
 */

// Import processor logic (in worker context, we'll duplicate necessary functions)
self.onmessage = function(e) {
  const { action, data } = e.data;
  
  switch (action) {
    case 'process':
      processConversations(data.conversations, data.batchSize);
      break;
    default:
      postMessage({ type: 'error', error: 'Unknown action' });
  }
};

/**
 * Process conversations in batches
 */
async function processConversations(conversations, batchSize = 100) {
  const entities = new Map();
  const conversationEntities = new Map();
  const timeline = new Map();
  
  let processed = 0;
  const total = conversations.length;
  
  for (let i = 0; i < conversations.length; i += batchSize) {
    const batch = conversations.slice(i, i + batchSize);
    
    for (const conversation of batch) {
      processConversation(conversation, entities, conversationEntities, timeline);
    }
    
    processed = Math.min(i + batchSize, total);
    
    // Report progress
    postMessage({
      type: 'progress',
      data: {
        processed: processed,
        total: total,
        percentage: (processed / total * 100).toFixed(1),
        entitiesFound: entities.size
      }
    });
    
    // Allow other tasks to run
    await sleep(10);
  }
  
  // Compute relationships
  computeRelationships(entities, conversationEntities);
  
  // Convert to arrays
  const entitiesArray = Array.from(entities.values());
  const conversationsArray = Array.from(conversationEntities.values());
  const timelineArray = buildTimeline(timeline);
  
  // Send complete data
  postMessage({
    type: 'complete',
    data: {
      entities: entitiesArray,
      conversations: conversationsArray,
      timeline: timelineArray
    }
  });
}

/**
 * Process a single conversation
 */
function processConversation(conversation, entities, conversationEntities, timeline) {
  const convId = conversation.id || conversation.conversation_id;
  const title = conversation.title || 'Untitled';
  const timestamp = conversation.create_time || conversation.update_time || Date.now() / 1000;
  const date = new Date(timestamp * 1000).toISOString().split('T')[0];
  
  const messages = extractMessages(conversation);
  const fullText = messages.map(m => m.content).join('\n\n');
  
  const extractedEntities = extractEntities(fullText, messages);
  
  const convData = {
    id: convId,
    title: title,
    timestamp: timestamp,
    date: date,
    entities: []
  };
  
  for (const extracted of extractedEntities) {
    const entityId = getOrCreateEntity(extracted, convId, timestamp, entities);
    convData.entities.push(entityId);
    
    const entity = entities.get(entityId);
    if (!entity.conversations.includes(convId)) {
      entity.conversations.push(convId);
    }
    entity.lastSeen = Math.max(entity.lastSeen, timestamp);
    entity.occurrences++;
  }
  
  conversationEntities.set(convId, convData);
  updateTimeline(timeline, date, convData.entities, convId);
}

/**
 * Extract messages from conversation
 */
function extractMessages(conversation) {
  const messages = [];
  const mapping = conversation.mapping || {};
  
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
 * Extract entities from text
 */
function extractEntities(text, messages) {
  const entities = [];
  
  entities.push(...extractPeople(text));
  entities.push(...extractProjects(text));
  entities.push(...extractKnowledge(text));
  entities.push(...extractQuestions(text, messages));
  entities.push(...extractThoughts(text));
  
  return entities;
}

/**
 * Extract people mentions
 */
function extractPeople(text) {
  const people = [];
  const namePattern = /\b([A-Z][a-z]+ (?:[A-Z][a-z]+))\b/g;
  let match;
  
  while ((match = namePattern.exec(text)) !== null) {
    const name = match[1];
    if (!isCommonNonName(name)) {
      people.push({
        type: 'person',
        name: name,
        context: getContext(text, match.index, 100)
      });
    }
  }
  
  return people;
}

/**
 * Extract project mentions
 */
function extractProjects(text) {
  const projects = [];
  const projectPatterns = [
    /(?:working on|building|creating|developing|making)\s+(?:a\s+)?(?:new\s+)?([A-Z][a-zA-Z\s]{3,30})/gi,
    /(?:project|app|application|system|tool|website|platform)\s+(?:called|named)\s+([A-Z][a-zA-Z\s]{3,30})/gi,
  ];
  
  for (const pattern of projectPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const name = match[1].trim();
      if (name.length > 3 && name.length < 50) {
        projects.push({
          type: 'project',
          name: name,
          context: getContext(text, match.index, 150)
        });
      }
    }
  }
  
  return projects;
}

/**
 * Extract knowledge/learnings
 */
function extractKnowledge(text) {
  const knowledge = [];
  const learningPatterns = [
    /(?:I learned|I discovered|I found out|I realized|I understood)\s+(?:that\s+)?([^.!?]{10,200})[.!?]/gi,
    /(?:TIL|Today I learned):\s*([^.!?\n]{10,200})[.!?\n]/gi,
  ];
  
  for (const pattern of learningPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const concept = match[1].trim();
      knowledge.push({
        type: 'knowledge',
        name: summarize(concept, 50),
        description: concept,
        context: getContext(text, match.index, 150)
      });
    }
  }
  
  return knowledge;
}

/**
 * Extract questions
 */
function extractQuestions(text, messages) {
  const questions = [];
  
  for (const message of messages) {
    if (message.role === 'user') {
      const questionMatches = message.content.match(/[^.!?]*\?/g);
      if (questionMatches) {
        for (const question of questionMatches) {
          const q = question.trim();
          if (q.length > 10) {
            questions.push({
              type: 'question',
              name: summarize(q, 60),
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
function extractThoughts(text) {
  const thoughts = [];
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
        name: summarize(thought, 50),
        description: thought,
        context: getContext(text, match.index, 150)
      });
    }
  }
  
  return thoughts;
}

/**
 * Get or create entity
 */
function getOrCreateEntity(extracted, convId, timestamp, entities) {
  const key = normalizeEntityName(extracted.name);
  const existingId = findExistingEntity(key, extracted.type, entities);
  
  if (existingId) {
    return existingId;
  }
  
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
    links: [],
    metadata: {
      normalizedKey: key,
      context: extracted.context
    }
  };
  
  entities.set(entityId, entity);
  return entityId;
}

/**
 * Find existing entity
 */
function findExistingEntity(normalizedKey, type, entities) {
  for (const [id, entity] of entities) {
    if (entity.type === type && entity.metadata.normalizedKey === normalizedKey) {
      return id;
    }
  }
  return null;
}

/**
 * Normalize entity name
 */
function normalizeEntityName(name) {
  return name.toLowerCase().trim().replace(/[^\w\s]/g, '');
}

/**
 * Update timeline
 */
function updateTimeline(timeline, date, entityIds, convId) {
  if (!timeline.has(date)) {
    timeline.set(date, {
      date: date,
      entities: new Set(),
      conversations: []
    });
  }
  
  const entry = timeline.get(date);
  entityIds.forEach(id => entry.entities.add(id));
  entry.conversations.push(convId);
}

/**
 * Build timeline array
 */
function buildTimeline(timeline) {
  const timelineArray = [];
  for (const [date, data] of timeline) {
    timelineArray.push({
      date: date,
      entities: Array.from(data.entities),
      conversations: data.conversations
    });
  }
  return timelineArray.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Compute relationships
 */
function computeRelationships(entities, conversationEntities) {
  for (const [convId, convData] of conversationEntities) {
    const entityList = convData.entities;
    
    for (let i = 0; i < entityList.length; i++) {
      for (let j = i + 1; j < entityList.length; j++) {
        const entity1 = entities.get(entityList[i]);
        const entity2 = entities.get(entityList[j]);
        
        if (entity1 && entity2) {
          if (!entity1.links.includes(entityList[j])) {
            entity1.links.push(entityList[j]);
          }
          if (!entity2.links.includes(entityList[i])) {
            entity2.links.push(entityList[i]);
          }
        }
      }
    }
  }
}

/**
 * Helper functions
 */
function getContext(text, position, radius) {
  const start = Math.max(0, position - radius);
  const end = Math.min(text.length, position + radius);
  return text.substring(start, end).trim();
}

function summarize(text, maxLength) {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
}

function isCommonNonName(name) {
  const common = [
    'ChatGPT', 'The', 'This', 'That', 'There', 'What', 'Where', 'When', 'Why', 'How',
    'Can', 'Will', 'Would', 'Could', 'Should', 'May', 'Might', 'Must'
  ];
  return common.includes(name);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}


