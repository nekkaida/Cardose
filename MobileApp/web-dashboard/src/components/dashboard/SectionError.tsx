import React from 'react';

interface SectionErrorProps {
  message: string;
  onRetry: () => void;
  retryLabel: string;
}

const SectionError: React.FC<SectionErrorProps> = ({ message, onRetry, retryLabel }) => {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <svg
        className="mb-2 h-8 w-8 text-red-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
        />
      </svg>
      <p className="mb-2 text-sm text-gray-500">{message}</p>
      <button
        onClick={onRetry}
        className="text-sm font-medium text-primary-600 underline underline-offset-2 hover:text-primary-700"
      >
        {retryLabel}
      </button>
    </div>
  );
};

export default SectionError;
