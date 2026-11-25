import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  CheckSquare,
  BookOpen,
  Award,
  Calendar,
  Timer,
  BarChart3,
  Plus,
  Play,
  Pause,
  RotateCcw,
  Sun,
  Moon,
  ShieldCheck,
  Trash2,
  Edit3,
  Flame,
  Clock,
  CheckCircle2,
  Download,
  Upload,
  Search,
  Filter
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './components/ui/card';
import { Button } from './components/ui/button';
import { Badge } from './components/ui/badge';

const STORAGE_KEY = 'studyflow_data_v1';

export default function App() {
  // Theme state
  const [theme, setTheme] = useState(() => localStorage.getItem('studyflow_theme') || 'dark');
  const [activeTab, setActiveTab] = useState('dashboard');

  // StudyFlow State
  const [data, setData] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return {
      subjects: [
        { id: 'subj_cs', name: 'Computer Science', code: 'CS 101', color: '#8b5cf6', description: 'Algorithms & Data Structures' },
        { id: 'subj_math', name: 'Calculus II', code: 'MATH 202', color: '#3b82f6', description: 'Multivariate differentiation & integrals' },
        { id: 'subj_bio', name: 'Human Biology', code: 'BIO 110', color: '#10b981', description: 'Cell physiology & neural systems' },
      ],
      tasks: [
        { id: 't1', title: 'Implement Binary Search Tree', subjectId: 'subj_cs', dueDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10), priority: 'high', completed: false },
        { id: 't2', title: 'Complete Calculus Problem Set 5', subjectId: 'subj_math', dueDate: new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10), priority: 'medium', completed: false },
        { id: 't3', title: 'Review Cell Membrane Pathways', subjectId: 'subj_bio', dueDate: new Date(Date.now() - 86400000).toISOString().slice(0, 10), priority: 'high', completed: true },
      ],
      exams: [
        { id: 'e1', title: 'Algorithms Midterm Exam', subjectId: 'subj_cs', examDate: new Date(Date.now() + 86400000 * 5).toISOString().slice(0, 10), examTime: '10:00', location: 'Hall B' },
        { id: 'e2', title: 'Calculus II Final Test', subjectId: 'subj_math', examDate: new Date(Date.now() + 86400000 * 12).toISOString().slice(0, 10), examTime: '14:00', location: 'Math Bldg 101' },
      ],
      sessions: [
        { id: 's1', subjectId: 'subj_cs', date: new Date().toISOString().slice(0, 10), startTime: '15:00', duration: 45, topic: 'Tree traversal algorithms', completed: false }
      ],
      focusLogs: [
        { id: 'f1', duration: 25, completedAt: new Date().toISOString(), mode: 'focus' }
      ]
    };
  });

  // Local storage auto-sync
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('LocalStorage write failed:', e);
    }
  }, [data]);

  // Theme auto-sync
  useEffect(() => {
    localStorage.setItem('studyflow_theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.className = theme === 'dark' ? 'dark' : '';
  }, [theme]);

  // Timer State
  const [timerSeconds, setTimerSeconds] = useState(25 * 60);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerMode, setTimerMode] = useState('focus'); // 'focus' | 'shortBreak' | 'longBreak'
  const timerIntervalRef = useRef(null);

  useEffect(() => {
    if (timerRunning) {
      timerIntervalRef.current = setInterval(() => {
        setTimerSeconds(prev => {
          if (prev <= 1) {
            clearInterval(timerIntervalRef.current);
            setTimerRunning(false);
            // Log focus session
            if (timerMode === 'focus') {
              setData(d => ({
                ...d,
                focusLogs: [...d.focusLogs, { id: 'f_' + Date.now(), duration: 25, completedAt: new Date().toISOString(), mode: 'focus' }]
              }));
            }
            alert(timerMode === 'focus' ? '🎉 Focus session finished! Take a break.' : '🔔 Break ended! Back to work.');
            return 25 * 60;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(timerIntervalRef.current);
    }
    return () => clearInterval(timerIntervalRef.current);
  }, [timerRunning, timerMode]);

  const formatTimer = (s) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Toggle Task Completion
  const toggleTask = (id) => {
    setData(prev => ({
      ...prev,
      tasks: prev.tasks.map(t => t.id === id ? { ...t, completed: !t.completed, completedAt: !t.completed ? new Date().toISOString() : null } : t)
    }));
  };

  // Delete Task
  const deleteTask = (id) => {
    if (confirm('Delete this task?')) {
      setData(prev => ({ ...prev, tasks: prev.tasks.filter(t => t.id !== id) }));
    }
  };

  // Metrics calculation
  const pendingTasks = data.tasks.filter(t => !t.completed);
  const completedTasks = data.tasks.filter(t => t.completed);
  const totalFocusMinutes = data.focusLogs.reduce((acc, l) => acc + (l.duration || 0), 0);

  return (
    <div className={`min-h-screen bg-background text-foreground flex ${theme === 'dark' ? 'dark' : ''}`}>
      {/* SIDEBAR */}
      <aside className="w-64 border-r border-border bg-card/60 backdrop-blur-md p-4 hidden md:flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-3 px-2 py-4 mb-6">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-blue-500 flex items-center justify-center text-white shadow-lg shadow-purple-500/25">
              ⚡
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">StudyFlow</h1>
              <span className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">Student OS</span>
            </div>
          </div>

          <nav className="space-y-1.5">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
              { id: 'tasks', label: 'Tasks & Homework', icon: CheckSquare, badge: pendingTasks.length },
              { id: 'subjects', label: 'Subjects', icon: BookOpen, badge: data.subjects.length },
              { id: 'exams', label: 'Exams', icon: Award, badge: data.exams.length },
              { id: 'schedule', label: 'Study Schedule', icon: Calendar },
              { id: 'timer', label: 'Focus Timer', icon: Timer },
              { id: 'progress', label: 'Progress', icon: BarChart3 },
            ].map(item => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    active ? 'bg-primary/15 text-primary font-semibold' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${active ? 'text-primary' : 'text-muted-foreground'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && (
                    <Badge variant={active ? 'default' : 'outline'} className="text-xs h-5 px-1.5">
                      {item.badge}
                    </Badge>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Theme & Local Storage Notice */}
        <div className="pt-4 border-t border-border space-y-3">
          <div className="flex items-center justify-between px-2">
            <span className="text-xs text-muted-foreground flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              100% Local Storage
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </aside>

      {/* MAIN VIEW CONTENT */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8 max-w-6xl mx-auto">
        {/* Top Header */}
        <header className="flex items-center justify-between pb-6 mb-6 border-b border-border">
          <div>
            <h2 className="text-2xl font-bold tracking-tight capitalize">{activeTab}</h2>
            <p className="text-sm text-muted-foreground">Keep your semester organized, focused, and on track.</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="gap-1.5 py-1 px-3 text-amber-500 border-amber-500/30 bg-amber-500/10">
              <Flame className="w-3.5 h-3.5 fill-current" />
              <span>3 Day Streak</span>
            </Badge>
          </div>
        </header>

        {/* TAB CONTENTS WITH FRAMER MOTION TRANSITIONS */}
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-6"
            >
              {/* Metric Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border-purple-500/20 bg-gradient-to-br from-card to-purple-950/10">
                  <CardHeader className="pb-2">
                    <CardDescription className="text-xs font-semibold uppercase tracking-wider text-purple-400">Pending Tasks</CardDescription>
                    <CardTitle className="text-3xl font-extrabold">{pendingTasks.length}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-xs text-muted-foreground">
                    {data.tasks.filter(t => new Date(t.dueDate) < new Date() && !t.completed).length} overdue
                  </CardContent>
                </Card>

                <Card className="border-blue-500/20 bg-gradient-to-br from-card to-blue-950/10">
                  <CardHeader className="pb-2">
                    <CardDescription className="text-xs font-semibold uppercase tracking-wider text-blue-400">Upcoming Exams</CardDescription>
                    <CardTitle className="text-3xl font-extrabold">{data.exams.length}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-xs text-muted-foreground">Next test in 5 days</CardContent>
                </Card>

                <Card className="border-emerald-500/20 bg-gradient-to-br from-card to-emerald-950/10">
                  <CardHeader className="pb-2">
                    <CardDescription className="text-xs font-semibold uppercase tracking-wider text-emerald-400">Completed Tasks</CardDescription>
                    <CardTitle className="text-3xl font-extrabold">{completedTasks.length}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-xs text-muted-foreground">
                    {data.tasks.length > 0 ? Math.round((completedTasks.length / data.tasks.length) * 100) : 0}% completion rate
                  </CardContent>
                </Card>

                <Card className="border-indigo-500/20 bg-gradient-to-br from-card to-indigo-950/10">
                  <CardHeader className="pb-2">
                    <CardDescription className="text-xs font-semibold uppercase tracking-wider text-indigo-400">Total Focus Time</CardDescription>
                    <CardTitle className="text-3xl font-extrabold">{totalFocusMinutes}m</CardTitle>
                  </CardHeader>
                  <CardContent className="text-xs text-muted-foreground">Pomodoro sessions logged</CardContent>
                </Card>
              </div>

              {/* Tasks List Card */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Upcoming Deadlines</CardTitle>
                    <CardDescription>Tasks and homework sorted by due date</CardDescription>
                  </div>
                  <Button size="sm" onClick={() => setActiveTab('tasks')}>View All Tasks</Button>
                </CardHeader>
                <CardContent className="space-y-3">
                  {data.tasks.map(task => {
                    const subj = data.subjects.find(s => s.id === task.subjectId);
                    return (
                      <div
                        key={task.id}
                        className="flex items-center justify-between p-3.5 rounded-lg border border-border bg-card/40 hover:border-primary/40 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => toggleTask(task.id)}
                            className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                              task.completed ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-input hover:border-primary'
                            }`}
                          >
                            {task.completed && <CheckCircle2 className="w-4 h-4" />}
                          </button>
                          <div>
                            <span className={`text-sm font-medium ${task.completed ? 'line-through text-muted-foreground' : ''}`}>
                              {task.title}
                            </span>
                            <div className="flex items-center gap-2 mt-1">
                              {subj && (
                                <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: `${subj.color}20`, color: subj.color }}>
                                  {subj.name}
                                </span>
                              )}
                              <span className="text-xs text-muted-foreground">Due: {task.dueDate}</span>
                            </div>
                          </div>
                        </div>
                        <Badge variant={task.priority === 'high' ? 'destructive' : 'outline'}>{task.priority}</Badge>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {activeTab === 'timer' && (
            <motion.div
              key="timer"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="max-w-md mx-auto text-center space-y-6 pt-8"
            >
              <div className="flex justify-center gap-2 p-1 bg-card rounded-full border border-border">
                {['focus', 'shortBreak', 'longBreak'].map(m => (
                  <Button
                    key={m}
                    variant={timerMode === m ? 'default' : 'ghost'}
                    size="sm"
                    className="rounded-full capitalize"
                    onClick={() => {
                      setTimerMode(m);
                      setTimerRunning(false);
                      setTimerSeconds(m === 'focus' ? 25 * 60 : (m === 'shortBreak' ? 5 * 60 : 15 * 60));
                    }}
                  >
                    {m === 'focus' ? 'Focus (25m)' : (m === 'shortBreak' ? 'Short Break (5m)' : 'Long Break (15m)')}
                  </Button>
                ))}
              </div>

              <div className="relative w-64 h-64 mx-auto flex items-center justify-center rounded-full border-4 border-primary/20 bg-card/60 shadow-xl shadow-purple-500/10">
                <span className="text-6xl font-extrabold font-mono tracking-tight text-primary">
                  {formatTimer(timerSeconds)}
                </span>
              </div>

              <div className="flex justify-center gap-4">
                <Button
                  size="lg"
                  className="rounded-full px-8 gap-2"
                  onClick={() => setTimerRunning(!timerRunning)}
                >
                  {timerRunning ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                  {timerRunning ? 'Pause' : 'Start Session'}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-full w-11 h-11"
                  onClick={() => {
                    setTimerRunning(false);
                    setTimerSeconds(timerMode === 'focus' ? 25 * 60 : (timerMode === 'shortBreak' ? 5 * 60 : 15 * 60));
                  }}
                >
                  <RotateCcw className="w-5 h-5" />
                </Button>
              </div>
            </motion.div>
          )}

          {activeTab === 'tasks' && (
            <motion.div
              key="tasks"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-4"
            >
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-lg">All Homework &amp; Assignments</h3>
                <Button size="sm" onClick={() => {
                  const title = prompt('Enter task title:');
                  if (title && title.trim()) {
                    setData(d => ({
                      ...d,
                      tasks: [...d.tasks, {
                        id: 't_' + Date.now(),
                        title: title.trim(),
                        dueDate: new Date().toISOString().slice(0, 10),
                        priority: 'medium',
                        completed: false
                      }]
                    }));
                  }
                }}>
                  <Plus className="w-4 h-4 mr-1.5" /> Add Task
                </Button>
              </div>

              <div className="space-y-2">
                {data.tasks.map(task => (
                  <div key={task.id} className="p-4 rounded-lg border border-border bg-card flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => toggleTask(task.id)}
                        className={`w-5 h-5 rounded border flex items-center justify-center ${
                          task.completed ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-input'
                        }`}
                      >
                        {task.completed && <CheckCircle2 className="w-4 h-4" />}
                      </button>
                      <span className={task.completed ? 'line-through text-muted-foreground' : 'font-medium'}>{task.title}</span>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => deleteTask(task.id)} className="text-destructive hover:bg-destructive/10">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'subjects' && (
            <motion.div
              key="subjects"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-4"
            >
              {data.subjects.map(s => (
                <Card key={s.id} className="relative overflow-hidden">
                  <div className="h-1.5 w-full" style={{ backgroundColor: s.color }} />
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{s.name}</CardTitle>
                      <Badge variant="outline">{s.code}</Badge>
                    </div>
                    <CardDescription>{s.description}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </motion.div>
          )}

          {activeTab === 'progress' && (
            <motion.div
              key="progress"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader>
                    <CardDescription>Current Study Streak</CardDescription>
                    <CardTitle className="text-3xl text-amber-500 flex items-center gap-2">
                      <Flame className="w-7 h-7 fill-current" /> 3 Days
                    </CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader>
                    <CardDescription>Task Turnaround</CardDescription>
                    <CardTitle className="text-3xl text-purple-400">
                      {data.tasks.length > 0 ? Math.round((completedTasks.length / data.tasks.length) * 100) : 0}%
                    </CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader>
                    <CardDescription>Total Focus Time</CardDescription>
                    <CardTitle className="text-3xl text-blue-400">{totalFocusMinutes} mins</CardTitle>
                  </CardHeader>
                </Card>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
