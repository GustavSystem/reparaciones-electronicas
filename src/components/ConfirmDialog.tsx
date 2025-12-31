
import React from 'react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({ 
  isOpen, title, message, confirmText = "Confirmar", cancelText = "Cancelar", isDestructive = false, onConfirm, onCancel 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#1a2332] w-full max-w-md rounded-2xl p-6 border border-border-dark shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
        <h3 className={`text-xl font-bold mb-2 flex items-center gap-2 ${isDestructive ? 'text-red-500' : 'text-white'}`}>
          <span className="material-symbols-outlined">{isDestructive ? 'warning' : 'info'}</span>
          {title}
        </h3>
        <p className="text-text-secondary text-sm mb-8 leading-relaxed">
          {message}
        </p>
        <div className="flex gap-3 justify-end">
          <button 
            onClick={onCancel}
            className="px-5 py-2.5 rounded-xl text-sm font-bold text-white hover:bg-white/5 transition-colors"
          >
            {cancelText}
          </button>
          <button 
            onClick={onConfirm}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold text-white shadow-lg transition-transform active:scale-95 ${isDestructive ? 'bg-red-600 hover:bg-red-500 shadow-red-500/20' : 'bg-primary hover:bg-primary-hover shadow-primary/20'}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
