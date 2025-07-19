
import React, { useState, useCallback, useEffect } from 'react';
import { type PDFDocument } from 'pdf-lib';
import { FileUpload } from './components/FileUpload';
import { Quiz } from './components/Quiz';
import { QuizResult } from './components/QuizResult';
import { Loader } from './components/Loader';
import { generateQuizFromText } from './services/geminiService';
import { type QuizQuestion, type IncorrectQuizQuestion, type QuizMode } from './types';
import { QuizIcon } from './components/icons/QuizIcon';

enum AppState {
  IDLE,
  LOADING,
  QUIZ,
  RESULTS,
}

const CHUNK_SIZE = 3; // Process 3 pages at a time

export default function App() {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [allQuestions, setAllQuestions] = useState<QuizQuestion[]>([]);
  const [incorrectQuestions, setIncorrectQuestions] = useState<IncorrectQuizQuestion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [finalScore, setFinalScore] = useState<number>(0);
  const [currentMode, setCurrentMode] = useState<QuizMode>('quiz');
  
  // PDF Processing State
  const [pdfDoc, setPdfDoc] = useState<PDFDocument | null>(null);
  const [totalPageCount, setTotalPageCount] = useState(0);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [processingMessage, setProcessingMessage] = useState('');
  const [isProcessingComplete, setIsProcessingComplete] = useState(false);
  const [flaggedQuestionIndices, setFlaggedQuestionIndices] = useState<number[]>([]);


  // This effect drives the background PDF processing
  useEffect(() => {
    if (!pdfDoc || isProcessingComplete) return;

    const processChunk = async () => {
      // Base case: we've processed all pages
      if (currentPageIndex >= totalPageCount) {
        setIsProcessingComplete(true);
        if (allQuestions.length === 0) {
          setError("No scorable questions could be extracted from the PDF. Please try a different file.");
          setAppState(AppState.IDLE);
        }
        return;
      }

      setProcessingMessage(`Processing pages ${currentPageIndex + 1}–${Math.min(currentPageIndex + CHUNK_SIZE, totalPageCount)} of ${totalPageCount}...`);

      try {
        const { PDFDocument } = await import('pdf-lib');
        
        const pageIndices = Array.from({ length: Math.min(CHUNK_SIZE, totalPageCount - currentPageIndex) }, (_, i) => currentPageIndex + i);
        
        // Create a temporary document with the pages for the current chunk to send to Gemini
        const subDocForGemini = await PDFDocument.create();
        const copiedPagesForGemini = await subDocForGemini.copyPages(pdfDoc, pageIndices);
        copiedPagesForGemini.forEach(page => subDocForGemini.addPage(page));
        const base64ChunkPdf = await subDocForGemini.saveAsBase64();
        
        // Create an array of data URIs for each individual page in the chunk, to be used for exhibits
        // We do this directly from the source `pdfDoc` to ensure data integrity.
        const pageDataPromises = pageIndices.map(async (globalIndex) => {
            const singlePageDoc = await PDFDocument.create();
            const [copiedPage] = await singlePageDoc.copyPages(pdfDoc, [globalIndex]);
            singlePageDoc.addPage(copiedPage);
            return singlePageDoc.saveAsBase64({ dataUri: true });
        });
        const pageDataUris = await Promise.all(pageDataPromises);

        const generatedQuiz = await generateQuizFromText(base64ChunkPdf, 'application/pdf');

        if (generatedQuiz.length > 0) {
          // Gemini returns a pageIndex relative to the chunk (0, 1, 2...). We map this to our pageDataUris array.
          const questionsWithExhibits = generatedQuiz.map(q => {
              if (q.hasImage && q.pageIndex !== undefined && q.pageIndex < pageDataUris.length) {
                  return { ...q, pageData: pageDataUris[q.pageIndex] };
              }
              return q;
          });

          setAllQuestions(prev => [...prev, ...questionsWithExhibits]);
          
          if (appState !== AppState.QUIZ) {
            setAppState(AppState.QUIZ);
          }
        }
        
        setCurrentPageIndex(prev => prev + CHUNK_SIZE);

      } catch (e: any) {
        console.error(e);
        setError(`An error occurred while processing: ${e.message}`);
        setAppState(AppState.IDLE);
      }
    };

    processChunk();
  }, [pdfDoc, currentPageIndex, isProcessingComplete, allQuestions.length, appState]);


  const handleFileProcess = useCallback(async (file: File, mode: QuizMode) => {
    handleRetry(); // Reset everything first
    setAppState(AppState.LOADING);
    setProcessingMessage("Loading PDF...");
    setCurrentMode(mode);

    try {
      const { PDFDocument } = await import('pdf-lib');
      const fileReader = new FileReader();

      fileReader.onload = async (event) => {
        if (!event.target?.result) {
          setError('Failed to read the PDF file.');
          setAppState(AppState.IDLE);
          return;
        }
        try {
          const typedArray = new Uint8Array(event.target.result as ArrayBuffer);
          const doc = await PDFDocument.load(typedArray);
          setPdfDoc(doc);
          setTotalPageCount(doc.getPageCount());
          setCurrentPageIndex(0); // This will trigger the useEffect to start processing
        } catch (e: any) {
           setError(`Could not load the PDF. It might be corrupted or protected. Error: ${e.message}`);
           setAppState(AppState.IDLE);
        }
      };
      
      fileReader.onerror = () => {
        setError('Error reading the PDF file.');
        setAppState(AppState.IDLE);
      };

      fileReader.readAsArrayBuffer(file);

    } catch (e: any) {
      console.error(e);
      setError(`An error occurred: ${e.message}`);
      setAppState(AppState.IDLE);
    }
  }, []);
  
  const handleQuizComplete = useCallback((score: number, incorrect: IncorrectQuizQuestion[]) => {
    setFinalScore(score);
    setIncorrectQuestions(incorrect);
    setAppState(AppState.RESULTS);
  }, []);
  
  const handleFlagQuestion = useCallback((questionIndex: number) => {
    setFlaggedQuestionIndices(prev => 
      prev.includes(questionIndex) 
        ? prev.filter(i => i !== questionIndex) 
        : [...prev, questionIndex]
    );
  }, []);

  const handleRequiz = useCallback(() => {
    if (incorrectQuestions.length > 0) {
      const questionsToRequiz = incorrectQuestions.map(({userAnswers, ...rest}) => rest);
      setAllQuestions(questionsToRequiz);
      setIncorrectQuestions([]);
      setFinalScore(0);
      setError(null);
      setFlaggedQuestionIndices([]);
      setIsProcessingComplete(true); // Since we're re-quizzing a known set
      setAppState(AppState.QUIZ);
    }
  }, [incorrectQuestions]);

  const handleRetry = useCallback(() => {
    setAppState(AppState.IDLE);
    setAllQuestions([]);
    setIncorrectQuestions([]);
    setFlaggedQuestionIndices([]);
    setFinalScore(0);
    setError(null);
    setPdfDoc(null);
    setTotalPageCount(0);
    setCurrentPageIndex(0);
    setIsProcessingComplete(false);
    setProcessingMessage('');
  }, []);

  const renderContent = () => {
    switch (appState) {
      case AppState.LOADING:
        return <Loader message={processingMessage} />;
      case AppState.QUIZ:
        return <Quiz 
                  questions={allQuestions} 
                  onComplete={handleQuizComplete} 
                  mode={currentMode} 
                  isProcessingComplete={isProcessingComplete}
                  onFlagQuestion={handleFlagQuestion}
                  flaggedIndices={flaggedQuestionIndices}
               />;
      case AppState.RESULTS:
        const scorableQuestionsCount = allQuestions.filter(q => q.answer.length > 0).length;
        const flaggedQuestions = allQuestions.filter((_, index) => flaggedQuestionIndices.includes(index));
        return (
          <QuizResult 
            score={finalScore} 
            totalQuestions={allQuestions.length}
            scorableQuestionsCount={scorableQuestionsCount}
            incorrectQuestions={incorrectQuestions}
            flaggedQuestions={flaggedQuestions}
            onRetry={handleRetry}
            onRequiz={handleRequiz}
          />
        );
      case AppState.IDLE:
      default:
        return <FileUpload onProcess={handleFileProcess} error={error} />;
    }
  };

  return (
    <div className="min-h-screen text-slate-800 flex flex-col items-center justify-center p-4 transition-colors duration-500 relative">
      <div className="w-full max-w-4xl mx-auto z-10">
        <header className="text-center mb-8">
            <div className="flex items-center justify-center gap-3">
              <QuizIcon className="w-10 h-10 text-blue-500" />
              <h1 className="text-4xl md:text-5xl font-bold text-slate-800 [text-shadow:0_1px_2px_rgb(0_0_0_/_0.1)]">
                CCNP Quiz Taker 😊
              </h1>
            </div>
        </header>
        <main className="bg-white rounded-2xl shadow-2xl shadow-sky-200/50">
          {renderContent()}
        </main>
        <footer className="text-center mt-8 text-sm text-slate-600">
          <p>Made by Ladoo 😁 for Paddu ❤️</p>
        </footer>
      </div>
    </div>
  );
}
