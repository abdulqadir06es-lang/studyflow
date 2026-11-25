/**
 * StudyFlow - Focus Timer (Pomodoro Engine)
 * High-precision timer using timestamp differentials to resist background tab throttling.
 * Features Web Audio API synth chimes, subject tagging, and browser notifications.
 */

class FocusTimer {
  constructor(stateManager) {
    this.stateManager = stateManager;
    this.mode = 'focus'; // 'focus' | 'shortBreak' | 'longBreak'
    this.status = 'idle'; // 'idle' | 'running' | 'paused'
    this.remainingSeconds = 25 * 60;
    this.initialSeconds = 25 * 60;
    this.targetEndTime = null;
    this.timerInterval = null;
    this.selectedSubjectId = null;
    this.audioContext = null;
    this.listeners = [];

    // Initialize default durations from settings
    this.syncWithSettings();
  }

  syncWithSettings() {
    const settings = this.stateManager.getState().settings || {};
    this.durations = {
      focus: (settings.focusDuration || 25) * 60,
      shortBreak: (settings.shortBreakDuration || 5) * 60,
      longBreak: (settings.longBreakDuration || 15) * 60
    };

    if (this.status === 'idle') {
      this.remainingSeconds = this.durations[this.mode];
      this.initialSeconds = this.durations[this.mode];
    }
  }

  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  notify() {
    const data = {
      mode: this.mode,
      status: this.status,
      remainingSeconds: this.remainingSeconds,
      initialSeconds: this.initialSeconds,
      progressPercent: Math.min(100, Math.max(0, ((this.initialSeconds - this.remainingSeconds) / this.initialSeconds) * 100)),
      formattedTime: this.formatTime(this.remainingSeconds),
      selectedSubjectId: this.selectedSubjectId
    };
    this.listeners.forEach(cb => {
      try {
        cb(data);
      } catch (err) {
        console.error('Error in timer listener:', err);
      }
    });
  }

  formatTime(totalSeconds) {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  setMode(mode) {
    if (!['focus', 'shortBreak', 'longBreak'].includes(mode)) return;
    this.pause();
    this.mode = mode;
    this.remainingSeconds = this.durations[mode];
    this.initialSeconds = this.durations[mode];
    this.status = 'idle';
    this.notify();
  }

  setCustomDuration(mode, minutes) {
    const mins = parseInt(minutes, 10);
    if (isNaN(mins) || mins < 1 || mins > 180) return;

    this.durations[mode] = mins * 60;

    // Update settings in state
    const updateKey = mode === 'focus'
      ? 'focusDuration'
      : (mode === 'shortBreak' ? 'shortBreakDuration' : 'longBreakDuration');
    this.stateManager.updateSettings({ [updateKey]: mins });

    if (this.mode === mode && this.status === 'idle') {
      this.remainingSeconds = this.durations[mode];
      this.initialSeconds = this.durations[mode];
      this.notify();
    }
  }

  setSelectedSubject(subjectId) {
    this.selectedSubjectId = subjectId || null;
    this.notify();
  }

  start() {
    if (this.status === 'running') return;

    // Target end time based on current time + remaining seconds
    this.targetEndTime = Date.now() + this.remainingSeconds * 1000;
    this.status = 'running';

    // Clear any existing interval
    if (this.timerInterval) clearInterval(this.timerInterval);

    this.timerInterval = setInterval(() => this.tick(), 250);
    this.notify();
  }

  pause() {
    if (this.status !== 'running') return;

    // Recompute exact remaining seconds
    if (this.targetEndTime) {
      this.remainingSeconds = Math.max(0, Math.ceil((this.targetEndTime - Date.now()) / 1000));
    }

    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }

    this.status = 'paused';
    this.notify();
  }

  resume() {
    if (this.status === 'paused') {
      this.start();
    }
  }

  reset() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    this.status = 'idle';
    this.remainingSeconds = this.durations[this.mode];
    this.initialSeconds = this.durations[this.mode];
    this.targetEndTime = null;
    this.notify();
  }

  tick() {
    if (this.status !== 'running' || !this.targetEndTime) return;

    const diffMs = this.targetEndTime - Date.now();
    const remaining = Math.max(0, Math.ceil(diffMs / 1000));

    if (remaining !== this.remainingSeconds) {
      this.remainingSeconds = remaining;
      this.notify();
    }

    if (diffMs <= 0) {
      this.complete();
    }
  }

  complete() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }

    this.remainingSeconds = 0;
    this.status = 'idle';

    const completedMode = this.mode;
    const completedMinutes = Math.round(this.initialSeconds / 60);

    // If it was a focus session, record the log!
    if (completedMode === 'focus') {
      this.stateManager.recordFocusSession({
        subjectId: this.selectedSubjectId,
        duration: completedMinutes,
        mode: 'focus'
      });
    }

    // Play chime sound
    this.playChime();

    // Show desktop notification if available
    this.sendNotification(completedMode);

    // Auto-advance mode or prepare next
    if (completedMode === 'focus') {
      this.mode = 'shortBreak';
    } else {
      this.mode = 'focus';
    }

    this.remainingSeconds = this.durations[this.mode];
    this.initialSeconds = this.durations[this.mode];

    this.notify();

    // Broadcast completion event for UI toasts
    window.dispatchEvent(new CustomEvent('studyflow:timerComplete', {
      detail: {
        mode: completedMode,
        duration: completedMinutes
      }
    }));
  }

  // Pure Web Audio API Synthesizer (Works 100% offline, no audio assets needed)
  playChime() {
    const settings = this.stateManager.getState().settings || {};
    if (settings.soundEnabled === false) return;

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;

      if (!this.audioContext || this.audioContext.state === 'suspended') {
        this.audioContext = new AudioCtx();
      }

      const now = this.audioContext.currentTime;

      // Play a lovely two-tone harmonic bell (C5 -> G5)
      const playTone = (freq, startTime, duration) => {
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.001, startTime);
        gain.gain.exponentialRampToValueAtTime(0.3, startTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

        osc.connect(gain);
        gain.connect(this.audioContext.destination);

        osc.start(startTime);
        osc.stop(startTime + duration);
      };

      playTone(523.25, now, 0.8);        // C5
      playTone(659.25, now + 0.25, 0.8); // E5
      playTone(783.99, now + 0.5, 1.2);  // G5
    } catch (e) {
      console.warn('Web Audio playback failed or blocked by autoplay policy:', e);
    }
  }

  sendNotification(mode) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    const title = mode === 'focus' ? '🎉 Focus Session Finished!' : '🔔 Break Ended!';
    const body = mode === 'focus'
      ? 'Great job staying focused! Take a well-deserved short break.'
      : 'Time to dive back into your studies. You got this!';

    try {
      new Notification(title, {
        body,
        icon: 'favicon.ico'
      });
    } catch (e) {
      console.warn('Desktop notification failed:', e);
    }
  }

  async requestNotificationPermission() {
    if (!('Notification' in window)) return false;
    try {
      const permission = await Notification.requestPermission();
      const granted = permission === 'granted';
      this.stateManager.updateSettings({ notificationsEnabled: granted });
      return granted;
    } catch (e) {
      return false;
    }
  }
}

// Export singleton
window.StudyFlowTimer = new FocusTimer(window.StudyFlowState);
