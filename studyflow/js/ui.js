/**
 * StudyFlow - UI View Controller & DOM Renderer
 * Manages view switching, component rendering, modal dialogs, and toast notifications.
 */

const UI = {
  activeView: 'dashboard',
  examTab: 'upcoming', // 'upcoming' | 'past'
  subjectPendingDeleteId: null,
  flashcardIndex: 0,
  isCardFlipped: false,
  currentAiPlan: null,
  currentAiInsight: null,

  init() {
    this.bindGlobalEvents();
    this.renderAll();
  },

  // Switch between views
  switchView(viewName) {
    if (!viewName) return;
    this.activeView = viewName;

    // Update view panels
    document.querySelectorAll('.view-panel').forEach(panel => {
      panel.classList.toggle('active', panel.id === `view-${viewName}`);
    });

    // Update desktop sidebar nav
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.view === viewName);
    });

    // Update mobile bottom nav
    document.querySelectorAll('.mobile-bottom-nav .mb-nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.view === viewName);
    });

    // Update Header Page Title
    const titles = {
      dashboard: 'Dashboard',
      'ai-teacher': 'AI Teacher',
      tasks: 'Tasks & Homework',
      subjects: 'Subjects',
      exams: 'Exams & Tests',
      flashcards: 'Active Recall Flashcards',
      schedule: 'Study Schedule',
      timer: 'Focus Timer',
      progress: 'Progress & Analytics'
    };
    const titleEl = document.getElementById('pageTitle');
    if (titleEl) titleEl.textContent = titles[viewName] || 'StudyFlow';

    // Close mobile drawer if open
    this.closeMobileDrawer();

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Re-render target view to ensure freshness
    this.renderView(viewName);
  },

  renderAll() {
    this.updateBadges();
    this.renderHeader();
    this.renderDashboard();
    this.renderTasks();
    this.renderSubjects();
    this.renderExams();
    this.renderFlashcards();
    this.renderAiTeacher();
    this.renderSchedule();
    this.renderTimer();
    this.renderProgress();
    this.populateSubjectSelects();
  },

  renderView(viewName) {
    switch (viewName) {
      case 'dashboard':
        this.renderDashboard();
        break;
      case 'ai-teacher':
        this.renderAiTeacher();
        break;
      case 'tasks':
        this.renderTasks();
        break;
      case 'subjects':
        this.renderSubjects();
        break;
      case 'exams':
        this.renderExams();
        break;
      case 'flashcards':
        this.renderFlashcards();
        break;
      case 'schedule':
        this.renderSchedule();
        break;
      case 'timer':
        this.renderTimer();
        break;
      case 'progress':
        this.renderProgress();
        break;
    }
    this.updateBadges();
  },

  // Update top badges and streak
  updateBadges() {
    const state = window.StudyFlowState.getState();
    const taskStats = window.StudyFlowAnalytics.getTaskStats(state.tasks, state.subjects);
    const examData = window.StudyFlowAnalytics.getExamData(state.exams, state.subjects);
    const focusStats = window.StudyFlowAnalytics.getFocusStats(state.focusLogs, state.tasks);

    // Pending tasks badge in sidebar
    const pendingBadge = document.getElementById('navPendingBadge');
    if (pendingBadge) pendingBadge.textContent = taskStats.pending;

    // Upcoming exams badge in sidebar
    const examsBadge = document.getElementById('navExamsBadge');
    if (examsBadge) examsBadge.textContent = examData.upcoming.length;

    // Streak pill in header
    const streakEl = document.getElementById('streakCountText');
    if (streakEl) {
      const days = focusStats.streak;
      streakEl.textContent = `${days} day streak`;
    }
  },

  renderHeader() {
    const dateBadge = document.getElementById('currentDateBadge');
    if (dateBadge) {
      const now = new Date();
      const options = { weekday: 'short', month: 'short', day: 'numeric' };
      dateBadge.textContent = now.toLocaleDateString('en-US', options);
    }
  },

  // ==========================================
  // DASHBOARD RENDERING
  // ==========================================
  renderDashboard() {
    const state = window.StudyFlowState.getState();
    const taskStats = window.StudyFlowAnalytics.getTaskStats(state.tasks, state.subjects);
    const examData = window.StudyFlowAnalytics.getExamData(state.exams, state.subjects);
    const focusStats = window.StudyFlowAnalytics.getFocusStats(state.focusLogs, state.tasks);
    const deadlines = window.StudyFlowAnalytics.getCombinedDeadlines(state.tasks, state.exams, state.subjects, 6);

    // Greeting Banner
    const now = new Date();
    const hour = now.getHours();
    let timeGreeting = 'Good morning';
    if (hour >= 12 && hour < 17) timeGreeting = 'Good afternoon';
    else if (hour >= 17) timeGreeting = 'Good evening';

    const greetingHeading = document.getElementById('dashGreetingHeading');
    const greetingSummary = document.getElementById('dashGreetingSummary');
    const greetingEyebrow = document.getElementById('dashGreetingEyebrow');

    if (greetingEyebrow) greetingEyebrow.textContent = `${timeGreeting}, ${state.userName || 'Student'}!`;
    if (greetingHeading) {
      if (taskStats.pending === 0 && examData.upcoming.length === 0) {
        greetingHeading.textContent = "You're all caught up!";
      } else if (taskStats.overdue > 0) {
        greetingHeading.textContent = `You have ${taskStats.overdue} overdue ${taskStats.overdue === 1 ? 'task' : 'tasks'}!`;
      } else {
        greetingHeading.textContent = `You have ${taskStats.pending} pending ${taskStats.pending === 1 ? 'task' : 'tasks'} to tackle.`;
      }
    }

    if (greetingSummary) {
      const focusText = focusStats.todayMinutes > 0
        ? `You've logged ${window.StudyFlowAnalytics.formatDuration(focusStats.todayMinutes)} of focus study today.`
        : "Ready to start a focused study session?";
      const examNotice = examData.upcoming.length > 0
        ? ` Next exam is ${examData.upcoming[0].title} (${examData.upcoming[0].countdown}).`
        : "";
      greetingSummary.textContent = `${focusText}${examNotice}`;
    }

    // Metric 1: Pending Tasks
    const metricPending = document.getElementById('dashMetricPending');
    if (metricPending) metricPending.textContent = taskStats.pending;
    const metricOverdue = document.getElementById('dashMetricOverdue');
    if (metricOverdue) {
      if (taskStats.overdue > 0) {
        metricOverdue.textContent = `${taskStats.overdue} overdue`;
        metricOverdue.style.display = 'inline-block';
      } else {
        metricOverdue.style.display = 'none';
      }
    }

    // Metric 2: Upcoming Exams
    const metricExams = document.getElementById('dashMetricExams');
    if (metricExams) metricExams.textContent = examData.upcoming.length;
    const metricNextExam = document.getElementById('dashMetricNextExam');
    if (metricNextExam) {
      metricNextExam.textContent = examData.upcoming.length > 0
        ? `${examData.upcoming[0].countdown}`
        : 'None upcoming';
    }

    // Metric 3: Completed Tasks
    const metricCompleted = document.getElementById('dashMetricCompleted');
    if (metricCompleted) metricCompleted.textContent = taskStats.completed;
    const metricRate = document.getElementById('dashMetricRate');
    if (metricRate) metricRate.textContent = `${taskStats.rate}% completion`;

    // Metric 4: Total Focus Time
    const metricFocus = document.getElementById('dashMetricFocus');
    if (metricFocus) metricFocus.textContent = window.StudyFlowAnalytics.formatDuration(focusStats.allTimeMinutes);
    const metricTodayFocus = document.getElementById('dashMetricTodayFocus');
    if (metricTodayFocus) {
      metricTodayFocus.textContent = `${window.StudyFlowAnalytics.formatDuration(focusStats.todayMinutes)} today`;
    }

    // Render Deadlines List
    const deadlinesList = document.getElementById('dashDeadlinesList');
    if (deadlinesList) {
      if (deadlines.length === 0) {
        deadlinesList.innerHTML = `
          <div class="empty-state" style="padding: 1.5rem 1rem; margin: 0.5rem 0;">
            <div class="empty-icon" style="width:40px;height:40px;margin-bottom:0.5rem;">✨</div>
            <div class="empty-title" style="font-size:1rem;">No Upcoming Deadlines</div>
            <p class="empty-desc" style="font-size:0.8rem;margin-bottom:0.75rem;">Your schedule is clear. Add an assignment or exam to stay ahead.</p>
            <button class="btn btn-secondary btn-sm" onclick="UI.openModal('taskModal')">+ Add Task</button>
          </div>
        `;
      } else {
        deadlinesList.innerHTML = deadlines.map(item => {
          const isTask = item.type === 'task';
          const badgeClass = item.isOverdue ? 'badge-overdue' : (item.dateObj.getTime() - now.getTime() < 86400000 * 2 ? 'badge-soon' : 'badge-normal');
          const subjectColor = item.subject ? item.subject.color : '#64748b';
          const subjectName = item.subject ? item.subject.name : 'General';

          return `
            <div class="deadline-item ${item.isOverdue ? 'overdue' : ''}">
              <div class="deadline-left">
                ${isTask ? `
                  <button class="custom-checkbox" onclick="UI.handleTaskCheckbox('${item.id}')" aria-label="Mark task complete" title="Mark complete">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  </button>
                ` : `
                  <div style="color:var(--secondary);margin-top:2px;" title="Exam">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="7"></circle><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline></svg>
                  </div>
                `}
                <div class="deadline-info">
                  <span class="deadline-title">${this.escapeHtml(item.title)}</span>
                  <div class="deadline-meta">
                    <span class="subject-pill" style="background:${subjectColor}1f; color:${subjectColor};">
                      <span class="subject-color-dot" style="background:${subjectColor};"></span>
                      ${this.escapeHtml(subjectName)}
                    </span>
                    <span>Due ${item.dateString}${item.timeString ? ' at ' + item.timeString : ''}</span>
                  </div>
                </div>
              </div>
              <span class="deadline-badge ${badgeClass}">${item.countdown}</span>
            </div>
          `;
        }).join('');
      }
    }

    // Render Today's Sessions on Dashboard
    const todaySessionsList = document.getElementById('dashTodaySessionsList');
    const todayDateStr = now.toISOString().slice(0, 10);
    const todaySessions = state.sessions.filter(s => s.date === todayDateStr);
    const todayDateStrEl = document.getElementById('dashTodayDateStr');
    if (todayDateStrEl) todayDateStrEl.textContent = now.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

    if (todaySessionsList) {
      if (todaySessions.length === 0) {
        todaySessionsList.innerHTML = `
          <div class="empty-state" style="padding: 1.5rem 1rem; margin: 0.5rem 0;">
            <div class="empty-icon" style="width:40px;height:40px;margin-bottom:0.5rem;">📅</div>
            <div class="empty-title" style="font-size:1rem;">No Sessions Planned Today</div>
            <p class="empty-desc" style="font-size:0.8rem;margin-bottom:0.75rem;">Schedule a dedicated study block to make steady daily progress.</p>
            <button class="btn btn-secondary btn-sm" onclick="UI.openModal('sessionModal')">+ Add Study Session</button>
          </div>
        `;
      } else {
        todaySessionsList.innerHTML = todaySessions.map(session => {
          const subj = session.subjectId ? window.StudyFlowState.getSubject(session.subjectId) : null;
          const subjColor = subj ? subj.color : '#8b5cf6';
          const subjName = subj ? subj.name : 'General Study';

          return `
            <div class="deadline-item ${session.completed ? 'completed' : ''}" style="border-left: 3px solid ${subjColor};">
              <div class="deadline-left">
                <button class="custom-checkbox ${session.completed ? 'checked' : ''}" onclick="UI.handleSessionCheckbox('${session.id}')" aria-label="Toggle session completed">
                  ${session.completed ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>' : ''}
                </button>
                <div class="deadline-info">
                  <span class="deadline-title" style="${session.completed ? 'text-decoration:line-through;color:var(--text-muted);' : ''}">${this.escapeHtml(session.topic || subjName)}</span>
                  <div class="deadline-meta">
                    <span class="subject-pill" style="background:${subjColor}1f; color:${subjColor};">
                      <span class="subject-color-dot" style="background:${subjColor};"></span>
                      ${this.escapeHtml(subjName)}
                    </span>
                    <span>${session.startTime} (${session.duration}m)</span>
                  </div>
                </div>
              </div>
              <span class="deadline-badge badge-normal">${session.completed ? 'Done' : 'Planned'}</span>
            </div>
          `;
        }).join('');
      }
    }

    // AI Insights & Daily Coach Widget
    this.renderAiInsightsWidget();
  },

  // ==========================================
  // TASKS & HOMEWORK RENDERING
  // ==========================================
  renderTasks() {
    const state = window.StudyFlowState.getState();
    const container = document.getElementById('tasksListContainer');
    if (!container) return;

    // Filters & Search
    const searchVal = (document.getElementById('taskSearchInput')?.value || '').toLowerCase().trim();
    const filterSubject = document.getElementById('taskFilterSubject')?.value || 'all';
    const filterPriority = document.getElementById('taskFilterPriority')?.value || 'all';
    const filterStatus = document.getElementById('taskFilterStatus')?.value || 'pending';
    const sortOrder = document.getElementById('taskSortOrder')?.value || 'dueDateAsc';

    let filtered = [...state.tasks];

    // Search filter
    if (searchVal) {
      filtered = filtered.filter(t =>
        (t.title && t.title.toLowerCase().includes(searchVal)) ||
        (t.description && t.description.toLowerCase().includes(searchVal))
      );
    }

    // Subject filter
    if (filterSubject !== 'all') {
      if (filterSubject === 'unassigned') {
        filtered = filtered.filter(t => !t.subjectId);
      } else {
        filtered = filtered.filter(t => t.subjectId === filterSubject);
      }
    }

    // Priority filter
    if (filterPriority !== 'all') {
      filtered = filtered.filter(t => t.priority === filterPriority);
    }

    // Status filter
    if (filterStatus === 'pending') {
      filtered = filtered.filter(t => !t.completed);
    } else if (filterStatus === 'completed') {
      filtered = filtered.filter(t => t.completed);
    } else if (filterStatus === 'overdue') {
      filtered = filtered.filter(t => window.StudyFlowAnalytics.isTaskOverdue(t));
    }

    // Sort order
    filtered.sort((a, b) => {
      if (sortOrder === 'dueDateAsc') {
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      } else if (sortOrder === 'dueDateDesc') {
        return new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime();
      } else if (sortOrder === 'priorityHigh') {
        const weights = { high: 3, medium: 2, low: 1 };
        return (weights[b.priority] || 2) - (weights[a.priority] || 2);
      } else if (sortOrder === 'titleAsc') {
        return a.title.localeCompare(b.title);
      }
      return 0;
    });

    if (filtered.length === 0) {
      const hasTasks = state.tasks.length > 0;
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>
          </div>
          <h3 class="empty-title">${hasTasks ? 'No Matching Tasks' : 'No Tasks Yet'}</h3>
          <p class="empty-desc">${hasTasks ? 'No tasks found matching your active filters. Try adjusting your search or filters.' : 'Add your homework assignments, lab reports, and reading lists to stay organized.'}</p>
          <button class="btn btn-primary" onclick="UI.openModal('taskModal')">+ Add Task</button>
        </div>
      `;
      return;
    }

    container.innerHTML = filtered.map(task => {
      const subj = task.subjectId ? window.StudyFlowState.getSubject(task.subjectId) : null;
      const subjColor = subj ? subj.color : '#64748b';
      const subjName = subj ? subj.name : 'General';
      const isOverdue = window.StudyFlowAnalytics.isTaskOverdue(task);

      // Format due date
      const dateParts = task.dueDate.split('-');
      const formattedDate = dateParts.length === 3 ? `${dateParts[1]}/${dateParts[2]}/${dateParts[0]}` : task.dueDate;

      return `
        <div class="task-item ${task.completed ? 'completed' : ''} ${isOverdue ? 'overdue' : ''}" id="task-${task.id}">
          <div class="task-left">
            <button class="custom-checkbox ${task.completed ? 'checked' : ''}" onclick="UI.handleTaskCheckbox('${task.id}')" aria-label="Toggle task completed" title="${task.completed ? 'Mark incomplete' : 'Mark complete'}">
              ${task.completed ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>' : ''}
            </button>
            <div class="task-body">
              <div class="task-title-row">
                <span class="task-title">${this.escapeHtml(task.title)}</span>
              </div>
              ${task.description ? `<p class="task-desc">${this.escapeHtml(task.description)}</p>` : ''}
              <div class="task-meta-row">
                <span class="subject-pill" style="background:${subjColor}1f; color:${subjColor};">
                  <span class="subject-color-dot" style="background:${subjColor};"></span>
                  ${this.escapeHtml(subjName)}
                </span>
                <span class="priority-pill priority-${task.priority}">${task.priority}</span>
                <span class="due-date-pill ${isOverdue ? 'is-overdue' : ''}">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                  ${isOverdue ? 'Overdue: ' : 'Due: '} ${formattedDate} ${task.dueTime ? 'at ' + task.dueTime : ''}
                </span>
              </div>
            </div>
          </div>
          <div class="task-actions">
            <button class="icon-btn" onclick="UI.openEditTaskModal('${task.id}')" title="Edit task" aria-label="Edit task">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
            </button>
            <button class="icon-btn text-danger" onclick="UI.handleDeleteTask('${task.id}')" title="Delete task" aria-label="Delete task">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </div>
        </div>
      `;
    }).join('');
  },

  // ==========================================
  // SUBJECTS RENDERING
  // ==========================================
  renderSubjects() {
    const state = window.StudyFlowState.getState();
    const container = document.getElementById('subjectsGridContainer');
    if (!container) return;

    if (state.subjects.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <div class="empty-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
          </div>
          <h3 class="empty-title">No Subjects Added</h3>
          <p class="empty-desc">Create subjects to categorize your homework, exams, and weekly study schedule.</p>
          <button class="btn btn-primary" onclick="UI.openModal('subjectModal')">+ Add Subject</button>
        </div>
      `;
      return;
    }

    container.innerHTML = state.subjects.map(subj => {
      const stats = window.StudyFlowState.getSubjectStats(subj.id);

      return `
        <div class="subject-card">
          <div class="subject-top-bar" style="background:${subj.color};"></div>
          <div class="subject-card-header">
            <div>
              <h3 class="subject-name">${this.escapeHtml(subj.name)}</h3>
            </div>
            ${subj.code ? `<span class="subject-code-tag">${this.escapeHtml(subj.code)}</span>` : ''}
          </div>

          <p class="subject-card-desc">${subj.description ? this.escapeHtml(subj.description) : '<em class="text-muted">No description provided.</em>'}</p>

          <div class="subject-stats-row">
            <div class="subject-stat-col">
              <span class="subject-stat-val">${stats.pendingTasks}</span>
              <span class="subject-stat-lbl">Pending</span>
            </div>
            <div class="subject-stat-col">
              <span class="subject-stat-val">${stats.completedTasks}</span>
              <span class="subject-stat-lbl">Done</span>
            </div>
            <div class="subject-stat-col">
              <span class="subject-stat-val">${stats.upcomingExams}</span>
              <span class="subject-stat-lbl">Exams</span>
            </div>
            <div class="subject-stat-col">
              <span class="subject-stat-val">${stats.totalSessions}</span>
              <span class="subject-stat-lbl">Sessions</span>
            </div>
          </div>

          <div class="subject-card-footer">
            <button class="btn btn-secondary btn-sm" onclick="UI.openEditSubjectModal('${subj.id}')">Edit</button>
            <button class="btn btn-danger btn-sm" onclick="UI.promptDeleteSubject('${subj.id}')">Delete</button>
          </div>
        </div>
      `;
    }).join('');
  },

  // ==========================================
  // EXAMS RENDERING
  // ==========================================
  renderExams() {
    const state = window.StudyFlowState.getState();
    const container = document.getElementById('examsListContainer');
    if (!container) return;

    this.renderExamPriorities();

    const examData = window.StudyFlowAnalytics.getExamData(state.exams, state.subjects);

    // Update tab counts
    const upCountEl = document.getElementById('upcomingExamsCount');
    if (upCountEl) upCountEl.textContent = examData.upcoming.length;
    const pastCountEl = document.getElementById('pastExamsCount');
    if (pastCountEl) pastCountEl.textContent = examData.past.length;

    const targetList = this.examTab === 'upcoming' ? examData.upcoming : examData.past;

    if (targetList.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <div class="empty-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="7"></circle><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline></svg>
          </div>
          <h3 class="empty-title">${this.examTab === 'upcoming' ? 'No Upcoming Exams' : 'No Past Exams'}</h3>
          <p class="empty-desc">${this.examTab === 'upcoming' ? 'You have no exams on your schedule right now.' : 'Completed tests and past exams will appear here.'}</p>
          ${this.examTab === 'upcoming' ? '<button class="btn btn-primary" onclick="UI.openModal(\'examModal\')">+ Add Exam</button>' : ''}
        </div>
      `;
      return;
    }

    container.innerHTML = targetList.map(exam => {
      const subj = exam.subject;
      const subjColor = subj ? subj.color : '#8b5cf6';
      const subjName = subj ? subj.name : 'General / Unassigned';
      const diff = exam.difficulty || 'medium';
      const prep = exam.prepHours || 8;

      return `
        <div class="exam-card ${exam.isPast ? 'exam-past' : ''}">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.75rem;">
            <span class="exam-countdown-pill" style="margin-bottom:0;">${exam.countdown}</span>
            <span class="badge-diff badge-diff-${diff}">${diff}</span>
          </div>
          <h3 class="exam-title">${this.escapeHtml(exam.title)}</h3>
          
          <div class="exam-details-list">
            <div class="exam-detail-row">
              <span class="subject-pill" style="background:${subjColor}1f; color:${subjColor};">
                <span class="subject-color-dot" style="background:${subjColor};"></span>
                ${this.escapeHtml(subjName)}
              </span>
              <span class="text-xs text-muted" style="margin-left:auto;">${prep}h prep target</span>
            </div>
            <div class="exam-detail-row">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
              <span>${exam.examDate} ${exam.examTime ? 'at ' + exam.examTime : ''}</span>
            </div>
            ${exam.location ? `
              <div class="exam-detail-row">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                <span>${this.escapeHtml(exam.location)}</span>
              </div>
            ` : ''}
          </div>

          ${exam.notes ? `
            <div class="exam-notes-box">${this.escapeHtml(exam.notes)}</div>
          ` : ''}

          <div class="exam-card-actions">
            <button class="btn btn-secondary btn-sm" onclick="UI.openEditExamModal('${exam.id}')">Edit</button>
            <button class="btn btn-danger btn-sm" onclick="UI.handleDeleteExam('${exam.id}')">Delete</button>
          </div>
        </div>
      `;
    }).join('');
  },

  // ==========================================
  // STUDY SCHEDULE (7-DAY MATRIX) RENDERING
  // ==========================================
  renderSchedule() {
    const state = window.StudyFlowState.getState();
    const grid = document.getElementById('scheduleWeekGrid');
    if (!grid) return;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Monday of current week
    const currentDay = today.getDay(); // 0 is Sunday
    const distanceToMonday = (currentDay + 6) % 7;
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - distanceToMonday);

    const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    grid.innerHTML = daysOfWeek.map((dayName, idx) => {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + idx);
      const dStr = d.toISOString().slice(0, 10);
      const isToday = window.StudyFlowAnalytics.isSameDay(d, now);

      const daySessions = state.sessions.filter(s => s.date === dStr);
      daySessions.sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));

      return `
        <div class="calendar-day-col ${isToday ? 'is-today' : ''}">
          <div class="day-col-header">
            <span class="day-col-name">${dayName}</span>
            <div class="day-col-date">${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
          </div>
          <div class="day-sessions-container">
            ${daySessions.length === 0 ? `
              <div class="empty-day-text">No sessions</div>
            ` : daySessions.map(sess => {
              const subj = sess.subjectId ? window.StudyFlowState.getSubject(sess.subjectId) : null;
              const subjColor = subj ? subj.color : '#8b5cf6';
              const subjName = subj ? subj.name : 'General Study';

              return `
                <div class="session-chip ${sess.completed ? 'completed' : ''}" style="border-left-color:${subjColor};">
                  <div class="session-time-str">
                    <span>${sess.startTime}</span>
                    <button class="custom-checkbox ${sess.completed ? 'checked' : ''}" style="width:16px;height:16px;" onclick="UI.handleSessionCheckbox('${sess.id}')" title="Toggle complete">
                      ${sess.completed ? '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>' : ''}
                    </button>
                  </div>
                  <span class="session-subject-lbl" style="color:${subjColor};">${this.escapeHtml(subjName)}</span>
                  ${sess.topic ? `<span class="session-topic-lbl">${this.escapeHtml(sess.topic)}</span>` : ''}
                  <div class="session-actions">
                    <button class="icon-btn" style="width:24px;height:24px;" onclick="UI.openEditSessionModal('${sess.id}')" title="Edit session">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    </button>
                    <button class="icon-btn text-danger" style="width:24px;height:24px;" onclick="UI.handleDeleteSession('${sess.id}')" title="Delete session">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }).join('');
  },

  // ==========================================
  // FOCUS TIMER RENDERING
  // ==========================================
  renderTimer() {
    const timer = window.StudyFlowTimer;
    if (!timer) return;

    // Digits
    const digitsEl = document.getElementById('timerTimeDigits');
    if (digitsEl) digitsEl.textContent = timer.formatTime(timer.remainingSeconds);

    const sidebarTimerEl = document.getElementById('sidebarTimerDisplay');
    if (sidebarTimerEl) sidebarTimerEl.textContent = timer.formatTime(timer.remainingSeconds);

    // Mode tabs
    document.querySelectorAll('.timer-mode-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === timer.mode);
    });

    // Mode badge
    const modeBadge = document.getElementById('timerModeBadge');
    if (modeBadge) {
      const modeLabels = {
        focus: 'FOCUS SESSION',
        shortBreak: 'SHORT BREAK',
        longBreak: 'LONG BREAK'
      };
      modeBadge.textContent = modeLabels[timer.mode] || 'FOCUS SESSION';
    }

    // Play/Pause button state
    const playBtnText = document.getElementById('timerPlayBtnText');
    const playIcon = document.getElementById('timerPlayIcon');
    const sqtPlayIcon = document.getElementById('sqtPlayIcon');

    if (timer.status === 'running') {
      if (playBtnText) playBtnText.textContent = 'Pause';
      const pauseSvg = '<rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect>';
      if (playIcon) playIcon.innerHTML = pauseSvg;
      if (sqtPlayIcon) sqtPlayIcon.innerHTML = pauseSvg;
    } else if (timer.status === 'paused') {
      if (playBtnText) playBtnText.textContent = 'Resume';
      const playSvg = '<polygon points="5 3 19 12 5 21 5 3"></polygon>';
      if (playIcon) playIcon.innerHTML = playSvg;
      if (sqtPlayIcon) sqtPlayIcon.innerHTML = playSvg;
    } else {
      if (playBtnText) playBtnText.textContent = timer.mode === 'focus' ? 'Start Focus' : 'Start Break';
      const playSvg = '<polygon points="5 3 19 12 5 21 5 3"></polygon>';
      if (playIcon) playIcon.innerHTML = playSvg;
      if (sqtPlayIcon) sqtPlayIcon.innerHTML = playSvg;
    }

    // Circular progress dial SVG update
    const dialProgress = document.getElementById('timerDialProgress');
    if (dialProgress) {
      const radius = 120;
      const circumference = 2 * Math.PI * radius;
      const progressPercent = Math.min(100, Math.max(0, ((timer.initialSeconds - timer.remainingSeconds) / timer.initialSeconds) * 100));
      const offset = circumference - (progressPercent / 100) * circumference;

      dialProgress.style.strokeDasharray = `${circumference}`;
      dialProgress.style.strokeDashoffset = `${offset}`;
    }

    // Status Hint
    const statusHint = document.getElementById('timerStatusHint');
    if (statusHint) {
      if (timer.status === 'running') statusHint.textContent = 'Stay locked in. You are doing great!';
      else if (timer.status === 'paused') statusHint.textContent = 'Paused. Take a deep breath.';
      else statusHint.textContent = 'Ready to begin';
    }

    // Sync input values in settings
    const settings = window.StudyFlowState.getState().settings || {};
    const inFocus = document.getElementById('inputFocusMins');
    const inShort = document.getElementById('inputShortBreakMins');
    const inLong = document.getElementById('inputLongBreakMins');
    if (inFocus && document.activeElement !== inFocus) inFocus.value = settings.focusDuration || 25;
    if (inShort && document.activeElement !== inShort) inShort.value = settings.shortBreakDuration || 5;
    if (inLong && document.activeElement !== inLong) inLong.value = settings.longBreakDuration || 15;
  },

  // ==========================================
  // PROGRESS & ANALYTICS RENDERING
  // ==========================================
  renderProgress() {
    const state = window.StudyFlowState.getState();
    const taskStats = window.StudyFlowAnalytics.getTaskStats(state.tasks, state.subjects);
    const focusStats = window.StudyFlowAnalytics.getFocusStats(state.focusLogs, state.tasks);

    // Hero 1: Streak
    const streakVal = document.getElementById('progressStreakVal');
    if (streakVal) streakVal.textContent = `${focusStats.streak} ${focusStats.streak === 1 ? 'Day' : 'Days'}`;

    // Hero 2: Today Focus
    const todayVal = document.getElementById('progressTodayFocusVal');
    if (todayVal) todayVal.textContent = window.StudyFlowAnalytics.formatDuration(focusStats.todayMinutes);
    const weekSub = document.getElementById('progressWeekFocusSub');
    if (weekSub) weekSub.textContent = `${window.StudyFlowAnalytics.formatDuration(focusStats.thisWeekMinutes)} logged this week`;

    // Hero 3: All-time Focus
    const allVal = document.getElementById('progressAllTimeFocusVal');
    if (allVal) allVal.textContent = window.StudyFlowAnalytics.formatDuration(focusStats.allTimeMinutes);

    // Weekly Focus SVG Bar Chart
    const barContainer = document.getElementById('weeklyFocusChartContainer');
    if (barContainer) {
      barContainer.innerHTML = window.StudyFlowAnalytics.renderFocusBarChart(focusStats.dailyData);
    }

    // Donut Task Completion Chart
    const donutContainer = document.getElementById('taskDonutContainer');
    if (donutContainer) {
      donutContainer.innerHTML = window.StudyFlowAnalytics.renderDonutChart(taskStats.rate, 110, 10);
    }

    // Donut breakdown counts
    const doneCount = document.getElementById('progressDoneCount');
    if (doneCount) doneCount.textContent = taskStats.completed;
    const pendingCount = document.getElementById('progressPendingCount');
    if (pendingCount) pendingCount.textContent = taskStats.pending;
    const overdueCount = document.getElementById('progressOverdueCount');
    if (overdueCount) overdueCount.textContent = taskStats.overdue;

    // Subject Breakdown list
    const subjectList = document.getElementById('progressSubjectList');
    if (subjectList) {
      if (taskStats.bySubject.length === 0) {
        subjectList.innerHTML = `<p class="text-muted" style="font-size:0.85rem;padding:1rem 0;">No tasks created yet to calculate subject progress.</p>`;
      } else {
        subjectList.innerHTML = taskStats.bySubject.map(item => `
          <div class="subj-prog-row">
            <div class="subj-prog-header">
              <span style="font-weight:600;display:flex;align-items:center;gap:0.4rem;">
                <span class="subject-color-dot" style="background:${item.color};"></span>
                ${this.escapeHtml(item.name)}
              </span>
              <span class="text-muted">${item.completed}/${item.total} tasks (${item.rate}%)</span>
            </div>
            <div class="subj-prog-bar-track">
              <div class="subj-prog-bar-fill" style="width:${item.rate}%;background:${item.color};"></div>
            </div>
          </div>
        `).join('');
      }
    }
  },

  // Populate all <select> elements that list subjects
  populateSubjectSelects() {
    const subjects = window.StudyFlowState.getSubjects();

    const updateSelect = (selectId, includeAllOption = false, includeUnassigned = true) => {
      const select = document.getElementById(selectId);
      if (!select) return;

      const currentVal = select.value;
      let html = '';

      if (includeAllOption) {
        html += '<option value="all">All Subjects</option>';
      }
      if (includeUnassigned) {
        html += '<option value="">General / Unassigned</option>';
      }

      subjects.forEach(s => {
        html += `<option value="${s.id}">${this.escapeHtml(s.name)}${s.code ? ' (' + this.escapeHtml(s.code) + ')' : ''}</option>`;
      });

      select.innerHTML = html;
      if (currentVal && Array.from(select.options).some(o => o.value === currentVal)) {
        select.value = currentVal;
      }
    };

    updateSelect('taskFilterSubject', true, true);
    updateSelect('taskSubjectSelect', false, true);
    updateSelect('examSubjectSelect', false, true);
    updateSelect('sessionSubjectSelect', false, true);
    updateSelect('timerSubjectSelect', false, true);
    updateSelect('aiTutorSubjectSelect', false, true);
    updateSelect('flashcardFilterSubject', true, true);
    updateSelect('aiFcSubjectSelect', false, true);
    updateSelect('fcSubjectSelect', false, true);
  },

  // ==========================================
  // MODAL CONTROLS
  // ==========================================
  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.classList.add('active');

    // Focus first input
    const firstInput = modal.querySelector('input:not([type="hidden"]), select, textarea');
    if (firstInput) {
      setTimeout(() => firstInput.focus(), 60);
    }
  },

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.classList.remove('active');

    // Reset error messages
    modal.querySelectorAll('.field-error').forEach(el => {
      el.classList.remove('show');
      el.textContent = '';
    });
  },

  closeAllModals() {
    document.querySelectorAll('.modal-backdrop').forEach(m => m.classList.remove('active'));
  },

  // Task Modal Handlers
  openAddTaskModal() {
    document.getElementById('taskModalTitle').textContent = 'Add Task';
    document.getElementById('taskEditId').value = '';
    document.getElementById('taskTitleInput').value = '';
    document.getElementById('taskDescInput').value = '';
    document.getElementById('taskSubjectSelect').value = '';

    // Default due date = tomorrow
    const d = new Date();
    d.setDate(d.getDate() + 1);
    document.getElementById('taskDueDateInput').value = d.toISOString().slice(0, 10);
    document.getElementById('taskDueTimeInput').value = '23:59';

    const defaultPriorityRadio = document.querySelector('input[name="taskPriority"][value="medium"]');
    if (defaultPriorityRadio) defaultPriorityRadio.checked = true;

    this.openModal('taskModal');
  },

  openEditTaskModal(taskId) {
    const task = window.StudyFlowState.getTask(taskId);
    if (!task) return;

    document.getElementById('taskModalTitle').textContent = 'Edit Task';
    document.getElementById('taskEditId').value = task.id;
    document.getElementById('taskTitleInput').value = task.title;
    document.getElementById('taskDescInput').value = task.description || '';
    document.getElementById('taskSubjectSelect').value = task.subjectId || '';
    document.getElementById('taskDueDateInput').value = task.dueDate || '';
    document.getElementById('taskDueTimeInput').value = task.dueTime || '';

    const priorityRadio = document.querySelector(`input[name="taskPriority"][value="${task.priority}"]`);
    if (priorityRadio) priorityRadio.checked = true;

    this.openModal('taskModal');
  },

  handleSaveTask(e) {
    e.preventDefault();
    const editId = document.getElementById('taskEditId').value;
    const title = document.getElementById('taskTitleInput').value.trim();
    const subjectId = document.getElementById('taskSubjectSelect').value || null;
    const dueDate = document.getElementById('taskDueDateInput').value;
    const dueTime = document.getElementById('taskDueTimeInput').value;
    const desc = document.getElementById('taskDescInput').value.trim();
    const priority = document.querySelector('input[name="taskPriority"]:checked')?.value || 'medium';

    const titleError = document.getElementById('taskTitleError');
    const dateError = document.getElementById('taskDueDateError');

    titleError.classList.remove('show');
    dateError.classList.remove('show');

    if (!title) {
      titleError.textContent = 'Please enter a task title.';
      titleError.classList.add('show');
      return;
    }

    if (!dueDate) {
      dateError.textContent = 'Please select a valid due date.';
      dateError.classList.add('show');
      return;
    }

    try {
      if (editId) {
        window.StudyFlowState.updateTask(editId, {
          title,
          description: desc,
          subjectId,
          dueDate,
          dueTime,
          priority
        });
        this.showToast('Task updated successfully.', 'success');
      } else {
        window.StudyFlowState.addTask({
          title,
          description: desc,
          subjectId,
          dueDate,
          dueTime,
          priority
        });
        this.showToast('Task created successfully.', 'success');
      }
      this.closeModal('taskModal');
      this.renderAll();
    } catch (err) {
      titleError.textContent = err.message;
      titleError.classList.add('show');
    }
  },

  handleTaskCheckbox(taskId) {
    try {
      const task = window.StudyFlowState.toggleTaskComplete(taskId);
      this.showToast(task.completed ? 'Task marked complete! 🎉' : 'Task marked incomplete.', 'info');
      this.renderAll();
    } catch (err) {
      console.error(err);
    }
  },

  handleDeleteTask(taskId) {
    if (confirm('Are you sure you want to delete this task?')) {
      window.StudyFlowState.deleteTask(taskId);
      this.showToast('Task deleted.', 'info');
      this.renderAll();
    }
  },

  // Subject Modal Handlers
  openAddSubjectModal() {
    document.getElementById('subjectModalTitle').textContent = 'Add Subject';
    document.getElementById('subjectEditId').value = '';
    document.getElementById('subjectNameInput').value = '';
    document.getElementById('subjectCodeInput').value = '';
    document.getElementById('subjectDescInput').value = '';
    document.getElementById('subjectCustomColorInput').value = '#8b5cf6';

    document.querySelectorAll('#subjectColorPresets .color-dot').forEach((dot, idx) => {
      dot.classList.toggle('active', idx === 0);
    });

    this.openModal('subjectModal');
  },

  openEditSubjectModal(subjectId) {
    const subj = window.StudyFlowState.getSubject(subjectId);
    if (!subj) return;

    document.getElementById('subjectModalTitle').textContent = 'Edit Subject';
    document.getElementById('subjectEditId').value = subj.id;
    document.getElementById('subjectNameInput').value = subj.name;
    document.getElementById('subjectCodeInput').value = subj.code || '';
    document.getElementById('subjectDescInput').value = subj.description || '';
    document.getElementById('subjectCustomColorInput').value = subj.color;

    document.querySelectorAll('#subjectColorPresets .color-dot').forEach(dot => {
      dot.classList.toggle('active', dot.dataset.color.toLowerCase() === subj.color.toLowerCase());
    });

    this.openModal('subjectModal');
  },

  handleSaveSubject(e) {
    e.preventDefault();
    const editId = document.getElementById('subjectEditId').value;
    const name = document.getElementById('subjectNameInput').value.trim();
    const code = document.getElementById('subjectCodeInput').value.trim();
    const desc = document.getElementById('subjectDescInput').value.trim();

    // Determine chosen color
    const activeDot = document.querySelector('#subjectColorPresets .color-dot.active');
    const color = activeDot ? activeDot.dataset.color : document.getElementById('subjectCustomColorInput').value;

    const nameError = document.getElementById('subjectNameError');
    nameError.classList.remove('show');

    if (!name) {
      nameError.textContent = 'Please enter a subject name.';
      nameError.classList.add('show');
      return;
    }

    try {
      if (editId) {
        window.StudyFlowState.updateSubject(editId, { name, code, description: desc, color });
        this.showToast('Subject updated.', 'success');
      } else {
        window.StudyFlowState.addSubject({ name, code, description: desc, color });
        this.showToast('Subject added.', 'success');
      }
      this.closeModal('subjectModal');
      this.renderAll();
    } catch (err) {
      nameError.textContent = err.message;
      nameError.classList.add('show');
    }
  },

  promptDeleteSubject(subjectId) {
    const subj = window.StudyFlowState.getSubject(subjectId);
    if (!subj) return;

    this.subjectPendingDeleteId = subjectId;
    const stats = window.StudyFlowState.getSubjectStats(subjectId);
    const textEl = document.getElementById('deleteSubjectConfirmText');
    if (textEl) {
      textEl.innerHTML = `Are you sure you want to delete <strong>${this.escapeHtml(subj.name)}</strong>?<br><br>This subject currently has <strong>${stats.totalTasks} tasks</strong> and <strong>${stats.totalExams} exams</strong> associated with it.`;
    }

    this.openModal('deleteSubjectModal');
  },

  confirmDeleteSubject() {
    if (!this.subjectPendingDeleteId) return;

    const choice = document.querySelector('input[name="deleteAssociatedChoice"]:checked')?.value || 'keep';
    const deleteAssociated = choice === 'delete';

    try {
      window.StudyFlowState.deleteSubject(this.subjectPendingDeleteId, deleteAssociated);
      this.showToast(deleteAssociated ? 'Subject and associated items deleted.' : 'Subject deleted (items kept unassigned).', 'info');
      this.subjectPendingDeleteId = null;
      this.closeModal('deleteSubjectModal');
      this.renderAll();
    } catch (err) {
      console.error(err);
    }
  },

  // Exam Modal Handlers
  openAddExamModal() {
    document.getElementById('examModalTitle').textContent = 'Add Exam';
    document.getElementById('examEditId').value = '';
    document.getElementById('examTitleInput').value = '';
    document.getElementById('examSubjectSelect').value = '';
    document.getElementById('examLocationInput').value = '';
    document.getElementById('examNotesInput').value = '';
    document.getElementById('examDifficultySelect').value = 'medium';
    document.getElementById('examPrepHoursInput').value = '8';

    const d = new Date();
    d.setDate(d.getDate() + 7);
    document.getElementById('examDateInput').value = d.toISOString().slice(0, 10);
    document.getElementById('examTimeInput').value = '10:00';

    this.openModal('examModal');
  },

  openEditExamModal(examId) {
    const exam = window.StudyFlowState.getExam(examId);
    if (!exam) return;

    document.getElementById('examModalTitle').textContent = 'Edit Exam';
    document.getElementById('examEditId').value = exam.id;
    document.getElementById('examTitleInput').value = exam.title;
    document.getElementById('examSubjectSelect').value = exam.subjectId || '';
    document.getElementById('examDateInput').value = exam.examDate;
    document.getElementById('examTimeInput').value = exam.examTime || '';
    document.getElementById('examLocationInput').value = exam.location || '';
    document.getElementById('examNotesInput').value = exam.notes || '';
    document.getElementById('examDifficultySelect').value = exam.difficulty || 'medium';
    document.getElementById('examPrepHoursInput').value = exam.prepHours || 8;

    this.openModal('examModal');
  },

  handleSaveExam(e) {
    e.preventDefault();
    const editId = document.getElementById('examEditId').value;
    const title = document.getElementById('examTitleInput').value.trim();
    const subjectId = document.getElementById('examSubjectSelect').value || null;
    const examDate = document.getElementById('examDateInput').value;
    const examTime = document.getElementById('examTimeInput').value;
    const location = document.getElementById('examLocationInput').value.trim();
    const notes = document.getElementById('examNotesInput').value.trim();
    const difficulty = document.getElementById('examDifficultySelect').value || 'medium';
    const prepHours = parseInt(document.getElementById('examPrepHoursInput').value, 10) || 8;

    const titleError = document.getElementById('examTitleError');
    const dateError = document.getElementById('examDateError');
    titleError.classList.remove('show');
    dateError.classList.remove('show');

    if (!title) {
      titleError.textContent = 'Please enter an exam title.';
      titleError.classList.add('show');
      return;
    }
    if (!examDate) {
      dateError.textContent = 'Please select the exam date.';
      dateError.classList.add('show');
      return;
    }

    try {
      if (editId) {
        window.StudyFlowState.updateExam(editId, { title, subjectId, examDate, examTime, location, notes, difficulty, prepHours });
        this.showToast('Exam updated.', 'success');
      } else {
        window.StudyFlowState.addExam({ title, subjectId, examDate, examTime, location, notes, difficulty, prepHours });
        this.showToast('Exam scheduled with difficulty rating.', 'success');
      }
      this.closeModal('examModal');
      this.renderAll();
    } catch (err) {
      titleError.textContent = err.message;
      titleError.classList.add('show');
    }
  },

  handleDeleteExam(examId) {
    if (confirm('Are you sure you want to delete this exam?')) {
      window.StudyFlowState.deleteExam(examId);
      this.showToast('Exam deleted.', 'info');
      this.renderAll();
    }
  },

  // Study Session Modal Handlers
  openAddSessionModal(initialDate = null) {
    document.getElementById('sessionModalTitle').textContent = 'Add Study Session';
    document.getElementById('sessionEditId').value = '';
    document.getElementById('sessionSubjectSelect').value = '';
    document.getElementById('sessionTopicInput').value = '';
    document.getElementById('sessionTimeInput').value = '10:00';
    document.getElementById('sessionDurationInput').value = '60';

    const dStr = initialDate || new Date().toISOString().slice(0, 10);
    document.getElementById('sessionDateInput').value = dStr;

    this.openModal('sessionModal');
  },

  openEditSessionModal(sessionId) {
    const s = window.StudyFlowState.getSession(sessionId);
    if (!s) return;

    document.getElementById('sessionModalTitle').textContent = 'Edit Study Session';
    document.getElementById('sessionEditId').value = s.id;
    document.getElementById('sessionSubjectSelect').value = s.subjectId || '';
    document.getElementById('sessionTopicInput').value = s.topic || '';
    document.getElementById('sessionDateInput').value = s.date;
    document.getElementById('sessionTimeInput').value = s.startTime || '10:00';
    document.getElementById('sessionDurationInput').value = String(s.duration || 60);

    this.openModal('sessionModal');
  },

  handleSaveSession(e) {
    e.preventDefault();
    const editId = document.getElementById('sessionEditId').value;
    const subjectId = document.getElementById('sessionSubjectSelect').value || null;
    const topic = document.getElementById('sessionTopicInput').value.trim();
    const date = document.getElementById('sessionDateInput').value;
    const startTime = document.getElementById('sessionTimeInput').value;
    const duration = document.getElementById('sessionDurationInput').value;

    const dateError = document.getElementById('sessionDateError');
    dateError.classList.remove('show');

    if (!date) {
      dateError.textContent = 'Please choose a session date.';
      dateError.classList.add('show');
      return;
    }

    try {
      if (editId) {
        window.StudyFlowState.updateSession(editId, { subjectId, topic, date, startTime, duration });
        this.showToast('Study session updated.', 'success');
      } else {
        window.StudyFlowState.addSession({ subjectId, topic, date, startTime, duration });
        this.showToast('Study session added to schedule.', 'success');
      }
      this.closeModal('sessionModal');
      this.renderAll();
    } catch (err) {
      dateError.textContent = err.message;
      dateError.classList.add('show');
    }
  },

  handleSessionCheckbox(sessionId) {
    try {
      const s = window.StudyFlowState.toggleSessionComplete(sessionId);
      this.showToast(s.completed ? 'Session marked complete! 🎯' : 'Session reset.', 'info');
      this.renderAll();
    } catch (err) {
      console.error(err);
    }
  },

  handleDeleteSession(sessionId) {
    if (confirm('Delete this planned study session?')) {
      window.StudyFlowState.deleteSession(sessionId);
      this.showToast('Session removed.', 'info');
      this.renderAll();
    }
  },

  // ==========================================
  // BACKUP, DEMO & DATA IMPORT/EXPORT
  // ==========================================
  handleExport() {
    try {
      const json = window.StudyFlowState.exportData();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `studyflow-backup-${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      this.showToast('Backup JSON downloaded successfully.', 'success');
    } catch (e) {
      this.showToast('Failed to export data.', 'error');
    }
  },

  handleImport(file) {
    const errorEl = document.getElementById('importErrorText');
    errorEl.classList.remove('show');

    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target.result;
        const res = window.StudyFlowState.importData(content);
        if (res.success) {
          this.showToast(`Imported ${res.stats.subjects} subjects, ${res.stats.tasks} tasks, and ${res.stats.exams} exams!`, 'success');
          this.closeModal('privacyModal');
          this.renderAll();
        }
      } catch (err) {
        errorEl.textContent = err.message;
        errorEl.classList.add('show');
      }
    };
    reader.onerror = () => {
      errorEl.textContent = 'Could not read file from disk.';
      errorEl.classList.add('show');
    };
    reader.readAsText(file);
  },

  handleLoadDemo() {
    if (confirm('Load sample courses, tasks, exams, and schedule? (This will add demo items to test the dashboard)')) {
      window.StudyFlowState.loadDemoData();
      this.showToast('Sample student demo data loaded! 🚀', 'success');
      this.closeModal('privacyModal');
      this.renderAll();
    }
  },

  handleResetAll() {
    if (confirm('⚠️ WARNING: This will completely delete all subjects, tasks, exams, and study logs from this browser. Are you sure?')) {
      if (confirm('Final confirmation: Reset all StudyFlow data to zero?')) {
        window.StudyFlowState.resetAllData();
        this.showToast('All data has been reset.', 'info');
        this.closeModal('privacyModal');
        this.renderAll();
      }
    }
  },

  // ==========================================
  // TOAST NOTIFICATIONS
  // ==========================================
  showToast(message, type = 'info', duration = 3200) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let iconSvg = '';
    if (type === 'success') {
      iconSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>';
    } else if (type === 'error') {
      iconSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>';
    } else {
      iconSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';
    }

    toast.innerHTML = `
      ${iconSvg}
      <span class="toast-message">${this.escapeHtml(message)}</span>
      <button class="toast-close-btn" aria-label="Dismiss">&times;</button>
    `;

    toast.querySelector('.toast-close-btn').addEventListener('click', () => {
      toast.remove();
    });

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 250);
    }, duration);
  },

  // ==========================================
  // MOBILE DRAWER
  // ==========================================
  openMobileDrawer() {
    document.getElementById('sidebar')?.classList.add('open');
    document.getElementById('sidebarBackdrop')?.classList.add('active');
  },

  closeMobileDrawer() {
    document.getElementById('sidebar')?.classList.remove('open');
    document.getElementById('sidebarBackdrop')?.classList.remove('active');
  },

  // ==========================================
  // THEME TOGGLE
  // ==========================================
  toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
    this.applyTheme(nextTheme);
    window.StudyFlowState.setTheme(nextTheme);
  },

  applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    document.body.className = `theme-${theme}`;
  },

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },

  formatInlineMarkdown(text) {
    if (!text) return '';
    return this.escapeHtml(text)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code>$1</code>');
  },

  formatMarkdown(text) {
    if (!text) return '';
    let html = this.escapeHtml(text);
    html = html.replace(/^#### (.+)$/gm, '<h5 style="margin:0.5rem 0 0.25rem; font-size:0.95rem; font-weight:700;">$1</h5>');
    html = html.replace(/^### (.+)$/gm, '<h4 style="margin:0.75rem 0 0.35rem; font-size:1.05rem; font-weight:700; color:var(--primary);">$1</h4>');
    html = html.replace(/^## (.+)$/gm, '<h3 style="margin:0.85rem 0 0.4rem; font-size:1.15rem; font-weight:700;">$1</h3>');
    html = html.replace(/^> (.+)$/gm, '<blockquote style="border-left:3px solid var(--primary); padding-left:0.75rem; margin:0.5rem 0; color:var(--text-secondary); font-style:italic;">$1</blockquote>');
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    html = html.replace(/`([^`]+)`/g, '<code style="background:rgba(255,255,255,0.08); padding:0.15rem 0.35rem; border-radius:4px; font-family:monospace; font-size:0.85em;">$1</code>');
    html = html.replace(/^[•\-\*]\s+(.+)$/gm, '<li style="margin-left:1.25rem; margin-bottom:0.25rem;">$1</li>');
    html = html.replace(/\n\n/g, '<br><br>');
    html = html.replace(/\n/g, '<br>');
    return html;
  },

  // ==========================================
  // AI INSIGHTS WIDGET (DASHBOARD)
  // ==========================================
  renderAiInsightsWidget() {
    const widget = document.getElementById('dashAiInsightsWidget');
    if (!widget) return;
    const state = window.StudyFlowState.getState();
    const focusStats = window.StudyFlowAnalytics.getFocusStats(state.focusLogs, state.tasks);
    const insight = window.StudyFlowAI.generateDailyInsight(
      state.tasks,
      state.exams,
      state.sessions,
      focusStats,
      state.subjects
    );
    this.currentAiInsight = insight;

    const headlineEl = document.getElementById('dashAiHeadline');
    const recomEl = document.getElementById('dashAiRecommendation');
    const tipEl = document.getElementById('dashAiTipText');
    const actionBtn = document.getElementById('dashAiActionBtn');

    if (headlineEl) headlineEl.innerHTML = this.formatInlineMarkdown(insight.headline);
    if (recomEl) recomEl.innerHTML = this.formatInlineMarkdown(insight.recommendation);
    if (tipEl) tipEl.textContent = insight.studyTip;
    if (actionBtn) {
      actionBtn.textContent = insight.actionLabel;
      actionBtn.onclick = () => {
        this.switchView(insight.actionTarget);
      };
    }
  },

  // ==========================================
  // AI EXAM PRIORITIZATION (EXAMS VIEW)
  // ==========================================
  renderExamPriorities() {
    const listEl = document.getElementById('aiExamRankList');
    if (!listEl) return;
    const state = window.StudyFlowState.getState();
    const priorities = window.StudyFlowAI.getExamPriorities(state.exams, state.subjects);

    if (priorities.length === 0) {
      listEl.innerHTML = `
        <div style="padding: 1rem 0; color: var(--text-muted); font-size: 0.85rem; text-align: center;">
          No upcoming exams scheduled. Add an exam above and AI will formulate your priority study order.
        </div>
      `;
      return;
    }

    listEl.innerHTML = priorities.map((item, idx) => {
      const subj = item.subject;
      const subjColor = subj ? subj.color : '#8b5cf6';
      const subjName = subj ? subj.name : 'General';
      const diff = item.difficulty || 'medium';

      return `
        <div class="ai-exam-rank-item">
          <div class="ai-rank-badge">#${idx + 1}</div>
          <div class="ai-rank-info">
            <div class="ai-rank-title-row">
              <span class="ai-rank-exam-name">${this.escapeHtml(item.title)}</span>
              <span class="badge-diff badge-diff-${diff}">${diff.toUpperCase()}</span>
              <span class="subject-pill" style="background:${subjColor}1f; color:${subjColor}; margin-left:auto;">
                <span class="subject-color-dot" style="background:${subjColor};"></span>
                ${this.escapeHtml(subjName)}
              </span>
            </div>
            <p class="ai-rank-recommendation">${this.escapeHtml(item.recommendation)}</p>
            <div class="ai-rank-meta">
              <span>⏰ ${item.daysLeft} days left</span>
              <span>🎯 ${item.prepHours}h prep goal</span>
              <span>⚡ Priority Score: ${item.priorityScore}</span>
            </div>
          </div>
        </div>
      `;
    }).join('');
  },

  // ==========================================
  // AI TEACHER VIEW
  // ==========================================
  renderAiTeacher() {
    const container = document.getElementById('aiChatMessagesContainer');
    if (!container) return;

    const messages = window.StudyFlowState.getAiMessages();
    if (messages.length === 0) {
      container.innerHTML = `
        <div class="ai-chat-bubble assistant">
          <div class="ai-bubble-avatar">🤖</div>
          <div class="ai-bubble-body">
            <div class="ai-bubble-text">
              <p><strong>👋 Welcome to your StudyFlow AI Teacher!</strong></p>
              <p>I'm your 24/7 academic tutor. You can ask me to explain tough formulas, summarize lecture notes, provide practice quizzes, or break down problems step-by-step.</p>
              <p>Type your question below or click any of the quick prompt chips on the left to get started!</p>
            </div>
            <span class="ai-bubble-time">Just now</span>
          </div>
        </div>
      `;
      return;
    }

    container.innerHTML = messages.map(msg => {
      const isUser = msg.role === 'user';
      const avatar = isUser ? '👤' : '🤖';
      const timeStr = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
      const formatted = isUser ? this.escapeHtml(msg.text).replace(/\n/g, '<br>') : this.formatMarkdown(msg.text);

      return `
        <div class="ai-chat-bubble ${isUser ? 'user' : 'assistant'}">
          <div class="ai-bubble-avatar">${avatar}</div>
          <div class="ai-bubble-body">
            <div class="ai-bubble-text">${formatted}</div>
            <span class="ai-bubble-time">${timeStr}</span>
          </div>
        </div>
      `;
    }).join('');

    container.scrollTop = container.scrollHeight;
  },

  async handleSendAiChatMessage() {
    const inputEl = document.getElementById('aiChatInput');
    const sendBtn = document.getElementById('aiChatSendBtn');
    const subjectSelect = document.getElementById('aiTutorSubjectSelect');
    const query = inputEl?.value?.trim();
    if (!query) return;

    const subjectName = subjectSelect?.selectedOptions?.[0]?.text || 'General Academic';

    // Add User message
    window.StudyFlowState.addAiMessage({ role: 'user', text: query });
    inputEl.value = '';
    this.renderAiTeacher();

    // Show typing bubble
    const container = document.getElementById('aiChatMessagesContainer');
    const typingBubble = document.createElement('div');
    typingBubble.className = 'ai-chat-bubble assistant typing-bubble';
    typingBubble.id = 'aiTypingIndicator';
    typingBubble.innerHTML = `
      <div class="ai-bubble-avatar">🤖</div>
      <div class="ai-bubble-body">
        <div class="ai-bubble-text" style="display:flex; align-items:center; gap:6px; color:var(--text-muted); font-size:0.85rem;">
          <span class="ai-pulse-dot" style="width:8px; height:8px;"></span>
          <span>StudyFlow AI is thinking and formulating explanation...</span>
        </div>
      </div>
    `;
    container.appendChild(typingBubble);
    container.scrollTop = container.scrollHeight;

    if (sendBtn) sendBtn.disabled = true;

    try {
      const reply = await window.StudyFlowAI.askTutor(query, subjectName);
      const typingEl = document.getElementById('aiTypingIndicator');
      if (typingEl) typingEl.remove();

      window.StudyFlowState.addAiMessage({ role: 'assistant', text: reply });
      this.renderAiTeacher();
    } catch (err) {
      const typingEl = document.getElementById('aiTypingIndicator');
      if (typingEl) typingEl.remove();

      window.StudyFlowState.addAiMessage({
        role: 'assistant',
        text: `⚠️ **Teacher Offline Notice:** I encountered a temporary connection issue (${err.message}). Please try asking your question again.`
      });
      this.renderAiTeacher();
    } finally {
      if (sendBtn) sendBtn.disabled = false;
      inputEl.focus();
    }
  },

  // ==========================================
  // FLASHCARDS (ACTIVE RECALL & 3D STUDY)
  // ==========================================
  renderFlashcards() {
    const state = window.StudyFlowState.getState();
    const filterSubj = document.getElementById('flashcardFilterSubject')?.value || 'all';

    let filtered = [...state.flashcards];
    if (filterSubj !== 'all') {
      filtered = filtered.filter(f => f.subjectId === filterSubj);
    }

    const counterEl = document.getElementById('flashcardDeckCounter');
    if (counterEl) {
      counterEl.textContent = `${filtered.length} ${filtered.length === 1 ? 'card' : 'cards'} in deck`;
    }

    // 1. Render 3D Study Flipper
    const studyContainer = document.getElementById('flashcardStudyContainer');
    if (studyContainer) {
      if (filtered.length === 0) {
        studyContainer.innerHTML = `
          <div class="empty-state" style="width:100%; max-width:500px; padding:2.5rem 1.5rem;">
            <div class="empty-icon">🎴</div>
            <h3 class="empty-title">Deck is Empty</h3>
            <p class="empty-desc">Create your first active recall card manually or paste your notes to let AI generate cards instantly.</p>
            <div style="display:flex; gap:0.5rem; justify-content:center; flex-wrap:wrap;">
              <button class="btn btn-secondary btn-sm" onclick="UI.openAiFlashcardModal()">✨ AI Generate from Notes</button>
              <button class="btn btn-primary btn-sm" onclick="UI.openAddFlashcardModal()">+ Add Card</button>
            </div>
          </div>
        `;
      } else {
        if (this.flashcardIndex >= filtered.length) {
          this.flashcardIndex = 0;
        }
        if (this.flashcardIndex < 0) {
          this.flashcardIndex = filtered.length - 1;
        }

        const card = filtered[this.flashcardIndex];
        const subj = card.subjectId ? window.StudyFlowState.getSubject(card.subjectId) : null;
        const subjName = subj ? subj.name : 'General Deck';
        const subjColor = subj ? subj.color : '#8b5cf6';
        const flippedClass = this.isCardFlipped ? 'is-flipped' : '';

        studyContainer.innerHTML = `
          <div class="flashcard-perspective-box" onclick="UI.toggleFlashcardFlip()" role="button" tabindex="0" aria-label="Flip flashcard">
            <div class="flashcard-3d-card ${flippedClass}" id="active3dCard">
              <!-- Front Face -->
              <div class="flashcard-face flashcard-front">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <span class="fc-tag" style="color:${subjColor};">${this.escapeHtml(subjName)}</span>
                  <span class="badge-status ${card.mastery === 'mastered' ? 'badge-mastered' : 'badge-learning'}">${card.mastery === 'mastered' ? '★ Mastered' : 'Learning'}</span>
                </div>
                <div class="fc-text">${this.escapeHtml(card.front)}</div>
                <div class="fc-hint">💡 Tap to reveal answer (Flip)</div>
              </div>
              <!-- Back Face -->
              <div class="flashcard-face flashcard-back">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <span class="fc-tag" style="color:var(--accent-cyan);">ANSWER / RECALL</span>
                  <span class="text-xs text-muted">Reviewed ${card.reviewsCount || 0} times</span>
                </div>
                <div class="fc-text" style="font-size:1.1rem; font-weight:500;">${this.escapeHtml(card.back)}</div>
                <div class="fc-hint">🔄 Tap to flip back to question</div>
              </div>
            </div>
          </div>

          <!-- Controls Row -->
          <div class="flashcard-controls-row">
            <button class="btn btn-ghost btn-sm" onclick="UI.prevFlashcard()" title="Previous Card" aria-label="Previous card">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
            </button>
            
            <button class="btn btn-secondary btn-sm" style="border-color: #ef4444; color: #f87171;" onclick="UI.rateFlashcard('${card.id}', false)">
              🔁 Study Again
            </button>

            <span style="font-size:0.85rem; font-weight:600; color:var(--text-muted); min-width:85px; text-align:center;">
              ${this.flashcardIndex + 1} of ${filtered.length}
            </span>

            <button class="btn btn-secondary btn-sm" style="border-color: #10b981; color: #34d399;" onclick="UI.rateFlashcard('${card.id}', true)">
              ✓ Knew It!
            </button>

            <button class="btn btn-ghost btn-sm" onclick="UI.nextFlashcard()" title="Next Card" aria-label="Next card">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </button>
          </div>
        `;
      }
    }

    // 2. Render Cards Grid List
    const gridList = document.getElementById('flashcardsGridList');
    if (gridList) {
      if (filtered.length === 0) {
        gridList.innerHTML = `<p style="grid-column: 1/-1; color: var(--text-muted); font-size: 0.9rem; text-align: center; padding: 1.5rem;">No flashcards found for this subject filter.</p>`;
      } else {
        gridList.innerHTML = filtered.map(card => {
          const subj = card.subjectId ? window.StudyFlowState.getSubject(card.subjectId) : null;
          const subjName = subj ? subj.name : 'General';
          const subjColor = subj ? subj.color : '#8b5cf6';
          const isMastered = card.mastery === 'mastered';

          return `
            <div class="fc-list-item card">
              <div>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
                  <span class="subject-pill" style="background:${subjColor}1f; color:${subjColor}; font-size:0.75rem;">
                    <span class="subject-color-dot" style="background:${subjColor};"></span>
                    ${this.escapeHtml(subjName)}
                  </span>
                  <span class="badge-status ${isMastered ? 'badge-mastered' : 'badge-learning'}" style="font-size:0.7rem;">
                    ${isMastered ? '★ Mastered' : 'Learning'}
                  </span>
                </div>
                <strong style="font-size:0.95rem; display:block; margin-bottom:0.35rem; color:var(--text-primary);">${this.escapeHtml(card.front)}</strong>
                <p style="font-size:0.85rem; color:var(--text-secondary); margin:0; line-height:1.4;">${this.escapeHtml(card.back)}</p>
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center; margin-top:0.75rem; padding-top:0.5rem; border-top:1px solid var(--border-subtle);">
                <span class="text-xs text-muted">${card.reviewsCount || 0} reviews</span>
                <div style="display:flex; gap:0.25rem;">
                  <button class="btn btn-ghost btn-sm" onclick="UI.openEditFlashcardModal('${card.id}')" title="Edit Card" style="padding:4px 8px;">Edit</button>
                  <button class="btn btn-danger btn-sm" onclick="UI.handleDeleteFlashcard('${card.id}')" title="Delete Card" style="padding:4px 8px;">Delete</button>
                </div>
              </div>
            </div>
          `;
        }).join('');
      }
    }
  },

  toggleFlashcardFlip() {
    this.isCardFlipped = !this.isCardFlipped;
    const cardEl = document.getElementById('active3dCard');
    if (cardEl) {
      cardEl.classList.toggle('is-flipped', this.isCardFlipped);
    }
  },

  nextFlashcard() {
    this.flashcardIndex++;
    this.isCardFlipped = false;
    this.renderFlashcards();
  },

  prevFlashcard() {
    this.flashcardIndex--;
    this.isCardFlipped = false;
    this.renderFlashcards();
  },

  rateFlashcard(cardId, knewIt) {
    window.StudyFlowState.recordCardReview(cardId, knewIt);
    this.isCardFlipped = false;
    this.flashcardIndex++;
    this.showToast(knewIt ? 'Marked as Mastered! 🌟' : 'Marked for Review 🔁', 'info', 1500);
    this.renderFlashcards();
  },

  // ==========================================
  // FLASHCARD MODALS & CRUD
  // ==========================================
  openAiFlashcardModal() {
    const notesInput = document.getElementById('aiFcNotesInput');
    const errorEl = document.getElementById('aiFcNotesError');
    if (notesInput) notesInput.value = '';
    if (errorEl) {
      errorEl.textContent = '';
      errorEl.classList.remove('show');
    }
    this.openModal('aiFlashcardModal');
  },

  async handleGenerateFlashcards(e) {
    e.preventDefault();
    const notesInput = document.getElementById('aiFcNotesInput');
    const errorEl = document.getElementById('aiFcNotesError');
    const subjectId = document.getElementById('aiFcSubjectSelect')?.value || null;
    const submitBtn = document.getElementById('generateCardsSubmitBtn');

    const notesText = notesInput?.value?.trim();
    if (!notesText) {
      if (errorEl) {
        errorEl.textContent = 'Please enter or paste your study notes first.';
        errorEl.classList.add('show');
      }
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span>✨ Analyzing &amp; Generating...</span>';
    }

    try {
      const cards = await window.StudyFlowAI.generateFlashcardsFromNotes(notesText, subjectId);
      if (!cards || cards.length === 0) {
        throw new Error('Could not extract flashcard concepts. Try providing clearer notes or definitions.');
      }

      cards.forEach(card => {
        window.StudyFlowState.addFlashcard({
          subjectId: card.subjectId || subjectId,
          front: card.front,
          back: card.back
        });
      });

      this.closeModal('aiFlashcardModal');
      this.showToast(`✨ Generated ${cards.length} active recall flashcards!`, 'success');
      this.renderFlashcards();
    } catch (err) {
      if (errorEl) {
        errorEl.textContent = err.message || 'Generation failed.';
        errorEl.classList.add('show');
      }
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>Generate Flashcards</span>';
      }
    }
  },

  openAddFlashcardModal() {
    document.getElementById('flashcardModalTitle').textContent = 'Add Flashcard';
    document.getElementById('fcEditId').value = '';
    document.getElementById('fcFrontInput').value = '';
    document.getElementById('fcBackInput').value = '';
    document.getElementById('fcSubjectSelect').value = '';
    document.getElementById('fcFrontError').classList.remove('show');
    document.getElementById('fcBackError').classList.remove('show');
    this.openModal('flashcardModal');
  },

  openEditFlashcardModal(cardId) {
    const card = window.StudyFlowState.getFlashcard(cardId);
    if (!card) return;

    document.getElementById('flashcardModalTitle').textContent = 'Edit Flashcard';
    document.getElementById('fcEditId').value = card.id;
    document.getElementById('fcFrontInput').value = card.front;
    document.getElementById('fcBackInput').value = card.back;
    document.getElementById('fcSubjectSelect').value = card.subjectId || '';
    document.getElementById('fcFrontError').classList.remove('show');
    document.getElementById('fcBackError').classList.remove('show');
    this.openModal('flashcardModal');
  },

  handleSaveFlashcard(e) {
    e.preventDefault();
    const editId = document.getElementById('fcEditId').value;
    const front = document.getElementById('fcFrontInput').value.trim();
    const back = document.getElementById('fcBackInput').value.trim();
    const subjectId = document.getElementById('fcSubjectSelect').value || null;

    const frontError = document.getElementById('fcFrontError');
    const backError = document.getElementById('fcBackError');
    frontError.classList.remove('show');
    backError.classList.remove('show');

    if (!front) {
      frontError.textContent = 'Please enter the front question or term.';
      frontError.classList.add('show');
      return;
    }
    if (!back) {
      backError.textContent = 'Please enter the answer or explanation.';
      backError.classList.add('show');
      return;
    }

    try {
      if (editId) {
        window.StudyFlowState.updateFlashcard(editId, { front, back, subjectId });
        this.showToast('Flashcard updated.', 'success');
      } else {
        window.StudyFlowState.addFlashcard({ front, back, subjectId });
        this.showToast('Flashcard added to deck.', 'success');
      }
      this.closeModal('flashcardModal');
      this.renderFlashcards();
    } catch (err) {
      frontError.textContent = err.message;
      frontError.classList.add('show');
    }
  },

  handleDeleteFlashcard(cardId) {
    if (confirm('Delete this flashcard from your deck?')) {
      window.StudyFlowState.deleteFlashcard(cardId);
      this.showToast('Flashcard deleted.', 'info');
      this.renderFlashcards();
    }
  },

  // ==========================================
  // AI 5-HOUR STUDY PLANNER MODAL
  // ==========================================
  openAiPlanModal() {
    const state = window.StudyFlowState.getState();
    const plan = window.StudyFlowAI.generate5HourPlan(state.tasks, state.exams, state.subjects);
    this.currentAiPlan = plan;

    const rationaleEl = document.getElementById('aiPlanRationale');
    if (rationaleEl) {
      rationaleEl.innerHTML = `<strong>AI Plan Rationale:</strong> ${this.escapeHtml(plan.rationale)}<br><span class="text-xs text-muted" style="margin-top:4px; display:inline-block;">⚡ Total Focus: ${plan.totalFocusMinutes}m | Rest &amp; Reset: ${plan.totalBreakMinutes}m</span>`;
    }

    const blocksEl = document.getElementById('aiPlanBlocksList');
    if (blocksEl) {
      blocksEl.innerHTML = plan.blocks.map(block => {
        const isBreak = block.type === 'break';
        const badgeColor = isBreak ? 'var(--accent-emerald)' : 'var(--primary)';
        const icon = isBreak ? '☕' : '🎯';

        return `
          <div class="plan-block-item ${isBreak ? 'plan-block-break' : 'plan-block-focus'}">
            <div style="display:flex; align-items:center; gap:0.75rem;">
              <span style="font-size:1.1rem;">${icon}</span>
              <div>
                <div style="display:flex; align-items:center; gap:0.5rem;">
                  <strong style="font-size:0.9rem;">${this.escapeHtml(block.title)}</strong>
                  <span class="text-xs" style="color:${badgeColor}; font-weight:600;">${block.duration}m</span>
                </div>
                <p style="font-size:0.78rem; color:var(--text-muted); margin:0;">${this.escapeHtml(block.goal)}</p>
              </div>
            </div>
            <span style="font-size:0.8rem; font-weight:600; color:var(--text-secondary); white-space:nowrap; margin-left:0.75rem;">
              ${block.startTime} - ${block.endTime}
            </span>
          </div>
        `;
      }).join('');
    }

    this.openModal('aiPlanModal');
  },

  applyAiPlanToSchedule() {
    if (!this.currentAiPlan || !this.currentAiPlan.blocks) return;
    const state = window.StudyFlowState.getState();
    const todayStr = this.currentAiPlan.date || new Date().toISOString().slice(0, 10);

    let addedCount = 0;
    this.currentAiPlan.blocks.forEach(block => {
      if (block.type === 'focus') {
        let matchedSubjId = null;
        if (block.subject) {
          const found = state.subjects.find(s => s.name.toLowerCase() === block.subject.toLowerCase());
          if (found) matchedSubjId = found.id;
        }

        window.StudyFlowState.addSession({
          date: todayStr,
          startTime: block.startTime,
          duration: block.duration,
          subjectId: matchedSubjId,
          topic: block.title,
          notes: block.goal
        });
        addedCount++;
      }
    });

    this.closeModal('aiPlanModal');
    this.showToast(`Added ${addedCount} study blocks to today's schedule! 🚀`, 'success', 3500);
    this.switchView('schedule');
  },

  // ==========================================
  // GLOBAL EVENT BINDINGS
  // ==========================================
  bindGlobalEvents() {
    // Nav view switching (sidebar & bottom nav)
    document.addEventListener('click', (e) => {
      const navBtn = e.target.closest('[data-view]');
      if (navBtn) {
        e.preventDefault();
        this.switchView(navBtn.dataset.view);
      }
    });

    // Mobile drawer toggles
    document.getElementById('mobileMenuBtn')?.addEventListener('click', () => this.openMobileDrawer());
    document.getElementById('mobileDrawerClose')?.addEventListener('click', () => this.closeMobileDrawer());
    document.getElementById('sidebarBackdrop')?.addEventListener('click', () => this.closeMobileDrawer());

    // Theme toggles
    document.getElementById('themeToggleBtn')?.addEventListener('click', () => this.toggleTheme());
    document.getElementById('headerThemeToggleBtn')?.addEventListener('click', () => this.toggleTheme());

    // Quick Add Dropdown Toggle
    const quickAddTrigger = document.getElementById('quickAddTrigger');
    const quickAddDropdown = document.getElementById('quickAddDropdown');
    quickAddTrigger?.addEventListener('click', (e) => {
      e.stopPropagation();
      quickAddDropdown?.classList.toggle('show');
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.quick-add-menu-container')) {
        quickAddDropdown?.classList.remove('show');
      }
    });

    // Quick Add Items
    document.getElementById('quickAddTaskBtn')?.addEventListener('click', () => {
      quickAddDropdown?.classList.remove('show');
      this.openAddTaskModal();
    });
    document.getElementById('quickAddSubjectBtn')?.addEventListener('click', () => {
      quickAddDropdown?.classList.remove('show');
      this.openAddSubjectModal();
    });
    document.getElementById('quickAddExamBtn')?.addEventListener('click', () => {
      quickAddDropdown?.classList.remove('show');
      this.openAddExamModal();
    });
    document.getElementById('quickAddSessionBtn')?.addEventListener('click', () => {
      quickAddDropdown?.classList.remove('show');
      this.openAddSessionModal();
    });

    // Dashboard Action buttons
    document.getElementById('dashStartTimerBtn')?.addEventListener('click', () => {
      this.switchView('timer');
      window.StudyFlowTimer.start();
    });
    document.getElementById('dashQuickTaskBtn')?.addEventListener('click', () => this.openAddTaskModal());
    document.getElementById('dashViewAllTasksBtn')?.addEventListener('click', () => this.switchView('tasks'));
    document.getElementById('dashViewScheduleBtn')?.addEventListener('click', () => this.switchView('schedule'));

    // Tasks toolbar buttons & filters
    document.getElementById('openAddTaskModalBtn')?.addEventListener('click', () => this.openAddTaskModal());
    document.getElementById('taskSearchInput')?.addEventListener('input', (e) => {
      const clearBtn = document.getElementById('taskSearchClearBtn');
      if (clearBtn) clearBtn.style.display = e.target.value ? 'block' : 'none';
      this.renderTasks();
    });
    document.getElementById('taskSearchClearBtn')?.addEventListener('click', () => {
      const search = document.getElementById('taskSearchInput');
      if (search) search.value = '';
      document.getElementById('taskSearchClearBtn').style.display = 'none';
      this.renderTasks();
    });
    document.getElementById('taskFilterSubject')?.addEventListener('change', () => this.renderTasks());
    document.getElementById('taskFilterPriority')?.addEventListener('change', () => this.renderTasks());
    document.getElementById('taskFilterStatus')?.addEventListener('change', () => this.renderTasks());
    document.getElementById('taskSortOrder')?.addEventListener('change', () => this.renderTasks());

    // Subjects toolbar button
    document.getElementById('openAddSubjectModalBtn')?.addEventListener('click', () => this.openAddSubjectModal());

    // Exams toolbar button & tabs
    document.getElementById('openAddExamModalBtn')?.addEventListener('click', () => this.openAddExamModal());
    document.getElementById('tabUpcomingExams')?.addEventListener('click', () => {
      this.examTab = 'upcoming';
      document.getElementById('tabUpcomingExams')?.classList.add('active');
      document.getElementById('tabPastExams')?.classList.remove('active');
      this.renderExams();
    });
    document.getElementById('tabPastExams')?.addEventListener('click', () => {
      this.examTab = 'past';
      document.getElementById('tabPastExams')?.classList.add('active');
      document.getElementById('tabUpcomingExams')?.classList.remove('active');
      this.renderExams();
    });

    // Schedule toolbar button
    document.getElementById('openAddSessionModalBtn')?.addEventListener('click', () => this.openAddSessionModal());

    // Form Submissions
    document.getElementById('taskForm')?.addEventListener('submit', (e) => this.handleSaveTask(e));
    document.getElementById('subjectForm')?.addEventListener('submit', (e) => this.handleSaveSubject(e));
    document.getElementById('examForm')?.addEventListener('submit', (e) => this.handleSaveExam(e));
    document.getElementById('sessionForm')?.addEventListener('submit', (e) => this.handleSaveSession(e));

    // Delete Subject Confirm
    document.getElementById('confirmDeleteSubjectBtn')?.addEventListener('click', () => this.confirmDeleteSubject());

    // Subject Color Presets in Modal
    document.querySelectorAll('#subjectColorPresets .color-dot').forEach(dot => {
      dot.addEventListener('click', () => {
        document.querySelectorAll('#subjectColorPresets .color-dot').forEach(d => d.classList.remove('active'));
        dot.classList.add('active');
        const customInput = document.getElementById('subjectCustomColorInput');
        if (customInput) customInput.value = dot.dataset.color;
      });
    });

    document.getElementById('subjectCustomColorInput')?.addEventListener('input', (e) => {
      document.querySelectorAll('#subjectColorPresets .color-dot').forEach(d => d.classList.remove('active'));
    });

    // Modal close triggers
    document.querySelectorAll('[data-close-modal]').forEach(btn => {
      btn.addEventListener('click', () => {
        const modalId = btn.dataset.closeModal;
        if (modalId) this.closeModal(modalId);
      });
    });

    // Close on backdrop click
    document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) {
          backdrop.classList.remove('active');
        }
      });
    });

    // Keyboard ESC to close modal
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeAllModals();
        quickAddDropdown?.classList.remove('show');
      }
    });

    // Privacy & Backup Modal
    document.getElementById('openPrivacyModalBtn')?.addEventListener('click', () => this.openModal('privacyModal'));
    document.getElementById('exportBackupBtn')?.addEventListener('click', () => this.handleExport());
    document.getElementById('importFileInput')?.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        this.handleImport(e.target.files[0]);
        e.target.value = ''; // reset
      }
    });
    document.getElementById('loadDemoDataBtn')?.addEventListener('click', () => this.handleLoadDemo());
    document.getElementById('resetAllDataBtn')?.addEventListener('click', () => this.handleResetAll());

    // Timer Controls
    document.querySelectorAll('.timer-mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        window.StudyFlowTimer.setMode(btn.dataset.mode);
      });
    });

    document.getElementById('timerPlayBtn')?.addEventListener('click', () => {
      const timer = window.StudyFlowTimer;
      if (timer.status === 'running') timer.pause();
      else if (timer.status === 'paused') timer.resume();
      else timer.start();
    });

    document.getElementById('timerResetBtn')?.addEventListener('click', () => {
      window.StudyFlowTimer.reset();
    });

    document.getElementById('timerSkipBtn')?.addEventListener('click', () => {
      window.StudyFlowTimer.complete();
    });

    document.getElementById('sidebarTimerToggle')?.addEventListener('click', () => {
      const timer = window.StudyFlowTimer;
      if (timer.status === 'running') timer.pause();
      else if (timer.status === 'paused') timer.resume();
      else timer.start();
    });

    document.getElementById('timerSubjectSelect')?.addEventListener('change', (e) => {
      window.StudyFlowTimer.setSelectedSubject(e.target.value);
    });

    // Custom Durations
    document.getElementById('inputFocusMins')?.addEventListener('change', (e) => {
      window.StudyFlowTimer.setCustomDuration('focus', e.target.value);
    });
    document.getElementById('inputShortBreakMins')?.addEventListener('change', (e) => {
      window.StudyFlowTimer.setCustomDuration('shortBreak', e.target.value);
    });
    document.getElementById('inputLongBreakMins')?.addEventListener('change', (e) => {
      window.StudyFlowTimer.setCustomDuration('longBreak', e.target.value);
    });

    // Sound toggle & test chime
    document.getElementById('timerSoundToggle')?.addEventListener('change', (e) => {
      window.StudyFlowState.updateSettings({ soundEnabled: e.target.checked });
    });

    document.getElementById('testChimeBtn')?.addEventListener('click', () => {
      window.StudyFlowTimer.playChime();
      this.showToast('Playing chime...', 'info', 1500);
    });

    // Subscribe to Timer events for live UI updates
    window.StudyFlowTimer.subscribe(() => {
      this.renderTimer();
    });

    // Subscribe to Timer completion custom event
    window.addEventListener('studyflow:timerComplete', (e) => {
      const { mode, duration } = e.detail;
      const msg = mode === 'focus'
        ? `Focus session finished (${duration}m recorded)! 🎉 Time for a break.`
        : `Break finished! Ready to focus again.`;
      this.showToast(msg, 'success', 5000);
      this.renderAll();
    });

    // Subscribe to State Manager events
    window.StudyFlowState.subscribe((event) => {
      if (event === 'THEME_CHANGED') {
        const theme = window.StudyFlowState.getState().theme;
        this.applyTheme(theme);
      }
    });

    // AI Teacher & Chat
    document.getElementById('dashAiOpenTutorBtn')?.addEventListener('click', () => this.switchView('ai-teacher'));
    document.getElementById('aiChatSendBtn')?.addEventListener('click', () => this.handleSendAiChatMessage());
    document.getElementById('aiChatInput')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.handleSendAiChatMessage();
      }
    });
    document.getElementById('clearAiChatBtn')?.addEventListener('click', () => {
      if (confirm('Clear AI Teacher chat history?')) {
        window.StudyFlowState.clearAiMessages();
        this.renderAiTeacher();
        this.showToast('Chat history cleared.', 'info');
      }
    });
    document.querySelectorAll('.ai-prompt-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const input = document.getElementById('aiChatInput');
        if (input) {
          input.value = chip.dataset.prompt;
          input.focus();
        }
      });
    });

    // AI Study Plan
    document.getElementById('dashAiGenPlanBtn')?.addEventListener('click', () => this.openAiPlanModal());
    document.getElementById('openAiStudyPlanBtn')?.addEventListener('click', () => this.openAiPlanModal());
    document.getElementById('applyAiPlanBtn')?.addEventListener('click', () => this.applyAiPlanToSchedule());

    // Flashcards
    document.getElementById('openAiGenerateFlashcardsBtn')?.addEventListener('click', () => this.openAiFlashcardModal());
    document.getElementById('openAddFlashcardModalBtn')?.addEventListener('click', () => this.openAddFlashcardModal());
    document.getElementById('aiFlashcardForm')?.addEventListener('submit', (e) => this.handleGenerateFlashcards(e));
    document.getElementById('flashcardForm')?.addEventListener('submit', (e) => this.handleSaveFlashcard(e));
    document.getElementById('flashcardFilterSubject')?.addEventListener('change', () => this.renderFlashcards());
  }
};

window.StudyFlowUI = UI;
