import { useCallback, useEffect, useState } from 'react';
import {
  Background,
  Controls,
  ReactFlow,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  MiniMap,
  useReactFlow,
  ReactFlowProvider
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import CustomNode from './CustomNode';
import { api } from './api';
import EdgeDeletionModal from './EdgeDeletionModal';

import * as repositoriesApi  from './../../api/repositoriesApi';

const nodeTypes = { customNode: CustomNode };
const defaultEdgeOptions = { animated: true };
const nodeExtent = [[0, 0], [800, 600]];

// Toggle this to true to use mock data
const useMockData = false;

// Mock data for testing
const mockNodes = [
  {
    id: '1',
    type: 'customNode',
    position: { x: 100, y: 100 },
    data: {
      title: 'Mock Task 1',
      description: 'Description for Mock Task 1',
      priority: 'high',
      assignee: ['Alice', 'Bob'],
      createdAt: '2023-01-01',
      updatedAt: '2023-02-01',
      commentsCount: 5,
      labels: ['Frontend', 'Urgent'],
      milestone: 'Milestone 1',
      url: 'https://example.com/mock-task-1'
    }
  },
  {
    id: '2',
    type: 'customNode',
    position: { x: 300, y: 100 },
    data: {
      title: 'Mock Task 2',
      description: 'Description for Mock Task 2',
      priority: 'normal',
      assignee: ['Charlie'],
      createdAt: '2023-01-15',
      updatedAt: '2023-02-15',
      commentsCount: 2,
      labels: ['Backend'],
      milestone: 'Milestone 2',
      url: 'https://example.com/mock-task-2'
    }
  },
  {
    id: '3',
    type: 'customNode',
    position: { x: 500, y: 100 },
    data: {
      title: 'Mock Task 3',
      description: 'Description for Mock Task 3',
      priority: 'low',
      assignee: ['Dana'],
      createdAt: '2023-01-20',
      updatedAt: '2023-02-20',
      commentsCount: 0,
      labels: ['Documentation'],
      milestone: 'Milestone 3',
      url: 'https://example.com/mock-task-3'
    }
  }
];


const mockEdges = [
  { id: 'e1-2', source: '1', target: '2', animated: true },
];

function Flow({ repositoryId,update }) {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [edgeToDelete, setEdgeToDelete] = useState(null);

  const { setViewport } = useReactFlow();
  const [webSocket, setWebSocket] = useState(null);
  const updateNodePriority = async (nodeId, newPriority) => {
    try {
      // Make API call to update priority in the backend
      await api.patch(`/tasks/priority/${nodeId}`, { priority: newPriority });

      // Update the node in React Flow
      setNodes((prevNodes) => 
        prevNodes.map((node) => 
          node.id === nodeId ? { ...node, data: { ...node.data, priority: newPriority }} : node
        )
      );
    } catch (error) {
      console.error("Error updating priority:", error);
    }
  };

  useEffect(() => {
    if (useMockData) {
      setNodes(mockNodes);
      setEdges(mockEdges);
      return;
    }

    async function fetchTasksAndEdges() {
      try {
        // Fetch nodes (tasks) from the backend for the current repository
        const issueResponse = await api.get(`/tasks/repoIssues/${repositoryId}`,{withCredentials:true});
        const issues = issueResponse.data;
        // Update the nodes in React Flow
        const issueNodes = issues.filter(issue =>issue.state === "open").map(issue => ({
          id: issue.issue_id.toString(),
          data: {
            id: issue.issue_id.toString(),
            title: issue.title,
            description: issue.description,
            priority: issue.priority,
            assignee: issue.assignees,
            labels: issue.labels,
            url: issue.url,
            task: issue.task,
            assigned_users: issue.assigned_users,
            updatePriority:updateNodePriority,
            inAnyTask : issue.task!==undefined 
          },
          position: { x: issue.position_x, y: issue.position_y },
          type: 'customNode',
        }));

        // Fetch edges from the backend for the current repository
       // const edgesResponse = await api.get(`/edges/${repositoryId}`);
       const edgesResponse = await repositoriesApi.fetchEdges(repositoryId);
        const initialEdges = edgesResponse.data.map(edge => ({
          id: edge.id.toString(),
          source: edge.source_node_id,
          target: edge.target_node_id,
          animated: edge.animated,
        }));

        // Set both nodes and edges after fetching
        setNodes(issueNodes);
        setEdges(initialEdges);

        // Restore the saved viewport state
        const savedViewport = JSON.parse(localStorage.getItem(`viewport_${repositoryId}`));
        if (savedViewport) {
          setViewport(savedViewport); // Restore the previous pan and zoom
        }
      } catch (error) {
        console.error('Failed to fetch tasks or edges:', error);
      }
    }

    fetchTasksAndEdges();
/*
    // WebSocket connection for real-time updates specific to the repository
    const ws = new WebSocket(`ws://localhost:5000?repositoryId=${repositoryId}`);
    setWebSocket(ws);
    ws.onopen = () => console.log('WebSocket connection established');

    ws.onmessage = (event) => {
      console.log("Message received from WebSocket:", event.data);
      const issue = JSON.parse(event.data).data;
      const newNode = {
        id: issue.issue_id.toString(),
        data: {
          id: issue.issue_id.toString(),
          title: issue.title,
          description: issue.description,
          priority: issue.priority,
          assignee: issue.assignees,
          createdAt: issue.created_at,
          updatedAt: issue.updated_at,
          commentsCount: issue.comments_count,
          labels: issue.labels,
          milestone: issue.milestone,
          url: issue.url,
          updatePriority:updateNodePriority, //
        },
        position: { x: issue.position_x, y: issue.position_y },
        type: 'customNode',
      };

      setNodes((prevNodes) => [...prevNodes, newNode]);
    };

    // Cleanup WebSocket on tab switch or unmount
    return () => {
      ws.close();
    };
    */
  }, [repositoryId, setViewport,update]);

  const handleNodeDragStop = useCallback(async (event, node) => {
    try {
      const updatedPosition = { x: node.position.x, y: node.position.y };

      await api.patch(`/tasks/${node.id}`, { position: updatedPosition },{withCredentials:true});
     ///await repositoriesApi.updateEdges(node.id,updatedPosition);
    } catch (error) {
      console.error("Error updating task position:", error);
    }
  }, []);
  const onEdgeContextMenu = useCallback((event, edge) => {
    event.preventDefault();
    setEdgeToDelete(edge);
    // You can show a confirmation dialog here
  }, []);
  const cancelDelete = useCallback(() => {
    setEdgeToDelete(null);
  }, []);
  const deleteEdge = useCallback(async () => {
    if (edgeToDelete) {
      // Remove edge from React Flow state
      setEdges((eds) => eds.filter((e) => e.id !== edgeToDelete.id));

      // Send API request to delete edge from backend
      try {
        
        //await api.delete(`/edges/${edgeToDelete.id}`);
        await repositoriesApi.deleteEdges(edgeToDelete.id);
        // If your dependencies are stored separately
        //await api.delete(`/dependencies/${edgeToDelete.id}`);
       } catch (error) {
        console.error('Error deleting edge:', error);
      }

      setEdgeToDelete(null);
    }
  }, [edgeToDelete, setEdges]);

  const onNodesChange = useCallback(
    (changes) => {
      console.log("Nodes changed:", changes);
      setNodes((nds) => applyNodeChanges(changes, nds));
    },
    [setNodes],
  );

  const onEdgesChange = useCallback(
    (changes) => {
      console.log("Edges changed:", changes);
      setEdges((eds) => applyEdgeChanges(changes, eds));
    },
    [setEdges],
  );

  const onConnect = useCallback(
    async (connection) => {
      try {
      
        // Save the new edge to the backend
        const response = await api.post('/edges', {
          source: connection.source,
          target: connection.target,
          animated: true,
          repositoryId,
        },{withCredentials: true});
        const responsedep = await api.post('/dependencies', {
          issueId: connection.target,
          dependsOnIssueId: connection.source,
          repositoryId,
        },{withCredentials:true});
        const newEdge = {
          ...connection,
          animated: true,
          id: response.data.id.toString(),
        };

        // Add edge in React Flow
        setEdges((eds) => addEdge(newEdge, eds));
        
        console.log('New edge saved to DB:', response.data);
      } catch (error) {
        console.error("Error adding edge:", error);
      }
    },
    [setEdges, repositoryId],
  );


  return (
    <ReactFlowProvider>
      <div className="fixed-background-container">
      {edgeToDelete && (
        <EdgeDeletionModal onConfirm={deleteEdge} onCancel={cancelDelete} />
      )}
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          defaultEdgeOptions={defaultEdgeOptions}
          onNodeDragStop={handleNodeDragStop}
          onEdgeContextMenu={onEdgeContextMenu}
        >
          <Background />
          <Controls />
          <MiniMap />
        </ReactFlow>
      </div>
    </ReactFlowProvider>
  );
}

export default Flow;
