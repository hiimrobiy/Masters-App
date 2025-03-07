// UserNode.js

import React from 'react';
import { Handle } from 'react-flow-renderer';
import './UserNode.css';

const UserNode = ({ data }) => {
  return (
    <div className="user-node">
      <Handle type="target" position="top" />
      <div className="user-node-content">
        <p className="user-name">{data.user.name}</p>
      </div>
      <Handle type="source" position="bottom" />
    </div>
  );
};

export default UserNode;
