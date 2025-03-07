import React, { useEffect, useState } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Grid, Card, CardContent, Typography, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Tooltip, Menu, MenuItem, createTheme, ThemeProvider } from '@mui/material';
import axios from 'axios';
import { useProject } from './ProjectProvider';
import './Risk.css'

const ItemTypes = {
  RISK: 'risk',
};
const sections = [
  { name: 'HighProbabilityLowRisk', title: 'High Prob / Low Risk', bgColor: '#E8F5E9' },
  { name: 'HighProbabilityHighRisk', title: 'High Prob / High Risk', bgColor: '#FFEBEE' },
  { name: 'LowProbabilityLowRisk', title: 'Low Prob / Low Risk', bgColor: '#E0F7FA' },
  { name: 'LowProbabilityHighRisk', title: 'Low Prob / High Risk', bgColor: '#FFF3E0' },
];


const theme = createTheme({
  palette: {
    primary: { main: '#5A5AFF' },
    secondary: { main: '#5AFF5A' },
  },
  typography: {
    fontFamily: 'Roboto, sans-serif',
    h6: { fontSize: '1.2rem', fontWeight: 600 },
    body1: { fontSize: '1rem', fontWeight: 500 },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
        },
      },
    },
  },
});

const sectionColors = {
  HighProbabilityHighRisk: '#FFEBEE',
  LowProbabilityHighRisk: '#FFF3E0',
  HighProbabilityLowRisk: '#E8F5E9',
  LowProbabilityLowRisk: '#E0F7FA',
};

const riskColors = {
  HighProbabilityHighRisk: '#D32F2F',
  LowProbabilityHighRisk: '#F57C00',
  HighProbabilityLowRisk: '#388E3C',
  LowProbabilityLowRisk: '#0288D1',
};

const Risk = ({ risk, onRightClick }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.RISK,
    item: { risk_id: risk.risk_id },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  const backgroundColor = riskColors[risk.risk_section];

  return (
    <Tooltip title={risk.risk_description || 'No description available'} arrow>
      <Card
        ref={drag}
        onContextMenu={(e) => onRightClick(e, risk)}
        sx={{
          opacity: isDragging ? 0.5 : 1,
          backgroundColor: backgroundColor,
          cursor: 'move',
          margin: 1,
          color: 'white',
        }}
      >
        <CardContent>
          <Typography variant="body1" align="center">
            {risk.risk_text}
          </Typography>
        </CardContent>
      </Card>
    </Tooltip>
  );
};

const SectionDropZone = ({ title, bgColor, sectionName, risks, moveRisk, onRightClick }) => {
  const [, drop] = useDrop(() => ({
    accept: ItemTypes.RISK,
    drop: (item) => moveRisk(item.risk_id, sectionName),
  }));

  return (
    <Grid
      ref={drop}
      item
      xs={6}
      sx={{
        backgroundColor: bgColor,
        padding: 2,
        border: '1px solid #e0e0e0',
        borderRadius: '12px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
        height: '50%',
      }}
    >
      <Typography variant="h6" sx={{ marginBottom: 2 }}>
        {title}
      </Typography>
      <Box
      className="risk-container"
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 2,
          padding: 1,
          height: '100%',
          overflow: 'auto',
        }}
      >
        {risks.map((risk) => (
          <Risk key={risk.risk_id} risk={risk} onRightClick={onRightClick} />
        ))}
      </Box>
    </Grid>
  );
};

const AddRiskDialog = ({ open, onClose, onAddRisk }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [section, setSection] = useState('');

  const handleSubmit = () => {
    if (title.trim()) {
      onAddRisk({ title, description,section });
      setTitle('');
      setDescription('');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} sx={{
      width:'60%',
      margin: 'auto',
    }}>
      <DialogTitle>Add New Risk</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="Risk Title"
          fullWidth
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <TextField
          margin="dense"
          label="Risk Description"
          fullWidth
          multiline
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
         <TextField
            select
            label="Section"
            value={section}
            onChange={(e) => setSection(e.target.value )}
            fullWidth
            margin="normal"
          >
            {sections.map((section) => (
              <MenuItem key={section.name} value={section.name}>
                {section.title}
              </MenuItem>
            ))}
          </TextField> 
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={() => { handleSubmit(); onClose(); }}>Add</Button>
      </DialogActions>
    </Dialog>
  );
};

const RiskHeatMap = () => {
  const [risks, setRisks] = useState([]);
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [selectedRisk, setSelectedRisk] = useState(null);
  const {currentProject}   = useProject();
  useEffect(() => {
    // Fetch risks from the API
    const fetchRisks = async () => {
      try {
        const response = await axios.get(`http://localhost:5000/risk/getRisks/${currentProject.id}`,{withCredentials:true});
        setRisks(response.data);
      } catch (error) {
        console.error('Error fetching risks:', error);
      }
    };

    fetchRisks();
  }, []);

  const moveRisk = async (risk_id, sectionName) => {
    try {
      const response = await axios.put(`http://localhost:5000/risk/updateSection/${risk_id}`, { risk_section: sectionName });
      setRisks((prevRisks) =>
        prevRisks.map((risk) =>
          risk.risk_id === risk_id ? { ...risk, risk_section: sectionName} : risk
        )
      );
    } catch (error) {
      console.error('Error updating risk section:', error);
    }
  };


  const addRisk = async (newRisk) => {
    try {
      // Replace with dynamic project ID as needed
      const response = await axios.post(`http://localhost:5000/risk/addRisk/${currentProject.id}`, {
        risk_text: newRisk.title,
        risk_description: newRisk.description,
        risk_section: 'LowProbabilityLowRisk'
      });
      setRisks([...risks,{
        risk_id : response.data.risk_id,
        risk_text: newRisk.title,
        risk_description: newRisk.description,
        risk_section: newRisk.section
      }]);
    } catch (error) {
      console.error('Error adding risk:', error);
    }
  };


  const handleRightClick = (event, risk) => {
    event.preventDefault();
    setMenuAnchor(event.currentTarget);
    setSelectedRisk(risk);
  };

  const handleCloseMenu = () => {
    setMenuAnchor(null);
    setSelectedRisk(null);
  };

  const deleteRisk = async () => {
    try {
      const response = await axios.delete(`http://localhost:5000/risk/deleteRisk/${selectedRisk.risk_id}`);
      setRisks(risks.filter(risk => risk.risk_id !== selectedRisk.risk_id));
    } catch (error) {
      console.error('Error deleting risk:', error);
    }
    handleCloseMenu();
  };


 
  return (
   
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <ThemeProvider theme={theme}>
        <DndProvider backend={HTML5Backend}>
          <Box sx={{ width: '70%', height: '80vh', margin: 'auto', padding: 3 }}>
            <Button variant="contained" size ='large' onClick={() => setDialogOpen(true)}>Add Risk</Button>
            <Grid container spacing={2} sx={{ height: '100%', width: '100%' }}>
              {sections.map((section) => (
                <SectionDropZone
                  key={section.name}
                  title={section.title}
                  bgColor={section.bgColor}
                  sectionName={section.name}
                  risks={risks.filter((risk) => risk.risk_section === section.name)}
                  moveRisk={moveRisk}
                  onRightClick={handleRightClick}
                />
              ))}
            </Grid>
          </Box>
          <AddRiskDialog open={isDialogOpen} onClose={() => setDialogOpen(false)} onAddRisk={addRisk} />
          <Menu
            anchorEl={menuAnchor}
            open={Boolean(menuAnchor)}
            onClose={handleCloseMenu}
          >
            <MenuItem onClick={deleteRisk}>Delete</MenuItem>
          </Menu>
        </DndProvider>
      </ThemeProvider>
    </Box>
  );

  
};

export default RiskHeatMap;
