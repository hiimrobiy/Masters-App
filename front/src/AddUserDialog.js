// AddUserDialog.js

import React, { useState, useEffect } from 'react';
import axios from 'axios';;

const AddUserDialog = ({ task, onClose, onUserAdded }) => {
  const [collaborators, setCollaborators] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);

  useEffect(() => {
    const fetchCollaborators = async () => {
      try {
        // Fetch collaborators for the repository associated with the task
        const response = await axios.get(
          `http://localhost:5000/collaborators/${task.repo_id}`
        ,{withCredentials: true});
        setCollaborators(response.data);
      } catch (error) {
        console.error('Error fetching collaborators:', error);
      }
    };

    fetchCollaborators();
  }, [task.repo_id]);

  const toggleUserSelection = (userId) => {
    setSelectedUsers((prevSelected) =>
      prevSelected.includes(userId)
        ? prevSelected.filter((id) => id !== userId)
        : [...prevSelected, userId]
    );
  };

  const handleAddUsers = async () => {
    try {
      // Make API call to add users to the task
      await axios.post(`http://localhost:5000/tasks/${task.task_id}/assign-users`, {
        user_ids: selectedUsers,
      },{withCredentials: true});
      onUserAdded(); // Callback to refresh data
      onClose();
    } catch (error) {
      console.error('Error adding users to task:', error);
    }
  };

  return (
    <div className="dialog-overlay">
      <div className="dialog">
        <h2>Add Users to Task: {task.task_title}</h2>
        <div className="users-list">
          {collaborators.map((user) => (
            <div
              key={user.user_id}
              className={`card user-card ${selectedUsers.includes(user.user_id) ? 'selected' : ''}`}
              onClick={() => toggleUserSelection(user.user_id)}
            >
              <h4>{user.name}</h4>
              <p>{user.email}</p>
            </div>
          ))}
        </div>
        <div className="dialog-actions">
          <button className="dialog-button cancel-button" onClick={onClose}>
            Cancel
          </button>
          <button
            className="dialog-button add-button"
            onClick={handleAddUsers}
            disabled={selectedUsers.length === 0}
          >
            Add Selected Users
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddUserDialog;
