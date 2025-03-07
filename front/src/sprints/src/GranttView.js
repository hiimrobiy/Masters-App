import React, { useState, useMemo, useEffect } from "react";
import { Gantt, ViewMode } from "gantt-task-react";
import "gantt-task-react/dist/index.css";
import axios from "axios";
import "../css/GanttView.css";

// Your existing helper that computes % progress for an issue
const calculateProgress = (start, end) => {
  const today = new Date();
  if (today < start) return 0;
  if (today > end) return 100;
  const totalDuration = end - start;
  const elapsed = today - start;
  return Math.min(Math.max((elapsed / totalDuration) * 100, 0), 100);
};

// --------------------------------------------------------------------
// AddIssueModal is unchanged
const AddIssueModal = ({ isOpen, onClose, unscheduledIssues, onAddIssue,sprint }) => {
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    // Reset form and any error message when modal is opened/closed
    setSelectedIssue(null);
    setStartDate("");
    setEndDate("");
    setErrorMsg("");
  }, [isOpen]);

  const handleAdd = () => {
    // Ensure a selected issue and a start date are provided
    if (!selectedIssue || !startDate) return;
    
    const chosenIssue = unscheduledIssues.find(
      (i) => Number(i.issue_id) === selectedIssue
    );
    
    const start = new Date(startDate);
    let finalEndDate;

    // If an end date is provided, check the date order
    if (endDate) {
      finalEndDate = new Date(endDate);
      if (finalEndDate < start) {
        // Warn the user if end date is before start date
        setErrorMsg("End date cannot be before the start date.");
        return;
      }
    } else {
      // If no end date is provided, default based on the issue's expected time (or 1 day)
      const days = chosenIssue.expected_time || 1;
      finalEndDate = new Date(start.getTime() + days * 24 * 60 * 60 * 1000);
    }

    // Clear any error before proceeding
    setErrorMsg("");
    onAddIssue(chosenIssue, start, finalEndDate);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-container">
        <div className="modal-header">
          <h3>Add Issue to Gantt</h3>
          <button className="close-button" onClick={onClose} disabled={false}>
            &times;
          </button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label>Issue:</label>
            <select
              value={selectedIssue || ""}
              onChange={(e) => setSelectedIssue(parseInt(e.target.value, 10))}
              className="modal-select"
            >
              <option value="" disabled>
                Select an issue
              </option>
              {unscheduledIssues.map((issue) => (
                <option key={issue.issue_id} value={issue.issue_id}>
                  {issue.issue_title}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Start Date:</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="modal-input"
            />
          </div>
          <div className="form-group">
            <label>End Date (optional):</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="modal-input"
            />
          </div>
          {errorMsg && <p style={{ color: "red" }}>{errorMsg}</p>}
        </div>
        <div className="modal-actions">
          <button className="modal-button cancel-button" onClick={onClose}>
            Cancel
          </button>
          <button
            className={`modal-button add-button ${
              !selectedIssue || !startDate ? "disabled" : ""
            }`}
            onClick={handleAdd}
            disabled={!selectedIssue || !startDate}
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
};
// --------------------------------------------------------------------

// -------------- MAIN GanttView COMPONENT ---------------------------
const GanttView = ({ sprint,refresh ,user}) => {
  const [tasks, setTasks] = useState([]); // The final array for <Gantt>
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // 1) Build "project + child tasks" from sprint data
  //    Each sprint.task is a 'project row'.
  //    Each issue in that task becomes a child "task" row referencing project ID.
  const groupedTasks = useMemo(() => {
    if (!sprint || !sprint.tasks) return [];

    const ganttArray = [];

    // For each "Task" in the sprint
    // (We assume each has an ID, e.g. 'task_id' or 'id'. Adjust as needed.)
    for (const t of sprint.tasks) {
      //  Create a "project" row to group its issues
      const projectRow = {
        id: `task-${t.task_id}`, // or t.task_id
        name: t.task_title || `Task ${t.id}`,
        start: new Date(), // We'll adjust below if needed
        end: new Date(),
        type: "project",
        progress: 0,
        hideChildren: false,
      };

      // We'll track earliest start & latest end for the parent's date
      let earliest = null;
      let latest = null;
      let totalProgress = 0;
      let validIssues = 0;
      let lastProjectIndex = ganttArray.length;
      ganttArray.push(projectRow);

      for (const issue of t.issues) {
        if (!issue.start_date || !issue.end_date) {
          // skip unscheduled
          continue;
        }
        const start = new Date(issue.start_date);
        const end = new Date(issue.end_date);
        const progress = Math.round(calculateProgress(start, end));

        // Update parent's earliest & latest
        if (!earliest || start < earliest) earliest = start;
        if (!latest || end > latest) latest = end;

        // Add child row
        ganttArray.push({
          id: `issue-${issue.issue_id}`,
          name: issue.issue_title,
          start,
          end,
          type: "task",
          project: projectRow.id, // references the parent's id
          progress,
          // You can store or pass custom styles if needed
          
          // If you have dependencies, add them here:
          dependencies: issue.dependencies.map((issue_id)=>`issue-${issue_id}`) || [],
        });
        totalProgress += progress;
        validIssues += 1;
      }

      // If at least one scheduled issue, set parent's date range & average progress
      if (validIssues > 0 && earliest && latest) {
        projectRow.start = earliest;
        projectRow.end = latest;
        projectRow.progress = Math.round(totalProgress / validIssues);
        ganttArray[lastProjectIndex] = projectRow;
      } else {
        // If no scheduled issues, projectRow might start/end at today's date
        projectRow.start = new Date();
        projectRow.end = new Date();
        ganttArray.splice(lastProjectIndex,1)
      }
      
     
    }
    return ganttArray;
  }, [sprint]);

  // 2) "Unscheduled issues" from your original code
  const unscheduledIssues = useMemo(() => {
    if (!sprint || !sprint.tasks) return [];
    // Already-scheduled "issue-XX" IDs:
    const scheduledIds = new Set(
      groupedTasks
        .filter((t) => t.id.startsWith("issue-"))
        .map((t) => parseInt(t.id.split("-")[1], 10))
    );

    const result = [];
    for (const t of sprint.tasks) {
      for (const issue of t.issues) {
        if (Number(issue.expected_time) > 0 && (!issue.start_date || !issue.end_date)) {
          if (!scheduledIds.has(issue.issue_id)) {
            result.push(issue);
          }
        }
      }
    }
    return result;
  }, [sprint, groupedTasks]);

  // 3) Merge groupedTasks into local tasks
  //    So if we add new issues from the modal, we push them here, etc.
  useEffect(() => {
    setTasks((prev) => {
      // We'll replace the entire array from groupedTasks plus any "extras" you might store.
      // If you want to merge, you'd do a more custom approach. For now, let's just set:
      return groupedTasks;
    });
  }, [groupedTasks]);

  // 4) Handler: If user drags/resizes an "issue" bar to change start/end
  //    We'll update local state & sync to backend
  const handleDateChange = (updatedTask) => {
    console.log("User moved/dragged:", updatedTask);

    // 4a) Update tasks in local state
    let newTasks = tasks.map((t) => (t.id === updatedTask.id ? updatedTask : t));
  
    // 4b) If it's a child task (an issue), also update the parent's date range
    if (updatedTask.project) {
      newTasks = adjustParentDates(newTasks, updatedTask.project);
    }
    newTasks.forEach((t) => {if(t.type ==="task"){
      t.progress = Math.round(calculateProgress(t.start, t.end));
    }
    });
    setTasks(newTasks);

    // 4c) If it's an actual "issue", patch to backend
    if (updatedTask.id.startsWith("issue-")) {
      const issueId = parseInt(updatedTask.id.split("-")[1], 10);
      // Persist changes
      axios
        .post(
          "http://localhost:5000/sprints/updateDates",
          {
            issue_id: issueId,
            start_date: updatedTask.start.toISOString(),
            end_date: updatedTask.end.toISOString()
          },
          { withCredentials: true }
        )
        .then((res) => {
          console.log("Updated issue dates:", res.data);
          // If successful, refresh the gantt
          refresh(sprint.sprint_id);
        })
        .catch((err) => console.error(err));
    }
  };

  // 5) Helper function: recalc parent's (project) start/end based on child tasks
  const adjustParentDates = (allTasks, parentId) => {
    // parent row
    const parentIndex = allTasks.findIndex((t) => t.id === parentId);
    if (parentIndex < 0) return allTasks;
    const parent = { ...allTasks[parentIndex] };

    // child's tasks
    const childTasks = allTasks.filter((t) => t.project === parentId);

    if (childTasks.length === 0) return allTasks;

    let earliest = childTasks[0].start;
    let latest = childTasks[0].end;
    let progressSum = 0;

    childTasks.forEach((ct) => {
      if (ct.start < earliest) earliest = ct.start;
      if (ct.end > latest) latest = ct.end;
      progressSum += ct.progress || 0;
    });

    parent.start = earliest;
    parent.end = latest;
    parent.progress = Math.round(progressSum / childTasks.length);

    // replace in array
    return allTasks.map((t, idx) => (idx === parentIndex ? parent : t));
  };


  // 6) If user changes progress (dragging progress bar), handle it
  const handleProgressChange = (updatedTask) => {
   
  };

  // 7) If user clicks the delete/trash icon
  const handleDelete = (taskToDelete) => {
    const sure = window.confirm(`Delete "${taskToDelete.name}"?`);
    if (!sure) return false;

    // remove from local tasks
    let newTasks = tasks.filter((t) => t.id !== taskToDelete.id);
    // If it's a parent row, also remove its children or handle them differently
    if (taskToDelete.type === "project") {
      newTasks = newTasks.filter((t) => t.project !== taskToDelete.id);
    }

    setTasks(newTasks);
    return true;
  };

  // 8) Handle double-click on a bar
  const handleDblClick = (task) => {
    alert(`Double-clicked: ${task.name}`);
  };

  // 9) If user selects or unselects a bar
  const handleSelect = (task, isSelected) => {
    console.log(`${task.name} is ${isSelected ? "selected" : "unselected"}`);
  };

  // 10) For expanding/collapsing a parent row
  const handleExpanderClick = (task) => {
    setTasks((prev) => prev.map((t) => (t.id === task.id ? task : t)));
  };

  // 11) If user clicks "Add Issues To Gant table"
  //     (We combine new tasks with existing ones, plus call backend)
  const handleAddIssueToGantt = (issue, start, end) => {
    // Optionally figure out which parent "task" it belongs to if your data knows
    // For now, we put it in some default, or no project. 
    // Let's assume you have t.id referencing the "task" you want:
    // e.g., issue.task_id. If we have that info, we do:
    const parentId = `task-${issue.task_id}` || null;

    // Create new child row
    const progressVal = Math.round(calculateProgress(start, end));
    const newRow = {
      id: `issue-${issue.issue_id}`,
      name: issue.issue_title,
      start,
      end,
      type: "task",
      project: parentId,
      progress: progressVal,
      styles: {
        backgroundColor: "#2196F3",
        progressColor: "#4CAF50"
      }
    };

    setTasks((prev) => {
      const merged = [...prev, newRow];
      // also adjust parent's date if we have parent
      if (parentId) {
        return adjustParentDates(merged, parentId);
      }
      return merged;
    });

    // Persist changes to backend
    axios
      .post(
        "http://localhost:5000/sprints/updateDates",
        {
          issue_id: issue.issue_id,
          start_date: start.toISOString(),
          end_date: end.toISOString(),
        },
        { withCredentials: true }
      )
      .then((res) => {
        console.log("Updated issue dates:", res.data);
        // If successful, refresh the gantt
        refresh(sprint.sprint_id);
      })
      .catch((err) => console.error(err));
  };

  // Custom tooltip
  const CustomTooltip = ({ task }) => {
    if (!task || !task.start || !task.end) return null;
    // Example: show name, start/end
    return (
      <div style={{ backgroundColor: "white", border: "1px solid #ccc", padding: "8px" }}>
        <strong>{task.name}</strong>
        <p>Start: {task.start.toLocaleDateString()}</p>
        <p>End: {task.end.toLocaleDateString()}</p>
        {task.type === "project" && <p>(This is a parent row)</p>}
      </div>
    );
  };

  return (
    <div style={{ padding: "10px" }}>
      <h3>{sprint?.sprint_name} - Gantt Chart</h3>

      {/* Button to add unscheduled issues */}
      <button
        className={`add-issues-button ${
          unscheduledIssues.length === 0 ? "disabled" : ""
        }`}
        onClick={() => setIsAddModalOpen(true)}
        disabled={
          unscheduledIssues.length === 0 ||
          Number(sprint.sprint_owner_id) !== Number(user.id)
        }
      >
        Add Issues To Gantt
      </button>

      {/* The Gantt chart itself */}
      {console.log(tasks)}
      {tasks.length > 0 && (
        <div style={{ marginTop: "10px" }}>
          <Gantt
            tasks={tasks}
            viewMode={ViewMode.Day}
            locale="en-GB"
            // allow drag/move
            onDateChange={handleDateChange}
            onProgressChange={handleProgressChange}
            onDelete={handleDelete}
            onDoubleClick={handleDblClick}
            onSelect={handleSelect}
            onExpanderClick={handleExpanderClick}
            // custom tooltip
            customTooltip={(task) => <CustomTooltip task={task} />}
            // optional styling
            
             
           
            
          />
        </div>
      )}

      {/* Modal to add an unscheduled issue */}
      <AddIssueModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        unscheduledIssues={unscheduledIssues}
        onAddIssue={handleAddIssueToGantt}
        sprint={sprint}
      />
    </div>
  );
};

export default GanttView;
