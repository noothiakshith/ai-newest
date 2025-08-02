// queues/courseWorker.js
import { Worker } from 'bullmq';
import Redis from 'ioredis';
import { PrismaClient } from '@prisma/client';
import { lpqQueue } from './queues.js';

const prisma = new PrismaClient();
const redis = new Redis({ 
  host: "still-slug-7074.upstash.io",
  port: 6379,
  password: "ARuiAAIjcDEwMDRjYzVlOGE5Nzg0NDZiODQwNDk3MGE4OWFkYWY2NXAxMA",
  tls: {} 
});

const courseWorker = new Worker('course_generator', async (job) => {
  const { userId, topic, difficulty, duration, courseId } = job.data;

  try {
    console.log(`🚧 Processing course ${courseId} for user ${userId}`);

    await new Promise((resolve) => setTimeout(resolve, 10000));

    const updatedCourse = await prisma.course.update({
      where: { id: courseId },
      data: {
        title: 'akshith',
        description: 'updated by Akshith worker',
        difficulty: "INTERMEDIATE",
        durationDays: duration,
      },
    });

    await lpqQueue.add('lpq_task', {
      title: updatedCourse.title,
      description: updatedCourse.description,
      difficulty: updatedCourse.difficulty,
    });

    console.log(`✅ Updated course ${courseId}`);
  } catch (err) {
    console.error(`❌ Error in courseWorker:`, err);
  }
}, { connection: redis });

// Graceful shutdown
process.on('SIGTERM', async () => {
  await courseWorker.close();
  await redis.quit();
  process.exit(0);
});
