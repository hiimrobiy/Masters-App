// SprintCreationDialog.js

import React, { useState, useEffect, useCallback } from 'react';
import ReactFlow, {
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  Background,
  Controls,
  MiniMap,
} from 'react-flow-renderer';
import axios from 'axios';
import ContextMenu from './ContextMenu';
import IssueNode from './IssueNode'; 
import AssignCollaboratorsModal from './AssignCollaboratorsModal'; 
import './../css/SprintCreationDialog.css';
import { FaClock, FaUser } from 'react-icons/fa';
import { FaUserPlus, FaBug } from 'react-icons/fa';
import { FaTasks, FaPlus, FaRegClipboard, FaEdit, FaTrash } from 'react-icons/fa';
import { useProject } from '../../ProjectProvider';

import CloseIcon from '@mui/icons-material/Close'; 

// [MUI Stepper Addition]
import { Stepper, Step, StepLabel, IconButton } from '@mui/material';

const nodeTypes = {
  customNode: IssueNode,
};

const SprintCreationDialog = ({ onClose, onSave, user, sp }) => {
  // State variables
  const [step, setStep] = useState(1);
  const [sprintName, setSprintName] = useState('');
  const [repositories, setRepositories] = useState([]);
  const [selectedRepoId, setSelectedRepoId] = useState(null);
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [collaborators, setCollaborators] = useState([]);
  const [tasks, setTasks] = useState([]); 
  const [currentTask, setCurrentTask] = useState(null); 
  const [taskStep, setTaskStep] = useState(0); 
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentIssue, setCurrentIssue] = useState(null);
  const { currentProject } = useProject();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [edit, setEdit] = useState(false);

  // [MUI Stepper Addition] Define the labels for each main step:
  const stepLabels = ['Sprint Info', 'Manage Tasks', 'Review & Save'];
  
  const stepLabelsinner = ['Chose repos.', 'Name Task', 'Select Issues', 'Assign Collaborators', 'Review Task'];

  // Fetch repositories on mount
  useEffect(() => {
    const fetchRepositories = async () => {
      try {
        const response = await axios.get(
          `http://localhost:5000/repositories/${currentProject.id}/${user.id}/`,
          { withCredentials: true }
        );
        const repositories = response.data
                          .filter(repository => repository.is_collaborator)
        setRepositories(repositories);
      } catch (error) {
        console.error('Error fetching repositories:', error);
      }
    };
    fetchRepositories();
  }, [currentProject.id]);

  // Fetch data when a repository is selected
  useEffect(() => {
    const fetchData = async () => {
      if (!selectedRepoId) return;
      try {
        // Fetch open issues
        const issuesResponse = await axios.get(
          `http://localhost:5000/repositories/repoIssues/${selectedRepoId}/issues`,
          { withCredentials: true }
        );
        const issues = issuesResponse.data;

        // Fetch dependencies
        const dependenciesResponse = await axios.get(
          `http://localhost:5000/dependencies/${selectedRepoId}`,
          { withCredentials: true }
        );
        const dependencies = dependenciesResponse.data;

        // Fetch issues that are already assigned
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
        initialNodes.forEach((node) => {
          tasks.forEach((task) => {
            task.issues.forEach((issue) => {
              if (issue.issue_id.toString() === node.id) {
                node.data.inTask = true;
                node.data.removable = false;
              }
            })
            
          })
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
          `http://localhost:5000/collaborators/${selectedRepoId}`,
          { withCredentials: true }
        );
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

  // Remove from task logic
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

  // Handle Assigning Collaborators
  const handleAssignCollaborators = (issue) => {
    setCurrentIssue(issue);
    setIsModalOpen(true);
  };

  // Handle saving the sprint
  const saveSprint = async () => {
    try {
      const payload = {
        owner_id: user.id,
        sprint_name: sprintName,
        start_date: new Date(startDate).toISOString(),
        end_date: new Date(endDate).toISOString(),
        tasks: tasks.map((task, taskIndex) => ({
          task_name: task.task_name,
          sequence: taskIndex + 1,
          repo_id: task.repo_id,
          issues: task.issues.map((issue, index) => ({
            issue_id: issue.issue_id,
            user_ids: task.issueAssignments[issue.issue_id].map((u) => u.user_id),
            expected_time: task.issueExpectedTimes[issue.issue_id],
            sequence: index + 1,
          })),
        })),
      };
      await axios.post(
        `http://localhost:5000/sprints/saveSprint/${currentProject.id}`,
        payload,
        { withCredentials: true }
      );
      onSave();
      onClose();
    } catch (error) {
      console.error('Error saving sprint:', error);
      alert('Error saving sprint.');
    }
  };

  return (
    <div className="dialog-overlay">
      <div className={`dialog dialog-step-${step} task-step-${taskStep}`}>
      <div className="dialog-header">
          <IconButton onClick={onClose} className="dialog-close-button">
            <CloseIcon />
          </IconButton>
        </div>
        
        {/* [MUI Stepper Addition] */}
        <Stepper activeStep={step - 1} alternativeLabel style={{ marginBottom: '1rem' }}>
          {stepLabels.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
          
        </Stepper>

        {/* --- STEP 1 CONTENT: Sprint Info --- */}
        {step === 1 && (
          <div className="step-content">
            <h2 className="sprint-name">Step 1: Name Your Sprint</h2>
            <input
              type="text"
              placeholder="Enter sprint name"
              value={sprintName}
              onChange={(e) => setSprintName(e.target.value)}
              className="dialog-input"
            />

            <label className="date-label">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="dialog-input"
            />

            <label className="date-label">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="dialog-input"
            />

            <div className="dialog-actions">
              <button className="dialog-button cancel-button" onClick={onClose}>
                Cancel
              </button>
              <button
                className="dialog-button next-button"
                onClick={() => setStep(2)}
                disabled={!sprintName || !startDate || !endDate}
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* --- STEP 2 CONTENT: Manage Tasks --- */}
        {step === 2 && (
          <div className="step-content">
                 <Stepper activeStep={taskStep - 1} alternativeLabel style={{ marginBottom: '1rem' }}>
          {stepLabelsinner.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
            {taskStep === 0 && (
              <div className="task-step-content">
                <h2>Manage Your Tasks</h2>
                {tasks.length > 0 ? (
                  <div className="tasks-container">
                    {tasks.map((task, index) => (
                      <div key={index} className="task-card">
                        <div className="task-card-header">
                          <h4 className="task-title">
                            <FaTasks className="task-icon" /> {task.task_name}
                          </h4>
                          <div className="task-actions">
                            <button
                              className="edit-task-button"
                              onClick={() => {
                                setCurrentTask(task);
                                setNodes((prevNodes) =>
                                  prevNodes.map((n) => {
                                    if (
                                      task.issues.some(
                                        (issue) =>
                                          parseInt(issue.issue_id) ===
                                          parseInt(n.id)
                                      )
                                    ) {
                                      return {
                                        ...n,
                                        data: {
                                          ...n.data,
                                          inTask: true,
                                          removable:true,
                                          inCurrentTask: true,
                                        },
                                      };
                                    }
                                    return n;
                                  })
                                );
                                setEdit(true);
                                setTaskStep(1); 
                              }}
                            >
                              <FaEdit className="action-icon" /> Edit
                            </button>
                            <button
                              className="delete-task-button"
                              onClick={() => {
                                // Implement task deletion logic
                                const updatedTasks = tasks.filter((_, i) => i !== index);
                                setTasks(updatedTasks);
                              }}
                            >
                              <FaTrash className="action-icon" /> Delete
                            </button>
                          </div>
                        </div>
                        <div className="task-card-body">
                          <ul className="task-issues-list">
                            {task.issues.map((issue) => (
                              <li key={issue.issue_id} className="task-issue-item">
                                <FaBug className="issue-icon" /> {issue.issue_title}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="no-tasks-message">No tasks added yet.</p>
                )}
                <div className="dialog-actions">
                  <button
                    className="dialog-button add-task-button"
                    onClick={() => {
                      setCurrentTask({
                        task_id: Date.now(),
                        task_name: '',
                        issues: [],
                        issueAssignments: {},
                        issueExpectedTimes: {},
                        repo_id: null,
                      });
                      setTaskStep(1);
                    }}
                  >
                    <FaPlus className="button-icon" /> Add Task
                  </button>
                  <button
                    className="dialog-button next-button"
                    onClick={() => setStep(3)}
                    disabled={tasks.length === 0}
                  >
                    Proceed to Review
                  </button>
                </div>
              </div>
            )}
        
            {/* --- TASK CREATION WIZARD --- */}
            {taskStep === 1 && (
              <div className="task-step-content">
                <h2>Select Repository for Task</h2>
                <div className="repositories-list">
                  {repositories.map((repo) => (
                    <div
                      key={repo.repo_id}
                      className={`card repo-card ${
                        currentTask.repo_id === repo.repo_id ? 'selected' : ''
                      }`}
                      onClick={() => {
                        setCurrentTask((prevTask) => ({
                          ...prevTask,
                          repo_id: repo.repo_id,
                        }));
                        setSelectedRepoId(repo.repo_id);
                      }}
                    >
                      <h3>{repo.repo_name}</h3>
                      <p>{repo.description}</p>
                    </div>
                  ))}
                </div>
                <div className="dialog-actions">
                  <button
                    className="dialog-button back-button"
                    onClick={() => {
                      setTaskStep(0);
                      
                    }}
                    disabled={edit}
                  >
                    Back
                  </button>
                  <button
                    className="dialog-button next-button"
                    onClick={() => setTaskStep(2)}
                    disabled={!currentTask.repo_id}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}

            {taskStep === 2 && (
              <div className="task-step-content">
                <h2>Name Your Task</h2>
                <input
                  type="text"
                  placeholder="Enter task name"
                  value={currentTask.task_name}
                  onChange={(e) =>
                    setCurrentTask({ ...currentTask, task_name: e.target.value })
                  }
                  className="dialog-input"
                />
                <div className="dialog-actions">
                  <button
                    className="dialog-button back-button"
                    onClick={() => {
                      setTaskStep(1);
                    }}
                  >
                    Back
                  </button>
                  <button
                    className="dialog-button next-button"
                    onClick={() => setTaskStep(3)}
                    disabled={!currentTask.task_name}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}

            {taskStep === 3 && (
              <div className="task-step-content">
                <h2>Add Issues to Task: {currentTask.task_name}</h2>
                <div className="reactflow-wrapper">
                  <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodeContextMenu={onNodeContextMenu}
                    onNodesChange={(changes) =>
                      setNodes((nds) => applyNodeChanges(changes, nds))
                    }
                    onEdgesChange={(changes) =>
                      setEdges((eds) => applyEdgeChanges(changes, eds))
                    }
                    nodeTypes={nodeTypes}
                    onConnect={onConnect}
                    fitView
                  >
                    <Background color="#aaa" gap={16} />
                    <Controls />
                    <MiniMap
                      nodeColor={(node) => {
                        if (node.data.locked) return '#ccc';
                        if (node.data.inTask) return '#b3ffc7';
                        return '#007bff';
                      }}
                    />
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
                <div className="dialog-actions">
                  <button
                    className="dialog-button back-button"
                    onClick={() => setTaskStep(2)}
                  >
                    Back
                  </button>
                  <button
                    className="dialog-button next-button"
                    onClick={() => {
                      if(edit &&  currentTask.issues.length===0){
                        
                        const updatedTasks = tasks.filter((task) => task.task_id !== currentTask.task_id);
                        setTasks(updatedTasks);
                        setEdit(false);
                        setTaskStep(0);
                      }
                      else{
                      setTaskStep(4)
                      }}
                    }
                    disabled={currentTask.issues.length === 0 && !edit}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}

            {taskStep === 4 && (
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
                          <FaUserPlus className="edit-icon" />
                          {currentTask.issueAssignments &&
                          currentTask.issueAssignments[issue.issue_id]
                            ? ' Edit Collaborators'
                            : ' Assign Collaborators'}
                        </button>
                      </div>
                      <div className="issue-card-body">
                        {currentTask.issueAssignments &&
                        currentTask.issueAssignments[issue.issue_id] ? (
                          <div className="assigned-users">
                            {currentTask.issueAssignments[issue.issue_id].map(
                              (user) => (
                                <div key={user.user_id} className="assigned-user">
                                  <img
                                    src={user.profile_picture}
                                    alt={user.name}
                                    className="user-avatar"
                                  />
                                  <span>{user.name}</span>
                                </div>
                              )
                            )}
                          </div>
                        ) : (
                          <p>No collaborators assigned.</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="dialog-actions">
                  <button
                    className="dialog-button back-button"
                    onClick={() => setTaskStep(3)}
                  >
                    Back
                  </button>
                  <button
                    className="dialog-button next-button"
                    onClick={() => setTaskStep(5)}
                    disabled={currentTask.issues.some(
                      (issue) =>
                        !currentTask.issueAssignments ||
                        !currentTask.issueAssignments[issue.issue_id]
                    )}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}

            {taskStep === 5 && (
              <div className="task-step-content">
                <h2>Review Task: {currentTask.task_name}</h2>
                {currentTask.issues.map((issue) => (
                  <div key={issue.issue_id} className="issue-card">
                    <div className="issue-card-header">
                      <strong className="issue-title">{issue.issue_title}</strong>
                    </div>
                    <div className="issue-card-body">
                      <div className="issue-detail">
                        <FaUser className="detail-icon" /> Assigned to:{' '}
                        {currentTask.issueAssignments[issue.issue_id]
                          .map((user) => user.name)
                          .join(', ')}
                      </div>
                      <div className="issue-detail">
                        <FaClock className="detail-icon" /> Expected Time:{' '}
                        {currentTask.issueExpectedTimes[issue.issue_id]} hours
                      </div>
                    </div>
                  </div>
                ))}
                <div className="dialog-actions">
                  <button
                    className="dialog-button back-button"
                    onClick={() => setTaskStep(4)}
                  >
                    Back
                  </button>
                  <button
                    className="dialog-button next-button"
                    onClick={() => {
                      // Save the current task
                      if (edit) {
                        // Edit mode: replace the existing task
                        setTasks((prevTasks) =>
                          prevTasks.map((t) =>
                            t.task_id === currentTask.task_id ? currentTask : t
                          )
                        );
                        setEdit(false);
                      } else {
                        // Add as a new task
                        setTasks((prevTasks) => [...prevTasks, currentTask]);
                      }
                      setCurrentTask(null);
                      setCurrentIssue(null);
                      setTaskStep(0);
                    }}
                  >
                    Save Task
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* --- STEP 3 CONTENT: Review & Save Sprint --- */}
        {step === 3 && (
          <div className="step-content">
            <h2>Review & Save Your Sprint</h2>
            <div className="review-summary">
              <div className="sprint-info">
                <h3 className="sprint-name">
                  <FaRegClipboard className="sprint-icon" /> {sprintName}
                </h3>
              </div>
              <div className="tasks-container">
                {tasks.map((task, index) => (
                  <div key={index} className="task-card">
                    <div className="task-card-header">
                      <h4 className="task-title">
                        <FaTasks className="task-icon" /> {task.task_name}
                      </h4>
                    </div>
                    <div className="task-card-body">
                      {task.issues.map((issue) => (
                        <div key={issue.issue_id} className="issue-card">
                          <div className="issue-card-header">
                            <h5 className="issue-title">
                              <FaBug className="issue-icon" /> {issue.issue_title}
                            </h5>
                          </div>
                          <div className="issue-card-body">
                            <div className="issue-detail">
                              <FaUser className="detail-icon" /> Assigned to:
                              <div className="assigned-users">
                                {task.issueAssignments[issue.issue_id].map((u) => (
                                  <div key={u.user_id} className="assigned-user">
                                    <img
                                      src={u.profile_picture}
                                      alt={u.name}
                                      className="user-avatar"
                                    />
                                    <span>{u.name}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="dialog-actions">
              <button className="dialog-button back-button" onClick={() => setStep(2)}>
                Back
              </button>
              <button className="dialog-button save-button" onClick={saveSprint}>
                Finish & Save
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Collaborator Assignment Modal */}
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
            currentTask.issueAssignments &&
            currentTask.issueAssignments[currentIssue.issue_id]
          }
        />
      )}
    </div>
  );
};

export default SprintCreationDialog;
