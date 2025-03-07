// AssignCollaboratorsModal.js

import React, { useState, useEffect } from 'react';
import './../css/AssignCollaboratorsModal.css';
import { FaCheckCircle } from 'react-icons/fa';
import UserAvailabilityPopover from './UserAvailabilityPopover';

const AssignCollaboratorsModal = ({ isOpen, onClose, collaborators, onAssign, issueTitle, initialSelectedUsers }) => {
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [hoveredUserId, setHoveredUserId] = useState(null);
  const [popoverAnchorEl, setPopoverAnchorEl] = useState(null);
  const [hoveredUserName, setHoveredUserName] = useState(null);
  useEffect(() => {
    // Initialize selected users if editing
    if (initialSelectedUsers) {
      setSelectedUsers(initialSelectedUsers.map((user) => user.user_id));
    }
  }, [initialSelectedUsers]);

  const toggleUserSelection = (userId) => {
    setSelectedUsers((prevSelected) =>
      prevSelected.includes(userId)
        ? prevSelected.filter((id) => id !== userId)
        : [...prevSelected, userId]
    );
  };

  const handleAssign = () => {
    const assignedUsers = collaborators.filter((user) => selectedUsers.includes(user.user_id));
    onAssign(assignedUsers);
  };
  
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h3>Assign Collaborators to "{issueTitle}"</h3>
        <div className="collaborators-list">
          {collaborators.map((user) => {
            const isSelected = selectedUsers.includes(user.user_id);
            return (
              <div
                key={user.user_id}
                className={`collaborator-item ${isSelected ? 'selected' : ''}`}
                onClick={() => toggleUserSelection(user.user_id)}
                onMouseEnter={(e) => {
                  setHoveredUserId(user.user_id);
                  setPopoverAnchorEl(e.currentTarget);
                  setHoveredUserName(user.name);
                
                }}
                onMouseLeave={() => {
                  setHoveredUserId(null);
                  setPopoverAnchorEl(null);
                  setHoveredUserName("");
                }}
              >
                <img src={user.profile_picture} alt={user.name} className="user-avatar" />
                <span className="user-name">{user.name}</span>
                {isSelected && <FaCheckCircle className="selected-icon" />}
              </div>
            );
          })}
        </div>
        <div className="modal-actions">
          <button className="modal-button cancel-button" onClick={onClose}>
            Cancel
          </button>
          <button
            className="modal-button assign-button"
            onClick={handleAssign}
            disabled={selectedUsers.length === 0}
          >
            Assign
          </button>
        </div>
        <UserAvailabilityPopover
          anchorEl={popoverAnchorEl}
          userId={hoveredUserId}
          onClose={() => {
            setHoveredUserId(null);
            setPopoverAnchorEl(null);
            setHoveredUserName("");
          }}
          userName={hoveredUserName}
        />
      </div>
    </div>
  );
};

export default AssignCollaboratorsModal;
