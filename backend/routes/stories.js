// storiesRoutes.js
const express = require('express');
const router = express.Router();
const db = require('../db');

// POST /stories - create a new user story under an epic



// PUT /stories/:storyId/close - close the story and update elapsed_time
// Body: { elapsed_time }

router.get('/story/:projectId', async (req, res) => {
  const { projectId } = req.params;
  try {
    // Step 1: Fetch all epics for the project
    const epicsResult = await db.query(
      `SELECT e.epic_id, e.epic_title
       FROM epic AS e
       where e.project_id=${projectId}`
    );

    // Step 2: Fetch all stories for the epics in the project
    const storiesResult = await db.query(
      `SELECT es.epic_id, s.story_id, s.story_persona, s.story_goal, s.story_benefit, s.story_status
       FROM story AS s
       JOIN epic_story AS es ON s.story_id = es.story_id
       WHERE es.project_id = $1`, 
       [projectId]
    );

    // Process the epics to include an empty stories array
    const epicsMap = {};
    epicsResult.rows.forEach(row => {
      const { epic_id, epic_title } = row;
      epicsMap[epic_id] = {
        epic_id,
        epic_title,
        stories: [],
      };
    });

    // Add stories to their respective epics
    storiesResult.rows.forEach(row => {
      const { epic_id, story_id, story_persona, story_goal, story_benefit, story_status } = row;

      if (epicsMap[epic_id]) {
        epicsMap[epic_id].stories.push({
          story_id,
          story_persona,
          story_goal,
          story_benefit,
          story_status,
        });
      }
    });

    // Convert the map to an array
    const epicsArray = Object.values(epicsMap);

    // Send the formatted response
    res.json(epicsArray);
    
  } catch (error) {
    console.error('Error fetching stories:', error);
    res.status(500).json({ error: 'Failed to fetch stories' });
  }
});

  router.get('/epic/:projectId', async (req, res) => {
    const { projectId } = req.params;
      try {
        const result = await db.query(`
          select * from epic
          where project_id = $1`, [projectId]);
        res.json(result.rows);
      } catch (error) {
        console.error('Error fetching epics:', error);
        res.status(500).json({ error: 'Failed to fetch epics' });
      }
    });
    router.post('/addStory/:projectId', async (req, res) => {
      const { projectId } = req.params;
      const {  story_persona, story_goal, story_benefit,story_status,epic_id } = req.body;
        try {
          await db.query('BEGIN');
          const result = await db.query(`
            insert into story (
            story_persona,
            story_goal,
            story_benefit
            ,story_status)
            values($1,$2,$3,$4) returning story_id`, [story_persona, story_goal, story_benefit,story_status]);
            const story_id = result.rows[0].story_id;
            const result2 = await db.query('insert into epic_story (project_id,story_id,epic_id) values ($1,$2,$3)', [projectId,story_id,epic_id]);
            await db.query('COMMIT');
          res.json(result.rows);
        } catch (error) {
          await db.query('ROLLBACK');
          console.error('Error fetching epics:', error);
          res.status(500).json({ error: 'Failed to fetch epics' });
        }
      });


      router.post('/addEpic/:project_id', async (req, res) => {
        const {  epic_title, } = req.body;
        const { project_id} = req.params
          try {
            const result = await db.query(`
              insert into epic (
              epic_title,project_id)
              values($1,$2) returning epic_id,epic_title`, [epic_title,project_id]);
              
            res.json(result.rows);
          } catch (error) {
            console.error('Error fetching epics:', error);
            res.status(500).json({ error: 'Failed to fetch epics' });
          }
        });
    router.post('/updateStatus/:story_id', async (req,res) => {
      const { story_id } = req.params;
      const { story_status } = req.body;
      try {
        const result = await db.query(`
          update story
          set story_status = $1
          where story_id = $2`, [story_status,story_id]);
        res.json(result.rows);
      } catch (error) {
        console.error('Error fetching epics:', error);
        res.status(500).json({ error: 'Failed to fetch epics' });
      }
    } );
    router.delete('/deleteStory/:story_id', async (req,res) => {
      const { story_id } = req.params;
      try {
        await db.query('BEGIN');
       
          const result2  = await db.query(`
            delete from epic_story
            where story_id = $1`, [story_id]);
            const result = await db.query(`
              delete from story
              where story_id = $1`, [story_id]);
        await db.query('COMMIT');
        res.json(result.rows);
          } catch (error) {
            await db.query('ROLLBACK');
            console.error('Error fetching epics:', error);
            res.status(500).json({ error: 'Failed to fetch epics' });
          }
        });

  
module.exports = router;