/**
 * StudyFlow - AI Intelligence Engine with Server-Side Endpoint
 * All AI requests are securely proxied through the server endpoint (/api/ai/chat).
 * The client browser NEVER holds, injects, or transmits the Gemini API key.
 * Includes resilient offline fallback to the local academic knowledge base.
 */

const StudyFlowAI = {
  // Server-side endpoint proxy. The browser NEVER stores or sees the API key.
  apiEndpoint: '/api/ai/chat',

  // Call the secure server-side AI proxy endpoint
  async callServerAI(prompt, systemInstruction = '') {
    try {
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt,
          systemInstruction
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.warn('Server AI endpoint returned status:', response.status, errorData);
        return null;
      }

      const data = await response.json();
      return data.text || null;
    } catch (err) {
      console.warn('Could not connect to server AI endpoint, falling back to local academic knowledge base:', err);
      return null;
    }
  },

  // Domain knowledge dictionary for offline / fallback intelligence
  knowledgeBase: {
    'algorithms': {
      summary: 'Algorithms are step-by-step procedures for calculation, data processing, and automated reasoning.',
      keyConcepts: ['Big-O Time & Space Complexity', 'Divide and Conquer', 'Dynamic Programming', 'Greedy Algorithms', 'Graph Traversals (BFS/DFS)'],
      tips: 'Analyze worst-case vs average-case behavior. For recursive algorithms, use the Master Theorem.'
    },
    'data structures': {
      summary: 'Data structures organize and store data for efficient access and modification.',
      keyConcepts: ['Arrays & Linked Lists', 'Stacks (LIFO) & Queues (FIFO)', 'Hash Tables (O(1) average lookup)', 'Binary Search Trees & AVL Trees', 'Heaps & Priority Queues'],
      tips: 'Choose trees for ordered data; use hash maps for ultra-fast key lookups.'
    },
    'calculus': {
      summary: 'Calculus studies continuous change through derivatives (rates of change) and integrals (accumulation).',
      keyConcepts: ['Limits & Continuity', 'Product, Quotient & Chain Rules', 'Definite & Indefinite Integrals', 'Fundamental Theorem of Calculus', 'Multivariate Gradients & Directional Derivatives'],
      tips: 'Always check if the function is continuous before applying theorems. When in doubt, draw a quick graph.'
    },
    'biology': {
      summary: 'Biology is the study of living organisms, cellular mechanisms, genetics, and physiological homeostasis.',
      keyConcepts: ['Cell Theory & Organelles', 'Cellular Respiration (Glycolysis, Krebs Cycle, ETC)', 'DNA Replication & Protein Synthesis', 'Action Potentials & Synaptic Transmission', 'Mendelian Genetics'],
      tips: 'Structure dictates function. Understand how molecular geometry allows enzymes and receptors to function.'
    },
    'history': {
      summary: 'History analyzes past political, economic, social, and cultural events to understand societal trajectories.',
      keyConcepts: ['Primary vs Secondary Sources', 'Cause & Effect Cascades', 'Geopolitical Treaties & Alliances', 'Industrial & Technological Revolutions'],
      tips: 'Context is everything: analyze the economic motives and technological realities of the era.'
    }
  },

  // Daily Cognitive Tips for Study Optimization
  cognitiveTips: [
    "Active Recall testing increases long-term memory retention by over 50% compared to passive re-reading.",
    "Spaced Repetition: Reviewing material after 1 day, 3 days, and 7 days flattens the Ebbinghaus forgetting curve.",
    "The Feynman Technique: If you can't explain a topic in plain language to a 10-year-old, you haven't mastered it yet.",
    "Interleaving Practice: Mixing different subjects or problem types during one study block improves problem-solving adaptability.",
    "Sleep Consolidation: Deep REM sleep transforms short-term hippocampus notes into permanent neocortical memories."
  ],

  // ==========================================
  // 1. AI TEACHER CHAT ENGINE
  // ==========================================
  async askTutor(userQuery, subjectContext = 'General') {
    const q = (userQuery || '').trim();
    if (!q) throw new Error('Query cannot be empty.');

    const systemInstruction = `You are StudyFlow AI Teacher, an elite, warm, encouraging academic tutor and study coach.
The student is currently asking for help with their academic subject: "${subjectContext}".
Respond in clear, beautiful Markdown with:
- Clear headings (### and ####)
- Bullet points for core concepts
- A memorable analogy or mental model
- A quick comprehension check question at the end to test understanding.
Keep the tone professional, motivating, and rigorous.`;

    // 1. Attempt Server-Side Gemini Call
    const serverReply = await this.callServerAI(q, systemInstruction);
    if (serverReply) {
      return serverReply;
    }

    // 2. Offline / Heuristic Fallback Engine
    const qLower = q.toLowerCase();
    await new Promise(resolve => setTimeout(resolve, 350));

    // Handle summarization requests
    if (qLower.startsWith('summarize') || qLower.includes('summary') || q.length > 250) {
      return this.generateSummaryResponse(q, subjectContext);
    }

    // Handle explanation requests
    if (qLower.startsWith('explain') || qLower.startsWith('what is') || qLower.startsWith('how to') || qLower.startsWith('how does')) {
      return this.generateExplanationResponse(q, subjectContext);
    }

    // Handle practice quiz request
    if (qLower.includes('quiz') || qLower.includes('practice question') || qLower.includes('test me')) {
      return this.generateQuizResponse(q, subjectContext);
    }

    return this.generateGeneralResponse(q, subjectContext);
  },

  generateSummaryResponse(text, subject) {
    const clean = text.replace(/^(summarize|summary of|please summarize):?/i, '').trim();
    const sentences = clean.split(/[.?!]\s+/).filter(s => s.length > 8);

    const bullets = sentences.slice(0, 4).map(s => `• **Key Takeaway:** ${s.trim()}`).join('\n');

    return `### 📑 Academic Summary (${subject})\n\n` +
      `Here is a distilled synthesis of your notes:\n\n` +
      `${bullets || '• Essential core point: Focus on the foundational definitions and main theorems.'}\n\n` +
      `#### 💡 High-Yield Flashcard Idea:\n` +
      `> **Front:** What is the primary thesis of this concept?\n` +
      `> **Back:** ${sentences[0] || 'Core foundational definition'}\n\n` +
      `*Would you like me to generate 3 practice flashcards from this text or create a quiz?*`;
  },

  generateExplanationResponse(query, subject) {
    const queryLower = query.toLowerCase();
    let matchedTopic = null;

    for (const [topic, data] of Object.entries(this.knowledgeBase)) {
      if (queryLower.includes(topic)) {
        matchedTopic = data;
        break;
      }
    }

    if (matchedTopic) {
      return `### 🎓 Deep Dive: ${subject}\n\n` +
        `${matchedTopic.summary}\n\n` +
        `#### 🔑 Core Pillars to Remember:\n` +
        matchedTopic.keyConcepts.map(c => `1. **${c}**`).join('\n') + `\n\n` +
        `#### 🧠 Mental Model / Study Tip:\n` +
        `> ${matchedTopic.tips}\n\n` +
        `**Next Step:** Would you like a step-by-step example problem or flashcard set?`;
    }

    return `### 🎓 Concept Breakdown: ${query}\n\n` +
      `To master this concept in **${subject}**, let's break it down into three intuitive steps:\n\n` +
      `1. **The Fundamental Definition:** Understand the baseline mechanism before looking at complex formulas.\n` +
      `2. **Real-World Application:** How this concept is actually implemented in problems or scientific experiments.\n` +
      `3. **Common Pitfalls:** Watch out for edge cases and common test traps.\n\n` +
      `> **Pro-Tip:** Try summarizing this in one sentence without looking at your notes to trigger active recall!\n\n` +
      `Feel free to paste your specific lecture notes or textbook excerpt for an in-depth breakdown.`;
  },

  generateQuizResponse(query, subject) {
    return `### 📝 Quick Knowledge Check (${subject})\n\n` +
      `Test your mastery with this practice question:\n\n` +
      `**Question:** What is the most critical constraint or assumption required before applying this principle?\n\n` +
      `A) The system must be linear or time-invariant\n` +
      `B) The input data must be sorted or indexed\n` +
      `C) The variables must be independent\n` +
      `D) Depends on the specific boundary conditions\n\n` +
      `*Reply with your answer (A, B, C, or D) and I will evaluate your reasoning!*`;
  },

  generateGeneralResponse(query, subject) {
    return `### 🤖 StudyFlow AI Teacher (${subject})\n\n` +
      `I've analyzed your question regarding **"${query}"**.\n\n` +
      `Here is how to approach this systematically:\n\n` +
      `• **Clarify Objectives:** Identify whether this requires computational derivation, conceptual memorization, or essay synthesis.\n` +
      `• **Isolate Variables:** Break down the problem into smaller sub-problems.\n` +
      `• **Verify with Practice:** Practice 2-3 similar exam-level questions to cement your understanding.\n\n` +
      `💡 *Tip: You can ask me to "Summarize: [paste notes]", "Quiz me on [topic]", or "Generate flashcards".*`;
  },

  // ==========================================
  // 2. SMART EXAM MANAGER & DIFFICULTY PRIORITIZATION
  // ==========================================
  getExamPriorities(exams = [], subjects = []) {
    const now = new Date();
    const subjectMap = {};
    subjects.forEach(s => { subjectMap[s.id] = s; });

    const diffMultipliers = {
      extreme: 4.5,
      hard: 3.2,
      medium: 2.0,
      easy: 1.0
    };

    const upcomingExams = exams
      .filter(e => new Date(e.examDate + (e.examTime ? 'T' + e.examTime : 'T23:59:59')) >= now)
      .map(exam => {
        const dtStr = exam.examTime ? `${exam.examDate}T${exam.examTime}` : `${exam.examDate}T23:59:59`;
        const examDate = new Date(dtStr);
        const daysLeft = Math.max(0.5, (examDate.getTime() - now.getTime()) / 86400000);
        const diff = exam.difficulty || 'medium';
        const mult = diffMultipliers[diff] || 2.0;

        const priorityScore = (mult * 25) / daysLeft;

        return {
          ...exam,
          subject: exam.subjectId ? subjectMap[exam.subjectId] : null,
          daysLeft: Math.ceil(daysLeft),
          priorityScore: Math.round(priorityScore),
          difficulty: diff,
          prepHours: exam.prepHours || 8
        };
      });

    upcomingExams.sort((a, b) => b.priorityScore - a.priorityScore);

    const ranked = upcomingExams.map((e, index) => {
      let recommendation = '';
      if (e.daysLeft <= 3) {
        recommendation = `🔥 Urgent: Exam is in ${e.daysLeft} days. Prioritize high-yield past papers and active recall.`;
      } else if (e.difficulty === 'extreme' || e.difficulty === 'hard') {
        recommendation = `⚡ High Complexity (${e.difficulty.toUpperCase()}): Recommend starting preparation now. Allocate 45% of weekly study time.`;
      } else {
        recommendation = `Standard review: Maintain steady progress with 1-2 study sessions this week.`;
      }

      return {
        ...e,
        rank: index + 1,
        recommendation
      };
    });

    return ranked;
  },

  // ==========================================
  // 3. AI STUDY SESSION PLANNER (5-HOUR POMODORO BLOCK)
  // ==========================================
  generate5HourPlan(tasks = [], exams = [], subjects = []) {
    const todayStr = new Date().toISOString().slice(0, 10);
    const subjectMap = {};
    subjects.forEach(s => { subjectMap[s.id] = s; });

    const pendingTasks = tasks.filter(t => !t.completed);
    const priorities = this.getExamPriorities(exams, subjects);
    const topExam = priorities[0] || null;

    const task1 = pendingTasks[0] || { title: 'Core Subject Review', subjectId: null };
    const task2 = pendingTasks[1] || { title: 'Practice Problems Set', subjectId: null };

    const topExamSubj = topExam?.subject?.name || 'Upcoming Exam Preparation';
    const subj1 = task1.subjectId ? subjectMap[task1.subjectId]?.name : 'Homework';
    const subj2 = task2.subjectId ? subjectMap[task2.subjectId]?.name : 'Self Study';

    const plan = [
      {
        blockNum: 1,
        type: 'focus',
        title: topExam ? `Deep Focus: ${topExam.title}` : `Deep Focus: ${task1.title}`,
        subject: topExam ? topExamSubj : subj1,
        duration: 50,
        startTime: '13:00',
        endTime: '13:50',
        goal: 'High-intensity review of core theorems, formulas, and toughest exam concepts.'
      },
      {
        blockNum: 2,
        type: 'break',
        title: 'Hydration & Cognitive Rest',
        duration: 10,
        startTime: '13:50',
        endTime: '14:00',
        goal: 'Step away from screen, drink water, and rest your eyes.'
      },
      {
        blockNum: 3,
        type: 'focus',
        title: `Problem Solving: ${task1.title}`,
        subject: subj1,
        duration: 50,
        startTime: '14:00',
        endTime: '14:50',
        goal: 'Hands-on practice problems, derivations, or code implementation.'
      },
      {
        blockNum: 4,
        type: 'break',
        title: 'Long Refreshment Break',
        duration: 15,
        startTime: '14:50',
        endTime: '15:05',
        goal: 'Light snack, stretching, and physical movement to reset attention span.'
      },
      {
        blockNum: 5,
        type: 'focus',
        title: `Flashcard & Active Recall Drill: ${subj2}`,
        subject: subj2,
        duration: 50,
        startTime: '15:05',
        endTime: '15:55',
        goal: 'Rapid spaced-repetition card drills and memory retrieval without looking at notes.'
      },
      {
        blockNum: 6,
        type: 'break',
        title: 'Short Break',
        duration: 10,
        startTime: '15:55',
        endTime: '16:05',
        goal: 'Deep breathing and relaxation.'
      },
      {
        blockNum: 7,
        type: 'focus',
        title: `Assignment Finalization: ${task2.title}`,
        subject: subj2,
        duration: 45,
        startTime: '16:05',
        endTime: '16:50',
        goal: 'Complete assignment questions, format submissions, and double check answers.'
      },
      {
        blockNum: 8,
        type: 'focus',
        title: 'Daily Review & Next-Day Planning',
        subject: 'General Review',
        duration: 20,
        startTime: '16:50',
        endTime: '17:10',
        goal: 'Synthesize what was accomplished, log notes, and set tomorrow goals.'
      }
    ];

    const rationale = topExam
      ? `AI formulated this 5-hour study block around your upcoming ${topExam.title} (${topExam.difficulty} difficulty, due in ${topExam.daysLeft} days) and pending homework deadlines.`
      : `AI structured this 5-hour deep work block to knock out your pending assignments with optimal cognitive break intervals.`;

    return {
      date: todayStr,
      totalFocusMinutes: 215,
      totalBreakMinutes: 35,
      blocks: plan,
      rationale
    };
  },

  // ==========================================
  // 4. AI FLASHCARD GENERATOR
  // ==========================================
  async generateFlashcardsFromNotes(notesText, subjectId = null) {
    const text = (notesText || '').trim();
    if (!text) throw new Error('Please enter text or notes to generate flashcards.');

    // 1. Attempt Server-Side Gemini generation
    const prompt = `From the following study notes, generate between 4 and 6 high-yield active-recall flashcard pairs.
Return ONLY a valid JSON array of objects with "front" (the question or term) and "back" (the concise answer or explanation). No markdown formatting or extra text.
Notes:
"""${text}"""`;

    try {
      const reply = await this.callServerAI(prompt, "You are a flashcard generator. Return ONLY raw JSON array.");
      if (reply) {
        const jsonMatch = reply.match(/\[\s*\{[\s\S]*\}\s*\]/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed.map(c => ({
              front: String(c.front || '').trim(),
              back: String(c.back || '').trim(),
              subjectId
            })).filter(c => c.front && c.back);
          }
        }
      }
    } catch (e) {
      console.warn('Server flashcard generation fallback:', e);
    }

    const lines = text.split(/\n+/).filter(l => l.trim().length > 5);
    const generated = [];

    lines.forEach(line => {
      const matchColon = line.match(/^([A-Za-z0-9\s()_-]{3,40})[:\-—]\s*(.+)$/);
      if (matchColon) {
        generated.push({
          front: `What is ${matchColon[1].trim()}?`,
          back: matchColon[2].trim(),
          subjectId
        });
      } else {
        const matchIs = line.match(/^([A-Za-z0-9\s()_-]{3,40})\s+(is|are|refers to|means)\s+(.+)$/i);
        if (matchIs) {
          generated.push({
            front: `Define: ${matchIs[1].trim()}`,
            back: `${matchIs[1].trim()} ${matchIs[2]} ${matchIs[3].trim()}`,
            subjectId
          });
        }
      }
    });

    if (generated.length === 0) {
      const sentences = text.split(/[.?!]\s+/).filter(s => s.length > 15);
      sentences.slice(0, 4).forEach((s, idx) => {
        generated.push({
          front: `Key Concept #${idx + 1}`,
          back: s.trim(),
          subjectId
        });
      });
    }

    if (generated.length === 0) {
      generated.push({
        front: 'Core Question from Notes',
        back: text.slice(0, 160),
        subjectId
      });
    }

    return generated.slice(0, 6);
  },

  // ==========================================
  // 5. AI DASHBOARD INSIGHTS WIDGET
  // ==========================================
  generateDailyInsight(tasks = [], exams = [], sessions = [], focusStats = {}, subjects = []) {
    const subjectMap = {};
    subjects.forEach(s => { subjectMap[s.id] = s; });

    const pending = tasks.filter(t => !t.completed);
    const overdue = tasks.filter(t => window.StudyFlowAnalytics?.isTaskOverdue(t));
    const priorities = this.getExamPriorities(exams, subjects);
    const topExam = priorities[0] || null;

    let headline = '';
    let recommendation = '';
    let actionLabel = 'Start 25m Focus';
    let actionTarget = 'timer';

    if (overdue.length > 0) {
      headline = `⚠️ Attention: You have ${overdue.length} overdue ${overdue.length === 1 ? 'task' : 'tasks'}!`;
      recommendation = `Start with "${overdue[0].title}" immediately to clear backlog before starting new topics.`;
      actionLabel = 'Resolve Overdue Task';
      actionTarget = 'tasks';
    } else if (topExam && topExam.daysLeft <= 4) {
      headline = `🎯 Priority Exam Approaching: ${topExam.title} (In ${topExam.daysLeft} days)`;
      recommendation = `This exam is rated **${topExam.difficulty.toUpperCase()}**. Recommend doing a 50-minute Pomodoro study sprint today on ${topExam.subject?.name || 'this subject'}.`;
      actionLabel = 'Study for Exam';
      actionTarget = 'timer';
    } else if (pending.length > 0) {
      const highTask = pending.find(t => t.priority === 'high') || pending[0];
      const subjName = highTask.subjectId ? (subjectMap[highTask.subjectId]?.name || 'Homework') : 'Assignment';
      headline = `💡 Optimal Path: Begin with ${highTask.title}`;
      recommendation = `You have ${pending.length} pending items. Tackling **${subjName}** first will produce the highest cognitive momentum today.`;
      actionLabel = 'Focus on Priority';
      actionTarget = 'timer';
    } else {
      headline = `✨ You're completely caught up!`;
      recommendation = `Outstanding work staying ahead of schedule. Review flashcards to reinforce long-term memory or take a restful break.`;
      actionLabel = 'Review Flashcards';
      actionTarget = 'flashcards';
    }

    const tipIndex = new Date().getDate() % this.cognitiveTips.length;
    const studyTip = this.cognitiveTips[tipIndex];

    return {
      headline,
      recommendation,
      studyTip,
      actionLabel,
      actionTarget
    };
  }
};

window.StudyFlowAI = StudyFlowAI;
