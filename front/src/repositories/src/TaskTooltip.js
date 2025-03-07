import React from 'react';
import './../css/TaskTooltip.css';

function TaskTooltip({ 
  assigned_users = [], 
  description = "No description provided", 
  priority = "Not specified", 
  url = "#", 
  labels = [] ,
  task
}) {
  return (
    <div className="task-tooltip">
      <p><strong>Assigned to:</strong> {assigned_users.length > 0 ? assigned_users.join(', ') : "Unassigned"}</p>
      <p><strong>Description:</strong> {description}</p>
      <p><strong>Priority:</strong> {priority}</p>
      <p><strong>Labels:</strong> {labels.length > 0 ? labels.join(', ') : "No labels"}</p>
      <p><strong>Task:</strong> {task && task.task_title}</p>
      
      <p>
        <strong>Issue URL:</strong>{' '}
        <a href={url} target="_blank" rel="noopener noreferrer">
          {url !== "#" ? url : "No URL available"}
        </a>
      </p>
      
    </div>
  );
}

export default TaskTooltip;

