// src/components/UserStats.js
import React from 'react';
import './UserStats.css';

const UserStats = ({ user, onNameChange }) => {
  const mainXpPercentage = user.nextLevelXp > 0 ? Math.min(100, (user.xp / user.nextLevelXp) * 100) : 0;
  const hpPercentage = user.maxHp > 0 ? Math.min(100, (user.hp / user.maxHp) * 100) : 0;

  const handleNameEdit = () => {
    const newName = prompt("Enter your designation:", user.name);
    if (newName && newName.trim() !== "") {
      onNameChange(newName.trim());
    }
  };

  return (
    <div className="system-panel user-stats">
      <h2 className="panel-title">STATUS REPORT</h2>
       <div className="stat-item">
        <span className="stat-label">Designation:</span>
        <span className="stat-value name-editable" onClick={handleNameEdit} title="Click to edit designation">
          {user.name || "Nameless Person"}
        </span>
      </div>
      <div className="stat-item">
        <span className="stat-label">Rank:</span>
        <span className="stat-value">{user.level < 3 ? "F-Rank" : user.level < 6 ? "E-Rank" : user.level < 10 ? "D-Rank" : user.level < 15 ? "C-Rank" : user.level < 20 ? "B-Rank" : user.level < 25 ? "A-Rank" : "S-Rank"} Task-Slayer</span>
      </div>
      <div className="stat-item">
        <span className="stat-label">Overall Level:</span>
        <span className="stat-value level-value">{user.level}</span>
      </div>
      <div className="stat-item">
        <span className="stat-label">Overall XP:</span>
        <span className="stat-value">{user.xp} / {user.nextLevelXp}</span>
      </div>
      <div className="xp-bar-container main-xp-bar">
        <div
          className="xp-bar-fill"
          style={{ width: `${mainXpPercentage}%` }}
          title={`${Math.round(mainXpPercentage)}% to next level`}
        >
           {/* {Math.round(mainXpPercentage)}% */}
        </div>
      </div>

      <div className="stat-item hp-stat-item">
        <span className="stat-label hp-label">Vitality (HP):</span>
        <span className="stat-value hp-value">{user.hp} / {user.maxHp}</span>
      </div>
      <div className="xp-bar-container hp-bar-container">
        <div
          className="xp-bar-fill hp-bar-fill"
          style={{ width: `${hpPercentage}%` }} // Background set in CSS
          title={`HP: ${user.hp}/${user.maxHp} (${Math.round(hpPercentage)}%)`}
        >
           {/* {Math.round(hpPercentage)}% */}
        </div>
      </div>

      {user.pillars && Object.keys(user.pillars).length > 0 && (
        <>
          <h3 className="pillar-title">LIFE PILLAR MATRIX</h3>
          {Object.entries(user.pillars).map(([key, pillar]) => {
            const pillarXpPercentage = pillar.nextLevelXp > 0 ? Math.min(100, (pillar.xp / pillar.nextLevelXp) * 100) : 0;
            return (
              <div key={key} className="pillar-stat-group">
                <div className="stat-item pillar-stat-item">
                  <span className="stat-label pillar-label" style={{color: pillar.color || '#a0c8f0'}}>
                    {pillar.icon} {pillar.name}:
                  </span>
                  <span className="stat-value pillar-level-value">Lv. {pillar.level}</span>
                </div>
                <div className="stat-item pillar-xp-item">
                  <span className="stat-label pillar-xp-label">XP:</span>
                  <span className="stat-value pillar-xp-value">{pillar.xp} / {pillar.nextLevelXp}</span>
                </div>
                <div className="xp-bar-container pillar-xp-bar">
                  <div
                    className="xp-bar-fill pillar-xp-bar-fill"
                    style={{
                        width: `${pillarXpPercentage}%`,
                        background: pillar.color ? `linear-gradient(90deg, ${pillar.color}99, ${pillar.color}FF)` : 'linear-gradient(90deg, #3a7bd5, #3a60d5)',
                        boxShadow: pillar.color ? `0 0 6px ${pillar.color} inset` : '0 0 6px #3b82c4 inset'
                    }}
                    title={`${Math.round(pillarXpPercentage)}% to next pillar level`}
                  >
                  </div>
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
};
export default UserStats;