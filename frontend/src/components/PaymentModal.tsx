import React, { useState } from 'react';
import { Lock, CheckCircle, CreditCard, Shield, X } from 'lucide-react';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (reference: string, plan?: '6months' | '12months') => void;
  userId?: string;
  userCountry: 'Ghana' | 'International' | string;
  email?: string;
}

const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose, onSuccess, userCountry, email, userId }) => {
  const [processing, setProcessing] = useState(false);
  const [step, setStep] = useState<'SELECT' | 'PROCESSING' | 'SUCCESS'>('SELECT');
  const [selectedPlan, setSelectedPlan] = useState<'6months' | '12months'>('6months');

  if (!isOpen) return null;

  const isGhana = userCountry === 'Ghana';

  const getPriceText = () => {
    if (selectedPlan === '6months') {
      return isGhana ? '₵150.00' : '$15.00';
    } else {
      return isGhana ? '₵280.00' : '$28.00';
    }
  };

  const getAmountInKoboOrCents = () => {
    if (selectedPlan === '6months') {
      return isGhana ? 15000 : 1500; // ₵150 in pesewas / $15 in cents
    } else {
      return isGhana ? 28000 : 2800; // ₵280 in pesewas / $28 in cents
    }
  };

  const paystackPublicKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;

  const dismiss = () => {
    setProcessing(false);
    setStep('SELECT');
    onClose();
  };

  const handlePay = (provider: 'paystack' | 'stripe') => {
    if (provider === 'paystack') {
      const paystack = (window as any).PaystackPop;
      
      if (!paystack) {
        alert("Payment gateway failed to load. Please check your connection.");
        return;
      }
      if (!paystackPublicKey) {
        alert("Paystack is not configured for this environment.");
        return;
      }

      setProcessing(true);

      const handler = paystack.setup({
        key: paystackPublicKey,
        email: email || 'user@christianmatchghana.com',
        amount: getAmountInKoboOrCents(),
        currency: isGhana ? 'GHS' : 'USD',
        metadata: {
          userId: userId || '',
          plan: selectedPlan,
          purpose: 'subscription',
        },
        callback: function(response: any) {
          if (response.status === 'success') {
             setStep('SUCCESS');
             setProcessing(false);
             setTimeout(() => {
                onSuccess(response.reference, selectedPlan);
                onClose();
                setStep('SELECT');
             }, 1500);
          } else {
             setProcessing(false);
             alert("Payment was not completed.");
          }
        },
        onClose: function() {
          setProcessing(false);
        }
      });
      handler.openIframe();

    } else {
      setProcessing(false);
      setStep('SELECT');
      alert('International card payments are not available yet. Please contact support.');
    }
  }; 

  return (
    <div className="absolute inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 sm:items-center">
      <div className="relative w-full max-w-md transform rounded-t-3xl bg-white p-6 shadow-2xl transition-transform duration-300 sm:rounded-2xl">
        <button type="button" onClick={dismiss} aria-label="Close payment" title="Close" className="absolute right-4 top-4 z-10 rounded-full p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"><X size={20} /></button>
        
        {step === 'SELECT' && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-14 h-14 bg-brand-orange/10 rounded-full flex items-center justify-center mx-auto mb-3 text-brand-orange">
                <Lock size={28} />
              </div>
              <h2 className="text-xl font-black text-brand-blue tracking-tight">Premium Chat Subscription</h2>
              <p className="text-gray-500 mt-1.5 text-xs leading-relaxed max-w-xs mx-auto">
                Subscribe to a plan to connect and chat with opposite-sex believers on the platform. Keep growing in faith together.
              </p>
            </div>

            {/* Plan Selector */}
            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">
                Select Subscription Plan
              </label>
              
              {/* 6 Months Card */}
              <button
                type="button"
                onClick={() => setSelectedPlan('6months')}
                className={`w-full p-4 rounded-2xl border text-left flex justify-between items-center transition-all ${
                  selectedPlan === '6months'
                    ? 'border-brand-orange bg-brand-orange/5 ring-2 ring-brand-orange/20 scale-[1.01]'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div>
                  <h4 className="font-bold text-gray-900 text-sm">6 Months Plan</h4>
                  <p className="text-[11px] text-gray-500 mt-0.5">Unlimited connections & calling</p>
                </div>
                <div className="text-right">
                  <span className="text-lg font-extrabold text-brand-blue">
                    {isGhana ? '₵150' : '$15'}
                  </span>
                  <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">
                    {isGhana ? '₵25/mo' : '$2.5/mo'}
                  </p>
                </div>
              </button>

              {/* 12 Months Card */}
              <button
                type="button"
                onClick={() => setSelectedPlan('12months')}
                className={`w-full p-4 rounded-2xl border text-left flex justify-between items-center transition-all relative ${
                  selectedPlan === '12months'
                    ? 'border-brand-orange bg-brand-orange/5 ring-2 ring-brand-orange/20 scale-[1.01]'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <span className="absolute -top-2.5 right-4 bg-brand-orange text-white text-[8px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full shadow-sm">
                  Best Value
                </span>
                <div>
                  <h4 className="font-bold text-gray-900 text-sm">12 Months Plan</h4>
                  <p className="text-[11px] text-gray-500 mt-0.5">Year-round blessed connections</p>
                </div>
                <div className="text-right">
                  <span className="text-lg font-extrabold text-brand-blue">
                    {isGhana ? '₵280' : '$28'}
                  </span>
                  <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">
                    {isGhana ? '₵23/mo' : '$2.3/mo'}
                  </p>
                </div>
              </button>
            </div>

            <div className="space-y-3">
              {isGhana ? (
                /* Primary Button for Ghana: Paystack */
                <button 
                  onClick={() => handlePay('paystack')}
                  disabled={processing}
                  className="w-full py-4 bg-brand-blue text-white rounded-xl font-bold text-base flex items-center justify-center gap-2 shadow-md active:scale-95 transition-transform disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {processing ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <CreditCard size={18} />
                      Pay {getPriceText()} with Paystack
                    </>
                  )}
                </button>
              ) : (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-center text-xs font-bold text-amber-800">
                  International card payments are not available yet. No subscription is granted until a verified payment is completed.
                </div>
              )}
              
              <button type="button" onClick={dismiss} className="w-full py-2 text-gray-400 hover:text-gray-500 font-bold text-xs uppercase tracking-wider">Cancel</button>
            </div>

            <div className="flex items-center justify-center gap-2 text-[10px] text-gray-400 font-bold">
              <Shield size={12} />
              <span>Secure encrypted transaction</span>
            </div>
          </div>
        )}

        {step === 'PROCESSING' && (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 border-4 border-brand-orange border-t-transparent rounded-full animate-spin"></div>
            <div>
              <h3 className="text-lg font-bold text-gray-800">Processing Payment...</h3>
              <p className="text-sm text-gray-500">Please wait while we confirm your transaction.</p>
            </div>
            <button type="button" onClick={dismiss} className="rounded-xl border border-gray-200 px-5 py-2 text-sm font-black text-gray-600 hover:bg-gray-50">Cancel</button>
          </div>
        )}

        {step === 'SUCCESS' && (
          <div className="py-10 flex flex-col items-center justify-center text-center space-y-4 animate-in zoom-in duration-300">
            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-2">
              <CheckCircle size={40} />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-800">Payment Successful!</h3>
              <p className="text-sm text-gray-500 mt-1">Your messaging features are now fully unlocked.</p>
            </div>
            <button type="button" onClick={dismiss} className="rounded-xl border border-gray-200 px-5 py-2 text-sm font-black text-gray-600 hover:bg-gray-50">Close</button>
          </div>
        )}

      </div>
    </div>
  );
};

export default PaymentModal;
