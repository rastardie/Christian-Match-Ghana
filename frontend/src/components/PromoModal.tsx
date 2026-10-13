import React from 'react';
import { Gift, X } from 'lucide-react';

interface PromoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onContinue: () => void;
}

const PromoModal: React.FC<PromoModalProps> = ({ isOpen, onClose, onContinue }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="bg-white rounded-[2rem] p-8 w-full max-w-md relative z-10 shadow-2xl animate-in slide-in-from-bottom duration-300 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-brand-orange to-red-500"></div>
        
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 bg-gray-50 rounded-full transition-colors"
        >
          <X size={20} />
        </button>

        <div className="flex flex-col items-center text-center mt-4">
          <div className="w-16 h-16 bg-brand-orange/10 rounded-full flex items-center justify-center text-brand-orange mb-6">
            <Gift size={32} />
          </div>
          
          <h2 className="text-2xl font-black text-brand-blue uppercase tracking-tighter mb-4">
            Special Promotion!
          </h2>
          
          <p className="text-gray-600 font-medium mb-2">
            You can chat with this user for <span className="font-bold text-brand-orange">FREE</span>!
          </p>
          
          <div className="bg-gray-50 rounded-2xl p-4 w-full mb-8 border border-gray-100">
            <p className="text-sm text-gray-500 leading-relaxed">
              Enjoy unlimited free connections until the end of <strong className="text-gray-900">April, 2026</strong>. 
              After this period, our standard connection fee of <strong>50 GHS</strong> will apply.
            </p>
          </div>

          <button
            onClick={onContinue}
            className="w-full py-4 bg-brand-orange text-white rounded-2xl font-black text-[13px] uppercase tracking-[0.2em] shadow-xl shadow-brand-orange/20 active:scale-95 transition-all hover:bg-brand-orange/90"
          >
            Connect Now
          </button>
        </div>
      </div>
    </div>
  );
};

export default PromoModal;
