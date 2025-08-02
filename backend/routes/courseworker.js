import { Worker } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { courseQueue, lpqQueue, redis } from './queues.js';
import { GoogleGenAI } from "@google/genai";

// Initialize Google Generative AI with API key from environment
const ai = new GoogleGenAI(process.env.GOOGLE_API_KEY || '');
const prisma = new PrismaClient();

const parseAiJsonResponse = (text) => {
  try {
    // AI might still wrap its response in markdown, so we strip it.
    const jsonString = text.replace(/^```json\n/, '').replace(/\n```$/, '');
    return JSON.parse(jsonString);
  } catch (error) {
    console.error("❌ Failed to parse JSON from AI response:", text);
    throw new Error("AI returned a malformed or non-JSON response.");
  }
};

const courseWorker = new Worker('course_generator', async (job) => {
  const { userId, topic, difficulty, duration, courseId } = job.data;

  try {
    console.log(`🚧 Processing course ${courseId} for user ${userId}`);
    console.log(`📚 Topic: ${topic}, Difficulty: ${difficulty}, Duration: ${duration}`);
    console.log("Initiating AI course outline generation");

    const prompt = `
You are an expert instructional designer and curriculum developer. Your task is to generate a comprehensive course curriculum for the following topic: "${topic}".

The target audience is at a "${difficulty}" level, and the entire course should be paced to be completed over a period of "${duration}" days.

You MUST respond with ONLY a valid JSON object that strictly adheres to the structure defined below. Do not include any introductory text, explanations, or markdown code fences like \`\`\`json. Your entire response must be the raw JSON object itself.

Here is the required JSON structure:
{
  "title": "A short, engaging, and SEO-friendly course title.",
  "description": "A 2-3 sentence paragraph that describes what the course is about and what students will learn. This should be a compelling marketing blurb.",
  "tags": [
    "An", "array", "of", "3-5", "relevant", "keywords"
  ],
  "modules": [
    {
      "title": "Title for Module 1 (e.g., 'Introduction to ${topic}')",
      "lessons": [
        { "title": "Title for Lesson 1.1" },
        { "title": "Title for Lesson 1.2" }
      ]
    },
    {
      "title": "Title for Module 2 (e.g., 'Core Concepts')",
      "lessons": [
        { "title": "Title for Lesson 2.1" },
        { "title": "Title for Lesson 2.2" },
        { "title": "Title for Lesson 2.3" }
      ]
    }
  ]
}
Guidelines for content:
- The number of modules should be logical for a ${duration}-day course. A module could span multiple days.
- The lesson titles within each module should represent a clear progression of learning.
- The overall curriculum must be appropriate for the specified "${difficulty}" level. For a BEGINNER, start with fundamentals. For ADVANCED, assume prior knowledge and focus on complex topics.
`;
    const response = await ai.models.generateContent({
      model:"gemini-2.0-flash",
      contents:prompt,
      responseMimeType:"text/plain"
    });
    const ciricullam = parseAiJsonResponse(response.text);
    console.log(JSON.stringify(ciricullam, null, 2));


 // Store everything in the DB
const updatedCourse = await prisma.course.update({
  where: { id: courseId },
  data: {
    title: ciricullam.title,
    description: ciricullam.description,
    tags: ciricullam.tags,
    difficulty: difficulty.toUpperCase(),
    durationDays: duration,
    modules: {
      create: ciricullam.modules.map((mod) => ({
        title: mod.title,
        lessons: {
          create: mod.lessons.map((lesson) => ({
            title: lesson.title,
          })),
        },
      })),
    },
  },
});

console.log("✅ Course, modules, and lessons stored in DB:", updatedCourse.id);

    console.log("Added to lpq (note: updatedCourse is undefined due to commented code)");
    await lpqQueue.add('lpq_task', {
      title: 'akshith', // Hardcoded fallback
      description: 'updated by Akshith worker',
      difficulty: 'INTERMEDIATE',
    });

    console.log(`✅ Updated course ${courseId}`);
  } catch (err) {
    console.error(`❌ Error in courseWorker:`, err);
  }
}, { connection: redis });

process.on('SIGTERM', async () => {
  await courseWorker.close();
  await redis.quit();
  process.exit(0);
});