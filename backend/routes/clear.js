// clearQueues.js
import { Queue } from 'bullmq';
import Redis from 'ioredis';
const redis = new Redis({
  host: "still-slug-7074.upstash.io",
  port: 6379,
  password: "ARuiAAIjcDEwMDRjYzVlOGE5Nzg0NDZiODQwNDk3MGE4OWFkYWY2NXAxMA",
  tls: {},
  maxRetriesPerRequest: null,
});
const courseQueue = new Queue('course_generator', { connection: redis });
async function clearQueues() {
  await courseQueue.obliterate({ force: true });
  console.log('courseQueue cleared');
  await redis.quit();
}
clearQueues();