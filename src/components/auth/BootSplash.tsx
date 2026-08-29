import React, { useEffect, useState } from 'react';
import { CasinFreightLogo } from '../brand/CasinFreightLogo';
import { FunTruck } from './FunTruck';

const PUNS = [
  'Not stuck on EDSA. Just lining up your loads.',
  'Hold the horn — we are still on the weighbridge.',
  'Checking tire pressure on the punchlines.',
  'Not overweight. Just packing extra jokes.',
  'Waybill in. Coffee in. Almost at the gate.',
  'Fueling the fleet. Please do not idle.',
  'Counting axles so we do not get fined.',
  'POD incoming. Do not seal the van yet.',
];

export const BootSplash: React.FC = () => {
  const [index, setIndex] = useState(() => Math.floor(Math.random() * PUNS.length));

  useEffect(() => {
    const timer = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % PUNS.length);
    }, 2800);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6 relative overflow-hidden">
      <style>{`
        @keyframes cf-bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        @keyframes cf-fade {
          0%, 12% { opacity: 0; transform: translateY(6px); }
          20%, 82% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-4px); }
        }
        .cf-bounce { animation: cf-bounce 1.1s ease-in-out infinite; }
        .cf-pun { animation: cf-fade 2.8s ease-in-out; }
      `}</style>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(37,99,235,0.18),transparent_40%),radial-gradient(circle_at_80%_80%,rgba(99,102,241,0.12),transparent_45%)] pointer-events-none" />
      <div className="relative z-10 w-full max-w-md text-center space-y-6">
        <div className="cf-bounce inline-flex">
          <CasinFreightLogo className="h-16 w-16 rounded-2xl shadow-2xl shadow-blue-900/40" />
        </div>
        <div>
          <div className="text-sm font-extrabold tracking-tight">CasinFreight</div>
          <div className="text-[11px] text-slate-500 font-medium mt-0.5">Warming up the fleet</div>
        </div>
        <FunTruck durationSec={3.4} />
        <p key={index} className="cf-pun text-sm text-slate-300 font-medium min-h-[2.5rem]">
          {PUNS[index]}
        </p>
      </div>
    </div>
  );
};
