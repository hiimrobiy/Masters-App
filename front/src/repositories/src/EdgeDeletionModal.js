import React from 'react';
import './../css/EdgeDeletionModal.css';
import { AiOutlineDelete } from 'react-icons/ai'; // Icon for deletion

const EdgeDeletionModal = ({ onConfirm, onCancel }) => {
  return (
    <div className="modal-overlay">
      <div className="edge-deletion-modal">
        <AiOutlineDelete className="modal-icon" />
        <h2>Delete Dependency</h2>
        <p>Are you sure you want to delete this dependency?</p>
        <div className="modal-actions">
          <button className="modal-button cancel-button" onClick={onCancel}>
            Cancel
          </button>
          <button className="modal-button delete-button" onClick={onConfirm}>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default EdgeDeletionModal;
