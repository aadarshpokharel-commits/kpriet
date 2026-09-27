/**
 * rbac-bridge.js
 * PiyushDhara EduVerse — Universal Dynamic Smart Board Context & RBAC Integration
 *
 * Provides 100% dynamic, context-aware teaching workspace:
 *  1. Dynamic Context Inheritance:
 *     Inherits Department, Subject, Semester, Teacher, Section from URL params,
 *     session storage, or async backend API hydration.
 *     Zero hardcoded department or subject values.
 *  2. Dynamic Header:
 *     "KPRIET • {Department} | {Subject}"
 *     Faculty identity and dynamic "🔒 Subject-Restricted Mode".
 *  3. Subject-Specific Simulations:
 *     Loads simulations filtered strictly by Department + Semester + Subject.
 *     Full support for DSA, Mathematics, Physics, Civil Engineering, and more.
 *  4. Subject-Specific Formulas & Theorems:
 *     Curates exact formulas matching the active subject with 1-click "Stamp to Board".
 *  5. Direct "Share Notes" Workflow:
 *     Teacher shares board notes / uploaded documents directly to students enrolled
 *     in that exact subject. Syncs with backend and displays on student dashboard.
 */
(function RBACBridge() {
  'use strict';

  const SESSION_KEY = 'eduverse_rbac_session';
  const ACTIVE_STORAGE_KEY = 'eduverse_smartboard_active_session';
  const DASHBOARD_URL = '../dashboard/index.html';

  /* ══════════════════════════════════════════════════════════
     1. PARSE QUERY PARAMETERS & PERSISTENT SESSION
     ══════════════════════════════════════════════════════════ */
  const urlParams = new URLSearchParams(window.location.search);
  const paramSubjectId   = urlParams.get('subjectId') || urlParams.get('subId');
  const paramSubjectName = urlParams.get('subjectName') || urlParams.get('subject') || urlParams.get('sub');
  const paramSubjectCode = urlParams.get('subjectCode') || urlParams.get('code');
  const paramDeptName    = urlParams.get('departmentName') || urlParams.get('department') || urlParams.get('dept');
  const paramDeptId      = urlParams.get('departmentId') || urlParams.get('deptId');
  const paramSemNum      = urlParams.get('semesterNumber') || urlParams.get('semester') || urlParams.get('sem');
  const paramSemId       = urlParams.get('semesterId') || urlParams.get('semId');
  const paramTeacherName = urlParams.get('teacherName') || urlParams.get('teacher') || urlParams.get('name');
  const paramTeacherId   = urlParams.get('teacherId') || urlParams.get('userId');
  const paramSection     = urlParams.get('section') || urlParams.get('class');
  const paramSectionId   = urlParams.get('sectionId');
  const paramToken       = urlParams.get('token');
  const paramSessionId   = urlParams.get('sessionId');
  const paramRole        = String(urlParams.get('role') || 'teacher').toLowerCase();
  // Central programme master context (Programme → Regulation → Semester → Subject → Unit → Topic)
  const paramProgrammeId   = urlParams.get('programmeId') || urlParams.get('programme');
  const paramProgrammeName = urlParams.get('programmeName');
  const paramRegulation    = urlParams.get('regulation');
  const paramAcademicYear  = urlParams.get('academicYear');
  const paramUnitNumber    = urlParams.get('unitNumber') || urlParams.get('unit');
  const paramUnitTitle     = urlParams.get('unitTitle');
  const paramTopic         = urlParams.get('topic');

  /** Escapes text before it is placed into innerHTML (values can come from the URL). */
  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Calls the Eduverse API. The backend mounts its routes under /api/v1;
   * /api is tried as a fallback for older deployments.
   */
  async function apiFetch(path, options) {
    const bases = ['/api/v1', '/api'];
    let lastRes = null;
    for (const base of bases) {
      try {
        const res = await fetch(base + path, options);
        if (res.status !== 404) return res;
        lastRes = res;
      } catch (e) {
        lastRes = null;
      }
    }
    return lastRes || { ok: false, status: 0, json: async () => ({}) };
  }

  let session = null;

  // 0. The session the dashboard just launched (matched by sessionId) always wins,
  //    so a freshly chosen simulation / PPT is not hidden by an older cached session.
  if (paramSessionId) {
    for (const read of [() => localStorage.getItem(ACTIVE_STORAGE_KEY), () => sessionStorage.getItem(SESSION_KEY)]) {
      try {
        const raw = read();
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        const flat = parsed && parsed.sessionData ? { ...parsed.sessionData, ...parsed } : parsed;
        if (flat && flat.sessionId === paramSessionId) { session = parsed; break; }
      } catch (e) {}
    }
  }

  // 1. If subjectId is specified in URL, check if there is an exact subject-scoped session cache
  if (!session && paramSubjectId) {
    try {
      const subjectCached = localStorage.getItem('active_smartboard_session_' + paramSubjectId);
      if (subjectCached) session = JSON.parse(subjectCached);
    } catch (e) {}
  }

  // 2. Only reuse active session if subject matches (prevents cross-subject contamination)
  if (!session) {
    try {
      const rawActive = localStorage.getItem(ACTIVE_STORAGE_KEY);
      if (rawActive) {
        const parsed = JSON.parse(rawActive);
        if (!paramSubjectId || parsed.subjectId === paramSubjectId) {
          session = parsed;
        }
      }
    } catch (e) {}
  }

  if (!session) {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (!paramSubjectId || parsed.subjectId === paramSubjectId) {
          session = parsed;
        }
      }
    } catch (e) {}
  }

  // Handle nested sessionData if provided by backend
  if (session && session.sessionData) {
    session = { ...session.sessionData, ...session };
  }

  // Remember which launch this stored session came from (before URL overrides)
  const loadedSessionId = session ? String(session.sessionId || '') : '';

  // If session object was empty or nonexistent, initialize
  if (!session) {
    session = {
      role: paramRole,
      subjectId: paramSubjectId || '',
      subjectName: paramSubjectName || (paramSubjectId ? 'Loading Subject...' : 'Academic Subject'),
      subjectCode: paramSubjectCode || '',
      departmentName: paramProgrammeName || paramDeptName || '',
      departmentId: paramDeptId || '',
      semesterNumber: paramSemNum ? parseInt(paramSemNum, 10) : 1,
      semesterId: paramSemId || '',
      teacherName: paramTeacherName || 'Faculty Member',
      name: paramTeacherName || 'Faculty Member',
      teacherId: paramTeacherId || '',
      token: paramToken || '',
      sessionId: paramSessionId || `sb_${Date.now()}`,
      section: paramSection || '',
      sectionId: paramSectionId || paramSection || '',
    };
  }

  // Explicit URL parameters MUST ALWAYS override
  if (paramSubjectId) session.subjectId = paramSubjectId;
  if (paramSubjectName) {
    session.subjectName = paramSubjectName;
    if (session.subject && typeof session.subject === 'object') {
      session.subject.name = paramSubjectName;
      session.subject.subjectName = paramSubjectName;
    }
  }
  if (paramSubjectCode) {
    session.subjectCode = paramSubjectCode;
    if (session.subject && typeof session.subject === 'object') {
      session.subject.code = paramSubjectCode;
      session.subject.subjectCode = paramSubjectCode;
    }
  }
  if (paramDeptName) {
    session.departmentName = paramDeptName;
    if (session.department && typeof session.department === 'object') {
      session.department.name = paramDeptName;
    }
  }
  if (paramDeptId) {
    session.departmentId = paramDeptId;
    if (session.department && typeof session.department === 'object') {
      session.department.id = paramDeptId;
    }
  }
  if (paramSemNum) {
    session.semesterNumber = parseInt(paramSemNum, 10);
    if (session.semester && typeof session.semester === 'object') {
      session.semester.semesterNumber = parseInt(paramSemNum, 10);
      session.semester.number = parseInt(paramSemNum, 10);
    }
  }
  if (paramSemId) session.semesterId = paramSemId;
  if (paramTeacherName) {
    session.teacherName = paramTeacherName;
    session.name = paramTeacherName;
    if (session.user && typeof session.user === 'object') {
      session.user.name = paramTeacherName;
    }
  }
  if (paramTeacherId) session.teacherId = paramTeacherId;
  if (paramSection) session.section = paramSection;
  if (paramSectionId) session.sectionId = paramSectionId;
  if (urlParams.has('role')) session.role = paramRole;
  if (paramToken) session.token = paramToken;
  if (paramSessionId) session.sessionId = paramSessionId;
  if (paramProgrammeId) session.programmeId = paramProgrammeId;
  if (paramProgrammeName) {
    session.programmeName = paramProgrammeName;
    session.departmentName = paramProgrammeName;
  }
  if (paramRegulation) session.regulation = paramRegulation;
  if (paramAcademicYear) session.academicYear = paramAcademicYear;
  if (paramUnitNumber || paramTopic) {
    session.focus = {
      unitNumber: paramUnitNumber ? parseInt(paramUnitNumber, 10) : (session.focus && session.focus.unitNumber) || null,
      unitTitle: paramUnitTitle || (session.focus && session.focus.unitTitle) || null,
      topic: paramTopic || (session.focus && session.focus.topic) || null,
    };
  }

  // Normalize nested properties to top-level if needed
  if (session.subject && typeof session.subject === 'object') {
    if (!session.subjectName) session.subjectName = session.subject.name || session.subject.subjectName;
    if (!session.subjectId) session.subjectId = session.subject.id || session.subject._id;
    if (!session.subjectCode) session.subjectCode = session.subject.code || session.subject.subjectCode;
  }
  if (session.programme && typeof session.programme === 'object') {
    if (!session.programmeId) session.programmeId = session.programme.programmeId || session.programme.code;
    if (!session.programmeName) session.programmeName = session.programme.name;
    if (!session.regulation) session.regulation = session.programme.regulation;
  }
  if (session.programmeName) session.departmentName = session.programmeName;
  if (session.department && typeof session.department === 'object') {
    if (!session.departmentName) session.departmentName = session.department.name;
    if (!session.departmentId) session.departmentId = session.department.id || session.department._id;
  }
  if (session.semester && typeof session.semester === 'object') {
    if (!session.semesterNumber) session.semesterNumber = session.semester.number || session.semester.semesterNumber;
    if (!session.semesterId) session.semesterId = session.semester.id || session.semester._id;
  }
  if (session.user && typeof session.user === 'object') {
    if (!session.teacherName) session.teacherName = session.user.name;
    if (!session.teacherId && String(session.role || '').toLowerCase() === 'teacher') {
      session.teacherId = session.user.id || session.user._id;
    }
  }

  // A simulation named in the URL (?preset=dsa-stack&title=Stack) is opened on load.
  // Otherwise an initialResource is only honoured for the session it was launched with,
  // so reopening the board later does not replay an old simulation.
  const paramPreset = urlParams.get('preset');
  if (paramPreset) {
    let presetConfig = {};
    let presetState = {};
    try { presetConfig = JSON.parse(urlParams.get('config') || '{}') || {}; } catch (e) {}
    try { presetState = JSON.parse(urlParams.get('state') || '{}') || {}; } catch (e) {}
    session.initialResource = {
      type: 'sim',
      simKey: paramPreset,
      title: urlParams.get('title') || paramPreset,
      simulationContext: {
        simulationId: urlParams.get('simulationId') || '',
        category: urlParams.get('category') || presetConfig.category || '',
        topic: paramTopic || presetConfig.topic || '',
        config: presetConfig,
        state: presetState,
      },
    };
  } else if (session.initialResource && paramSessionId && loadedSessionId !== paramSessionId) {
    delete session.initialResource;
  }

  // Ensure clean, non-hardcoded defaults
  if (!session.subjectName) session.subjectName = 'Academic Subject';
  if (!session.departmentName) session.departmentName = 'KPRIET Programme';
  if (!session.teacherName) session.teacherName = session.name || 'Faculty Member';
  if (!session.role) session.role = 'teacher';

  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    localStorage.setItem(ACTIVE_STORAGE_KEY, JSON.stringify(session));
    if (session.subjectId) {
      localStorage.setItem('active_smartboard_session_' + session.subjectId, JSON.stringify(session));
    }
  } catch (e) {}

  // Expose shared subject context to all tools (Formulas, Simulations, Notes, AI Assistant, etc.)
  window.CurrentSubjectContext = session;
  window.EduverseSubjectContext = session;

  const isTeacher = String(session.role || '').toLowerCase() === 'teacher';
  const isStudent = String(session.role || '').toLowerCase() === 'student';

  /* ══════════════════════════════════════════════════════════
     2. SUBJECT DOMAIN RESOLUTION & ICONS
     Determines whether active subject is DSA, Math, Physics,
     Civil Engineering, Electronics, etc.
     ══════════════════════════════════════════════════════════ */
  function resolveSubjectDomain(s) {
    const name = ((s && (s.subjectName || s.name)) || '').toLowerCase();
    const code = ((s && (s.subjectCode || s.code)) || '').toUpperCase();
    const dept = ((s && s.departmentName) || '').toLowerCase();

    if (
      code.startsWith('CE') ||
      code.startsWith('CIVIL') ||
      dept.includes('civil') ||
      name.includes('civil') ||
      name.includes('mechanics') ||
      name.includes('structural') ||
      name.includes('surveying') ||
      name.includes('concrete') ||
      name.includes('fluid mechanics') ||
      name.includes('soil mechanics') ||
      name.includes('construction')
    ) {
      return 'CIVIL';
    }

    if (
      code.startsWith('PH') ||
      code.startsWith('PHY') ||
      dept.includes('physics') ||
      name.includes('physics') ||
      name.includes('optics') ||
      name.includes('wave') ||
      name.includes('quantum')
    ) {
      return 'PHYSICS';
    }

    if (
      code.startsWith('MA') ||
      code.startsWith('MATH') ||
      dept.includes('math') ||
      name.includes('math') ||
      name.includes('calculus') ||
      name.includes('algebra') ||
      name.includes('matrices') ||
      name.includes('transforms') ||
      name.includes('discrete') ||
      name.includes('differential') ||
      name.includes('numerical') ||
      name.includes('pde')
    ) {
      return 'MATHEMATICS';
    }

    if (
      code.startsWith('EC') ||
      code.startsWith('EE') ||
      dept.includes('electronics') ||
      dept.includes('electrical') ||
      name.includes('digital principles') ||
      name.includes('circuits') ||
      name.includes('signals')
    ) {
      return 'ELECTRONICS';
    }

    // Default computer science / IT
    return 'DSA';
  }

  function getSubjectIcon(domain, name) {
    if (domain === 'CIVIL') return '🏗️';
    if (domain === 'PHYSICS') return '⚛️';
    if (domain === 'MATHEMATICS') return '📐';
    if (domain === 'ELECTRONICS') return '🔌';
    if (name && name.toLowerCase().includes('python')) return '🐍';
    if (name && name.toLowerCase().includes('java')) return '☕';
    if (name && name.toLowerCase().includes('network')) return '🌐';
    if (name && name.toLowerCase().includes('database')) return '🗄️';
    return '🌳';
  }

  const activeDomain = resolveSubjectDomain(session);
  const activeIcon = session.subjectIcon || getSubjectIcon(activeDomain, session.subjectName);

  /* ══════════════════════════════════════════════════════════
     3. ASYNC BACKEND CONTEXT HYDRATION
     Fetches live syllabus units, notes, PPTs, formulas,
     and simulations from backend when available.
     ══════════════════════════════════════════════════════════ */
  async function hydrateBackendContext() {
    if (!session.subjectId || session.subjectId === 'sub-academic') return;
    try {
      const apiHost = window.location.port === '5000' ? '' : (window.location.origin.includes('5173') ? '' : '');
      const token = session.token || localStorage.getItem('eduverse_token') || sessionStorage.getItem('token');
      const headers = { 'Content-Type': 'application/json' };
      // Only real JWTs go in the header; the Smart Board session id is not a credential
      // (the signed-in dashboard's httpOnly cookie authenticates same-origin requests).
      if (token && /^[\w-]+\.[\w-]+\.[\w-]+$/.test(String(token))) headers['Authorization'] = `Bearer ${token}`;

      const focusQuery = new URLSearchParams();
      if (session.focus && session.focus.unitNumber) focusQuery.set('unitNumber', String(session.focus.unitNumber));
      if (session.focus && session.focus.topic) focusQuery.set('topic', String(session.focus.topic));
      const qs = focusQuery.toString() ? `?${focusQuery.toString()}` : '';
      const res = await apiFetch(`/academic/subjects/${encodeURIComponent(session.subjectId)}/smartboard-context${qs}`, {
        headers,
        credentials: 'include'
      });

      if (res.ok) {
        const json = await res.json();
        const data = json.data || json;
        if (data) {
          if (data.subject?.subjectName) session.subjectName = data.subject.subjectName;
          if (data.subject?.subjectCode) session.subjectCode = data.subject.subjectCode;
          if (data.department?.name) session.departmentName = data.department.name;
          if (data.programme) {
            session.programme = data.programme;
            session.programmeId = data.programme.programmeId || data.programme.code;
            session.programmeName = data.programme.name;
            session.departmentName = data.programme.name;
            session.regulation = data.programme.regulation || session.regulation;
          }
          if (data.academicYear) session.academicYear = data.academicYear;
          if (data.focus && (data.focus.unitNumber || data.focus.topic)) session.focus = data.focus;
          if (data.department?.id) session.departmentId = data.department.id;
          if (data.semesterId || data.semester?.id || data.semester?._id) {
            session.semesterId = data.semesterId || data.semester.id || data.semester._id;
          }
          if (data.teacherId) session.teacherId = data.teacherId;
          else if (String(session.role || '').toLowerCase() !== 'teacher') session.teacherId = '';
          if (data.sectionId || data.section) session.sectionId = data.sectionId || data.section;
          if (data.semester?.semesterNumber || data.semester?.number) {
            session.semesterNumber = data.semester.semesterNumber || data.semester.number;
          }
          if (Array.isArray(data.notes)) session.notes = data.notes;
          if (Array.isArray(data.presentations)) session.presentations = data.presentations;
          if (Array.isArray(data.simulations) && data.simulations.length > 0) {
            session.simulations = data.simulations;
          }
          if (Array.isArray(data.formulas) && data.formulas.length > 0) {
            session.formulas = data.formulas;
          }
          if (Array.isArray(data.syllabusUnits)) session.syllabusUnits = data.syllabusUnits;

          try {
            sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
            localStorage.setItem(ACTIVE_STORAGE_KEY, JSON.stringify(session));
          } catch (e) {}

          updateHeaderBarElements();
          window.dispatchEvent(new CustomEvent('smartboard:subject-context-ready', { detail: session }));
        }
      }
    } catch (err) {
      console.warn('[RBAC Bridge] Context hydration note:', err.message);
    }
  }

  /* ══════════════════════════════════════════════════════════
     4. BROADCASTCHANNEL SYNCHRONIZATION ENGINE
     Allows Teacher Dashboard to remotely control pages,
     trigger simulations, or sync presentation slides.
     ══════════════════════════════════════════════════════════ */
  let syncChannel = null;
  let activeResourceTitle = null;

  try {
    syncChannel = new BroadcastChannel('eduverse_smartboard_sync');
    syncChannel.onmessage = function(e) {
      const data = e.data || {};
      const { type, payload } = data;

      if (type === 'SYNC_GET_STATUS') {
        broadcastStatus();
      } else if (type === 'SYNC_CHANGE_PAGE' && typeof window.App !== 'undefined') {
        if (typeof window.App.switchPage === 'function' && typeof payload?.pageIndex === 'number') {
          window.App.switchPage(payload.pageIndex);
        }
        broadcastStatus();
      } else if (type === 'SYNC_NEXT_PAGE' && typeof window.App !== 'undefined') {
        if (typeof window.App.nextPage === 'function') window.App.nextPage();
        broadcastStatus();
      } else if (type === 'SYNC_PREV_PAGE' && typeof window.App !== 'undefined') {
        if (typeof window.App.prevPage === 'function') window.App.prevPage();
        broadcastStatus();
      } else if (type === 'SYNC_ADD_PAGE' && typeof window.App !== 'undefined') {
        if (typeof window.App.addPage === 'function') window.App.addPage();
        broadcastStatus();
      } else if (type === 'SYNC_CLEAR_PAGE' && typeof window.App !== 'undefined') {
        if (typeof window.App.clearBoard === 'function') window.App.clearBoard();
        broadcastStatus();
      } else if (type === 'SYNC_TOGGLE_FULLSCREEN' && typeof window.App !== 'undefined') {
        if (typeof window.App.toggleFullscreen === 'function') window.App.toggleFullscreen();
      } else if (type === 'SYNC_LAUNCH_RESOURCE') {
        activeResourceTitle = payload?.title;
        launchDynamicResource(payload);
        broadcastStatus();
      } else if (type === 'SYNC_LAUNCH_SIMULATION') {
        activeResourceTitle = payload?.title;
        launchSimulation(payload?.simKey, payload?.title, payload?.context || {});
        broadcastStatus();
      }
    };
  } catch (err) {
    console.warn('[RBAC Bridge] BroadcastChannel init note:', err);
  }

  function broadcastStatus() {
    if (!syncChannel) return;
    let curr = 0;
    let total = 1;
    if (typeof window.App !== 'undefined') {
      if (typeof window.App.getCurrentPageIndex === 'function') curr = window.App.getCurrentPageIndex();
      if (typeof window.App.getPageCount === 'function') total = window.App.getPageCount();
      else if (typeof window.App.getPages === 'function' && Array.isArray(window.App.getPages())) {
        total = window.App.getPages().length;
      }
    }
    syncChannel.postMessage({
      type: 'SMARTBOARD_STATUS',
      payload: {
        currentPage: curr + 1,
        totalPages: Math.max(1, total),
        activeResource: activeResourceTitle || (session && session.launchedResource ? session.launchedResource.title : null),
        subjectId: session ? session.subjectId : null,
        subjectName: session ? session.subjectName : null,
        departmentName: session ? session.departmentName : null,
        programmeId: session ? session.programmeId || null : null,
        programmeName: session ? session.programmeName || session.departmentName : null,
        focus: session ? session.focus || null : null,
        role: session ? session.role : 'teacher',
        timestamp: Date.now()
      }
    });
  }

  /* ══════════════════════════════════════════════════════════
     5. DYNAMIC SMART BOARD HEADER & SESSION BAR
     Redesigned Classroom Hierarchy:
     [Left] Logo & KPRIET
     [Center] Subject Title (Primary) & Department • Semester
     [Right] Faculty & Subject Mode Badges | Action Buttons
     ══════════════════════════════════════════════════════════ */
  /* ══════════════════════════════════════════════════════════
     5. DYNAMIC SMART BOARD HEADER & SESSION BAR
     Redesigned Classroom Hierarchy:
     [Left] Logo & KPRIET
     [Center] Subject Title (Primary) & Department • Semester
     [Right] Faculty & Subject Mode Badges | Action Buttons
     ══════════════════════════════════════════════════════════ */
  function injectSessionBar() {
    if (document.getElementById('rbac-session-bar')) return;

    const subName = escapeHtml(session.subjectName || 'Academic Subject');
    const deptName = escapeHtml(session.programmeName || session.departmentName || 'Programme');
    const teacherName = escapeHtml(session.teacherName || session.name || (isTeacher ? 'Faculty Member' : 'Student'));
    const focusLabel = escapeHtml(describeFocus());

    const bar = document.createElement('div');
    bar.id = 'rbac-session-bar';
    bar.setAttribute('data-subject-id', session.subjectId || '');
    bar.innerHTML =
      '<div class="rbac-sb-left">' +
        '<div class="rbac-sb-brand">' +
          '<img src="assets/kpriet-logo.png" class="rbac-sb-logo" alt="PiyushDhara" onerror="this.src=\'assets/logo.png\'">' +
          '<div class="rbac-sb-brand-text">' +
            '<span class="rbac-brand-title">PiyushDhara</span>' +
            '<span class="rbac-brand-sub">KPRIET</span>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="rbac-sb-center">' +
        '<div class="rbac-sb-subject-main">' +
          '<span class="rbac-sb-domain-icon" id="rbac-header-sub-icon">' + activeIcon + '</span>' +
          '<span class="rbac-sb-subject-title" id="rbac-header-sub-name">' + subName + '</span>' +
          (session.subjectCode
            ? '<span class="rbac-sb-code-tag" id="rbac-header-sub-code">' + escapeHtml(session.subjectCode) + '</span>'
            : '<span class="rbac-sb-code-tag" id="rbac-header-sub-code" style="display:none"></span>'
          ) +
        '</div>' +
        '<div class="rbac-sb-subject-sub">' +
          '<span id="rbac-header-dept-name">' + deptName + '</span>' +
          '<span class="rbac-sb-sep">•</span>' +
          '<span id="rbac-header-sem-name">Semester ' + escapeHtml(session.semesterNumber || 1) + '</span>' +
          (session.section
            ? '<span class="rbac-sb-sep" id="rbac-header-sec-sep">•</span><span id="rbac-header-section-name">' + escapeHtml(session.section) + '</span>'
            : '<span class="rbac-sb-sep" id="rbac-header-sec-sep" style="display:none">•</span><span id="rbac-header-section-name" style="display:none"></span>'
          ) +
          '<span class="rbac-sb-sep" id="rbac-header-focus-sep"' + (focusLabel ? '' : ' style="display:none"') + '>•</span>' +
          '<span id="rbac-header-focus"' + (focusLabel ? '' : ' style="display:none"') + '>' + focusLabel + '</span>' +
        '</div>' +
      '</div>' +
      '<div class="rbac-sb-right">' +
        '<div class="rbac-sb-meta">' +
          '<span class="rbac-badge rbac-badge-teacher" title="Teaching Faculty">' +
            '<span class="rbac-badge-icon">👤</span>' +
            '<span id="rbac-header-teacher-name">' + teacherName + '</span>' +
          '</span>' +
          '<span class="rbac-badge rbac-badge-mode" title="Whiteboard resources strictly isolated to this subject">' +
            '<span class="rbac-badge-icon">🔒</span>' +
            '<span>Subject Mode</span>' +
          '</span>' +
        '</div>' +
        '<div class="rbac-sb-buttons">' +
          '<button class="rbac-btn rbac-btn-formulas" id="rbac-board-formulas" title="Subject-Specific Formulas & Theorems">' +
            '<span>📐</span> <span class="btn-lbl">Formulas</span>' +
          '</button>' +
          '<button class="rbac-btn rbac-btn-sim" id="rbac-board-simulations" title="Subject-Specific Interactive Simulations">' +
            '<span>🔬</span> <span class="btn-lbl">Simulation Lab</span>' +
          '</button>' +
          (isTeacher
            ? '<button class="rbac-btn rbac-btn-share" id="rbac-board-share-notes" title="Compile whiteboard or notes and share with enrolled students">' +
                '<span>📄</span> <span class="btn-lbl">Share Notes</span>' +
              '</button>'
            : ''
          ) +
          '<button class="rbac-btn rbac-btn-portal" id="rbac-back-to-dashboard" title="Return to Academic Portal">' +
            '<span>←</span> <span class="btn-lbl">Portal</span>' +
          '</button>' +
          '<div class="rbac-overflow-wrap" id="rbac-overflow-wrap">' +
            '<button class="rbac-btn rbac-btn-more" id="rbac-btn-more" title="More Options" aria-label="More Options"><span>⋮</span></button>' +
            '<div class="rbac-overflow-menu hidden" id="rbac-overflow-menu"></div>' +
          '</div>' +
        '</div>' +
      '</div>';

    document.body.insertBefore(bar, document.body.firstChild);
    document.body.classList.add('rbac-session-active');

    // Floating Focus Mode Bar (Visible ONLY in Fullscreen / Focus Mode)
    if (!document.getElementById('focus-mode-bar')) {
      const fmb = document.createElement('div');
      fmb.id = 'focus-mode-bar';
      fmb.className = 'focus-mode-pill hidden';
      fmb.innerHTML =
        '<span class="fmb-badge">🎯 Focus</span>' +
        '<span class="fmb-subject" id="fmb-subject-name">' + subName + '</span>' +
        '<span class="fmb-sep">•</span>' +
        '<span class="fmb-dept" id="fmb-dept-name">' + deptName + '</span>' +
        '<button class="fmb-exit-btn" id="fmb-exit-btn" title="Exit Focus Mode (Esc)">✕ Exit Focus</button>';
      document.body.appendChild(fmb);
    }

    // Mini Reopen Tab for Left Controls (Visible when controls collapsed)
    if (!document.getElementById('mini-controls-reopen')) {
      const mini = document.createElement('button');
      mini.id = 'mini-controls-reopen';
      mini.className = 'mini-controls-reopen-tab hidden';
      mini.title = 'Open Controls (C)';
      mini.innerHTML = '<span>Controls ▶</span>';
      mini.addEventListener('click', function() {
        if (typeof window.UI !== 'undefined' && typeof window.UI.toggleControlsPalette === 'function') {
          window.UI.toggleControlsPalette();
        } else {
          document.body.classList.toggle('controls-collapsed');
        }
      });
      document.body.appendChild(mini);
    }

    // Dynamic brand-sub under KPRIET logo in Smart Board topbar
    const brandSub = document.querySelector('.brand-sub');
    if (brandSub) {
      brandSub.innerHTML = 'Learn Beyond &middot; ' + deptName;
    }

    // Inject styles
    const style = document.createElement('style');
    style.id = 'rbac-bridge-styles';
    style.textContent = [
      '#rbac-session-bar{position:sticky;top:0;left:0;right:0;z-index:9999;height:clamp(48px,5.2vh,56px);display:flex;align-items:center;justify-content:space-between;padding:0 clamp(10px,1.2vw,20px);background:linear-gradient(90deg,#06150c 0%,#0d2719 30%,#0d2719 70%,#06150c 100%);border-bottom:1.5px solid rgba(74,222,128,0.3);font-family:"Plus Jakarta Sans","Inter",sans-serif;color:#f4fbf5;gap:12px;flex-shrink:0;box-shadow:0 3px 16px rgba(0,0,0,0.45);}',
      '#rbac-session-bar .rbac-sb-left,#rbac-session-bar .rbac-sb-right{display:flex;align-items:center;gap:10px;flex-shrink:0;}',
      '#rbac-session-bar .rbac-sb-brand{display:flex;align-items:center;gap:8px;padding-right:12px;border-right:1px solid rgba(255,255,255,0.12);}',
      '#rbac-session-bar .rbac-sb-logo{height:clamp(26px,2.8vh,30px);width:clamp(26px,2.8vh,30px);object-fit:contain;background:#ffffff;border-radius:6px;padding:2px;box-shadow:0 0 10px rgba(34,197,94,0.35);}',
      '#rbac-session-bar .rbac-sb-brand-text{display:flex;flex-direction:column;line-height:1.15;}',
      '#rbac-session-bar .rbac-brand-title{font-size:clamp(12.5px,1.1vw,14px);font-weight:800;color:#ffffff;letter-spacing:-0.01em;}',
      '#rbac-session-bar .rbac-brand-sub{font-size:9.5px;font-weight:700;color:#4ade80;letter-spacing:0.08em;text-transform:uppercase;}',
      '#rbac-session-bar .rbac-sb-center{display:flex;flex-direction:column;align-items:center;justify-content:center;flex:1;min-width:0;text-align:center;}',
      '#rbac-session-bar .rbac-sb-subject-main{display:flex;align-items:center;justify-content:center;gap:8px;max-width:100%;}',
      '#rbac-session-bar .rbac-sb-domain-icon{font-size:clamp(15px,1.5vh,18px);filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3));}',
      '#rbac-session-bar .rbac-sb-subject-title{font-size:clamp(14.5px,1.35vw,18px);font-weight:800;color:#ffffff;letter-spacing:-0.015em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-shadow:0 2px 4px rgba(0,0,0,0.5);}',
      '#rbac-session-bar .rbac-sb-code-tag{font-family:"JetBrains Mono",monospace;font-size:10px;font-weight:700;background:rgba(74,222,128,0.2);border:1px solid rgba(74,222,128,0.45);color:#86efac;padding:1px 6px;border-radius:4px;}',
      '#rbac-session-bar .rbac-sb-subject-sub{display:flex;align-items:center;justify-content:center;gap:6px;font-size:clamp(10.5px,0.9vw,12px);font-weight:600;color:#a7f3d0;margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
      '#rbac-session-bar .rbac-sb-sep{color:rgba(255,255,255,0.4);font-size:10px;}',
      '#rbac-session-bar .rbac-sb-meta{display:flex;align-items:center;gap:8px;}',
      '#rbac-session-bar .rbac-badge{display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:600;padding:3.5px 8px;border-radius:6px;white-space:nowrap;}',
      '#rbac-session-bar .rbac-badge-teacher{background:rgba(255,255,255,0.09);border:1px solid rgba(255,255,255,0.16);color:#f8fafc;}',
      '#rbac-session-bar .rbac-badge-mode{background:rgba(34,197,94,0.15);border:1px solid rgba(34,197,94,0.35);color:#86efac;}',
      '#rbac-session-bar .rbac-sb-buttons{display:flex;align-items:center;gap:6px;}',
      '#rbac-session-bar .rbac-btn{display:inline-flex;align-items:center;gap:5px;height:clamp(30px,3.4vh,34px);padding:0 clamp(8px,0.8vw,12px);border-radius:6px;font-size:clamp(11px,0.95vw,12.5px);font-weight:700;cursor:pointer;font-family:inherit;transition:all 0.15s ease;color:#ffffff;box-shadow:0 2px 6px rgba(0,0,0,0.25);border:none;white-space:nowrap;}',
      '#rbac-session-bar .rbac-btn:hover{transform:translateY(-1px);filter:brightness(1.12);}',
      '#rbac-session-bar .rbac-btn-formulas{background:linear-gradient(135deg,#7c3aed,#8b5cf6);border:1px solid #a78bfa;}',
      '#rbac-session-bar .rbac-btn-sim{background:linear-gradient(135deg,#0284c7,#0ea5e9);border:1px solid #38bdf8;}',
      '#rbac-session-bar .rbac-btn-share{background:linear-gradient(135deg,#15803d,#22c55e);border:1px solid #4ade80;}',
      '#rbac-session-bar .rbac-btn-focus{background:linear-gradient(135deg,#ea580c,#f97316);border:1px solid #fdba74;}',
      '#rbac-session-bar .rbac-btn-portal{background:rgba(255,255,255,0.14);border:1px solid rgba(255,255,255,0.28);color:#ffffff;}',
      '#rbac-session-bar .rbac-btn-more{display:none;background:rgba(255,255,255,0.14);border:1px solid rgba(255,255,255,0.28);padding:0 8px;font-size:16px;}',
      '.rbac-overflow-wrap{position:relative;display:inline-block;}',
      '.rbac-overflow-menu{position:absolute;top:calc(100% + 6px);right:0;background:#0d1e15;border:1px solid rgba(74,222,128,0.4);border-radius:8px;padding:6px;display:flex;flex-direction:column;gap:6px;z-index:10000;box-shadow:0 8px 24px rgba(0,0,0,0.6);min-width:160px;}',
      '.rbac-overflow-menu.hidden{display:none !important;}',
      'body.rbac-session-active #topbar{top:clamp(48px,5.2vh,56px) !important;}',
      'body.rbac-session-active #page-tabs-bar{top:calc(clamp(48px,5.2vh,56px) + var(--topbar-h,38px)) !important;}',
      /* Focus Mode bar */
      '.focus-mode-pill{position:fixed;top:10px;left:50%;transform:translateX(-50%);z-index:99999;display:flex;align-items:center;gap:10px;padding:6px 16px;background:rgba(7,20,13,0.92);backdrop-filter:blur(12px);border:1px solid rgba(74,222,128,0.4);border-radius:24px;color:#f0fdf4;box-shadow:0 6px 24px rgba(0,0,0,0.6);font-size:12.5px;font-weight:700;}',
      '.focus-mode-pill .fmb-badge{background:#15803d;color:#ffffff;padding:2px 8px;border-radius:12px;font-size:11px;}',
      '.focus-mode-pill .fmb-subject{color:#ffffff;font-size:13px;font-weight:800;}',
      '.focus-mode-pill .fmb-sep{color:rgba(255,255,255,0.4);font-size:10px;}',
      '.focus-mode-pill .fmb-dept{color:#86efac;font-size:11.5px;}',
      '.focus-mode-pill .fmb-exit-btn{background:#dc2626;border:none;color:#ffffff;padding:4px 10px;border-radius:12px;font-size:11.5px;font-weight:700;cursor:pointer;transition:all .15s;}',
      '.focus-mode-pill .fmb-exit-btn:hover{background:#b91c1c;transform:scale(1.04);}',
      /* Mini controls reopen tab */
      '.mini-controls-reopen-tab{position:fixed;left:0;top:180px;z-index:900;background:linear-gradient(135deg,#0d2719,#1b4d32);border:1px solid #4CAF70;border-left:none;border-radius:0 12px 12px 0;color:#ffffff;font-size:12px;font-weight:700;padding:8px 12px;cursor:pointer;box-shadow:2px 4px 14px rgba(0,0,0,0.35);transition:all .15s;}',
      '.mini-controls-reopen-tab:hover{background:#15803d;padding-left:14px;}',
      /* Fullscreen active hide header */
      'body.board-fullscreen #rbac-session-bar{display:none !important;}',
      'body.board-fullscreen #focus-mode-bar{display:flex !important;}',
      /* Responsive breakpoints */
      '@media (max-width:1150px){#rbac-session-bar .rbac-sb-meta{display:none;}}',
      '@media (max-width:960px){#rbac-session-bar .rbac-btn-focus,#rbac-session-bar .rbac-btn-portal{display:none;}#rbac-session-bar .rbac-btn-more{display:inline-flex;}}',
      '@media (max-width:768px){#rbac-session-bar .btn-lbl{display:none;}#rbac-session-bar .rbac-sb-brand-text{display:none;}#rbac-session-bar .rbac-sb-subject-title{font-size:13.5px;}}'
    ].join('');
    document.head.appendChild(style);

    // Event listeners
    const backBtn = document.getElementById('rbac-back-to-dashboard');
    if (backBtn) {
      backBtn.addEventListener('click', function() {
        if (session && session.returnUrl) {
          window.location.href = session.returnUrl;
        } else if (document.referrer && (document.referrer.includes('/teacher') || document.referrer.includes('/dashboard'))) {
          window.location.href = document.referrer;
        } else {
          window.location.href = DASHBOARD_URL;
        }
      });
    }

    const formulaBtn = document.getElementById('rbac-board-formulas');
    if (formulaBtn) formulaBtn.addEventListener('click', openSubjectFormulasDrawer);

    const simBtn = document.getElementById('rbac-board-simulations');
    if (simBtn) simBtn.addEventListener('click', openSimulationsDialog);

    const shareBtn = document.getElementById('rbac-board-share-notes');
    if (shareBtn) shareBtn.addEventListener('click', openShareNotesDialog);

    const focusBtn = document.getElementById('rbac-board-focus');
    if (focusBtn) {
      focusBtn.addEventListener('click', function() {
        if (typeof window.App !== 'undefined' && typeof window.App.toggleFullscreen === 'function') {
          window.App.toggleFullscreen();
        } else {
          document.body.classList.toggle('board-fullscreen');
        }
      });
    }

    const fmbExitBtn = document.getElementById('fmb-exit-btn');
    if (fmbExitBtn) {
      fmbExitBtn.addEventListener('click', function() {
        if (typeof window.App !== 'undefined' && typeof window.App.toggleFullscreen === 'function') {
          window.App.toggleFullscreen();
        } else {
          document.body.classList.remove('board-fullscreen');
        }
      });
    }

    const moreBtn = document.getElementById('rbac-btn-more');
    const overflowMenu = document.getElementById('rbac-overflow-menu');
    if (moreBtn && overflowMenu) {
      moreBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        overflowMenu.classList.toggle('hidden');
        if (!overflowMenu.classList.contains('hidden')) {
          overflowMenu.innerHTML =
            '<button class="rbac-btn rbac-btn-focus" style="width:100%;margin-bottom:4px;" onclick="if(window.App)window.App.toggleFullscreen();">🎯 Focus Mode</button>' +
            '<button class="rbac-btn rbac-btn-portal" style="width:100%;" onclick="document.getElementById(\'rbac-back-to-dashboard\').click();">← Return to Portal</button>';
        }
      });
      document.addEventListener('click', function() {
        overflowMenu.classList.add('hidden');
      });
    }

    if (isTeacher) injectTopbarShareButton();
  }

  /** "Unit 2 · Partial Differentiation" for the current Smart Board focus, if any. */
  function describeFocus() {
    const f = session && session.focus;
    if (!f) return '';
    const parts = [];
    if (f.unitNumber) parts.push('Unit ' + f.unitNumber);
    if (f.topic) parts.push(f.topic);
    else if (f.unitTitle) parts.push(f.unitTitle);
    return parts.join(' · ');
  }

  function updateHeaderBarElements() {
    const subName = session.subjectName || 'Academic Subject';
    const deptName = session.programmeName || session.departmentName || 'Programme';
    const teacherName = session.teacherName || session.name || (isTeacher ? 'Faculty Member' : 'Student');
    const domain = resolveSubjectDomain(session);
    const icon = session.subjectIcon || getSubjectIcon(domain, subName);

    const subNameEl = document.getElementById('rbac-header-sub-name');
    if (subNameEl) subNameEl.textContent = subName;

    const iconEl = document.getElementById('rbac-header-sub-icon');
    if (iconEl) iconEl.textContent = icon;

    const codeEl = document.getElementById('rbac-header-sub-code');
    if (codeEl) {
      if (session.subjectCode) {
        codeEl.textContent = session.subjectCode;
        codeEl.style.display = '';
      } else {
        codeEl.style.display = 'none';
      }
    }

    const deptEl = document.getElementById('rbac-header-dept-name');
    if (deptEl) deptEl.textContent = deptName;

    const semEl = document.getElementById('rbac-header-sem-name');
    if (semEl) semEl.textContent = 'Semester ' + (session.semesterNumber || 1);

    const focusEl = document.getElementById('rbac-header-focus');
    const focusSep = document.getElementById('rbac-header-focus-sep');
    if (focusEl && focusSep) {
      const label = describeFocus();
      focusEl.textContent = label;
      focusEl.style.display = label ? '' : 'none';
      focusSep.style.display = label ? '' : 'none';
    }

    const secEl = document.getElementById('rbac-header-section-name');
    const secSep = document.getElementById('rbac-header-sec-sep');
    if (secEl && secSep) {
      if (session.section) {
        secEl.textContent = session.section;
        secEl.style.display = '';
        secSep.style.display = '';
      } else {
        secEl.style.display = 'none';
        secSep.style.display = 'none';
      }
    }

    const teacherEl = document.getElementById('rbac-header-teacher-name');
    if (teacherEl) teacherEl.textContent = teacherName;

    const brandSub = document.querySelector('.brand-sub');
    if (brandSub) brandSub.innerHTML = 'Learn Beyond &middot; ' + deptName;

    // Synchronize window.CurrentSubjectContext
    window.CurrentSubjectContext = session;
    window.EduverseSubjectContext = session;

    // Synchronize Topbar Subject Syllabus & Enrolled PPT presentations
    if (typeof window.UI !== 'undefined' && typeof window.UI.renderTopChapters === 'function') {
      window.UI.renderTopChapters();
    }
  }

  function injectTopbarShareButton() {
    const tools = document.querySelector('.tb-primary-tools');
    if (tools && !document.getElementById('tb-btn-share-notes')) {
      const btn = document.createElement('button');
      btn.className = 'tb-btn share-notes-btn';
      btn.id = 'tb-btn-share-notes';
      btn.title = 'Share Smart Board Notes & Materials with Students';
      btn.style.cssText = 'background:linear-gradient(135deg,#1b4d32,#2e7d32);border:1.2px solid #4CAF70;color:#ffffff;font-weight:700;display:inline-flex;align-items:center;gap:6px;padding:6px 14px;border-radius:8px;cursor:pointer;font-family:inherit;font-size:12px;box-shadow:0 2px 8px rgba(27,77,50,0.3);margin-right:4px;';
      btn.innerHTML = '<span style="font-size:13px">📄</span><span>Share Notes</span>';
      btn.addEventListener('click', openShareNotesDialog);
      tools.insertBefore(btn, tools.firstChild);
    }
  }

  /* ══════════════════════════════════════════════════════════
     6. SUBJECT SIMULATIONS CATALOG & DIALOG
     Loads simulations strictly by Department + Semester + Subject.
     ══════════════════════════════════════════════════════════ */
  /* Data Structures & Algorithms — the ten simulations teachers see in the
     DSA subject's Simulation list. Each opens inside the Smart Board, preset
     to that one simulation (engine: dsa-simulation.html in board mode). */
  const DSA_SUBJECT_KEYWORDS = ['data structure', 'algorithm', 'dsa'];
  const DSA_SIMULATIONS = [
    { id: 'sim-dsa-array', simKey: 'dsa-array', dsaCategory: 'array', subjectKeywords: DSA_SUBJECT_KEYWORDS, title: 'Arrays', domain: 'DSA', category: 'Linear Data Structures', description: 'Insert, delete and traverse elements with index-by-index steps.', icon: '📊' },
    { id: 'sim-dsa-stack', simKey: 'dsa-stack', dsaCategory: 'stack', subjectKeywords: DSA_SUBJECT_KEYWORDS, title: 'Stack', domain: 'DSA', category: 'Linear Data Structures', description: 'Push, pop and peek with overflow and underflow checks (LIFO).', icon: '🥞' },
    { id: 'sim-dsa-queue', simKey: 'dsa-queue', dsaCategory: 'queue', subjectKeywords: DSA_SUBJECT_KEYWORDS, title: 'Queue', domain: 'DSA', category: 'Linear Data Structures', description: 'Enqueue and dequeue with front and rear pointers (FIFO).', icon: '🚶' },
    { id: 'sim-dsa-circular-queue', simKey: 'dsa-circular-queue', dsaCategory: 'circular-queue', subjectKeywords: DSA_SUBJECT_KEYWORDS, title: 'Circular Queue', domain: 'DSA', category: 'Linear Data Structures', description: 'Circular wrap-around with front and rear pointers in a fixed buffer.', icon: '🔄' },
    { id: 'sim-dsa-linked-list', simKey: 'dsa-linked-list', dsaCategory: 'linked-list', subjectKeywords: DSA_SUBJECT_KEYWORDS, title: 'Linked List', domain: 'DSA', category: 'Linear Data Structures', description: 'Insert at head, tail or position, delete and search nodes.', icon: '🔗' },
    { id: 'sim-dsa-binary-tree', simKey: 'dsa-binary-tree', dsaCategory: 'binary-tree', subjectKeywords: DSA_SUBJECT_KEYWORDS, title: 'Binary Tree', domain: 'DSA', category: 'Non-Linear Data Structures', description: 'Level-order insertion with in-order, pre-order and post-order traversals.', icon: '🌲' },
    { id: 'sim-dsa-bst', simKey: 'dsa-bst', dsaCategory: 'bst', subjectKeywords: DSA_SUBJECT_KEYWORDS, title: 'Binary Search Tree', domain: 'DSA', category: 'Non-Linear Data Structures', description: 'Insert, search and find minimum / maximum in a BST.', icon: '🌳' },
    { id: 'sim-dsa-graph', simKey: 'dsa-graph', dsaCategory: 'graph', subjectKeywords: DSA_SUBJECT_KEYWORDS, title: 'Graph Traversal (BFS & DFS)', domain: 'DSA', category: 'Graph Algorithms', description: 'Breadth-first and depth-first traversal over the adjacency list.', icon: '🕸️' },
    { id: 'sim-dsa-searching', simKey: 'dsa-searching', dsaCategory: 'searching', subjectKeywords: DSA_SUBJECT_KEYWORDS, title: 'Searching (Linear & Binary)', domain: 'DSA', category: 'Searching & Sorting', description: 'Linear search and binary search, with a sorted-input check.', icon: '🔍' },
    { id: 'sim-dsa-sorting', simKey: 'dsa-sorting', dsaCategory: 'sorting', subjectKeywords: DSA_SUBJECT_KEYWORDS, title: 'Sorting Algorithms', domain: 'DSA', category: 'Searching & Sorting', description: 'Bubble, Selection, Insertion, Merge and Quick Sort step by step.', icon: '📶' },
  ];
  const DSA_CATEGORY_BY_KEY = DSA_SIMULATIONS.reduce((map, sim) => { map[sim.simKey] = sim.dsaCategory; return map; }, {});
  // Older keys used by earlier builds / saved assignments → the matching simulation
  const DSA_LEGACY_KEYS = {
    array: 'array', stack: 'stack', queue: 'queue', 'stack-queue': 'stack', 'dsa-stack-queue': 'stack',
    linkedlist: 'linked-list', 'linked-list': 'linked-list', 'dsa-linkedlist': 'linked-list',
    'binary-tree': 'binary-tree', bst: 'bst', graph: 'graph', searching: 'searching', sorting: 'sorting',
  };
  /** Returns the DSA engine category for a simulation key, or '' when the key is not a DSA simulation. */
  function resolveDsaCategory(key, context) {
    const k = String(key || '');
    if (DSA_CATEGORY_BY_KEY[k]) return DSA_CATEGORY_BY_KEY[k];
    if (DSA_LEGACY_KEYS[k]) return DSA_LEGACY_KEYS[k];
    if (k === 'cs-dsa-lab') {
      const ctx = context || {};
      const cat = ctx.category || (ctx.config && ctx.config.category) || (ctx.state && ctx.state.category) || '';
      return DSA_SIMULATIONS.some((s) => s.dsaCategory === cat) ? cat : 'searching';
    }
    return '';
  }
  function dsaSimulationFor(category) {
    return DSA_SIMULATIONS.find((s) => s.dsaCategory === category) || null;
  }

  /* Computer Networks (U21CSG05) — 35 simulations from tools/cn-catalog.js, organised
     Unit → Topic. Each opens inside the Smart Board (engine: cn-simulation.html). */
  const CN_SUBJECT_KEYWORDS = ['computer network', 'data communication', 'internetwork'];
  const CN_CATALOG = (typeof window !== 'undefined' && window.EduverseCNCatalog) || null;
  const CN_SIMULATIONS = CN_CATALOG ? CN_CATALOG.simulations.map((sim) => ({
    id: 'sim-' + sim.id, simKey: sim.id, title: sim.title, domain: 'DSA', category: `Unit ${sim.unit} · ${sim.topic}`,
    description: sim.description, icon: sim.icon, subjectKeywords: CN_SUBJECT_KEYWORDS, unit: sim.unit, topic: sim.topic,
  })) : [];

  const COMPREHENSIVE_SIMULATIONS = [
    ...CN_SIMULATIONS,
    // ─── DATA STRUCTURES & ALGORITHMS (10 simulations, one engine, shown on the board) ───
    ...DSA_SIMULATIONS,
    // ─── OTHER COMPUTER SCIENCE ───
    {
      id: 'sim-dsa-cpu',
      subjectKeywords: ['operating system'],
      simKey: 'cpu',
      title: 'CPU Scheduling Gantt Chart (FCFS, SJF, RR)',
      domain: 'DSA',
      category: 'Operating Systems',
      description: 'Process arrival and burst time scheduling visualizer rendering real-time Gantt charts and turnaround times.',
      icon: '⏱️'
    },
    {
      id: 'sim-dsa-regression',
      subjectKeywords: ['machine learning', 'artificial intelligence', 'data science', 'deep learning'],
      simKey: 'linear-regression',
      title: 'Gradient Descent & Loss Minimizer',
      domain: 'DSA',
      category: 'AI & Machine Learning',
      description: 'Interactive scatter plot with regression line, weight/bias sliders, and live MSE loss minimization.',
      icon: '🤖'
    },

    // ─── ENGINEERING MATHEMATICS ───
    {
      id: 'sim-math-graphs',
      simKey: 'math-graphs',
      title: 'Dynamic Function Plotter & Tangent Slopes',
      domain: 'MATHEMATICS',
      category: 'Calculus & Functions',
      description: 'Plot polynomial, trigonometric, and exponential curves with live derivative tangent slopes and roots.',
      icon: '📈'
    },
    {
      id: 'sim-math-limits',
      simKey: 'limits',
      title: 'Limits & Continuous Functions Visualizer',
      domain: 'MATHEMATICS',
      category: 'Calculus',
      description: 'Epsilon-delta neighborhood visualization and left/right limits approaching points of discontinuity.',
      icon: '🎯'
    },
    {
      id: 'sim-math-diff',
      simKey: 'differentiation',
      title: 'Derivative Slope & Tangent Velocity',
      domain: 'MATHEMATICS',
      category: 'Differential Calculus',
      description: 'Secant line slope tending to instantaneous derivative dy/dx with variable delta-x stepping.',
      icon: '📐'
    },
    {
      id: 'sim-math-calculus',
      simKey: 'calculus',
      title: 'Riemann Sums & Definite Integrals',
      domain: 'MATHEMATICS',
      category: 'Integral Calculus',
      description: 'Visual approximation of definite integrals through dynamic rectangular Riemann slices and trapezoidal summations.',
      icon: '∫'
    },
    {
      id: 'sim-math-partial',
      simKey: 'partial-diff',
      title: '2D & 3D Partial Derivatives & Contour Gradient',
      domain: 'MATHEMATICS',
      category: 'Multivariable Calculus',
      description: 'Contour curves, gradient direction vectors, and partial slopes along coordinate axes.',
      icon: '⛰️'
    },
    {
      id: 'sim-math-ode',
      simKey: 'transforms',
      title: 'Differential Equations Phase Portrait',
      domain: 'MATHEMATICS',
      category: 'Differential Equations',
      description: 'Direction field arrows, equilibrium saddle/node points, and trajectory curves in phase space.',
      icon: '🌀'
    },
    {
      id: 'sim-math-vectors',
      simKey: 'vector-ops',
      title: 'Vector Operations & Cross/Dot Product',
      domain: 'MATHEMATICS',
      category: 'Linear Algebra',
      description: '2D/3D vector addition, dot product projections, and orthogonal cross product vectors.',
      icon: '↗️'
    },
    {
      id: 'sim-math-matrix',
      simKey: 'matrix-calc',
      title: '2D Linear Matrix Transformations & Eigenvectors',
      domain: 'MATHEMATICS',
      category: 'Linear Algebra',
      description: 'Deform coordinate grid via matrix transformation. Track basis vectors, determinant area scaling, and invariant eigenvectors.',
      icon: '🔲'
    },
    {
      id: 'sim-math-circle',
      simKey: 'unitcircle',
      title: 'Unit Circle & Trigonometric Transformations',
      domain: 'MATHEMATICS',
      category: 'Trigonometry',
      description: 'Interactive angle ray projecting sine, cosine, and tangent lengths on the Cartesian coordinate plane.',
      icon: '⭕'
    },
    {
      id: 'sim-math-taylor',
      simKey: 'taylor-series',
      title: 'Taylor Series Polynomial Approximations',
      domain: 'MATHEMATICS',
      category: 'Differential Calculus',
      description: 'Visualize Nth-order Taylor polynomial convergence to sin(x), e^x, and ln(1+x) curves.',
      icon: '📊'
    },
    {
      id: 'sim-math-extrema',
      simKey: 'maxima-minima',
      title: 'Maxima, Minima & Saddle Surface Extrema',
      domain: 'MATHEMATICS',
      category: 'Optimization & Multivariable',
      description: 'Interactive 3D surface critical points, tangent planes, and Hessian determinant classification.',
      icon: '⛰️'
    },
    {
      id: 'sim-math-transforms',
      simKey: 'fourier-laplace',
      title: 'Fourier & Laplace Harmonic Frequency Visualizer',
      domain: 'MATHEMATICS',
      category: 'Transforms & Harmonics',
      description: 'Synthesize square, sawtooth, and triangle waves from Fourier sine harmonics and analyze complex s-plane poles.',
      icon: '〰️'
    },

    // ─── ENGINEERING PHYSICS ───
    {
      id: 'sim-phy-projectile',
      simKey: 'projectile',
      title: 'Ballistic Projectile Motion Lab',
      domain: 'PHYSICS',
      category: 'Mechanics & Kinematics',
      description: 'Trajectories under Earth, Moon, and Mars gravity with live velocity vector resolution and apogee calculations.',
      icon: '🚀'
    },
    {
      id: 'sim-phy-pendulum',
      simKey: 'pendulum',
      title: 'Pendulum & Simple Harmonic Motion',
      domain: 'PHYSICS',
      category: 'Harmonics & Oscillations',
      description: 'Oscillating bob tracking period T = 2pi*sqrt(L/g), kinetic/potential energy interchanges, and damping.',
      icon: '⏱️'
    },
    {
      id: 'sim-phy-collision',
      simKey: 'collision',
      title: 'Elastic & Inelastic 2D Collisions',
      domain: 'PHYSICS',
      category: 'Mechanics & Momentum',
      description: 'Conservation of linear momentum and kinetic energy coefficient of restitution under varying mass ratios.',
      icon: '💥'
    },
    {
      id: 'sim-phy-optics',
      simKey: 'optics',
      title: 'Snell\'s Law & Optical Refraction',
      domain: 'PHYSICS',
      category: 'Optics & Wave Motion',
      description: 'Light ray refraction across optical boundaries, index of refraction slider, and total internal reflection angle.',
      icon: '🌈'
    },
    {
      id: 'sim-phy-waves',
      simKey: 'waves',
      title: 'Wave Superposition & Standing Wave Interference',
      domain: 'PHYSICS',
      category: 'Wave Mechanics',
      description: 'Constructive and destructive interference nodes, harmonics, and Doppler frequency shifts.',
      icon: '🌊'
    },
    {
      id: 'sim-phy-circuits',
      simKey: 'circuits',
      title: 'AC/DC RLC Circuit Resonance & Oscillations',
      domain: 'PHYSICS',
      category: 'Electronics & Electromagnetics',
      description: 'Oscilloscope trace of inductor-capacitor resonance, impedance damping, and AC phase lag.',
      icon: '⚡'
    },
    {
      id: 'sim-phy-thermo',
      simKey: 'thermodynamics',
      title: 'Thermodynamic Ideal Gas PV Cycle',
      domain: 'PHYSICS',
      category: 'Thermodynamics',
      description: 'Interactive Pressure-Volume cycle rendering Carnot efficiency, isobaric, and isothermal expansion work.',
      icon: '🔥'
    },

    // ─── CIVIL ENGINEERING / ENGINEERING MECHANICS ───
    {
      id: 'sim-civ-beam',
      simKey: 'beam-deflection',
      title: 'Simply Supported Beam Deflection & Bending Moments',
      domain: 'CIVIL',
      category: 'Structural Mechanics',
      description: 'Point and distributed load shear force diagrams (SFD) and bending moment diagrams (BMD) with deflection curve.',
      icon: '📏'
    },
    {
      id: 'sim-civ-truss',
      simKey: 'truss-forces',
      title: '2D Truss Equilibrium & Joint Reaction Forces',
      domain: 'CIVIL',
      category: 'Structural Analysis',
      description: 'Method of joints resolving pin-connected truss tension and compression member forces under nodal loads.',
      icon: '🏗️'
    },
    {
      id: 'sim-civ-stress',
      simKey: 'stress-strain',
      title: 'Hooke\'s Law & Tensile Stress-Strain Lab',
      domain: 'CIVIL',
      category: 'Mechanics of Solids',
      description: 'Elastic linear region, proportional limit, yield point, ultimate tensile strength, and necking rupture.',
      icon: '🔩'
    },
    {
      id: 'sim-civ-surveying',
      simKey: 'surveying',
      title: 'Total Station Surveying & Triangulation',
      domain: 'CIVIL',
      category: 'Surveying & Geomatics',
      description: 'Horizontal/vertical angles, elevation leveling, and closed traverse coordinate error balancing.',
      icon: '🧭'
    },
    {
      id: 'sim-civ-fluid',
      simKey: 'fluid-mechanics',
      title: 'Open Channel Fluid Flow & Reynolds Regimes',
      domain: 'CIVIL',
      category: 'Hydraulics',
      description: 'Laminar, transitional, and turbulent fluid flows through pipe cross-sections and Manning open channels.',
      icon: '💧'
    },
    {
      id: 'sim-civ-concrete',
      simKey: 'concrete-mix',
      title: 'Concrete Mix Proportioning & Strength Curve',
      domain: 'CIVIL',
      category: 'Construction Materials',
      description: 'Water-cement ratio curve, compressive strength after 7 and 28 days curing, and aggregate ratios.',
      icon: '🧱'
    },
  ];

  function openSimulationsDialog() {
    const existing = document.getElementById('rbac-sim-modal-overlay');
    if (existing) existing.remove();

    const domain = resolveSubjectDomain(session);
    const subName = session.subjectName || 'Subject';
    const deptName = session.departmentName || 'Department';

    // Prioritize teacher-assigned or backend session simulations if available
    let allSims = COMPREHENSIVE_SIMULATIONS;
    if (session && Array.isArray(session.simulations) && session.simulations.length > 0) {
      const customSims = session.simulations.map((s, idx) => ({
        id: `sim-custom-${idx}`,
        simKey: s.key || s.simKey || 'custom',
        title: s.title,
        domain: domain,
        category: s.category || s.type || 'Subject Simulation',
        description: s.description || `Interactive ${subName} simulation module.`,
        simulationId: s.simulationId || s.id || '',
        topic: s.topic || s.config?.topic || '',
        config: s.config || s.initialParams || {},
        icon: '🔬',
      }))
        // DSA: the ten board simulations are already in the catalogue, so the
        // backend's default DSA entries are dropped and teacher-assigned DSA
        // simulations are mapped onto the matching one (Stack, Queue, ...).
        .filter((sim) => !(resolveDsaCategory(sim.simKey, sim) && !sim.simulationId))
        .map((sim) => {
          const cat = resolveDsaCategory(sim.simKey, sim);
          const base = cat ? dsaSimulationFor(cat) : null;
          return base ? { ...sim, simKey: base.simKey, dsaCategory: cat, icon: base.icon, category: base.category, domain: 'DSA' } : sim;
        });
      const assignedKeys = new Set(customSims.filter((sim) => !sim.simulationId || sim.dsaCategory).map((sim) => sim.simKey));
      allSims = [...customSims, ...COMPREHENSIVE_SIMULATIONS.filter((sim) => !assignedKeys.has(sim.simKey))];
    }

    const overlay = document.createElement('div');
    overlay.id = 'rbac-sim-modal-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.7);backdrop-filter:blur(5px);z-index:99999;display:flex;align-items:center;justify-content:center;padding:24px;font-family:"Plus Jakarta Sans","Inter",sans-serif;';

    overlay.innerHTML = `
      <div style="background:#ffffff;border-radius:20px;max-width:880px;width:100%;max-height:88vh;display:flex;flex-direction:column;box-shadow:0 24px 60px rgba(0,0,0,0.4);border:1.5px solid #d5e2d9;overflow:hidden">
        <div style="padding:22px 28px;background:linear-gradient(135deg,#0b2014,#1b4d32);color:#ffffff;display:flex;align-items:center;justify-content:space-between;border-bottom:1.5px solid #246B45">
          <div style="display:flex;align-items:center;gap:14px">
            <div style="width:42px;height:42px;border-radius:10px;background:rgba(255,255,255,0.12);display:flex;align-items:center;justify-content:center;font-size:24px;border:1px solid rgba(255,255,255,0.25)">
              🔬
            </div>
            <div>
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:2px">
                <h3 style="margin:0;font-size:18px;font-weight:800;color:#ffffff">Academic Simulation Laboratory</h3>
                <span style="font-size:10px;background:#4CAF70;color:#0b2014;padding:2px 8px;border-radius:10px;font-weight:800;text-transform:uppercase">Subject-Restricted</span>
              </div>
              <div style="font-size:12px;color:#a7f3d0;font-weight:600">
                ${subName} • ${deptName}
              </div>
            </div>
          </div>
          <button id="rbac-sim-close-btn" style="background:rgba(255,255,255,0.12);border:none;color:#ffffff;width:32px;height:32px;border-radius:8px;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s">✕</button>
        </div>

        <div style="padding:14px 28px;background:#f8fafc;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;justify-content:space-between;gap:12px">
          <div style="display:flex;gap:8px" id="rbac-sim-filter-tabs">
            <button class="rbac-sim-tab active" data-tab="subject" style="padding:6px 14px;border-radius:8px;border:1.5px solid #246B45;background:#246B45;color:#ffffff;font-size:12.5px;font-weight:700;cursor:pointer">
              ${subName} Simulations
            </button>
            <button class="rbac-sim-tab" data-tab="all" style="padding:6px 14px;border-radius:8px;border:1.5px solid #cbd5e1;background:#ffffff;color:#475569;font-size:12.5px;font-weight:600;cursor:pointer">
              All ${deptName} Simulations
            </button>
          </div>
          <span style="font-size:11.5px;color:#64748b">Click "Launch" to pin interactive widget onto Smart Board</span>
        </div>

        <div style="padding:24px 28px;overflow-y:auto;flex:1;background:#f1f5f9" id="rbac-sim-grid">
          <!-- Populated by JS -->
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const closeBtn = overlay.querySelector('#rbac-sim-close-btn');
    if (closeBtn) closeBtn.addEventListener('click', () => overlay.remove());

    function renderList(filter) {
      const grid = overlay.querySelector('#rbac-sim-grid');
      if (!grid) return;

      // "This subject" shows only simulations that belong to it: simulations tagged
      // with subject words (DSA, networking, OS, ML …) appear only in matching subjects;
      // a subject with no tagged match gets its domain's general simulations.
      const subjectText = `${session.subjectName || ''} ${session.subjectCode || ''}`.toLowerCase();
      const inDomain = allSims.filter((s) => s.domain === domain);
      const tagged = inDomain.filter((s) => Array.isArray(s.subjectKeywords) && s.subjectKeywords.some((k) => subjectText.includes(k)));
      const teacherAssigned = inDomain.filter((s) => s.simulationId && !tagged.includes(s));
      const subjectList = tagged.length
        ? [...tagged, ...teacherAssigned]
        : inDomain.filter((s) => !(Array.isArray(s.subjectKeywords) && s.subjectKeywords.length));
      const list = filter === 'subject' ? subjectList : allSims;

      if (list.length === 0) {
        grid.innerHTML = `
          <div style="text-align:center;padding:48px 20px;background:#ffffff;border-radius:14px;border:1px solid #e2e8f0">
            <div style="font-size:40px;margin-bottom:12px">🔬</div>
            <h4 style="font-size:16px;font-weight:700;color:#1e293b;margin:0 0 6px 0">No subject simulations found for ${subName}</h4>
            <p style="font-size:13px;color:#64748b;margin:0 0 16px 0">You can view all available engineering simulations from the department catalog below.</p>
            <button id="rbac-sim-switch-to-all" style="padding:8px 18px;background:#246B45;color:#ffffff;border:none;border-radius:8px;font-weight:700;font-size:13px;cursor:pointer">
              View All Department Simulations
            </button>
          </div>
        `;
        const swBtn = grid.querySelector('#rbac-sim-switch-to-all');
        if (swBtn) {
          swBtn.addEventListener('click', () => {
            const allTab = overlay.querySelector('.rbac-sim-tab[data-tab="all"]');
            if (allTab) allTab.click();
          });
        }
        return;
      }

      grid.innerHTML = `
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(360px,1fr));gap:16px">
          ${list.map((sim, idx) => `
            <div style="background:#ffffff;border-radius:14px;padding:20px;border:1.5px solid #e2e8f0;display:flex;flex-direction:column;justify-content:space-between;box-shadow:0 2px 8px rgba(0,0,0,0.04);transition:all .15s" class="rbac-sim-card">
              <div>
                <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:10px">
                  <div style="display:flex;align-items:center;gap:10px">
                    <div style="width:38px;height:38px;border-radius:8px;background:#f0fdf4;border:1px solid #bbf7d0;display:flex;align-items:center;justify-content:center;font-size:20px">
                      ${sim.icon || '🔬'}
                    </div>
                    <div>
                      <h4 style="font-size:14.5px;font-weight:800;color:#0f172a;margin:0 0 2px 0;line-height:1.3">${sim.title}</h4>
                      <span style="font-size:11px;color:#246B45;font-weight:700;background:#E8F5E9;padding:1px 6px;border-radius:4px">${sim.category || subName}</span>
                    </div>
                  </div>
                </div>
                <p style="font-size:12.5px;color:#475569;margin:0 0 16px 0;line-height:1.45">
                  ${sim.description}
                </p>
              </div>
              <div style="display:flex;align-items:center;justify-content:space-between;margin-top:10px;padding-top:12px;border-top:1px solid #f1f5f9">
                <span style="font-size:11px;color:#94a3b8;font-weight:600">${sim.simKey.toUpperCase()} • Interactive</span>
                <button class="rbac-sim-launch-btn" data-idx="${idx}" data-key="${sim.simKey}" data-title="${sim.title}" style="padding:7px 16px;background:linear-gradient(135deg,#1b4d32,#246B45);color:#ffffff;border:none;border-radius:8px;font-weight:700;font-size:12px;cursor:pointer;display:inline-flex;align-items:center;gap:6px;box-shadow:0 2px 6px rgba(27,77,50,0.25)">
                  🚀 Launch on Canvas
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      `;

      grid.querySelectorAll('.rbac-sim-launch-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const key = btn.getAttribute('data-key');
          const title = btn.getAttribute('data-title');
          const selected = list[Number(btn.getAttribute('data-idx'))] || list.find((sim) => sim.simKey === key);
          overlay.remove();
          launchSimulation(key, title, selected ? {
            simulationId: selected.simulationId || '',
            topic: selected.topic || selected.config?.topic || '',
            category: selected.dsaCategory || selected.config?.category || '',
            config: selected.config || {},
          } : {});
        });
      });
    }

    renderList('subject');

    overlay.querySelectorAll('.rbac-sim-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        overlay.querySelectorAll('.rbac-sim-tab').forEach(t => {
          t.style.background = '#ffffff';
          t.style.color = '#475569';
          t.style.borderColor = '#cbd5e1';
          t.style.fontWeight = '600';
          t.classList.remove('active');
        });
        tab.style.background = '#246B45';
        tab.style.color = '#ffffff';
        tab.style.borderColor = '#246B45';
        tab.style.fontWeight = '700';
        tab.classList.add('active');

        renderList(tab.getAttribute('data-tab'));
      });
    });
  }

  function launchSimulation(key, title, simulationContext = {}) {
    activeResourceTitle = title || (key + ' Simulation');

    // Computer Networks: open the chosen simulation on the board
    if (CN_CATALOG && CN_CATALOG.get(key)) {
      const cn = CN_CATALOG.get(key);
      activeResourceTitle = title || cn.title;
      launchSmartBoardSimWidget('cn-lab', title || cn.title, { ...(simulationContext || {}), simId: key, unit: cn.unit, unitTitle: cn.unitTitle, topic: cn.topic });
      if (window.App && typeof window.App.showToast === 'function') window.App.showToast('🚀 ' + (title || cn.title) + ' opened on the board', 'success');
      return;
    }

    // Data Structures & Algorithms: open the chosen simulation on the board
    const dsaCategory = resolveDsaCategory(key, simulationContext);
    if (dsaCategory) {
      const base = dsaSimulationFor(dsaCategory);
      const dsaTitle = title || (base ? base.title : 'Data Structures & Algorithms');
      activeResourceTitle = dsaTitle;
      launchSmartBoardSimWidget('cs-dsa-lab', dsaTitle, {
        ...(simulationContext || {}),
        category: dsaCategory,
        topic: (simulationContext && simulationContext.topic) || (base ? base.title : dsaTitle),
      });
      if (window.App && typeof window.App.showToast === 'function') {
        window.App.showToast('🚀 ' + dsaTitle + ' opened on the board', 'success');
      }
      return;
    }

    // Operating Systems (U21CS403): open in the OS interactive lab
    if (key === 'cs-os-lab' || key.startsWith('os-') || (session && (session.subjectCode === 'U21CS403' || String(session.subjectName || '').toLowerCase().includes('operating system')))) {
      const osTitle = title || 'Operating Systems Interactive Simulation';
      activeResourceTitle = osTitle;
      launchSmartBoardSimWidget('cs-os-lab', osTitle, {
        ...(simulationContext || {}),
        simulationId: key,
        topic: (simulationContext && simulationContext.topic) || osTitle,
      });
      if (window.App && typeof window.App.showToast === 'function') {
        window.App.showToast('🚀 ' + osTitle + ' opened on the board', 'success');
      }
      return;
    }
    const physKeys = ['projectile', 'pendulum', 'collision', 'optics', 'waves', 'circuits', 'thermodynamics'];
    const mathKeys = ['unitcircle', 'calculus', 'math-graphs', 'transforms', 'matrix-calc'];

    if (physKeys.includes(key) && window.PhysicsLab && typeof window.PhysicsLab.show === 'function') {
      window.PhysicsLab.show(key);
      if (window.App && typeof window.App.showToast === 'function') {
        window.App.showToast('🚀 Physics Lab Launched: ' + (title || key), 'success');
      }
    } else if (mathKeys.includes(key) && window.MathVisualizer && typeof window.MathVisualizer.show === 'function') {
      window.MathVisualizer.show(key);
      if (window.App && typeof window.App.showToast === 'function') {
        window.App.showToast('🚀 Math Visualizer Launched: ' + (title || key), 'success');
      }
    } else {
      launchSmartBoardSimWidget(key, title || key.toUpperCase() + ' Simulation', simulationContext);
      if (window.App && typeof window.App.showToast === 'function') {
        window.App.showToast('🚀 Simulation Widget: ' + (title || key), 'success');
      }
    }
  }

  function launchDynamicResource(resource) {
    if (!resource) return;
    const title = resource.title || 'Academic Resource';
    const type = resource.type || 'ppt';
    activeResourceTitle = title;

    if (type === 'sim' || resource.simKey) {
      launchSimulation(resource.simKey || 'bst', title, resource.simulationContext || resource);
      return;
    }

    if (window.App && typeof window.App.showToast === 'function') {
      window.App.showToast(`🚀 Launched resource: ${title} (${type.toUpperCase()})`, 'info');
    }
  }

  /* ══════════════════════════════════════════════════════════
     7. SUBJECT FORMULAS & THEOREMS REFERENCE DRAWER
     Curates formulas matching active subject.
     ══════════════════════════════════════════════════════════ */
  const COMPREHENSIVE_FORMULAS = [
    // ─── DATA STRUCTURES & ALGORITHMS / COMPUTER SCIENCE ───
    {
      id: 'f-dsa-master',
      domain: 'DSA',
      title: 'Master Theorem for Divide-and-Conquer Recurrences',
      latex: 'T(n) = a T(n/b) + Theta(n^k log^p n)',
      explanation: 'Asymptotic solution cases: If a > b^k, T(n) = Theta(n^(log_b a)). If a = b^k, T(n) = Theta(n^k log^(p+1) n). If a < b^k, T(n) = Theta(n^k log^p n).',
      category: 'Complexity Analysis',
      unit: 1
    },
    {
      id: 'f-dsa-bigo',
      domain: 'DSA',
      title: 'Big-O Growth Hierarchy & Asymptotics',
      latex: 'O(1) < O(log n) < O(n) < O(n log n) < O(n^2) < O(2^n) < O(n!)',
      explanation: 'Standard ordering of algorithmic time and space complexity classes.',
      category: 'Asymptotic Bounds',
      unit: 1
    },
    {
      id: 'f-dsa-avl',
      domain: 'DSA',
      title: 'AVL Tree Balance Factor & Height Invariance',
      latex: 'BF(v) = height(left_sub) - height(right_sub) in {-1, 0, +1}',
      explanation: 'An AVL node requires |BF| <= 1. Imbalance triggers Single Rotations (LL, RR) or Double Rotations (LR, RL) in O(1) time.',
      category: 'Balanced Search Trees',
      unit: 2
    },
    {
      id: 'f-dsa-tree',
      domain: 'DSA',
      title: 'Maximum Nodes in Binary Tree of Height h',
      latex: 'N_max = 2^(h+1) - 1  |  h_min = floor(log2(n))',
      explanation: 'A complete binary tree of height h guarantees O(log n) worst-case search, insertion, and deletion complexity.',
      category: 'Tree Properties',
      unit: 2
    },
    {
      id: 'f-dsa-graph',
      domain: 'DSA',
      title: 'Graph Handshaking Lemma',
      latex: 'sum_{v in V} deg(v) = 2 |E|',
      explanation: 'The sum of all vertex degrees in an undirected graph equals twice the edge count. The number of odd-degree vertices is always even.',
      category: 'Graph Invariants',
      unit: 4
    },
    {
      id: 'f-dsa-hash',
      domain: 'DSA',
      title: 'Hash Table Load Factor & Chaining Bound',
      latex: 'alpha = n / m  |  E[Search Time] = Theta(1 + alpha)',
      explanation: 'Under simple uniform hashing, average search time scales linearly with load factor alpha = n / m.',
      category: 'Hashing',
      unit: 3
    },

    // ─── ENGINEERING MATHEMATICS ───
    {
      id: 'f-math-diff-rules',
      domain: 'MATHEMATICS',
      title: 'Differentiation — Product, Quotient & Chain Rules',
      latex: "(u v)' = u' v + u v'  |  (u / v)' = (u' v - u v') / v^2  |  dy/dx = (dy/du) * (du/dx)",
      explanation: 'Foundational operational rules for finding derivatives of algebraic, composite, and rational functions.',
      category: 'Differential Calculus',
      unit: 1
    },
    {
      id: 'f-math-partial-diff',
      domain: 'MATHEMATICS',
      title: 'Partial Differentiation & Clairaut\'s Theorem',
      latex: 'partial^2 f / (partial x partial y) = partial^2 f / (partial y partial x)  |  df = (partial f / partial x) dx + (partial f / partial y) dy',
      explanation: 'Symmetry of mixed second partial derivatives for continuous functions and definition of total differential.',
      category: 'Multivariable Calculus',
      unit: 2
    },
    {
      id: 'f-math-taylor',
      domain: 'MATHEMATICS',
      title: 'Taylor Series & Maclaurin Expansion',
      latex: 'f(x) = sum_{n=0}^oo [f^(n)(a) / n!] (x - a)^n = f(a) + f\'(a)(x - a) + [f\'\'(a)/2!](x - a)^2 + ...',
      explanation: 'Approximates any infinitely differentiable function as an infinite polynomial expansion evaluated around point a.',
      category: 'Differential Calculus',
      unit: 1
    },
    {
      id: 'f-math-extrema',
      domain: 'MATHEMATICS',
      title: 'Maxima & Minima (Hessian Matrix Test)',
      latex: 'D = f_xx f_yy - (f_xy)^2  |  D > 0 and f_xx > 0 => Local Min  |  D < 0 => Saddle Point',
      explanation: 'Second-order partial derivative discriminant for classifying stationary points and relative extrema.',
      category: 'Optimization & Extrema',
      unit: 2
    },
    {
      id: 'f-math-jacobian',
      domain: 'MATHEMATICS',
      title: 'Multiple Integrals & Jacobian Coordinate Transform',
      latex: 'iint_D f(x,y) dx dy = iint_G f(u,v) |J| du dv  |  J = det[[partial x/partial u, partial x/partial v], [partial y/partial u, partial y/partial v]]',
      explanation: 'Coordinate substitution formula for double and triple integrals in polar, cylindrical, and spherical systems.',
      category: 'Integral Calculus',
      unit: 3
    },
    {
      id: 'f-math-ode-linear',
      domain: 'MATHEMATICS',
      title: 'First-Order Linear Differential Equations & Integrating Factor',
      latex: 'dy/dx + P(x) y = Q(x)  |  I(x) = e^(int P(x) dx)  |  y * I(x) = int Q(x) I(x) dx + C',
      explanation: 'General integrating factor method for solving first-order non-homogeneous linear differential equations.',
      category: 'Differential Equations',
      unit: 3
    },
    {
      id: 'f-math-ode-second',
      domain: 'MATHEMATICS',
      title: 'Second-Order Linear Homogeneous ODE',
      latex: 'a (d^2y/dx^2) + b (dy/dx) + c y = 0  |  a r^2 + b r + c = 0  |  y = c_1 e^(r_1 x) + c_2 e^(r_2 x)',
      explanation: 'Characteristic quadratic roots determine whether harmonic response is overdamped, critically damped, or underdamped.',
      category: 'Differential Equations',
      unit: 4
    },
    {
      id: 'f-math-laplace',
      domain: 'MATHEMATICS',
      title: 'Laplace Transform & Derivative Invariance',
      latex: 'L{f(t)} = int_0^oo e^(-st) f(t) dt  |  L{y\'} = s Y(s) - y(0)  |  L{y\'\'} = s^2 Y(s) - s y(0) - y\'(0)',
      explanation: 'Converts linear differential equations with initial conditions into algebraic equations in complex frequency space s.',
      category: 'Integral Transforms',
      unit: 4
    },
    {
      id: 'f-math-fourier',
      domain: 'MATHEMATICS',
      title: 'Fourier Series Expansion',
      latex: 'f(x) = a_0 / 2 + sum_{n=1}^oo [a_n cos(n pi x / L) + b_n sin(n pi x / L)]',
      explanation: 'Orthogonal spectral decomposition of periodic functions into harmonic fundamental and overtone components.',
      category: 'Fourier Analysis',
      unit: 5
    },
    {
      id: 'f-math-ftc',
      domain: 'MATHEMATICS',
      title: 'Fundamental Theorem of Calculus',
      latex: 'int_a^b f(x) dx = F(b) - F(a)  |  d/dx [int_a^x f(t) dt] = f(x)',
      explanation: 'Relates differentiation and integration. Enables exact calculation of definite integrals via anti-derivatives.',
      category: 'Calculus',
      unit: 2
    },
    {
      id: 'f-math-cayley',
      domain: 'MATHEMATICS',
      title: 'Cayley-Hamilton Theorem & Matrix Inverse',
      latex: 'p(A) = A^n + c_{n-1} A^(n-1) + ... + c_0 I = 0  |  A^(-1) = -(1/c_0) [A^(n-1) + ... + c_1 I]',
      explanation: 'Every square matrix satisfies its own characteristic polynomial equation. Provides closed-form matrix inverse.',
      category: 'Linear Algebra',
      unit: 1
    },
    {
      id: 'f-math-green',
      domain: 'MATHEMATICS',
      title: 'Green\'s Theorem in the Plane',
      latex: 'oint_C (L dx + M dy) = iint_D (partial M/partial x - partial L/partial y) dx dy',
      explanation: 'Relates circulation along a positively oriented simple closed curve C to the double curl integral over enclosed region D.',
      category: 'Vector Calculus',
      unit: 3
    },
    {
      id: 'f-math-stokes',
      domain: 'MATHEMATICS',
      title: 'Stokes\' Circulation Theorem',
      latex: 'oint_{partial S} F . dr = iint_S (curl F) . dS',
      explanation: 'Equates line integral of vector field F along boundary curve of surface S to flux of curl(F) across oriented surface S.',
      category: 'Vector Calculus',
      unit: 4
    },
    {
      id: 'f-math-euler',
      domain: 'MATHEMATICS',
      title: 'Euler\'s Formula & Identity',
      latex: 'e^(i theta) = cos(theta) + i sin(theta)  |  e^(i pi) + 1 = 0',
      explanation: 'Bridge connecting exponential analysis and trigonometry in the complex coordinate plane.',
      category: 'Complex Analysis',
      unit: 3
    },

    // ─── ENGINEERING PHYSICS ───
    {
      id: 'f-phy-snell',
      domain: 'PHYSICS',
      title: 'Snell\'s Law of Optical Refraction',
      latex: 'n_1 sin(theta_1) = n_2 sin(theta_2)  |  theta_c = arcsin(n_2 / n_1)',
      explanation: 'Governs angle of refraction across optical boundaries. Total internal reflection occurs when angle of incidence exceeds critical angle theta_c.',
      category: 'Optics & Wave Motion',
      unit: 2
    },
    {
      id: 'f-phy-wave',
      domain: 'PHYSICS',
      title: 'Classical Wave Partial Differential Equation',
      latex: 'partial^2 psi / partial x^2 = (1 / v^2) * (partial^2 psi / partial t^2)',
      explanation: 'Fundamental equation for nondispersive harmonic wave propagation with phase velocity v = lambda * f = omega / k.',
      category: 'Wave Mechanics',
      unit: 3
    },
    {
      id: 'f-phy-broglie',
      domain: 'PHYSICS',
      title: 'De Broglie Matter Wavelength',
      latex: 'lambda = h / p = h / (m * v)',
      explanation: 'Assigns wave nature to particles with momentum p. Essential for electron microscopy and quantum quantum-well confinements.',
      category: 'Quantum Physics',
      unit: 5
    },
    {
      id: 'f-phy-photoelectric',
      domain: 'PHYSICS',
      title: 'Einstein\'s Photoelectric Effect Equation',
      latex: 'E_max = h nu - Phi = q * V_s',
      explanation: 'Describes maximum kinetic energy of emitted photoelectrons with material work function Phi and stopping potential Vs.',
      category: 'Quantum Physics',
      unit: 4
    },
    {
      id: 'f-phy-maxwell',
      domain: 'PHYSICS',
      title: 'Maxwell-Ampère Circuital Law',
      latex: 'oint B . dl = mu_0 I + mu_0 epsilon_0 (d Phi_E / dt)',
      explanation: 'Relates magnetic field circulation to conduction current and displacement current created by changing electric flux.',
      category: 'Electrodynamics',
      unit: 4
    },

    // ─── CIVIL ENGINEERING / ENGINEERING MECHANICS ───
    {
      id: 'f-civ-equilibrium',
      domain: 'CIVIL',
      title: 'Static Equilibrium Equations (2D Rigid Body)',
      latex: 'sum F_x = 0  |  sum F_y = 0  |  sum M_O = 0',
      explanation: 'Primary equilibrium requirements: net horizontal force, vertical force, and moment about any reference origin must equal zero.',
      category: 'Statics & Mechanics',
      unit: 1
    },
    {
      id: 'f-civ-bending',
      domain: 'CIVIL',
      title: 'Bending Stress Flexure Formula',
      latex: 'sigma = (M * y) / I  |  S = I / y_max',
      explanation: 'Calculates internal flexural normal stress sigma in a beam cross-section under applied bending moment M and section modulus S.',
      category: 'Mechanics of Solids',
      unit: 2
    },
    {
      id: 'f-civ-hooke',
      domain: 'CIVIL',
      title: 'Hooke\'s Law & Young\'s Modulus of Elasticity',
      latex: 'E = sigma / epsilon = (F * L_0) / (A * delta_L)',
      explanation: 'Linear elastic relationship between stress sigma and axial strain epsilon within the proportional limit of structural materials.',
      category: 'Material Mechanics',
      unit: 1
    },
    {
      id: 'f-civ-torsion',
      domain: 'CIVIL',
      title: 'Torsion Formula for Circular Shafts',
      latex: 'tau / r = T / J = (G * theta) / L',
      explanation: 'Relates applied torque T to polar moment of inertia J, torsional shear stress tau, and shear modulus G.',
      category: 'Torsion & Shear',
      unit: 3
    },
    {
      id: 'f-civ-reynolds',
      domain: 'CIVIL',
      title: 'Reynolds Number (Fluid Mechanics)',
      latex: 'Re = (rho * v * D) / mu = (v * D) / nu',
      explanation: 'Dimensionless ratio of inertial to viscous forces distinguishing laminar (Re < 2000) and turbulent (Re > 4000) pipe flow.',
      category: 'Hydraulics',
      unit: 4
    },
    {
      id: 'f-civ-darcy',
      domain: 'CIVIL',
      title: 'Darcy-Weisbach Friction Head Loss',
      latex: 'h_f = f * (L / D) * (v^2 / (2 * g))',
      explanation: 'Calculates frictional head loss along pipe length L with internal diameter D, flow velocity v, and Darcy friction factor f.',
      category: 'Pipe Hydraulics',
      unit: 4
    }
  ];

  function stampFormulaToCanvas(formula) {
    try {
      const c = document.createElement('canvas');
      c.width = 680;
      c.height = 230;
      const ctx = c.getContext('2d');

      // Card Container
      ctx.fillStyle = '#090d16';
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(0, 0, 680, 230, 16);
        ctx.fill();
      } else {
        ctx.fillRect(0, 0, 680, 230);
      }

      ctx.strokeStyle = '#246B45';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Accent pill
      ctx.fillStyle = '#1b4d32';
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(24, 20, 170, 28, 6);
        ctx.fill();
      } else {
        ctx.fillRect(24, 20, 170, 28);
      }
      ctx.fillStyle = '#4CAF70';
      ctx.font = 'bold 12px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('📐 FORMULA CARD', 34, 39);

      // Title
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 18px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(formula.title, 24, 78);

      // Mathematical Formulation
      ctx.fillStyle = '#fef08a';
      ctx.font = 'bold 22px "Consolas", "Courier New", monospace';
      ctx.fillText(formula.latex || formula.renderedText, 24, 124);

      // Explanation
      ctx.fillStyle = '#cbd5e1';
      ctx.font = '13.5px "Plus Jakarta Sans", sans-serif';
      const words = (formula.explanation || '').split(' ');
      let line = '';
      let y = 162;
      for (let i = 0; i < words.length; i++) {
        const testLine = line + words[i] + ' ';
        const metrics = ctx.measureText(testLine);
        if (metrics.width > 630 && i > 0) {
          ctx.fillText(line, 24, y);
          line = words[i] + ' ';
          y += 20;
          if (y > 200) break;
        } else {
          line = testLine;
        }
      }
      if (y <= 200) ctx.fillText(line, 24, y);

      // Footer
      ctx.fillStyle = '#64748b';
      ctx.font = '11px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('KPRIET EduVerse • ' + (session.subjectName || 'Engineering') + ' • Unit ' + (formula.unit || 1) + ' Reference', 24, 212);

      const dataUrl = c.toDataURL('image/png');
      if (window.Canvas && typeof window.Canvas.addImageShape === 'function') {
        window.Canvas.addImageShape(dataUrl, 140, 90, 560, 190, formula.title);
        if (window.App && typeof window.App.showToast === 'function') {
          window.App.showToast('📐 Formula stamped to board! Ready for stylus pen notes.', 'success');
        }
        if (window.App && typeof window.App.setTool === 'function') {
          window.App.setTool('pen');
        }
      }
    } catch(err) {
      console.warn('Could not stamp formula:', err);
    }
  }

  function openSubjectFormulasDrawer() {
    const existing = document.getElementById('rbac-formula-drawer-overlay');
    if (existing) existing.remove();

    const domain = resolveSubjectDomain(session);
    const subName = session.subjectName || 'Subject';
    const deptName = session.departmentName || 'Department';

    // Prioritize teacher formulas from backend session if present
    let formulaList = [];
    if (session && Array.isArray(session.formulas) && session.formulas.length > 0) {
      formulaList = session.formulas;
    } else {
      formulaList = COMPREHENSIVE_FORMULAS.filter(f => f.domain === domain);
      if (formulaList.length === 0) {
        formulaList = COMPREHENSIVE_FORMULAS.slice(0, 6);
      }
    }

    const overlay = document.createElement('div');
    overlay.id = 'rbac-formula-drawer-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.7);backdrop-filter:blur(5px);z-index:99999;display:flex;align-items:center;justify-content:center;padding:24px;font-family:"Plus Jakarta Sans","Inter",sans-serif;';

    overlay.innerHTML = `
      <div style="background:#ffffff;border-radius:20px;max-width:860px;width:100%;max-height:86vh;display:flex;flex-direction:column;box-shadow:0 24px 60px rgba(0,0,0,0.4);border:1.5px solid #d5e2d9;overflow:hidden">
        <div style="padding:20px 28px;background:linear-gradient(135deg,#2e1065,#4c1d95);color:#ffffff;display:flex;align-items:center;justify-content:space-between;border-bottom:1.5px solid #6d28d9">
          <div style="display:flex;align-items:center;gap:14px">
            <div style="width:40px;height:40px;border-radius:10px;background:rgba(255,255,255,0.12);display:flex;align-items:center;justify-content:center;font-size:22px;border:1px solid rgba(255,255,255,0.25)">
              📐
            </div>
            <div>
              <h3 style="margin:0;font-size:18px;font-weight:800;color:#ffffff">Formulas, Theorems & Mathematical Context</h3>
              <div style="font-size:12px;color:#ddd6fe;font-weight:600">
                ${subName} • ${deptName}
              </div>
            </div>
          </div>
          <button id="rbac-formula-close-btn" style="background:rgba(255,255,255,0.15);border:none;color:#ffffff;width:32px;height:32px;border-radius:8px;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center">✕</button>
        </div>

        <div style="padding:14px 28px;background:#f8fafc;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;justify-content:space-between;gap:12px">
          <input type="text" id="rbac-formula-search" placeholder="Search formulas by name, symbol, theorem, or unit..." style="flex:1;padding:8px 14px;border:1.5px solid #cbd5e1;border-radius:8px;font-size:13px;font-family:inherit;outline:none">
          <span style="font-size:12px;color:#64748b;font-weight:600">${formulaList.length} Formulas Available</span>
        </div>

        <div style="padding:22px 28px;overflow-y:auto;flex:1;background:#f1f5f9;display:flex;flex-direction:column;gap:14px" id="rbac-formula-cards-container">
          <!-- Cards rendered below -->
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const container = overlay.querySelector('#rbac-formula-cards-container');
    const searchInput = overlay.querySelector('#rbac-formula-search');

    function renderFormulas(query = '') {
      const q = query.toLowerCase().trim();
      const filtered = formulaList.filter(f =>
        !q ||
        f.title.toLowerCase().includes(q) ||
        (f.latex && f.latex.toLowerCase().includes(q)) ||
        (f.explanation && f.explanation.toLowerCase().includes(q)) ||
        (f.category && f.category.toLowerCase().includes(q))
      );

      if (filtered.length === 0) {
        container.innerHTML = `
          <div style="text-align:center;padding:40px 20px;background:#ffffff;border-radius:12px;border:1px solid #e2e8f0;color:#64748b">
            <div style="font-size:32px;margin-bottom:8px">🔍</div>
            <p style="font-weight:700;margin:0 0 4px 0;color:#1e293b">No matching formulas found</p>
            <p style="font-size:12.5px;margin:0">Try searching for other terms like "Theorem", "Law", "Equation", or "Integral".</p>
          </div>
        `;
        return;
      }

      container.innerHTML = filtered.map((f, idx) => `
        <div style="background:#ffffff;border-radius:14px;padding:18px 20px;border:1.5px solid #e2e8f0;box-shadow:0 2px 8px rgba(0,0,0,0.04);display:flex;flex-direction:column;gap:10px" class="rbac-formula-item">
          <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px">
            <div>
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:3px">
                <span style="font-size:11px;font-weight:800;color:#6d28d9;background:#ede9fe;padding:1px 7px;border-radius:4px">Unit ${f.unit || 1}</span>
                <span style="font-size:11px;font-weight:700;color:#059669;background:#d1fae5;padding:1px 7px;border-radius:4px">${f.category || 'Reference'}</span>
              </div>
              <h4 style="margin:0;font-size:15px;font-weight:800;color:#0f172a">${f.title}</h4>
            </div>
            <button class="rbac-formula-stamp-btn" data-index="${idx}" style="padding:7px 16px;background:linear-gradient(135deg,#5b21b6,#7c3aed);color:#ffffff;border:none;border-radius:8px;font-weight:700;font-size:12px;cursor:pointer;display:inline-flex;align-items:center;gap:6px;box-shadow:0 2px 6px rgba(109,40,217,0.25);flex-shrink:0">
              📌 Stamp to Board
            </button>
          </div>

          <div style="background:#0f172a;color:#fef08a;padding:12px 16px;border-radius:8px;font-family:'Consolas','Courier New',monospace;font-size:15px;font-weight:bold;letter-spacing:0.02em;border-left:4px solid #a78bfa">
            ${f.latex || f.renderedText}
          </div>

          <p style="margin:0;font-size:12.5px;color:#475569;line-height:1.5">
            ${f.explanation}
          </p>
        </div>
      `).join('');

      container.querySelectorAll('.rbac-formula-stamp-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = parseInt(btn.getAttribute('data-index'), 10);
          const formula = filtered[idx];
          overlay.remove();
          stampFormulaToCanvas(formula);
        });
      });
    }

    renderFormulas();

    searchInput.addEventListener('input', (e) => {
      renderFormulas(e.target.value);
    });

    overlay.querySelector('#rbac-formula-close-btn').addEventListener('click', () => {
      overlay.remove();
    });
  }

  /* ══════════════════════════════════════════════════════════
     8. DIRECT "SHARE NOTES" WORKFLOW FROM SMART BOARD
     Allows teacher to finish teaching and share:
      - Current board pages (PDF snapshot)
      - Existing subject documents / PPTs
      - Newly uploaded material
     Targeting enrolled students in that exact subject.
     ══════════════════════════════════════════════════════════ */
  function openShareNotesDialog() {
    let pageCount = 1;
    if (typeof window.App !== 'undefined' && typeof window.App.getPages === 'function') {
      const p = window.App.getPages();
      if (Array.isArray(p) && p.length) pageCount = p.length;
    } else if (typeof window.App !== 'undefined' && typeof window.App.getPageCount === 'function') {
      pageCount = window.App.getPageCount() || 1;
    }

    const subName = session.subjectName || 'Academic Subject';
    const subCode = session.subjectCode || '';
    const deptName = session.departmentName || 'Engineering Department';
    const semNum = session.semesterNumber || 1;
    const teacherName = session.teacherName || session.name || 'Faculty Member';
    const defaultTitle = `${subName} — Lecture Notes (${new Date().toLocaleDateString()})`;

    // Collect available existing subject materials
    const existingMaterials = [];
    if (Array.isArray(session.notes)) {
      session.notes.forEach(n => existingMaterials.push({ id: n.id, title: n.title, type: 'note', fileUrl: n.fileUrl }));
    }
    if (Array.isArray(session.presentations)) {
      session.presentations.forEach(p => existingMaterials.push({ id: p.id, title: p.title, type: 'ppt', fileUrl: p.fileUrl }));
    }

    const overlay = document.createElement('div');
    overlay.id = 'rbac-sn-modal-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.7);backdrop-filter:blur(5px);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;font-family:"Plus Jakarta Sans","Inter",sans-serif;';

    overlay.innerHTML = `
      <div style="background:#ffffff;border-radius:20px;max-width:620px;width:100%;max-height:90vh;overflow-y:auto;box-shadow:0 24px 60px rgba(0,0,0,0.4);border:1.5px solid #d5e2d9;padding:28px" id="rbac-sn-dialog-content">
        <!-- Dialog Header -->
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;border-bottom:1px solid #e2e8f0;pb:14px">
          <div style="display:flex;align-items:center;gap:12px">
            <div style="width:42px;height:42px;border-radius:10px;background:#e8f5e9;border:1.5px solid #81c784;display:flex;align-items:center;justify-content:center;font-size:22px">
              📄
            </div>
            <div>
              <h3 style="font-size:19px;font-weight:800;color:#1b4d32;margin:0 0 2px 0">Share Notes & Materials</h3>
              <p style="font-size:12px;color:#64748b;margin:0">Distribute verified lecture notes to students enrolled in this course.</p>
            </div>
          </div>
          <button id="rbac-sn-close" style="border:none;background:none;font-size:20px;cursor:pointer;color:#64748b">✕</button>
        </div>

        <!-- Inherited Context Card (Section 1 & 2) -->
        <div style="background:#f0fdf4;border:1.5px solid #bbf7d0;border-radius:12px;padding:14px;margin-bottom:18px;display:grid;grid-template-columns:repeat(2,1fr);gap:10px;font-size:12.5px">
          <div>
            <span style="color:#166534;font-weight:700">Subject:</span>
            <div style="font-weight:800;color:#14532d">${subName} ${subCode ? `(${subCode})` : ''}</div>
          </div>
          <div>
            <span style="color:#166534;font-weight:700">Department:</span>
            <div style="font-weight:800;color:#14532d">${deptName}</div>
          </div>
          <div>
            <span style="color:#166534;font-weight:700">Semester:</span>
            <div style="font-weight:800;color:#14532d">Semester ${semNum}</div>
          </div>
          <div>
            <span style="color:#166534;font-weight:700">Faculty:</span>
            <div style="font-weight:800;color:#14532d">${teacherName}</div>
          </div>
        </div>

        <!-- Material Selection Options (Section 8) -->
        <div style="margin-bottom:18px">
          <label style="display:block;font-size:12px;font-weight:800;color:#246B45;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:8px">
            1. Select Material Source
          </label>
          <div style="display:flex;flex-direction:column;gap:8px">
            <label style="display:flex;align-items:flex-start;gap:10px;padding:10px 12px;border:1.5px solid #246B45;background:#f4fbf5;border-radius:10px;cursor:pointer">
              <input type="radio" name="sn-source" value="board" checked style="accent-color:#246B45;margin-top:3px">
              <div>
                <strong style="color:#1b4d32;font-size:13.5px">Export Current Smart Board Lesson (${pageCount} Pages)</strong>
                <p style="margin:2px 0 0 0;font-size:12px;color:#475569">Automatically captures and compiles whiteboard drawings, diagrams, and derivations into a high-res PDF.</p>
              </div>
            </label>

            ${existingMaterials.length > 0 ? `
              <label style="display:flex;align-items:flex-start;gap:10px;padding:10px 12px;border:1.5px solid #cbd5e1;background:#ffffff;border-radius:10px;cursor:pointer">
                <input type="radio" name="sn-source" value="existing" style="accent-color:#246B45;margin-top:3px">
                <div style="flex:1">
                  <strong style="color:#1e293b;font-size:13.5px">Select from Existing Subject Materials (${existingMaterials.length} items)</strong>
                  <select id="sn-existing-select" style="width:100%;margin-top:6px;padding:6px 10px;border:1px solid #cbd5e1;border-radius:6px;font-size:12px;outline:none" disabled>
                    ${existingMaterials.map(m => `<option value="${m.id}">${m.title} (${m.type.toUpperCase()})</option>`).join('')}
                  </select>
                </div>
              </label>
            ` : ''}

            <label style="display:flex;align-items:flex-start;gap:10px;padding:10px 12px;border:1.5px solid #cbd5e1;background:#ffffff;border-radius:10px;cursor:pointer">
              <input type="radio" name="sn-source" value="upload" style="accent-color:#246B45;margin-top:3px">
              <div style="flex:1">
                <strong style="color:#1e293b;font-size:13.5px">Upload New File or Document (PDF, PPTX, Images)</strong>
                <input type="file" id="sn-file-upload" accept=".pdf,.pptx,.ppt,.docx,.png,.jpg,.jpeg" style="width:100%;margin-top:6px;font-size:12px" disabled>
              </div>
            </label>
          </div>
        </div>

        <!-- Share Target Audience (Section 9) -->
        <div style="margin-bottom:18px">
          <label style="display:block;font-size:12px;font-weight:800;color:#246B45;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:8px">
            2. Share With Audience
          </label>
          <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px">
            <label style="display:flex;align-items:center;gap:8px;padding:10px 12px;border:1px solid #cbd5e1;border-radius:8px;cursor:pointer;font-size:12.5px;font-weight:600;background:#ffffff">
              <input type="radio" name="sn-target" value="ALL_ENROLLED" checked style="accent-color:#246B45">
              <span>All Enrolled Students (${subName})</span>
            </label>
            <label style="display:flex;align-items:center;gap:8px;padding:10px 12px;border:1px solid #cbd5e1;border-radius:8px;cursor:pointer;font-size:12.5px;font-weight:600;background:#ffffff">
              <input type="radio" name="sn-target" value="SECTION" style="accent-color:#246B45">
              <span>Current Section (${session.section || 'Section A'})</span>
            </label>
          </div>
        </div>

        <!-- Title & Notes Details -->
        <div style="margin-bottom:14px">
          <label style="display:block;font-size:12px;font-weight:700;color:#334155;margin-bottom:4px">Notes Title</label>
          <input type="text" id="sn-title-input" value="${defaultTitle}" style="width:100%;padding:9px 12px;border:1.5px solid #cbd5e1;border-radius:8px;font-size:13px;font-family:inherit;box-sizing:border-box">
        </div>

        <div style="margin-bottom:20px">
          <label style="display:block;font-size:12px;font-weight:700;color:#334155;margin-bottom:4px">Faculty Remarks & Instructions</label>
          <textarea id="sn-desc-input" rows="2" style="width:100%;padding:9px 12px;border:1.5px solid #cbd5e1;border-radius:8px;font-size:12.5px;font-family:inherit;box-sizing:border-box">Today's verified classroom lecture notes and derivations captured from the Smart Board.</textarea>
        </div>

        <!-- Action Buttons -->
        <div style="display:flex;align-items:center;justify-content:flex-end;gap:10px">
          <button id="rbac-sn-cancel-btn" style="padding:10px 18px;border:1px solid #cbd5e1;background:#ffffff;color:#475569;border-radius:8px;font-weight:600;font-size:13px;cursor:pointer">
            Cancel
          </button>
          <button id="rbac-sn-draft-btn" style="padding:10px 18px;border:1.5px solid #246B45;background:#ffffff;color:#246B45;border-radius:8px;font-weight:700;font-size:13px;cursor:pointer">
            💾 Save as Draft
          </button>
          <button id="rbac-sn-submit-btn" style="padding:10px 22px;border:none;background:linear-gradient(135deg,#16a34a,#22c55e);color:#ffffff;border-radius:8px;font-weight:800;font-size:13.5px;cursor:pointer;box-shadow:0 4px 14px rgba(22,163,74,0.35);display:inline-flex;align-items:center;gap:6px">
            Share with Students 🚀
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelector('#rbac-sn-close').addEventListener('click', () => overlay.remove());
    overlay.querySelector('#rbac-sn-cancel-btn').addEventListener('click', () => overlay.remove());

    // Toggle source inputs
    const sourceRadios = overlay.querySelectorAll('input[name="sn-source"]');
    const existingSelect = overlay.querySelector('#sn-existing-select');
    const fileUpload = overlay.querySelector('#sn-file-upload');

    sourceRadios.forEach(radio => {
      radio.addEventListener('change', () => {
        if (existingSelect) existingSelect.disabled = radio.value !== 'existing';
        if (fileUpload) fileUpload.disabled = radio.value !== 'upload';
      });
    });

    async function handleShare(status) {
      const title = overlay.querySelector('#sn-title-input').value.trim() || defaultTitle;
      const desc = overlay.querySelector('#sn-desc-input').value.trim();
      const selectedSource = overlay.querySelector('input[name="sn-source"]:checked').value;
      const selectedTarget = overlay.querySelector('input[name="sn-target"]:checked').value;

      let snapshotUrl = null;
      let fileName = `${title.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;

      if (selectedSource === 'board') {
        if (typeof window.Canvas !== 'undefined' && typeof window.Canvas.snapshotJpeg === 'function') {
          try { snapshotUrl = window.Canvas.snapshotJpeg(); } catch (e) {}
        } else if (typeof window.Canvas !== 'undefined' && typeof window.Canvas.snapshot === 'function') {
          try { snapshotUrl = window.Canvas.snapshot(); } catch (e) {}
        }
      } else if (selectedSource === 'upload' && fileUpload && fileUpload.files[0]) {
        const file = fileUpload.files[0];
        fileName = file.name;
        snapshotUrl = await new Promise(res => {
          const reader = new FileReader();
          reader.onload = () => res(reader.result);
          reader.onerror = () => res(null);
          reader.readAsDataURL(file);
        });
      }

      // Show progress
      const content = overlay.querySelector('#rbac-sn-dialog-content');
      content.innerHTML = `
        <div style="text-align:center;padding:36px 20px">
          <div style="width:48px;height:48px;border:4px solid #E8F5E9;border-top-color:#22c55e;border-radius:50%;animation:rbac-spin 0.8s linear infinite;margin:0 auto 16px"></div>
          <h3 style="font-size:18px;font-weight:800;color:#1e293b;margin:0 0 8px 0">Publishing Notes to Enrolled Students…</h3>
          <p style="font-size:13px;color:#64748b;margin:0">
            Routing to students enrolled in <strong>${subName}</strong> on their Student Dashboard.
          </p>
        </div>
      `;

      // Dispatch to Backend REST API
      try {
        const token = session.token || localStorage.getItem('eduverse_token') || sessionStorage.getItem('token');
        const headers = { 'Content-Type': 'application/json' };
        // Only real JWTs go in the header; the Smart Board session id is not a credential
      // (the signed-in dashboard's httpOnly cookie authenticates same-origin requests).
      if (token && /^[\w-]+\.[\w-]+\.[\w-]+$/.test(String(token))) headers['Authorization'] = `Bearer ${token}`;

        const payload = {
          subjectId: session.subjectId,
          title,
          description: desc,
          chapterOrUnit: 1,
          materialType: selectedSource === 'board' ? 'board_capture' : 'pdf',
          pdfBase64: snapshotUrl || undefined,
          fileName,
          shareTarget: selectedTarget,
          targetSection: session.section || 'All Sections',
          status: status === 'DRAFT' ? 'DRAFT' : 'PUBLISHED'
        };

        const res = await apiFetch('/academic/smartboard/share-notes', {
          method: 'POST',
          headers,
          credentials: 'include',
          body: JSON.stringify(payload)
        });

        if (!res.ok) {
          console.warn('[RBAC Bridge] Share notes was not accepted by the server (HTTP ' + res.status + ').');
        }
      } catch (apiErr) {
        console.warn('[RBAC Bridge] Share notes API sync note:', apiErr.message);
      }

      // Local storage persistence for offline & fast pickup
      try {
        const raw = localStorage.getItem('eduverse_rbac_notes');
        const notesList = raw ? JSON.parse(raw) : [];
        notesList.unshift({
          id: `note-${Date.now()}`,
          title,
          description: desc,
          subjectId: session.subjectId,
          subjectName: subName,
          subjectCode: subCode,
          departmentName: deptName,
          teacherName,
          pagesCount: pageCount,
          fileName,
          status: status === 'DRAFT' ? 'draft' : 'published',
          date: new Date().toLocaleDateString(),
          timestamp: Date.now()
        });
        localStorage.setItem('eduverse_rbac_notes', JSON.stringify(notesList));
      } catch (e) {}

      // Confirmation Modal
      content.innerHTML = `
        <div style="text-align:center;padding:24px 12px">
          <div style="width:58px;height:58px;border-radius:50%;background:#e8f5e9;color:#16a34a;display:flex;align-items:center;justify-content:center;font-size:30px;margin:0 auto 16px;border:2px solid #86efac">
            ${status === 'DRAFT' ? '💾' : '✓'}
          </div>
          <h3 style="font-size:20px;font-weight:800;color:#1b4d32;margin:0 0 6px 0">
            ${status === 'DRAFT' ? 'Notes Saved as Draft!' : 'Notes Published to Students!'}
          </h3>
          <p style="font-size:14px;font-weight:700;color:#246B45;margin:0 0 10px 0">${title}</p>
          <p style="font-size:13px;color:#64748b;margin:0 0 24px 0;line-height:1.5">
            ${status === 'DRAFT'
              ? `Saved to your Teacher Dashboard workspace for <strong>${subName}</strong>. You can review, edit, or publish whenever you are ready.`
              : `Material has been added to the <strong>Student Dashboard</strong> of students enrolled in <strong>${subName}</strong> (${deptName}). Unrelated subjects will not see this material.`
            }
          </p>

          <div style="display:flex;gap:10px;justify-content:center">
            <button id="rbac-sn-back-dash" style="padding:10px 20px;background:linear-gradient(135deg,#16a34a,#22c55e);color:#ffffff;border:none;border-radius:8px;font-weight:700;font-size:13px;cursor:pointer">
              View in Dashboard →
            </button>
            <button id="rbac-sn-continue-teach" style="padding:10px 18px;border:1px solid #cbd5e1;background:#ffffff;color:#475569;border-radius:8px;font-weight:600;font-size:13px;cursor:pointer">
              Continue Teaching
            </button>
          </div>
        </div>
      `;

      content.querySelector('#rbac-sn-continue-teach').addEventListener('click', () => {
        overlay.remove();
        if (window.App && typeof window.App.showToast === 'function') {
          window.App.showToast('✓ Notes published to enrolled students', 'success');
        }
      });

      content.querySelector('#rbac-sn-back-dash').addEventListener('click', () => {
        const url = (session && session.returnUrl) ? session.returnUrl : DASHBOARD_URL;
        window.location.href = url;
      });
    }

    overlay.querySelector('#rbac-sn-draft-btn').addEventListener('click', () => handleShare('DRAFT'));
    overlay.querySelector('#rbac-sn-submit-btn').addEventListener('click', () => handleShare('PUBLISHED'));
  }

  /* ══════════════════════════════════════════════════════════
     9. IN-CANVAS INTERACTIVE SIMULATION WIDGET
     Supports DSA, Math, Physics, and Civil interactive animations.
     ══════════════════════════════════════════════════════════ */
  function launchSmartBoardSimWidget(simKey, title, simulationContext = {}) {
    const existing = document.getElementById('rbac-smartboard-sim-widget');
    if (existing) {
      if (existing.__dsaMessageHandler) window.removeEventListener('message', existing.__dsaMessageHandler);
      existing.remove();
    }

    const isCnLab = simKey === 'cn-lab';
    const isDsaLab = simKey === 'cs-dsa-lab';
    const isOsLab = !isCnLab && (simKey === 'cs-os-lab' || simKey.startsWith('os-') || (session && (session.subjectCode === 'U21CS403' || String(session.subjectName || '').toLowerCase().includes('operating system'))));
    const isCLab = !isCnLab && !isOsLab && (simKey === 'c-lab' || simKey.startsWith('c-') || (session && (session.subjectCode === 'U21CS101' || session.subjectCode === 'U21CSG01' || String(session.subjectName || '').toLowerCase().includes('c programming') || String(session.subjectName || '').toLowerCase().includes('problem solving'))));
    const isIframeLab = isDsaLab || isOsLab || isCnLab || isCLab;
    const widget = document.createElement('div');
    widget.id = 'rbac-smartboard-sim-widget';
    const boardTop = isIframeLab ? Math.max(56, Math.round((document.getElementById('app-main') || document.body).getBoundingClientRect().top) + 8) : 0;
    widget.style.cssText = `position:fixed;${isIframeLab ? `top:${boardTop}px;left:16px;` : 'bottom:24px;right:24px;'}width:${isIframeLab ? 'calc(100vw - 32px)' : '640px'};height:${isIframeLab ? `calc(100vh - ${boardTop + 44}px)` : 'auto'};max-width:calc(100vw - 32px);max-height:calc(100vh - 32px);background:#0b1320;color:#f8fafc;border-radius:16px;box-shadow:0 24px 60px rgba(0,0,0,0.6);border:1.5px solid ${isCLab || isOsLab ? '#0284c7' : '#246B45'};z-index:9000;overflow:hidden;display:flex;flex-direction:column;font-family:"Plus Jakarta Sans","Inter",sans-serif;user-select:none;`;

    let labFrameUrl = '';
    if (isCnLab) {
      const cnCtx = simulationContext || {};
      const cnQuery = new URLSearchParams({
        embedded: '1', lock: '1', sim: String(cnCtx.simId || ''),
        subjectId: String(session.subjectId || ''), subjectName: String(session.subjectName || ''), subjectCode: String(session.subjectCode || ''),
        departmentId: String(session.departmentId || ''), departmentName: String(session.departmentName || session.programmeName || ''),
        semesterId: String(session.semesterId || ''), semesterNumber: String(session.semesterNumber || ''), role: String(session.role || 'teacher'),
        config: JSON.stringify(cnCtx.config || {}), state: JSON.stringify(cnCtx.state || {}),
      });
      const cnUrl = new URL('cn-simulation.html', window.location.href);
      cnUrl.search = cnQuery.toString();
      labFrameUrl = cnUrl.toString();
    } else if (isIframeLab) {
      const initialResource = session.initialResource || {};
      const inherited = simulationContext && Object.keys(simulationContext).length
        ? simulationContext
        : initialResource.simulationContext || session.simulationContext || {};
      const config = { ...(initialResource.config || {}), ...(inherited.config || {}) };
      const state = inherited.state && typeof inherited.state === 'object' ? inherited.state : {};
      const frameQuery = new URLSearchParams({
        embedded: '1',
        subjectId: String(session.subjectId || ''),
        subjectName: String(session.subjectName || (isCLab ? 'Problem Solving and C Programming' : isOsLab ? 'Operating Systems' : '')),
        subjectCode: String(session.subjectCode || (isCLab ? 'U21CS101' : isOsLab ? 'U21CS403' : '')),
        departmentId: String(session.departmentId || ''),
        departmentName: String(session.departmentName || session.programmeName || ''),
        semesterId: String(session.semesterId || ''),
        semesterNumber: String(session.semesterNumber || (isCLab ? '1' : isOsLab ? '4' : '')),
        role: String(session.role || 'teacher'),
        title: String(title || (isCLab ? 'C Programming Simulation Lab' : isOsLab ? 'Operating Systems Lab' : 'Data Structures & Algorithms')),
        simulationId: String(inherited.simulationId || initialResource.simulationId || simKey || ''),
        category: String(inherited.category || state.category || config.category || (isCLab ? 'unit1' : isOsLab ? 'unit2' : 'searching')),
        topic: String(inherited.topic || state.topic || config.topic || (isCLab ? 'C Program Execution' : isOsLab ? 'CPU Scheduling' : 'Searching')),
        lock: '1',
        config: JSON.stringify(config),
        state: JSON.stringify(state),
      });
      const frameUrl = new URL(isCLab ? 'c-simulation.html' : isOsLab ? 'os-simulation.html' : 'dsa-simulation.html', window.location.href);
      frameUrl.search = frameQuery.toString();
      labFrameUrl = frameUrl.toString();
    }

    widget.innerHTML = `
      <div id="rbac-sim-w-header" style="background:linear-gradient(135deg,#0a1d12,${isCLab ? '#0284c7' : isOsLab ? '#0369a1' : '#1b4d32'});padding:10px 16px;display:flex;align-items:center;justify-content:space-between;cursor:move;border-bottom:1px solid ${isCLab || isOsLab ? '#0284c7' : '#246B45'}">
        <div style="display:flex;align-items:center;gap:10px">
          <span style="font-size:16px">${isCLab ? '⚡' : isOsLab ? '💻' : '🔬'}</span>
          <div>
            <h4 style="margin:0;font-size:13.5px;font-weight:800;color:#ffffff">${escapeHtml(title || (isCLab ? 'C Programming Simulation Lab' : isOsLab ? 'Operating Systems Simulation Lab' : 'Interactive Academic Simulation'))}</h4>
            <span style="font-size:10px;color:${isCLab || isOsLab ? '#bae6fd' : '#a7f3d0'};font-weight:600">${isCnLab ? escapeHtml(`${session.subjectCode || 'U21CSG05'} · Unit ${simulationContext.unit || ''} · ${simulationContext.topic || ''}`) : isCLab ? escapeHtml(`${session.subjectCode || 'U21CS101'} · Problem Solving & C Programming`) : 'Smart Board Live Widget • Stylus Ready'}</span>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:6px">
          <button id="rbac-sim-w-stamp" title="Stamp the current simulation view onto the Smart Board" style="background:${isCLab || isOsLab ? '#0284c7' : '#246B45'};border:1px solid ${isCLab || isOsLab ? '#38bdf8' : '#4CAF70'};color:#ffffff;border-radius:6px;padding:4px 10px;font-size:11px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:4px">
            📌 Stamp to Board
          </button>
          <button id="rbac-sim-w-min" title="Minimize/Maximize widget" style="background:rgba(255,255,255,0.12);border:none;color:#ffffff;border-radius:6px;width:24px;height:24px;font-size:12px;font-weight:700;cursor:pointer">─</button>
          <button id="rbac-sim-w-close" title="Close simulation" style="background:rgba(255,255,255,0.12);border:none;color:#ffffff;border-radius:6px;width:24px;height:24px;font-size:12px;font-weight:700;cursor:pointer">✕</button>
        </div>
      </div>

      <div id="rbac-sim-w-body" style="${isIframeLab ? 'padding:0;display:flex;flex:1;min-height:0;' : 'padding:14px;display:flex;flex-direction:column;gap:10px;'}">
        ${isIframeLab
          ? `<iframe id="rbac-sim-w-dsa-frame" title="${isCnLab ? 'Computer Networks interactive simulation' : isOsLab ? 'Operating Systems interactive simulation' : 'Data Structures & Algorithms interactive simulation'}" src="${escapeHtml(labFrameUrl)}" allow="fullscreen" style="display:block;width:100%;height:100%;min-height:0;border:0;background:${isOsLab ? '#f8fafc' : '#f4f7f3'}"></iframe><canvas id="rbac-sim-w-canvas" width="960" height="520" aria-hidden="true" style="display:none"></canvas>`
          : `<div style="background:#020617;border-radius:10px;border:1px solid #1e293b;position:relative;overflow:hidden;height:240px;display:flex;align-items:center;justify-content:center"><canvas id="rbac-sim-w-canvas" width="612" height="240" style="width:100%;height:100%;display:block"></canvas></div><div id="rbac-sim-w-controls" style="background:rgba(255,255,255,0.04);border-radius:10px;padding:10px 12px;border:1px solid rgba(255,255,255,0.08);display:flex;flex-direction:column;gap:8px"><!-- Dynamic Controls --></div>`}
      </div>
    `;

    document.body.appendChild(widget);

    // Dragging
    const header = widget.querySelector('#rbac-sim-w-header');
    let isDragging = false;
    let startX, startY, origLeft, origTop;

    header.addEventListener('mousedown', (e) => {
      if (e.target.tagName === 'BUTTON') return;
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      const rect = widget.getBoundingClientRect();
      origLeft = rect.left;
      origTop = rect.top;
      widget.style.bottom = 'auto';
      widget.style.right = 'auto';
      widget.style.left = origLeft + 'px';
      widget.style.top = origTop + 'px';
      e.preventDefault();
    });

    window.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      widget.style.left = Math.max(10, Math.min(window.innerWidth - widget.offsetWidth - 10, origLeft + dx)) + 'px';
      widget.style.top = Math.max(10, Math.min(window.innerHeight - widget.offsetHeight - 10, origTop + dy)) + 'px';
    });

    window.addEventListener('mouseup', () => { isDragging = false; });

    // Minimize toggle
    const minBtn = widget.querySelector('#rbac-sim-w-min');
    const body = widget.querySelector('#rbac-sim-w-body');
    let isMinimized = false;
    minBtn.addEventListener('click', () => {
      isMinimized = !isMinimized;
      body.style.display = isMinimized ? 'none' : 'flex';
      minBtn.textContent = isMinimized ? '□' : '─';
      if (isIframeLab) {
        // A minimized lab window shrinks to its title bar so the board is free to write on
        if (isMinimized) { widget.dataset.fullHeight = widget.style.height; widget.style.height = 'auto'; widget.style.width = 'min(520px, calc(100vw - 32px))'; }
        else { widget.style.height = widget.dataset.fullHeight || widget.style.height; widget.style.width = 'calc(100vw - 32px)'; }
      }
    });

    // Close button
    const closeWidget = () => {
      if (widget.__dsaMessageHandler) window.removeEventListener('message', widget.__dsaMessageHandler);
      widget.remove();
    };
    widget.querySelector('#rbac-sim-w-close').addEventListener('click', closeWidget);

    // Stamp to board button
    const stampBtn = widget.querySelector('#rbac-sim-w-stamp');
    stampBtn.addEventListener('click', () => {
      if (isCnLab) {
        const frameEl = widget.querySelector('#rbac-sim-w-dsa-frame');
        const svg = frameEl && frameEl.contentWindow && frameEl.contentWindow.CNEngine ? frameEl.contentWindow.CNEngine.getSvg() : '';
        if (!svg) return;
        const img = new Image();
        img.onload = () => {
          const c = document.createElement('canvas'); c.width = 1400; c.height = 784;
          const g = c.getContext('2d'); g.fillStyle = '#ffffff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
          if (typeof Canvas !== 'undefined' && typeof Canvas.addImageShape === 'function') {
            Canvas.addImageShape(c.toDataURL('image/png'), 120, 100, 760, 426, title + ' — snapshot');
            if (window.App && typeof window.App.showToast === 'function') window.App.showToast('📸 Simulation step stamped to the board. Ready for the pen.', 'success');
            if (window.App && typeof window.App.setTool === 'function') window.App.setTool('pen');
          }
        };
        img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
        return;
      }
      const cvs = widget.querySelector('#rbac-sim-w-canvas');
      if (!cvs) return;
      try {
        const dataUrl = cvs.toDataURL('image/png');
        if (typeof Canvas !== 'undefined' && typeof Canvas.addImageShape === 'function') {
          Canvas.addImageShape(dataUrl, 120, 100, isDsaLab ? 720 : 560, isDsaLab ? 390 : 240, title + ' Simulation Snapshot');
          if (window.App && typeof window.App.showToast === 'function') {
            window.App.showToast('📸 Simulation stamped to board! Ready for stylus pen drawing.', 'success');
          }
          if (window.App && typeof window.App.setTool === 'function') {
            window.App.setTool('pen');
          }
        }
      } catch (err) {
        console.warn('Could not stamp simulation to board:', err);
      }
    });

    if (isIframeLab) {
      const frame = widget.querySelector('#rbac-sim-w-dsa-frame');
      const snapshotCanvas = widget.querySelector('#rbac-sim-w-canvas');
      widget.__dsaMessageHandler = (event) => {
        if (event.origin !== window.location.origin || event.source !== frame?.contentWindow || !event.data || typeof event.data !== 'object') return;
        const message = event.data;
        if (message.type === 'EDUVERSE_SIM_STATE' && message.context) {
          // Full context: department, semester, subject, code, unit, topic, simulation, step, state
          session.simulationContext = message.context;
          session.focus = { ...(session.focus || {}), topic: message.context.topic || '' };
          window.CurrentSubjectContext = session;
          window.EduverseSubjectContext = session;
          return;
        }
        if (message.type === 'EDUVERSE_SIM_ASK_AI') {
          if (message.context) session.simulationContext = message.context;
          session.focus = { ...(session.focus || {}), topic: (message.context && message.context.topic) || session.focus?.topic || '' };
          window.CurrentSubjectContext = session;
          window.EduverseSubjectContext = session;
          if (window.AIAssistant && typeof window.AIAssistant.openPanel === 'function') {
            window.AIAssistant.openPanel();
            window.AIAssistant.askQuestion(String(message.question || 'Explain the current simulation step.'), message.selection || { type: 'Simulation state', content: JSON.stringify(session.simulationContext).slice(0, 7500), source: 'cn-simulation' });
          }
          return;
        }
        if (message.type === 'EDUVERSE_DSA_CLOSE' || message.type === 'EDUVERSE_OS_CLOSE' || message.type === 'EDUVERSE_C_CLOSE' || message.type === 'EDUVERSE_SIM_CLOSE') {
          closeWidget();
          return;
        }
        if ((message.type === 'EDUVERSE_DSA_STATE' || message.type === 'EDUVERSE_OS_STATE' || message.type === 'EDUVERSE_C_STATE') && message.context) {
          session.simulationContext = message.context;
          session.focus = { ...(session.focus || {}), topic: message.context.topic || '' };
          window.CurrentSubjectContext = session;
          window.EduverseSubjectContext = session;
          drawDsaWidgetSnapshot(snapshotCanvas, message.context.state || {}, title);
          return;
        }
        if (message.type === 'EDUVERSE_DSA_ASK_AI' || message.type === 'EDUVERSE_OS_ASK_AI' || message.type === 'EDUVERSE_C_ASK_AI') {
          let state = message.context?.state || {};
          if ((!state || !Object.keys(state).length) && message.selection?.content) {
            try { state = JSON.parse(message.selection.content); } catch (error) {}
          }
          session.simulationContext = {
            simulation: isCLab ? 'Problem Solving & C Programming' : isOsLab ? 'Operating Systems' : 'Data Structures & Algorithms',
            topic: message.context?.topic || state.topic || session.focus?.topic || '',
            state,
          };
          session.focus = { ...(session.focus || {}), topic: session.simulationContext.topic };
          window.CurrentSubjectContext = session;
          window.EduverseSubjectContext = session;
          if (window.AIAssistant && typeof window.AIAssistant.openPanel === 'function') {
            window.AIAssistant.openPanel();
            window.AIAssistant.askQuestion(
              String(message.question || (isCLab ? 'Explain this C Programming simulation step and memory state.' : isOsLab ? 'Explain this Operating Systems simulation step.' : 'Explain the current algorithm step.')),
              message.selection || { type: isCLab ? 'C Programming simulation state' : isOsLab ? 'Operating Systems simulation state' : 'DSA simulation state', content: JSON.stringify(session.simulationContext).slice(0, 7500), source: isCLab ? 'c-simulation' : isOsLab ? 'os-simulation' : 'dsa-simulation' }
            );
          }
        }
      };
      window.addEventListener('message', widget.__dsaMessageHandler);
      if (!isCnLab) drawDsaWidgetSnapshot(snapshotCanvas, {}, title);
    } else {
      initWidgetSimulation(widget, simKey, title);
    }
  }

  function drawDsaWidgetSnapshot(canvas, state, title) {
    if (!canvas || !state) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const width = canvas.width;
    const height = canvas.height;
    ctx.fillStyle = '#07111f';
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = '#246B45';
    ctx.lineWidth = 3;
    ctx.strokeRect(16, 16, width - 32, height - 32);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 26px sans-serif';
    ctx.fillText(String(title || 'Data Structures & Algorithms').slice(0, 54), 36, 58);
    ctx.fillStyle = '#a7f3d0';
    ctx.font = 'bold 18px sans-serif';
    const label = [state.topic || state.category || 'Simulation', state.algorithm].filter(Boolean).join(' · ');
    ctx.fillText(label.slice(0, 68), 36, 92);
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '16px sans-serif';
    ctx.fillText(`Step ${state.step || 1} of ${state.totalSteps || 1}  •  ${String(state.currentOperation || 'Ready to begin').slice(0, 70)}`, 36, 130);

    const values = Array.isArray(state.values) ? state.values.slice(0, 20) : [];
    if (values.length) {
      const gap = 8;
      const cellWidth = Math.min(72, (width - 72 - gap * (values.length - 1)) / values.length);
      const totalWidth = values.length * cellWidth + (values.length - 1) * gap;
      const startX = (width - totalWidth) / 2;
      values.forEach((value, index) => {
        const x = startX + index * (cellWidth + gap);
        const y = 178;
        const isCurrent = state.current === index || state.mid === index;
        const isCompared = Array.isArray(state.comparing) && state.comparing.includes(index);
        ctx.fillStyle = isCurrent ? '#f59e0b' : isCompared ? '#38bdf8' : '#1e3a5f';
        ctx.fillRect(x, y, cellWidth, 58);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 20px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(String(value), x + cellWidth / 2, y + 36);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '12px sans-serif';
        ctx.fillText(String(index), x + cellWidth / 2, y + 78);
      });
    }
    ctx.textAlign = 'left';
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '16px sans-serif';
    const explanation = String(state.explanation || '').slice(0, 120);
    if (explanation) ctx.fillText(explanation, 36, height - 70, width - 72);
    ctx.fillStyle = '#a7f3d0';
    ctx.font = '14px sans-serif';
    ctx.fillText('Use the interactive Smart Board widget to step through the algorithm.', 36, height - 40, width - 72);
  }

  function initWidgetSimulation(widget, simKey, title) {
    const cvs = widget.querySelector('#rbac-sim-w-canvas');
    const ctx = cvs ? cvs.getContext('2d') : null;
    const ctrl = widget.querySelector('#rbac-sim-w-controls');
    if (!ctx || !ctrl) return;

    const width = cvs.width;
    const height = cvs.height;

    // ─── BST SIMULATION ───
    if (simKey === 'bst' || simKey.includes('tree')) {
      let activeVal = 50;
      let logText = 'Inorder: 20 → 30 → 40 → 50 → 60 → 70 → 80';

      function drawBST() {
        ctx.fillStyle = '#020617';
        ctx.fillRect(0, 0, width, height);

        const positions = {
          50: { x: width / 2, y: 36 },
          30: { x: width / 2 - 140, y: 92 },
          70: { x: width / 2 + 140, y: 92 },
          20: { x: width / 2 - 210, y: 154 },
          40: { x: width / 2 - 70, y: 154 },
          60: { x: width / 2 + 70, y: 154 },
          80: { x: width / 2 + 210, y: 154 },
        };

        const edges = [[50, 30], [50, 70], [30, 20], [30, 40], [70, 60], [70, 80]];
        edges.forEach(([p, c]) => {
          ctx.strokeStyle = '#475569';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(positions[p].x, positions[p].y);
          ctx.lineTo(positions[c].x, positions[c].y);
          ctx.stroke();
        });

        Object.keys(positions).forEach(k => {
          const val = parseInt(k, 10);
          const pos = positions[val];
          const isActive = activeVal === val;

          ctx.fillStyle = isActive ? '#f59e0b' : '#10b981';
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, 18, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.stroke();

          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 12px monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(String(val), pos.x, pos.y);
        });

        ctx.fillStyle = '#94a3b8';
        ctx.font = '11.5px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(logText, 14, height - 12);
      }

      drawBST();

      ctrl.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
          <div style="display:flex;gap:6px">
            <button id="ctrl-bst-inorder" style="padding:5px 10px;background:#246B45;border:none;color:#ffffff;border-radius:6px;font-size:11.5px;font-weight:700;cursor:pointer">Inorder</button>
            <button id="ctrl-bst-preorder" style="padding:5px 10px;background:#334155;border:none;color:#ffffff;border-radius:6px;font-size:11.5px;font-weight:600;cursor:pointer">Preorder</button>
            <button id="ctrl-bst-postorder" style="padding:5px 10px;background:#334155;border:none;color:#ffffff;border-radius:6px;font-size:11.5px;font-weight:600;cursor:pointer">Postorder</button>
          </div>
          <span style="font-size:11.5px;color:#38bdf8;font-weight:700">Balanced O(log n)</span>
        </div>
      `;

      ctrl.querySelector('#ctrl-bst-inorder').addEventListener('click', () => {
        logText = 'Inorder (L, Root, R): 20 → 30 → 40 → 50 → 60 → 70 → 80 (Sorted)';
        activeVal = 50;
        drawBST();
      });
      ctrl.querySelector('#ctrl-bst-preorder').addEventListener('click', () => {
        logText = 'Preorder (Root, L, R): 50 → 30 → 20 → 40 → 70 → 60 → 80';
        activeVal = 30;
        drawBST();
      });
      ctrl.querySelector('#ctrl-bst-postorder').addEventListener('click', () => {
        logText = 'Postorder (L, R, Root): 20 → 40 → 30 → 60 → 80 → 70 → 50';
        activeVal = 70;
        drawBST();
      });

    // ─── SORTING SIMULATION ───
    } else if (simKey === 'sorting') {
      let arr = [50, 18, 76, 32, 88, 44, 12, 65, 94, 28, 40, 72];
      let activeIndices = [0, 1];

      function drawSort() {
        ctx.fillStyle = '#020617';
        ctx.fillRect(0, 0, width, height);

        const barW = (width - 60) / arr.length;
        const maxVal = Math.max(...arr, 100);

        arr.forEach((val, idx) => {
          const barH = (val / maxVal) * (height - 60);
          const x = 30 + idx * barW;
          const y = height - 30 - barH;
          const isAct = activeIndices.includes(idx);
          ctx.fillStyle = isAct ? '#f59e0b' : '#3b82f6';
          ctx.fillRect(x + 2, y, barW - 4, barH);

          ctx.fillStyle = '#cbd5e1';
          ctx.font = '10px monospace';
          ctx.textAlign = 'center';
          ctx.fillText(String(val), x + barW / 2, height - 12);
        });

        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'left';
        ctx.fillText('Sorting Comparison Telemetry • Active: [' + activeIndices[0] + ', ' + activeIndices[1] + ']', 14, 20);
      }

      drawSort();

      ctrl.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
          <button id="ctrl-sort-step" style="padding:5px 14px;background:#246B45;border:none;color:#ffffff;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer">▶ Step Swap</button>
          <button id="ctrl-sort-reset" style="padding:5px 12px;background:#475569;border:none;color:#ffffff;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer">↺ Reset</button>
        </div>
      `;

      let step = 0;
      ctrl.querySelector('#ctrl-sort-step').addEventListener('click', () => {
        let i = step % (arr.length - 1);
        activeIndices = [i, i + 1];
        if (arr[i] > arr[i + 1]) {
          const temp = arr[i];
          arr[i] = arr[i + 1];
          arr[i + 1] = temp;
        }
        step++;
        drawSort();
      });
      ctrl.querySelector('#ctrl-sort-reset').addEventListener('click', () => {
        arr = [50, 18, 76, 32, 88, 44, 12, 65, 94, 28, 40, 72];
        activeIndices = [0, 1];
        step = 0;
        drawSort();
      });

    // ─── CIVIL BEAM DEFLECTION & BENDING MOMENTS ───
    } else if (simKey === 'beam-deflection' || simKey.includes('beam')) {
      let loadP = 25; // kN
      let posA = width / 2;

      function drawBeam() {
        ctx.fillStyle = '#020617';
        ctx.fillRect(0, 0, width, height);

        // Beam support line
        const beamY = 80;
        const leftX = 60;
        const rightX = width - 60;

        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.moveTo(leftX, beamY);
        ctx.lineTo(rightX, beamY);
        ctx.stroke();

        // Supports
        ctx.fillStyle = '#10b981';
        ctx.beginPath();
        ctx.moveTo(leftX, beamY);
        ctx.lineTo(leftX - 14, beamY + 24);
        ctx.lineTo(leftX + 14, beamY + 24);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(rightX, beamY);
        ctx.lineTo(rightX - 14, beamY + 24);
        ctx.lineTo(rightX + 14, beamY + 24);
        ctx.closePath();
        ctx.fill();

        // Point load arrow
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(posA, beamY - 45);
        ctx.lineTo(posA, beamY - 4);
        ctx.stroke();

        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.moveTo(posA, beamY);
        ctx.lineTo(posA - 6, beamY - 12);
        ctx.lineTo(posA + 6, beamY - 12);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#f87171';
        ctx.font = 'bold 12px monospace';
        ctx.fillText(`P = ${loadP} kN`, posA - 20, beamY - 50);

        // Bending Moment Diagram (BMD) below
        const bmdBaseY = 190;
        const maxMoment = (loadP * 10 * 0.25).toFixed(1);
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(leftX, bmdBaseY);
        ctx.lineTo(posA, bmdBaseY - (loadP * 1.8));
        ctx.lineTo(rightX, bmdBaseY);
        ctx.stroke();

        ctx.fillStyle = 'rgba(56,189,248,0.15)';
        ctx.beginPath();
        ctx.moveTo(leftX, bmdBaseY);
        ctx.lineTo(posA, bmdBaseY - (loadP * 1.8));
        ctx.lineTo(rightX, bmdBaseY);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#38bdf8';
        ctx.font = '11px sans-serif';
        ctx.fillText(`Bending Moment Diagram (BMD) — Max M = ${maxMoment} kN·m`, leftX, bmdBaseY + 18);
      }

      drawBeam();

      ctrl.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px">
          <label style="font-size:12px;color:#cbd5e1;display:flex;align-items:center;gap:8px">
            Transverse Load P:
            <input type="range" id="ctrl-beam-load" min="10" max="50" value="${loadP}" style="accent-color:#22c55e">
            <span id="ctrl-beam-val" style="color:#22c55e;font-weight:700">${loadP} kN</span>
          </label>
          <span style="font-size:11.5px;color:#94a3b8">Bending stress: sigma = My / I</span>
        </div>
      `;

      ctrl.querySelector('#ctrl-beam-load').addEventListener('input', (e) => {
        loadP = parseInt(e.target.value, 10);
        ctrl.querySelector('#ctrl-beam-val').textContent = `${loadP} kN`;
        drawBeam();
      });

    // ─── MATHEMATICAL CALCULUS / RIEMANN SUMS ───
    } else if (simKey === 'calculus' || simKey.includes('integral') || simKey === 'math-graphs') {
      let partitions = 8;
      function drawCalculus() {
        ctx.fillStyle = '#020617';
        ctx.fillRect(0, 0, width, height);

        const originX = 60;
        const originY = height - 40;
        const scaleX = (width - 120) / 4;
        const scaleY = (height - 80) / 16;

        // Axes
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(originX, 20);
        ctx.lineTo(originX, originY);
        ctx.lineTo(width - 40, originY);
        ctx.stroke();

        // Function curve: f(x) = x^2 + 1
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        for (let px = 0; px <= width - 120; px++) {
          const x = (px / scaleX);
          const y = x * x + 1;
          const py = originY - y * scaleY;
          if (px === 0) ctx.moveTo(originX + px, py);
          else ctx.lineTo(originX + px, py);
        }
        ctx.stroke();

        // Riemann rectangles
        const dx = 3 / partitions;
        let totalArea = 0;
        for (let i = 0; i < partitions; i++) {
          const x = i * dx;
          const y = x * x + 1;
          const rectW = dx * scaleX;
          const rectH = y * scaleY;
          totalArea += y * dx;

          ctx.fillStyle = 'rgba(56,189,248,0.3)';
          ctx.fillRect(originX + x * scaleX, originY - rectH, rectW, rectH);
          ctx.strokeStyle = '#38bdf8';
          ctx.strokeRect(originX + x * scaleX, originY - rectH, rectW, rectH);
        }

        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 12px monospace';
        ctx.fillText(`f(x) = x² + 1 • Riemann Area ≈ ${totalArea.toFixed(3)} • Slices: ${partitions}`, originX + 10, 30);
      }

      drawCalculus();

      ctrl.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px">
          <label style="font-size:12px;color:#cbd5e1;display:flex;align-items:center;gap:8px">
            Partitions n:
            <input type="range" id="ctrl-calc-n" min="4" max="32" value="${partitions}" style="accent-color:#38bdf8">
            <span id="ctrl-calc-val" style="color:#38bdf8;font-weight:700">${partitions}</span>
          </label>
          <span style="font-size:11.5px;color:#a78bfa">Exact Area: int_0^3 (x²+1)dx = 12.000</span>
        </div>
      `;

      ctrl.querySelector('#ctrl-calc-n').addEventListener('input', (e) => {
        partitions = parseInt(e.target.value, 10);
        ctrl.querySelector('#ctrl-calc-val').textContent = partitions;
        drawCalculus();
      });

    // ─── DEFAULT GENERIC LAB VISUALIZER ───
    } else {
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, width, height);

      ctx.strokeStyle = '#246B45';
      ctx.lineWidth = 2;
      ctx.strokeRect(20, 20, width - 40, height - 40);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 15px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(title || 'Academic Simulation Active', width / 2, height / 2 - 14);

      ctx.fillStyle = '#a7f3d0';
      ctx.font = '12px sans-serif';
      ctx.fillText('Live interactive simulator active on canvas. Annotate or stamp to whiteboard.', width / 2, height / 2 + 14);

      ctrl.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
          <span style="font-size:12px;color:#94a3b8">Ready to stamp on Smart Board:</span>
          <button id="ctrl-gen-stamp" style="padding:5px 14px;background:#246B45;border:none;color:#ffffff;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer">📌 Stamp Frame</button>
        </div>
      `;
      ctrl.querySelector('#ctrl-gen-stamp').addEventListener('click', () => {
        stampBtn.click();
      });
    }
  }

  /* ══════════════════════════════════════════════════════════
     10. INITIALIZATION
     ══════════════════════════════════════════════════════════ */
  function init() {
    document.body.classList.add('rbac-session-active');
    injectSessionBar();
    hydrateBackendContext();
    broadcastStatus();

    // Auto-launch initial resource if scheduled
    if (session && session.initialResource) {
      const resource = session.initialResource;
      // One-shot: clear it from the saved copies so a later reload starts clean
      delete session.initialResource;
      try {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
        localStorage.setItem(ACTIVE_STORAGE_KEY, JSON.stringify(session));
        if (session.subjectId) localStorage.setItem('active_smartboard_session_' + session.subjectId, JSON.stringify(session));
      } catch (e) {}
      session.launchedResource = resource;
      setTimeout(() => {
        launchDynamicResource(resource);
      }, 500);
    }
  }

  window.EduverseSmartBoardSimulation = {
    launch: (key, title, context) => launchSimulation(key, title, context),
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
