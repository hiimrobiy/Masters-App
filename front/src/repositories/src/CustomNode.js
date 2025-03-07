import { Handle, Position } from '@xyflow/react';
import './../css/CustomNode.css'; // Ensure this file exists and contains your styles
import classNames from 'classnames';
import React, { useState } from 'react';
import TaskTooltip from './TaskTooltip';


const CustomNode = ({ data, isConnectable }) => {
  const nodeClass = classNames('custom-node', {
    'high-priority': data.priority === 'high',
    'low-priority': data.priority === 'low',
    'normal-priority': data.priority === 'normal',
    'in-task': data.inAnyTask === true
  });
  const [isHovered, setIsHovered] = useState(false);
  const [priority, setPriority] = useState(data.priority);
  const handlePriorityChange = (e) => {
    const newPriority = e.target.value;
    setPriority(newPriority); // Update local state for immediate UI feedback
    data.updatePriority(data.id, newPriority); // Call the function from Flow to update backend
  };  


  return (
    <div 
      className={nodeClass}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Handles for connections */}
      <Handle
        type="target"
        position={Position.Left}
        isConnectable={isConnectable}
        className="custom-handle"
      />
      <Handle
        type="source"
        position={Position.Right}
        isConnectable={isConnectable}
        className="custom-handle"
        
      />

      {/* Node Main Content */}
      <div className="header">
        
        <span className="title">{data.title}</span>
      </div>
      <div className="priority-dropdown">
          <label>Priority:</label>
          <select value={data.priority} onChange={handlePriorityChange}>
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>

      <div className="bottom-info">
        <div className="labels">
          {data.labels.map((label, index) => (
            <span key={index} className="label-container">{label}</span>
          ))} {/* Display labels with button-like styling */}
        </div>
      </div>

      {/* Hover Information */}
      {isHovered && (
        <TaskTooltip
          assignee={data.assigned_users}
          description={data.description}
          priority={data.priority}
          labels={data.labels}
          url={data.url}
          task = {data.task}
          
        />
      )}
    </div>
  );
};

export default CustomNode;

