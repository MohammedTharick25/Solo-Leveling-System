// src/components/TaskList.js
import React from 'react';
import TaskItem from './TaskItem';
import './TaskList.css';

const TaskList = ({ tasks, onToggleComplete, onDeleteTask, title, userPillars, isCompletedList = false }) => {
  if (!tasks || tasks.length === 0) { // Added tasks check
    return (
      <div className="system-panel task-list">
        <h2 className="panel-title">{title || "QUEST LOG"}</h2>
        <p className="no-tasks-message">
          {isCompletedList ? `[No quests in ${title.toLowerCase().replace(' log', '')}]` : "[No active quests in this category]"}
        </p>
      </div>
    );
  }

  return (
    <div className="system-panel task-list">
      <h2 className="panel-title">{title || "QUEST LOG"}</h2>
      <ul>
        {tasks.map(task => (
          <TaskItem
            key={task.id}
            task={task}
            onToggleComplete={onToggleComplete}
            onDeleteTask={onDeleteTask}
            userPillars={userPillars}
            isCompletedList={isCompletedList}
          />
        ))}
      </ul>
    </div>
  );
};
export default TaskList;