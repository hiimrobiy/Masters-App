import React, { useEffect, useState } from 'react';
import AddIcon from '@mui/icons-material/Add';
import './../css/StoriesPage.css';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import {DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { Tooltip, Button, Dialog, DialogActions, DialogContent, DialogTitle, Menu, MenuItem as ContextMenuItem, TextField, MenuItem } from '@mui/material';
import axios from 'axios';
import { useProject } from '../../ProjectProvider';



const BoardPage = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newEpicTitle, setNewEpicTitle] = useState('');
  const [newStory, setNewStory] = useState({ persona: '', goal: '', benefit: '', epic_id: '' });
  const [addType, setAddType] = useState('epic'); // epic or story

  const [contextMenu, setContextMenu] = useState(null);
  const [selectedStory, setSelectedStory] = useState(null);
  const[storyDialogOpen,setStoryDialogOpen] = useState(false);
  const{currentProject} = useProject();
  const [data, setData] = useState([]);
  const [epics, setEpics] = useState([]);
  const [update,setUpdate] = useState([]);
  
  useEffect(() => {
    async function fetchStory(){
      const resultStories = await axios.get(`http://localhost:5000/story/story/${currentProject.id}`,{withCredentials:true});
      const epics = await axios.get(`http://localhost:5000/story/epic/${currentProject.id}`,{withCredentials:true});
      setData(resultStories.data);
      setEpics(epics.data);
    }
    fetchStory()
  }
  ,[update,currentProject.id]);
  
  
const handleContextMenuOpen = (event, story, epicId) => {
    event.preventDefault();
    setContextMenu({ mouseX: event.clientX - 2, mouseY: event.clientY - 4 });
    setSelectedStory({ story, epicId });
  };

  const handleContextMenuClose = () => {
    setContextMenu(null);
    setSelectedStory(null);
  };

  const handleFinishTask = (status) => {
    if (selectedStory) {
      const { story, epicId } = selectedStory;
      const epicIndex = data.findIndex(epic => epic.epic_id === epicId);
      if (epicIndex >= 0) {
        const updatedData = [...data];
        const storyIndex = updatedData[epicIndex].stories.findIndex(s => s.story_id === story.story_id);
        if (storyIndex >= 0) {
          updatedData[epicIndex].stories[storyIndex].story_status = status;
          setData(updatedData);
          try {
            axios.post(`http://localhost:5000/story/updateStatus/${story.story_id}`,{story_status:status},{withCredentials:true});
          } catch (error) {
            console.log(error);
        }
      }
    }
    handleContextMenuClose();
  };
}

  const handleDeleteStory = () => {
    if (selectedStory) {
      const { story, epicId } = selectedStory;
      const epicIndex = data.findIndex(epic => epic.epic_id === epicId);
      if (epicIndex >= 0) {
        const updatedEpics = [...data];
        updatedEpics[epicIndex].stories = updatedEpics[epicIndex].stories.filter(s => s.story_id !== story.story_id);
        setData(updatedEpics);
        try {
          axios.delete(`http://localhost:5000/story/deleteStory/${story.story_id}`,{withCredentials:true});
        } catch (error) {
          console.log(error);
      }
    }
    handleContextMenuClose();
  };
}
  const onDragEnd = (result) => {
    const { destination, source, draggableId, type } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    if (type === 'epic') {
      const newEpics = Array.from(data.epics);
      const [movedEpic] = newEpics.splice(source.index, 1);
      newEpics.splice(destination.index, 0, movedEpic);
      setData({ epics: newEpics });
    } else if (type === 'story') {
      const sourceEpicIndex = data.epics.findIndex((e) => e.epic_id === source.droppableId);
      const destEpicIndex = data.epics.findIndex((e) => e.epic_id === destination.droppableId);

      const newEpics = Array.from(data.epics);

      if (sourceEpicIndex === destEpicIndex) {
        const epic = data.epics[sourceEpicIndex];
        const updatedStories = Array.from(epic.stories);
        const [movedStory] = updatedStories.splice(source.index, 1);
        updatedStories.splice(destination.index, 0, movedStory);

        newEpics[sourceEpicIndex] = { ...epic, stories: updatedStories };
        setData({ epics: newEpics });
      } else {
        const sourceEpic = data.epics[sourceEpicIndex];
        const destEpic = data.epics[destEpicIndex];

        const sourceStories = Array.from(sourceEpic.stories);
        const [movedStory] = sourceStories.splice(source.index, 1);

        const destStories = Array.from(destEpic.stories);
        destStories.splice(destination.index, 0, movedStory);

        newEpics[sourceEpicIndex] = { ...sourceEpic, stories: sourceStories };
        newEpics[destEpicIndex] = { ...destEpic, stories: destStories };

        setData({ epics: newEpics });
      }
    }
  };
  const handleStoryClick = (story) => {
    setSelectedStory(story);
    setStoryDialogOpen(true);
  };

  const handleAddItem = async() =>  {
    if (addType === 'epic') {
      const result = await axios.post(`http://localhost:5000/story/addEpic/${currentProject.id}`
      , {epic_title:newEpicTitle});
      const newEpic = {
        epic_id: result.data[0].epic_id,
        epic_title: newEpicTitle,
        stories: [],
      };
      setEpics((prev) => ([ ...prev,{epic_id:newEpic.epic_id,epic_title:newEpic.epic_title}]));
    } else if (addType === 'story') {
      const epicIndex = data.findIndex((epic) => epic.epic_id === newStory.epic_id);
      if (epicIndex >= 0) {
        newStory.story_status = 'open';
       const result = await axios.post(`http://localhost:5000/story/addStory/${currentProject.id}`,
        newStory
        ,{withCredentials:true});
      }
    }
    setUpdate(!update);
    setDialogOpen(false);
    setNewEpicTitle('');
    setNewStory({ persona: '', goal: '', benefit: '', epic_id: '' });
  };

  return (
    <div className="board-container">
      <Button
        className='add-button-stories'
        variant="contained"
        startIcon={<AddIcon />}
        onClick={() => setDialogOpen(true)}
        style={{ marginBottom: '20px', backgroundColor: "#26c6da" }}
      >
        Add Item
      </Button>

      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="all-epics" direction="horizontal" type="epic">
          {(provided) => (
            <div className="epics-row" {...provided.droppableProps} ref={provided.innerRef}>
              {data.map((epic, epicIndex) => (
                <Draggable draggableId={epic.epic_id} index={epicIndex} key={epic.epic_id}>
                  {(epicProvided) => (
                    <div
                      className="epic-column"
                      ref={epicProvided.innerRef}
                      {...epicProvided.draggableProps}
                      {...epicProvided.dragHandleProps}
                    >
                      <h3 className="epic-title">{epic.epic_title}</h3>
                      <Droppable droppableId={epic.epic_id} type="story" key={epic.epic_id}>
                        {(provided) => (
                          <div className="story-list" ref={provided.innerRef} {...provided.droppableProps}>
                            {epic.stories.map((story, storyIndex) => (
                              <Draggable draggableId={story.story_id} index={storyIndex} key={story.story_id}>
                                {(storyProvided) => (
                                  <div
                                    className="sticky-container"
                                    ref={storyProvided.innerRef}
                                    {...storyProvided.draggableProps}
                                    {...storyProvided.dragHandleProps}
                                    onClick={() => handleStoryClick(story)}
                                    onContextMenu={ (event) => handleContextMenuOpen(event,story, epic.epic_id)}
                                  >
                                    <div className="sticky-outer">
                                      <div className="sticky">
                                        <div className="sticky-content">
                                          {story.story_goal}
                                        </div>
                                        <div className="status-icon">
                                          {story.story_status === 'done' ? (
                                            <CheckCircleIcon style={{ color: 'green' }} />
                                          ) : (
                                            <HourglassEmptyIcon style={{ color: 'orange' }} />
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </Draggable>
                            ))}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {/* Dialog for Adding Items */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Add New Item</DialogTitle>
        <DialogContent>
          <TextField
            select
            label="Type"
            value={addType}
            onChange={(e) => setAddType(e.target.value)}
            fullWidth
            margin="normal"
          >
            <MenuItem value="epic">Epic</MenuItem>
            <MenuItem value="story">User Story</MenuItem>
          </TextField>
          {addType === 'epic' ? (
            <TextField
              label="Epic Title"
              value={newEpicTitle}
              onChange={(e) => setNewEpicTitle(e.target.value)}
              fullWidth
              margin="normal"
            />
          ) : (
            <>
              <TextField
                select
                label="Epic"
                value={newStory.epic_id}
                onChange={(e) => setNewStory({ ...newStory, epic_id: e.target.value })}
                fullWidth
                margin="normal"
              >
                {epics.map((epic) => (
                  <MenuItem key={epic.epic_id} value={epic.epic_id}>
                    {epic.epic_title}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="Persona"
                value={newStory.story_persona}
                onChange={(e) => setNewStory({ ...newStory, story_persona: e.target.value })}
                fullWidth
                margin="normal"
              />
              <TextField
                label="Goal"
                value={newStory.story_goal}
                onChange={(e) => setNewStory({ ...newStory,story_goal: e.target.value })}
                fullWidth
                margin="normal"
              />
              <TextField
                label="Benefit"
                value={newStory.story_benefit}
                onChange={(e) => setNewStory({ ...newStory, story_benefit: e.target.value })}
                fullWidth
                margin="normal"
              />
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} color="secondary">
            Cancel
          </Button>
          <Button onClick={handleAddItem} style={{ color: "#26c6da" }}>
            Add
          </Button>
        </DialogActions>
      </Dialog>

      {/* Context Menu for Stories */}
      <Menu
        open={contextMenu !== null}
        onClose={handleContextMenuClose}
        anchorReference="anchorPosition"
        anchorPosition={
          contextMenu !== null
            ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
            : undefined
        }
      >
        <ContextMenuItem onClick={()=>handleFinishTask("done")}>Finish Task</ContextMenuItem>
        <ContextMenuItem onClick={()=>handleFinishTask("open")}>In process</ContextMenuItem>
        <ContextMenuItem onClick={handleDeleteStory}>Delete</ContextMenuItem>
      </Menu>
      <Dialog
        open={storyDialogOpen}
        onClose={() => setStoryDialogOpen(false)}
        fullWidth
        maxWidth="md"
        sx={{
          '& .MuiDialog-paper': {
            backgroundColor: '#fef3bd',
            borderRadius: '12px',
            boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.1)',
            padding: '24px',
          },
        }}
      >
        <DialogTitle
          sx={{
            backgroundColor: '#fef3bd',
            fontWeight: 'bold',
            fontSize: '1.75rem',
            lineHeight: '2rem',
            marginBottom: '16px',
            borderBottom: '2px solid #e0e0e0',
            paddingBottom: '12px',
          }}
        >
          Story Details
        </DialogTitle>
        <DialogContent
          sx={{
            backgroundColor: '#fef3bd',
            color: '#333',
            fontSize: '1.125rem',
            lineHeight: '1.5rem',
            paddingBottom: '24px',
          }}
        >
          {selectedStory && (
            <>
              <p><strong>Persona:</strong> {selectedStory.story_persona}</p>
              <p><strong>Goal:</strong> {selectedStory.story_goal}</p>
              <p><strong>Benefit:</strong> {selectedStory.story_benefit}</p>
              <p><strong>Status:</strong> {selectedStory.story_status}</p>
            </>
          )}
        </DialogContent>
        <DialogActions
          sx={{
            backgroundColor: '#fef3bd',
            borderTop: '2px solid #e0e0e0',
            paddingTop: '12px',
          }}
        >
          <Button
            onClick={() => setStoryDialogOpen(false)}
            style={{
              color: '#26c6da',
              fontWeight: 'bold',
              fontSize: '1rem',
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};


export default BoardPage;
