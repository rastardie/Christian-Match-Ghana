import React, { useState, useRef, useEffect } from 'react';
import { X, Check, ZoomIn, Move, Maximize2, RotateCw } from 'lucide-react';

interface ImageCropperProps {
  imageSrc: string;
  onCancel: () => void;
  onCrop: (croppedImage: string) => void;
  aspectRatio?: number; // width / height
}

const ImageCropper: React.FC<ImageCropperProps> = ({ imageSrc, onCancel, onCrop, aspectRatio = 1 }) => {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      e.preventDefault();
      setOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    const touch = e.touches[0];
    setDragStart({ x: touch.clientX - offset.x, y: touch.clientY - offset.y });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDragging) {
      const touch = e.touches[0];
      setOffset({
        x: touch.clientX - dragStart.x,
        y: touch.clientY - dragStart.y
      });
    }
  };

  const handleCrop = () => {
     const canvas = document.createElement('canvas');
     const ctx = canvas.getContext('2d');
     if (!ctx || !imageRef.current || !containerRef.current) return;

     const baseWidth = 1200;
     canvas.width = baseWidth;
     canvas.height = baseWidth / aspectRatio;
     
     ctx.fillStyle = '#000000';
     ctx.fillRect(0, 0, canvas.width, canvas.height);

     const img = imageRef.current;
     const scaleX = canvas.width / img.naturalWidth;
     const scaleY = canvas.height / img.naturalHeight;
     const baseScale = Math.max(scaleX, scaleY);
     
     const uiWidth = containerRef.current.clientWidth;
     const uiToCanvasRatio = canvas.width / uiWidth;

     ctx.save();
     // Move to canvas center to perform transformations centered
     ctx.translate(canvas.width / 2, canvas.height / 2);
     // Apply translation offset from UI dragging
     ctx.translate(offset.x * uiToCanvasRatio, offset.y * uiToCanvasRatio);
     // Apply rotation
     ctx.rotate((rotation * Math.PI) / 180);
     // Apply scaling
     ctx.scale(baseScale * zoom, baseScale * zoom);
     // Translate back to draw image centered
     ctx.translate(-img.naturalWidth / 2, -img.naturalHeight / 2);
     ctx.drawImage(img, 0, 0);
     ctx.restore();

     onCrop(canvas.toDataURL('image/jpeg', 0.92));
  };

  return (
    <div className="fixed inset-0 z-[500] bg-black flex flex-col animate-in fade-in duration-200 select-none">
      <div className="flex justify-between items-center p-6 text-white z-10 bg-gradient-to-b from-black/90 to-transparent">
        <button title="Cancel" onClick={onCancel} className="p-3 rounded-2xl bg-white/10 backdrop-blur-md active:scale-90 transition-transform">
          <X size={24} />
        </button>
        <h3 className="font-black uppercase tracking-[0.2em] text-[10px]">Adjust Frame</h3>
        <button title="Crop" onClick={handleCrop} className="p-3 rounded-2xl bg-brand-orange text-white shadow-xl shadow-brand-orange/40 active:scale-95 transition-transform">
          <Check size={24} />
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div
          ref={containerRef}
          className={`cropper-container ${isDragging ? 'dragging' : ''} ${aspectRatio === 1 ? 'cropper-rounded-full' : ''}`}
          style={{ ['--aspect-ratio' as any]: `${aspectRatio}` }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleMouseUp}
        >
          <img
            ref={imageRef}
            src={imageSrc}
            alt="Target"
            draggable={false}
            className={`cropper-image ${isDragging ? 'dragging' : ''}`}
            style={{ 
              ['--offset-x' as any]: `${offset.x}px`, 
              ['--offset-y' as any]: `${offset.y}px`, 
              ['--zoom' as any]: `${zoom}`,
              transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px) scale(${zoom}) rotate(${rotation}deg)` 
            }}
          />

          {/* Rule of Thirds Grid Lines */}
          <div className={`absolute inset-0 pointer-events-none transition-opacity duration-300 ${isDragging ? 'opacity-40' : 'opacity-0'}`}>
            <div className="absolute top-1/3 left-0 right-0 h-[1px] bg-white"></div>
            <div className="absolute top-2/3 left-0 right-0 h-[1px] bg-white"></div>
            <div className="absolute left-1/3 top-0 bottom-0 w-[1px] bg-white"></div>
            <div className="absolute left-2/3 top-0 bottom-0 w-[1px] bg-white"></div>
          </div>

          {/* Centering Guide Overlay */}
          <div className={`absolute inset-0 pointer-events-none border border-white/20 flex items-center justify-center transition-colors duration-300 ${isDragging ? 'bg-black/10' : ''}`}>
             <div className={`w-8 h-[2px] absolute transition-colors ${isDragging ? 'bg-brand-orange' : 'bg-white/40'}`}></div>
             <div className={`h-8 w-[2px] absolute transition-colors ${isDragging ? 'bg-brand-orange' : 'bg-white/40'}`}></div>
          </div>
        </div>
      </div>

      <div className="bg-gray-900 p-8 pb-12 rounded-t-[3rem] border-t border-white/5">
        <div className="flex flex-col gap-4 max-w-xs mx-auto">
          <div className="flex justify-between items-center px-1">
            <div className="flex items-center gap-2 text-gray-500">
              <ZoomIn size={16} />
              <label htmlFor="zoom-slider" className="text-[10px] font-black uppercase tracking-widest">Zoom</label>
            </div>
            <span className="text-xs font-black text-brand-orange tabular-nums">{Math.round(zoom * 100)}%</span>
          </div>
          
          <div className="relative flex items-center h-6">
            <input 
              id="zoom-slider"
              type="range" min="1" max="3" step="0.01" value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-brand-orange relative z-10"
              aria-label="Zoom"
            />
            {/* Custom track fill emulation */}
            <div className="cropper-track-fill" style={{ ['--zoom-fill' as any]: `${((zoom - 1) / 2) * 100}%` }}></div>
          </div>
        </div>

        <div className="mt-8 flex items-center justify-center gap-3">
          <div className={`flex items-center gap-2 transition-all duration-300 ${isDragging ? 'text-brand-orange scale-110' : 'text-gray-600'}`}>
            <Move size={14} />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Drag to Center</span>
          </div>
          <div className="h-4 w-[1px] bg-white/10 mx-1"></div>
          <button 
            title="Rotate 90 degrees"
            onClick={() => setRotation((prev) => (prev + 90) % 360)}
            className="text-[10px] font-black text-gray-400 hover:text-white uppercase tracking-widest flex items-center gap-2 active:scale-90 transition-all animate-none"
          >
            <RotateCw size={12} />
            Rotate
          </button>
          <div className="h-4 w-[1px] bg-white/10 mx-1"></div>
          <button 
            title="Reset zoom and position"
            onClick={() => { setZoom(1); setOffset({x: 0, y: 0}); setRotation(0); }}
            className="text-[10px] font-black text-gray-400 hover:text-white uppercase tracking-widest flex items-center gap-2 active:scale-90 transition-all"
          >
            <Maximize2 size={12} />
            Reset
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImageCropper;
