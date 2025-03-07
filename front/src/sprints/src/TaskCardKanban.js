import React, { useState } from 'react';
import { FaBug, FaUsers, FaExpandAlt, FaClipboard } from 'react-icons/fa';
import TaskDetailsDialog from './TaskDetailsDialog';
import './../css/TaskCard.css';

const TaskCardKanban = ({ task, updateIssueStatus,issueDeleted,sprint,user}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const {
    task_title,
    issues = [],
  } = task;

  const openDialog = () => setIsDialogOpen(true);
  const closeDialog = () => setIsDialogOpen(false);
  const assigned_users = task.issues.flatMap((issue)=>issue.assigned_users);
  const finished_issues  = task.issues.filter(issue => issue.status === 'closed');
  const not_set  = task.issues.filter(issue => issue.start_date== null || issue.end_date== null || issue.expected_time ==0);
  return (
    <div className={`task-card ${not_set.length>0 ? `not-set`:``}`}>
      <div className="task-card-header">
        <h4 className="task-title">{task_title}</h4>
        <button className="expand-button" onClick={openDialog} title="View Details">
          <FaExpandAlt />
        </button>
      </div>
      <div className="task-card-footer">
        <div className="footer-info">
          {assigned_users.length > 0 && (
            <div className="info-group">
              <FaUsers className="icon" />
              <span>{assigned_users.length}</span>
            </div>
          )}
          <div className='task-issues-board'>
            {issues.length > 0 && (
              <div className="info-group">
                <FaBug className="icon bug-icon" />
                <span>{issues.length}</span>
              </div>
            )}
            {finished_issues.length > 0 && (
              <div className="info-group">
                <FaClipboard className="icon bug-icon-done" />
                <span>{issues.length}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {isDialogOpen && (
        <TaskDetailsDialog
          task={task}
          isOpen={isDialogOpen}
          onClose={closeDialog}
          updateIssueStatus={updateIssueStatus}
          ready = {not_set.length ===0}
          issueDeleted={issueDeleted}
          user={user}
          sprint={sprint}
        />
      )}
    </div>
  );
};

export default TaskCardKanban;
