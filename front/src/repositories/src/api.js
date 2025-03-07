import axios from 'axios';

const API_URL = 'http://localhost:5000/'; // Change the URL if your backend is hosted elsewhere

export const api = axios.create({
  baseURL: API_URL,
});
