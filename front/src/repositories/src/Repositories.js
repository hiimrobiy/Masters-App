// src/repositories/src/Repositories.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Tabs from './Tabs';
import Flow from './Flow'; // React Flow component
import * as repositoriesApi from './../../api/repositoriesApi';
import { FaTags, FaUserPlus } from 'react-icons/fa';
import { FaPlusCircle, FaFolderPlus } from 'react-icons/fa';
import { useProject } from '../../ProjectProvider';
import './../css/Repositories.css';

// MUI Components
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  RadioGroup,
  FormControlLabel,
  Radio,
  Typography,
  Box,
} from '@mui/material';

const BASE_URL = 'http://localhost:5000';

const Repositories = ({ user }) => {
  // State variables
  const [repositories, setRepositories] = useState([]);
  const [activeTab, setActiveTab] = useState(0);
  const [isRepoDialogOpen, setIsRepoDialogOpen] = useState(false);
  const [isIssueDialogOpen, setIsIssueDialogOpen] = useState(false);
  const [newRepoName, setNewRepoName] = useState('');
  const [existingRepoUrl, setExistingRepoUrl] = useState('');
  const [repoAction, setRepoAction] = useState('new'); // "new" or "existing"
  const [newIssueTitle, setNewIssueTitle] = useState('');
  const [newIssueDescription, setNewIssueDescription] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [selectedLabels, setSelectedLabels] = useState([]);
  const [allLabels, setAllLabels] = useState([]);
  const [newLabel, setNewLabel] = useState('');
  const [selectedAssignees, setSelectedAssignees] = useState([]);
  const [allCollaborators, setAllCollaborators] = useState([]);
  const [update, setUpdate] = useState(false);
  const { currentProject } = useProject();

  // Fetch repositories on mount (and whenever currentProject.id or user.id changes)
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await repositoriesApi.fetchRepositories(currentProject.id, user.id);
        // Map repositories to include the isCollaborator field.
        // Make sure your backend returns a field like "is_collaborator".
        const mappedRepositories = response.data.map((repo) => ({
          id: repo.repo_id,
          name: repo.repo_name,
          createdAt: repo.date_created,
          isCollaborator: repo.is_collaborator, // true if the user is a collaborator, false otherwise
        }));
        setRepositories(mappedRepositories);
      } catch (error) {
        console.error('Error fetching repositories:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [currentProject.id, user.id]);

  // Fetch labels and collaborators when the issue dialog is open
  useEffect(() => {
    const fetchLabelsAndCollaborators = async () => {
      if (isIssueDialogOpen) {
        const repositoryId = repositories[activeTab]?.id;
        if (repositoryId) {
          try {
            const labelsResponse = await axios.get(`${BASE_URL}/repositories/labels/`, { withCredentials: true });
           

            const collaboratorsResponse = await repositoriesApi.fetchCollaborators(repositoryId);
            setAllCollaborators(collaboratorsResponse.data);
            setAllLabels(labelsResponse.data);
          } catch (error) {
            console.error('Error fetching labels or collaborators:', error);
          }
        }
      }
    };

    fetchLabelsAndCollaborators();
  }, [isIssueDialogOpen, repositories, activeTab]);

  // Handle tab change
  const handleTabChange = (index) => {
    setActiveTab(index);
  };

  // Open/close repository dialog
  const openRepoDialog = () => setIsRepoDialogOpen(true);
  const closeRepoDialog = () => {
    setIsRepoDialogOpen(false);
    setNewRepoName('');
    setExistingRepoUrl('');
    setMessage('');
    setRepoAction('new');
  };

  // Open/close issue dialog
  const openIssueDialog = () => setIsIssueDialogOpen(true);
  const closeIssueDialog = () => {
    setIsIssueDialogOpen(false);
    setNewIssueTitle('');
    setNewIssueDescription('');
    setSelectedLabels([]);
    setSelectedAssignees([]);
    setAllLabels([]);
    setAllCollaborators([]);
    setMessage('');
  };

  // Handle repository creation or addition based on repoAction
  const handleCreateRepository = async () => {
    if (repoAction === 'new') {
      if (!newRepoName) {
        setMessage('Please enter a repository name.');
        return;
      }
      try {
        const response = await repositoriesApi.createRepository(
          newRepoName,
          currentProject.id,
          user.id,
          user.accessToken
        );
        // For a new repository the user is automatically a collaborator.
        const newRepo = {
          id: response.data.repository.id,
          name: response.data.repository.name,
          createdAt: response.data.repository.date_created,
          isCollaborator: true,
        };
        setRepositories((prevRepos) => [...prevRepos, newRepo]);
        setActiveTab(repositories.length);
        closeRepoDialog();
      } catch (error) {
        console.error('Error creating repository:', error);
        setMessage(`Error creating repository: ${error.response?.data.message || error.message}`);
      }
    } else if (repoAction === 'existing') {
      if (!existingRepoUrl) {
        setMessage('Please enter the URL of the existing repository.');
        return;
      }
      try {
        // Note: We pass user.login so that the backend can verify collaboration.
        const response = await repositoriesApi.addExistingRepository(
          existingRepoUrl,
          currentProject.id,
          user.id,
          user.accessToken,
          user.login
        );
        // Backend confirms that the user is a collaborator.
        const newRepo = {
          id: response.data.repository.repo_id,
          name: response.data.repository.repo_name,
          createdAt: response.data.repository.date_created,
          isCollaborator: true,
        };
        setRepositories((prevRepos) => [...prevRepos, newRepo]);
        setActiveTab(repositories.length);
        closeRepoDialog();
      } catch (error) {
        console.error('Error adding existing repository:', error);
        setMessage(`Error adding repository: ${error.response?.data.message || error.message}`);
      }
    }
  };

  // Handle creating a new issue
  const handleCreateIssue = async () => {
    if (!newIssueTitle || !newIssueDescription) {
      setMessage('Please provide both a title and a description for the issue.');
      return;
    }

    try {
      const repositoryId = repositories[activeTab]?.id;
      const issueData = {
        repoId: repositoryId,
        title: newIssueTitle,
        description: newIssueDescription,
        labels: selectedLabels,
        assignees: selectedAssignees,
        priority: "low",
        token: user.accessToken,
      };

      // Create any new labels first
      const newLabels = allLabels.filter(
        (label) => label.isNew && selectedLabels.includes(label.id)
      );
      if (newLabels.length > 0) {
        for (const label of newLabels) {
          try {
            const labelResponse = await repositoriesApi.createLabel(label.name);
            // Update label IDs with the returned value
            setAllLabels((prevLabels) =>
              prevLabels.map((l) =>
                l.id === label.id ? { ...l, id: labelResponse.data.id } : l
              )
            );
            setSelectedLabels((prevSelected) =>
              prevSelected.map((id) => (id === label.id ? labelResponse.data.id : id))
            );
          } catch (error) {
            console.error('Error creating new label:', error);
          }
        }
      }

      const response = await repositoriesApi.createIssue(issueData, currentProject.id);
      setUpdate(!update);
      console.log('Issue created:', response.data);
      setMessage('Issue created successfully.');
      closeIssueDialog();
    } catch (error) {
      console.error('Error creating issue:', error);
      setMessage('Error creating the issue. Please try again.');
    }
  };

  // Toggle label selection (for issue dialog)
  const toggleLabelSelection = (labelId) => {
    if (selectedLabels.includes(labelId)) {
      setSelectedLabels(selectedLabels.filter((id) => id !== labelId));
    } else {
      setSelectedLabels([...selectedLabels, labelId]);
    }
  };

  // Handle new label creation on Enter key
  const handleNewLabelKeyDown = (e) => {
    if (e.key === 'Enter' && newLabel.trim() !== '') {
      const newLabelObject = { id: Date.now(), name: newLabel.trim(), isNew: true };
      setAllLabels([...allLabels, newLabelObject]);
      setSelectedLabels([...selectedLabels, newLabelObject.id]);
      setNewLabel('');
    }
  };

  // Toggle assignee selection (for issue dialog)
  const toggleAssigneeSelection = (collaboratorId) => {
    if (selectedAssignees.includes(collaboratorId)) {
      setSelectedAssignees(selectedAssignees.filter((id) => id !== collaboratorId));
    } else {
      setSelectedAssignees([...selectedAssignees, collaboratorId]);
    }
  };

  return (
    <div className='outer-div'>
      {/* Render Tabs */}
      <div className='header-repo'>
        <Tabs
          repositories={repositories}
          activeTab={activeTab}
          onTabChange={handleTabChange}
          onOpenDialog={openRepoDialog}
          isRepoPage={true}
        />
        <div className='add-buttons-container'>
          <button className='add-button add-repo-button' onClick={openRepoDialog}>
            <FaFolderPlus className='button-icon' />
            Add Repository
          </button>
          <button className='add-button add-issue-button' onClick={openIssueDialog}
          disabled={!repositories[activeTab]?.isCollaborator }>
            <FaPlusCircle className='button-icon' />
            Add Issue
          </button>
        
        </div>
      </div>

      {/* Render Flow diagram or "No Access" board based on collaborator status */}
      <div className='flow-container'>
        {isLoading ? (
          <div className='loading-spinner'></div>
        ) : (
          <>
            {repositories[activeTab]?.isCollaborator ? (
              <Flow repositoryId={repositories[activeTab]?.id} update={update} />
            ) : (
              <Box 
                display="flex" 
                flexDirection="column" 
                alignItems="center" 
                justifyContent="center" 
                height="100%" 
                p={3}
              >
                <Typography variant="h5" color="textSecondary">
                  No Access
                </Typography>
                <Typography variant="body1" color="textSecondary">
                  You are not a collaborator on this repository.
                </Typography>
              </Box>
            )}
          </>
        )}
      </div>

      {/* MUI Dialog for Repository Creation / Addition */}
      <Dialog open={isRepoDialogOpen} onClose={closeRepoDialog} fullWidth maxWidth="sm">
        <DialogTitle>
          <Typography variant="h6">
            {repoAction === 'new' ? 'Create New Repository' : 'Add Existing Repository'}
          </Typography>
        </DialogTitle>
        <DialogContent dividers>
          <RadioGroup row value={repoAction} onChange={(e) => setRepoAction(e.target.value)}>
            <FormControlLabel value="new" control={<Radio />} label="Create New Repository" />
            <FormControlLabel value="existing" control={<Radio />} label="Add Existing Repository" />
          </RadioGroup>
          {repoAction === 'new' ? (
            <TextField
              autoFocus
              margin="dense"
              label="Repository Name"
              type="text"
              fullWidth
              variant="outlined"
              value={newRepoName}
              onChange={(e) => setNewRepoName(e.target.value)}
            />
          ) : (
            <TextField
              autoFocus
              margin="dense"
              label="Existing Repository URL"
              type="text"
              fullWidth
              variant="outlined"
              value={existingRepoUrl}
              onChange={(e) => setExistingRepoUrl(e.target.value)}
            />
          )}
          {message && (
            <Typography variant="body2" color="error" sx={{ mt: 2 }}>
              {message}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeRepoDialog} color="secondary">
            Cancel
          </Button>
          <Button onClick={handleCreateRepository} variant="contained" color="primary">
            {repoAction === 'new' ? 'Create' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Issue Dialog - basic HTML version (can be converted to MUI if desired) */}
      {isIssueDialogOpen && (
        <div className='dialog-overlay'>
          <div className='dialog issue-dialog'>
            <h3>Create New Issue</h3>
            <input
              type='text'
              placeholder='Issue Title'
              value={newIssueTitle}
              onChange={(e) => setNewIssueTitle(e.target.value)}
              className='dialog-input'
            />
            <textarea
              placeholder='Issue Description'
              value={newIssueDescription}
              onChange={(e) => setNewIssueDescription(e.target.value)}
              className='dialog-textarea'
            />

            {/* Labels Section */}
            <div className='dialog-section'>
              <h4>
                <FaTags /> Labels
              </h4>
              <div className='labels-container'>
                {allLabels.map((label) => (
                  <span
                    key={label.label_id}
                    className={`label-chip ${selectedLabels.includes(label.label_id) ? 'selected' : ''}`}
                    onClick={() => toggleLabelSelection(label.label_id)}
                  >
                    {label.label_name}
                  </span>
                ))}
              </div>
             
            </div>

            {/* Assignees Section */}
            <div className='dialog-section'>
              <h4>
                <FaUserPlus /> Assignees
              </h4>
              <div className='assignees-container'>
                {allCollaborators.map((collaborator) => (
                  <div
                    key={collaborator.user_id}
                    className={`assignee-item ${selectedAssignees.includes(collaborator.user_id) ? 'selected' : ''}`}
                    onClick={() => toggleAssigneeSelection(collaborator.user_id)}
                  >
                    <img
                      src={collaborator.profile_picture || '/default-avatar.png'}
                      alt={collaborator.name}
                      className='assignee-avatar'
                    />
                    <span className='assignee-name'>{collaborator.name}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className='dialog-actions'>
              <button onClick={closeIssueDialog} className='dialog-button cancel'>
                Cancel
              </button>
              <button onClick={handleCreateIssue} className='dialog-button'>
                Create
              </button>
            </div>
            {message && <p className='dialog-message'>{message}</p>}
          </div>
        </div>
      )}
    </div>
  );
};

export default Repositories;
