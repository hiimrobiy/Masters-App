import React, { useState } from 'react';
import axios from 'axios';
import './CreateRepositoryButton.css'; // Import the CSS file

const CreateRepositoryButton = () => {
  const [repoName, setRepoName] = useState('');
  const [message, setMessage] = useState('');

  const handleInputChange = (e) => {
    setRepoName(e.target.value);
  };

  const handleCreateRepo = async () => {
    if (!repoName) {
      setMessage('Please enter a repository name.');
      return;
    }

    try {
      const response = await axios.post('http://localhost:5000/api/create-repository', { repoName },{withCredentials: true,});
      setMessage(`Repository "${response.data.repository.name}" created successfully!`);
      setRepoName('');
    } catch (error) {
      setMessage(`Error creating repository: ${error.response?.data.message || error.message}`);
    }
  };

  return (
    <div className="create-repo-container">
      <input
        type="text"
        placeholder="Repository name"
        value={repoName}
        onChange={handleInputChange}
        className="create-repo-input"
      />
      <button
        onClick={handleCreateRepo}
        className="create-repo-button"
      >
        Create
      </button>
      {message && <p className="create-repo-message">{message}</p>}
    </div>
  );
};

export default CreateRepositoryButton;
