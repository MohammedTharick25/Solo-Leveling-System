// src/App.js
import React, { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import './App.css';

import UserStats from './components/UserStats';
import AddTaskForm from './components/AddTaskForm';
import TaskList from './components/TaskList';
import SystemMessage from './components/SystemMessage';
import PillarQuests from './components/PillarQuests';

import {
  INITIAL_PILLAR_XP_FOR_LEVEL_UP, PILLAR_XP_MULTIPLIER,
  PILLAR_DEFINITIONS, initialPillarsState,
  INITIAL_XP_FOR_LEVEL_UP, XP_MULTIPLIER,
  INITIAL_HP, // HP_REGENERATION_PER_DAY is used directly
  ALL_TASK_CATEGORIES, // New import for the large task pool
  NUMBER_OF_RANDOM_DAILY_TASKS
} from './config';

const getEndOfDay = (date = new Date()) => {
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  return endOfDay.toISOString();
};

const getStartOfToday = () => {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  return startOfDay;
};

function App() {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('soloUser');
    const baseUser = {
      name: 'Aspiring Person',
      level: 1,
      xp: 0,
      nextLevelXp: INITIAL_XP_FOR_LEVEL_UP,
      hp: INITIAL_HP,
      maxHp: INITIAL_HP,
      lastLoginDate: getStartOfToday().toISOString().split('T')[0],
      pillars: initialPillarsState,
    };
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      const currentPillars = parsedUser.pillars ?
        Object.keys(initialPillarsState).reduce((acc, key) => {
            acc[key] = { ...initialPillarsState[key], ...(parsedUser.pillars[key] || {}) };
            return acc;
        }, {})
        : initialPillarsState;
      return {
        ...baseUser,
        ...parsedUser,
        hp: parsedUser.hp !== undefined ? parsedUser.hp : INITIAL_HP,
        maxHp: parsedUser.maxHp !== undefined ? parsedUser.maxHp : INITIAL_HP,
        lastLoginDate: parsedUser.lastLoginDate || baseUser.lastLoginDate,
        pillars: currentPillars
      };
    }
    return baseUser;
  });

  const [tasks, setTasks] = useState(() => {
    const savedTasks = localStorage.getItem('soloTasks');
    return savedTasks ? JSON.parse(savedTasks) : [];
  });

  const [systemMessage, setSystemMessage] = useState({ text: '', type: 'info', key: null });

  const showSystemMessage = useCallback((text, type = 'info', duration = 3000) => {
    setSystemMessage({ text, type, duration, key: uuidv4() });
  }, []);

  useEffect(() => {
    localStorage.setItem('soloUser', JSON.stringify(user));
  }, [user]);

  useEffect(() => {
    localStorage.setItem('soloTasks', JSON.stringify(tasks));
  }, [tasks]);

  const levelUp = useCallback(() => {
    setUser(prevUser => {
      const newLevel = prevUser.level + 1;
      const newNextLevelXp = Math.floor(prevUser.nextLevelXp * XP_MULTIPLIER);
      const remainingXp = prevUser.xp - prevUser.nextLevelXp;
      showSystemMessage(`MAIN LEVEL UP! You are now Level ${newLevel}!`, 'levelup', 5000);
      return {
        ...prevUser,
        level: newLevel,
        xp: Math.max(0, remainingXp),
        nextLevelXp: newNextLevelXp,
      };
    });
  }, [showSystemMessage]);

  const gainXp = useCallback((amount) => {
    setUser(prevUser => ({ ...prevUser, xp: prevUser.xp + amount }));
  }, []);

  useEffect(() => {
    if (user.xp >= user.nextLevelXp && user.nextLevelXp > 0) {
      levelUp();
    }
  }, [user.xp, user.nextLevelXp, levelUp]);

  const gainPillarXp = useCallback((pillarKey, amount) => {
    setUser(prevUser => {
      const pillar = prevUser.pillars[pillarKey];
      if (!pillar) return prevUser;
      let newPillarXp = pillar.xp + amount;
      let newPillarLevel = pillar.level;
      let newPillarNextLevelXp = pillar.nextLevelXp;
      let leveledUp = false;
      while (newPillarXp >= newPillarNextLevelXp && newPillarNextLevelXp > 0) {
        leveledUp = true;
        newPillarLevel += 1;
        const remainingPillarXp = newPillarXp - newPillarNextLevelXp;
        newPillarNextLevelXp = Math.floor(newPillarNextLevelXp * PILLAR_XP_MULTIPLIER);
        newPillarXp = Math.max(0, remainingPillarXp);
      }
      if(leveledUp){
        showSystemMessage(
          `${pillar.icon} ${pillar.name} Pillar LEVEL UP! Now Lv. ${newPillarLevel}!`,
          'levelup', 4500
        );
      }
      return {
        ...prevUser,
        pillars: { ...prevUser.pillars, [pillarKey]: { ...pillar, level: newPillarLevel, xp: newPillarXp, nextLevelXp: newPillarNextLevelXp } },
      };
    });
  }, [showSystemMessage]);

  const takeDamage = useCallback((amount) => {
    setUser(prevUser => {
      const newHp = Math.max(0, prevUser.hp - amount);
      showSystemMessage(`HP decreased by ${amount}! Current HP: ${newHp}/${prevUser.maxHp}`, 'error', 4000);
      return { ...prevUser, hp: newHp };
    });
  }, [showSystemMessage]);

  const healHp = useCallback((amount) => {
    setUser(prevUser => {
      const newHp = Math.min(prevUser.maxHp, prevUser.hp + amount);
      return { ...prevUser, hp: newHp };
    });
  }, []);

  const addTask = (taskData, originatingPillarKey = null, isSystemGenerated = false) => {
    const todayDeadline = getEndOfDay();
    const newTask = {
      id: uuidv4(),
      text: taskData.text,
      type: isSystemGenerated ? 'DAILY' : taskData.type || 'MAIN',
      mainXp: taskData.xpValue || taskData.mainXp || 0,
      pillarKey: originatingPillarKey,
      pillarXp: taskData.pillarXp || 0,
      penaltyHp: taskData.penaltyHp || 0,
      completed: false,
      createdAt: new Date().toISOString(),
      deadline: (taskData.type === 'DAILY' || isSystemGenerated) ? todayDeadline : null,
      isDailySystemGenerated: isSystemGenerated,
      status: "ACTIVE"
    };
    setTasks(prevTasks => [newTask, ...prevTasks]);
    let message = `New Quest "${taskData.text}" accepted!`;
    if (newTask.mainXp > 0) message += ` [+${newTask.mainXp} Main XP]`;
    if (newTask.pillarKey && newTask.pillarXp > 0 && user.pillars[newTask.pillarKey]) {
        const pillarName = user.pillars[newTask.pillarKey].name;
        message += ` [+${newTask.pillarXp} ${pillarName} XP]`;
    }
    showSystemMessage(message, 'info');
  };

  const toggleCompleteTask = (taskId) => {
    setTasks(prevTasks =>
      prevTasks.map(task => {
        if (task.id === taskId && !task.completed) {
          let message = `Quest "${task.text}" COMPLETED!`;
          if (task.mainXp > 0) { gainXp(task.mainXp); message += ` +${task.mainXp} Main XP`; }
          if (task.pillarKey && task.pillarXp > 0 && user.pillars[task.pillarKey]) {
            gainPillarXp(task.pillarKey, task.pillarXp);
            const pillarName = user.pillars[task.pillarKey].name;
            if (task.mainXp > 0) message += `,`;
            message += ` +${task.pillarXp} ${pillarName} XP`;
          }
          showSystemMessage(message, 'success');
          return { ...task, completed: true, completedAt: new Date().toISOString(), status: "COMPLETED" };
        }
        return task;
      })
    );
  };

  const deleteTask = (taskId) => {
    const taskToDelete = tasks.find(t => t.id === taskId);
    if (taskToDelete) { showSystemMessage(`Quest "${taskToDelete.text}" abandoned.`, 'info'); }
    setTasks(prevTasks => prevTasks.filter(task => task.id !== taskId));
  };
  
  const generatePillarQuest = (pillarKey) => {
    const pillarDef = PILLAR_DEFINITIONS[pillarKey];
    if (!pillarDef || !pillarDef.tasks || pillarDef.tasks.length === 0) { // Added pillarDef.tasks check
      showSystemMessage(`No quest templates available for ${pillarDef?.name || pillarKey} pillar.`, 'info'); return;
    }
    const randomTaskTemplate = pillarDef.tasks[Math.floor(Math.random() * pillarDef.tasks.length)];
    addTask(
      { ...randomTaskTemplate, type: randomTaskTemplate.type || 'MAIN' },
      pillarKey, false
    );
  };

  const generateRandomDailyTasks = useCallback(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const existingSystemDailiesTodayCount = tasks.filter(
      task => task.isDailySystemGenerated && task.deadline && task.deadline.startsWith(todayStr)
    ).length;

    if (existingSystemDailiesTodayCount >= NUMBER_OF_RANDOM_DAILY_TASKS) {
        return;
    }

    let generatedTasksCount = existingSystemDailiesTodayCount;
    const allPossibleTasks = [];
    for (const categoryKey in ALL_TASK_CATEGORIES) {
        const category = ALL_TASK_CATEGORIES[categoryKey];
        category.tasks.forEach(taskText => {
            allPossibleTasks.push({
                text: taskText,
                categoryKey: categoryKey,
                pillarKey: category.pillarKey,
                mainXp: category.baseMainXp,
                pillarXp: category.basePillarXp,
                penaltyHp: category.basePenaltyHp,
            });
        });
    }

    for (let i = allPossibleTasks.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [allPossibleTasks[i], allPossibleTasks[j]] = [allPossibleTasks[j], allPossibleTasks[i]];
    }
    
    let tasksAddedThisRun = 0;
    for (const taskTemplate of allPossibleTasks) {
        if (generatedTasksCount >= NUMBER_OF_RANDOM_DAILY_TASKS) {
            break; 
        }
        if (!tasks.some(t => t.text === taskTemplate.text && t.isDailySystemGenerated && t.deadline && t.deadline.startsWith(todayStr))) {
            addTask(
                {
                    text: taskTemplate.text,
                    type: 'DAILY',
                    mainXp: taskTemplate.mainXp,
                    pillarXp: taskTemplate.pillarXp,
                    penaltyHp: taskTemplate.penaltyHp,
                },
                taskTemplate.pillarKey,
                true
            );
            generatedTasksCount++;
            tasksAddedThisRun++;
        }
    }

    if (tasksAddedThisRun > 0) {
        showSystemMessage(`${tasksAddedThisRun} new Daily Directives received! Check your log.`, 'info', 4000);
    }
  }, [tasks, addTask, showSystemMessage]); // addTask and showSystemMessage are from App scope

  const processDailyReset = useCallback(() => {
    const todayDateStr = getStartOfToday().toISOString().split('T')[0];

    if (user.lastLoginDate !== todayDateStr) {
      showSystemMessage("A new day has begun! System recalibrating...", "info", 4000);
      let totalPenalty = 0;
      const startOfThisDay = getStartOfToday();

      const updatedTasks = tasks.map(task => {
        if (!task.completed && task.deadline && new Date(task.deadline) < startOfThisDay && task.status !== "PENALIZED") {
          if (task.penaltyHp && task.penaltyHp > 0) {
            totalPenalty += task.penaltyHp;
            showSystemMessage(`Penalty! Quest "${task.text}" was incomplete. -${task.penaltyHp} HP`, 'error', 3500);
          }
          return { ...task, status: "PENALIZED" };
        }
        return task;
      // Filter out old penalized system dailies. Keep user-added penalized tasks.
      }).filter(task => !(task.status === "PENALIZED" && task.isDailySystemGenerated && new Date(task.deadline) < startOfThisDay)); 

      setTasks(updatedTasks);

      if (totalPenalty > 0) {
        takeDamage(totalPenalty);
      }

      healHp(user.maxHp); 
      generateRandomDailyTasks(); // This will generate up to the NUMBER_OF_RANDOM_DAILY_TASKS
      setUser(prevUser => ({ ...prevUser, lastLoginDate: todayDateStr }));
      showSystemMessage("Vitality restored. New daily directives assigned!", "success", 4000);
    } else {
      // If it's the same day, still try to generate dailies if none exist (e.g. first load of the day)
      const hasSystemDailiesToday = tasks.some(
          task => task.isDailySystemGenerated && task.deadline && task.deadline.startsWith(todayDateStr)
      );
      if (!hasSystemDailiesToday) {
          generateRandomDailyTasks(); // This will generate up to the NUMBER_OF_RANDOM_DAILY_TASKS
      }
    }
  }, [user.lastLoginDate, user.maxHp, tasks, setTasks, takeDamage, healHp, generateRandomDailyTasks, setUser, showSystemMessage]);

  useEffect(() => {
    processDailyReset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  const handleNameChange = (newName) => {
    setUser(prevUser => ({ ...prevUser, name: newName }));
    showSystemMessage(`Designation updated to: ${newName}`, 'info');
  };

  const getTasksByType = (type) => tasks.filter(task => task.type === type && task.status === "ACTIVE" && !task.completed);
  const getCompletedTasks = () => tasks.filter(task => task.status === "COMPLETED").sort((a,b) => new Date(b.completedAt) - new Date(a.completedAt));
  const getPenalizedTasks = () => tasks.filter(task => task.status === "PENALIZED" && !task.completed).sort((a,b) => new Date(b.deadline) - new Date(a.deadline));

  return (
    <div className="App">
      <h1 className="system-title">[ SYSTEM INTERFACE ]</h1>
      <SystemMessage
        key={systemMessage.key} message={systemMessage.text}
        type={systemMessage.type} duration={systemMessage.duration}
      />
      <div className="app-container">
        <div className="user-stats-container">
          <UserStats user={user} onNameChange={handleNameChange} />
        </div>
        <div className="main-content-container">
          <AddTaskForm onAddTask={addTask} />
          <PillarQuests pillars={user.pillars} onGenerateQuest={generatePillarQuest} />
          <div className="task-lists-wrapper">
            <TaskList tasks={getTasksByType('URGENT')} onToggleComplete={toggleCompleteTask} onDeleteTask={deleteTask} title="URGENT QUESTS" userPillars={user.pillars} />
            <TaskList tasks={getTasksByType('DAILY')} onToggleComplete={toggleCompleteTask} onDeleteTask={deleteTask} title="DAILY DIRECTIVES" userPillars={user.pillars} />
            <TaskList tasks={getTasksByType('MAIN')} onToggleComplete={toggleCompleteTask} onDeleteTask={deleteTask} title="MAIN QUESTS" userPillars={user.pillars} />
            <TaskList tasks={getPenalizedTasks().slice(0,5)} onToggleComplete={() => {}} onDeleteTask={deleteTask} title="FAILURE LOG (Recent 5)" userPillars={user.pillars} isCompletedList={true} />
            <TaskList tasks={getCompletedTasks().slice(0,10)} onToggleComplete={() => {}} onDeleteTask={deleteTask} title="ACCOMPLISHMENT LOG (Recent 10)" userPillars={user.pillars} isCompletedList={true} />
          </div>
        </div>
      </div>
    </div>
  );
}
export default App;
