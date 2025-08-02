import { Worker } from 'bullmq';
import { redis } from './queues.js';

const lpqWorker = new Worker('lpq_generator', async (job) => {
  try {
    const { title, description, difficulty } = job.data;
    console.log(`🔧 LPQ Worker got:`, { title, description, difficulty });

    await new Promise((resolve) => setTimeout(resolve, 3000));

    console.log(`✅ LPQ Worker finished`);
  } catch (err) {
    console.error(`❌ Error in lpqWorker:`, err);
  }
}, { connection: redis });

process.on('SIGTERM', async () => {
  await lpqWorker.close();
  await redis.quit();
  process.exit(0);
});
