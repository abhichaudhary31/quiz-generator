import { GoogleGenAI } from "@google/genai";
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { type QuizQuestion } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });

const isRateLimitError = (error: any): boolean => {
  if (error instanceof Error && error.message) {
    if (error.message.includes('429') && error.message.includes('RESOURCE_EXHAUSTED')) {
      return true;
    }
  }
  return false;
}

const formatError = (error: any, defaultMessage: string): Error => {
    if (error instanceof Error) {
        try {
            const parsed = JSON.parse(error.message);
            if(parsed.error && parsed.error.message) {
                 return new Error(`${defaultMessage}: ${parsed.error.message}`);
            }
        } catch(e) {
        }
        return new Error(`${defaultMessage}: ${error.message}`);
    }
    return new Error("An unknown error occurred.");
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Only POST requests are allowed' });
    }

    const { question } = req.body as { question: QuizQuestion };

    if (!question) {
        return res.status(400).json({ message: 'Missing question in request body' });
    }

    const maxRetries = 3;
    const initialDelay = 1000;
    let retries = 0;

    while (retries < maxRetries) {
        try {
            const prompt = `
                You are a helpful teaching assistant. For the following multiple-choice question, please explain *why* the correct answer is correct. 
                Keep the explanation clear, concise, and easy to understand.

                Question: "${question.question}"
                Options: ${question.options.join(', ')}
                Correct Answer(s): ${question.answer.join(', ')}

                Provide only the explanation text, without any introductory phrases like "The explanation is..." or "Sure, here's...".
            `;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
            });

            const explanation = response.text ?? "The model did not provide an explanation.";
            return res.status(200).json({ explanation });

        } catch (error) {
            retries++;
            if (isRateLimitError(error) && retries < maxRetries) {
                const delay = initialDelay * Math.pow(2, retries - 1);
                console.warn(`Rate limit hit for getExplanation. Retrying in ${delay}ms... (Attempt ${retries}/${maxRetries})`);
                await new Promise(res => setTimeout(res, delay));
            } else {
                console.error("Error getting explanation from Gemini:", error);
                const formattedError = formatError(error, "Sorry, an error occurred while fetching the explanation");
                return res.status(500).json({ message: formattedError.message });
            }
        }
    }
    return res.status(500).json({ message: "Sorry, the request failed to get an explanation after multiple retries." });
} 