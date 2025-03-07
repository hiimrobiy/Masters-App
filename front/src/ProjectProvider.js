import React, { createContext, useContext, useState } from 'react';

// Create a Context with initial value as null
const ProjectContext = createContext();

export const useProject = () => {
  return useContext(ProjectContext);
};

const ProjectProvider = ({ children }) => {
  const [currentProject, setCurrentProject] = useState(() => {
    const savedProject = localStorage.getItem('currentProject');
    return savedProject ? JSON.parse(savedProject) : null;
  });

  return (
    <ProjectContext.Provider value={{ currentProject, setCurrentProject }}>
      {children}
    </ProjectContext.Provider>
  );
};
export default ProjectProvider;
