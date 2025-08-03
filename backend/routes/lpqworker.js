import { Worker } from 'bullmq';
import { redis } from './queues.js';
import { PrismaClient } from '@prisma/client';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });
const prisma = new PrismaClient();

// 🔧 Helper to clean & parse Gemini response
const parseAiJsonResponse = (text) => {
  try {
    const jsonString = text.replace(/^```json\n/, '').replace(/\n```$/, '');
    return JSON.parse(jsonString);
  } catch (err) {
    console.error("❌ Failed to parse Gemini JSON:\n", text);
    throw new Error("Malformed AI JSON.");
  }
};

// 🧠 LPQ Worker
const lpqWorker = new Worker('lpq_generator', async (job) => {
  const { lessonTitle, difficulty, courseTitle, tags, moduleId, lessonId } = job.data;

  try {
    console.log(`🔧 LPQ Worker processing lesson: ${lessonId}`);

    // 🎯 Prompt for Gemini
    const prompt = `
You are an expert lesson designer with world-class knowledge. Your task is to generate engaging content blocks for a lesson.

Lesson Title: "${lessonTitle}"
Difficulty: "${difficulty}"
Course Title: "${courseTitle}"
Tags: ${tags.join(', ')}

🔧 Format:
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

💡 Guidelines:
- Include 1–2 *paragraph* blocks (for explanations)
- Include 1–2 *video* blocks (YouTube search queries only)
- Include 3–5 *mcq* blocks (varied difficulty)
- Vary count slightly to make content feel natural
- No headings or markdown, just valid JSON
`;

    // 🧠 AI Call
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
      responseMimeType: 'text/plain',
    });

    const data = parseAiJsonResponse(response.text);

    const lessonData = data.modules[0]?.lessons.find(
      (l) => l.lesson_title.toLowerCase().trim() === lessonTitle.toLowerCase().trim()
    );

    if (!lessonData) {
      throw new Error(`Lesson "${lessonTitle}" not found in AI response.`);
    }

    let order = 1;

    for (const block of lessonData.content) {
      if (block.type === 'mcq') {
        const mcq = await prisma.mCQOption.create({
          data: {
            question: block.question,
            options: block.options,
            answer: block.answer,
            explanation: block.explanation || '',
          },
        });

        await prisma.contentBlock.create({
          data: {
            order: order++,
            type: 'MCQ',
            lessonId,
            mcqId: mcq.id,
          },
        });
      }

      else if (block.type === 'paragraph') {
        await prisma.contentBlock.create({
          data: {
            order: order++,
            type: 'PARAGRAPH',
            text: block.text,
            lessonId,
          },
        });
      }

      else if (block.type === 'video') {
        await prisma.videoSearch.create({
          data: {
            query: block.text,
            lessonId,
          },
        });

        await prisma.contentBlock.create({
          data: {
            order: order++,
            type: 'VIDEO',
            text: block.text,
            lessonId,
          },
        });
      }

      // You can add more content types (e.g. CODE, HEADING) here as needed
    }

    // ✅ Mark lesson as enriched
    await prisma.lesson.update({
      where: { id: lessonId },
      data: {
        isEnriched: true,
      },
    });

    console.log(`✅ Saved content for lesson: ${lessonId}`);
  } catch (err) {
    console.error(`❌ LPQ Worker error for lesson ${job.data.lessonId}:`, err);
  }
}, { connection: redis });

// 👋 Graceful shutdown
process.on('SIGTERM', async () => {
  await lpqWorker.close();
  await redis.quit();
  process.exit(0);
});
