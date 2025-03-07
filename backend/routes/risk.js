// storiesRoutes.js
const express = require('express');
const router = express.Router();
const db = require('../db');
router.get('/getRisks/:project_id', async (req, res) => {
    const { project_id } = req.params;
    try {
      const result = await db.query(
        `SELECT * from risk where project_id = ${project_id}`);
    
      res.status(200).json(result.rows);
      
    } catch (error) {
        console.error('Error fetching risks:', error);
        res.status(500).json({ error: 'Failed to fetch risks' });
    

}});
router.post('/addRisk/:project_id', async (req, res) => {
    const {project_id} = req.params;
    const {risk_text,risk_description,risk_section} = req.body;
    try{
        await db.query('BEGIN');
        const result = await db.query(`INSERT INTO risk (
            project_id,
            risk_text,
            risk_description,
            risk_section) VALUES ($1, $2, $3, $4) returning risk_id`,[
                project_id,
                risk_text,
                risk_description,
                risk_section
            ]
          );
        await db.query('COMMIT');
        res.status(201).json(result.rows[0]);
    }
    catch(error){
        console.error('Error adding risk:', error);
        await db.query('ROLLBACK');
        res.status(400).json({ error: 'Failed to add risk' });
    }
});
router.put('/updateRisk/:risk_id', async (req, res) => {
    const { risk_id } = req.params;
    const { risk_text, risk_description, risk_section } = req.body;
    try {
        await db.query('BEGIN');
        const result = await db.query(`UPDATE risk SET
            risk_text = ${risk_text},
            risk_description = ${risk_description},
            risk_section = ${risk_section} WHERE risk_id = ${risk_id} RETURNING *`);
        await db.query('COMMIT');
        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error('Error updating risk:', error);
        await db.query('ROLLBACK');
        res.status(400).json({ error: 'Failed to update risk' });
    }
});
router.delete('/deleteRisk/:risk_id', async (req, res) => {
    const { risk_id } = req.params;
    try {
        await db.query('BEGIN');
        const result = await db.query(`DELETE FROM risk WHERE risk_id = ${risk_id} `);
        await db.query('COMMIT');
        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error('Error deleting risk:', error);
        await db.query('ROLLBACK');
        res.status(400).json({ error: 'Failed to delete risk' });
    }
});
router.put(`/updateSection/:risk_id`,async (req,res)=>{
    
    const { risk_id } = req.params;
    const { risk_section } = req.body;
    try{
        await db.query('BEGIN');
        const result = await db.query(`UPDATE risk SET risk_section = $1 WHERE risk_id = $2 RETURNING *`,[risk_section, risk_id]);
        await db.query('COMMIT');
        res.status(200).json(result.rows[0]);
    }
    catch(error){
        console.error('Error updating risk section:', error);
        await db.query('ROLLBACK');
        res.status(400).json({ error: 'Failed to update risk section' });
    }

})
      

  
module.exports = router;