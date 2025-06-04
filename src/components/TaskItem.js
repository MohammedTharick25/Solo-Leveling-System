// src/components/TaskItem.js
import React, { useState, useEffect } from 'react';
import './TaskItem.css';

const TaskItem = ({ task, onToggleComplete, onDeleteTask, userPillars, isCompletedList }) => {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    let intervalId;
    if (task.deadline && !task.completed && task.status === "ACTIVE") {
      const calculateTimeLeft = () => {
        const now = new Date();
        const deadlineDate = new Date(task.deadline);
        const diff = deadlineDate.getTime() - now.getTime();

        if (diff <= 0) {
          setTimeLeft("Overdue");
          if (intervalId) clearInterval(intervalId);
          // Daily reset will handle actual penalty
          return;
        }
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft(`${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
      };
      calculateTimeLeft();
      intervalId = setInterval(calculateTimeLeft, 1000);
    } else if (task.status === "PENALIZED") {
        setTimeLeft("Failed"); // Changed from "Penalized"
    } else if (task.completed) {
        setTimeLeft(""); // Clear timer if completed
    } else {
      setTimeLeft('');
    }
    return () => clearInterval(intervalId);
  }, [task.deadline, task.completed, task.status]);


  const getTaskTypeClass = (type) => {
    switch (type) {
      case 'DAILY': return 'task-type-daily';
      case 'URGENT': return 'task-type-urgent';
      case 'MAIN': default: return 'task-type-main';
    }
  };
  const getTaskTypeLabel = (type) => {
    switch (type) {
      case 'DAILY': return '[Daily]';
      case 'URGENT': return '[Urgent!]';
      case 'MAIN': default: return '[Main]';
    }
  };
  const getPillarTag = () => {
    if (task.pillarKey && userPillars && userPillars[task.pillarKey]) {
      const pillar = userPillars[task.pillarKey];
      return (
        <span className="task-pillar-tag" title={`${pillar.name} Quest`} style={{ backgroundColor: `${pillar.color}40`, borderColor: pillar.color }}>
          {pillar.icon}
        </span>
      );
    }
    return null;
  };

  const isPenalizedView = isCompletedList && task.status === "PENALIZED";

  return (
    <li className={`task-item ${task.completed ? 'completed' : ''} ${getTaskTypeClass(task.type)} ${task.status === "PENALIZED" ? 'penalized' : ''}`}>
      <div className="task-info-wrapper">
        <div className="task-info">
            {(task.status === "ACTIVE" && !isCompletedList) && (
            <input
                type="checkbox" checked={task.completed}
                onChange={() => onToggleComplete(task.id)}
                className="task-checkbox" id={`task-${task.id}`}
                aria-labelledby={`task-text-${task.id}`}
            />
            )}
            {task.status === "COMPLETED" && <span className="completed-indicator">✔️</span>}
            {task.status === "PENALIZED" && <span className="penalized-indicator">☠️</span>}

            <label htmlFor={(task.status === "ACTIVE" && !isCompletedList) ? `task-${task.id}` : undefined} className="task-text-label" id={`task-text-${task.id}`}>
            {getPillarTag()}
            <span className="task-type-label">{getTaskTypeLabel(task.type)}</span>
            <span className="task-text">{task.text}</span>
            </label>
        </div>
        {timeLeft && <span className={`task-timer ${timeLeft === "Overdue" ? "timer-overdue" : ""}`}>{timeLeft}</span>}
      </div>

      <div className="task-details">
        <span className="task-xp">
          {task.mainXp > 0 && `Main: ${task.mainXp} XP`}
          {task.mainXp > 0 && task.pillarKey && task.pillarXp > 0 && ", "}
          {task.pillarKey && task.pillarXp > 0 && userPillars && userPillars[task.pillarKey] &&
           `${userPillars[task.pillarKey].icon}: ${task.pillarXp} XP`
          }
          {(task.mainXp === 0 && (!task.pillarKey || task.pillarXp === 0)) && "No XP"}
        </span>
        {task.penaltyHp > 0 && task.status === "ACTIVE" && (
          <span className="task-penalty" title="HP penalty if not completed on time">
            <span role="img" aria-label="skull icon">💀</span> {task.penaltyHp} HP
          </span>
        )}
        {(task.status === "ACTIVE" || isPenalizedView) && ( // Show abandon for active or if viewing in failure log
            <button onClick={() => onDeleteTask(task.id)} className="delete-button" aria-label={`Abandon quest: ${task.text}`}>Abandon</button>
        ) }
      </div>
    </li>
  );
};
export default TaskItem;