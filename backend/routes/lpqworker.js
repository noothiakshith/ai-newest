// queues/lpqWorker.js
import { Worker } from 'bullmq';
import Redis from 'ioredis';
import { lpqQueue } from './queues';

const redis = new Redis({ 
  host: "still-slug-7074.upstash.io",
  port: 6379,
  password: "ARuiAAIjcDEwMDRjYzVlOGE5Nzg0NDZiODQwNDk3MGE4OWFkYWY2NXAxMA",
  tls: {} 
});

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
