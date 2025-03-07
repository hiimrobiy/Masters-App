import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import SprintCreationDialog from './SprintCreationDialog';
import ReactFlow, {
  ReactFlowProvider,
  MiniMap,
  Controls,
  Background,
  useReactFlow,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
} from 'react-flow-renderer';

import TaskNode from './TaskNode';
import UserNode from '../../UserNode';
import './../css/Sprints.css'; // Updated stylesheet with teal/pastel theme

import {
  FaProjectDiagram,
  FaChartBar,
  FaBurn,
  FaCalendarAlt,
  FaTasks,
  FaAd,
  FaPlus
} from 'react-icons/fa';
import { FaChartGantt } from 'react-icons/fa6';

import ProgressionView from './ProgressionView';
import BurnDownChartView from './BurnDownChartView';
import KanbanBoard from './KanbanBoard';
import GanttView from './GranttView';
import AddUserTask from './AddUserTask';
import { useProject } from '../../ProjectProvider';
import { DatePicker, Stack } from 'rsuite';

const nodeTypes = {
  taskNode: TaskNode,
  userNode: UserNode,
};

const Sprints = ({ user }) => {
  const [sprints, setSprints] = useState([]);
  const [selectedSprint, setSelectedSprint] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [activeView, setActiveView] = useState('taskCanvas');

    const {currentProject} = useProject();

  // Fetch sprints on component mount
  useEffect(() => {
    const fetchSprints = async () => {
      try {
        const response = await axios.get(`http://localhost:5000/sprints/getAllSprints/${currentProject.id}`, {
          withCredentials: true
        });
        setSprints(response.data);
      } catch (error) {
        console.error('Error fetching sprints:', error);
      }
    };
    fetchSprints();
  }, []);

  // Handlers for node/edge changes (ReactFlow)
  const onNodesChange = useCallback(
    (changes) => {
      setNodes((nds) => applyNodeChanges(changes, nds));
    },
    [setNodes]
  );
  const onEdgesChange = useCallback(
    (changes) => {
      setEdges((eds) => applyEdgeChanges(changes, eds));
    },
    [setEdges]
  );
  const onConnect = useCallback(
    (connection) => setEdges((eds) => addEdge(connection, eds)),
    [setEdges]
  );

  // Sprint creation dialog
  const openDialog = () => setIsDialogOpen(true);
  const closeDialog = () => setIsDialogOpen(false);

  // Refresh sprints after creation
  const handleSaveSprint = async () => {
    try {
      const response = await axios.get(`http://localhost:5000/sprints/getAllSprints/${currentProject.id}`, {
        withCredentials: true
      });
      setSprints(response.data);
    } catch (error) {
      console.error('Error fetching sprints:', error);
    }
    closeDialog();
  };
  const refreshSprint = async (sprint_id) => {
    try {
      const response = await axios.get(`http://localhost:5000/sprints/getSprint/${sprint_id}`, {
        withCredentials: true
      });
      setSelectedSprint(response.data);
      
    } catch (error) {
      console.error('Error fetching sprints:', error);
    }
    closeDialog();
  };

  // Modal for viewing a sprint
  const handleSprintClick = (sprint) => {
    setSelectedSprint(sprint);
    setIsModalOpen(true);
  };
  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedSprint(null);
  };

  // Listen for Escape key to close modal
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && isModalOpen) {
        closeModal();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen]);

  return (
    <>
      <div className={`sprints-container ${isModalOpen ? 'blur' : ''}`}>
        <h2 className="sprints-title">Sprints</h2>

        {/* Sprints list */}
        <div className="sprints-list">
          {sprints.map((sprint) => {
            const startDate = new Date(sprint.start_date);
            const endDate = new Date(sprint.end_date);
            const today = new Date();

            let status = 'upcoming';
            let progressPercentage = 0;

            if (today >= startDate && today <= endDate) {
              status = 'in-progress';
              const totalDuration = endDate - startDate;
              const elapsedDuration = today - startDate;
              progressPercentage = Math.min(
                (elapsedDuration / totalDuration) * 100,
                100
              );
            } else if (today > endDate) {
              status = 'completed';
              progressPercentage = 100;
            }

            return (
              <div
                key={sprint.sprint_id}
                className="sprint-card"
                onClick={() => handleSprintClick(sprint)}
              >
                <div className="sprint-card-header">
                  <h3 className="sprint-name">{sprint.sprint_name}</h3>
                  <span className={`sprint-status ${status}`}>
                    {status.replace('-', ' ')}
                  </span>
                </div>
                <div className="sprint-card-body">
                  <div className="sprint-dates">
                    <div className="sprint-date">
                      <FaCalendarAlt className="date-icon" />
                      <span>{startDate.toLocaleDateString()}</span>
                    </div>
                    <div className="sprint-date">
                      <FaCalendarAlt className="date-icon" />
                      <span>{endDate.toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="sprint-tasks">
                    <FaTasks className="tasks-icon" />
                    <span>
                      {sprint.tasks ? sprint.tasks.length : 0} Tasks
                    </span>
                  </div>
                  <div className="sprint-progress-bar">
                    <div
                      className="sprint-progress"
                      style={{ width: `${progressPercentage}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <button className="add-sprint-button" onClick={openDialog}>
          + Add New Sprint
        </button>

        {/* Sprint Creation Dialog */}
        {isDialogOpen && (
          <SprintCreationDialog
            onClose={closeDialog}
            onSave={handleSaveSprint}
            user={user}
            
          />
        )}
      </div>

      {/* Modal for Sprint Detail Views */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div
            className={`modal-content-with-sidebar ${
              activeView === 'taskCanvas'
                ? 'task-canvas-class'
                : activeView === 'progression'
                ? 'progression-class'
                : activeView === 'burndown'
                ? 'burndown-class'
                : activeView === 'gantt'
                ? 'gantt-class'
                : ''
            }`}
          >
            <button className="close-modal-button" onClick={closeModal}>
              &times;
            </button>
            <div className="modal-sidebar">
              <button
                className={`sidebar-button ${
                  activeView === 'taskCanvas' ? 'active' : ''
                }`}
                onClick={() => setActiveView('taskCanvas')}
              >
                <FaProjectDiagram />
              </button>
              <button
                className={`sidebar-button ${
                  activeView === 'progression' ? 'active' : ''
                }`}
                onClick={() => setActiveView('progression')}
              >
                <FaChartBar />
              </button>
              <button
                className={`sidebar-button ${
                  activeView === 'burndown' ? 'active' : ''
                }`}
                onClick={() => setActiveView('burndown')}
              >
                <FaBurn />
              </button>
              <button
                className={`sidebar-button ${
                  activeView === 'gantt' ? 'active' : ''
                }`}
                onClick={() => setActiveView('gantt')}
              >
                <FaChartGantt />
              </button>
              {selectedSprint  && Number(user.id) === Number(selectedSprint.sprint_owner_id) && new Date(selectedSprint.end_date) > new Date() && (
              <button
                className={`sidebar-button ${
                  activeView === 'add' ? 'active' : ''
                }`}
                onClick={() => setActiveView('add')}
              >
                <FaPlus />
              </button>
              )}
            </div>
            <div className={`modal-main-content ${activeView}`}>
              {activeView === 'taskCanvas' && (
                <KanbanBoard sprint={selectedSprint} refresh={refreshSprint} user={user}/>
              )}
              {activeView === 'progression' && (
                <ProgressionView tasks={selectedSprint.tasks} />
              )}
              {activeView === 'burndown' && (
                <BurnDownChartView sprint={selectedSprint} />
              )}
              {activeView === 'gantt' && <GanttView sprint={selectedSprint} refresh={refreshSprint} user={user}/>}
              {activeView === 'add'  && Number(user.id) === Number(selectedSprint.sprint_owner_id) && new Date(selectedSprint.end_date) > new Date() && <AddUserTask sprint={selectedSprint} refresh={refreshSprint} user={user}/> }
           
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Sprints;
