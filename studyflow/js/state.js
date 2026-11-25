/**
 * StudyFlow - State Management & LocalStorage Persistence
 * Handles all CRUD operations, data validation, import/export, and demo data.
 */

const STORAGE_KEY = 'studyflow_data_v1';

// Default initial state
const DEFAULT_STATE = {
  version: '1.2.0',
  userName: 'Student',
  theme: 'dark',
  subjects: [],
  tasks: [],
  exams: [],
  sessions: [],
  focusLogs: [],
  flashcards: [],
  aiChatHistory: [],
  settings: {
    focusDuration: 25,
    shortBreakDuration: 5,
    longBreakDuration: 15,
    soundEnabled: true,
    notificationsEnabled: false
  }
};

class StateManager {
  constructor() {
    this.state = this.load();
    this.listeners = [];
  }

  // Subscribe to state changes
  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  notify(eventType, payload) {
    this.save();
    this.listeners.forEach(cb => {
      try {
        cb(eventType, payload, this.state);
      } catch (err) {
        console.error('Error in state listener:', err);
      }
    });
  }

  // Load from LocalStorage
  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        // Return default state if fresh user
        return JSON.parse(JSON.stringify(DEFAULT_STATE));
      }
      const parsed = JSON.parse(raw);
      // Merge with default state to guarantee structure consistency
      return {
        ...DEFAULT_STATE,
        ...parsed,
        settings: {
          ...DEFAULT_STATE.settings,
          ...(parsed.settings || {})
        },
        subjects: Array.isArray(parsed.subjects) ? parsed.subjects : [],
        tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
        exams: Array.isArray(parsed.exams) ? parsed.exams : [],
        sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
        focusLogs: Array.isArray(parsed.focusLogs) ? parsed.focusLogs : [],
        flashcards: Array.isArray(parsed.flashcards) ? parsed.flashcards : [],
        aiChatHistory: Array.isArray(parsed.aiChatHistory) ? parsed.aiChatHistory : []
      };
    } catch (e) {
      console.warn('Could not read saved data from localStorage. Using default state.', e);
      return JSON.parse(JSON.stringify(DEFAULT_STATE));
    }
  }

  // Save to LocalStorage
  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch (e) {
      console.error('Failed to save state to localStorage:', e);
    }
  }

  // Get current state
  getState() {
    return this.state;
  }

  // Theme management
  setTheme(theme) {
    this.state.theme = theme === 'light' ? 'light' : 'dark';
    this.notify('THEME_CHANGED', this.state.theme);
  }

  setUserName(name) {
    this.state.userName = (name || 'Student').trim().slice(0, 30);
    this.notify('USER_UPDATED', this.state.userName);
  }

  updateSettings(newSettings) {
    this.state.settings = { ...this.state.settings, ...newSettings };
    this.notify('SETTINGS_UPDATED', this.state.settings);
  }

  // ==========================================
  // SUBJECTS CRUD
  // ==========================================
  getSubjects() {
    return [...this.state.subjects];
  }

  getSubject(id) {
    return this.state.subjects.find(s => s.id === id) || null;
  }

  addSubject({ name, description = '', color = '#8b5cf6', code = '' }) {
    const trimmedName = (name || '').trim();
    if (!trimmedName) throw new Error('Subject name is required.');

    // Check duplicate name
    const exists = this.state.subjects.some(
      s => s.name.toLowerCase() === trimmedName.toLowerCase()
    );
    if (exists) throw new Error(`A subject named "${trimmedName}" already exists.`);

    const newSubject = {
      id: 'subj_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
      name: trimmedName,
      description: (description || '').trim(),
      color: color || '#8b5cf6',
      code: (code || '').trim().toUpperCase(),
      createdAt: new Date().toISOString()
    };

    this.state.subjects.push(newSubject);
    this.notify('SUBJECT_ADDED', newSubject);
    return newSubject;
  }

  updateSubject(id, { name, description, color, code }) {
    const index = this.state.subjects.findIndex(s => s.id === id);
    if (index === -1) throw new Error('Subject not found.');

    const trimmedName = (name || '').trim();
    if (!trimmedName) throw new Error('Subject name cannot be empty.');

    // Check duplicate name on other subjects
    const duplicate = this.state.subjects.some(
      s => s.id !== id && s.name.toLowerCase() === trimmedName.toLowerCase()
    );
    if (duplicate) throw new Error(`Another subject named "${trimmedName}" already exists.`);

    this.state.subjects[index] = {
      ...this.state.subjects[index],
      name: trimmedName,
      description: description !== undefined ? description.trim() : this.state.subjects[index].description,
      color: color || this.state.subjects[index].color,
      code: code !== undefined ? code.trim().toUpperCase() : this.state.subjects[index].code,
      updatedAt: new Date().toISOString()
    };

    this.notify('SUBJECT_UPDATED', this.state.subjects[index]);
    return this.state.subjects[index];
  }

  deleteSubject(id, deleteAssociated = false) {
    const subj = this.getSubject(id);
    if (!subj) throw new Error('Subject not found.');

    if (deleteAssociated) {
      // Remove all tasks, exams, sessions, focus logs linked to this subject
      this.state.tasks = this.state.tasks.filter(t => t.subjectId !== id);
      this.state.exams = this.state.exams.filter(e => e.subjectId !== id);
      this.state.sessions = this.state.sessions.filter(s => s.subjectId !== id);
      this.state.focusLogs = this.state.focusLogs.filter(f => f.subjectId !== id);
    } else {
      // Keep items, set subjectId to null (unassigned)
      this.state.tasks.forEach(t => { if (t.subjectId === id) t.subjectId = null; });
      this.state.exams.forEach(e => { if (e.subjectId === id) e.subjectId = null; });
      this.state.sessions.forEach(s => { if (s.subjectId === id) s.subjectId = null; });
      this.state.focusLogs.forEach(f => { if (f.subjectId === id) f.subjectId = null; });
    }

    this.state.subjects = this.state.subjects.filter(s => s.id !== id);
    this.notify('SUBJECT_DELETED', { id, deleteAssociated });
  }

  // Count items related to a subject
  getSubjectStats(subjectId) {
    const tasks = this.state.tasks.filter(t => t.subjectId === subjectId);
    const exams = this.state.exams.filter(e => e.subjectId === subjectId);
    const sessions = this.state.sessions.filter(s => s.subjectId === subjectId);
    return {
      totalTasks: tasks.length,
      pendingTasks: tasks.filter(t => !t.completed).length,
      completedTasks: tasks.filter(t => t.completed).length,
      upcomingExams: exams.filter(e => new Date(e.examDate) >= new Date()).length,
      totalExams: exams.length,
      totalSessions: sessions.length
    };
  }

  // ==========================================
  // TASKS CRUD
  // ==========================================
  getTasks() {
    return [...this.state.tasks];
  }

  getTask(id) {
    return this.state.tasks.find(t => t.id === id) || null;
  }

  addTask({ title, description = '', subjectId = null, dueDate, dueTime = '', priority = 'medium' }) {
    const trimmedTitle = (title || '').trim();
    if (!trimmedTitle) throw new Error('Task title is required.');
    if (!dueDate) throw new Error('Due date is required.');

    // Validate valid date
    const d = new Date(dueDate);
    if (isNaN(d.getTime())) throw new Error('Invalid due date.');

    const validPriorities = ['low', 'medium', 'high'];
    const p = validPriorities.includes(priority) ? priority : 'medium';

    const newTask = {
      id: 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
      title: trimmedTitle,
      description: (description || '').trim(),
      subjectId: subjectId || null,
      dueDate: dueDate,
      dueTime: dueTime || '',
      priority: p,
      completed: false,
      completedAt: null,
      createdAt: new Date().toISOString()
    };

    this.state.tasks.push(newTask);
    this.notify('TASK_ADDED', newTask);
    return newTask;
  }

  updateTask(id, updates) {
    const index = this.state.tasks.findIndex(t => t.id === id);
    if (index === -1) throw new Error('Task not found.');

    const current = this.state.tasks[index];
    const title = updates.title !== undefined ? updates.title.trim() : current.title;
    if (!title) throw new Error('Task title cannot be empty.');

    const dueDate = updates.dueDate !== undefined ? updates.dueDate : current.dueDate;
    if (!dueDate) throw new Error('Due date cannot be empty.');

    const validPriorities = ['low', 'medium', 'high'];
    const priority = updates.priority && validPriorities.includes(updates.priority)
      ? updates.priority
      : current.priority;

    this.state.tasks[index] = {
      ...current,
      title,
      description: updates.description !== undefined ? updates.description.trim() : current.description,
      subjectId: updates.subjectId !== undefined ? updates.subjectId : current.subjectId,
      dueDate,
      dueTime: updates.dueTime !== undefined ? updates.dueTime : current.dueTime,
      priority,
      updatedAt: new Date().toISOString()
    };

    this.notify('TASK_UPDATED', this.state.tasks[index]);
    return this.state.tasks[index];
  }

  toggleTaskComplete(id) {
    const task = this.getTask(id);
    if (!task) throw new Error('Task not found.');

    task.completed = !task.completed;
    task.completedAt = task.completed ? new Date().toISOString() : null;

    this.notify('TASK_TOGGLED', task);
    return task;
  }

  deleteTask(id) {
    const index = this.state.tasks.findIndex(t => t.id === id);
    if (index === -1) throw new Error('Task not found.');

    const deleted = this.state.tasks.splice(index, 1)[0];
    this.notify('TASK_DELETED', deleted);
  }

  // ==========================================
  // EXAMS CRUD
  // ==========================================
  getExams() {
    return [...this.state.exams];
  }

  getExam(id) {
    return this.state.exams.find(e => e.id === id) || null;
  }

  addExam({ title, subjectId = null, examDate, examTime = '', location = '', notes = '', difficulty = 'medium', prepHours = 8 }) {
    const trimmedTitle = (title || '').trim();
    if (!trimmedTitle) throw new Error('Exam title is required.');
    if (!examDate) throw new Error('Exam date is required.');

    const d = new Date(examDate);
    if (isNaN(d.getTime())) throw new Error('Invalid exam date.');

    const validDiffs = ['easy', 'medium', 'hard', 'extreme'];
    const diff = validDiffs.includes(difficulty) ? difficulty : 'medium';
    const hours = Math.max(1, parseInt(prepHours, 10) || 8);

    const newExam = {
      id: 'exam_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
      title: trimmedTitle,
      subjectId: subjectId || null,
      examDate,
      examTime: examTime || '',
      location: (location || '').trim(),
      notes: (notes || '').trim(),
      difficulty: diff,
      prepHours: hours,
      createdAt: new Date().toISOString()
    };

    this.state.exams.push(newExam);
    this.notify('EXAM_ADDED', newExam);
    return newExam;
  }

  updateExam(id, updates) {
    const index = this.state.exams.findIndex(e => e.id === id);
    if (index === -1) throw new Error('Exam not found.');

    const current = this.state.exams[index];
    const title = updates.title !== undefined ? updates.title.trim() : current.title;
    if (!title) throw new Error('Exam title cannot be empty.');

    const examDate = updates.examDate !== undefined ? updates.examDate : current.examDate;
    if (!examDate) throw new Error('Exam date cannot be empty.');

    const validDiffs = ['easy', 'medium', 'hard', 'extreme'];
    const difficulty = updates.difficulty && validDiffs.includes(updates.difficulty)
      ? updates.difficulty
      : (current.difficulty || 'medium');
    const prepHours = updates.prepHours !== undefined ? Math.max(1, parseInt(updates.prepHours, 10) || 8) : (current.prepHours || 8);

    this.state.exams[index] = {
      ...current,
      title,
      subjectId: updates.subjectId !== undefined ? updates.subjectId : current.subjectId,
      examDate,
      examTime: updates.examTime !== undefined ? updates.examTime : current.examTime,
      location: updates.location !== undefined ? updates.location.trim() : current.location,
      notes: updates.notes !== undefined ? updates.notes.trim() : current.notes,
      difficulty,
      prepHours,
      updatedAt: new Date().toISOString()
    };

    this.notify('EXAM_UPDATED', this.state.exams[index]);
    return this.state.exams[index];
  }

  deleteExam(id) {
    const index = this.state.exams.findIndex(e => e.id === id);
    if (index === -1) throw new Error('Exam not found.');

    const deleted = this.state.exams.splice(index, 1)[0];
    this.notify('EXAM_DELETED', deleted);
  }

  // ==========================================
  // STUDY SESSIONS CRUD
  // ==========================================
  getSessions() {
    return [...this.state.sessions];
  }

  getSession(id) {
    return this.state.sessions.find(s => s.id === id) || null;
  }

  addSession({ subjectId = null, date, startTime = '09:00', duration = 60, topic = '' }) {
    if (!date) throw new Error('Session date is required.');
    const d = new Date(date);
    if (isNaN(d.getTime())) throw new Error('Invalid date.');

    const dur = parseInt(duration, 10);
    if (isNaN(dur) || dur < 5 || dur > 720) {
      throw new Error('Duration must be between 5 and 720 minutes.');
    }

    const newSession = {
      id: 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
      subjectId: subjectId || null,
      date,
      startTime: startTime || '09:00',
      duration: dur,
      topic: (topic || '').trim(),
      completed: false,
      createdAt: new Date().toISOString()
    };

    this.state.sessions.push(newSession);
    this.notify('SESSION_ADDED', newSession);
    return newSession;
  }

  updateSession(id, updates) {
    const index = this.state.sessions.findIndex(s => s.id === id);
    if (index === -1) throw new Error('Session not found.');

    const current = this.state.sessions[index];
    const date = updates.date || current.date;
    const dur = updates.duration !== undefined ? parseInt(updates.duration, 10) : current.duration;

    if (isNaN(dur) || dur < 5 || dur > 720) {
      throw new Error('Duration must be between 5 and 720 minutes.');
    }

    this.state.sessions[index] = {
      ...current,
      subjectId: updates.subjectId !== undefined ? updates.subjectId : current.subjectId,
      date,
      startTime: updates.startTime !== undefined ? updates.startTime : current.startTime,
      duration: dur,
      topic: updates.topic !== undefined ? updates.topic.trim() : current.topic,
      completed: updates.completed !== undefined ? !!updates.completed : current.completed,
      updatedAt: new Date().toISOString()
    };

    this.notify('SESSION_UPDATED', this.state.sessions[index]);
    return this.state.sessions[index];
  }

  toggleSessionComplete(id) {
    const s = this.getSession(id);
    if (!s) throw new Error('Session not found.');

    s.completed = !s.completed;
    this.notify('SESSION_TOGGLED', s);
    return s;
  }

  deleteSession(id) {
    const index = this.state.sessions.findIndex(s => s.id === id);
    if (index === -1) throw new Error('Session not found.');

    const deleted = this.state.sessions.splice(index, 1)[0];
    this.notify('SESSION_DELETED', deleted);
  }

  // ==========================================
  // FOCUS TIMER LOGS
  // ==========================================
  getFocusLogs() {
    return [...this.state.focusLogs];
  }

  recordFocusSession({ subjectId = null, duration = 25, mode = 'focus' }) {
    const dur = parseInt(duration, 10);
    if (isNaN(dur) || dur <= 0) return;

    const logEntry = {
      id: 'focus_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
      subjectId: subjectId || null,
      duration: dur, // in minutes
      mode: mode || 'focus',
      completedAt: new Date().toISOString()
    };

    this.state.focusLogs.push(logEntry);
    this.notify('FOCUS_LOGGED', logEntry);
    return logEntry;
  }

  // ==========================================
  // FLASHCARDS CRUD
  // ==========================================
  getFlashcards(subjectId = null) {
    if (subjectId && subjectId !== 'all') {
      return this.state.flashcards.filter(f => f.subjectId === subjectId);
    }
    return [...this.state.flashcards];
  }

  getFlashcard(id) {
    return this.state.flashcards.find(f => f.id === id) || null;
  }

  addFlashcard({ subjectId = null, front, back }) {
    const f = (front || '').trim();
    const b = (back || '').trim();
    if (!f) throw new Error('Question / Front text is required.');
    if (!b) throw new Error('Answer / Back text is required.');

    const newCard = {
      id: 'card_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
      subjectId: subjectId || null,
      front: f,
      back: b,
      mastery: 'learning', // 'learning' | 'mastered'
      reviewsCount: 0,
      lastReviewedAt: null,
      createdAt: new Date().toISOString()
    };

    this.state.flashcards.push(newCard);
    this.notify('FLASHCARD_ADDED', newCard);
    return newCard;
  }

  updateFlashcard(id, updates) {
    const index = this.state.flashcards.findIndex(f => f.id === id);
    if (index === -1) throw new Error('Flashcard not found.');

    const current = this.state.flashcards[index];
    this.state.flashcards[index] = {
      ...current,
      front: updates.front !== undefined ? updates.front.trim() : current.front,
      back: updates.back !== undefined ? updates.back.trim() : current.back,
      subjectId: updates.subjectId !== undefined ? updates.subjectId : current.subjectId,
      mastery: updates.mastery || current.mastery,
      updatedAt: new Date().toISOString()
    };

    this.notify('FLASHCARD_UPDATED', this.state.flashcards[index]);
    return this.state.flashcards[index];
  }

  recordCardReview(id, knewIt) {
    const card = this.getFlashcard(id);
    if (!card) return;

    card.reviewsCount = (card.reviewsCount || 0) + 1;
    card.mastery = knewIt ? 'mastered' : 'learning';
    card.lastReviewedAt = new Date().toISOString();

    this.notify('FLASHCARD_REVIEWED', card);
    return card;
  }

  deleteFlashcard(id) {
    const index = this.state.flashcards.findIndex(f => f.id === id);
    if (index === -1) throw new Error('Flashcard not found.');

    const deleted = this.state.flashcards.splice(index, 1)[0];
    this.notify('FLASHCARD_DELETED', deleted);
  }

  // ==========================================
  // AI CHAT HISTORY
  // ==========================================
  getAiMessages() {
    return [...this.state.aiChatHistory];
  }

  addAiMessage({ role, text }) {
    const msg = {
      id: 'aimsg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
      role: role === 'user' ? 'user' : 'assistant',
      text: String(text || '').trim(),
      timestamp: new Date().toISOString()
    };
    this.state.aiChatHistory.push(msg);
    // Keep last 40 messages to prevent unbounded growth
    if (this.state.aiChatHistory.length > 40) {
      this.state.aiChatHistory = this.state.aiChatHistory.slice(-40);
    }
    this.notify('AI_MESSAGE_ADDED', msg);
    return msg;
  }

  clearAiMessages() {
    this.state.aiChatHistory = [];
    this.notify('AI_CHAT_CLEARED', null);
  }

  // ==========================================
  // EXPORT & IMPORT DATA
  // ==========================================
  exportData() {
    const exportObject = {
      appName: 'StudyFlow',
      version: this.state.version || '1.2.0',
      exportedAt: new Date().toISOString(),
      userName: this.state.userName,
      settings: this.state.settings,
      subjects: this.state.subjects,
      tasks: this.state.tasks,
      exams: this.state.exams,
      sessions: this.state.sessions,
      focusLogs: this.state.focusLogs,
      flashcards: this.state.flashcards,
      aiChatHistory: this.state.aiChatHistory
    };
    return JSON.stringify(exportObject, null, 2);
  }

  importData(jsonString) {
    if (!jsonString || typeof jsonString !== 'string') {
      throw new Error('Please select a valid backup JSON file.');
    }

    let parsed;
    try {
      parsed = JSON.parse(jsonString);
    } catch (e) {
      throw new Error('Invalid JSON format: Could not parse file. Make sure it is an uncorrupted .json file.');
    }

    // Validation checks
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Invalid backup file structure: expected a JSON object.');
    }

    // Must have at least one expected StudyFlow property or subjects/tasks array
    const hasValidKey = Array.isArray(parsed.subjects) || Array.isArray(parsed.tasks) || parsed.appName === 'StudyFlow';
    if (!hasValidKey) {
      throw new Error('Unrecognized format: This file does not appear to be a valid StudyFlow backup.');
    }

    // Sanitize subjects
    const sanitizedSubjects = Array.isArray(parsed.subjects)
      ? parsed.subjects.filter(s => s && typeof s.name === 'string' && s.id).map(s => ({
          id: String(s.id),
          name: String(s.name).trim(),
          description: s.description ? String(s.description).trim() : '',
          color: s.color && /^#([0-9A-Fa-f]{3,8})$/.test(s.color) ? s.color : '#8b5cf6',
          code: s.code ? String(s.code).trim().toUpperCase() : '',
          createdAt: s.createdAt || new Date().toISOString()
        }))
      : [];

    // Sanitize tasks
    const sanitizedTasks = Array.isArray(parsed.tasks)
      ? parsed.tasks.filter(t => t && typeof t.title === 'string' && t.id).map(t => ({
          id: String(t.id),
          title: String(t.title).trim(),
          description: t.description ? String(t.description).trim() : '',
          subjectId: t.subjectId ? String(t.subjectId) : null,
          dueDate: t.dueDate || new Date().toISOString().slice(0, 10),
          dueTime: t.dueTime || '',
          priority: ['low', 'medium', 'high'].includes(t.priority) ? t.priority : 'medium',
          completed: !!t.completed,
          completedAt: t.completedAt || null,
          createdAt: t.createdAt || new Date().toISOString()
        }))
      : [];

    // Sanitize exams
    const sanitizedExams = Array.isArray(parsed.exams)
      ? parsed.exams.filter(e => e && typeof e.title === 'string' && e.id).map(e => ({
          id: String(e.id),
          title: String(e.title).trim(),
          subjectId: e.subjectId ? String(e.subjectId) : null,
          examDate: e.examDate || new Date().toISOString().slice(0, 10),
          examTime: e.examTime || '',
          location: e.location ? String(e.location).trim() : '',
          notes: e.notes ? String(e.notes).trim() : '',
          difficulty: ['easy', 'medium', 'hard', 'extreme'].includes(e.difficulty) ? e.difficulty : 'medium',
          prepHours: Math.max(1, parseInt(e.prepHours, 10) || 8),
          createdAt: e.createdAt || new Date().toISOString()
        }))
      : [];

    // Sanitize sessions
    const sanitizedSessions = Array.isArray(parsed.sessions)
      ? parsed.sessions.filter(s => s && s.id).map(s => ({
          id: String(s.id),
          subjectId: s.subjectId ? String(s.subjectId) : null,
          date: s.date || new Date().toISOString().slice(0, 10),
          startTime: s.startTime || '09:00',
          duration: parseInt(s.duration, 10) || 60,
          topic: s.topic ? String(s.topic).trim() : '',
          completed: !!s.completed,
          createdAt: s.createdAt || new Date().toISOString()
        }))
      : [];

    // Sanitize focusLogs
    const sanitizedFocusLogs = Array.isArray(parsed.focusLogs)
      ? parsed.focusLogs.filter(f => f && f.id).map(f => ({
          id: String(f.id),
          subjectId: f.subjectId ? String(f.subjectId) : null,
          duration: parseInt(f.duration, 10) || 25,
          mode: f.mode || 'focus',
          completedAt: f.completedAt || new Date().toISOString()
        }))
      : [];

    // Sanitize flashcards
    const sanitizedFlashcards = Array.isArray(parsed.flashcards)
      ? parsed.flashcards.filter(fc => fc && fc.front && fc.back && fc.id).map(fc => ({
          id: String(fc.id),
          subjectId: fc.subjectId ? String(fc.subjectId) : null,
          front: String(fc.front).trim(),
          back: String(fc.back).trim(),
          mastery: ['learning', 'mastered'].includes(fc.mastery) ? fc.mastery : 'learning',
          reviewsCount: parseInt(fc.reviewsCount, 10) || 0,
          lastReviewedAt: fc.lastReviewedAt || null,
          createdAt: fc.createdAt || new Date().toISOString()
        }))
      : [];

    // Sanitize aiChatHistory
    const sanitizedAiHistory = Array.isArray(parsed.aiChatHistory)
      ? parsed.aiChatHistory.filter(m => m && m.text).map(m => ({
          id: String(m.id || 'aimsg_' + Math.random().toString(36).substr(2, 6)),
          role: m.role === 'user' ? 'user' : 'assistant',
          text: String(m.text),
          timestamp: m.timestamp || new Date().toISOString()
        }))
      : [];

    // Update state
    this.state.userName = parsed.userName ? String(parsed.userName).trim().slice(0, 30) : this.state.userName;
    this.state.subjects = sanitizedSubjects;
    this.state.tasks = sanitizedTasks;
    this.state.exams = sanitizedExams;
    this.state.sessions = sanitizedSessions;
    this.state.focusLogs = sanitizedFocusLogs;
    this.state.flashcards = sanitizedFlashcards;
    this.state.aiChatHistory = sanitizedAiHistory;

    if (parsed.settings && typeof parsed.settings === 'object') {
      this.state.settings = {
        ...this.state.settings,
        ...parsed.settings
      };
    }

    this.notify('DATA_IMPORTED', {
      subjectsCount: sanitizedSubjects.length,
      tasksCount: sanitizedTasks.length,
      examsCount: sanitizedExams.length,
      sessionsCount: sanitizedSessions.length,
      focusLogsCount: sanitizedFocusLogs.length,
      flashcardsCount: sanitizedFlashcards.length
    });

    return {
      success: true,
      stats: {
        subjects: sanitizedSubjects.length,
        tasks: sanitizedTasks.length,
        exams: sanitizedExams.length,
        sessions: sanitizedSessions.length,
        focusLogs: sanitizedFocusLogs.length,
        flashcards: sanitizedFlashcards.length
      }
    };
  }

  // Load realistic sample demo data
  loadDemoData() {
    const today = new Date();
    const fmt = d => d.toISOString().slice(0, 10);
    const addDays = (days) => {
      const d = new Date(today);
      d.setDate(d.getDate() + days);
      return fmt(d);
    };

    const demoSubjects = [
      {
        id: 'subj_cs',
        name: 'Computer Science',
        code: 'CS 101',
        description: 'Algorithms, Data Structures & Web Architecture',
        color: '#8b5cf6', // Violet
        createdAt: new Date().toISOString()
      },
      {
        id: 'subj_math',
        name: 'Calculus & Linear Algebra',
        code: 'MATH 202',
        description: 'Multivariate differentiation, matrix transformations & integrals',
        color: '#3b82f6', // Blue
        createdAt: new Date().toISOString()
      },
      {
        id: 'subj_bio',
        name: 'Human Physiology & Biology',
        code: 'BIO 150',
        description: 'Cell biology, neural pathways, and genetics',
        color: '#10b981', // Emerald
        createdAt: new Date().toISOString()
      },
      {
        id: 'subj_hist',
        name: 'Modern World History',
        code: 'HIST 110',
        description: '20th Century global developments & geopolitical treaties',
        color: '#f59e0b', // Amber
        createdAt: new Date().toISOString()
      }
    ];

    const demoTasks = [
      {
        id: 'task_demo_1',
        title: 'Complete Binary Search Tree Implementation',
        description: 'Implement balance checks and in-order traversal tests in Python.',
        subjectId: 'subj_cs',
        dueDate: addDays(1),
        dueTime: '23:59',
        priority: 'high',
        completed: false,
        completedAt: null,
        createdAt: new Date().toISOString()
      },
      {
        id: 'task_demo_2',
        title: 'Calculus Problem Set 6: Stokes Theorem',
        description: 'Questions 14 through 28 from Stewart Calculus textbook chapter 16.',
        subjectId: 'subj_math',
        dueDate: addDays(2),
        dueTime: '17:00',
        priority: 'high',
        completed: false,
        completedAt: null,
        createdAt: new Date().toISOString()
      },
      {
        id: 'task_demo_3',
        title: 'Review Cell Membrane Action Potentials',
        description: 'Read pages 140-165 in Campbell Biology and summarize notes.',
        subjectId: 'subj_bio',
        dueDate: addDays(4),
        dueTime: '20:00',
        priority: 'medium',
        completed: false,
        completedAt: null,
        createdAt: new Date().toISOString()
      },
      {
        id: 'task_demo_4',
        title: 'Draft Cold War Essay Outline',
        description: 'Outline key milestones from 1947 to 1989 with 3 primary sources.',
        subjectId: 'subj_hist',
        dueDate: addDays(5),
        dueTime: '18:00',
        priority: 'low',
        completed: false,
        completedAt: null,
        createdAt: new Date().toISOString()
      },
      {
        id: 'task_demo_5',
        title: 'Setup Git Repository & Project Scaffold',
        description: 'Initialize clean repository and setup directory structure.',
        subjectId: 'subj_cs',
        dueDate: addDays(-2),
        dueTime: '12:00',
        priority: 'medium',
        completed: true,
        completedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
        createdAt: new Date(Date.now() - 86400000 * 3).toISOString()
      },
      {
        id: 'task_demo_6',
        title: 'Matrix Eigenvalues Practice Worksheet',
        description: 'Complete 10 diagonal matrix decomposition problems.',
        subjectId: 'subj_math',
        dueDate: addDays(-1),
        dueTime: '15:00',
        priority: 'medium',
        completed: true,
        completedAt: new Date(Date.now() - 86400000).toISOString(),
        createdAt: new Date(Date.now() - 86400000 * 2).toISOString()
      }
    ];

    const demoExams = [
      {
        id: 'exam_demo_1',
        title: 'Midterm: Data Structures & Complexity',
        subjectId: 'subj_cs',
        examDate: addDays(6),
        examTime: '10:00',
        location: 'Hall B - Room 204',
        difficulty: 'hard',
        prepHours: 14,
        notes: 'Covers Big-O notation, linked lists, trees, and hashing. Bring student ID.',
        createdAt: new Date().toISOString()
      },
      {
        id: 'exam_demo_2',
        title: 'Calculus II Midterm Exam',
        subjectId: 'subj_math',
        examDate: addDays(12),
        examTime: '14:30',
        location: 'Mathematics Building 101',
        difficulty: 'extreme',
        prepHours: 20,
        notes: 'Formula sheet allowed (one double-sided A4 page). Graphing calculators permitted.',
        createdAt: new Date().toISOString()
      },
      {
        id: 'exam_demo_3',
        title: 'Biology Quiz 3: Cellular Respiration',
        subjectId: 'subj_bio',
        examDate: addDays(-5),
        examTime: '09:00',
        location: 'Science Auditorium',
        difficulty: 'medium',
        prepHours: 6,
        notes: 'Multiple choice and diagram labeling on Krebs cycle.',
        createdAt: new Date(Date.now() - 86400000 * 10).toISOString()
      }
    ];

    const demoSessions = [
      {
        id: 'sess_demo_1',
        subjectId: 'subj_cs',
        date: addDays(0),
        startTime: '10:00',
        duration: 50,
        topic: 'Binary Search Tree Balancing & Traversals',
        completed: false,
        createdAt: new Date().toISOString()
      },
      {
        id: 'sess_demo_2',
        subjectId: 'subj_math',
        date: addDays(0),
        startTime: '14:00',
        duration: 45,
        topic: 'Calculus Problem Set 6: Stokes Theorem',
        completed: false,
        createdAt: new Date().toISOString()
      },
      {
        id: 'sess_demo_3',
        subjectId: 'subj_bio',
        date: addDays(1),
        startTime: '11:00',
        duration: 60,
        topic: 'Cell Membrane Action Potentials Review',
        completed: false,
        createdAt: new Date().toISOString()
      },
      {
        id: 'sess_demo_4',
        subjectId: 'subj_hist',
        date: addDays(2),
        startTime: '15:30',
        duration: 45,
        topic: 'Cold War Primary Sources Analysis',
        completed: false,
        createdAt: new Date().toISOString()
      },
      {
        id: 'sess_demo_5',
        subjectId: 'subj_cs',
        date: addDays(-1),
        startTime: '09:00',
        duration: 60,
        topic: 'Graph Algorithms & BFS/DFS Drills',
        completed: true,
        createdAt: new Date(Date.now() - 86400000 * 2).toISOString()
      }
    ];

    const demoFocusLogs = [
      {
        id: 'focus_demo_1',
        subjectId: 'subj_cs',
        duration: 25,
        mode: 'focus',
        completedAt: new Date(Date.now() - 3600000 * 3).toISOString()
      },
      {
        id: 'focus_demo_2',
        subjectId: 'subj_cs',
        duration: 25,
        mode: 'focus',
        completedAt: new Date(Date.now() - 3600000 * 2).toISOString()
      },
      {
        id: 'focus_demo_3',
        subjectId: 'subj_math',
        duration: 25,
        mode: 'focus',
        completedAt: new Date(Date.now() - 86400000).toISOString()
      },
      {
        id: 'focus_demo_4',
        subjectId: 'subj_bio',
        duration: 25,
        mode: 'focus',
        completedAt: new Date(Date.now() - 86400000 * 2).toISOString()
      }
    ];

    const demoFlashcards = [
      {
        id: 'fc_demo_1',
        subjectId: 'subj_cs',
        front: 'What is the worst-case time complexity of QuickSort?',
        back: 'O(n²) occurs when the chosen pivot is consistently the smallest or largest element (e.g. sorted array without random pivot selection). Average time is O(n log n).',
        mastery: 'mastered',
        reviewsCount: 3,
        lastReviewedAt: new Date().toISOString(),
        createdAt: new Date().toISOString()
      },
      {
        id: 'fc_demo_2',
        subjectId: 'subj_cs',
        front: 'What is the primary difference between a Stack and a Queue?',
        back: 'A Stack follows LIFO (Last-In, First-Out), like a stack of plates. A Queue follows FIFO (First-In, First-Out), like a line at a store.',
        mastery: 'learning',
        reviewsCount: 1,
        lastReviewedAt: new Date().toISOString(),
        createdAt: new Date().toISOString()
      },
      {
        id: 'fc_demo_3',
        subjectId: 'subj_math',
        front: 'What is the derivative of f(x) = ln(x)?',
        back: "f'(x) = 1 / x for x > 0.",
        mastery: 'mastered',
        reviewsCount: 4,
        lastReviewedAt: new Date().toISOString(),
        createdAt: new Date().toISOString()
      },
      {
        id: 'fc_demo_4',
        subjectId: 'subj_math',
        front: "State the Fundamental Theorem of Calculus (Part 1).",
        back: 'If f is continuous on [a, b], then the function g(x) = ∫[a to x] f(t) dt is continuous on [a, b], differentiable on (a, b), and g\'(x) = f(x).',
        mastery: 'learning',
        reviewsCount: 2,
        lastReviewedAt: new Date().toISOString(),
        createdAt: new Date().toISOString()
      },
      {
        id: 'fc_demo_5',
        subjectId: 'subj_bio',
        front: 'What is the primary function of the Mitochondria?',
        back: 'It is the powerhouse of the eukaryotic cell, producing adenosine triphosphate (ATP) through cellular respiration and oxidative phosphorylation.',
        mastery: 'mastered',
        reviewsCount: 2,
        lastReviewedAt: new Date().toISOString(),
        createdAt: new Date().toISOString()
      },
      {
        id: 'fc_demo_6',
        subjectId: 'subj_bio',
        front: 'What happens during depolarization of a neuron?',
        back: 'Voltage-gated Sodium (Na+) channels open rapidly, allowing Na+ ions to flood into the axon, shifting the membrane potential from -70mV toward +30mV.',
        mastery: 'learning',
        reviewsCount: 1,
        lastReviewedAt: new Date().toISOString(),
        createdAt: new Date().toISOString()
      }
    ];

    const demoAiHistory = [
      {
        id: 'aimsg_welcome',
        role: 'assistant',
        text: "👋 Hi Alex! I'm your StudyFlow AI Teacher. I'm here to explain complex concepts, summarize your class notes, generate flashcards, or create personalized study schedules. What are you studying today?",
        timestamp: new Date().toISOString()
      }
    ];

    this.state.subjects = demoSubjects;
    this.state.tasks = demoTasks;
    this.state.exams = demoExams;
    this.state.sessions = demoSessions;
    this.state.focusLogs = demoFocusLogs;
    this.state.flashcards = demoFlashcards;
    this.state.aiChatHistory = demoAiHistory;
    this.state.userName = 'Alex';

    this.notify('DEMO_DATA_LOADED', null);
  }

  // Reset all state to clean defaults
  resetAllData() {
    this.state = JSON.parse(JSON.stringify(DEFAULT_STATE));
    localStorage.removeItem(STORAGE_KEY);
    this.notify('DATA_RESET', null);
  }
}

// Export singleton
window.StudyFlowState = new StateManager();
