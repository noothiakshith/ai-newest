import pkg from 'bullmq';
const { Queue, Worker } = pkg;
import Redis from 'ioredis';

const redis = new Redis({
  host: 'localhost',
  port: 6379,
});

const courseQueue = new Queue('course_generator', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 6000,
    },
  },
});

const hpqqueue = new Queue('hpq_priority',{
  connection:redis,
  defaultJobOptions:{
    priority:1,
    attempts:3,
    backoff:{
      type:'exponential',
      delay:6000
    }
  }
})
const lpqqueue = new Queue('lpq_priority',{
  connection:redis,
    defaultJobOptions:{
      priority:5,
      attempts:3,
      backoff:{
        type:'exponential',
        delay:6000 
    }
  }
})
const worker = new Worker(
  'course_generator',
  async (job) => {
    const startTime = new Date().toISOString();
    console.log(`🎯 Job ${job.id} started at ${startTime}`);
    console.log('📦 Job data:', job.data);
    await new Promise((resolve) => setTimeout(resolve, 20000));
    const endTime = new Date().toISOString();
    console.log(`✅ Job ${job.id} finished at ${endTime} with message: Processed "${job.data.message}"`);
    return { status: 'completed', processedMessage: job.data.message };
  },
  {
    connection: redis,
    removeOnComplete:{count:1000},
    removeOnFail:{count:10000}
  }
);



// 🧼 Graceful shutdown
process.on('SIGTERM', async () => {
  await worker.close();
  await courseQueue.close();
  redis.quit();
  process.exit(0);
});

export { courseQueue };
