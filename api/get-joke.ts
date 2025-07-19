import { GoogleGenAI } from "@google/genai";
import type { VercelRequest, VercelResponse } from '@vercel/node';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });

const isRateLimitError = (error: any): boolean => {
  if (error instanceof Error && error.message) {
    if (error.message.includes('429') && error.message.includes('RESOURCE_EXHAUSTED')) {
      return true;
    }
  }
  return false;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Only GET requests are allowed' });
    }

    const maxRetries = 3;
    const initialDelay = 1000;
    let retries = 0;

    while (retries < maxRetries) {
        try {
            const prompt = "Tell me a short, witty, SFW (safe for work) programmer-themed joke.";
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
            });
            const joke = response.text?.trim() ?? "I tried to think of a joke, but my circuits are fried!";
            return res.status(200).json({ joke });
        } catch (error) {
            retries++;
            if (isRateLimitError(error) && retries < maxRetries) {
                const delay = initialDelay * Math.pow(2, retries - 1);
                console.warn(`Rate limit hit for getJoke. Retrying in ${delay}ms... (Attempt ${retries}/${maxRetries})`);
                await new Promise(res => setTimeout(res, delay));
            } else {
                console.error("Error getting joke from Gemini:", error);
                return res.status(500).json({ message: "I tried to think of a joke, but my circuits are fried!" });
            }
        }
    }
    return res.status(500).json({ message: "My joke generator is tired. Ask again later!" });
} 