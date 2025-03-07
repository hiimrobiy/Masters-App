import React, { useState } from 'react';
import Modal from 'react-modal';
import { FaTimes, FaBug, FaCheckCircle, FaTrash} from 'react-icons/fa';
import './../css/TaskDetailsDialog.css';
import { GoAlert } from "react-icons/go";
import Tooltip from '@mui/material/Tooltip';
import axios from 'axios';
import { RiUserAddFill } from "react-icons/ri";
import AssignCollaboratorsModal from './AssignCollaboratorsModal';


const TaskDetailsDialog = ({ task, isOpen, onClose, updateIssueStatus, ready, issueDeleted,sprint,user }) => {
  
  const [issueTimes, setIssueTimes] = useState({});
  const [finished_dates,setFinishedDates] = useState({});
  const [collaborators, setCollaborators] = useState([]);
  const [contextMenu, setContextMenu] = useState(null);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [currentIssue, setCurrentIssue] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const {
    task_title,
    task_description,
    issues = []
  } = task;

  const handleTimeChange = (issueId, value) => {
    setIssueTimes((prev) => ({
      ...prev,
      [issueId]: value,
    }));
  };
  const handleDateChange = (issueId, value) => {
    setFinishedDates((prev) => ({
      ...prev,
      [issueId]: value,
    }));
  };

  const handleCloseIssue = (issue) => {
    const elapsedTime = issueTimes[issue.issue_id];
    const finishedDate = finished_dates[issue.issue_id];
    if (!elapsedTime || isNaN(elapsedTime) || Number(elapsedTime) <= 0) {
      alert('Please enter a valid elapsed time (in hours) before closing this issue.');
      return;
    }
    if(finishedDate === null || finishedDate === ''){
      alert('Please enter a valid finished date before closing this issue.');
      return;
    }
    updateIssueStatus(issue.issue_id, 'closed', elapsedTime,finishedDate);
  };
  const handleReopenIssue = (issue) => {
    updateIssueStatus(issue.issue_id, 'open', 0, null);
  };

  
  const handleContextMenu = (event, issue) => {
    event.preventDefault();
    setSelectedIssue(issue);
    setContextMenu({ x: event.pageX, y: event.pageY });
  };

  const closeContextMenu = () => {
    setContextMenu(null);
  };

  const handleRemoveIssue = async (issue_id) => {
    
    try {
      await axios.delete(`http://localhost:5000/sprints/deleteIssue/${task.task_id}/issue/${issue_id}`,{withCredentials:true});
      // Update state in parent component
      issueDeleted(task.task_id);
    } catch (error) {
      console.error('Error removing issue:', error);
      alert('Failed to remove issue from task still dependent issues active');
    }

    setContextMenu(null);
  };
  const addUserToIssue = async (issue) => {
    const collaboratorsResponse = await axios.get(
      `http://localhost:5000/collaborators/${task.repo_id}`
    ,{withCredentials: true});
    setCollaborators(collaboratorsResponse.data);
    setCurrentIssue(issue);
    setIsModalOpen(true);
  };
  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      className="task-details-modal"
      overlayClassName="task-details-overlay"
      contentLabel="Task Details"
      ariaHideApp={false}
    >
      <div className="task-details-header">
        <h2 className="task-title">Task name : {task_title}</h2>
        <button className="close-modal-button" onClick={onClose} title="Close">
          <FaTimes />
        </button>
      </div>

      {task_description && (
        <p className="task-description">{task_description}</p>
      )}
      
      <h3 className="issues-heading">Issues </h3>
      <div className="issues-container">
        {issues.map((issue) => {

const isClosed = issue.state === 'closed';
          const icon = isClosed ? <FaCheckCircle className="issue-icon closed-icon" /> : <FaBug className="issue-icon bug-icon" />;
          const containerClasses = `issue-row ${isClosed ? 'closed' : ''}`;
         
          return (
            <div key={issue.issue_id} className={containerClasses} onContextMenu={ (e) => handleContextMenu(e, issue)}>
              
              <div className="issue-info">
                <div className="issue-details">
                  <div className='issue-title-container'>
                    <span className="issue-title"><h3>Issue title</h3> : {issue.issue_title}</span>
                    {(issue.start_date === null || issue.end_date === null) && (
                    
                      <div><GoAlert color='red'/> Set start / end date first</div>
                     
                   
                  )}
                  {(Number(issue.expected_time)===0) && (
                    
                    <div><GoAlert color='red'/> Set expected_time</div>
                   
                 
                )}
                  
                </div>
                  { (issue.start_date !== null && issue.end_date !== null) && 
                  issue.assigned_users && issue.assigned_users.length > 0 && (
                    <div className="issue-users">
                        <div className="avatar-container" key={issue.assigned_users[0].user_id}>
                          <img
                            src={issue.assigned_users[0].profile_picture || '/default-avatar.png'}
                            alt={issue.assigned_users[0].name}
                            className="issue-user-avatar"
                          />
                          <div className="avatar-tooltip">{issue.assigned_users[0].name}</div>
                        </div>
                      {issue.assigned_users.length > 1 && (
                        <div>
                          + {issue.assigned_users.length - 1}
                          </div>
                      )}
                      {Number(sprint.sprint_owner_id) === Number(user.id) &&
                      <RiUserAddFill 
                                      className="add-user-icon" onClick={() => {
                                      addUserToIssue(issue);
                                      
                                       
                                     }}/>
                                    }
                      
                    </div>
                  )}
                </div>
              </div>
              <div className="issue-actions">
              {(issue.start_date !== null && issue.end_date !== null) && (
                  <>
                  <input
                    type="number"
                    min="0"
                    placeholder="Elapsed Time (h)"
                    defaultValue={issue.elapsed_time}
                    value={issueTimes[issue.issue_id]} 
                    onChange={(e) => handleTimeChange(issue.issue_id, e.target.value)}
                    className="elapsed-time-input"
                    disabled={!ready || 
                      Number(sprint.sprint_owner_id) !== Number(user.id)}
                    
                    
                  />
                  <input
                  type="date"
                  placeholder="Finished date"
                  value={
                    finished_dates[issue.issue_id] 
                      ? new Date(finished_dates[issue.issue_id]).toISOString().split('T')[0] // Show updated value if it exists
                      : (issue.finished_date ? new Date(issue.finished_date).toISOString().split('T')[0] : '') // Show existing stored value if available
                  }
                  onChange={(e) => handleDateChange(issue.issue_id, e.target.value)}
                  className="elapsed-time-input"
                  disabled={!ready || isClosed || 
                    Number(sprint.sprint_owner_id) !== Number(user.id)}
                  style={{width: 'max-content'}}
                />
              
               
                
                <button
                  className={`close-issue-button ${!isClosed ?  'closed-button':"update-button"}`}
                  onClick={() => handleCloseIssue(issue)}
                  disabled={!ready || isClosed || 
                    Number(sprint.sprint_owner_id) !== Number(user.id)}
                  
                >
                  {isClosed ? 'Finished' : 'Close'}
                </button>
                </>
                 )}
                 {!isClosed  && Number(sprint.sprint_owner_id) === Number(user.id) &&  (
                <button className="delete-issue-button" onClick={() => handleRemoveIssue(issue.issue_id) || 
                  Number(sprint.sprint_owner_id) !== Number(user.id)}>
                    <FaTrash />
                  </button>
                 )}
               
                
              </div>
        
            </div>
          );
        })}
      </div>
      {currentIssue  && (
  <AssignCollaboratorsModal
    isOpen={isModalOpen}
    onClose={() => setIsModalOpen(false)}
    collaborators={collaborators}
    onAssign={async (assignedUsers) => {
      const user_ids  = assignedUsers.map((user) => user.user_id);
      const res =  await axios.post(`http://localhost:5000/sprints/addUserToIssue/${task.task_id}/${currentIssue.issue_id}/`,{user_ids},{withCredentials:true,});
      setIsModalOpen(false);
      
    }}
    issueTitle={currentIssue.issue_title}
    initialSelectedUsers={
      currentIssue.assigned_users.map((user) => ({
        user_id: user.user_id,
        name: user.name,
        profile_picture: user.profile_picture,
      }))
    }
  />
)}
    </Modal>
  );
};

export default TaskDetailsDialog;
