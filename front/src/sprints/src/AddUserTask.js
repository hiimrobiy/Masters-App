import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardActionArea,
  Dialog,
  DialogTitle,
  DialogContent,
  Button,
  DialogActions,
  TextField
} from '@mui/material';
import TaskIcon from '@mui/icons-material/Task';
import DateRangeIcon from '@mui/icons-material/DateRange';
import TaskWizard from './TaskWizard';
import axios from 'axios';

const AddUserTask = ({ sprint, refresh, user }) => {
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [dateDialogOpen, setDateDialogOpen] = useState(false);
  const [newStartDate, setNewStartDate] = useState('');
  const [newEndDate, setNewEndDate] = useState('');

  // Function to format dates correctly (ensures YYYY-MM-DD format)
  const formatDate = (dateString) => {
    if (!dateString) return ''; // Avoid null/undefined values
    const date = new Date(dateString);
    return date.toISOString().split('T')[0]; // Convert to YYYY-MM-DD format
  };

  // Ensure the values are set when sprint data is available
  useEffect(() => {
    if (sprint) {
      setNewStartDate(formatDate(sprint.start_date));
      setNewEndDate(formatDate(sprint.end_date));
    }
  }, [sprint]);

  // Reset values when opening the date dialog
  const handleOpenDateDialog = () => {
    setNewStartDate(formatDate(sprint.start_date));
    setNewEndDate(formatDate(sprint.end_date));
    setDateDialogOpen(true);
  };

  // Handle sprint date update
  const handleDateChange = async () => {
    try {
      await axios.post(`http://localhost:5000/sprints/updateSprintDates/${sprint.sprint_id}`, {
        new_start_date: newStartDate,
        new_end_date: newEndDate
      }, { withCredentials: true });

      refresh(sprint.sprint_id);
      setDateDialogOpen(false);
    } catch (error) {
      console.error('Error updating sprint dates:', error);
    }
  };

  return (
    <Box sx={{ flexGrow: 1, padding: 4 }}>
      <Grid container spacing={4} justifyContent="center" alignItems="center">
        {/* Add Task Card */}
        <Grid item xs={12} sm={6} md={3}>
          <Card variant="outlined" sx={{ borderRadius: 2, marginY: 2 }}>
            <CardActionArea sx={{ textAlign: 'center', padding: 4 }} onClick={() => setTaskDialogOpen(true)}>
              <TaskIcon sx={{ fontSize: 60, color: 'primary.main' }} />
              <Typography variant="h6" sx={{ marginTop: 2 }}>
                Add Task
              </Typography>
            </CardActionArea>
          </Card>
        </Grid>

        {/* Change Sprint Dates Card */}
        <Grid item xs={12} sm={6} md={3}>
          <Card variant="outlined" sx={{ borderRadius: 2, marginY: 2 }}>
            <CardActionArea sx={{ textAlign: 'center', padding: 4 }} onClick={handleOpenDateDialog}>
              <DateRangeIcon sx={{ fontSize: 60, color: 'primary.main' }} />
              <Typography variant="h6" sx={{ marginTop: 2 }}>
                Change Sprint Dates
              </Typography>
            </CardActionArea> 
          </Card>
        </Grid>
      </Grid>

      {/* Task Selection Dialog */}
      <Dialog open={taskDialogOpen} onClose={() => setTaskDialogOpen(false)}>
        <DialogTitle>Select a Task</DialogTitle>
        <DialogContent>
          <TaskWizard sprint={sprint} onClose={() => setTaskDialogOpen(false)} user={user} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTaskDialogOpen(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>

      {/* Change Sprint Dates Dialog */}
      <Dialog
        open={dateDialogOpen}
        onClose={() => setDateDialogOpen(false)}
        PaperProps={{ sx: { width: '320px', maxWidth: '90%' } }} // Thinner dialog
      >
        <DialogTitle sx={{ mb: 3 }}>Change Sprint Dates</DialogTitle>
        <DialogContent>
          <TextField
            label="Start Date"
            type="date"
            value={newStartDate}
            onChange={(e) => setNewStartDate(e.target.value)}
            fullWidth
            variant="outlined"
            InputLabelProps={{ shrink: true }}
            sx={{ mb: 2 }}
          />
          <TextField
            label="End Date"
            type="date"
            value={newEndDate}
            onChange={(e) => setNewEndDate(e.target.value)}
            fullWidth
            variant="outlined"
            InputLabelProps={{ shrink: true }}
            sx={{ mb: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDateDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDateChange} color="primary">Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AddUserTask;
