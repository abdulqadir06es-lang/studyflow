/**
 * StudyFlow - Analytics & Progress Engine
 * Calculates task completion rates, study streaks, focus hours, and renders responsive SVG charts.
 */

const Analytics = {
  // Format minutes into clean readable string, e.g. "2h 45m" or "35m"
  formatDuration(minutes) {
    const mins = Math.max(0, Math.round(minutes || 0));
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    const remMins = mins % 60;
    return remMins > 0 ? `${hours}h ${remMins}m` : `${hours}h`;
  },

  // Check if two dates represent the same calendar day in local time
  isSameDay(d1, d2) {
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  },

  // Check if a task is overdue
  isTaskOverdue(task) {
    if (task.completed) return false;
    if (!task.dueDate) return false;

    const dueStr = task.dueTime ? `${task.dueDate}T${task.dueTime}` : `${task.dueDate}T23:59:59`;
    const dueDate = new Date(dueStr);
    return !isNaN(dueDate.getTime()) && dueDate.getTime() < Date.now();
  },

  // Task Statistics
  getTaskStats(tasks = [], subjects = []) {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const pending = total - completed;
    const overdue = tasks.filter(t => this.isTaskOverdue(t)).length;
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

    const byPriority = {
      high: { total: 0, completed: 0 },
      medium: { total: 0, completed: 0 },
      low: { total: 0, completed: 0 }
    };

    tasks.forEach(t => {
      const p = t.priority || 'medium';
      if (byPriority[p]) {
        byPriority[p].total++;
        if (t.completed) byPriority[p].completed++;
      }
    });

    const subjectMap = {};
    subjects.forEach(s => {
      subjectMap[s.id] = {
        id: s.id,
        name: s.name,
        color: s.color,
        code: s.code,
        total: 0,
        completed: 0
      };
    });

    // Handle unassigned tasks
    subjectMap['unassigned'] = {
      id: null,
      name: 'General / Unassigned',
      color: '#64748b',
      code: '',
      total: 0,
      completed: 0
    };

    tasks.forEach(t => {
      const key = t.subjectId && subjectMap[t.subjectId] ? t.subjectId : 'unassigned';
      subjectMap[key].total++;
      if (t.completed) subjectMap[key].completed++;
    });

    const bySubject = Object.values(subjectMap)
      .filter(s => s.total > 0)
      .map(s => ({
        ...s,
        rate: s.total > 0 ? Math.round((s.completed / s.total) * 100) : 0
      }));

    return {
      total,
      completed,
      pending,
      overdue,
      rate,
      byPriority,
      bySubject
    };
  },

  // Focus Statistics
  getFocusStats(focusLogs = [], tasks = []) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Monday of current week
    const currentDay = today.getDay(); // 0 is Sunday
    const distanceToMonday = (currentDay + 6) % 7; // Monday = 0
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - distanceToMonday);

    let todayMinutes = 0;
    let thisWeekMinutes = 0;
    let allTimeMinutes = 0;

    // Daily breakdown for the 7 days of the current week (Mon-Sun)
    const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const dailyData = daysOfWeek.map((label, idx) => {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + idx);
      return {
        label,
        dateStr: d.toISOString().slice(0, 10),
        date: d,
        isToday: this.isSameDay(d, now),
        isFuture: d.getTime() > now.getTime(),
        minutes: 0
      };
    });

    focusLogs.forEach(log => {
      const logDate = new Date(log.completedAt);
      if (isNaN(logDate.getTime())) return;

      const dur = parseInt(log.duration, 10) || 0;
      allTimeMinutes += dur;

      if (this.isSameDay(logDate, now)) {
        todayMinutes += dur;
      }

      if (logDate >= weekStart) {
        thisWeekMinutes += dur;
      }

      // Match into dailyData
      dailyData.forEach(day => {
        if (this.isSameDay(logDate, day.date)) {
          day.minutes += dur;
        }
      });
    });

    // Calculate study streak (consecutive days with at least 1 focus session or completed task)
    const activeDates = new Set();
    focusLogs.forEach(f => {
      if (f.completedAt) activeDates.add(f.completedAt.slice(0, 10));
    });
    tasks.forEach(t => {
      if (t.completed && t.completedAt) activeDates.add(t.completedAt.slice(0, 10));
    });

    let streak = 0;
    const checkDate = new Date(today);

    // If no activity today, check if active yesterday (streak not broken yet today)
    const todayStr = checkDate.toISOString().slice(0, 10);
    const hasToday = activeDates.has(todayStr);

    if (hasToday) {
      streak = 1;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      // Check yesterday
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().slice(0, 10);
      if (activeDates.has(yesterdayStr)) {
        streak = 1;
        checkDate.setDate(yesterday.getDate() - 1);
      }
    }

    if (streak > 0) {
      while (true) {
        const dStr = checkDate.toISOString().slice(0, 10);
        if (activeDates.has(dStr)) {
          streak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }
    }

    return {
      todayMinutes,
      thisWeekMinutes,
      allTimeMinutes,
      dailyData,
      streak
    };
  },

  // Exam Statistics & Separation
  getExamData(exams = [], subjects = []) {
    const now = new Date();
    const subjectMap = {};
    subjects.forEach(s => { subjectMap[s.id] = s; });

    const upcoming = [];
    const past = [];

    exams.forEach(exam => {
      const dateStr = exam.examTime ? `${exam.examDate}T${exam.examTime}` : `${exam.examDate}T23:59:59`;
      const examDate = new Date(dateStr);
      const diffMs = examDate.getTime() - now.getTime();
      const isPast = diffMs < 0;

      const enriched = {
        ...exam,
        dateObj: examDate,
        subject: exam.subjectId ? subjectMap[exam.subjectId] || null : null,
        isPast,
        countdown: this.formatCountdown(diffMs)
      };

      if (isPast) {
        past.push(enriched);
      } else {
        upcoming.push(enriched);
      }
    });

    // Upcoming sorted soonest first
    upcoming.sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());
    // Past sorted most recent first
    past.sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime());

    return { upcoming, past };
  },

  formatCountdown(diffMs) {
    if (diffMs < 0) return 'Passed';
    const totalSecs = Math.floor(diffMs / 1000);
    const days = Math.floor(totalSecs / 86400);
    const hours = Math.floor((totalSecs % 86400) / 3600);
    const minutes = Math.floor((totalSecs % 3600) / 60);

    if (days > 1) return `In ${days} days`;
    if (days === 1) return `Tomorrow (${hours}h remaining)`;
    if (hours > 0) return `In ${hours}h ${minutes}m`;
    return `In ${minutes} minutes`;
  },

  // Upcoming deadlines (Tasks & Exams combined)
  getCombinedDeadlines(tasks = [], exams = [], subjects = [], limit = 6) {
    const now = new Date();
    const subjectMap = {};
    subjects.forEach(s => { subjectMap[s.id] = s; });

    const items = [];

    // Pending tasks
    tasks.filter(t => !t.completed).forEach(task => {
      const dtStr = task.dueTime ? `${task.dueDate}T${task.dueTime}` : `${task.dueDate}T23:59:59`;
      const date = new Date(dtStr);
      const isOverdue = date.getTime() < now.getTime();

      items.push({
        id: task.id,
        type: 'task',
        title: task.title,
        dateObj: date,
        dateString: task.dueDate,
        timeString: task.dueTime,
        priority: task.priority,
        subject: task.subjectId ? subjectMap[task.subjectId] : null,
        isOverdue,
        countdown: isOverdue ? 'Overdue' : this.formatCountdown(date.getTime() - now.getTime())
      });
    });

    // Upcoming exams
    exams.forEach(exam => {
      const dtStr = exam.examTime ? `${exam.examDate}T${exam.examTime}` : `${exam.examDate}T23:59:59`;
      const date = new Date(dtStr);
      if (date.getTime() >= now.getTime()) {
        items.push({
          id: exam.id,
          type: 'exam',
          title: `Exam: ${exam.title}`,
          dateObj: date,
          dateString: exam.examDate,
          timeString: exam.examTime,
          priority: 'high',
          subject: exam.subjectId ? subjectMap[exam.subjectId] : null,
          isOverdue: false,
          countdown: this.formatCountdown(date.getTime() - now.getTime())
        });
      }
    });

    // Sort: overdue first, then soonest dates
    items.sort((a, b) => {
      if (a.isOverdue && !b.isOverdue) return -1;
      if (!a.isOverdue && b.isOverdue) return 1;
      return a.dateObj.getTime() - b.dateObj.getTime();
    });

    return items.slice(0, limit);
  },

  // Responsive SVG Bar Chart for 7 Days Focus Time
  renderFocusBarChart(dailyData = []) {
    const maxMinutes = Math.max(60, ...dailyData.map(d => d.minutes));
    const chartHeight = 120;
    const barWidth = 26;
    const spacing = 18;
    const startX = 24;
    const totalWidth = startX * 2 + dailyData.length * barWidth + (dailyData.length - 1) * spacing;

    const bars = dailyData.map((d, i) => {
      const x = startX + i * (barWidth + spacing);
      const barH = d.minutes > 0 ? Math.max(6, Math.round((d.minutes / maxMinutes) * (chartHeight - 40))) : 4;
      const y = chartHeight - 24 - barH;
      const isToday = d.isToday;
      const fill = isToday
        ? 'url(#barGradientActive)'
        : (d.minutes > 0 ? 'url(#barGradientNormal)' : 'var(--bar-empty-bg)');

      const formattedMins = Analytics.formatDuration(d.minutes);

      return `
        <g class="chart-bar-group" tabindex="0" role="img" aria-label="${d.label}: ${formattedMins}">
          <!-- Background pill highlight on hover/today -->
          <rect x="${x - 4}" y="6" width="${barWidth + 8}" height="${chartHeight - 14}" rx="8" class="bar-hover-bg ${isToday ? 'today-bg' : ''}" />
          
          <!-- Bar Value Label (if non-zero) -->
          ${d.minutes > 0 ? `<text x="${x + barWidth / 2}" y="${y - 6}" text-anchor="middle" class="bar-val-text">${formattedMins}</text>` : ''}
          
          <!-- The Bar -->
          <rect x="${x}" y="${y}" width="${barWidth}" height="${barH}" rx="6" fill="${fill}" class="chart-bar" />
          
          <!-- Day Label -->
          <text x="${x + barWidth / 2}" y="${chartHeight - 6}" text-anchor="middle" class="bar-day-label ${isToday ? 'active-day-label' : ''}">
            ${d.label}${isToday ? ' •' : ''}
          </text>
        </g>
      `;
    }).join('');

    return `
      <svg viewBox="0 0 ${totalWidth} ${chartHeight}" class="analytics-bar-chart" preserveAspectRatio="xMidYMid meet" role="graphics-document" aria-label="Weekly study time bar chart">
        <defs>
          <linearGradient id="barGradientActive" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#a855f7" />
            <stop offset="100%" stop-color="#6366f1" />
          </linearGradient>
          <linearGradient id="barGradientNormal" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#818cf8" />
            <stop offset="100%" stop-color="#3b82f6" />
          </linearGradient>
        </defs>
        ${bars}
      </svg>
    `;
  },

  // Responsive Circular Progress Donut SVG
  renderDonutChart(rate = 0, size = 110, strokeWidth = 10) {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (rate / 100) * circumference;

    return `
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" class="donut-chart-svg" role="img" aria-label="${rate}% completed">
        <circle
          cx="${size / 2}"
          cy="${size / 2}"
          r="${radius}"
          stroke="var(--donut-track)"
          stroke-width="${strokeWidth}"
          fill="none"
        />
        <circle
          cx="${size / 2}"
          cy="${size / 2}"
          r="${radius}"
          stroke="url(#donutGradient)"
          stroke-width="${strokeWidth}"
          stroke-linecap="round"
          stroke-dasharray="${circumference}"
          stroke-dashoffset="${offset}"
          fill="none"
          transform="rotate(-90 ${size / 2} ${size / 2})"
          class="donut-progress-circle"
        />
        <defs>
          <linearGradient id="donutGradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#8b5cf6" />
            <stop offset="100%" stop-color="#3b82f6" />
          </linearGradient>
        </defs>
        <text x="50%" y="47%" text-anchor="middle" dominant-baseline="central" class="donut-rate-num">${rate}%</text>
        <text x="50%" y="65%" text-anchor="middle" dominant-baseline="central" class="donut-rate-label">Done</text>
      </svg>
    `;
  }
};

window.StudyFlowAnalytics = Analytics;
