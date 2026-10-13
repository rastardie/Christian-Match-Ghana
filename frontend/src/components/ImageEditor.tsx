import React, { useState, useRef, useEffect } from 'react';
import { X, Check, RotateCw, Sun, Contrast, Upload } from 'lucide-react';

interface ImageEditorProps {
  imageSrc: string;
  onCancel: () => void;
  onSave: (editedImage: string) => void;
}

const ImageEditor: React.FC<ImageEditorProps> = ({ imageSrc, onCancel, onSave }) => {
  const [rotation, setRotation] = useState(0);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [filter, setFilter] = useState<'none' | 'grayscale' | 'sepia' | 'warm' | 'cool'>('none');
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    const img = new Image();
    img.src = imageSrc;
    // Attempt to load with anonymous cross-origin to prevent canvas tainting if possible
    img.crossOrigin = "anonymous"; 
    img.onload = () => setImage(img);
  }, [imageSrc]);

  useEffect(() => {
    if (!image || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Adjust canvas dimensions based on rotation
    if (rotation % 180 !== 0) {
      canvas.width = image.height;
      canvas.height = image.width;
    } else {
      canvas.width = image.width;
      canvas.height = image.height;
    }

    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Move to center to rotate
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    
    // Apply filters via ctx.filter string
    let filterString = `brightness(${brightness}%) contrast(${contrast}%)`;
    if (filter === 'grayscale') filterString += ' grayscale(100%)';
    if (filter === 'sepia') filterString += ' sepia(100%)';
    if (filter === 'warm') filterString += ' sepia(50%) saturate(150%)';
    if (filter === 'cool') filterString += ' hue-rotate(180deg) saturate(80%)';
    
    ctx.filter = filterString;

    // Draw image centered
    ctx.drawImage(image, -image.width / 2, -image.height / 2);
    ctx.restore();
  }, [image, rotation, brightness, contrast, filter]);

  const handleSave = () => {
    if (canvasRef.current) {
      onSave(canvasRef.current.toDataURL('image/jpeg', 0.95));
    }
  };

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => setImage(img);
      img.src = result;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black flex flex-col animate-in fade-in">
       {/* Header */}
       <div className="flex justify-between items-center p-4 bg-gray-900 text-white z-10">
         <div className="flex items-center gap-2">
           <button title="Cancel" onClick={onCancel} className="p-2 hover:bg-gray-800 rounded-full"><X size={24} /></button>
           <label className="p-2 hover:bg-gray-800 rounded-full cursor-pointer" title="Upload" aria-label="Upload image">
             <Upload size={20} />
             <input ref={fileInputRef} onChange={handleFileChange} accept="image/*" type="file" className="hidden" aria-label="Upload image file input" />
           </label>
         </div>
         <h3 className="font-bold text-lg">Edit Photo</h3>
         <button title="Save" onClick={handleSave} className="p-2 bg-brand-orange rounded-full hover:bg-brand-darkOrange text-white"><Check size={24} /></button>
       </div>

       {/* Canvas Area */}
       <div className="flex-1 flex items-center justify-center bg-black overflow-hidden p-4 relative">
         <canvas ref={canvasRef} className="max-w-full max-h-full object-contain shadow-2xl" />
       </div>

       {/* Controls */}
       <div className="bg-gray-900 p-6 pb-10 space-y-5 text-white">
          {/* Sliders */}
          <div className="space-y-4">
            <div className="flex items-center gap-4">
               <label htmlFor="brightness-slider" className="flex items-center gap-4 w-full">
                 <Sun size={20} className="text-gray-400 shrink-0" />
                 <input 
                   id="brightness-slider"
                   type="range" 
                   min="50" 
                   max="150" 
                   value={brightness} 
                   onChange={e => setBrightness(Number(e.target.value))} 
                   className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-brand-orange" 
                   aria-label="Brightness" 
                 />
               </label>
            </div>
            <div className="flex items-center gap-4">
              <label htmlFor="contrast-slider" className="flex items-center gap-4 w-full">
                 <Contrast size={20} className="text-gray-400 shrink-0" />
                 <input 
                   id="contrast-slider"
                   type="range" 
                   min="50" 
                   max="150" 
                   value={contrast} 
                   onChange={e => setContrast(Number(e.target.value))} 
                   className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-brand-orange" 
                   aria-label="Contrast" 
                 />
               </label>
            </div>
          </div>

          {/* Filters & Rotate */}
          <div className="flex justify-between items-center border-t border-gray-800 pt-4">
             <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2">
                {['none', 'grayscale', 'sepia', 'warm', 'cool'].map(f => (
                  <button 
                    key={f} 
                    onClick={() => setFilter(f as any)}
                    className={`px-4 py-2 text-xs font-bold rounded-full border transition-colors whitespace-nowrap ${
                      filter === f 
                      ? 'bg-white text-black border-white' 
                      : 'border-gray-700 text-gray-400 hover:border-gray-500'
                    }`}
                  >
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
             </div>
             <div className="w-px h-8 bg-gray-800 mx-2 shrink-0"></div>
             <button 
               title="Rotate"
               onClick={() => setRotation(r => (r + 90) % 360)} 
               className="p-3 bg-gray-800 rounded-full hover:bg-gray-700 text-white shrink-0"
             >
               <RotateCw size={20} />
             </button>
          </div>
       </div>
    </div>
  );
};

export default ImageEditor;