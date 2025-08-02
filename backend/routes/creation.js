// generateCourseRoute.js

import express from "express";
import { PrismaClient, Difficulty } from "@prisma/client";
import { verifytoken } from "../middlewares/authmiddleware.js";
import * as z from "zod";
import dotenv from "dotenv";
import { courseQueue } from "./queues.js";

dotenv.config();
const prisma = new PrismaClient();
const router = express.Router();

// Zod schema for input validation
const generationSchema = z.object({
  topic: z.string(),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]),
  duration: z.number(),
});

router.post("/generate", verifytoken, async (req, res) => {
  const userid = req.userid;

  // Validate request body
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

    const prismaDifficulty = Difficulty[difficulty.toUpperCase()];

    // Create course in DB
    const newCourse = await prisma.course.create({
      data: {
        title: topic,
        description: topic,
        difficulty: prismaDifficulty,
        durationDays: duration,
        userId: userid,
      },
    });

    // Enqueue course generation job
    await courseQueue.add("course_generator", {
      courseId: newCourse.id,
      topic,
      difficulty,
      duration,
      userId: userid,
    });

    // Respond with success
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
