// TaskNode.js

import React from 'react';
import { Handle } from 'react-flow-renderer';
import './../css/TaskNode.css';

const TaskNode = ({ data }) => {
  const { task, onAddUser } = data;

  return (
    <div className="task-node">
      <Handle type="target" position="top" />
      <div className="task-node-content">
        <h3 className="task-title">{task.task_title}</h3>
        <p className="task-description">{task.task_description}</p>
        <button className="add-user-button" onClick={() => onAddUser(task)}>
          + Add User
        </button>
      </div>
      <Handle type="source" position="bottom" />
    </div>
  );
};

export default TaskNode;
