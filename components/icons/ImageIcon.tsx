
import React from 'react';

export const ImageIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 20 20" 
    fill="currentColor" 
    {...props}
  >
    <path 
      fillRule="evenodd" 
      d="M1 5.25A2.25 2.25 0 013.25 3h13.5A2.25 2.25 0 0119 5.25v9.5A2.25 2.25 0 0116.75 17H3.25A2.25 2.25 0 011 14.75v-9.5Zm1.5 0v9.5c0 .414.336.75.75.75h13.5a.75.75 0 00.75-.75v-9.5a.75.75 0 00-.75-.75H3.25a.75.75 0 00-.75.75ZM8 10a1.5 1.5 0 100-3 1.5 1.5 0 000 3Z" 
      clipRule="evenodd" 
    />
    <path d="M10.5 15.25a.75.75 0 00-1.5 0v.25H8.5a.75.75 0 000 1.5h3a.75.75 0 000-1.5H10.5v-.25Z" />
    <path d="M4.155 12.555a.75.75 0 01.298-.53l3.038-2.762a.75.75 0 011.018 0l.24.218a.75.75 0 001.06-.03l3.05-3.486a.75.75 0 011.102.964l-3.563 4.072a.75.75 0 01-1.07.028l-.31-.282a.75.75 0 00-1.018 0l-3.28 2.982a.75.75 0 01-1.046-.424Z" />
  </svg>
);
