import React, { useEffect, useState } from 'react';
import {
  Box,
  Avatar,
  Typography,
  Link,
  Card,
  CardContent,
  CardActionArea,
  Grid,
  Paper,
  Divider,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  useTheme
} from '@mui/material';

import { GitHub, Notifications, FolderOpen } from '@mui/icons-material';
import CloseIcon from "@mui/icons-material/Close";

import { Gantt, ViewMode } from "gantt-task-react";
import "gantt-task-react/dist/index.css";

import axios from 'axios';
import PlanningPoker from "../../stories/src/PlanningPoker.js";
import UserDashCalendar from './UserDashCalendar.js';
import { useProject } from '../../ProjectProvider.js';

const calculateProgress = (start, end) => {
  const today = new Date();
  if (today < start) return 0;
  if (today > end) return 100;
  const totalDuration = end - start;
  const elapsed = today - start;
  return Math.min(Math.max((elapsed / totalDuration) * 100, 0), 100);
};

const UserDashboard = ({ user }) => {
  const theme = useTheme();
  const [notifications, setNotifications] = useState([]);
  const [showAll, setShowAll] = useState(false);
  const [dialog, setDialog] = useState(false);
  const [activeIssues, setActiveIssues] = useState([]);
  const [currentNotifiData, setCurrentNotifiData] = useState({});
  const [repositories, setRepositories] = useState([]);
  const { currentProject } = useProject();
  const [ganttData, setGanttData] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [lockedFilter, setLockedFilter] = useState('all'); // New state for lock filtering
  const [updateNotifications, setUpdateNotifications] = useState(false);

  // Toggle for the Dialog
  const openDialog = () => setDialog(true);
  const closeDialog = () => setDialog(false);

  // Fetch notifications on mount
  useEffect(() => {
    if (user) {
      async function getNotifications(userId) {
        try {
          const response = await axios.get(`http://localhost:5000/notifications/${userId}`, {
            withCredentials: true,
          });
          // Assuming each notification may include a `locked` property
          const read_notifications = response.data.filter(notification => notification.is_read);
          const unread_notifications = response.data.filter(notification => !notification.is_read);
          setNotifications(unread_notifications.concat(read_notifications));
        } catch (error) {
          console.log(error);
        }
      }
      getNotifications(user.id);
    }
  }, [user,updateNotifications]);

  // Fetch active issues for Gantt
  useEffect(() => {
    if (user) {
      async function getActiveIssues(userId) {
        try {
          const response = await axios.get(
            `http://localhost:5000/sprints/activeIssues/${userId}/`,
            { withCredentials: true }
          );
          // Transform data into Gantt-compatible format
          const ganttData = [];

          response.data.forEach((issue) => {
            if (issue.start_date && issue.end_date) {
              const start = new Date(issue.start_date);
              const end = new Date(issue.end_date);
              if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
                const progress = calculateProgress(start, end);
                const overdue = end < new Date() && progress < 100;
                ganttData.push({
                  id: `issue-${issue.issue_id}`,
                  name: issue.title,
                  start,
                  end,
                  type: "task",
                  issue_url: issue.url,
                  progress: Math.round(progress),
                  styles: {
                    barColor: overdue ? '#ef5350' : '#26c6da', 
                    progressColor: '#26c6da',
                    progressDoneColor: '#43a047',
                  }
                });
              }
            }
          });
          const result = response.data.map((data) => {
            return {
              issue_id: data.issue_id,
              task_title: data.task_title,
              sprint_name: data.sprint_name,
              issue_title: data.title,
              issue_url: data.issue_url,
              locked: data.locked // Include locked property if available
            }
          });
          
          setActiveIssues([...result]);
          setGanttData([...ganttData]);
        } catch (error) {
          console.log(error);
        }
      }
      getActiveIssues(user.id);
    }
  }, [user]);

  // Filter notifications based on search query and locked filter
  const filteredNotifications = notifications.filter((notif) => {
    const matchesSearch = notif.message.toLowerCase().includes(searchQuery.toLowerCase());
    let matchesLock = true;
    if (lockedFilter === 'locked') {
      matchesLock = notif.locked;
    } else if (lockedFilter === 'unlocked') {
      matchesLock = !notif.locked;
    }
    return matchesSearch && matchesLock;
  });

  // If a search is active, show all filtered notifications; otherwise, respect the showAll toggle
  const notificationsToShow = searchQuery
    ? filteredNotifications
    : (showAll ? filteredNotifications : filteredNotifications.slice(0, 3));

  return (
    <>
      <Box
        sx={{
          minHeight: '100vh',
          background: `linear-gradient(135deg, ${theme.palette.grey[100]} 25%, #e0f7fa 100%)`,
          pb: 5,
          pt: 3
        }}
      >
        {/* User Profile Section */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            mb: 4,
            p: 3,
            background: 'white',
            borderRadius: 3,
            boxShadow: 3,
            mx: 'auto',
            width: '95%',
            maxWidth: '1200px',
            cursor: 'pointer', // Add cursor pointer to indicate clickable area
          }}
          onClick={() => window.open(user.html_url, '_blank')} // Open GitHub profile in a new tab
        >
          <Avatar
            src={user.avatar_url}
            alt={user.username}
            sx={{
              width: 90,
              height: 90,
              mr: 3,
              border: `3px solid #80deea`,
            }}
          />
          <Box>
            <Typography variant="h5" fontWeight="bold">
              {user.username}
            </Typography>
            <Link
              href={user.html_url}
              target="_blank"
              rel="noopener"
              underline="hover"
            >
              <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <GitHub fontSize="small" />
                GitHub Profile
              </Typography>
            </Link>
          </Box>
        </Box>

        {/* Main Content */}
        <Box
          sx={{
            width: '95%',
            maxWidth: '1200px',
            mx: 'auto',
          }}
        >
          <Grid container spacing={3}>
            {/* Repositories Column */}
            <Grid item xs={12} md={6}>
              <Paper
                sx={{
                  p: 3,
                  boxShadow: 3,
                  borderRadius: 3,
                  backgroundColor: '#ffffff',
                  maxHeight: 400,
                  overflowY: 'auto'
                }}
              >
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                  <FolderOpen
                    sx={{ mr: 1, verticalAlign: 'middle', color: '#26c6da' }}
                  />
                  Your Issues
                </Typography>
                <Divider sx={{ mb: 2 }} />
                {activeIssues.map((issue, index) => (
                  <Card
                    variant="outlined"
                    sx={{
                      mb: 2,
                      borderRadius: 2,
                      boxShadow: 1,
                      transition: 'transform 0.2s ease-in-out',
                      '&:hover': {
                        transform: 'translateY(-3px)',
                      },
                    }}
                    key={index}
                  >
                    <CardActionArea
                      component="a"
                      href={issue.issue_url}
                      target="_blank"
                      sx={{ borderRadius: 2 }}
                    >
                      <CardContent>
                        <Typography variant="subtitle1" fontWeight="bold">
                          {issue.issue_title}
                        </Typography>
                        <Typography variant="body2" fontWeight="text.secondary">
                          Task: {issue.task_title} &nbsp;&nbsp;&nbsp;&nbsp; Sprint: {issue.sprint_name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          View on GitHub
                        </Typography>
                      </CardContent>
                    </CardActionArea>
                  </Card>
                ))}
              </Paper>
            </Grid>

            {/* Notifications Column */}
            <Grid item xs={12} md={6}>
              <Paper
                sx={{
                  p: 3,
                  boxShadow: 3,
                  borderRadius: 3,
                  backgroundColor: '#ffffff',
                  maxHeight: 400,
                }}
              >
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                  <Notifications
                    sx={{ mr: 1, verticalAlign: 'middle', color: '#26c6da' }}
                  />
                  Notifications
                </Typography>
                <Divider sx={{ mb: 2 }} />
                {/* Search bar for notifications */}
                <TextField
                  variant="outlined"
                  size="small"
                  fullWidth
                  placeholder="Search notifications..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  sx={{ mb: 2 }}
                />
                {/* Locked Filter Select */}
                <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                  <InputLabel id="locked-filter-label">Filter by Lock Status</InputLabel>
                  <Select
                    labelId="locked-filter-label"
                    value={lockedFilter}
                    label="Filter by Lock Status"
                    onChange={(e) => setLockedFilter(e.target.value)}
                  >
                    <MenuItem value="all">All</MenuItem>
                    <MenuItem value="locked">Locked</MenuItem>
                    <MenuItem value="unlocked">Unlocked</MenuItem>
                  </Select>
                </FormControl>
                <List sx={{ height: 150, maxHeight:250, overflowY: 'auto' }}>
                  {notificationsToShow.map((notif, idx) => (
                    <ListItem
                      key={idx}
                      sx={{
                        alignItems: 'flex-start',
                        cursor: 'pointer',
                        borderRadius: 2,
                        mb: 1,
                        transition: 'background-color 0.2s ease-in-out',
                        '&:hover': {
                          backgroundColor: '#e0f7fa',
                        },
                      }}
                      onClick={() => {
                        setCurrentNotifiData({ ...notif });
                        openDialog();
                        notifications[idx].is_read = true;
                      }}
                    >
                      <ListItemAvatar>
                        <Avatar sx={{ backgroundColor: '#80deea' }}>
                          <Notifications />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Typography variant="subtitle2" sx={{ fontWeight: notif.is_read ? 'normal' : 'bold' }}>
                            {notif.message}
                          </Typography>
                        }
                        secondary={
                          <Typography variant="caption" color="text.secondary">
                            {notif.repo} • {notif.time}
                          </Typography>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
                {/* Show All / Show Less toggle button (only when no search query is active) */}
                {!searchQuery && filteredNotifications.length > 3 && (
                  <Box sx={{ textAlign: 'center', mt: 2 }}>
                    <Button onClick={() => setShowAll(!showAll)}>
                      {showAll ? 'Show Less' : 'Show All'}
                    </Button>
                  </Box>
                )}
              </Paper>
            </Grid>

            {activeIssues && activeIssues.length > 0 && (
              <Grid item xs={12}>
                <Paper
                  sx={{
                    p: 3,
                    boxShadow: 3,
                    borderRadius: 3,
                    backgroundColor: '#ffffff',
                  }}
                >
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                    Upcoming Deadlines
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <Box sx={{ height: "max-content" }}>
                    <Gantt
                      tasks={ganttData}
                      viewMode={ViewMode.Day}
                      ganttHeight={350}
                    />
                  </Box>
                </Paper>
              </Grid>
            )}
            <Grid item xs={12}>
              <Paper
                sx={{
                  p: 3,
                  boxShadow: 3,
                  borderRadius: 3,
                  backgroundColor: '#fff',
                }}
              >
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                  Availability Calendar
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <UserDashCalendar userId={user.id} />
              </Paper>
            </Grid>
          </Grid>
        </Box>
      </Box>

      {/* Dialog for Planning Poker */}
      <Dialog
        open={dialog}
        onClose={closeDialog}
        fullWidth
        maxWidth="md"
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: 4,
          },
        }}
      >
        <DialogTitle
          sx={{
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            backgroundColor: '#e0f7fa',
          }}
        >
          Planning Poker
          <IconButton
            aria-label="close"
            onClick={closeDialog}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ pt: 2 }}>
          <PlanningPoker
            closeDialog={closeDialog}
            issueData={currentNotifiData}
            user={user}
            refresh={()=>{setUpdateNotifications(!updateNotifications)}}
          />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default UserDashboard;
