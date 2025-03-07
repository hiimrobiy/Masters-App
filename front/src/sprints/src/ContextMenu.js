// ContextMenu.js

import React from 'react';
import './../css/ContextMenu.css';

const ContextMenu = ({ node, removable,onAddToTask, onClose, position, disabled,inTask ,onRemoveFromTask,edges,tasks}) => {
  return (
    <div
      className="context-menu"
      style={{ top: position.y, left: position.x }}
      onMouseLeave={onClose}
    >
      <ul>
        <li
          className={disabled || inTask ? 'disabled' : ''}
          onClick={!disabled  && !inTask? onAddToTask : undefined}
        >
          Add to Sprint
        </li>
        <li
          className={!inTask || !removable ? 'disabled' : ''}
          onClick={inTask || removable ? onRemoveFromTask : undefined}
        >
          Remove from Sprint
        </li>
      </ul>
    </div>
  );
};

export default ContextMenu;
