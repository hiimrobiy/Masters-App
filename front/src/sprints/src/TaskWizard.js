import React, { useCallback, useEffect, useState } from 'react';
import ReactFlow, {
    addEdge,
    applyNodeChanges,
    applyEdgeChanges,
    Background,
    Controls,
    MiniMap,
  } from 'react-flow-renderer';
import {
  Box,
  Typography,
  Button,
  Stepper,
  Step,
  StepLabel,
  TextField,
  List,
  ListItem,
  ListItemText,
  ListItemButton
} from '@mui/material';
import 'reactflow/dist/style.css';
import axios from 'axios';
import ContextMenu from './ContextMenu';
import IssueNode from './IssueNode'; // Import the custom node component
import { FaBug, FaUserPlus } from 'react-icons/fa';
import AssignCollaboratorsModal from './AssignCollaboratorsModal';
import { useProject } from '../../ProjectProvider';
const nodeTypes = {
  customNode: IssueNode,
};


const TaskWizard = ({sprint,onClose,user}) => {
      const [repositories, setRepositories] = useState([]);
      const [selectedRepoId, setSelectedRepoId] = useState(null);
      const [nodes, setNodes] = useState([]);
      const [edges, setEdges] = useState([]);
      const [selectedNode, setSelectedNode] = useState(null);
      const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
      const [collaborators, setCollaborators] = useState([]);
      const [tasks, setTasks] = useState([]); // Array to store multiple tasks
      const [currentTask, setCurrentTask] = useState({ repo_id: null, task_name: '', issues: [], issueAssignments: {}, });
      // The task currently being added
      const [taskStep, setTaskStep] = useState(0); // Steps within task creation
      const [isModalOpen, setIsModalOpen] = useState(false);
      const [currentIssue, setCurrentIssue] = useState(null);
      const {currentProject} = useProject();

  const [activeStep, setActiveStep] = useState(0);

  const steps = ['Select Repository', 'Name Your Task', 'Add Issues', 'Assign Users', 'Review Task'];

  const handleNext = () => {
    setActiveStep((prevStep) => prevStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const handleRepoSelect = (repo_id) => {
    setCurrentTask((prevTask) => ({ ...prevTask, repo_id }));
    setSelectedRepoId(repo_id); 
  };

  const handleIssueSelect = (issue) => {
    setCurrentTask((prevTask) => ({
      ...prevTask,
      issues: [...prevTask.issues, issue],
      issueAssignments: { ...prevTask.issueAssignments, [issue.issue_id]: [] }
    }));
  };

  const handleAssignUser = (issue_id, user) => {
    setCurrentTask((prevTask) => ({
      ...prevTask,
      issueAssignments: {
        ...prevTask.issueAssignments,
        [issue_id]: [...prevTask.issueAssignments[issue_id], user]
      }
    }));
  };

  const handleSetTime = (issue_id, time) => {
    setCurrentTask((prevTask) => ({
      ...prevTask,
      issueExpectedTimes: { ...prevTask.issueExpectedTimes, [issue_id]: time }
    }));
  };

  const handleSaveTask = async() => {
    // Save task logic here
  
   
    currentTask.sprint_id = sprint.sprint_id;
    currentTask.sprint_name = sprint.sprint_name;
    try{
    const issuesResponse = await axios.post(
      `http://localhost:5000/sprints/addingTask/${sprint.sprint_id}`
    ,currentTask,{withCredentials:true});
    onClose();
    }
    catch(error){
      setActiveStep(0);
      console.log('Task saved:', currentTask);
      console.error('Error saving task:', error);
    }
   
  };

    // Fetch repositories on mount
    useEffect(() => {
        const fetchRepositories = async () => {
          try {
            const response = await axios.get(`http://localhost:5000/repositories/${currentProject.id}/${user.id}`,{withCredentials: true});
            setRepositories(response.data);
          } catch (error) {
            console.error('Error fetching repositories:', error);
          }
        };
        fetchRepositories();
      }, []);
    
      // Fetch data when a repository is selected
      useEffect(() => {
        const fetchData = async () => {
          if (!selectedRepoId) return;
          try {
            // Fetch open issues
            const issuesResponse = await axios.get(
              `http://localhost:5000/repositories/repoIssues/${selectedRepoId}/issues`
            ,{withCredentials:true});
            const issues = issuesResponse.data;
    
            // Fetch dependencies
            const dependenciesResponse = await axios.get(
              `http://localhost:5000/dependencies/${selectedRepoId}`
            ,{withCredentials:true});
            const dependencies = dependenciesResponse.data;
            const alreadyAssigned = await axios.get(
              `http://localhost:5000/tasks/taskIssues`,
              { withCredentials: true }
            );
    
            // Prepare nodes
            const assignedIssueIds = alreadyAssigned.data.map(
              (taskIssue) => taskIssue.issue_id
            );
    
            // Filter out closed or already-assigned issues
            const initialNodes = issues
              .filter(
                (issue) =>
                  issue.state === 'open' && !assignedIssueIds.includes(issue.issue_id)
              )
              .map((issue) => {
                const nodeData = {
                  id: issue.issue_id.toString(),
                  title: issue.title,
                  description: issue.description,
                  priority: issue.priority || 'normal',
                  assignee: issue.assignees || [],
                  createdAt: issue.created_at,
                  updatedAt: issue.updated_at,
                  commentsCount: issue.comments_count || 0,
                  labels: issue.labels || [],
                  milestone: issue.milestone || '',
                  url: issue.url,
                  locked: false, 
                  inTask: false,
                  inCurrentTask: false,
                  removable: true,
                };
    
                return {
                  id: issue.issue_id.toString(),
                  data: nodeData,
                  position: {
                    x: Number(issue.position_x) || Math.random() * 400,
                    y: Number(issue.position_y) || Math.random() * 400,
                  },
                  type: 'customNode',
                };
              });
    
            // Mark nodes as locked if they have unmet dependencies
            initialNodes.forEach((node) => {
              const issueDependencies = dependencies.filter(
                (dep) => dep.issue_id.toString() === node.id
              );
              if (issueDependencies.length > 0) {
                const unmetDependencies = issueDependencies.some((dep) => {
                  const depId = dep.depends_on_issue_id.toString();
                  const isCompleted = issues.find(
                    (issue) =>
                      issue.issue_id.toString() === depId && issue.state === 'closed'
                  );
    
                  // Check if the dependency is added to any task
                  let isAddedToAnyTask = tasks.some((task) =>
                    task.issues.some((issue) => issue.issue_id.toString() === depId)
                  );
                  isAddedToAnyTask =
                    isAddedToAnyTask || assignedIssueIds.includes(depId);
    
                  return !isCompleted && !isAddedToAnyTask;
                });
    
                if (unmetDependencies) {
                  node.data.locked = true;
                }
              }
            });
    
            // Prepare edges
            const initialEdges = dependencies.map((dep) => ({
              id: `edge-${dep.depends_on_issue_id}-${dep.issue_id}`,
              source: dep.depends_on_issue_id.toString(),
              target: dep.issue_id.toString(),
              style: {
                stroke: '#000',
                strokeWidth: 2,
              },
              markerEnd: {
                type: 'arrowclosed',
                color: '#000',
              },
              animated: true,
            }));
    
            setNodes(initialNodes);
            setEdges(initialEdges);
    
            // Fetch collaborators
            const collaboratorsResponse = await axios.get(
              `http://localhost:5000/collaborators/${selectedRepoId}`
            ,{withCredentials: true});
            setCollaborators(collaboratorsResponse.data);
          } catch (error) {
            console.error('Error fetching data:', error);
          }
        };
    
        fetchData();
      }, [selectedRepoId, tasks]);
    
      // Handle node right-click
      const onNodeContextMenu = (event, node) => {
        event.preventDefault();
        setSelectedNode(node);
        setContextMenuPosition({ x: event.clientX, y: event.clientY });
      };
    
      const onConnect = useCallback(
        (connection) => {
          setEdges((eds) => addEdge(connection, eds));
        },
        [setEdges]
      );
      const removeFromTask = async (node) => {
        let has_issue = false;
        const sourceEdges = edges.filter((edge) => parseInt(edge.source) === parseInt(node.id));
        if (sourceEdges.length > 0) {
          const dependentNodes = sourceEdges.map((edge) => parseInt(edge.target));
          tasks.forEach((task) => {
            if(task.task_id !== currentTask.task_id){
            task.issues.forEach((issue) => {
              if (dependentNodes.includes(issue.issue_id)) {
                has_issue = true;
                alert(`Cannot remove issue. It has dependent issue: ${issue.issue_title} in the task: ${task.task_name} .`);
                
                return;
              }
          });
        }
      }
          )
        }
        if (!has_issue) {
        const issueId = parseInt(node.id);
        const updatedTask = removeIssueAndDependentsFromTask(issueId, currentTask, false);
        setCurrentTask(updatedTask);
        }
      };
    
      function removeIssueAndDependentsFromTask(
        issueId,
        currentTaskParam,
        lockThisNode,
        visited = new Set()
      ) {
        // 1. Prevent infinite loops in case of circular dependencies
        if (visited.has(issueId)) {
          return currentTaskParam;
        }
        visited.add(issueId);
    
        // 2. Remove THIS issue from the task
        const newIssues = currentTaskParam.issues.filter(
          (issue) => issue.issue_id !== issueId
        );
        let updatedTask = {
          ...currentTaskParam,
          issues: newIssues,
        };
    
        // 3. Lock/unlock this node in the ReactFlow graph
        setNodes((prevNodes) =>
          prevNodes.map((n) => {
            if (parseInt(n.id) === issueId) {
              return {
                ...n,
                data: {
                  ...n.data,
                  locked: lockThisNode,
                  inTask: false,
                  inCurrentTask: false,
                },
              };
            }
            return n;
          })
        );
    
        // 4. Find edges where `issueId` is the source => the children
        const dependentEdges = edges.filter((edge) => parseInt(edge.source) === issueId);
    
        // 5. For each dependent (child), remove & lock them
        dependentEdges.forEach((edge) => {
          const childId = parseInt(edge.target);
          updatedTask = removeIssueAndDependentsFromTask(childId, updatedTask, true, visited);
        });
    
        return updatedTask;
      }
    
      // Handle "Add to Task" action
      const addToTask = async (node) => {
        if (node.data.locked) return;
    
        const issueId = parseInt(node.id);
        const issue = {
          issue_id: issueId,
          issue_title: node.data.title,
        };
    
        // Check if issue is already in currentTask
        if (!currentTask.issues.some((i) => i.issue_id === issueId)) {
          // Compute the updated currentTask
          const updatedCurrentTask = {
            ...currentTask,
            issues: [...currentTask.issues, issue],
          };
    
          // Update currentTask state
          setCurrentTask(updatedCurrentTask);
          setNodes((prevNodes) =>
            prevNodes.map((n) => {
              if (n.id === node.id) {
                return {
                  ...n,
                  data: {
                    ...n.data,
                    inTask: true, 
                    inCurrentTask: true
                  },
                };
              }
              return n;
            })
          );
    
          // Unlock dependent issues using updatedCurrentTask
          unlockDependentIssues(issueId, updatedCurrentTask);
        }
      };
      // Function to unlock dependent issues
      const unlockDependentIssues = (issueId, currentTaskParam) => {
        const dependentEdges = edges.filter(
          (edge) => parseInt(edge.source) === issueId
        );
        dependentEdges.forEach((edge) => {
          const targetNodeId = parseInt(edge.target);
          const targetNodeIndex = nodes.findIndex(
            (node) => parseInt(node.id) === targetNodeId
          );
          if (targetNodeIndex === -1) return;
    
          const targetNode = nodes[targetNodeIndex];
    
          // Check if all dependencies of the target node are met
          const dependencies = edges.filter(
            (e) => parseInt(e.target) === targetNodeId
          );
          const unmetDependencies = dependencies.some((depEdge) => {
            const sourceIssueId = parseInt(depEdge.source);
            // Check if the dependency is in any task or in the updated currentTask
            const isDependencyAdded =
              tasks.some((task) =>
                task.issues.some((issue) => issue.issue_id === sourceIssueId)
              ) ||
              (currentTaskParam &&
                currentTaskParam.issues.some(
                  (issue) => issue.issue_id === sourceIssueId
                ));
            return !isDependencyAdded;
          });
    
          if (!unmetDependencies) {
            // Unlock the node
            const updatedNode = {
              ...targetNode,
              data: { ...targetNode.data, locked: false },
            };
            setNodes((prevNodes) => {
              const newNodes = [...prevNodes];
              newNodes[targetNodeIndex] = updatedNode;
              return newNodes;
            });
          }
        });
      };

  return (
    <Box sx={{ width: '80%', margin: 'auto', mt: 4 }}>
      <Stepper activeStep={activeStep}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>
      <Box sx={{ mt: 4 }}>
        {activeStep === 0 && (
          <div>
            <Typography variant="h6">Select Repository for Task</Typography>
            <List>
              {repositories.map((repo) => (
                <ListItemButton
                  button
                  key={repo.repo_id}
                  selected={currentTask!=null && currentTask.repo_id === repo.repo_id}
                  onClick={() => handleRepoSelect(repo.repo_id)}
                >
                  <ListItemText primary={repo.repo_name} secondary={repo.description} />
                </ListItemButton>
              ))}
            </List>
          </div>
        )}
        {activeStep === 1 && (
          <div>
            <Typography variant="h6">Name Your Task</Typography>
            <TextField
              label="Task Name"
              value={currentTask.task_name}
              onChange={(e) => setCurrentTask({ ...currentTask, task_name: e.target.value })}
              fullWidth
            />
          </div>
        )}
         {activeStep === 2 && (
                  <div className="task-step-content">
                    <h2>Add Issues to Task: {currentTask.task_name}</h2>
                    <div className="reactflow-wrapper">
                      <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        onNodeContextMenu={onNodeContextMenu}
                        onNodesChange={(changes) => setNodes((nds) => applyNodeChanges(changes, nds))}
                        onEdgesChange={(changes) => setEdges((eds) => applyEdgeChanges(changes, eds))}
                        nodeTypes={nodeTypes}
                        onConnect={onConnect}
                        fitView
                      >
                        <Background color="#aaa" gap={16} />
                        <Controls />
                        <MiniMap nodeColor={(node) => (node.data.locked ? '#ccc' : '#007bff')} />
                      </ReactFlow>
                    </div>
                    {/* Context Menu */}
                    {selectedNode && (
                     <ContextMenu
                     node={selectedNode}
                     onAddToTask={() => {
                       addToTask(selectedNode);
                       setSelectedNode(null);
                     }}
                     onClose={() => setSelectedNode(null)}
                     position={contextMenuPosition}
                     disabled={selectedNode.data.locked}
                     inTask={selectedNode.data.inTask}
                     removable= {selectedNode.data.removable}
                     edges={edges}
                     tasks={tasks}
                     currentTask={currentTask}
                     onRemoveFromTask={() => {
                       removeFromTask(selectedNode);
                       setSelectedNode(null);
                     }}
                   />
                    )}
                  
                  </div>
                )}
        {activeStep === 3 && (
                         <div className="task-step-content">
                           <h2>Assign Users to Issues</h2>
                           <div className="issues-container">
                             {currentTask.issues.map((issue) => (
                               <div key={issue.issue_id} className="issue-card">
                                 <div className="issue-card-header">
                                   <strong className="issue-title">
                                     <FaBug className="title-icon" /> {issue.issue_title}
                                   </strong>
                                   <button
                                     className="edit-button"
                                     onClick={() => {
                                       setCurrentIssue(issue);
                                       setIsModalOpen(true);
                                     }}
                                   >
                                     <FaUserPlus className="edit-icon" />{' '}
                                     {currentTask.issueAssignments && currentTask.issueAssignments[issue.issue_id]
                                       ? 'Edit Collaborators'
                                       : 'Assign Collaborators'}
                                   </button>
                                 </div>
                                 <div className="issue-card-body">
                                   {currentTask.issueAssignments && currentTask.issueAssignments[issue.issue_id] ? (
                                     <div className="assigned-users">
                                       {currentTask.issueAssignments[issue.issue_id].map((user) => (
                                         <div key={user.user_id} className="assigned-user">
                                           <img src={user.profile_picture} alt={user.name} className="user-avatar" />
                                           <span>{user.name}</span>
                                         </div>
                                       ))}
                                     </div>
                                   ) : (
                                     <p>No collaborators assigned.</p>
                                   )}
                                 </div>
                               </div>
                             ))}
                           </div>
                         </div>)
}
    
        {activeStep === 4 && (
          <div>
            <Typography variant="h6">Review Task</Typography>
            <Typography>Task Name: {currentTask.task_name}</Typography>
            <Typography>Repository: {repositories.find(repo => repo.repo_id === currentTask.repo_id)?.repo_name}</Typography>
            {currentTask.issues.map((issue) => (
              <div key={issue.issue_id}>
                <Typography>{issue.issue_title}</Typography>
                <Typography>Assigned Users: {currentTask.issueAssignments[issue.issue_id]?.map(user => user.name).join(', ')}</Typography>
               </div>
            ))}
          </div>
        )}
      </Box>
      <Box sx={{ mt: 4, display: 'flex', justifyContent: 'space-between' }}>
        <Button
          disabled={activeStep === 0}
          onClick={handleBack}
        >
          Back
        </Button>
        <Button
          variant="contained"
          onClick={activeStep === steps.length - 1 ? handleSaveTask : handleNext}
          disabled={
            (activeStep === 0 && currentTask && !currentTask.repo_id) ||
            (activeStep === 1 && currentTask && !currentTask.task_name) ||
            (activeStep === 2 && currentTask && currentTask.issues.length === 0) 
           
          }
        >
          {activeStep === steps.length - 1 ? 'Finish' : 'Next'}
        </Button>
      </Box>
      {currentIssue && currentTask && (
  <AssignCollaboratorsModal
    isOpen={isModalOpen}
    onClose={() => setIsModalOpen(false)}
    collaborators={collaborators}
    onAssign={(assignedUsers) => {
      // Store assigned collaborators
      setCurrentTask((prevTask) => ({
        ...prevTask,
        issueAssignments: {
          ...prevTask.issueAssignments,
          [currentIssue.issue_id]: assignedUsers,
        },
      }));
      setIsModalOpen(false);
    }}
    issueTitle={currentIssue.issue_title}
    initialSelectedUsers={
      currentTask.issueAssignments && currentTask.issueAssignments[currentIssue.issue_id]
    }
  />
)}
    </Box>
  );
};

export default TaskWizard;
