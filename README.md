# ⚔️ Solo Leveling System

> **Turn your real life into a progression system.**
>
> A full-stack productivity and self-improvement platform inspired by RPG progression systems, where goals become **Quests**, habits become **training**, focus becomes **power**, and progress becomes a visible **Hunter journey**.

---

## ✨ Overview

**Solo Leveling System** is a full-stack web application designed to make personal growth more engaging through game-inspired mechanics.

Instead of treating productivity as a simple checklist, the application turns everyday progress into a structured progression system:

- Complete quests and earn XP
- Build habits and maintain streaks
- Track focus sessions
- Record daily reflections in the journal
- Monitor personal statistics and growth
- Defeat bosses and complete dungeons
- Participate in raids and guild/social features
- Unlock achievements and shadows
- Analyze productivity and performance
- Build a personal knowledge system
- Share a public Hunter profile
- Manage account, privacy, notifications, sessions, and exports

The goal is simple:

> **Make consistent self-improvement feel like leveling up in a game.**

---

## 🎮 Core Experience

| System | Purpose |
|---|---|
| 🏠 Dashboard | Central view of current progression and daily activity |
| ⚔️ Hunter | Personal profile, rank, level, XP, power and progression |
| 🎯 Quests | Complete tasks and earn XP |
| 👤 Shadows | Unlock and manage progression companions |
| 👹 Bosses | Take on larger challenges |
| 🏰 Dungeons | Group activities into focused challenges |
| ⚡ Focus | Run focused Pomodoro-style sessions |
| 🛡️ Raids | Work through larger task-based challenges |
| 🔥 Habits | Build consistency through recurring habits and streaks |
| 📖 Journal | Record reflections, wins, lessons and daily experiences |
| 🧠 Brain | Store knowledge and explore connections through a knowledge graph |
| 📊 Analytics | Visualize productivity, focus and progression |
| 🏆 Achievements | Track milestones and unlock accomplishments |
| 🌐 Social | Explore social/progression features and public profiles |
| 📅 Calendar | Organize and view activities over time |
| ⚙️ Settings | Manage security, privacy, notifications, preferences and account data |

---

## 🚀 Features

### 🧑‍🚀 Hunter Progression

The Hunter system is the foundation of the application.

Track:

- Hunter name and profile
- Level
- Current XP
- Total XP
- Rank
- Titles
- Power score
- Current streak
- Longest streak
- Quest completions
- Focus time
- Performance statistics
- Achievements
- Growth history

Progression is designed to make improvement visible rather than leaving it as an abstract number.

---

### 🎯 Quest System

Quests turn real-world tasks into actionable missions.

Each quest can contain information such as:

- Title
- Description
- Purpose
- Category
- Difficulty
- XP reward
- Expected outcome
- Target value
- Current progress
- Status
- Due date
- Completion date
- Stat rewards

Completed quests contribute to the Hunter's overall progression.

---

### 🔥 Habit Tracking

The habit system helps build consistency over time.

Track:

- Habit name
- Description
- Category
- Frequency
- XP reward
- Current streak
- Longest streak
- Total completions
- Completion history
- Active/inactive state

---

### ⏱️ Focus & Pomodoro

The Focus module provides structured focus sessions for deep work.

Focus activity can contribute to:

- Focus statistics
- Productivity tracking
- Total focus minutes
- Progress reports
- Overall Hunter progression

---

### 📖 Journal & Reflection

The Journal provides a dedicated space for daily reflection.

Entries can include:

- Mood
- Energy level
- Wins
- Failures
- Lessons
- Challenges
- Gratitude
- Free-form thoughts
- Tomorrow's plan
- XP earned

This makes the system useful not only for task management, but also for understanding personal growth over time.

---

### 🧠 Secondary Brain

The Brain module acts as a personal knowledge system.

It supports:

- Knowledge notes
- Categorized information
- Searchable knowledge
- Connected concepts
- Knowledge graph visualization

The knowledge graph helps turn individual notes into a connected network of ideas.

---

### 📊 Analytics & Reports

The analytics system provides a visual view of progression and productivity.

It can surface information such as:

- Productivity activity
- Focus performance
- Quest completion
- XP progression
- Streak performance
- Personal statistics
- Growth history
- Weekly performance reports

The backend also maintains Hunter reports containing progression and performance snapshots.

---

### 🏆 Achievements

Achievements provide milestone-based progression.

The system can track accomplishments related to:

- Quest completion
- Progression
- Streaks
- Performance
- Hunter level
- Other system milestones

---

### 👹 Bosses, Dungeons & Raids

The application extends normal productivity into larger challenges.

These systems are designed to represent:

- Larger goals
- Multi-step challenges
- High-effort tasks
- Time-bound missions
- Structured progression

They provide a more game-like experience than a traditional productivity application.

---

### 🌐 Public Hunter Profiles

Hunters can have a public-facing profile.

The public profile can showcase selected progression information such as:

- Hunter identity
- Bio
- Rank
- Level
- Statistics
- Achievements
- Progression information

Privacy controls determine what information is publicly visible.

---

### 🔔 Notifications

The application includes both persistent and real-time notification functionality.

Supported notification capabilities include:

- In-app notifications
- Desktop notifications
- Security alerts
- Quest updates
- Progression notifications
- Social notifications
- Weekly reports
- Read/unread state
- Notification history
- Real-time delivery through Socket.IO

Notification preferences can be controlled from Settings.

---

### 🔐 Authentication & Security

The application includes a complete authentication flow:

- Registration
- Login
- Logout
- Protected routes
- Password reset
- Password reset email
- Login alerts
- Refresh-token based sessions
- Active session management
- Individual session revocation
- Sign out of other sessions
- Rate limiting
- Security headers
- Request validation
- MongoDB sanitization

Passwords are handled using secure hashing and authentication tokens are used to protect application routes.

---

### ⚙️ Account & Settings

The Settings area provides controls for:

- Profile information
- Password changes
- Active sessions
- Notifications
- Privacy
- Preferences
- Public profile visibility
- Public statistics
- Public achievements
- Data export
- Account deactivation
- Account deletion

---

### 📦 Account Data Export

Users can export their account information in multiple formats:

- **JSON** — complete structured account data
- **Excel** — spreadsheet-friendly account information
- **PDF** — human-readable personal progression report

The PDF export is designed as a polished report rather than a raw database dump.

---

## 🏗️ Architecture

The project is organized as a separate frontend and backend application.

```text
Solo-Leveling-System/
│
├── client/                         # React frontend
│   ├── public/
│   └── src/
│       ├── components/
│       ├── hooks/
│       ├── lib/
│       ├── modules/
│       ├── router/
│       ├── stores/
│       └── styles/
│
├── server/                         # Node.js / Express backend
│   └── src/
│       ├── config/
│       ├── infrastructure/
│       ├── lib/
│       ├── middleware/
│       └── modules/
│
└── README.md
```

### Backend Module Structure

The backend follows a modular structure with separate models, repositories, services, controllers and routes.

Major modules include:

```text
auth
user
hunter
stats
quest
habits
journal
focusSession
analytics
achievement
boss
dungeon
taskRaid
shadow
brain
guild
leaderboard
notification
report
```

This structure keeps business logic separated by domain and makes the backend easier to maintain and extend.

---

## 🛠️ Tech Stack

### Frontend

- **React 18**
- **Vite**
- **React Router**
- **TanStack React Query**
- **Zustand**
- **Axios**
- **Tailwind CSS**
- **Framer Motion**
- **Recharts**
- **D3**
- **Lucide React**
- **Socket.IO Client**
- **React Hook Form**
- **React Activity Calendar**
- **PWA support**

### Backend

- **Node.js**
- **Express**
- **MongoDB**
- **Mongoose**
- **Socket.IO**
- **JWT**
- **bcryptjs**
- **Cloudinary**
- **Multer**
- **Nodemailer-compatible SMTP configuration**
- **Node Cron**
- **Express Validator**
- **Helmet**
- **Express Rate Limit**
- **Express Mongo Sanitize**

---

## 📋 Requirements

Before running the application locally, make sure you have:

- **Node.js** 18+ recommended
- **npm**
- **MongoDB** database
- **Cloudinary** account if image uploads are required
- **SMTP provider** if email functionality is required

---

## ⚙️ Installation

### 1. Clone the repository

```bash
git clone <YOUR_REPOSITORY_URL>
cd Solo-Leveling-System
```

---

### 2. Install frontend dependencies

```bash
cd client
npm install
```

---

### 3. Install backend dependencies

Open another terminal:

```bash
cd server
npm install
```

---

## 🔑 Environment Variables

### Client

Create:

```text
client/.env
```

Add:

```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

Adjust the URLs to match your backend configuration.

---

### Server

Create:

```text
server/.env
```

Example configuration:

```env
NODE_ENV=development
PORT=5000

MONGODB_URI=your_mongodb_connection_string

JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret

CLIENT_URL=http://localhost:5173

CLOUDINARY_NAME=your_cloudinary_name
CLOUDINARY_KEY=your_cloudinary_key
CLOUDINARY_SECRET=your_cloudinary_secret

SMTP_HOST=your_smtp_host
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_smtp_username
SMTP_PASS=your_smtp_password
EMAIL_FROM=your_sender_email

PASSWORD_RESET_EXPIRY_MINUTES=30
```

> **Important:** Never commit real credentials, JWT secrets, SMTP passwords, Cloudinary secrets or database connection strings to GitHub.

Use `.env.example` files for documentation instead of committing `.env`.

---

## ▶️ Running the Application

### Start the backend

```bash
cd server
npm run dev
```

The backend runs using Nodemon during development.

For production-style startup:

```bash
npm start
```

---

### Start the frontend

In another terminal:

```bash
cd client
npm run dev
```

Vite will provide the local development URL in the terminal.

---

## 🌱 Database Seeding

The backend provides a seed script.

Run:

```bash
cd server
npm run seed
```

Use the seed script according to the project's current database setup.

---

## 🧪 Production Build

Build the frontend:

```bash
cd client
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

The backend can be started with:

```bash
cd server
npm start
```

---

## 🔄 Real-Time Architecture

The application uses **Socket.IO** for real-time communication.

The socket layer supports application events such as:

```text
Authentication
      │
      ▼
   Express API
      │
      ├──────────────► MongoDB
      │
      └──────────────► Socket.IO
                            │
                            ▼
                     React Client
                            │
                            ▼
                    Real-time UI
```

This allows important events such as notifications and progression updates to reach the client without requiring a full page refresh.

---

## 🔒 Security Considerations

The backend includes several security-focused middleware and practices:

- JWT authentication
- Refresh-token sessions
- Password hashing
- HTTP security headers
- Rate limiting
- Request validation
- MongoDB query sanitization
- Protected API routes
- Session revocation
- Login security notifications
- Environment-based secret configuration

For production deployment, configure HTTPS, secure cookies/token handling, strong secrets and appropriate CORS origins.

---

## 📱 Progressive Web App

The frontend includes PWA-related assets and configuration, allowing the application to support an installable app-like experience on compatible browsers.

The project includes:

- Web manifest
- Application icons
- Service worker
- PWA configuration

---

## 🗺️ Application Flow

```text
                    ┌─────────────────┐
                    │  Landing Page   │
                    └────────┬────────┘
                             │
                     Register / Login
                             │
                             ▼
                    ┌─────────────────┐
                    │ Hunter Awakening│
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │    Dashboard    │
                    └────────┬────────┘
                             │
       ┌─────────────────────┼──────────────────────┐
       │                     │                      │
       ▼                     ▼                      ▼
    Quests                Habits                 Focus
       │                     │                      │
       └──────────────┬──────┴──────────────┬───────┘
                      │                     │
                      ▼                     ▼
                   XP / Stats          Progression
                      │                     │
                      └──────────┬──────────┘
                                 ▼
                       Hunter Level / Rank
                                 │
                    ┌────────────┼────────────┐
                    ▼            ▼            ▼
               Achievements   Analytics    Reports
```

---

## 🎨 Design Philosophy

The interface is built around a dark fantasy / RPG-inspired visual language while keeping the application practical for everyday productivity.

The design emphasizes:

- Clear progression
- Strong visual hierarchy
- Motion and feedback
- Dark immersive UI
- Rank-based identity
- XP-driven motivation
- Data visualization
- Responsive layouts
- Accessible navigation
- Consistent system-style interactions

---

## 📈 Project Goals

The long-term idea behind the project is to combine:

**Productivity + Habit Building + Personal Analytics + Knowledge Management + RPG Progression**

into one unified system.

Instead of using separate applications for tasks, habits, focus sessions, journaling and progress tracking, the Solo Leveling System connects these activities into one progression model.

---

## 🧭 Roadmap

Potential areas for continued development include:

- More advanced adaptive quest generation
- Deeper AI-assisted personalization
- Expanded guild and social systems
- More advanced achievement trees
- More detailed analytics
- Advanced progression balancing
- Additional Hunter ranks and progression mechanics
- More Shadow abilities and progression
- Enhanced knowledge graph capabilities
- Mobile-focused improvements
- Expanded reporting and insights

---

## 🤝 Contributing

Contributions, suggestions and improvements are welcome.

A typical workflow:

```bash
git checkout -b feature/your-feature
```

Make your changes, test them locally, then:

```bash
git add .
git commit -m "feat: add your feature"
git push origin feature/your-feature
```

Open a Pull Request with:

- A clear description
- What changed
- Why the change was needed
- Screenshots for UI changes
- Testing details
- Any known limitations

---

## 🐛 Issues & Feedback

If you find a bug or have an improvement idea, create an issue with:

### Bug Reports

Include:

- Description
- Steps to reproduce
- Expected behavior
- Actual behavior
- Browser/device
- Relevant console or server logs
- Screenshots when useful

### Feature Requests

Include:

- Problem being solved
- Proposed solution
- Expected user experience
- Any relevant UI/UX examples

---

## 📄 License

Add the project's chosen license here before publishing the repository publicly.

Example:

```text
MIT License
```

---

## 👤 Project

**Solo Leveling System**

A productivity RPG designed to help users turn everyday effort into measurable progression.

> **Train. Complete. Level Up.**
>
> ⚔️ **Become the strongest version of yourself.**
