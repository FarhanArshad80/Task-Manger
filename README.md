# Task Manager

A task manager built with React, Vite and Tailwind CSS. You can plan work with deadlines, priorities, tags, checklists and recurring tasks. It also shows how the work is going on a dashboard, a calendar and analytics pages.

**Live demo:** https://task-manger-ten-hazel.vercel.app

Everything is saved in your browser (`localStorage`), so it needs no account or backend.

## Features

**Tasks**
- Create tasks with a deadline, a priority, tags and a repeat schedule (daily, weekly, every two weeks or monthly)
- One-tap deadline shortcuts: Today, Tomorrow, Friday, Next week
- Edit a task in place, duplicate it, or break it into checklist steps
- Recurring tasks create their next occurrence when you complete them

**Finding and managing work**
- Search, with filters for status, priority, tag and due date
- Sortable columns
- Bulk actions on selected rows: change status, priority or deadline, or delete
- Undo after deleting one task or many
- CSV export of the rows you are viewing, and CSV import

**Seeing progress**
- **Dashboard:** key counts, a status chart and notes based on your real tasks (what's overdue, what's due today, high-priority work with no deadline)
- **Calendar:** tasks on the day they are due. Click a day to see all of its tasks.
- **Progress:** a streak of days with finished work, plus delivery, on-time and momentum rates
- **Analytics:** status breakdown, completion rate and on-time accuracy
- Light and dark theme

## Tech stack

| Area | Tools |
|---|---|
| UI | React 19, React Router 7 |
| Styling | Tailwind CSS 4 |
| Icons | lucide-react |
| Build | Vite |
| Quality | ESLint |
| Hosting | Vercel |

## Getting started

```bash
git clone https://github.com/FarhanArshad80/Task-Manger.git
cd Task-Manger
npm install
npm run dev
```

Then open the local address Vite prints (usually http://localhost:5173).

| Script | What it does |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Build for production into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Run ESLint |

## Project structure

```text
src/
├── components/
│   ├── data/       # Task table, progress chart
│   ├── layout/     # Navbar, sidebar
│   └── ui/         # Card, button, badge, undo bar
├── context/        # App state and localStorage persistence
├── pages/          # Dashboard, Tasks, Calendar, Progress, Analytics, About
├── routes/         # Route definitions
└── utils/          # Streaks, goals, recurrence, steps, tags, CSV, briefing
```
