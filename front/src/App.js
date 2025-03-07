import React, { useEffect, useState } from 'react';

import './index.css';
import {
  ReactFlowProvider
} from '@xyflow/react';
import SideNav from './SideNav';
import TeamBoard from './teamBoard/src/TeamBoard'; // Contributors component
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import Sprints from './sprints/src/Sprints';
import StoriesPage from './stories/src/StoriesPage';
import Repositories from './repositories/src/Repositories';
import Login from './Login';
import ProtectedRoute from './ProtectedRoute';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import UserDashBoard from './dashboard/src/UserDashBoard.js';
import Logout from './Logout.js';
import RiskHeatMap from './RiskMap.js';
import ProfileCreationForm from './ProfileCreationForm.js';
import ProjectCreationPage from './ProfileCreationForm.js';
import ProjectProvider from './ProjectProvider.js';

const Layout = ({ user, children }) => {
  const location = useLocation();
  const showSideNavAndToast = user && location.pathname !== '/';

  return (
    <div className='react-app'>
      {showSideNavAndToast && (
        <>
          <SideNav />
          <ToastContainer />
        </>
      )}
      {children}
    </div>
  );
};



const App = ({user}) => {
  
  return (
    <Router>
      <ProjectProvider>
      <ReactFlowProvider>
      <Layout user={user}>
     
          <Routes>
          <Route path="/login" element={<Login />} />
          <Route
              path="/"
              element={
                <ProtectedRoute user={user}>
                <ProjectCreationPage user={user}/>
                </ProtectedRoute>

              }
            />
            <Route
              path="/home"
              element={
                <ProtectedRoute user={user}>
                  <Repositories user={user} 
                />
                </ProtectedRoute>
              }
            />
            <Route
              path="/team-board"
              element={
                <ProtectedRoute user={user}>
                <TeamBoard user={user} />
                
                </ProtectedRoute>
              }
            />
             <Route
              path="/sprints"
              element={
                <ProtectedRoute user={user}>
                <Sprints user={user}
                />
                </ProtectedRoute>
              }
            />
            <Route
              path="/stories"
              element={
                <ProtectedRoute user={user}>
                <StoriesPage  />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute user={user}>
                <UserDashBoard user={user}/>
                </ProtectedRoute>

              }
            />
              <Route
              path="/logout"
              element={
                <ProtectedRoute user={user}>
                <Logout user={user}/>
                </ProtectedRoute>

              }
            />
              <Route
              path="/risk"
              element={
                <ProtectedRoute user={user}>
                <RiskHeatMap user={user}/>
                </ProtectedRoute>

              }
            />
           
            
          </Routes>
          </Layout>
      </ReactFlowProvider>
      </ProjectProvider>
    </Router>
  );
};

export default App;