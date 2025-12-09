// Global state
let jsonData = [];
let assetsJson = {}; // Will be loaded dynamically
let conversations = [];
let state = {};
const CONVERSATIONS_PER_BATCH = 20;
const loadedPeriods = new Set();

// Function to load conversations.json dynamically
async function loadConversations() {
  const loadingMsg = document.querySelector("#loadingMessage");
  loadingMsg.textContent = "Loading conversations.json (this may take a moment for large files)...";

  try {
    const response = await fetch('conversations.json');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    loadingMsg.textContent = "Parsing JSON data...";
    jsonData = await response.json();

    loadingMsg.textContent = `Successfully loaded ${jsonData.length} conversations!`;
    loadingMsg.className = "success";

    // Wait a brief moment to show success message
    setTimeout(() => {
      loadingMsg.style.display = "none";
      document.querySelector("#loadMoreButton").style.display = "block";
      initializeAndRender();
    }, 500);

  } catch (error) {
    loadingMsg.textContent = `Error loading conversations: ${error.message}. Make sure conversations.json is in the same directory.`;
    loadingMsg.className = "error";
    console.error('Failed to load conversations:', error);
  }
}

// Function to load assets.json dynamically
async function loadAssets() {
  const loadingMsg = document.querySelector("#loadingMessage");
  loadingMsg.textContent = "Loading assets.json...";

  try {
    const response = await fetch('assets.json');
    if (!response.ok) {
      console.warn('assets.json not found, file references may not work');
      console.warn('Make sure assets.json is in the same directory as this HTML file');
      assetsJson = {};
      return;
    }
    assetsJson = await response.json();
    const assetCount = Object.keys(assetsJson).length;
    console.log(`Successfully loaded assets.json with ${assetCount} assets`);
    console.log('Note: Image/audio/video files must be in the same directory or subdirectories');
    console.log('Example: If assets.json has "file_xxx.jpg", that file must exist locally');
  } catch (error) {
    console.warn('Failed to load assets.json:', error);
    assetsJson = {};
  }
}

// Extract messages from a conversation (oldest to newest) - full version with multimodal support
function getConversationMessages(conversation) {
  const messages = [];
  let currentNode = conversation.current_node;
  
  while (currentNode != null) {
    const node = conversation.mapping[currentNode];
    if (
      node.message &&
      node.message.content &&
      node.message.content.parts &&
      node.message.content.parts.length > 0 &&
      (node.message.author.role !== "system" || node.message.metadata.is_user_system_message)
    ) {
      let author = node.message.author.role;
      if (author === "assistant" || author === "tool") {
        author = "ChatGPT";
      } else if (author === "system" && node.message.metadata.is_user_system_message) {
        author = "Custom user info";
      }
      
      if (node.message.content.content_type === "text" || node.message.content.content_type === "multimodal_text") {
        const parts = [];
        
        for (const part of node.message.content.parts) {
          if (typeof part === "string" && part.length > 0) {
            parts.push({ text: part });
          } else if (part.content_type === "audio_transcription") {
            parts.push({ transcript: part.text });
          } else if (["audio_asset_pointer", "image_asset_pointer", "video_container_asset_pointer"].includes(part.content_type)) {
            parts.push({ asset: part });
          } else if (part.content_type === "real_time_user_audio_video_asset_pointer") {
            if (part.audio_asset_pointer) {
              parts.push({ asset: part.audio_asset_pointer });
            }
            if (part.video_container_asset_pointer) {
              parts.push({ asset: part.video_container_asset_pointer });
            }
            for (const framePointer of part.frames_asset_pointers) {
              parts.push({ asset: framePointer });
            }
          }
        }
        
        if (parts.length > 0) {
          messages.push({ author, parts });
        }
      }
    }
    currentNode = node.parent;
  }
  
  return messages.reverse();
}

function initializeAndRender() {
  // Sort conversations oldest -> newest using create_time if available
  conversations = jsonData.slice();
  conversations.sort((a, b) => {
    const ta = a.create_time || 0;
    const tb = b.create_time || 0;
    return ta - tb; // Oldest first
  });

  // Build sidebar navigation
  buildSidebar();

  // Global state - track which conversation we're on
  state = {
    convIndex: 0 // which conversation we are on
  };

  // Render the first batch
  renderNextBatch();
}

// Helper to get week number and year
function getWeekInfo(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const weekNum = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return { week: weekNum, year: d.getFullYear() };
}

// Helper to get date range for a week
function getWeekRange(year, week) {
  const simple = new Date(year, 0, 1 + (week - 1) * 7);
  const dow = simple.getDay();
  const weekStart = simple;
  
  if (dow <= 4) {
    weekStart.setDate(simple.getDate() - simple.getDay() + 1);
  } else {
    weekStart.setDate(simple.getDate() + 8 - simple.getDay());
  }

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const format = (d) => `${d.getMonth() + 1}/${d.getDate()}`;

  return `${format(weekStart)} - ${format(weekEnd)}`;
}

// Build sidebar navigation organized by year, month, and week
function buildSidebar() {
  const sidebar = document.querySelector("#sidebar");
  const sidebarContent = document.querySelector("#sidebarContent");
  sidebarContent.innerHTML = "";

  // Collect all unique models
  const allModels = {};
  conversations.forEach((conv) => {
    const model = getConversationModel(conv);
    allModels[model] = (allModels[model] || 0) + 1;
  });

  // Sort models by count
  const sortedModels = Object.keys(allModels).sort((a, b) => allModels[b] - allModels[a]);

  // Add quick navigation bar
  const quickNav = document.createElement("div");
  quickNav.className = "quick-nav";
  quickNav.innerHTML = `
    <button class="quick-nav-btn primary" onclick="jumpToLatest()">Latest</button>
    <button class="quick-nav-btn" onclick="jumpToThisMonth()">This Month</button>
    <button class="quick-nav-btn" onclick="expandAll()">Expand All</button>
    <button class="quick-nav-btn" onclick="collapseAll()">Collapse All</button>
    <select id="modelFilter" class="model-filter" onchange="filterByModel(this.value)">
      <option value="">All Models</option>
    </select>
  `;
  sidebarContent.appendChild(quickNav);

  // Add model options to the select
  const modelFilter = document.querySelector('#modelFilter');
  sortedModels.forEach((model) => {
    const option = document.createElement('option');
    option.value = model;
    option.textContent = `${model} (${allModels[model]})`;
    modelFilter.appendChild(option);
  });

  // Count total messages
  let totalMessages = 0;
  conversations.forEach((conv) => {
    if (!conv._messages) {
      conv._messages = getConversationMessages(conv);
    }
    totalMessages += conv._messages.length;
  });

  // Organize conversations by year, month, and week
  const byYear = {};

  conversations.forEach((conv, index) => {
    const date = new Date((conv.create_time || 0) * 1000);
    const year = date.getFullYear();
    const month = date.getMonth();
    const monthName = date.toLocaleString('default', { month: 'long' });
    const weekInfo = getWeekInfo(date);
    const weekKey = weekInfo.week;

    if (!byYear[year]) {
      byYear[year] = {};
    }
    if (!byYear[year][month]) {
      byYear[year][month] = {
        name: monthName,
        weeks: {}
      };
    }
    if (!byYear[year][month].weeks[weekKey]) {
      byYear[year][month].weeks[weekKey] = {
        range: getWeekRange(year, weekKey),
        conversations: []
      };
    }

    const periodKey = `${year}-${month}-${weekKey}`;
    byYear[year][month].weeks[weekKey].conversations.push({
      index,
      title: conv.title || "(no title)",
      date,
      conv,
      periodKey
    });
  });

  // Build HTML for sidebar
  const years = Object.keys(byYear).sort().reverse();

  years.forEach((year) => {
    const yearDiv = document.createElement("div");
    yearDiv.className = "year-group";

    let yearConvCount = 0;
    Object.values(byYear[year]).forEach((monthData) => {
      Object.values(monthData.weeks).forEach((weekData) => {
        yearConvCount += weekData.conversations.length;
      });
    });

    const yearHeader = document.createElement("div");
    yearHeader.className = "year-header";
    yearHeader.innerHTML = `<span>${year}</span><span class="year-count">${yearConvCount}</span>`;
    yearHeader.onclick = () => {
      yearDiv.classList.toggle('collapsed');
    };
    yearDiv.appendChild(yearHeader);

    const yearContent = document.createElement("div");
    yearContent.className = "year-content";

    const months = Object.keys(byYear[year]).sort((a, b) => b - a);

    months.forEach((monthNum) => {
      const monthData = byYear[year][monthNum];
      const monthDiv = document.createElement("div");
      monthDiv.className = "month-group";

      let monthConvCount = 0;
      Object.values(monthData.weeks).forEach((weekData) => {
        monthConvCount += weekData.conversations.length;
      });

      const monthHeader = document.createElement("div");
      monthHeader.className = "month-header";
      monthHeader.innerHTML = `<span>${monthData.name}</span><span class="year-count">${monthConvCount}</span>`;
      monthHeader.onclick = (e) => {
        e.stopPropagation();
        monthDiv.classList.toggle('collapsed');
      };
      monthDiv.appendChild(monthHeader);

      const monthContent = document.createElement("div");
      monthContent.className = "month-content";

      const weeks = Object.keys(monthData.weeks).sort((a, b) => b - a);

      weeks.forEach((weekKey) => {
        const weekData = monthData.weeks[weekKey];
        const weekDiv = document.createElement("div");
        weekDiv.className = "week-group";

        const periodKey = `${year}-${monthNum}-${weekKey}`;
        const isLoaded = loadedPeriods.has(periodKey);

        const weekHeader = document.createElement("div");
        weekHeader.className = "week-header";

        const loadBtn = document.createElement("button");
        loadBtn.className = `load-period-btn${isLoaded ? " loaded" : ""}`;
        loadBtn.textContent = isLoaded ? "Loaded" : "Load";
        loadBtn.onclick = (e) => {
          e.stopPropagation();
          loadPeriod(periodKey, weekData.conversations);
        };

        weekHeader.innerHTML = `<span>Week ${weekKey} (${weekData.range}) - ${weekData.conversations.length}</span>`;
        weekHeader.appendChild(loadBtn);
        weekHeader.onclick = (e) => {
          if (e.target !== loadBtn) {
            e.stopPropagation();
            weekDiv.classList.toggle('collapsed');
          }
        };
        weekDiv.appendChild(weekHeader);

        const weekContent = document.createElement("div");
        weekContent.className = "week-content";

        weekData.conversations.forEach((item) => {
          const link = document.createElement("a");
          link.className = "conversation-link";
          link.textContent = item.title;
          link.dataset.convId = `conv-${item.index}`;
          link.dataset.periodKey = periodKey;
          link.onclick = (e) => {
            e.preventDefault();

            if (!loadedPeriods.has(periodKey)) {
              loadPeriod(periodKey, weekData.conversations);
            }

            scrollToConversation(item.conv);

            document.querySelectorAll('.conversation-link').forEach((l) => {
              l.classList.remove('active');
            });
            link.classList.add('active');
          };
          weekContent.appendChild(link);
        });

        weekDiv.appendChild(weekContent);
        monthContent.appendChild(weekDiv);
      });

      monthDiv.appendChild(monthContent);
      yearContent.appendChild(monthDiv);
    });

    yearDiv.appendChild(yearContent);
    sidebarContent.appendChild(yearDiv);
  });

  // Add stats
  const stats = document.createElement("div");
  stats.className = "stats";
  stats.innerHTML = `
    <div class="stats-item">
      <span class="stats-label">Conversations:</span>
      <span class="stats-value">${conversations.length.toLocaleString()}</span>
    </div>
    <div class="stats-item">
      <span class="stats-label">Messages:</span>
      <span class="stats-value">${totalMessages.toLocaleString()}</span>
    </div>
    <div class="stats-item">
      <span class="stats-label">Date Range:</span>
      <span class="stats-value">${years[years.length - 1]} - ${years[0]}</span>
    </div>
  `;
  sidebar.insertBefore(stats, sidebarContent);
}

// Quick navigation functions
function jumpToLatest() {
  const yearGroups = document.querySelectorAll('.year-group');
  if (yearGroups.length > 0) {
    // Collapse all first
    document.querySelectorAll('.year-group, .month-group, .week-group').forEach((el) => {
      el.classList.add('collapsed');
    });

    // Expand the latest year
    const latestYear = yearGroups[0];
    latestYear.classList.remove('collapsed');

    // Expand the latest month in that year
    const latestMonth = latestYear.querySelector('.month-group');
    if (latestMonth) {
      latestMonth.classList.remove('collapsed');

      // Expand the latest week in that month
      const latestWeek = latestMonth.querySelector('.week-group');
      if (latestWeek) {
        latestWeek.classList.remove('collapsed');
        latestWeek.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }
}

function jumpToThisMonth() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.toLocaleString('default', { month: 'long' });

  // Collapse all first
  document.querySelectorAll('.year-group, .month-group, .week-group').forEach((el) => {
    el.classList.add('collapsed');
  });

  // Find and expand current year
  const yearGroups = document.querySelectorAll('.year-group');
  yearGroups.forEach((yearGroup) => {
    const yearText = yearGroup.querySelector('.year-header span').textContent;
    if (yearText == currentYear) {
      yearGroup.classList.remove('collapsed');

      // Find and expand current month
      const monthGroups = yearGroup.querySelectorAll('.month-group');
      monthGroups.forEach((monthGroup) => {
        const monthText = monthGroup.querySelector('.month-header span').textContent;
        if (monthText === currentMonth) {
          monthGroup.classList.remove('collapsed');
          monthGroup.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    }
  });
}

function expandAll() {
  document.querySelectorAll('.year-group, .month-group, .week-group').forEach((el) => {
    el.classList.remove('collapsed');
  });
}

function collapseAll() {
  document.querySelectorAll('.year-group, .month-group, .week-group').forEach((el) => {
    el.classList.add('collapsed');
  });
}

// Filter conversations by model
function filterByModel(selectedModel) {
  const links = document.querySelectorAll('.conversation-link');
  let visibleConvs = 0;

  links.forEach((link) => {
    const convId = link.dataset.convId;
    if (!convId) return;

    // Extract conversation index from convId (format: "conv-123")
    const convIndex = parseInt(convId.replace('conv-', ''));
    if (isNaN(convIndex) || convIndex >= conversations.length) return;

    const conv = conversations[convIndex];
    const convModel = getConversationModel(conv);

    if (!selectedModel || convModel === selectedModel) {
      link.style.display = 'block';
      visibleConvs++;
    } else {
      link.style.display = 'none';
    }
  });

  // Update week/month/year headers to show only visible counts
  document.querySelectorAll('.week-group').forEach((weekGroup) => {
    let visibleLinks = weekGroup.querySelectorAll('.conversation-link[style*="display: block"], .conversation-link:not([style*="display"])');
    let count = visibleLinks.length;
    
    if (!selectedModel) {
      // Recalculate from all links
      visibleLinks = weekGroup.querySelectorAll('.conversation-link');
      count = 0;
      visibleLinks.forEach((l) => {
        if (l.style.display !== 'none') count++;
      });
    }

    const weekHeader = weekGroup.querySelector('.week-header span');
    if (weekHeader && count > 0) {
      weekGroup.style.display = 'block';
    } else if (count === 0) {
      weekGroup.style.display = 'none';
    }
  });

  console.log(`Filtered to ${visibleConvs} conversations for model: ${selectedModel || 'all'}`);
}

// Load conversations from a specific period
function loadPeriod(periodKey, conversations) {
  if (loadedPeriods.has(periodKey)) {
    return;
  }

  loadedPeriods.add(periodKey);

  const root = document.querySelector("#root");

  conversations.forEach((item) => {
    const conv = item.conv;

    if (!conv._messages) {
      conv._messages = getConversationMessages(conv);
    }

    const convDiv = ensureConversationDiv(conv, root);

    // Remove not-loaded class if present
    convDiv.classList.remove('not-loaded');

    const msgs = conv._messages;
    msgs.forEach((msg) => {
      renderMessage(convDiv, msg);
    });
  });

  // Update button state
  const btn = document.querySelector(`.load-period-btn[data-period="${periodKey}"]`);
  if (btn) {
    btn.classList.add('loaded');
    btn.textContent = 'Loaded';
  }

  // Update all load buttons for this period
  document.querySelectorAll('.load-period-btn').forEach((button) => {
    const header = button.closest('.week-header');
    if (header && header.querySelector('span').textContent.includes('Week')) {
      const weekData = button.closest('.week-group').dataset;
      if (button.closest('.week-group').querySelector(`.conversation-link[data-period-key="${periodKey}"]`)) {
        button.classList.add('loaded');
        button.textContent = 'Loaded';
      }
    }
  });
}

// Scroll to a specific conversation
function scrollToConversation(conv) {
  if (conv._dom) {
    conv._dom.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

// Get the primary model used in a conversation
function getConversationModel(conversation) {
  // Check all messages in the conversation mapping for model_slug
  const modelCounts = {};
  
  for (const nodeId in conversation.mapping) {
    const node = conversation.mapping[nodeId];
    if (node.message?.metadata?.model_slug) {
      const model = node.message.metadata.model_slug;
      modelCounts[model] = (modelCounts[model] || 0) + 1;
    }
  }

  // Return the most common model
  let maxCount = 0;
  let primaryModel = null;
  
  for (const model in modelCounts) {
    if (modelCounts[model] > maxCount) {
      maxCount = modelCounts[model];
      primaryModel = model;
    }
  }

  return primaryModel || 'unknown';
}

// Ensure each conversation has a container div in the DOM
function ensureConversationDiv(conversation, root) {
  if (conversation._dom) {
    return conversation._dom;
  }
  
  const div = document.createElement("div");
  div.className = "conversation";

  // Title with badges
  const titleContainer = document.createElement("div");
  titleContainer.style.cssText = "display: flex; align-items: center; gap: 8px; margin-bottom: 8px;";

  const title = document.createElement("h4");
  title.textContent = conversation.title || "(no title)";
  title.style.cssText = "margin: 0; flex: 1;";
  titleContainer.appendChild(title);

  // Add status badges
  if (conversation.is_starred) {
    const starBadge = document.createElement("span");
    starBadge.textContent = "⭐";
    starBadge.title = "Starred";
    starBadge.style.cssText = "font-size: 16px;";
    titleContainer.appendChild(starBadge);
  }

  if (conversation.is_archived) {
    const archiveBadge = document.createElement("span");
    archiveBadge.textContent = "📦";
    archiveBadge.title = "Archived";
    archiveBadge.style.cssText = "font-size: 14px;";
    titleContainer.appendChild(archiveBadge);
  }

  if (conversation.is_study_mode) {
    const studyBadge = document.createElement("span");
    studyBadge.textContent = "📚";
    studyBadge.title = "Study Mode";
    studyBadge.style.cssText = "font-size: 14px;";
    titleContainer.appendChild(studyBadge);
  }

  if (conversation.is_do_not_remember) {
    const privacyBadge = document.createElement("span");
    privacyBadge.textContent = "🔒";
    privacyBadge.title = "Memory Disabled";
    privacyBadge.style.cssText = "font-size: 14px;";
    titleContainer.appendChild(privacyBadge);
  }

  div.appendChild(titleContainer);

  // Add model and date info
  const metaDiv = document.createElement("div");
  metaDiv.className = "date";

  // Add model badge
  const model = getConversationModel(conversation);
  const modelBadge = document.createElement("span");
  modelBadge.className = "model-badge";
  modelBadge.textContent = model;
  modelBadge.style.cssText = "background: #e0e7ff; color: #3730a3; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 500; margin-right: 8px;";
  metaDiv.appendChild(modelBadge);

  // Add conversation ID badge (useful for debugging/reference)
  if (conversation.conversation_id) {
    const idBadge = document.createElement("span");
    idBadge.className = "id-badge";
    idBadge.textContent = `ID: ${conversation.conversation_id.substring(0, 8)}...`;
    idBadge.title = conversation.conversation_id;
    idBadge.style.cssText = "background: #f3f4f6; color: #6b7280; padding: 2px 6px; border-radius: 3px; font-size: 10px; font-weight: 400; margin-right: 8px; cursor: help;";
    metaDiv.appendChild(idBadge);
  }

  // Add date if available
  if (conversation.create_time) {
    const date = new Date(conversation.create_time * 1000);
    const dateText = document.createTextNode(date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }));
    metaDiv.appendChild(dateText);
  }

  div.appendChild(metaDiv);

  root.appendChild(div);
  conversation._dom = div;
  return div;
}

// Clean ChatGPT-specific markup
function cleanChatGPTMarkup(text) {
  if (!text) return text;

  // Remove ChatGPT private use area Unicode characters used for citations
  // These are: \ue200-\ue206, \uf525, etc.
  text = text.replace(/[\ue200-\ue206\uf525]/g, '');

  // Remove tool invocation markers like 【turn0calculator0】
  text = text.replace(/【[^】]*】/g, '');

  // Clean up citation markers like citeturn0search5 or citeturn0search4turn0search0
  text = text.replace(/cite(turn\d+search\d+)+/gi, '');

  // Remove entity citation patterns like entity["book","Midnight News",0]
  // This regex matches: entity["type","name",number]
  text = text.replace(/entity\["[^"]*","[^"]*",\d+\]/g, (match) => {
    // Extract the name part (second quoted string)
    const nameMatch = match.match(/entity\["[^"]*","([^"]*)"/);
    return nameMatch ? nameMatch[1] : '';
  });

  // Remove other ChatGPT internal markers
  text = text.replace(/\u3010[^\u3011]*\u3011/g, ''); // Unicode brackets

  // Clean up multiple consecutive spaces (but preserve newlines)
  text = text.replace(/[^\S\n]+/g, ' ');

  // Remove spaces at the beginning/end of lines
  text = text.replace(/^[ \t]+|[ \t]+$/gm, '');

  return text;
}

// Render a single message object {author, parts}
function renderMessage(container, msg) {
  const message = document.createElement("div");
  message.className = "message";

  const authorDiv = document.createElement("div");
  const authorClass = msg.author.toLowerCase().replace(/\s+/g, '-');
  authorDiv.className = `author ${authorClass}`;
  authorDiv.textContent = msg.author;
  message.appendChild(authorDiv);

  if (msg.parts) {
    msg.parts.forEach((part) => {
      const contentDiv = document.createElement("div");
      contentDiv.className = "message-content";

      if (part.text) {
        // Clean ChatGPT markup first
        let cleanedText = cleanChatGPTMarkup(part.text);

        // Protect LaTeX from markdown processing
        const latexBlocks = [];
        let latexIndex = 0;
        const latexCount = { display: 0, inline: 0 };

        // Use HTML comments as placeholders - markdown won't touch these
        // Protect display math \[ \]
        cleanedText = cleanedText.replace(/\\\[([\s\S]*?)\\\]/g, (match) => {
          const placeholder = `<!--LATEXDISPLAY${latexIndex}-->`;
          latexBlocks[latexIndex] = match;
          latexIndex++;
          latexCount.display++;
          return placeholder;
        });

        // Protect display math $$ $$
        cleanedText = cleanedText.replace(/\$\$([\s\S]*?)\$\$/g, (match) => {
          const placeholder = `<!--LATEXDISPLAY${latexIndex}-->`;
          latexBlocks[latexIndex] = match;
          latexIndex++;
          latexCount.display++;
          return placeholder;
        });

        // Protect inline math \( \)
        cleanedText = cleanedText.replace(/\\\(([\s\S]*?)\\\)/g, (match) => {
          const placeholder = `<!--LATEXINLINE${latexIndex}-->`;
          latexBlocks[latexIndex] = match;
          latexIndex++;
          latexCount.inline++;
          return placeholder;
        });

        // Protect inline math $ $ (but be careful not to catch currency)
        cleanedText = cleanedText.replace(/\$([^\s$][^$]*?)\$/g, (match, content) => {
          // Only treat as LaTeX if it contains backslashes or common LaTeX commands
          if (content.indexOf('\\') !== -1 || /[a-zA-Z]{2,}/.test(content)) {
            const placeholder = `<!--LATEXINLINE${latexIndex}-->`;
            latexBlocks[latexIndex] = match;
            latexIndex++;
            latexCount.inline++;
            return placeholder;
          }
          return match;
        });

        // Debug logging if LaTeX was found
        if (latexIndex > 0) {
          console.log(`Protected ${latexIndex} LaTeX blocks (${latexCount.display} display, ${latexCount.inline} inline)`);
        }

        // Use marked.js to parse markdown
        try {
          contentDiv.innerHTML = marked.parse(cleanedText);

          // Restore LaTeX blocks from HTML comments
          let html = contentDiv.innerHTML;
          let restoredCount = 0;
          
          for (let i = 0; i < latexBlocks.length; i++) {
            if (latexBlocks[i]) {
              // HTML comments are preserved by markdown
              const displayPlaceholder = `<!--LATEXDISPLAY${i}-->`;
              const inlinePlaceholder = `<!--LATEXINLINE${i}-->`;

              // Replace all occurrences
              while (html.indexOf(displayPlaceholder) !== -1) {
                html = html.replace(displayPlaceholder, latexBlocks[i]);
                restoredCount++;
              }
              while (html.indexOf(inlinePlaceholder) !== -1) {
                html = html.replace(inlinePlaceholder, latexBlocks[i]);
                restoredCount++;
              }
            }
          }
          
          if (restoredCount > 0) {
            console.log(`Restored ${restoredCount} LaTeX blocks`);
          }
          contentDiv.innerHTML = html;

          // Process links to add title attributes for hover display
          const links = contentDiv.getElementsByTagName('a');
          for (let i = 0; i < links.length; i++) {
            const link = links[i];
            const href = link.getAttribute('href');
            if (href && href.length > 40) {
              // For long URLs, show truncated text and full URL on hover
              if (!link.title) {
                link.title = href;
              }
              // If link text is the same as href and it's long, truncate it
              if (link.textContent === href && href.length > 50) {
                link.textContent = `${href.substring(0, 40)}...${href.substring(href.length - 10)}`;
              }
            }
          }

          // Render LaTeX using KaTeX
          try {
            if (typeof renderMathInElement !== 'undefined') {
              renderMathInElement(contentDiv, {
                delimiters: [
                  { left: '$$', right: '$$', display: true },
                  { left: '\\[', right: '\\]', display: true },
                  { left: '$', right: '$', display: false },
                  { left: '\\(', right: '\\)', display: false }
                ],
                throwOnError: false,
                trust: true,
                ignoredTags: [],
                ignoredClasses: []
              });
            } else {
              console.warn('KaTeX renderMathInElement not loaded');
            }
          } catch (e) {
            console.error('LaTeX rendering error:', e);
          }
        } catch (e) {
          // Fallback to plain text if markdown parsing fails
          contentDiv.textContent = cleanedText;
        }
      } else if (part.transcript) {
        contentDiv.innerHTML = `<em>[Transcript]: ${part.transcript}</em>`;
      } else if (part.asset) {
        // Handle asset pointers - images, audio, video, files
        const assetPointer = part.asset.asset_pointer || part.asset;
        let link = null;

        // Check if assetsJson has the asset
        if (assetsJson && typeof assetsJson === 'object' && Object.keys(assetsJson).length > 0) {
          link = assetsJson[assetPointer];
        }

        if (link) {
          const ext = link.split('.').pop().toLowerCase();
          const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext);
          const isAudio = ['mp3', 'wav', 'ogg', 'm4a'].includes(ext);
          const isVideo = ['mp4', 'webm', 'mov'].includes(ext);

          if (isImage) {
            contentDiv.innerHTML = `<div style="margin: 10px 0;"><img src="${link}" style="max-width: 100%; border-radius: 8px; border: 1px solid #e5e7eb;" alt="Image" onerror="this.parentElement.innerHTML='<em>[Image not found]</em>'"></div>`;
          } else if (isAudio) {
            contentDiv.innerHTML = `<div style="margin: 10px 0;"><audio controls style="width: 100%;"><source src="${link}"></audio></div>`;
          } else if (isVideo) {
            contentDiv.innerHTML = `<div style="margin: 10px 0;"><video controls style="max-width: 100%; border-radius: 8px;"><source src="${link}"></video></div>`;
          } else {
            contentDiv.innerHTML = `<strong>[File]:</strong> <a href="${link}" target="_blank">${link.split('/').pop()}</a>`;
          }
        } else {
          // Asset not found in assets.json
          contentDiv.innerHTML = `<em>[Asset: ${assetPointer || 'unknown'} - not found in assets.json]</em>`;
        }
      }

      message.appendChild(contentDiv);
    });
  }

  container.appendChild(message);
}

// Initial render - just show placeholders, load on demand
function renderNextBatch() {
  // Don't auto-load anything - user will click to load specific periods
  document.querySelector("#loadMoreButton").style.display = "none";
}

// Initialize when page loads
window.onload = async () => {
  // Load assets first (optional but helpful for file references)
  await loadAssets();

  // Load conversations (required)
  await loadConversations();

  // Set up load more button
  const btn = document.querySelector("#loadMoreButton");
  btn.onclick = renderNextBatch;
};

