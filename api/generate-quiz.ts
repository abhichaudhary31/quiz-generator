import { GoogleGenAI, Type } from "@google/genai";
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

    const { base64Data, mimeType } = req.body;
    
    if (!base64Data || !mimeType) {
        return res.status(400).json({ message: 'Missing base64Data or mimeType in request body' });
    }

    const maxRetries = 3;
    const initialDelay = 2000;
    let retries = 0;

    const quizSchema = {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            question: { type: Type.STRING, description: 'The full text of the multiple-choice question.' },
            options: { 
              type: Type.ARRAY, 
              description: 'An array of all possible answers. Must include all options, even for True/False questions.', 
              items: { type: Type.STRING } 
            },
            answer: { 
              type: Type.ARRAY, 
              description: 'An array of all correct answers. If there is only one correct answer, it should be an array with a single string.',
              items: { type: Type.STRING }
            },
            pageIndex: {
              type: Type.INTEGER,
              description: 'The 0-based index of the page in the provided PDF chunk where this question appears. For example, the first page is 0.'
            },
            hasImage: {
                type: Type.BOOLEAN,
                description: 'Set to true if the question text explicitly refers to an image, exhibit, or diagram (e.g., "Refer to the exhibit."). Otherwise, set to false.'
            }
          },
          required: ['question', 'options', 'answer', 'pageIndex', 'hasImage'],
        },
      };

      const prompt = `
        You are an expert quiz generator. Your task is to analyze the provided PDF document and extract multiple-choice questions (MCQs) to create a quiz.

        Follow these rules strictly:
        1.  **Identify MCQs:** Find all questions that have a list of options.
        2.  **Extract All Options:** You MUST extract all provided options for each question. For example, if a question has two options (like True/False), you must include both "True" and "False" in the options array. Do not omit any options.
        3.  **Determine Correct Answers:** A question may have one OR MORE correct answers. These are often indicated by formatting like being bold, underlined, or having an asterisk (*). Be very careful to identify ALL correct answers based on these cues. If no explicit answer is marked, use your general knowledge to determine the most likely correct answer. If the correct answer cannot be determined from the text or general knowledge, return an empty array for the 'answer' field.
        4.  **Format Output:** Return the data ONLY in the requested JSON format. Your entire response must be the JSON array object and nothing else.
        5.  **Page and Image References:** For each question, you MUST identify its 0-based page index within the provided PDF chunk. Also, determine if the question explicitly refers to an image or exhibit and set the 'hasImage' flag accordingly.
      `;

    while (retries < maxRetries) {
        try {
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: {
                    parts: [
                        { text: prompt },
                        { inlineData: { data: base64Data, mimeType: mimeType } },
                    ],
                },
                config: {
                    responseMimeType: 'application/json',
                    responseSchema: quizSchema,
                },
            });

            const jsonString = response.text;
            if (!jsonString) {
                throw new Error("API response is not in the expected array format because the response text was empty.");
            }
            const quizData = JSON.parse(jsonString);

            if (!Array.isArray(quizData)) {
                throw new Error("API response is not in the expected array format.");
            }

            const validatedQuizData = quizData.filter(item =>
                item.question &&
                Array.isArray(item.options) &&
                item.options.length > 1 &&
                Array.isArray(item.answer) &&
                typeof item.pageIndex === 'number' &&
                typeof item.hasImage === 'boolean'
            );

            return res.status(200).json(validatedQuizData);

        } catch (error) {
            retries++;
            if (isRateLimitError(error) && retries < maxRetries) {
                const delay = initialDelay * Math.pow(2, retries - 1);
                console.warn(`Rate limit hit for generateQuizFromText. Retrying in ${delay}ms... (Attempt ${retries}/${maxRetries})`);
                await new Promise(res => setTimeout(res, delay));
            } else {
                console.error("Error generating quiz with Gemini:", error);
                const formattedError = formatError(error, "Failed to generate quiz");
                return res.status(500).json({ message: formattedError.message });
            }
        }
    }
    return res.status(500).json({ message: "Failed to generate quiz after multiple retries." });
}
