'use strict';

// ═══════════════════════════════════════════════════════════
// PIYUSHDHARA EDUVERSE BOARD — PPT PRESENTER & SLIDE MANAGER
// Upload, present, navigate, annotate, and change PPT decks
// ═══════════════════════════════════════════════════════════

const PptPresenter = (() => {

  let currentDeck = null; // { fileName, slideCount, slides: [ { index, name, dataUrl } ] }
  let currentSlideIndex = 0; // 0-based
  let isDockOpen = false;
  let isThumbTrayOpen = false;

  function init() {
    // Keyboard shortcuts for slides when presenter is active
    window.addEventListener('keydown', (e) => {
      if (!currentDeck) return;
      if (document.activeElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        nextSlide();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        prevSlide();
      }
    });

    // Touch swipe on the canvas zone — swipe left = next slide, swipe right = prev
    let swipeStartX = 0;
    let swipeStartY = 0;
    const zone = document.getElementById('canvas-zone');
    if (zone) {
      zone.addEventListener('touchstart', (e) => {
        if (!currentDeck) return;
        swipeStartX = e.touches[0].clientX;
        swipeStartY = e.touches[0].clientY;
      }, { passive: true });

      zone.addEventListener('touchend', (e) => {
        if (!currentDeck) return;
        const dx = e.changedTouches[0].clientX - swipeStartX;
        const dy = e.changedTouches[0].clientY - swipeStartY;
        // Only register as swipe if horizontal movement > 80px and not too vertical
        if (Math.abs(dx) > 80 && Math.abs(dy) < 60) {
          if (dx < 0) nextSlide();  // swipe left → next
          else prevSlide();          // swipe right → prev
        }
      }, { passive: true });
    }
  }

  // Open file picker to upload PPT
  async function openPicker() {
    if (window.electronAPI && typeof window.electronAPI.uploadPptx === 'function') {
      if (typeof App !== 'undefined' && App.showToast) App.showToast('Opening PowerPoint file...');
      try {
        const res = await window.electronAPI.uploadPptx();
        if (res && res.success && res.slides && res.slides.length > 0) {
          loadDeck(res);
        } else if (res && res.error) {
          alert('PowerPoint import note: ' + res.error);
        }
      } catch (err) {
        alert('Error uploading PPT: ' + err.message);
      }
    } else {
      // Browser fallback using input element
      const fileInput = document.getElementById('ppt-file-input');
      if (fileInput) fileInput.click();
    }
  }

  // Change to a different PPT file
  async function changePpt() {
    if (window.electronAPI && typeof window.electronAPI.changePptx === 'function') {
      if (typeof App !== 'undefined' && App.showToast) App.showToast('Selecting new PowerPoint presentation...');
      try {
        const res = await window.electronAPI.changePptx();
        if (res && res.success && res.slides && res.slides.length > 0) {
          loadDeck(res);
        } else if (res && res.error) {
          alert('PowerPoint change note: ' + res.error);
        }
      } catch (err) {
        alert('Error changing PPT: ' + err.message);
      }
    } else {
      const fileInput = document.getElementById('ppt-file-input');
      if (fileInput) fileInput.click();
    }
  }

  // Browser file input change handler with full OpenXML & PDF parsing
  async function handleFileSelect(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    if (typeof App !== 'undefined' && App.showToast) {
      App.showToast(`Loading presentation "${file.name}"...`);
    }

    try {
      let parsedDeck = null;
      if (typeof WorkspaceSplit !== 'undefined' && typeof WorkspaceSplit.parsePresentationFile === 'function') {
        parsedDeck = await WorkspaceSplit.parsePresentationFile(file);
      } else {
        parsedDeck = await parseDeckFile(file);
      }

      if (!parsedDeck || !parsedDeck.slides || parsedDeck.slides.length === 0) {
        throw new Error('No slides could be extracted from presentation.');
      }

      // Ensure every slide has a rendered dataUrl for board background drawing
      const processedSlides = parsedDeck.slides.map((s, idx) => {
        if (s.dataUrl && !s.dataUrl.startsWith('data:application/')) {
          return s;
        }
        const renderedUrl = renderSlideCanvasDataUrl(s, parsedDeck.fileName || file.name, idx, parsedDeck.slides.length);
        return {
          ...s,
          dataUrl: renderedUrl
        };
      });

      loadDeck({
        fileName: parsedDeck.fileName || file.name,
        slideCount: processedSlides.length,
        slides: processedSlides
      });
    } catch (err) {
      console.error('Error opening presentation in presenter:', err);
      if (typeof App !== 'undefined' && App.showToast) {
        App.showToast(`Note: ${err.message || 'Error parsing presentation'}`);
      }
    }
  }

  function renderSlideCanvasDataUrl(slide, deckName, slideIndex, totalSlides) {
    const canvas = document.createElement('canvas');
    canvas.width = 1920;
    canvas.height = 1080;
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = slide.slideBg || '#081226';
    ctx.fillRect(0, 0, 1920, 1080);

    // Top Header Banner
    const bannerH = 76;
    const grad = ctx.createLinearGradient(0, 0, 1920, 0);
    grad.addColorStop(0, 'rgba(14, 165, 233, 0.42)');
    grad.addColorStop(1, 'rgba(139, 92, 246, 0.32)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1920, bannerH);

    ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, bannerH);
    ctx.lineTo(1920, bannerH);
    ctx.stroke();

    // Slide Tag
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`📑 SLIDE ${slideIndex + 1} OF ${totalSlides} — ${deckName}`, 42, 46);

    // Slide Title
    const titleText = slide.title || `Slide ${slideIndex + 1}`;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 42px system-ui, -apple-system, sans-serif';
    ctx.fillText(titleText, 48, bannerH + 80);

    // Bullets & Content Rows
    const bullets = (slide.bullets && slide.bullets.length > 0) ? slide.bullets : [
      '• Key conceptual topics and theoretical models',
      '• Mathematical derivations, equations, and system diagrams',
      '• Practical classroom questions and whiteboard annotations'
    ];

    const contentTop = bannerH + 130;
    const availableH = 1080 - contentTop - 60;
    const itemH = Math.max(52, Math.min(100, Math.floor((availableH - (bullets.length * 16)) / bullets.length)));

    bullets.forEach((b, idx) => {
      const by = contentTop + idx * (itemH + 16);
      if (by + itemH > 1020) return;

      // Card row background
      ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.22)';
      ctx.lineWidth = 1.5;
      if (ctx.roundRect) ctx.roundRect(48, by, 1824, itemH, 12);
      else ctx.rect(48, by, 1824, itemH);
      ctx.fill();
      ctx.stroke();

      // Text inside row
      ctx.fillStyle = '#e2e8f0';
      ctx.font = '24px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'left';
      const textStr = (b.startsWith('•') || /^\d+\./.test(b)) ? b : `•  ${b}`;
      ctx.fillText(textStr, 76, by + itemH / 2 + 8);
    });

    return canvas.toDataURL('image/jpeg', 0.94);
  }

  async function parseDeckFile(file) {
    if (typeof WorkspaceSplit !== 'undefined' && typeof WorkspaceSplit.parsePresentationFile === 'function') {
      return await WorkspaceSplit.parsePresentationFile(file);
    }
    const ext = (file.name || '').split('.').pop().toLowerCase();

    // 0. Primary High-Resolution PowerPoint Backend Engine (100% exact desktop slide export)
    if (ext === 'pptx' || ext === 'ppt' || ext === 'pps' || ext === 'ppsx' || ext === 'odp') {
      try {
        const formData = new FormData();
        formData.append('file', file);
        const resp = await fetch('/api/smartboard/convert-pptx', {
          method: 'POST',
          body: formData
        });
        if (resp.ok) {
          const data = await resp.json();
          if (data && data.success && Array.isArray(data.slides) && data.slides.length > 0) {
            return {
              fileName: data.fileName || file.name,
              slideCount: data.slides.length,
              slides: data.slides
            };
          }
        }
      } catch (e) {
        console.warn('Backend PPT convert error, falling back:', e);
      }
    }

    if (ext === 'pdf' || file.type === 'application/pdf') {
      if (typeof window.pdfjsLib === 'undefined') {
        await new Promise((resolve, reject) => {
          const s = document.createElement('script');
          s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
          s.onload = () => {
            if (window.pdfjsLib) {
              window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            }
            resolve();
          };
          s.onerror = () => reject(new Error('PDF engine not reachable'));
          document.head.appendChild(s);
        });
      }
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const slides = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 1.8 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        await page.render({ canvasContext: ctx, viewport }).promise;
        slides.push({
          index: i,
          name: `Slide ${i}`,
          title: `${file.name} — Page ${i}`,
          dataUrl: canvas.toDataURL('image/jpeg', 0.92)
        });
      }
      return { fileName: file.name, slideCount: slides.length, slides };
    }

    if (ext === 'pptx' || ext === 'ppt') {
      if (typeof window.JSZip === 'undefined') {
        await new Promise((resolve, reject) => {
          const s = document.createElement('script');
          s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
          s.onload = () => resolve();
          s.onerror = () => reject(new Error('JSZip failed to load'));
          document.head.appendChild(s);
        });
      }
      const arrayBuffer = await file.arrayBuffer();
      const zip = await window.JSZip.loadAsync(arrayBuffer);
      const slideEntries = [];
      zip.forEach((path) => {
        const clean = path.replace(/^\//, '').replace(/\\/g, '/');
        if (/^ppt\/slides\/slide\d+\.xml$/i.test(clean)) slideEntries.push(clean);
      });
      slideEntries.sort((a, b) => {
        const numA = parseInt((a.match(/slide(\d+)\.xml/i) || [0, 0])[1], 10);
        const numB = parseInt((b.match(/slide(\d+)\.xml/i) || [0, 0])[1], 10);
        return numA - numB;
      });

      const slides = [];
      for (let i = 0; i < slideEntries.length; i++) {
        const sFile = zip.file(slideEntries[i]) || zip.file(slideEntries[i].replace(/\//g, '\\'));
        if (!sFile) continue;
        const xmlStr = await sFile.async('string');
        const rawTMatches = xmlStr.match(/<a:t[^>]*>([\s\S]*?)<\/a:t>/gi) || [];
        const textLines = rawTMatches.map(m => m.replace(/<[^>]+>/g, '').trim()).filter(Boolean);
        const title = textLines[0] || `Slide ${i + 1}`;
        const bullets = textLines.filter(t => t !== title);
        slides.push({
          index: i + 1,
          name: `Slide ${i + 1}`,
          title: title,
          bullets: bullets.length > 0 ? bullets : ['Slide topic & key discussion notes']
        });
      }

      if (slides.length > 0) {
        return { fileName: file.name, slideCount: slides.length, slides };
      }
    }

    return {
      fileName: file.name,
      slideCount: 1,
      slides: [{ index: 1, name: file.name, title: file.name, bullets: ['Slide content loaded'] }]
    };
  }

  // Load a deck of slides into the presenter
  function loadDeck(deckData) {
    currentDeck = deckData;
    currentSlideIndex = 0;
    isDockOpen = true;

    // Apply first slide to current page
    applySlideToBoard(0);

    // Render dock UI
    renderDock();

    if (typeof App !== 'undefined' && App.showToast) {
      App.showToast(`Loaded PPT: "${deckData.fileName}" (${deckData.slides.length} slides)`);
    }

    // Highlight topbar PPT button
    const pptBtn = document.getElementById('btn-ppt');
    if (pptBtn) {
      pptBtn.classList.add('active');
      pptBtn.innerHTML = `
        <svg viewBox="0 0 20 20" fill="none"><rect x="3" y="3" width="14" height="11" rx="1.5" stroke="currentColor" stroke-width="1.5"/><path d="M7 17l3-3 3 3M10 14v3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><circle cx="10" cy="8.5" r="2.5" stroke="currentColor" stroke-width="1.2"/></svg>
        PPT (${deckData.slides.length})
      `;
    }
  }

  // Set the specified slide as active background on current board page
  function applySlideToBoard(slideIdx) {
    if (!currentDeck || !currentDeck.slides[slideIdx]) return;
    const slide = currentDeck.slides[slideIdx];
    currentSlideIndex = slideIdx;

    if (typeof Canvas !== 'undefined') {
      Canvas.setBgImage(slide.dataUrl);
    }
    updateDockStatus();
  }

  // Automatically import all slides as distinct board pages
  function importAllAsPages() {
    if (!currentDeck || !currentDeck.slides || !currentDeck.slides.length) return;

    if (typeof App !== 'undefined') {
      const confirmed = confirm(`Do you want to import all ${currentDeck.slides.length} slides as individual board pages? Each page will hold one slide ready for drawing and annotation.`);
      if (!confirmed) return;

      // Access App pages
      currentDeck.slides.forEach((slide, idx) => {
        if (idx === 0) {
          // Set on first page
          Canvas.setBgImage(slide.dataUrl);
        } else {
          // Add new page
          App.addPage();
          Canvas.setBgImage(slide.dataUrl);
        }
      });

      // Switch to first page
      App.switchPage(0);
      App.showToast(`Imported ${currentDeck.slides.length} slides into board pages!`);
    }
  }

  function nextSlide() {
    if (!currentDeck || currentSlideIndex >= currentDeck.slides.length - 1) return;
    applySlideToBoard(currentSlideIndex + 1);
  }

  function prevSlide() {
    if (!currentDeck || currentSlideIndex <= 0) return;
    applySlideToBoard(currentSlideIndex - 1);
  }

  function clearSlideFromBoard() {
    if (typeof Canvas !== 'undefined') {
      Canvas.setBgImage(null);
      if (typeof App !== 'undefined' && App.showToast) App.showToast('Slide background removed from board.');
    }
  }

  function closeDock() {
    if (typeof App !== 'undefined' && App.scheduleAutoSave) App.scheduleAutoSave();
    isDockOpen = false;
    const dock = document.getElementById('ppt-presenter-dock');
    if (dock) dock.style.display = 'none';
  }

  function toggleThumbnails() {
    isThumbTrayOpen = !isThumbTrayOpen;
    const tray = document.getElementById('ppt-thumb-tray');
    if (tray) tray.style.display = isThumbTrayOpen ? 'flex' : 'none';
  }

  // Render the floating dock
  function renderDock() {
    let dock = document.getElementById('ppt-presenter-dock');
    if (!dock) {
      dock = document.createElement('div');
      dock.id = 'ppt-presenter-dock';
      document.body.appendChild(dock);
    }

    dock.style.display = 'flex';
    dock.innerHTML = `
      <!-- THUMBNAIL TRAY -->
      <div id="ppt-thumb-tray" style="display:${isThumbTrayOpen ? 'flex' : 'none'};">
        ${(currentDeck.slides || []).map((s, idx) => `
          <div class="ppt-thumb-card ${idx === currentSlideIndex ? 'active' : ''}" onclick="PptPresenter.applySlideToBoard(${idx})">
            <img src="${s.dataUrl}" alt="Slide ${idx+1}">
            <span>Slide ${idx+1}</span>
          </div>
        `).join('')}
      </div>

      <!-- MAIN CONTROLS BAR -->
      <div class="ppt-dock-main">
        <div class="ppt-dock-title" title="${currentDeck.fileName}">
          <span style="color:#38bdf8;font-weight:700">📊 PPT:</span> ${currentDeck.fileName}
        </div>

        <div class="ppt-nav-group">
          <button class="ppt-ctrl-btn" onclick="PptPresenter.prevSlide()" title="Previous slide (Left Arrow)">◀ Prev</button>
          <span class="ppt-slide-counter" id="ppt-counter">Slide <b>${currentSlideIndex + 1}</b> of ${currentDeck.slides.length}</span>
          <button class="ppt-ctrl-btn" onclick="PptPresenter.nextSlide()" title="Next slide (Right Arrow)">Next ▶</button>
        </div>

        <div class="ppt-actions-group">
          <button class="ppt-action-btn" onclick="PptPresenter.toggleThumbnails()" title="Toggle slide previews">
            🖼️ Deck
          </button>
          <button class="ppt-action-btn" onclick="PptPresenter.importAllAsPages()" title="Create one board page per slide">
            📑 Import as Pages
          </button>
          <button class="ppt-action-btn highlight" onclick="PptPresenter.changePpt()" title="Upload a different PowerPoint file">
            🔄 Change PPT
          </button>
          <button class="ppt-action-btn" onclick="PptPresenter.clearSlideFromBoard()" title="Remove background image">
            🧹 Clear BG
          </button>
          <button class="ppt-close-btn" onclick="PptPresenter.closeDock()" title="Hide presenter bar">
            ×
          </button>
        </div>
      </div>
    `;
  }

  function updateDockStatus() {
    const counter = document.getElementById('ppt-counter');
    if (counter && currentDeck) {
      counter.innerHTML = `Slide <b>${currentSlideIndex + 1}</b> of ${currentDeck.slides.length}`;
    }
    // Update active thumb
    document.querySelectorAll('.ppt-thumb-card').forEach((card, idx) => {
      card.classList.toggle('active', idx === currentSlideIndex);
    });
  }

  function getCurrentSlideContext() {
    if (!currentDeck) return null;
    return {
      fileName: currentDeck.fileName || 'PowerPoint presentation',
      slideNumber: currentSlideIndex + 1,
      totalSlides: currentDeck.slides?.length || 0,
    };
  }

  function serializeState() {
    if (!currentDeck) return null;
    return {
      currentDeck,
      currentSlideIndex,
      isDockOpen,
      isThumbTrayOpen
    };
  }

  function restoreState(state) {
    if (!state || !state.currentDeck || !state.currentDeck.slides || !state.currentDeck.slides.length) return;
    currentDeck = state.currentDeck;
    currentSlideIndex = Math.max(0, Math.min(state.currentSlideIndex || 0, currentDeck.slides.length - 1));
    isDockOpen = state.isDockOpen !== undefined ? state.isDockOpen : true;
    isThumbTrayOpen = !!state.isThumbTrayOpen;

    if (isDockOpen) {
      renderDock();
    }
    applySlideToBoard(currentSlideIndex);

    const pptBtn = document.getElementById('btn-ppt');
    if (pptBtn && currentDeck) {
      pptBtn.classList.add('active');
      pptBtn.innerHTML = `
        <svg viewBox="0 0 20 20" fill="none"><rect x="3" y="3" width="14" height="11" rx="1.5" stroke="currentColor" stroke-width="1.5"/><path d="M7 17l3-3 3 3M10 14v3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><circle cx="10" cy="8.5" r="2.5" stroke="currentColor" stroke-width="1.2"/></svg>
        PPT (${currentDeck.slides.length})
      `;
    }
  }

  return {
    init,
    openPicker,
    changePpt,
    handleFileSelect,
    loadDeck,
    applySlideToBoard,
    importAllAsPages,
    nextSlide,
    prevSlide,
    clearSlideFromBoard,
    toggleThumbnails,
    closeDock,
    getCurrentSlideContext,
    serializeState,
    restoreState,
    getCurrentDeck: () => currentDeck
  };
})();

// Expose globally
if (typeof window !== 'undefined') {
  window.PptPresenter = PptPresenter;
}
