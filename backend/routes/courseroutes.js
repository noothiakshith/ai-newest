import express from 'express';
import { courseQueue } from './queues.js';
const router = express.Router();

router.post('/generate-course', async (req, res) => {
  const { title, author } = req.body;

  try {
    await courseQueue.add('generate_course', { title, author });
    res.status(200).json({ message: 'Course generation job added to queue.' });
  } catch (err) {
    console.error('Queue error:', err);
    res.status(500).json({ error: 'Failed to enqueue job' });
  }
});

router.get('/get-queues',async(req,res)=>{
    const count = await courseQueue.getJobCounts('waiting','active','completed')
    console.log(count)
})
export default router;
