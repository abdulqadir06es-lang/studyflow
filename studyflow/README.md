# ⚡ StudyFlow — Modern Student OS & Study Planner

> A complete, polished, and mobile-friendly web application designed for students worldwide to organize courses, homework, exams, and Pomodoro focus sessions in one unified dashboard.

---

## ✨ Features & Architecture

### 🎨 Design & UI
- **Tailwind CSS & Shadcn/UI Aesthetics**: Deep zinc/slate dark surfaces (`#080b12`, `#12192b`), purple (`#8b5cf6`) and blue (`#3b82f6`) primary accents, crisp 1px borders, subtle glow rings, and responsive cards.
- **Light & Dark Theme Toggle**: One-click theme switcher with instant persistence in `localStorage`.
- **Lucide Iconography**: Pixel-perfect, scalable icons matching Lucide React for consistent international typography.
- **Framer Motion Micro-Animations**: Smooth Apple-like spring easing (`cubic-bezier(0.34, 1.56, 0.64, 1)`), interactive button press scales (`scale(0.96)`), sliding tab indicators, and scale-in modal dialogs.
- **100% Responsive Layout**:
  - **Desktop**: Fixed sleek sidebar navigation with quick-access Pomodoro widget.
  - **Mobile & Tablet**: Touch-friendly hamburger drawer + persistent bottom navigation bar for quick 1-tap switching between Home, Tasks, Schedule, Timer, and Progress.

---

## 🚀 Core Capabilities

### 1. Dashboard
- **Personalized Daily Briefing**: Dynamic greeting based on time of day (Good morning / afternoon / evening) with intelligent task overview ("You have 2 pending tasks and 1 exam this week").
- **4 Key Metric Cards**:
  - 📋 **Pending Tasks**: Real-time incomplete count with overdue pill badge.
  - 🎯 **Upcoming Exams**: Countdown to the next upcoming test.
  - ✅ **Completed Tasks**: Overall completion rate percentage.
  - ⏱️ **Total Focus Time**: Lifetime focus hours and minutes logged today.
- **Upcoming Deadlines Feed**: Combined tasks and exams sorted chronologically with live countdowns ("In 2 days", "Tomorrow", "Overdue").
- **Quick Action Hub**: Instant buttons to add tasks, subjects, exams, or start a Pomodoro session.

### 2. Subjects Management
- Add, edit, and delete courses with subject name, optional course code (e.g. `CS 101`), description, and color accents.
- 8 curated preset colors (Purple, Blue, Cyan, Emerald, Amber, Pink, Red, Indigo) plus a custom HEX color picker.
- Live metrics per subject: total tasks, completed, exams, and weekly study sessions.
- **Safe Deletion Modal**: Explains associated items with a choice to either keep items marked as "Unassigned" or cascade-delete all linked items.

### 3. Tasks & Homework
- Add, edit, delete, and toggle tasks with satisfying custom checkmarks.
- Fields: Title, description, subject selector, due date, due time, priority (High, Medium, Low).
- **Search & Filter Bar**: Instant search by title/notes; filter by subject, priority, or status (Pending, Overdue, Completed, All).
- **Sort Selector**: Sort by Due Date (soonest first / furthest first), Priority (high to low), or Title (A-Z).
- Form validation with inline error feedback.

### 4. Exam Timetable & Quizzes
- Track exam dates, start times, test locations (e.g. "Hall B - Room 204"), and preparation notes.
- **Live Countdowns**: Real-time countdowns ("In 4 days", "Tomorrow at 10:00").
- **Separated Tabs**: Clean separation between **Upcoming Exams** and **Past Exams**.

### 5. Weekly Study Schedule (7-Day Planner)
- Dedicated 7-column calendar matrix (Monday through Sunday) highlighting the current day.
- Displays planned sessions with subject color bars, start times, durations, and session topics.
- One-click checkbox to mark planned sessions as complete.

### 6. Focus Timer (Pomodoro Engine)
- Modes: **Focus (25m)**, **Short Break (5m)**, **Long Break (15m)** with configurable duration inputs.
- Subject tagging: Log study sessions directly to a specific course.
- **Background Tab Resilience**: Uses `Date.now()` timestamp differentials to prevent clock drift when tabs are backgrounded or screen locks.
- **Web Audio API Synth Chime**: Beautiful harmonic bell audio chime that works 100% offline without external audio files.
- Desktop browser notification support.

### 7. Progress & Analytics
- **Study Streak Counter (🔥)**: Tracks consecutive days with completed tasks or focus sessions.
- **Responsive SVG Weekly Bar Chart**: 7-day focus hour visualization with tooltips and active day indicators.
- **Circular Donut Completion Chart**: Live SVG donut chart of task completion percentage.
- **Subject Workload Breakdown**: Visual progress bars showing completion rates per enrolled course.

### 8. Data & Privacy (100% Local)
- No sign-up or login required.
- Stored exclusively in the user's browser `localStorage`.
- **Export Backup**: One-click download of `studyflow-backup-[date].json`.
- **Import Backup**: Restore data with schema validation and friendly error handling.
- **Load Demo Data**: Pre-loaded realistic university courses, assignments, and test schedules for instant evaluation.
- **Reset All Data**: Safe reset with double confirmation.

---

## 💻 How to Run Locally

### Option A: Direct Open (Zero Setup Required)
Simply double-click `index.html` in the `studyflow` folder, or right-click and choose **Open with > Chrome / Edge / Firefox / Safari**.

### Option B: Local Web Server
You can serve the folder using any lightweight static server:

```powershell
# Using Python (if installed)
python -m http.server 8080

# Using Node / npx (if installed)
npx serve .

# Or using VS Code "Live Server" extension
Right-click index.html -> "Open with Live Server"
```

### Option C: Modern React + Vite App (`react-app/`)
If you prefer running the React source repository:
```bash
cd react-app
npm install
npm run dev
```

---

## 🌐 How to Publish to the Web (Free & Fast)

### 1. GitHub Pages (Recommended)
1. Create a free repository on [GitHub](https://github.com) named `studyflow`.
2. Push the contents of the `studyflow` folder to your repository:
   ```bash
   git init
   git add .
   git commit -m "Initial commit of StudyFlow"
   git branch -M main
   git remote add origin https://github.com/<your-username>/studyflow.git
   git push -u origin main
   ```
3. Go to **Settings > Pages** in your GitHub repository.
4. Under **Branch**, select `main` and root `/`, then click **Save**.
5. Your app is live at `https://<your-username>.github.io/studyflow/`!

### 2. Vercel
1. Go to [vercel.com](https://vercel.com) and log in.
2. Click **Add New... > Project** and import your GitHub repository (or drag-and-drop the folder using the Vercel CLI).
3. If deploying the root folder, keep default settings and click **Deploy**.
4. Your app will be live on a custom `.vercel.app` URL with free SSL!

### 3. Netlify
1. Go to [netlify.com](https://netlify.com) and log in.
2. Drag and drop the `studyflow` folder directly into the **Netlify Drop** area.
3. Your site deploys in seconds with a custom `.netlify.app` domain.

---

## 🧪 Testing Verification
StudyFlow includes an automated browser test suite in `test-runner.html`. Open `test-runner.html` in any browser to execute unit and integration tests across state persistence, CRUD operations, timer math, validation, and JSON import/export.
