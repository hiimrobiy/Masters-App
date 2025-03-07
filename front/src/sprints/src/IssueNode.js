import React, { useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import classNames from 'classnames';
import TaskTooltip from '../../repositories/src/TaskTooltip';
import './../../repositories/css/CustomNode.css'; // Ensure this file exists and contains your styles

const IssueNode = ({ data }) => {
  const { locked,inCurrentTask } = data;
  const nodeClass = classNames(
    'custom-node',
    {
      'high-priority': data.priority === 'high',
      'low-priority': data.priority === 'low',
      'normal-priority': data.priority === 'normal',
      'locked': locked, // Add 'locked' class if the node is locked
      'in-task': data.inTask === true && inCurrentTask === false,
      'in-current': inCurrentTask === true // Addse, // Add
    }
  );

  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={nodeClass}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Conditionally render handles based on locked status */}
     
          <Handle
            type="target"
            position={Position.Left}
            className="custom-handle"
          />
          <Handle
            type="source"
            position={Position.Right}
            className="custom-handle"
          />
        
      
      {/* Node Main Content */}
      <div className="header">
        <span className="title">{data.title}</span>
      </div>
      <div className="priority-display">
        <label>Priority:</label>
        <p>{data.priority}</p>
      </div>

      <div className="bottom-info">
        <div className="labels">
          {data.labels.map((label, index) => (
            <span key={index} className="label-container">{label}</span>
          ))}
        </div>
      </div>

      {/* Hover Information */}
      {isHovered && (
        <TaskTooltip
          assignee={data.assignee}
          description={data.description}
          createdAt={data.createdAt}
          updatedAt={data.updatedAt}
          commentsCount={data.commentsCount}
          priority={data.priority}
          labels={data.labels}
          milestone={data.milestone}
          url={data.url}
        />
      )}

      {/* Locked Overlay */}
      {locked && <div className="issue-node-locked-overlay">Locked</div>}
    </div>
  );
};

export default IssueNode;
