import { Worker } from "bullmq";
import { PrismaClient } from "@prisma/client";
import { hpqQueue, redis } from "./queues.js";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient();
const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });

const parseAiJsonResponse = (text) => {
  try {
    const jsonString = text.replace(/^```json\n/, "").replace(/\n```$/, "");
    return JSON.parse(jsonString);
  } catch (err) {
    console.error("❌ Failed to parse Gemini JSON:\n", text);
    throw new Error("Malformed AI JSON.");
  }
};

const hpqWorker = new Worker(
  "hpq_generator",
  async (job) => {
    const { lessonId, lessontitle } = job.data;

    try {
      console.log(`Processing lesson ${lessonId} for lesson ${lessontitle}`);

      const prompt = `
You are an expert lesson designer with world-class knowledge. Your task is to generate engaging content blocks for a lesson.
Course Title: "${lessontitle}"

Return a JSON object with this structure:

{
  "title": "Course title",
  "modules": [
    {
      "module_title": "Module title",
      "lessons": [
        {
          "lesson_title": "Lesson title",
          "content": [
            { "type": "paragraph", "text": "..." },
            { "type": "video", "text": "..." },
            {
              "type": "mcq",
              "question": "...",
              "options": ["...", "...", "...", "..."],
              "answer": 0,
              "explanation": "..."
            }
          ]
        }
      ]
    }
  ]
}

Guidelines:
- Include 1–2 *paragraph* blocks (for explanations)
- Include 1–2 *video* blocks (YouTube search queries only)
- Include 3–5 *mcq* blocks (varied difficulty)
- Vary count slightly to make content feel natural
- No headings or markdown, just valid JSON
`;

      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt,
        responseMimeType: "text/plain",
      });

      const data = parseAiJsonResponse(response.text);

      let lessonData =
        data.modules
          ?.flatMap((m) => m.lessons)
          ?.find(
            (l) =>
              l.lesson_title?.toLowerCase().trim() ===
              lessontitle?.toLowerCase().trim()
          ) || data.modules?.[0]?.lessons?.[0];

      if (!lessonData) {
        throw new Error(`No lessons found in AI response.`);
      }

      let order = 1;

      for (const block of lessonData.content) {
        if (block.type === "mcq") {
          const mcq = await prisma.mCQOption.create({
            data: {
              question: block.question,
              options: block.options,
              answer: block.answer,
              explanation: block.explanation || "",
            },
          });

          await prisma.contentBlock.create({
            data: {
              order: order++,
              type: "MCQ",
              lessonId,
              mcqId: mcq.id,
            },
          });
        } else if (block.type === "paragraph") {
          await prisma.contentBlock.create({
            data: {
              order: order++,
              type: "PARAGRAPH",
              text: block.text,
              lessonId,
            },
          });
        } else if (block.type === "video") {
          await prisma.videoSearch.create({
            data: {
              query: block.text,
              lessonId,
            },
          });

          await prisma.contentBlock.create({
            data: {
              order: order++,
              type: "VIDEO",
              text: block.text,
              lessonId,
            },
          });
        }
      }

      await prisma.lesson.update({
        where: { id: lessonId },
        data: {
          isEnriched: true,
        },
      });

      console.log("✅ Content saved for lesson:", lessonId);
    } catch (err) {
      console.error("❌ Error processing lesson:", err);
    }
  },
  {
    connection: redis,
    concurrency: 5,
  }
);
