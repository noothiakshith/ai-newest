import { Worker } from 'bullmq';
import { redis } from './queues.js';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();


const ai = new GoogleGenAI({ apiKey:"AIzaSyDBCSU1lA6ofSsHuEQ1SpYdD5CWQ7kPViQ"});

// ✅ Create LPQ Worker
const lpqWorker = new Worker('lpq_generator', async (job) => {
  try {
    const { lessonTitle, difficulty, courseTitle, tags, moduleId, lessonId } = job.data;

    console.log(`🔧 LPQ Worker processing:`, {
      lessonTitle, difficulty, courseTitle, tags, moduleId, lessonId
    });

    // ✅ Smart prompt to Gemini
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
    const response = await ai.models.generateContent({
      model:'gemini-2.0-flash',
      contents:prompt,
      responseMimeType:"text/plain"
    })

    console.log('🧠 Gemini output:\n', response.text);
    console.log(`✅ LPQ Worker finished for lesson: ${lessonId}`);
    
    // Optionally: save enriched content to DB here (using Prisma or similar)
    // await prisma.lesson.update({ where: { id: lessonId }, data: { contentJson: response } });

  } catch (err) {
    console.error(`❌ LPQ Worker error:`, err);
  }
}, { connection: redis });

// ✅ Graceful shutdown
process.on('SIGTERM', async () => {
  await lpqWorker.close();
  await redis.quit();
  process.exit(0);
});
