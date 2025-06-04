// src/components/AddTaskForm.js
import React, { useState } from 'react';
import './AddTaskForm.css';

const AddTaskForm = ({ onAddTask }) => {
  const [text, setText] = useState('');
  const [type, setType] = useState('MAIN');
  const [xpValue, setXpValue] = useState(10);
  const [penaltyHp, setPenaltyHp] = useState(0); // For manually added tasks

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!text.trim()) {
      alert("Quest description cannot be empty!");
      return;
    }
    onAddTask({ text, type, xpValue: Number(xpValue), penaltyHp: Number(penaltyHp) }, null, false);
    setText('');
    setXpValue(10);
    setPenaltyHp(0);
    setType('MAIN');
  };

  return (
    <form onSubmit={handleSubmit} className="system-panel add-task-form">
      <h2 className="panel-title">NEW QUEST DIRECTIVE</h2>
      <div className="form-row">
        <input
          type="text"
          placeholder="Enter quest description..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="task-input"
          required
        />
      </div>
      <div className="form-row type-xp-penalty-row">
        <div>
          <label htmlFor="quest-type">Type:</label>
          <select id="quest-type" value={type} onChange={(e) => setType(e.target.value)} className="type-select">
            <option value="MAIN">Main Quest</option>
            <option value="DAILY">Daily Quest</option>
            <option value="URGENT">Urgent Quest</option>
          </select>
        </div>
        <div>
          <label htmlFor="xp-value">Main XP:</label>
          <input
            type="number" id="xp-value" value={xpValue}
            onChange={(e) => setXpValue(Math.max(0, Number(e.target.value)))} // Allow 0 XP
            min="0" className="xp-input"
          />
        </div>
        {type === 'DAILY' && ( // Show penalty only for daily tasks added manually
            <div>
                <label htmlFor="penalty-hp">Penalty HP:</label>
                <input
                    type="number" id="penalty-hp" value={penaltyHp}
                    onChange={(e) => setPenaltyHp(Math.max(0, Number(e.target.value)))}
                    min="0" className="xp-input penalty-input"
                />
            </div>
        )}
      </div>
      <button type="submit" className="add-button">Accept Quest</button>
    </form>
  );
};
export default AddTaskForm;