import React, { useState } from 'react';
import axios from 'axios';
import './NewIssueModal.css';

const NewIssueModal = ({ repositoryId, onClose, onIssueAdded }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [labels, setLabels] = useState('');
  const [assignees, setAssignees] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!title) return alert('Title is required.');

    setIsSubmitting(true);

    try {
      const response = await axios.post(`http://localhost:5000/api/issues`, {
        repositoryId,
        title,
        description,
        labels: labels.split(',').map(label => label.trim()), // Convert to array
        assignees: assignees.split(',').map(assignee => assignee.trim()), // Convert to array
      },{withCredentials: true});

      alert('Issue created successfully!');
      onIssueAdded(); // Refresh the issues on the canvas
      onClose(); // Close the modal
    } catch (error) {
      console.error('Error creating issue:', error);
      alert('Failed to create issue.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Create New Issue</h2>
        <input
          type="text"
          placeholder="Title"
          value={title}
          onChange={e => setTitle(e.target.value)}
        />
        <textarea
          placeholder="Description"
          value={description}
          onChange={e => setDescription(e.target.value)}
        ></textarea>
        <input
          type="text"
          placeholder="Labels (comma-separated)"
          value={labels}
          onChange={e => setLabels(e.target.value)}
        />
        <input
          type="text"
          placeholder="Assignees (comma-separated)"
          value={assignees}
          onChange={e => setAssignees(e.target.value)}
        />
        <div className="modal-actions">
          <button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create Issue'}
          </button>
          <button onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default NewIssueModal;
