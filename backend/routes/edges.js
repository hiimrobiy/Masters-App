// routes/edges.js
const express = require('express');
const router = express.Router();
const db = require('../db');

// Create a new edge
router.post('/', async (req, res) => {
  const { source, target, repositoryId, animated = false } = req.body;
  
  try {
    // Check if the source issue is already in a task
    const sourceTaskResult = await db.query(
      `SELECT COUNT(*) AS count FROM task_issues WHERE issue_id = $1`,
      [source]
    );
    const sourceAssigned = parseInt(sourceTaskResult.rows[0].count, 10) > 0;
    
    // Check if the target issue is already in a task
    const targetTaskResult = await db.query(
      `SELECT COUNT(*) AS count FROM task_issues WHERE issue_id = $1`,
      [target]
    );
    const targetAssigned = parseInt(targetTaskResult.rows[0].count, 10) > 0;
    
    // If either issue is already in a task, do not allow edge creation.
    if (sourceAssigned || targetAssigned) {
      return res.status(400).json({
        message: 'Edge creation not allowed: One or both issues are already assigned to a task.'
      });
    }
    
    // If both issues are not in any task, proceed to create the edge.
    const result = await db.query(
      `INSERT INTO edges (source_node_id, target_node_id, repository_id, animated) 
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [source, target, repositoryId, animated]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating edge:', error.message);
    res.status(500).json({ message: 'Failed to create edge', error: error.message });
  }
});

// Get all edges for a specific repository
router.get('/:repositoryId', async (req, res) => {
  const { repositoryId } = req.params;
  try {
    const result = await db.query(
      `SELECT * FROM edges WHERE repository_id = $1`,
      [repositoryId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching edges:', error.message);
    res.status(500).json({ message: 'Failed to fetch edges', error: error.message });
  }
});
router.delete('/deleteEdge/:edgeId', async (req, res) => {
  const { edgeId } = req.params;

  try {
    // Start transaction
    await db.query('BEGIN');

    // Get the edge details to obtain source and target node IDs
    const edgeResult = await db.query(
      `SELECT source_node_id, target_node_id FROM edges WHERE id = $1`,
      [edgeId]
    );

    if (edgeResult.rows.length === 0) {
      throw new Error('Edge not found');
    }

    const { source_node_id, target_node_id } = edgeResult.rows[0];

    // Delete the edge from edges table
    await db.query(
      `DELETE FROM edges WHERE id = $1`,
      [edgeId]
    );

    // Then, delete the dependency from dependencies table
    await db.query(
      `DELETE FROM issue_dependencies WHERE issue_id = $1 AND depends_on_issue_id = $2`,
      [target_node_id, source_node_id]
    );

    // Commit transaction
    await db.query('COMMIT');

    res.status(200).json({ message: 'Edge and dependency deleted successfully' });
  } catch (error) {
    await db.query('ROLLBACK');
    console.error('Error deleting edge:', error.message);
    res.status(500).json({ message: 'Failed to delete edge', error: error.message });
  }
});


module.exports = router;
