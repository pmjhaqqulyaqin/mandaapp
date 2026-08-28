import React, { useEffect, useRef } from 'react';
import { cn } from '../utils/cn';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  className,
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
      // Auto-focus modal container for keyboard users
      requestAnimationFrame(() => {
        modalRef.current?.focus();
      });
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity z-[2001]"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Modal Panel */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'relative z-[2002] w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl bg-white dark:bg-background-dark p-4 sm:p-5 text-left shadow-2xl transition-all sm:my-8 border border-border-light dark:border-border-dark',
          className
        )}
      >
        <button
          onClick={onClose}
          className="absolute right-3 top-3 rounded-md p-0.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-[#1a1a1a] hover:text-gray-500 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        >
          <span className="sr-only">Close</span>
          <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>

        <div className="mb-4 sm:flex sm:items-start">
          <div className="text-center sm:text-left">
            <h3 className="text-base font-heading font-semibold leading-6 text-text-primary dark:text-text-darkPrimary" id="modal-title">
              {title}
            </h3>
            {description && (
              <div className="mt-2">
                <p className="text-sm text-text-secondary">{description}</p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-3">
          {children}
        </div>

        {footer && (
          <div className="mt-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
