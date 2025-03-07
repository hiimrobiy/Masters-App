// src/repositories/src/TeamBoard.js
import React, { useState, useEffect } from 'react';
import './../css/TeamBoard.css';
import CollaboratorCard from './CollaboratorCard';
import Tabs from '../../repositories/src/Tabs'; // Using the same Tabs component as in Repositories
import axios from 'axios';
import UserReport from './UserReport';
import { useProject } from '../../ProjectProvider';

// MUI imports for layout and dialog
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  RadioGroup,
  FormControlLabel,
  Radio,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';

const TeamBoard = ({ user }) => {
  const [repositories, setRepositories] = useState([]);
  const [activeTab, setActiveTab] = useState(0);
  const [collaborators, setCollaborators] = useState([]);
  const [userReport, setUserReport] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const { currentProject } = useProject();

  // States for managing collaborators
  const [openManageDialog, setOpenManageDialog] = useState(false);
  const [manageAction, setManageAction] = useState('add'); // 'add' or 'remove'
  const [collaboratorUsernameInput, setCollaboratorUsernameInput] = useState('');
  const [selectedCollaborator, setSelectedCollaborator] = useState('');

  // Fetch repositories for the current project.
  // Expect each repo to include an "is_collaborator" flag from the backend.
  useEffect(() => {
    const fetchRepositories = async () => {
      try {
        const response = await axios.get(
          `http://localhost:5000/repositories/${currentProject.id}/${user.id}`,
          { withCredentials: true }
        );
        const mappedRepositories = response.data.map((repo) => ({
          id: repo.repo_id,
          name: repo.repo_name,
          isCollaborator: repo.is_collaborator, // Provided by backend
          owner: repo.owner_id, // Ensure your backend returns the repo owner
        }));
        setRepositories(mappedRepositories);

        // For the first repository, fetch collaborators only if the user has access.
        if (mappedRepositories.length > 0) {
          if (mappedRepositories[0].isCollaborator) {
            fetchCollaborators(mappedRepositories[0].id);
          } else {
            setCollaborators([]);
          }
        }
      } catch (error) {
        console.error('Error fetching repositories:', error);
      }
    };
    fetchRepositories();
  }, [currentProject.id, user.id]);

  // Fetch collaborators for the active repository
  const fetchCollaborators = async (repoId) => {
    try {
      const response = await axios.get(
        `http://localhost:5000/collaborators/${repoId}`,
        { withCredentials: true }
      );
      setCollaborators(response.data);
    } catch (error) {
      console.error('Error fetching collaborators:', error);
    }
  };

  // Handle tab (repository) change.
  // If the selected repository is accessible (i.e. isCollaborator === true), fetch its collaborators.
  const handleTabChange = (index) => {
    setActiveTab(index);
    const selectedRepo = repositories[index];
    if (selectedRepo && selectedRepo.isCollaborator) {
      fetchCollaborators(selectedRepo.id);
    } else {
      setCollaborators([]);
    }
  };

  const openUserReport = (user) => {
    setSelectedUser(user);
    setUserReport(true);
  };

  const closeUserReport = () => setUserReport(false);

  // Group collaborators by workload
  const available = collaborators.filter((c) => c.total_workload < 20);
  const moderate = collaborators.filter((c) => c.total_workload >= 20 && c.total_workload < 35);
  const occupied = collaborators.filter((c) => c.total_workload >= 35);




  return (
    <div className="team-board">
      {/* Header area: Tabs and Manage Collaborators button */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Tabs
          repositories={repositories}
          activeTab={activeTab}
          onTabChange={handleTabChange}
          isRepoPage={false}
        />
     
      </Box>

      {/* Conditionally render collaborator groups or a "No Access" board */}
      {repositories[activeTab] && repositories[activeTab].isCollaborator ? (
        <div className="groups">
          {/* Available Contributors */}
          <div className="group">
            <h2 className="group-title available">Available</h2>
            <div className="collaborator-row">
              {available.length > 0 ? (
                available.map((collaborator) => (
                  <CollaboratorCard
                    key={collaborator.id}
                    collaborator={collaborator}
                    status="available"
                    openUserReport={openUserReport}
                  />
                ))
              ) : (
                <p className="empty-row">No available collaborators.</p>
              )}
            </div>
          </div>

          {/* Moderately Busy Contributors */}
          <div className="group">
            <h2 className="group-title moderate">Moderately Busy</h2>
            <div className="collaborator-row">
              {moderate.length > 0 ? (
                moderate.map((collaborator) => (
                  <CollaboratorCard
                    key={collaborator.id}
                    collaborator={collaborator}
                    status="moderate"
                    openUserReport={openUserReport}
                  />
                ))
              ) : (
                <p className="empty-row">No moderately busy collaborators.</p>
              )}
            </div>
          </div>

          {/* Fully Occupied Contributors */}
          <div className="group">
            <h2 className="group-title occupied">Fully Occupied</h2>
            <div className="collaborator-row">
              {occupied.length > 0 ? (
                occupied.map((collaborator) => (
                  <CollaboratorCard
                    key={collaborator.id}
                    collaborator={collaborator}
                    status="occupied"
                    openUserReport={openUserReport}
                  />
                ))
              ) : (
                <p className="empty-row">No fully occupied collaborators.</p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="no-access">
          <h2>No Access</h2>
          <p>You are not a collaborator on this repository.</p>
        </div>
      )}

      {userReport && (
        <UserReport user={selectedUser} isOpen={userReport} onClose={closeUserReport} />
      )}

      {/* Manage Collaborators Dialog */}

    </div>
  );
};

export default TeamBoard;
