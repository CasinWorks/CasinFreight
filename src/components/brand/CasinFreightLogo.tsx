import React from 'react';
import logo from '../../assets/CASINFREIGHT.png';

interface CasinFreightLogoProps {
  className?: string;
}

export const CasinFreightLogo: React.FC<CasinFreightLogoProps> = ({ className = 'h-8 w-8' }) => (
  <img
    src={logo}
    alt="CasinFreight"
    className={`object-cover rounded-lg shrink-0 ${className}`}
  />
);
