
import { type QuizQuestion } from '../types';

export const generateQuizFromText = async (base64Data: string, mimeType: string): Promise<QuizQuestion[]> => {
  const response = await fetch('/api/generate-quiz', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ base64Data, mimeType }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to generate quiz');
  }

  return response.json();
};

export const getExplanationForQuestion = async (question: QuizQuestion): Promise<string> => {
    const response = await fetch('/api/get-explanation', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to get explanation');
    }

    const data = await response.json();
    return data.explanation;
};

export const getJoke = async (): Promise<string> => {
    const response = await fetch('/api/get-joke');

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to get joke');
    }
    const data = await response.json();
    return data.joke;
};
