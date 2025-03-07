import React, { useEffect, useState } from 'react';
import {
  Box,
  Avatar,
  Typography,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Divider,
  Paper,
  List,
  ListItem,
  ListItemText,
  Button,
  useTheme,
  Dialog,
  DialogContent,
} from '@mui/material';
import 'chart.js/auto';
import { Bar } from 'react-chartjs-2';
import {
  Assignment,
  Assessment,
  AssignmentTurnedIn,
  Build,
} from '@mui/icons-material';
import axios from 'axios';

// Dummy data to demonstrate
const dummyUser = {
  id: 1,
  name: 'Alice Johnson',
  avatar: 'https://i.pravatar.cc/150?img=47',
  totalTasks: 42,
  avgAccuracy: 88, // Percentage
  tasksCompleted: 38,
  openIssues: 4,
  bugsResolved: 112,
  currentIssues: [
    { issueId: 101, title: 'Refactor Auth Service', repo: 'octo-repo' },
    { issueId: 112, title: 'UI Overhaul', repo: 'my-project' },
  ],
  pastAchievements: [
    {
      task_title: 'Implement Payment Flow',
      expected_time: 10,
      elapsed_time: 12,
      sprint_name: 'Sprint 5',
    },
    {
      task_title: 'Fix Bug #456',
      expected_time: 5,
      elapsed_time: 4,
      sprint_name: 'Sprint 6',
    },
    {
      task_title: 'Feature: Dashboard Analytics',
      expected_time: 8,
      elapsed_time: 9,
      sprint_name: 'Sprint 7',
    },
    {
      task_title: 'Improve CI/CD Pipeline',
      expected_time: 6,
      elapsed_time: 6,
      sprint_name: 'Sprint 8',
    },
  ],
};

const UserReport = ({ user, isOpen, onClose }) => {
  const theme = useTheme();
  const [userData, setUserData] = useState(null);
  const [activeIssues, setActiveIssues] = useState([]);
  const [efficiency, setEfficiency] = useState(0);
  const [totalTasks, setTotalTasks] = useState(0);
  const [tasksCompleted, setTasksCompleted] = useState(0);
  const [openIssues, setOpenIssues] = useState(0);
  const [pastIssues, setPastIssues] = useState([]);

  useEffect(() => {
    setUserData(dummyUser);
  }, []);

  useEffect(() => {
    async function fetchActiveIssuesForUser(userId) {
      try {
        const response = await axios.get(
          `http://localhost:5000/userprofile/info/${userId}`,
          { withCredentials: true }
        );
        // Separate active and past issues based on the issue state.
        const activeIssues = response.data.filter(
          (issue) => issue.state === 'open' 
        );
        const pastIssues = response.data.filter(
          (issue) => issue.state !== 'open' &&  Number(issue.time) > 0 &&
          issue.elapsed_time &&
          Number(issue.elapsed_time) > 0
        );
        // Calculate estimation accuracy (MAPE) per issue.
        const efficiencyValues = pastIssues
          .map(
            (issue) =>
              (Math.abs(Number(issue.elapsed_time) - Number(issue.time)) /
                Number(issue.time)) *
              100
          );
        const averageEfficiency =
          efficiencyValues.length > 0
            ? efficiencyValues.reduce((total, value) => total + value, 0) /
              efficiencyValues.length
            : 0;
        const roundedEfficiency = Math.round(averageEfficiency * 100) / 100;
        const totalTasks = response.data.length;
        const tasksCompleted = response.data.filter(
          (issue) => issue.state === 'closed'
        ).length;
        const openIssues = response.data.filter(
          (issue) => issue.state === 'open'
        ).length;
        setTotalTasks(totalTasks);
        setTasksCompleted(tasksCompleted);
        setOpenIssues(openIssues);
        setEfficiency(roundedEfficiency);
        setActiveIssues(activeIssues);
        setPastIssues(pastIssues);
        console.log('Efficiency:', roundedEfficiency);
      } catch (error) {
        console.error('Error fetching active issues:', error);
      }
    }
    fetchActiveIssuesForUser(user.user_id);
  }, [user.user_id]);

  if (!userData) return <Typography>Loading...</Typography>;

  // Quick Stats (cards)
  const statCards = [
    {
      title: 'Total Tasks',
      value: totalTasks,
      icon: <Assignment />,
      color: '#42a5f5',
    },
    {
      title: 'Estimation Accuracy',
      value: `${efficiency}%`,
      icon: <Assessment />,
      color: '#66bb6a',
    },
    {
      title: 'Tasks Completed',
      value: tasksCompleted,
      icon: <AssignmentTurnedIn />,
      color: '#ffca28',
    },
    {
      title: 'Open Issues',
      value: openIssues,
      icon: <Build />,
      color: '#26c6da',
    },
  ];

  return (
    <Dialog open={isOpen} onClose={onClose} fullWidth maxWidth="xl">
      <DialogContent>
        <Box
          sx={{
            background: `linear-gradient(135deg, ${theme.palette.grey[100]} 25%, #e1f5fe 100%)`,
            minHeight: '100vh',
            py: 3,
          }}
        >
          <Box sx={{ width: '95%', maxWidth: 1300, mx: 'auto' }}>
            {/* Heading: Avatar + Name */}
            <Paper
              sx={{
                display: 'flex',
                alignItems: 'center',
                p: 2,
                borderRadius: 2,
                boxShadow: 3,
                mb: 3,
              }}
            >
              <Avatar
                src={user.profile_picture}
                sx={{
                  width: 80,
                  height: 80,
                  mr: 3,
                  border: `2px solid #64b5f6`,
                }}
              />
              <Box>
                <Typography variant="h5" fontWeight="bold">
                  {user.name}
                </Typography>
               
              </Box>
            </Paper>

            {/* Quick stats row */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              {statCards.map((stat, idx) => (
                <Grid item xs={12} sm={6} md={3} key={idx}>
                  <Card
                    sx={{
                      borderRadius: 2,
                      boxShadow: 2,
                      transition: 'transform 0.2s',
                      ':hover': { transform: 'translateY(-3px)', boxShadow: 4 },
                    }}
                  >
                    <CardContent
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        p: 2,
                      }}
                    >
                      <Box
                        sx={{
                          width: 40,
                          height: 40,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '50%',
                          backgroundColor: stat.color,
                          color: '#fff',
                          mb: 1,
                        }}
                      >
                        {stat.icon}
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        {stat.title}
                      </Typography>
                      <Typography variant="h6" fontWeight="bold">
                        {stat.value}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>

            <Grid container spacing={3}>
              {/* Column 1: Active Issues and Past Achievements */}
              <Grid item xs={12} md={6} display="flex" flexDirection="column">
                {/* Active Issues */}
                <Card
                  sx={{
                    borderRadius: 2,
                    boxShadow: 3,
                    mb: 3,
                  }}
                >
                  <CardHeader
                    title="Active Issues"
                    sx={{
                      backgroundColor: '#e0f2f1',
                      pb: 1,
                    }}
                  />
                  <Divider />
                  <CardContent>
                    {activeIssues.length === 0 ? (
                      <Typography variant="body2">
                        No active issues at the moment.
                      </Typography>
                    ) : (
                      <List sx={{ maxHeight: 200, overflowY: 'auto' }}>
                        {activeIssues.map((issue) => (
                          <ListItem key={issue.issue_id} disablePadding>
                            <ListItemText
                              primary={
                                <Typography variant="subtitle2" fontWeight="bold">
                                  {issue.title}
                                </Typography>
                              }
                              secondary={
                                <Typography variant="caption" color="text.secondary">
                                  Repo: {issue.repo_name}
                                </Typography>
                              }
                            />
                          </ListItem>
                        ))}
                      </List>
                    )}
                  </CardContent>
                </Card>

                {/* Past Achievements */}
                <Card
                  sx={{
                    borderRadius: 2,
                    boxShadow: 3,
                    flexGrow: 2,
                  }}
                >
                  <CardHeader
                    title="Past Achievements"
                    sx={{
                      backgroundColor: '#ffecb3',
                      pb: 1,
                    }}
                  />
                  <Divider />
                  <CardContent>
                    {pastIssues.length === 0 ? (
                      <Typography variant="body2">
                        No achievements found.
                      </Typography>
                    ) : (
                      <List sx={{ maxHeight: 230, overflowY: 'auto' }}>
                        {pastIssues.map((achievement, i) => (
                          <ListItem key={i} disablePadding sx={{ py: 1 }}>
                            <ListItemText
                              primary={
                                <Typography variant="subtitle2" fontWeight="bold">
                                  {achievement.task_title}
                                </Typography>
                              }
                              secondary={
                                <Typography variant="caption" color="text.secondary">
                                  Sprint: {achievement.sprint_name} | Est: {achievement.expected_time}h, Actual: {achievement.elapsed_time}h
                                </Typography>
                              }
                            />
                          </ListItem>
                        ))}
                      </List>
                    )}
                  </CardContent>
                </Card>
              </Grid>

              {/* Column 2: Chart and Last Issues */}
              <Grid item xs={12} md={6}>
                <Card
                  sx={{
                    borderRadius: 2,
                    boxShadow: 3,
                    display: 'flex',
                    flexDirection: 'column',
                    mb: 3,
                  }}
                >
                  <CardHeader
                    title="Estimation vs. Actual (Hours)"
                    sx={{ backgroundColor: '#e3f2fd', pb: 1 }}
                  />
                  <Divider />
                  <CardContent sx={{ flex: 1 }}>
                    {pastIssues.length === 0 ? (
                      <Typography variant="body2">
                        No data available for estimation and actual comparisons.
                      </Typography>
                    ) : (
                      <Box sx={{ height: 300 }}>
                        <Bar
                          data={{
                            labels: pastIssues.map(
                              (achievement) => achievement.title
                            ),
                            datasets: [
                              {
                                label: 'Estimation',
                                data: pastIssues.map(
                                  (achievement) => achievement.time
                                ),
                                backgroundColor: '#64b5f6',
                              },
                              {
                                label: 'Actual',
                                data: pastIssues.map(
                                  (achievement) => achievement.elapsed_time
                                ),
                                backgroundColor: '#1976d2',
                              },
                            ],
                          }}
                          options={{
                            responsive: true,
                            scales: {
                              y: { beginAtZero: true },
                            },
                          }}
                        />
                      </Box>
                    )}
                  </CardContent>
                </Card>

                <Card
                  sx={{
                    borderRadius: 2,
                    boxShadow: 3,
                  }}
                >
                  <CardHeader
                    title="Last Issues"
                    sx={{
                      backgroundColor: '#e0f2a1',
                      pb: 1,
                    }}
                  />
                  <Divider />
                  <CardContent>
                    {pastIssues.length === 0 ? (
                      <Typography variant="body2">
                        No active issues at the moment.
                      </Typography>
                    ) : (
                      <List sx={{ maxHeight: 200, overflowY: 'auto' }}>
                        {pastIssues.slice(0, 4).map((issue) => (
                            <ListItem key={issue.issue_id} disablePadding>
                              <ListItemText
                                primary={
                                  <Typography variant="subtitle2" fontWeight="bold">
                                    {issue.title}
                                  </Typography>
                                }
                                secondary={
                                  <Typography variant="caption" color="text.secondary">
                                    Repo: {issue.repo_name}
                                  </Typography>
                                }
                              />
                            </ListItem>
                          ))}

                      </List>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default UserReport;
