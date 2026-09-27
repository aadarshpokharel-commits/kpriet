'use strict';

// ══════════════════════════════════════════════════════════════════════════
// PIYUSHDHARA AI ASSISTANT — Next-Gen Smart Teaching Copilot
// ══════════════════════════════════════════════════════════════════════════

const AIAssistant = (() => {

  let isLoading = false;
  let activeMode = 'all'; // 'all', 'math', 'concept', 'quiz'
  let chatHistory = [];
  let recognition = null;
  let isListening = false;
  let pendingSelection = null;
  let contextualMenu = null;
  let selectionVersion = 0;

  function currentSubjectContext() {
    return window.CurrentSubjectContext || window.EduverseSubjectContext || {};
  }

  function authHeaders(accessToken) {
    const headers = { 'Content-Type': 'application/json' };
    const context = currentSubjectContext();
    let token = accessToken || context.accessToken || '';
    try {
      if (!/^[\w-]+\.[\w-]+\.[\w-]+$/.test(String(token))) token = context.token || '';
      if (!/^[\w-]+\.[\w-]+\.[\w-]+$/.test(String(token))) token = localStorage.getItem('eduverse_token') || '';
      if (!/^[\w-]+\.[\w-]+\.[\w-]+$/.test(String(token))) token = sessionStorage.getItem('token') || '';
    } catch (e) {}
    // The Smart Board sessionId is not an authentication credential.
    if (/^[\w-]+\.[\w-]+\.[\w-]+$/.test(String(token))) headers.Authorization = `Bearer ${token}`;
    return headers;
  }

  async function refreshDashboardSession() {
    for (const path of ['/api/v1/auth/refresh', '/api/auth/refresh']) {
      try {
        const response = await fetch(path, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        });
        if (response.status === 404) continue;
        if (!response.ok) return '';
        const json = await response.json().catch(() => ({}));
        const token = json.data?.accessToken || json.accessToken || '';
        return /^[\w-]+\.[\w-]+\.[\w-]+$/.test(String(token)) ? token : '';
      } catch (e) {
        return '';
      }
    }
    return '';
  }

  function shapeContext(shape) {
    if (!shape) return null;
    const type = String(shape.type || 'object').slice(0, 60);
    let detail;
    if (type === 'graph') {
      detail = {
        title: shape.title,
        equations: (shape.equations || []).slice(0, 12).map((equation) => ({
          label: equation.label,
          expression: equation.expr,
          visible: equation.visible !== false,
        })),
        xRange: [shape.xMin, shape.xMax],
        yRange: [shape.yMin, shape.yMax],
      };
    } else if (type === 'text-block') {
      detail = { text: shape.text };
    } else {
      const allowed = ['title', 'text', 'content', 'label', 'formula', 'latex', 'expr', 'description', 'fileName', 'w', 'h', 'points', 'vertices', 'values'];
      detail = {};
      allowed.forEach((key) => {
        if (shape[key] !== undefined) detail[key] = shape[key];
      });
      if (!Object.keys(detail).length) detail = { type, dimensions: { width: shape.w, height: shape.h } };
    }
    let content;
    try { content = JSON.stringify(detail); }
    catch (error) { content = JSON.stringify({ type, description: String(shape.title || shape.label || type) }); }
    if (content.length > 8000) content = content.slice(0, 8000);
    return {
      type,
      content,
      imageSrc: type.toLowerCase().includes('image') ? (shape.src || shape.dataUrl || shape.imageData || shape.url || null) : null,
      source: 'canvas',
    };
  }

  function compressImageDataUrl(source) {
    return new Promise((resolve, reject) => {
      if (typeof source !== 'string' || !source) return reject(new Error('This image is not available to the Smart Board AI.'));
      const loadSource = source.startsWith('data:image/') || source.startsWith('blob:')
        ? source
        : null;
      if (!loadSource) return reject(new Error('Only an image inserted on this board can be analyzed.'));
      const image = new Image();
      image.onload = () => {
        const longest = Math.max(image.naturalWidth || image.width, image.naturalHeight || image.height);
        let scale = Math.min(1, 768 / Math.max(1, longest));
        let dataUrl = '';
        for (let attempt = 0; attempt < 6; attempt += 1) {
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round((image.naturalWidth || image.width) * scale));
          canvas.height = Math.max(1, Math.round((image.naturalHeight || image.height) * scale));
          const ctx = canvas.getContext('2d');
          if (!ctx) return reject(new Error('Could not prepare this image for analysis.'));
          ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
          dataUrl = canvas.toDataURL('image/jpeg', Math.max(0.3, 0.68 - attempt * 0.07));
          if (dataUrl.length <= 1_800_000) return resolve(dataUrl);
          scale *= 0.75;
        }
        if (dataUrl.length <= 2_300_000) return resolve(dataUrl);
        reject(new Error('This image is too large to analyze. Resize it on the board and try again.'));
      };
      image.onerror = () => reject(new Error('Could not read this board image.'));
      image.src = loadSource;
    });
  }

  async function callSharedRag(promptText, selection) {
    const context = currentSubjectContext();
    const subjectId = context.subjectId || context.subject?.id || context.subject?._id;
    if (!subjectId) throw new Error('Launch the Smart Board from a subject workspace to use its shared course AI.');

    let question = promptText;
    if (activeMode === 'math') question = `Give a clear, step-by-step mathematical or scientific explanation. ${question}`;
    else if (activeMode === 'concept') question = `Explain this simply for engineering students, with an intuitive example when supported. ${question}`;
    else if (activeMode === 'quiz') question = `Create a short classroom practice quiz using the approved course material. ${question}`;

    const focus = context.focus || {};
    const simulationContext = context.simulationContext || null;
    const activeSimulationContent = simulationContext
      ? `Active Smart Board simulation state:\n${JSON.stringify(simulationContext).slice(0, 7200)}`
      : '';
    const selectedContent = [selection?.content || '', activeSimulationContent]
      .filter(Boolean)
      .join('\n\n')
      .slice(0, 7900);
    const boardContext = {
      departmentId: context.departmentId || context.department?.id || '',
      semesterId: context.semesterId || context.semester?.id || context.semester?._id || '',
      subjectId,
      teacherId: String(context.role || '').toLowerCase() === 'teacher'
        ? (context.teacherId || context.userId || context.user?.id || '')
        : '',
      sectionId: context.sectionId || context.section || '',
      currentTopic: simulationContext?.topic || focus.topic || '',
      currentLesson: simulationContext?.simulation || context.initialResource?.title || focus.unitTitle || '',
      currentBoardPage: Number(document.getElementById('sb-page')?.textContent) || 1,
      selectedObjectType: selection?.type || (simulationContext ? 'DSA simulation state' : ''),
      selectedObjectContent: selectedContent,
    };
    if (selection?.imageSrc) boardContext.selectedObjectImage = await compressImageDataUrl(selection.imageSrc);

    const body = {
      subjectId,
      question,
      chapter: focus.unitNumber || focus.unitTitle || undefined,
      topic: focus.topic || undefined,
      boardContext,
    };
    let response;
    let refreshed = false;
    let headers = authHeaders();
    for (const path of ['/api/v1/ai/query', '/api/ai/query']) {
      response = await fetch(path, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify(body),
      });
      if (response.status === 401 && !refreshed) {
        refreshed = true;
        const accessToken = await refreshDashboardSession();
        if (accessToken) {
          headers = authHeaders(accessToken);
          response = await fetch(path, {
            method: 'POST',
            headers,
            credentials: 'include',
            body: JSON.stringify(body),
          });
        }
      }
      if (response.status !== 404) break;
    }
    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status === 401) throw new Error('Your dashboard session is not available here. Sign in to the dashboard, then reopen the Smart Board.');
      throw new Error(json.message || json.error || `Subject AI request failed (${response.status}).`);
    }
    return json.data || json;
  }

  function responseText(result) {
    const blocks = [];
    const status = result.courseMaterialStatus;
    const found = status === 'FOUND' || status === 'PARTIAL';
    blocks.push(`### ${found ? 'AI answer · course material available' : 'AI answer · general knowledge'}`);
    if (result.directAnswer) blocks.push(result.directAnswer);
    if (result.explanation && result.explanation !== result.directAnswer) blocks.push(result.explanation);
    if (result.additionalExplanation) blocks.push(`### Extra context\n${result.additionalExplanation}`);
    if (found && Array.isArray(result.citations) && result.citations.length) {
      blocks.push(`### Course sources\n${result.citations.join('\n')}`);
    }
    return blocks.join('\n\n');
  }

  // ─────────────────────────────────────────────
  // UI MOUNTING — Modern Floating Smart AI Panel
  // ─────────────────────────────────────────────
  function ensureDrawerMounted() {
    if (document.getElementById('ai-drawer')) return;

    const drawer = document.createElement('div');
    drawer.id = 'ai-drawer';
    drawer.className = 'ai-drawer hidden';
    drawer.innerHTML = `
      <!-- Top Glow & Mesh Effect -->
      <div class="ai-ambient-glow"></div>

      <!-- Modern Glass Header -->
      <div class="ai-drawer-header">
        <div class="ai-header-left">
          <div class="ai-avatar-badge">
            <div class="ai-avatar-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="11" width="18" height="10" rx="4"></rect>
                <circle cx="12" cy="5" r="2"></circle>
                <path d="M12 7v4"></path>
                <line x1="8" y1="16" x2="8.01" y2="16"></line>
                <line x1="16" y1="16" x2="16.01" y2="16"></line>
              </svg>
            </div>
            <span class="ai-status-beacon" title="AI Ready & Connected"></span>
            </div>
            <div class="ai-title-group">
              <div class="ai-brand-headline">
                <span class="ai-brand-text">PiyushDhara AI</span>
            <span class="ai-model-pill">🤖 AI + course sources</span>
              </div>
            <span class="ai-sub-status" id="ai-subject-status">Connecting to subject materials…</span>
            </div>
        </div>

        <div class="ai-header-right">
          <button class="ai-nav-btn" onclick="AIAssistant.clearChatHistory()" title="Clear conversation" aria-label="Clear Chat">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 6h18"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
          <button class="ai-nav-btn close" onclick="AIAssistant.closePanel()" title="Close Assistant (Esc)" aria-label="Close">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>

      <!-- Category Filter Tabs -->
      <div class="ai-tabs-strip">
        <button class="ai-tab-chip active" data-mode="all" onclick="AIAssistant.setMode('all')">
          <span>✨</span> All Topics
        </button>
        <button class="ai-tab-chip" data-mode="math" onclick="AIAssistant.setMode('math')">
          <span>📐</span> Math & Physics
        </button>
        <button class="ai-tab-chip" data-mode="concept" onclick="AIAssistant.setMode('concept')">
          <span>💡</span> Concepts
        </button>
        <button class="ai-tab-chip" data-mode="quiz" onclick="AIAssistant.setMode('quiz')">
          <span>📝</span> Practice Quiz
        </button>
      </div>

      <!-- Chat / Conversation Stream Area -->
      <div class="ai-stream-container" id="ai-stream-container">

        <!-- Welcome Banner & Quick Prompts (visible when empty) -->
        <div id="ai-empty-state" class="ai-empty-state">
          <div class="ai-hero-illustration">
            <div class="ai-hero-circle">
              <span class="ai-hero-icon">🤖</span>
            </div>
          </div>
          <h3 class="ai-hero-title">Ask about this subject</h3>
          <p class="ai-hero-sub">Ask about anything. AI answers from its knowledge and uses this subject’s course materials when they help. Select board content for a focused answer.</p>

          <div class="ai-quick-suggestions">
            <div class="ai-sug-title">Classroom prompts</div>
            <div class="ai-sug-grid">
              <button class="ai-sug-card" onclick="AIAssistant.setPrompt('Explain the selected concept for students.')">
                <span class="ai-sug-icon">💡</span>
                <span class="ai-sug-text">Explain a concept</span>
              </button>
              <button class="ai-sug-card" onclick="AIAssistant.setPrompt('Why is this used?')">
                <span class="ai-sug-icon">❓</span>
                <span class="ai-sug-text">Why is it used?</span>
              </button>
              <button class="ai-sug-card" onclick="AIAssistant.setPrompt('Explain an engineering application of this topic, and mark any extra explanation clearly.')">
                <span class="ai-sug-icon">🏗️</span>
                <span class="ai-sug-text">Engineering application</span>
              </button>
              <button class="ai-sug-card" onclick="AIAssistant.setPrompt('Give one classroom example based on the current subject material.')">
                <span class="ai-sug-icon">📝</span>
                <span class="ai-sug-text">Give an example</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Dynamic Message Stream -->
        <div id="ai-chat-feed" class="ai-chat-feed"></div>

        <!-- Live Loading Indicator -->
        <div id="ai-loading-card" class="ai-loading-card hidden">
          <div class="ai-thinking-orb">
            <div class="ai-orb-ring"></div>
            <div class="ai-orb-core">✨</div>
          </div>
          <div class="ai-thinking-text-wrap">
            <div class="ai-thinking-title" id="ai-loading-title">Asking AI and checking course materials…</div>
            <div class="ai-thinking-sub">Course materials support the answer when they are relevant</div>
          </div>
        </div>

      </div>

      <!-- Bottom Interactive Input Capsule -->
      <div class="ai-bottom-dock">
        <div class="ai-input-capsule">
          <textarea 
            id="ai-solve-input" 
            class="ai-smart-textarea" 
            rows="1" 
            placeholder="Ask about this subject or the selected board object…"
            aria-label="Ask AI Assistant"></textarea>

          <div class="ai-capsule-actions">
            <!-- Voice Input Button -->
            <button id="ai-mic-btn" class="ai-action-icon-btn" onclick="AIAssistant.toggleVoiceInput()" title="Voice Dictation (Speech to text)">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                <line x1="12" y1="19" x2="12" y2="23"></line>
                <line x1="8" y1="23" x2="16" y2="23"></line>
              </svg>
            </button>

            <!-- Send Action Button -->
            <button id="btn-ai-solve-run" class="ai-send-btn" onclick="AIAssistant.askQuestion()" title="Send question (Enter)">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </button>
          </div>
        </div>

        <div class="ai-dock-hints">
          <span>💡 <b>Enter</b> to send · <b>Shift + Enter</b> for new line</span>
          <span class="ai-brand-tag">PiyushDhara SmartBoard Copilot</span>
        </div>
      </div>
    `;

    document.body.appendChild(drawer);

    // Auto-adjust textarea height on input
    const textarea = document.getElementById('ai-solve-input');
    if (textarea) {
      textarea.addEventListener('input', () => {
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
      });

      textarea.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          askQuestion();
        }
      });
    }

    // Initialize Web Speech Recognition if available
    initSpeechRecognition();

    updateSubjectLabel();
    mountSelectionAssistant();
  }

  function updateSubjectLabel() {
    const status = document.getElementById('ai-subject-status');
    if (!status) return;
    const context = currentSubjectContext();
    const subject = context.subjectName || context.subject?.name || context.subject?.subjectName;
    const department = context.departmentName || context.department?.name;
    status.textContent = subject
      ? `${subject}${department ? ` · ${department}` : ''} · AI with course context`
      : 'Open from a subject workspace to add course context to AI answers';
  }

  function mountSelectionAssistant() {
    if (contextualMenu || !document.body) return;
    contextualMenu = document.createElement('div');
    contextualMenu.className = 'sb-ai-selection-menu hidden';
    contextualMenu.setAttribute('role', 'toolbar');
    contextualMenu.setAttribute('aria-label', 'Ask AI about selected board content');
    contextualMenu.addEventListener('pointerdown', (event) => event.stopPropagation());
    contextualMenu.addEventListener('click', (event) => event.stopPropagation());
    document.body.appendChild(contextualMenu);

    window.addEventListener('smartboard:selection-change', (event) => {
      selectionVersion += 1;
      const shape = event.detail || null;
      if (shape && window.getSelection) window.getSelection().removeAllRanges();
      pendingSelection = shapeContext(shape);
      renderSelectionMenu(shape);
    });
    window.addEventListener('smartboard:clipboard-selection-change', (event) => {
      const requestVersion = ++selectionVersion;
      const detail = event.detail || {};
      const shapes = Array.isArray(detail.shapes) ? detail.shapes : [];
      const strokes = Array.isArray(detail.strokes) ? detail.strokes : [];
      if (!shapes.length && !strokes.length) {
        pendingSelection = null;
        contextualMenu.classList.add('hidden');
        return;
      }

      const objectContexts = shapes.slice(0, 30).map(shapeContext).filter(Boolean);
      const strokeSummary = strokes.slice(0, 120).map((stroke) => ({
        tool: stroke.tool || 'pen',
        color: stroke.color || '',
        points: (stroke.pts || stroke.points || []).slice(0, 120).map((point) => ({ x: point.x, y: point.y })),
      }));
      const imageContext = objectContexts.find((context) => context.imageSrc);
      let imageSrc = shapes.length === 1 ? (imageContext?.imageSrc || null) : null;
      const selectedBoardContent = {
        type: shapes.length + strokes.length > 1 ? 'selected board content' : (objectContexts[0]?.type || 'handwriting'),
        content: JSON.stringify({ objects: objectContexts.map(({ type, content }) => ({ type, content })), handwriting: strokeSummary }).slice(0, 8000),
        imageSrc,
        source: 'canvas',
      };
      if (!imageSrc && detail.bounds) {
        pendingSelection = selectedBoardContent;
        contextualMenu.classList.add('hidden');
        snapshotBoardRegion(detail.bounds).then((snapshot) => {
          if (requestVersion !== selectionVersion) return;
          pendingSelection = { ...selectedBoardContent, imageSrc: snapshot };
          renderPreparedSelectionMenu(boundsToScreenRect(detail.bounds));
        }).catch(() => {
          if (requestVersion !== selectionVersion) return;
          pendingSelection = selectedBoardContent;
          renderPreparedSelectionMenu(boundsToScreenRect(detail.bounds));
        });
        return;
      }
      pendingSelection = selectedBoardContent;
      renderPreparedSelectionMenu(boundsToScreenRect(detail.bounds));
    });
    window.addEventListener('smartboard:background-region-selection', async (event) => {
      const requestVersion = ++selectionVersion;
      const imageSrc = typeof Canvas !== 'undefined' && Canvas.getBgImage ? Canvas.getBgImage() : '';
      if (!imageSrc) return;
      const slide = typeof PptPresenter !== 'undefined' && PptPresenter.getCurrentSlideContext
        ? PptPresenter.getCurrentSlideContext()
        : null;
      const bounds = event.detail?.bounds || null;
      let selectedImage = imageSrc;
      if (bounds) {
        try { selectedImage = await cropBackgroundToSelection(imageSrc, bounds); } catch (error) {}
      }
      if (requestVersion !== selectionVersion) return;
      pendingSelection = {
        type: slide ? 'PowerPoint slide region' : 'board background image region',
        content: JSON.stringify({ slide, selectedBoardRegion: bounds || 'entire background image' }),
        imageSrc: selectedImage,
        source: 'board-background',
        backgroundBounds: bounds,
        wholeImage: !bounds,
      };
      renderPreparedSelectionMenu(boundsToScreenRect(bounds));
    });
    window.addEventListener('smartboard:subject-context-ready', updateSubjectLabel);

    document.addEventListener('mouseup', (event) => {
      setTimeout(() => {
        const text = window.getSelection ? window.getSelection().toString().trim() : '';
        if (text.length > 2 && text.length <= 8000 && !event.target?.closest?.('#ai-drawer, .sb-ai-selection-menu, input, textarea, button, [contenteditable="true"]')) {
          selectionVersion += 1;
          pendingSelection = { type: 'selected text', content: JSON.stringify({ text }), imageSrc: null, source: 'document', editable: false };
          try {
            renderPreparedSelectionMenu(window.getSelection().getRangeAt(0).getBoundingClientRect());
          } catch (e) {}
        }
      }, 0);
    });

    // PPT slides are rasterized onto the board as its background image. A tap
    // selects the whole slide; a drag/lasso is handled by the region event above.
    const shapeCanvas = document.getElementById('shape-canvas');
    let backgroundPointerStart = null;
    shapeCanvas?.addEventListener('pointerdown', (event) => {
      backgroundPointerStart = { x: event.clientX, y: event.clientY };
    });
    shapeCanvas?.addEventListener('pointerup', (event) => {
      if (!backgroundPointerStart) return;
      const start = backgroundPointerStart;
      backgroundPointerStart = null;
      if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > 10) return;
      if (typeof App !== 'undefined' && App.currentTool !== 'select') return;
      if (typeof Canvas === 'undefined' || !Canvas.getBgImage?.() || Canvas.getSelected?.()) return;
      if (typeof BoardClipboard !== 'undefined' && BoardClipboard.hasSelection?.()) return;

      const slide = typeof PptPresenter !== 'undefined' && PptPresenter.getCurrentSlideContext
        ? PptPresenter.getCurrentSlideContext()
        : null;
      selectionVersion += 1;
      const imageSrc = Canvas.getBgImage();
      pendingSelection = {
        type: slide ? 'PowerPoint slide' : 'board background image',
        content: JSON.stringify({ slide, selection: 'entire background image' }),
        imageSrc,
        source: 'board-background',
        backgroundBounds: null,
        wholeImage: true,
      };
      renderPreparedSelectionMenu({ left: event.clientX, top: event.clientY, width: 1, height: 1 });
    });

    const splitWorkspace = document.getElementById('workspace-split-container');
    let splitPptPointerStart = null;
    splitWorkspace?.addEventListener('pointerdown', (event) => {
      const canvas = event.target?.closest?.('.wp-ppt-slide-cv');
      splitPptPointerStart = canvas ? { canvas, x: event.clientX, y: event.clientY } : null;
      if (canvas && typeof Canvas !== 'undefined' && Canvas.deselectAll) Canvas.deselectAll();
    });
    splitWorkspace?.addEventListener('pointerup', async (event) => {
      const start = splitPptPointerStart;
      splitPptPointerStart = null;
      if (!start || !start.canvas || !start.canvas.isConnected) return;
      const canvas = start.canvas;
      const moved = Math.hypot(event.clientX - start.x, event.clientY - start.y) > 10;
      const context = typeof WorkspaceSplit !== 'undefined' && WorkspaceSplit.getPptContext
        ? WorkspaceSplit.getPptContext(canvas.id.replace('wp-ppt-slide-', ''))
        : null;
      if (!context) return;

      const requestVersion = ++selectionVersion;
      const bounds = {
        left: Math.min(start.x, event.clientX),
        top: Math.min(start.y, event.clientY),
        width: Math.max(1, Math.abs(event.clientX - start.x)),
        height: Math.max(1, Math.abs(event.clientY - start.y)),
      };
      let selectedImage = '';
      try { selectedImage = await captureCanvasRegion(canvas, start, event, moved); } catch (error) {}
      if (!selectedImage && context.imageSrc) selectedImage = context.imageSrc;
      if (requestVersion !== selectionVersion || !selectedImage) return;

      pendingSelection = {
        type: moved ? 'PowerPoint slide region' : 'PowerPoint slide',
        content: JSON.stringify({ fileName: context.fileName, slideNumber: context.slideNumber, totalSlides: context.totalSlides }),
        imageSrc: selectedImage,
        source: 'workspace-ppt',
        canEdit: context.canEdit,
        partitionId: canvas.id.replace('wp-ppt-slide-', ''),
        workspaceBounds: {
          left: moved ? Math.max(0, Math.min(1, (bounds.left - canvas.getBoundingClientRect().left) / Math.max(1, canvas.getBoundingClientRect().width))) : 0,
          top: moved ? Math.max(0, Math.min(1, (bounds.top - canvas.getBoundingClientRect().top) / Math.max(1, canvas.getBoundingClientRect().height))) : 0,
          width: moved ? Math.max(0, Math.min(1, bounds.width / Math.max(1, canvas.getBoundingClientRect().width))) : 1,
          height: moved ? Math.max(0, Math.min(1, bounds.height / Math.max(1, canvas.getBoundingClientRect().height))) : 1,
        },
      };
      renderPreparedSelectionMenu(bounds);
    });

    window.addEventListener('resize', () => positionSelectionMenu());
    window.addEventListener('scroll', () => positionSelectionMenu(), true);
  }

  function renderSelectionMenu(shape, selectionRect) {
    mountSelectionAssistant();
    if (!contextualMenu) return;
    if (shape) pendingSelection = shapeContext(shape);
    if (!pendingSelection) {
      contextualMenu.classList.add('hidden');
      return;
    }
    renderPreparedSelectionMenu(selectionRect);
  }

  function renderPreparedSelectionMenu(selectionRect) {
    if (!pendingSelection) return;
    if (pendingSelection.source === 'canvas' && typeof BoardClipboard !== 'undefined' && BoardClipboard.hasSelection?.()) {
      contextualMenu?.classList.add('hidden');
      return;
    }
    const type = String(pendingSelection.type || 'content').toLowerCase();
    const actions = ['Ask AI', 'Copy', 'Cut', 'Delete'];
    mountSelectionAssistant();
    if (!contextualMenu) return;
    contextualMenu.innerHTML = `<div class="sb-ai-selection-title">Selected: ${escapeHtml(pendingSelection.type || 'board content')}</div><div class="sb-ai-selection-actions">${actions.map((action, index) => `<button type="button" class="sb-ai-selection-action${index === 0 ? ' primary' : ''}" data-ai-action="${escapeHtml(action)}">${index === 0 ? '✨ ' : ''}${escapeHtml(action)}</button>`).join('')}</div>`;
    contextualMenu.querySelectorAll('[data-ai-action]').forEach((button) => {
      if ((button.dataset.aiAction === 'Cut' || button.dataset.aiAction === 'Delete') && pendingSelection.source === 'document' && !pendingSelection.editable) {
        button.disabled = true;
        button.title = 'Cut and Delete are available for editable board objects.';
      }
      if ((button.dataset.aiAction === 'Cut' || button.dataset.aiAction === 'Delete') && pendingSelection.source === 'workspace-ppt' && !pendingSelection.partitionId) {
        button.disabled = true;
        button.title = 'This presentation slide cannot be edited here.';
      }
      if ((button.dataset.aiAction === 'Cut' || button.dataset.aiAction === 'Delete') && pendingSelection.source === 'workspace-ppt' && pendingSelection.canEdit === false) {
        button.disabled = true;
        button.title = 'Load a presentation slide before editing it.';
      }
      button.addEventListener('click', () => askAboutSelection(button.getAttribute('data-ai-action')));
    });
    contextualMenu.classList.remove('hidden');
    positionSelectionMenu(null, selectionRect);
  }

  function boundsToScreenRect(bounds) {
    if (!bounds || typeof Canvas === 'undefined' || !Canvas.boardToScreen) return null;
    const zone = document.getElementById('canvas-zone');
    const rect = zone?.getBoundingClientRect();
    if (!rect) return null;
    const topLeft = Canvas.boardToScreen(bounds.x, bounds.y);
    const bottomRight = Canvas.boardToScreen(bounds.x + bounds.w, bounds.y + bounds.h);
    return {
      left: rect.left + topLeft.x,
      top: rect.top + topLeft.y,
      width: bottomRight.x - topLeft.x,
      height: bottomRight.y - topLeft.y,
    };
  }

  function cropBackgroundToSelection(source, bounds) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        const scale = Math.min(1920 / image.naturalWidth, 1080 / image.naturalHeight);
        const drawWidth = image.naturalWidth * scale;
        const drawHeight = image.naturalHeight * scale;
        const offsetX = (1920 - drawWidth) / 2;
        const offsetY = (1080 - drawHeight) / 2;
        const left = Math.max(bounds.x, offsetX);
        const top = Math.max(bounds.y, offsetY);
        const right = Math.min(bounds.x + bounds.w, offsetX + drawWidth);
        const bottom = Math.min(bounds.y + bounds.h, offsetY + drawHeight);
        if (right <= left || bottom <= top) return resolve(source);
        const sx = Math.max(0, (left - offsetX) / scale);
        const sy = Math.max(0, (top - offsetY) / scale);
        const sw = Math.min(image.naturalWidth - sx, (right - left) / scale);
        const sh = Math.min(image.naturalHeight - sy, (bottom - top) / scale);
        const crop = document.createElement('canvas');
        crop.width = Math.max(1, Math.round(sw));
        crop.height = Math.max(1, Math.round(sh));
        const ctx = crop.getContext('2d');
        if (!ctx) return reject(new Error('Could not crop the selected slide region.'));
        ctx.drawImage(image, sx, sy, sw, sh, 0, 0, crop.width, crop.height);
        resolve(crop.toDataURL('image/jpeg', 0.9));
      };
      image.onerror = () => reject(new Error('Could not read the selected background image.'));
      image.src = source;
    });
  }

  function snapshotBoardRegion(bounds) {
    return new Promise((resolve, reject) => {
      if (typeof Canvas === 'undefined' || !Canvas.snapshot || !Canvas.getExportBounds) {
        return reject(new Error('Board snapshot is unavailable.'));
      }
      const snapshot = Canvas.snapshot();
      const exportBounds = Canvas.getExportBounds();
      const dpr = Math.max(1.5, Canvas.getDPR?.() || window.devicePixelRatio || 1);
      const image = new Image();
      image.onload = () => {
        const sx = Math.max(0, Math.round((bounds.x - exportBounds.minX) * dpr));
        const sy = Math.max(0, Math.round((bounds.y - exportBounds.minY) * dpr));
        const sw = Math.min(image.naturalWidth - sx, Math.round(bounds.w * dpr));
        const sh = Math.min(image.naturalHeight - sy, Math.round(bounds.h * dpr));
        if (sw <= 0 || sh <= 0) return reject(new Error('Selected board area is empty.'));
        const crop = document.createElement('canvas');
        crop.width = Math.max(1, Math.min(sw, 1800));
        crop.height = Math.max(1, Math.min(sh, 1800));
        const ctx = crop.getContext('2d');
        if (!ctx) return reject(new Error('Could not prepare the selected board area.'));
        ctx.drawImage(image, sx, sy, sw, sh, 0, 0, crop.width, crop.height);
        resolve(crop.toDataURL('image/jpeg', 0.88));
      };
      image.onerror = () => reject(new Error('Could not read the selected board area.'));
      image.src = snapshot;
    });
  }

  function captureCanvasRegion(canvas, start, end, cropRegion) {
    return new Promise((resolve, reject) => {
      const rect = canvas.getBoundingClientRect();
      let source;
      try { source = canvas.toDataURL('image/png'); }
      catch (error) { return reject(error); }
      if (!cropRegion) return resolve(source);
      const image = new Image();
      image.onload = () => {
        const scaleX = image.naturalWidth / Math.max(1, rect.width);
        const scaleY = image.naturalHeight / Math.max(1, rect.height);
        const left = Math.max(rect.left, Math.min(rect.right, Math.min(start.x, end.clientX)));
        const top = Math.max(rect.top, Math.min(rect.bottom, Math.min(start.y, end.clientY)));
        const right = Math.max(left, Math.min(rect.right, Math.max(start.x, end.clientX)));
        const bottom = Math.max(top, Math.min(rect.bottom, Math.max(start.y, end.clientY)));
        const sx = Math.max(0, Math.round((left - rect.left) * scaleX));
        const sy = Math.max(0, Math.round((top - rect.top) * scaleY));
        const sw = Math.min(image.naturalWidth - sx, Math.max(1, Math.round((right - left) * scaleX)));
        const sh = Math.min(image.naturalHeight - sy, Math.max(1, Math.round((bottom - top) * scaleY)));
        if (sw <= 0 || sh <= 0) return resolve(source);
        const crop = document.createElement('canvas');
        crop.width = Math.min(1800, sw);
        crop.height = Math.min(1800, sh);
        const ctx = crop.getContext('2d');
        if (!ctx) return reject(new Error('Could not crop the selected slide region.'));
        ctx.drawImage(image, sx, sy, sw, sh, 0, 0, crop.width, crop.height);
        resolve(crop.toDataURL('image/jpeg', 0.9));
      };
      image.onerror = () => reject(new Error('Could not read the selected presentation slide.'));
      image.src = source;
    });
  }

  function positionSelectionMenu(shape, selectionRect) {
    if (!contextualMenu || contextualMenu.classList.contains('hidden')) return;
    let x = window.innerWidth - 340;
    let y = 100;
    const zone = document.getElementById('canvas-zone');
    const rect = zone?.getBoundingClientRect();
    if (selectionRect) {
      x = selectionRect.left + selectionRect.width / 2;
      y = selectionRect.top;
    } else if (shape && rect && typeof Canvas !== 'undefined' && Canvas.boardToScreen) {
      const anchor = Canvas.boardToScreen((Number(shape.x) || 0) + (Number(shape.w) || 80) / 2, Number(shape.y) || 0);
      x = rect.left + anchor.x;
      y = rect.top + anchor.y;
    }
    const menuWidth = Math.min(340, window.innerWidth - 24);
    contextualMenu.style.left = `${Math.max(12, Math.min(window.innerWidth - menuWidth - 12, x - menuWidth / 2))}px`;
    contextualMenu.style.top = `${Math.max(64, Math.min(window.innerHeight - 130, y - 62))}px`;
  }

  async function askAboutSelection(action) {
    if (!pendingSelection) return;
    const selection = { ...pendingSelection };
    const type = selection.type || 'object';
    if (action === 'Copy') {
      await copyPendingSelection(selection);
      return;
    }
    if (action === 'Cut') {
      if (await copyPendingSelection(selection)) deletePendingSelection(selection);
      return;
    }
    if (action === 'Delete') {
      deletePendingSelection(selection);
      return;
    }
    if (action === 'Ask AI') {
      openPanel();
      setPrompt(`Ask a question about this selected ${type}.`);
      return;
    }
    const prompt = `${action} the selected ${type}. Use the subject's course materials when relevant, and also answer from general knowledge when they do not cover it.`;
    openPanel();
    await askQuestion(prompt, selection);
  }

  async function copyPendingSelection(selection) {
    try {
      if (selection.source === 'document') {
        const selectedText = (() => { try { return JSON.parse(selection.content || '{}').text || ''; } catch (error) { return ''; } })();
        await navigator.clipboard.writeText(selectedText);
      } else if (selection.imageSrc && navigator.clipboard?.write && typeof ClipboardItem !== 'undefined') {
        const blob = await dataUrlToPngBlob(selection.imageSrc);
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      } else {
        throw new Error('Clipboard image access is unavailable here.');
      }
      if (typeof App !== 'undefined' && App.showToast) App.showToast('Copied selection to clipboard');
      return true;
    } catch (error) {
      if (typeof App !== 'undefined' && App.showToast) App.showToast('Could not copy this selection. Check clipboard permissions and try again.');
      return false;
    }
  }

  function dataUrlToPngBlob(dataUrl) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth || image.width;
        canvas.height = image.naturalHeight || image.height;
        const context = canvas.getContext('2d');
        if (!context) return reject(new Error('Image clipboard is unavailable.'));
        context.drawImage(image, 0, 0);
        canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Could not encode this image.')), 'image/png');
      };
      image.onerror = () => reject(new Error('Could not read the selected image.'));
      image.src = dataUrl;
    });
  }

  function deletePendingSelection(selection) {
    if (selection.source === 'board-background' && typeof Canvas !== 'undefined') {
      Canvas.saveHistory?.();
      if (selection.wholeImage || !selection.backgroundBounds) {
        Canvas.setBgImage(null);
      } else {
        eraseBackgroundRegion(selection.backgroundBounds);
      }
    } else if (selection.source === 'workspace-ppt' && typeof WorkspaceSplit !== 'undefined' && WorkspaceSplit.deletePptRegion) {
      WorkspaceSplit.deletePptRegion(selection.partitionId, selection.workspaceBounds);
    } else if (selection.source === 'document' && selection.editable) {
      document.execCommand('delete');
    } else if (selection.source === 'canvas' && typeof BoardClipboard !== 'undefined') {
      BoardClipboard.deleteSelected();
    }
    pendingSelection = null;
    contextualMenu?.classList.add('hidden');
  }

  function eraseBackgroundRegion(bounds) {
    const source = Canvas.getBgImage?.();
    if (!source) return;
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1920;
      canvas.height = 1080;
      const context = canvas.getContext('2d');
      if (!context) return;
      const scale = Math.min(1920 / image.naturalWidth, 1080 / image.naturalHeight);
      const width = image.naturalWidth * scale;
      const height = image.naturalHeight * scale;
      const left = (1920 - width) / 2;
      const top = (1080 - height) / 2;
      context.drawImage(image, left, top, width, height);
      context.clearRect(bounds.x, bounds.y, bounds.w, bounds.h);
      Canvas.setBgImage(canvas.toDataURL('image/png'));
    };
    image.src = source;
  }

  // ─────────────────────────────────────────────
  // VOICE SPEECH RECOGNITION
  // ─────────────────────────────────────────────
  function initSpeechRecognition() {
    const SpeechAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechAPI) return;

    try {
      recognition = new SpeechAPI();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        isListening = true;
        const micBtn = document.getElementById('ai-mic-btn');
        if (micBtn) micBtn.classList.add('recording');
        if (typeof App !== 'undefined' && App.showToast) {
          App.showToast('🎙️ Listening... Speak your question now');
        }
      };

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        const input = document.getElementById('ai-solve-input');
        if (input && transcript) {
          input.value = (input.value ? input.value + ' ' : '') + transcript;
          input.style.height = 'auto';
          input.style.height = Math.min(input.scrollHeight, 120) + 'px';
          input.focus();
        }
      };

      recognition.onerror = () => {
        isListening = false;
        const micBtn = document.getElementById('ai-mic-btn');
        if (micBtn) micBtn.classList.remove('recording');
      };

      recognition.onend = () => {
        isListening = false;
        const micBtn = document.getElementById('ai-mic-btn');
        if (micBtn) micBtn.classList.remove('recording');
      };
    } catch (e) {
      recognition = null;
    }
  }

  function toggleVoiceInput() {
    if (!recognition) {
      if (typeof App !== 'undefined' && App.showToast) {
        App.showToast('Voice input is not supported in this browser environment.');
      }
      return;
    }
    if (isListening) {
      try { recognition.stop(); } catch (e) {}
    } else {
      try { recognition.start(); } catch (e) {}
    }
  }

  // ─────────────────────────────────────────────
  // ACTIONS: ASK QUESTION
  // ─────────────────────────────────────────────
  async function askQuestion(promptOverride, selectionOverride) {
    const input = document.getElementById('ai-solve-input');
    const prompt = String(promptOverride || input?.value || '').trim();
    if (!prompt) {
      if (typeof App !== 'undefined' && App.showToast) {
        App.showToast('Please type or speak your question first.');
      }
      input?.focus();
      return;
    }

    // Hide empty state
    const emptyState = document.getElementById('ai-empty-state');
    if (emptyState) emptyState.style.display = 'none';

    // Append user message
    const msgId = 'msg-' + Date.now();
    appendUserBubble(prompt);

    // Clear input
    input.value = '';
    input.style.height = 'auto';

    // Show loading
    setLoading(true, 'Asking AI and checking relevant course materials…');
    scrollStreamToBottom();

    try {
      const response = await callSharedRag(prompt, selectionOverride || pendingSelection);
      const answer = responseText(response);
      appendAssistantBubble(answer, msgId, response);
      chatHistory.push({ question: prompt, answer });
    } catch (err) {
      appendErrorBubble(err.message || 'Could not contact the subject AI service.');
    } finally {
      setLoading(false);
      scrollStreamToBottom();
    }
  }

  // ─────────────────────────────────────────────
  // CHAT STREAM RENDERING
  // ─────────────────────────────────────────────
  function appendUserBubble(text) {
    const feed = document.getElementById('ai-chat-feed');
    if (!feed) return;

    const row = document.createElement('div');
    row.className = 'ai-msg-row user';
    row.innerHTML = `
      <div class="ai-msg-bubble user">
        <div class="ai-msg-text">${escapeHtml(text)}</div>
      </div>
    `;
    feed.appendChild(row);
  }

  function appendAssistantBubble(text, msgId, result) {
    const feed = document.getElementById('ai-chat-feed');
    if (!feed) return;

    const row = document.createElement('div');
    row.className = 'ai-msg-row assistant';
    row.id = msgId;

    const renderedHtml = formatMarkdownForPreview(text);
    const status = result?.courseMaterialStatus;
    const sourceLabel = status === 'FOUND' ? 'Course sources used' : status === 'PARTIAL' ? 'Partly supported by course sources' : 'No matching course source found';
    const sourceRows = Array.isArray(result?.sourceReferences) ? result.sourceReferences : [];
    const sourceMarkup = sourceRows.length
      ? `<div class="ai-source-list"><div class="ai-source-heading">${status === 'FOUND' || status === 'PARTIAL' ? 'Based on' : 'Retrieved course sources'}</div>${sourceRows.slice(0, 4).map((source) => `<div class="ai-source-item">${escapeHtml(source.documentTitle || 'Course material')} · ${escapeHtml(source.chapterOrUnit || 'Subject notes')}${source.sourceType ? ` · ${escapeHtml(source.sourceType)}` : ''}</div>`).join('')}</div>`
      : `<div class="ai-source-list"><div class="ai-source-heading">${escapeHtml(sourceLabel)}</div></div>`;

    row.innerHTML = `
      <div class="ai-assistant-avatar">
        <div class="ai-avatar-mini">🤖</div>
      </div>
      <div class="ai-msg-card">
        <div class="ai-card-header">
          <span class="ai-card-title">PiyushDhara AI · ${escapeHtml(sourceLabel)}</span>
          <span class="ai-card-time">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <div class="ai-card-content" id="content-${msgId}">
          ${renderedHtml}
        </div>
        ${sourceMarkup}
        <div class="ai-card-toolbar">
          <button class="ai-tool-pill" onclick="AIAssistant.copyCardText('${msgId}')" title="Copy solution to clipboard">
            <span>📋</span> Copy
          </button>
          <button class="ai-tool-pill primary" onclick="AIAssistant.insertCardToBoard('${msgId}')" title="Insert directly on Whiteboard">
            <span>✨</span> Paste on Board
          </button>
          <button class="ai-tool-pill" onclick="AIAssistant.speakCardText('${msgId}')" title="Read solution aloud">
            <span>🔊</span> Speak
          </button>
        </div>
      </div>
    `;
    feed.appendChild(row);
  }

  function appendErrorBubble(errorMsg) {
    const feed = document.getElementById('ai-chat-feed');
    if (!feed) return;

    const row = document.createElement('div');
    row.className = 'ai-msg-row assistant';
    row.innerHTML = `
      <div class="ai-assistant-avatar error">
        <div class="ai-avatar-mini">⚠️</div>
      </div>
      <div class="ai-msg-card error-card">
        <div class="ai-card-header">
          <span class="ai-card-title error-text">Notice</span>
        </div>
        <div class="ai-card-content error-desc">
          ${escapeHtml(errorMsg)}
        </div>
      </div>
    `;
    feed.appendChild(row);
  }

  function clearChatHistory() {
    chatHistory = [];
    const feed = document.getElementById('ai-chat-feed');
    if (feed) feed.innerHTML = '';
    const emptyState = document.getElementById('ai-empty-state');
    if (emptyState) emptyState.style.display = 'flex';
    if (typeof App !== 'undefined' && App.showToast) {
      App.showToast('Chat history cleared');
    }
  }

  function scrollStreamToBottom() {
    const container = document.getElementById('ai-stream-container');
    if (container) {
      setTimeout(() => {
        container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
      }, 50);
    }
  }

  // ─────────────────────────────────────────────
  // CARD ACTIONS: COPY, PASTE, SPEECH
  // ─────────────────────────────────────────────
  function copyCardText(msgId) {
    const row = document.getElementById(msgId);
    if (!row) return;

    // Find the stored answer or extract clean text
    const contentEl = document.getElementById(`content-${msgId}`);
    const textToCopy = contentEl ? contentEl.innerText : '';
    const cleanText = cleanTextForBoard(textToCopy);

    const onDone = () => {
      if (typeof App !== 'undefined' && App.showToast) {
        App.showToast('✓ Solution copied to clipboard');
      }
    };

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(cleanText).then(onDone).catch(() => fallbackCopy(cleanText, onDone));
    } else {
      fallbackCopy(cleanText, onDone);
    }
  }

  function insertCardToBoard(msgId) {
    const contentEl = document.getElementById(`content-${msgId}`);
    if (!contentEl) return;

    const textToPaste = cleanTextForBoard(contentEl.innerText);

    const size = (typeof Canvas !== 'undefined' && Canvas.getCanvasSize) ? Canvas.getCanvasSize() : { W: 1200, H: 800 };
    const posX = Math.max(60, Math.round(size.W * 0.1));
    const posY = Math.max(60, Math.round(size.H * 0.12));

    let textColor = '#ffffff';
    try {
      const boardColor = (typeof Canvas !== 'undefined' && Canvas.getBoardColor) ? Canvas.getBoardColor() : null;
      if (boardColor && (boardColor.id === 'white' || boardColor.id === 'light')) {
        textColor = '#0f172a';
      }
    } catch(e) {}

    if (typeof Canvas !== 'undefined' && Canvas.addTextShape) {
      Canvas.addTextShape(posX, posY, textToPaste, textColor, 18);
    }

    if (typeof App !== 'undefined') {
      if (App.setTool) App.setTool('select');
      if (App.showToast) App.showToast('✓ Solution pasted on whiteboard');
    }

    closePanel();
  }

  function speakCardText(msgId) {
    const contentEl = document.getElementById(`content-${msgId}`);
    if (!contentEl || !window.speechSynthesis) return;

    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      return;
    }

    const text = cleanTextForBoard(contentEl.innerText);
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);

    if (typeof App !== 'undefined' && App.showToast) {
      App.showToast('🔊 Speaking solution... (Click again to stop)');
    }
  }

  function fallbackCopy(text, callback) {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      if (callback) callback();
    } catch(e) {}
  }

  // ─────────────────────────────────────────────
  // TEXT & MATH FORMATTING UTILITIES
  // ─────────────────────────────────────────────
  function cleanMathText(text) {
    if (!text) return '';
    let t = text;

    t = t.replace(/\^\{?0\}?/g, '⁰');
    t = t.replace(/\^\{?1\}?/g, '¹');
    t = t.replace(/\^\{?2\}?/g, '²');
    t = t.replace(/\^\{?3\}?/g, '³');
    t = t.replace(/\^\{?4\}?/g, '⁴');
    t = t.replace(/\^\{?5\}?/g, '⁵');
    t = t.replace(/\^\{?n\}?/g, 'ⁿ');

    t = t.replace(/_\{?0\}?/g, '₀');
    t = t.replace(/_\{?1\}?/g, '₁');
    t = t.replace(/_\{?2\}?/g, '₂');

    t = t.replace(/\\times/g, '×');
    t = t.replace(/\\div/g, '÷');
    t = t.replace(/\\cdot/g, '·');
    t = t.replace(/\\pm/g, '±');
    t = t.replace(/\\mp/g, '∓');
    t = t.replace(/\\approx/g, '≈');
    t = t.replace(/\\neq/g, '≠');
    t = t.replace(/\\le(q)?/g, '≤');
    t = t.replace(/\\ge(q)?/g, '≥');
    t = t.replace(/\\rightarrow/g, '→');
    t = t.replace(/\\Rightarrow/g, '→');
    t = t.replace(/\\leftarrow/g, '←');
    t = t.replace(/\\Leftarrow/g, '←');
    t = t.replace(/\\degree/g, '°');
    t = t.replace(/\^\\\circ/g, '°');
    t = t.replace(/\\infty/g, '∞');
    t = t.replace(/\\pi/g, 'π');
    t = t.replace(/\\theta/g, 'θ');
    t = t.replace(/\\alpha/g, 'α');
    t = t.replace(/\\beta/g, 'β');
    t = t.replace(/\\delta/g, 'δ');
    t = t.replace(/\\Delta/g, 'Δ');
    t = t.replace(/\\angle/g, '∠');

    t = t.replace(/\\sqrt\{([^}]+)\}/g, '√($1)');
    t = t.replace(/\\sqrt([a-zA-Z0-9]+)/g, '√$1');

    t = t.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1) / ($2)');
    t = t.replace(/\\text\{([^}]+)\}/g, '$1');
    t = t.replace(/\\quad/g, '  ');
    t = t.replace(/\\[;,]/g, ' ');

    t = t.replace(/\$\$(.*?)\$\$/g, '$1');
    t = t.replace(/\$(.*?)\$/g, '$1');
    t = t.replace(/\$/g, '');

    return t;
  }

  function formatMarkdownForPreview(text) {
    if (!text) return '';
    const cleaned = cleanMathText(text);
    let html = escapeHtml(cleaned);

    html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="ai-strong">$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    html = html.replace(/^### (.*$)/gim, '<h4 class="ai-step-title">$1</h4>');
    html = html.replace(/^## (.*$)/gim, '<h3 class="ai-section-title">$1</h3>');
    html = html.replace(/^# (.*$)/gim, '<h2 class="ai-main-title-md">$1</h2>');

    // Numbered step badges: e.g. Step 1: or 1.
    html = html.replace(/(Step \d+:?)/gi, '<span class="ai-step-badge">$1</span>');

    // Line breaks
    html = html.replace(/\n/g, '<br>');
    return html;
  }

  function cleanTextForBoard(text) {
    if (!text) return '';
    let t = cleanMathText(text);

    t = t.replace(/\*\*(.*?)\*\*/g, '$1');
    t = t.replace(/\*(.*?)\*/g, '$1');
    t = t.replace(/^###+ /gm, '');
    t = t.replace(/^## /gm, '');
    t = t.replace(/^# /gm, '');
    t = t.replace(/`([^`]+)`/g, '$1');
    t = t.replace(/\n{3,}/g, '\n\n');
    return t.trim();
  }

  function escapeHtml(str) {
    return (str || '').replace(/&/g, '&amp;')
                      .replace(/</g, '&lt;')
                      .replace(/>/g, '&gt;')
                      .replace(/"/g, '&quot;')
                      .replace(/'/g, '&#039;');
  }

  function setLoading(loading, title = 'PiyushDhara AI is generating steps...') {
    isLoading = loading;
    const card = document.getElementById('ai-loading-card');
    const titleEl = document.getElementById('ai-loading-title');
    const btn = document.getElementById('btn-ai-solve-run');

    if (titleEl) titleEl.textContent = title;
    if (card) card.classList.toggle('hidden', !loading);
    if (btn) btn.disabled = loading;
  }

  function setMode(mode) {
    activeMode = mode;
    document.querySelectorAll('.ai-tab-chip').forEach(chip => {
      chip.classList.toggle('active', chip.getAttribute('data-mode') === mode);
    });
  }

  function setPrompt(text) {
    const input = document.getElementById('ai-solve-input');
    if (input) {
      input.value = text;
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 120) + 'px';
      input.focus();
    }
  }

  function clearInput() {
    const input = document.getElementById('ai-solve-input');
    if (input) {
      input.value = '';
      input.style.height = 'auto';
      input.focus();
    }
  }

  // ─────────────────────────────────────────────
  // PANEL NAVIGATION
  // ─────────────────────────────────────────────
  function openPanel() {
    ensureDrawerMounted();
    updateSubjectLabel();
    const d = document.getElementById('ai-drawer');
    if (d) {
      d.classList.remove('hidden');
      const input = document.getElementById('ai-solve-input');
      setTimeout(() => input?.focus(), 120);
    }
  }

  function closePanel() {
    const d = document.getElementById('ai-drawer');
    if (d) d.classList.add('hidden');
    if (window.speechSynthesis && window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }
  }

  function togglePanel() {
    ensureDrawerMounted();
    const d = document.getElementById('ai-drawer');
    if (d && d.classList.contains('hidden')) {
      openPanel();
    } else {
      closePanel();
    }
  }

  // Aliases & backwards-compatibility
  function runSolve() { askQuestion(); }
  function runChapterQuiz() { askQuestion(); }
  function runVisionSolve() { askQuestion(); }
  function switchTab(mode) { setMode(mode); }
  function copyResult() {
    if (chatHistory.length > 0) {
      const last = chatHistory[chatHistory.length - 1].answer;
      navigator.clipboard.writeText(cleanTextForBoard(last));
    }
  }
  function insertOntoBoard() {
    if (chatHistory.length > 0) {
      const last = chatHistory[chatHistory.length - 1].answer;
      const size = (typeof Canvas !== 'undefined' && Canvas.getCanvasSize) ? Canvas.getCanvasSize() : { W: 1200, H: 800 };
      if (typeof Canvas !== 'undefined' && Canvas.addTextShape) {
        Canvas.addTextShape(100, 100, cleanTextForBoard(last), '#ffffff', 18);
      }
      closePanel();
    }
  }
  function clearResult() { clearChatHistory(); }

  // Auto initialize on DOM ready
  function initializeAssistantUi() {
    mountSelectionAssistant();
    ensureDrawerMounted();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAssistantUi, { once: true });
  } else {
    setTimeout(initializeAssistantUi, 0);
  }

  // Global key listener for Escape to close AI panel
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const d = document.getElementById('ai-drawer');
      if (d && !d.classList.contains('hidden')) {
        closePanel();
      }
    }
  });

  return {
    openPanel,
    closePanel,
    togglePanel,
    askQuestion,
    runSolve,
    runChapterQuiz,
    runVisionSolve,
    switchTab,
    setMode,
    copyCardText,
    insertCardToBoard,
    speakCardText,
    insertOntoBoard,
    copyResult,
    clearResult,
    clearInput,
    setPrompt,
    clearChatHistory,
    toggleVoiceInput,
    askAboutSelection
  };
})();

// Attach to window
window.AIAssistant = AIAssistant;

