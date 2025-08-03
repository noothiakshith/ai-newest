import { Worker, Job } from "bullmq"; // fixed typo
import { PrismaClient } from "@prisma/client";
import { hpqQueue } from "./queues.js";

const prisma = new PrismaClient();

import { redis } from "./queues.js";

const hpqWorker = new Worker(
  "hpq_generator",
  async (job) => {
    const {
     lessonId,lessontitle,
    } = job.data;

    try {
      console.log(`Processing lesson ${lessonId} for lesson ${lessontitle}`);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      console.log("Got to the HPQ queue");
    } catch (err) {
      console.error(err);
    }
  },
  { connection: redis,
    concurrency:5
   }
);
