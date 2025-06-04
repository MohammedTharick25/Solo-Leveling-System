// src/components/PillarQuests.js
import React from 'react';
import './PillarQuests.css';

const PillarQuests = ({ pillars, onGenerateQuest }) => {
  if (!pillars || Object.keys(pillars).length === 0) {
    return (
      <div className="system-panel pillar-quests">
        <h2 className="panel-title">LIFE PILLARS - QUEST GENERATOR</h2>
        <p>Pillar data initializing...</p>
      </div>
    );
  }

  return (
    <div className="system-panel pillar-quests">
      <h2 className="panel-title">PILLAR DIRECTIVES</h2>
      <p className="pillar-quests-description">
        Select a Life Pillar to receive a specialized quest. Enhancing these pillars contributes to your overall growth and unlocks greater potential.
      </p>
      <div className="pillar-buttons-grid">
        {Object.entries(pillars).map(([key, pillar]) => (
          <button
            key={key}
            onClick={() => onGenerateQuest(key)}
            className="pillar-quest-button"
            title={`Generate a quest for ${pillar.name} (Lv. ${pillar.level})`}
            style={{'--pillar-color': pillar.color || '#4a6fcc'}}
          >
            <span className="pillar-icon">{pillar.icon}</span>
            <span className="pillar-name-button">{pillar.name}</span>
            <span className="pillar-level-button">Lv. {pillar.level}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
export default PillarQuests;