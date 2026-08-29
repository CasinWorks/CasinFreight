import React from 'react';

type FunTruckProps = {
  className?: string;
  /** How long one full pass takes. */
  durationSec?: number;
};

const Wheel: React.FC<{ x: number }> = ({ x }) => (
  <g>
    <circle cx={x} cy="40" r="8" fill="#0f172a" stroke="#e2e8f0" strokeWidth="1.8" />
    <g>
      <animateTransform
        attributeName="transform"
        type="rotate"
        from={`0 ${x} 40`}
        to={`360 ${x} 40`}
        dur="0.45s"
        repeatCount="indefinite"
      />
      <path d={`M ${x} 34 v12 M ${x - 6} 40 h12`} stroke="#94a3b8" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx={x} cy="40" r="2.4" fill="#f8fafc" />
    </g>
  </g>
);

const TruckSprite: React.FC = () => (
  <svg viewBox="0 0 168 48" width="168" height="48" className="block" aria-hidden>
    <rect x="6" y="8" width="96" height="28" rx="4" fill="#1d4ed8" />
    <rect x="10" y="12" width="88" height="10" rx="2" fill="#60a5fa" />
    <text x="54" y="32" textAnchor="middle" fill="#dbeafe" fontSize="8" fontWeight="800" fontFamily="ui-sans-serif, system-ui">
      CASIN
    </text>
    <path d="M104 10h28l14 14v14H104V10z" fill="#2563eb" />
    <rect x="116" y="14" width="18" height="10" rx="2" fill="#bfdbfe" />
    <rect x="148" y="24" width="8" height="6" rx="1" fill="#fbbf24" />
    <rect x="4" y="32" width="148" height="6" rx="1" fill="#1e3a8a" />
    <Wheel x={28} />
    <Wheel x={52} />
    <Wheel x={96} />
    <Wheel x={128} />
  </svg>
);

export const FunTruck: React.FC<FunTruckProps> = ({ className = '', durationSec = 7.5 }) => (
  <div className={`relative overflow-hidden pointer-events-none ${className}`} aria-hidden>
    <style>{`
      @keyframes cf-login-road {
        from { background-position: 0 0; }
        to { background-position: -56px 0; }
      }
      @keyframes cf-login-drive {
        0% { transform: translateX(-42%); }
        100% { transform: translateX(112%); }
      }
      .cf-login-road {
        background-image: repeating-linear-gradient(
          90deg,
          transparent 0 22px,
          #fbbf24 22px 36px,
          transparent 36px 56px
        );
        animation: cf-login-road 0.55s linear infinite;
      }
      .cf-login-drive { animation: cf-login-drive linear infinite; }
      @media (prefers-reduced-motion: reduce) {
        .cf-login-road, .cf-login-drive { animation: none; }
      }
    `}</style>
    <div className="relative h-14">
      <div
        className="absolute inset-x-0 h-1.5 rounded-full bg-slate-800 overflow-hidden"
        style={{ bottom: 0 }}
      >
        <div className="cf-login-road h-full w-full opacity-90" />
      </div>
      <div
        className="cf-login-drive absolute left-0"
        style={{ bottom: 2, animationDuration: `${durationSec}s` }}
      >
        <TruckSprite />
      </div>
    </div>
  </div>
);
