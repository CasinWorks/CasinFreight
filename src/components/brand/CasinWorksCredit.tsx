import React from 'react';

interface CasinWorksCreditProps {
  className?: string;
}

export const CasinWorksCredit: React.FC<CasinWorksCreditProps> = ({ className = '' }) => (
  <p className={className}>
    A{' '}
    <a
      href="https://casinworks.com"
      target="_blank"
      rel="noopener noreferrer"
      className="font-semibold underline underline-offset-2 hover:opacity-80"
    >
      CasinWorks
    </a>
    {' '}product ·{' '}
    <a
      href="https://casinworks.com"
      target="_blank"
      rel="noopener noreferrer"
      className="underline underline-offset-2 hover:opacity-80"
    >
      casinworks.com
    </a>
  </p>
);
