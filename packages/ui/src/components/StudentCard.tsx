import React from 'react';

export type StudentCardProps = {
  name: string;
  nisn: string;
  className: string;
  photoUrl?: string;
  qrCodeUrl?: string;
};

export const StudentCard = ({ name, nisn, className, photoUrl, qrCodeUrl }: StudentCardProps) => {
  return (
    <div className="flex flex-col items-center bg-gray-50/50 dark:bg-white/5 rounded-xl pb-4">
      <div className="w-full h-12 bg-primary/10 dark:bg-primary/20 rounded-t-xl mb-6 relative">
        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-20 h-20 bg-white dark:bg-[#1a1a1a] rounded-full flex items-center justify-center p-1 shadow-sm">
          {photoUrl ? (
            <img src={photoUrl} alt={name} className="w-full h-full rounded-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gray-200 dark:bg-gray-800 rounded-full flex items-center justify-center">
              <span className="text-gray-500 dark:text-gray-400 text-sm font-medium">
                {name.charAt(0)}
              </span>
            </div>
          )}
        </div>
      </div>
      
      <div className="px-4 w-full flex flex-col items-center">
        <h3 className="font-semibold text-center text-text-primary dark:text-text-darkPrimary leading-tight">{name}</h3>
        <p className="text-xs text-text-secondary text-center font-mono mt-1 mb-0.5">{nisn}</p>
        <p className="text-xs font-medium text-primary text-center mb-4">{className}</p>
        
        <div className="w-32 h-32 bg-white dark:bg-white p-2 rounded-lg flex items-center justify-center shadow-sm border border-border-light dark:border-border-dark shrink-0">
          {qrCodeUrl ? (
             <img src={qrCodeUrl} alt="QR Code" className="w-full h-full object-contain mix-blend-multiply" />
          ) : (
            <div className="text-[10px] text-gray-400 text-center">QR Code<br/>Unavailable</div>
          )}
        </div>
      </div>
    </div>
  );
};
