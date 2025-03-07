import React, { useEffect, useState } from 'react';
import { Box, Button, Typography, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Card, CardContent, CardActions, Grid } from '@mui/material';
import { useProject } from './ProjectProvider';
import { useNavigate } from 'react-router-dom';
import AddIcon from '@mui/icons-material/Add';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import axios from 'axios';
const API_URL = 'http://localhost:5000';

const ProjectCreationPage = ({user}) => {
  const [openDialog, setOpenDialog] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [recentProjects, setRecentProjects] = useState([]);
  const { setCurrentProject } = useProject();
  const [update , setUpdate] = useState(false);
  const navigate = useNavigate();

 useEffect(() => {
  async function fetchData() {
    const projectResult = await axios.get("http://localhost:5000/project/getProject",{withCredentials:true});
    setRecentProjects(projectResult.data.rows);
  }
  fetchData();
 },[update])

  const handleOpenDialog = () => setOpenDialog(true);
  const handleCloseDialog = () => setOpenDialog(false);

  const handleCreateProject =async () => {
    console.log('New Project Created:', projectName, projectDescription);
    const response = await axios.post("http://localhost:5000/project/addProject",{project_name:projectName},{withCredentials:true},);
    setOpenDialog(false);
    setProjectName('');
    setUpdate(!update);
    // Add logic to save or create the project
  };

  const handleOpenRecentProject = async(project) =>   {
    console.log('Opening Project:', project.name);
    setCurrentProject(project);
    localStorage.setItem('currentProject', JSON.stringify(project));
    await axios.get(`${API_URL}/api/fetch-repositories-and-issues/${user.accessToken}/${user.id}/${project.id}`,{ withCredentials: true });
    navigate('/home');
  };

  return (
    <Box sx={{ padding: 4, maxWidth: 900, margin: 'auto', textAlign: 'center' }}>
      <Typography variant="h4" sx={{ marginBottom: 3 }}>Project Management</Typography>

      <Button
        variant="contained"
        startIcon={<AddIcon />}
        color="primary"
        onClick={handleOpenDialog}
        sx={{ marginBottom: 5 }}
      >
        New Project
      </Button>

      <Grid container spacing={3} justifyContent="center">
        {recentProjects.map((project) => (
          <Grid item xs={12} sm={6} md={4} key={project.id}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>{project.project_name}</Typography>
              </CardContent>
              <CardActions>
                <Button
                  size="small"
                  startIcon={<FolderOpenIcon />}
                  onClick={() => handleOpenRecentProject(project)}
                >
                  Open
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Dialog open={openDialog} onClose={handleCloseDialog} fullWidth maxWidth="sm">
        <DialogTitle>Create New Project</DialogTitle>
        <DialogContent sx={{ padding: 3 }}>
          <TextField
            autoFocus
            margin="dense"
            label="Project Name"
            type="text"
            fullWidth
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            sx={{ marginBottom: 2 }}
          />
         
        </DialogContent>
        <DialogActions sx={{ padding: '16px 24px' }}>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleCreateProject} variant="contained" color="primary">Create</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProjectCreationPage;
