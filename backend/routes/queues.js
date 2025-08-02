// queues.js
import { Queue } from 'bullmq';
import Redis from 'ioredis';

// Upstash Redis connection (rediss://)
const redis = new Redis({ 
  host: "still-slug-7074.upstash.io",
  port: 6379,
  password: "ARuiAAIjcDEwMDRjYzVlOGE5Nzg0NDZiODQwNDk3MGE4OWFkYWY2NXAxMA",
  tls: {}  // Enables SSL/TLS
});


export const courseQueue = new Queue('course_generator', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 6000,
    },
  },
});

export const lpqQueue = new Queue('lpq_generator', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 6000,
    },
  },
});


