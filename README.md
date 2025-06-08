# Solo Leveling To-Do System


**Transform your daily tasks into an epic quest for self-improvement! Inspired by the thrilling "Solo Leveling" manhwa, this web application gamifies your to-do list, allowing you to level up, enhance life pillars, and conquer your goals like a true Hunter (Person).**

This project is a dynamic, interactive to-do list built with React for the frontend and designed to bring the engaging progression system of Solo Leveling to everyday productivity.

**Live Demo:** [https://mohammedtharick25.github.io/Solo-Leveling-System/]


## Features

*   **Thematic UI:** Dark, Solo Leveling-inspired interface with distinct visual cues.
*   **User Progression:**
    *   **Level Up:** Gain Experience Points (XP) by completing tasks.
    *   **Rank System:** Achieve ranks from F-Rank to S-Rank as you level up.
    *   **Vitality (HP):** Manage your Health Points. Failing daily tasks can result in HP loss!
*   **Life Pillars:** Focus on different aspects of your life (e.g., Health & Fitness, Productivity, Learning, Mindfulness).
    *   Gain Pillar-specific XP by completing related tasks.
    *   Level up individual Life Pillars.
*   **Quest System (To-Do Tasks):**
    *   **Main Quests:** For your significant goals and projects.
    *   **Daily Directives:** Automatically generated random tasks each day to keep you engaged. These have a daily deadline!
    *   **Urgent Quests:** High-priority tasks that demand immediate attention.
    *   **Pillar Directives:** Generate specific quests related to a chosen Life Pillar.
*   **Task Timers:** Daily tasks feature a countdown timer, ending at 23:59:59 each day.
*   **Penalties:** Failure to complete daily tasks by their deadline results in an HP deduction.
*   **System Messages:** Get Solo Leveling-style notifications for task completions, level-ups, new quests, and penalties.
*   **Persistent Data:** Your progress, tasks, and stats are saved locally in your browser using `localStorage`.
*   **Responsive Design:** The interface adapts to different screen sizes for usability on desktop and mobile devices.

## Tech Stack

*   **Frontend:**
    *   React (v18)
    *   JavaScript (ES6+)
    *   HTML5
    *   CSS3 (with Flexbox and Grid for layout)
*   **State Management:** React Hooks (`useState`, `useEffect`, `useCallback`)
*   **Utilities:**
    *   `uuid` for generating unique IDs for tasks.
*   **Development Tools:**
    *   Create React App
    *   ESLint for code linting.
*   **Deployment:**
    *   GitHub Pages (via `gh-pages` package)

## Project Structure

solo-levelling-todolist/
├── public/ # Static assets, index.html, manifest.json
├── src/
│ ├── components/ # Reusable React components
│ │ ├── AddTaskForm.js
│ │ ├── PillarQuests.js
│ │ ├── SystemMessage.js
│ │ ├── TaskItem.js
│ │ ├── TaskList.js
│ │ └── UserStats.js
│ ├── App.css # Main application styles
│ ├── App.js # Main application component and logic
│ ├── config.js # Configuration (XP, HP, task definitions)
│ ├── index.css # Global styles
│ ├── index.js # Entry point of the React application
│ └── reportWebVitals.js
├── .gitignore # Specifies intentionally untracked files
├── package.json # Project metadata and dependencies
└── README.md # This file


## Getting Started Locally

To run this project on your local machine, follow these steps:

1.  **Prerequisites:**
    *   Node.js (which includes npm) installed: [Download Node.js](https://nodejs.org/)
    *   Git installed: [Download Git](https://git-scm.com/)

2.  **Clone the repository (or download the source code):**
    ```bash
    git clone https://github.com/mohammedtharick25/Solo-Leveling-System.git
    cd YOUR_REPOSITORY_NAME
    ```

3.  **Install dependencies:**
    Navigate to the project's root directory in your terminal and run:
    ```bash
    npm install
    ```
    (or `yarn install` if you prefer Yarn)

4.  **Start the development server:**
    ```bash
    npm start
    ```
    This will open the application in your default web browser, usually at `http://localhost:3000`. The app will automatically reload if you make changes to the code.

## Available Scripts

In the project directory, you can run:

*   **`npm start`**: Runs the app in development mode.
*   **`npm run build`**: Builds the app for production to the `build` folder. It correctly bundles React in production mode and optimizes the build for the best performance.
*   **`npm test`**: Launches the test runner in interactive watch mode.
*   **`npm run eject`**: (Use with caution) Removes the single build dependency from your project.
*   **`npm run deploy`**: Builds the app and deploys it to GitHub Pages (requires `gh-pages` and `homepage` in `package.json` to be configured).

## How It Works (Brief Overview)

*   **State Management:** The main application state (user stats, tasks, pillar progress) is managed within the `App.js` component using React Hooks.
*   **Data Persistence:** User data and tasks are stored in the browser's `localStorage`, allowing progress to be saved between sessions for individual users.
*   **Daily Cycle:**
    *   On app load, the system checks if it's a new day compared to the `lastLoginDate`.
    *   If it's a new day, penalties for incomplete daily tasks from the previous day are applied (HP loss).
    *   User HP is then regenerated.
    *   A new set of random daily tasks are generated with a deadline for the current day (23:59:59).
*   **Component-Based Architecture:** The UI is broken down into reusable React components for maintainability and clarity.

## Future Enhancements (Ideas)

*   [ ] More sophisticated "Skill" system linked to task completion.
*   [ ] Sound effects for notifications and actions.
*   [ ] Customizable themes or appearance.
*   [ ] Achievements and badges for milestones.
*   [ ] Option to backup/restore data (e.g., export/import JSON).
*   [ ] Full backend with a database for multi-device sync and user accounts.
*   [ ] More varied daily task pool and quest types.

## Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/mohammedtharick25/Solo-Leveling-System/issues) if you want to contribute.

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

## License

This project is licensed under the MIT License - see the `LICENSE.md` file for details (You might want to add a `LICENSE.md` file with the MIT license text if you haven't).

## Acknowledgements

*   Inspired by the "Solo Leveling" manhwa by Chugong (Author) and DUBU (Redice Studio - Artist).
*   Create React App for the initial project setup.
*   The React community.

---

*This README was last updated on 08/06/2025.*
