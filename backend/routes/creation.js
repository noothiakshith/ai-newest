// generateCourseRoute.js
import express from "express";
import { PrismaClient } from '@prisma/client';
import { verifytoken } from "../middlewares/authmiddleware.js";
import * as z from 'zod';
import dotenv from "dotenv";
import { courseQueue } from "./queues.js";

dotenv.config();
const prisma = new PrismaClient();
const router = express.Router();

const generationSchema = z.object({
  topic: z.string(),
  difficulty: z.string(),
  duration: z.number(),
});

router.post("/generate", verifytoken, async (req, res) => {
  const userid = req.userid;

  const validation = generationSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid input",
      errors: validation.error.errors,
    });
  }

  const { topic, difficulty, duration } = validation.data;

  try {
    const newCourse = await prisma.course.create({
      data: {
        title: topic,
        description: topic,
        difficulty,
        durationDays: duration,
        userId: userid,
      },
    });

    await courseQueue.add('course_generator', {
      courseId: newCourse.id,
      topic,
      difficulty,
      duration,
      userId: userid
    });

    return res.status(200).json({
      success: true,
      message: "Course added to queue",
      course: newCourse,
    });
  } catch (err) {
    console.error("❌ Error creating course:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while creating course",
    });
  }
});

export default router;
