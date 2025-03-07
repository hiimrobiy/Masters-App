import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import './../css/KanbanBoard.css'; // We'll create this next
import axios from 'axios';
import TaskCardKanban from './TaskCardKanban';

const KanbanBoard = ({ sprint,user,tutorialMode ,refresh}) => {
  const [update,setUpdate] = useState(false);
  const [columns, setColumns] = useState({
    'todo': {
      name: 'To Do',
      items: []
    },
    'in-progress': {
      name: 'In Progress',
      items: []
    },
    'done': {
      name: 'Done',
      items: []
    }
  });

  useEffect(() => {
    // Fetch issues from the backend
    const fetchIssues = async () => {
      try {
        const result = await axios.get(`http://localhost:5000/sprints/getSprint/${sprint.sprint_id}`,{withCredentials: true})
        const task = result.data.tasks;

        // Organize issues into columns based on their status
        const todoItems = task.filter(task => task.task_status === 'todo');
        const inProgressItems = task.filter(task => task.task_status === 'in-progress');
        const doneItems = task.filter(task => task.task_status === 'done');

        setColumns({
          'todo': { name: 'To Do', items: todoItems },
          'in-progress': { name: 'In Progress', items: inProgressItems },
          'done': { name: 'Done', items: doneItems }
        });
      } catch (error) {
        console.error('Error fetching issues:', error);
      }
    };

    fetchIssues();
  }, [sprint,update]);

  const onDragEnd = async (result) => {
    const { source, destination, draggableId } = result;

    // If dropped outside the list
    if (!destination) {
      return;
    }

    // If the issue was dropped in the same column
    if (source.droppableId === destination.droppableId) {
      return;
    }
   


    // Check issue dependencies before allowing the move
    

    // Proceed to move the issue
    const sourceColumn = columns[source.droppableId];
    const destColumn = columns[destination.droppableId];
    const sourceItems = Array.from(sourceColumn.items);
    const destItems = Array.from(destColumn.items);

    const [removed] = sourceItems.splice(source.index, 1);
    removed.status = destination.droppableId; // Update issue status
    destItems.splice(destination.index, 0, removed);

    setColumns({
      ...columns,
      [source.droppableId]: { ...sourceColumn, items: sourceItems },
      [destination.droppableId]: { ...destColumn, items: destItems }
    });

    // Update issue status in the backend
    try {
      await axios.put(`http://localhost:5000/tasks/${draggableId}/status`, {
        task_status: destination.droppableId
      },{withCredentials: true});
      setUpdate(!update);
    } catch (error) {
      console.error('Error updating issue status:', error);
    }
  
  }; 
const issueDeleted = async (task_id) => {
  const res = await axios.delete(`http://localhost:5000/tasks/taskDelete/${task_id}`,{withCredentials:true});
  refresh(sprint.sprint_id);
}



  const updateIssueStatus = async (issueId, newState, elapsedTime,finished_date )=> {
    try {
      // Update issue in the backend
      await axios.put(`http://localhost:5000/tasks/update/${issueId}/`, {
        state: newState,
        elapsed_time: elapsedTime,
        finished_date: finished_date,
        accessToken : user.accessToken
      },{withCredentials:true});

      // Update the issue in the frontend state
      setColumns((prevColumns) => {
        const newColumns = { ...prevColumns };
        Object.values(newColumns).forEach((col) => {
          col.items.forEach((task) => {
            task.issues.forEach((issue) => {
              if (issue.issue_id === issueId) {
                issue.state = newState;
                issue.elapsed_time = elapsedTime;
                issue.finished_date = finished_date;
              }
            });
          });
        });
        return newColumns;
      });
      refresh(sprint.sprint_id);
    } catch (error) {
      console.error('Error updating issue status:', error);
    }
  };
  
  
  return (
    <div className="kanban-board">
      <DragDropContext onDragEnd={onDragEnd}>
        {Object.entries(columns).map(([columnId, column]) => (
          <div className="kanban-column" key={columnId}>
            <h2 className="column-header">{column.name}</h2>
            <Droppable droppableId={columnId}>
              {(provided, snapshot) => (
                <div
                  className="kanban-column-content"
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                >
                  {column.items.map((item, index) => (
                    <Draggable
                      key={item.task_id}
                      draggableId={item.task_id.toString()}
                      index={index}
                    >
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                        >
                          <TaskCardKanban user ={user} task={item} updateIssueStatus={updateIssueStatus} issueDeleted={issueDeleted} sprint={sprint} />
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>
        ))}
      </DragDropContext>
    </div>
  );
};

export default KanbanBoard;
