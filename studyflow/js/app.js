/**
 * StudyFlow - Application Entry Point
 * Initializes theme, keyboard shortcuts, background intervals, and starts the UI.
 */

document.addEventListener('DOMContentLoaded', () => {
  // Apply initial theme from state
  const state = window.StudyFlowState.getState();
  const theme = state.theme || 'dark';
  document.documentElement.setAttribute('data-theme', theme);
  document.body.className = `theme-${theme}`;

  // If user has zero data, load demo data automatically so they have an instant,
  // beautiful, interactive experience right out of the box!
  if (state.subjects.length === 0 && state.tasks.length === 0 && !localStorage.getItem('studyflow_welcomed')) {
    window.StudyFlowState.loadDemoData();
    localStorage.setItem('studyflow_welcomed', 'true');
  }

  // Initialize UI
  window.StudyFlowUI.init();

  // Periodic refresher every 30 seconds to update exam countdowns and date headers
  setInterval(() => {
    if (window.StudyFlowUI.activeView === 'dashboard') {
      window.StudyFlowUI.renderDashboard();
    } else if (window.StudyFlowUI.activeView === 'exams') {
      window.StudyFlowUI.renderExams();
    }
  }, 30000);

  // Global Keyboard Shortcuts
  document.addEventListener('keydown', (e) => {
    const isEditing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName);

    // Ctrl+N or Cmd+N to open Add Task
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      window.StudyFlowUI.openAddTaskModal();
      return;
    }

    // Spacebar to play/pause timer when viewing the timer panel and not focused in an input
    if (e.code === 'Space' && !isEditing && window.StudyFlowUI.activeView === 'timer') {
      e.preventDefault();
      const timer = window.StudyFlowTimer;
      if (timer.status === 'running') timer.pause();
      else if (timer.status === 'paused') timer.resume();
      else timer.start();
    }
  });

  // Warn before closing tab if focus session is running
  window.addEventListener('beforeunload', (e) => {
    if (window.StudyFlowTimer.status === 'running') {
      e.preventDefault();
      e.returnValue = 'You have an active focus session running. Are you sure you want to exit?';
      return e.returnValue;
    }
  });

  console.log('⚡ StudyFlow Student OS initialized successfully.');
});
