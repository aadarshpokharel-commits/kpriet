'use strict';

// Routes direct DSA board URLs into the same in-canvas simulation widget used
// by the Smart Board simulation catalogue.
(function connectDsaBoardLaunch() {
  const query = new URLSearchParams(window.location.search);
  const parseObject = (value) => {
    try {
      const parsed = JSON.parse(value || '{}');
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (error) {
      return {};
    }
  };

  function launchFromQuery() {
    const subject = window.CurrentSubjectContext || window.EduverseSubjectContext || {};
    const resource = subject.initialResource || {};
    // Direct links: ?preset=dsa-stack (or the older ?preset=cs-dsa-lab&category=stack)
    const preset = query.get('preset') || '';
    const isDsaPreset = preset === 'cs-dsa-lab' || /^dsa-/.test(preset);
    const launched = subject.launchedResource || {};
    // The Smart Board bridge already opens ?preset=… simulations; only step in if it did not.
    if (!isDsaPreset || resource.simKey === preset || launched.simKey === preset) return;

    const config = parseObject(query.get('config'));
    const state = parseObject(query.get('state'));
    const context = {
      simulationId: query.get('simulationId') || '',
      category: (/^dsa-/.test(preset) ? preset.slice(4) : '') || query.get('category') || state.category || config.category || 'searching',
      topic: query.get('topic') || state.topic || config.topic || '',
      config,
      state,
    };
    const title = query.get('title') || 'Data Structures & Algorithms';
    subject.initialResource = { type: 'sim', title, simKey: preset, simulationContext: context };
    window.CurrentSubjectContext = subject;
    window.EduverseSubjectContext = subject;

    window.setTimeout(() => {
      const launcher = window.EduverseSmartBoardSimulation;
      if (launcher && typeof launcher.launch === 'function') {
        launcher.launch(preset, title, context);
      }
    }, 500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', launchFromQuery, { once: true });
  } else {
    launchFromQuery();
  }
})();
