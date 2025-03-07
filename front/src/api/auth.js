import axios from 'axios';

const BASE_URL = 'http://localhost:5000';

export const loginWithGitHub = () => {
  window.location.href = `${BASE_URL}/auth/github`; // Redirect to GitHub login
};

export const fetchCurrentUser = () => {
  return axios.get(`${BASE_URL}/auth/user`, { withCredentials: true });
};

export const logout = () => {
  return axios.post(`${BASE_URL}/auth/logout`, {}, { withCredentials: true });
};
