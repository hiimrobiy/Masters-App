import axios from 'axios';

const BASE_URL = 'http://localhost:5000';

export const fetchRepositoriesAndIssues = async (accessToken) => {
  return axios.get(`${BASE_URL}/api/fetch-repositories-and-issues/${accessToken}`,{ withCredentials: true });
};

export const fetchRepositories = async (project_id,user_id) => {
  return axios.get(`${BASE_URL}/repositories/${project_id}/${user_id}`,{withCredentials: true});
};

export const createRepository = async (repoName,project_id,owner_id,accessToken) => {
  return axios.post(`${BASE_URL}/api/create-repository/${project_id}`, { repoName,owner_id,accessToken }, { withCredentials: true });
};
export const addExistingRepository = async (repositoryUrl,projectId,userId,accessToken,login) => {
  return axios.post(`${BASE_URL}/api/add-existing-repository/`, { repositoryUrl,projectId,userId,accessToken,login }, { withCredentials: true });
};

export const fetchCollaborators = async (repositoryId) => {
  return axios.get(`${BASE_URL}/collaborators/${repositoryId}/`, { withCredentials: true });
};


export const createIssue = async (issueData,project_id) => {
  return axios.post(`${BASE_URL}/issue/addIssue/${project_id}`, issueData, { withCredentials: true });
};



export const fetchLabels = async () => {
  return axios.get(`${BASE_URL}/repositories/labels/`, { withCredentials: true });
};

export const createLabel = async (labelName) => {
  return axios.post(`${BASE_URL}/repositories/labels/`, { name: labelName }, { withCredentials: true });
};
export const fetchEdges = async(repositoryId) =>{
  return axios.get(`${BASE_URL}/edges/${repositoryId}/`,{withCredentials: true});

} ;
export const updateEdges = async (node_id,updatedPosition)=>{
  return axios.patch(`${BASE_URL}/tasks/${node_id}/`, { position: updatedPosition }, {withCredentials: true });
} 
export const deleteEdges = async (edgeToDeleteId,) =>{
  return axios.delete(`${BASE_URL}/edges/deleteEdge/${edgeToDeleteId}/`, { withCredentials: true });
}

