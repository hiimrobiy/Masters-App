// IssueCard.js

import React from 'react';
import { FaClock, FaUser } from 'react-icons/fa';
import './IssueCard.css'; // Import CSS styles

const IssueCard = ({ issue }) => {
  const { issue_title, expected_time, assigned_users } = issue;

  return (
    <div className="issue-card">
      <div className="issue-card-header">
        <h4 className="issue-title">{issue_title}</h4>
      </div>
      <div className="issue-card-body">
        {/* Assigned Users */}
        {assigned_users && assigned_users.length > 0 && (
          <div className="assigned-users">
            {assigned_users.map((user) => (
              <img
                key={user.user_id}
                src={user.profile_picture || '/default-avatar.png'}
                alt={user.name}
                title={user.name}
                className="user-avatar"
              />
            ))}
          </div>
        )}
        {/* Expected Time */}
        {expected_time && (
          <div className="expected-time">
            <FaClock className="time-icon" />
            <span>{expected_time}h</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default IssueCard;
