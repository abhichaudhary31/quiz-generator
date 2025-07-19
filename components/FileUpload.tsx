
import React, { useState, useRef, useCallback } from 'react';
import { UploadIcon } from './icons/UploadIcon';
import { MagicWandIcon } from './icons/MagicWandIcon';
import { BookOpenIcon } from './icons/BookOpenIcon';
import { FocusIcon } from './icons/FocusIcon';
import { type QuizMode } from '../types';

interface FileUploadProps {
  onProcess: (file: File, mode: QuizMode) => void;
  error: string | null;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onProcess, error }) => {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type === 'application/pdf') {
        setFile(selectedFile);
      } else {
        alert("Please upload a PDF file.");
      }
    }
  };

  const handleDragEvents = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    handleDragEvents(e);
    if (!file) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    handleDragEvents(e);
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    handleDragEvents(e);
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
       const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type === 'application/pdf') {
        setFile(droppedFile);
        if(fileInputRef.current) {
          fileInputRef.current.files = e.dataTransfer.files;
        }
      } else {
        alert("Please upload a PDF file.");
      }
    }
  };

  const handleSubmit = (mode: QuizMode) => {
    if (file) {
      onProcess(file, mode);
    }
  };
  
  const handleResetFile = () => {
      setFile(null);
      if(fileInputRef.current) {
          fileInputRef.current.value = "";
      }
  }

  const renderInitialState = () => (
    <div className="flex flex-col md:flex-row items-center justify-center gap-8">
      {/* Left Panel: PDF Document */}
      <div 
        className={`w-full md:w-1/2 p-6 border-2 border-dashed rounded-lg cursor-pointer transition-all duration-300 relative overflow-hidden bg-yellow-100/50 ${isDragging ? 'border-blue-500 bg-blue-100/50' : 'border-yellow-400 hover:border-blue-400'}`}
        onClick={() => fileInputRef.current?.click()}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragEvents}
        onDrop={handleDrop}
      >
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="application/pdf"
          onChange={handleFileChange}
        />
        <h3 className="text-lg font-semibold text-yellow-800 mb-4">PDF Document</h3>
        <div className="space-y-2">
          <div className="text-line w-full bg-yellow-300/80"></div>
          <div className="text-line w-5/6 bg-yellow-300/80"></div>
          <div className="text-line w-full bg-yellow-300/80"></div>
          <div className="text-line w-3/4 bg-yellow-300/80"></div>
          <div className="text-line w-4/6 bg-yellow-300/80"></div>
        </div>
        <div className="absolute inset-0 bg-yellow-50/80 flex flex-col items-center justify-center text-yellow-700 opacity-0 hover:opacity-100 transition-opacity duration-300">
           <UploadIcon className="w-10 h-10 mb-2" />
           <span className="font-semibold">Click or Drag PDF</span>
        </div>
      </div>

      {/* Arrow */}
      <div className="hidden md:block text-slate-400">
         <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-8 h-8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 8.25 21 12m0 0-3.75 3.75M21 12H3" />
        </svg>
      </div>
       <div className="block md:hidden text-slate-400">
         <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-8 h-8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 17.25V3m0 14.25L8.25 13.5M12 17.25l3.75-3.75" />
        </svg>
      </div>

      {/* Right Panel: Placeholder */}
      <div className="w-full md:w-1/2 text-center p-6 bg-green-400 rounded-lg shadow-2xl shadow-green-200">
        <h3 className="text-lg font-semibold text-green-900 mb-2">Interactive Quiz</h3>
        <p className="text-sm text-green-800">Upload a PDF to get started...</p>
      </div>
    </div>
  );
  
  const renderFileSelectedState = () => (
      <div className="text-center">
        <p className="text-lg font-semibold text-slate-700 mb-2">
            File Selected: <span className="font-bold text-blue-600">{file?.name}</span>
        </p>
        <button onClick={handleResetFile} className="text-sm text-red-500 hover:underline mb-6">
            Choose a different file
        </button>
        <div className="mt-4 flex flex-col md:flex-row gap-4 justify-center items-center flex-wrap">
             <button
                onClick={() => handleSubmit('quiz')}
                className="w-full max-w-xs inline-flex gap-2 justify-center items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-lg text-white bg-blue-500 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all"
              >
                <MagicWandIcon className="w-5 h-5" />
                Start Quiz Mode
              </button>
              
               <button
                onClick={() => handleSubmit('learn')}
                className="w-full max-w-xs inline-flex gap-2 justify-center items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-lg text-white bg-green-500 hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all"
              >
                <BookOpenIcon className="w-5 h-5" />
                Start Learn Mode
              </button>
              
              <button
                onClick={() => handleSubmit('focus')}
                className="w-full max-w-xs inline-flex gap-2 justify-center items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-lg text-white bg-indigo-500 hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all"
              >
                <FocusIcon className="w-5 h-5" />
                Start Focus Mode
              </button>
        </div>
      </div>
  );

  return (
    <div className="p-6 md:p-8">
      {!file ? renderInitialState() : renderFileSelectedState()}
      {error && <p className="mt-6 text-center text-red-500 animate-fade-in">{error}</p>}
    </div>
  );
};