import React from 'react';
import './../css/CollaboratorCard.css';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';

const CollaboratorCard = ({ collaborator, status,openUserReport }) => {
  const { name, profile_picture, total_workload, projects_involved, issues_assigned } = collaborator;

  // Map status to icons and labels
  const statusInfo = {
    available: {
      icon: <CheckCircleIcon style={{ color: 'green' }} />,
      label: 'Available',
    },
    moderate: {
      icon: <WarningAmberIcon style={{ color: 'orange' }} />,
      label: 'Moderate',
    },
    occupied: {
      icon: <HighlightOffIcon style={{ color: 'red' }} />,
      label: 'Occupied',
    },
  };

  const { icon, label } = statusInfo[status];

  return (
    <div className="collaborator-card" onClick={()=>openUserReport(collaborator)}>
      <img src={profile_picture} alt={`${name}'s profile`} className="profile-picture" />
      <div className="collaborator-info">
        <h3 className="collaborator-name">{name}</h3>
        <div className="status-info">
          {icon}
          <span className="status-label">{label}</span>
        </div>
        <p className="collaborator-stat">Workload: {total_workload} hrs/week</p>
        <p className="collaborator-stat">Projects: {projects_involved}</p>
        <p className="collaborator-stat">Issues Assigned: {issues_assigned}</p>
      </div>
    </div>
  );
};

export default CollaboratorCard;
