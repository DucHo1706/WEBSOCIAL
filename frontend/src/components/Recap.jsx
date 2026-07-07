import React, { useState, useEffect } from "react";
import { getApiUrl } from "../api";
import { X, CaretLeft, CaretRight, Sparkle, Smiley } from "@phosphor-icons/react";

export default function Recap({ memories, onClose }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  // We want to filter memories that have images (our slide highlights)
  const slides = memories.filter(m => m.ImageUrl);

  useEffect(() => {
    if (slides.length === 0) return;

    setProgress(0);
    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          handleNext();
          return 0;
        }
        return p + 2; // increments progress
      });
    }, 100); // 5 seconds per slide (50 * 100ms)

    return () => clearInterval(interval);
  }, [currentIndex, slides.length]);

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // Loop back or close
      setCurrentIndex(0);
      setProgress(0);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    } else {
      setCurrentIndex(slides.length - 1);
    }
    setProgress(0);
  };

  const getCategoryVietnamese = (cat) => {
    if (cat === "Birthday") return "🎂 Sinh Nhật";
    if (cat === "Travel") return "✈️ Du Lịch";
    if (cat === "Milestone") return "🏆 Cột Mốc";
    return "🏡 Đời Thường";
  };

  if (slides.length === 0) {
    return (
      <div className="fixed inset-0 bg-stone-900 z-50 flex flex-col items-center justify-center text-white p-6">
        <button onClick={onClose} className="absolute top-6 right-6 text-white cursor-pointer">
          <X size={24} />
        </button>
        <Smiley size={48} className="text-coral-500 mb-4" />
        <h3 className="text-xl font-bold font-display">Chưa Có Kỷ Niệm Nào</h3>
        <p className="text-sm text-stone-400 mt-1 text-center">Hãy chia sẻ một vài bức ảnh kỷ niệm vào nhóm trước để xem trình chiếu!</p>
      </div>
    );
  }

  const currentSlide = slides[currentIndex];

  return (
    <div className="fixed inset-0 bg-stone-950 z-50 flex flex-col items-center justify-center select-none">
      {/* Progress Bars */}
      <div className="absolute top-4 left-4 right-4 flex gap-1 z-35">
        {slides.map((_, index) => {
          let width = "0%";
          if (index < currentIndex) width = "100%";
          if (index === currentIndex) width = `${progress}%`;
          return (
            <div key={index} className="flex-1 h-1 bg-stone-700/50 rounded-full overflow-hidden">
              <div 
                style={{ width }} 
                className="h-full bg-white transition-all duration-100 ease-linear"
              />
            </div>
          );
        })}
      </div>

      {/* Top Header */}
      <div className="absolute top-8 left-4 right-4 flex justify-between items-center z-35 text-white">
        <div className="flex items-center gap-2">
          <img 
            src={currentSlide.User?.AvatarUrl} 
            alt={currentSlide.User?.Username}
            className="w-8 h-8 rounded-full border border-white"
          />
          <div>
            <span className="text-xs font-bold block">{currentSlide.User?.Username}</span>
            <span className="text-[9px] text-stone-400 block uppercase tracking-wider">{getCategoryVietnamese(currentSlide.Category)}</span>
          </div>
        </div>
        <button 
          onClick={onClose} 
          className="w-8 h-8 bg-stone-900/60 backdrop-blur-md rounded-full flex items-center justify-center text-white cursor-pointer"
        >
          <X size={18} />
        </button>
      </div>

      {/* Slide Image */}
      <div className="w-full h-full relative flex items-center justify-center overflow-hidden">
        <img 
          src={getApiUrl(currentSlide.ImageUrl)} 
          alt={currentSlide.Caption} 
          className="w-full h-full object-cover select-none"
        />

        {/* Bottom Caption overlay */}
        {currentSlide.Caption && (
          <div className="absolute bottom-16 left-4 right-4 bg-stone-950/70 backdrop-blur-md border border-stone-800 p-4 rounded-2xl text-white">
            <p className="text-xs font-medium text-stone-300 uppercase tracking-widest flex items-center gap-1 mb-1">
              <Sparkle size={12} className="text-coral-500" />
              Xem Lại Kỷ Niệm
            </p>
            <p className="text-sm leading-relaxed">{currentSlide.Caption}</p>
          </div>
        )}

        {/* Nav Taps (Left 30% width taps prev, Right 30% width taps next) */}
        <div 
          onClick={handlePrev} 
          className="absolute top-0 bottom-0 left-0 w-[30%] z-20 cursor-pointer"
        />
        <div 
          onClick={handleNext} 
          className="absolute top-0 bottom-0 right-0 w-[30%] z-20 cursor-pointer"
        />

        {/* Visual Carets (visible feedback) */}
        <button 
          onClick={handlePrev}
          className="absolute left-4 w-10 h-10 bg-stone-900/50 backdrop-blur-xs rounded-full flex items-center justify-center text-white z-30 cursor-pointer opacity-30 hover:opacity-100 transition-opacity"
        >
          <CaretLeft size={20} />
        </button>
        <button 
          onClick={handleNext}
          className="absolute right-4 w-10 h-10 bg-stone-900/50 backdrop-blur-xs rounded-full flex items-center justify-center text-white z-30 cursor-pointer opacity-30 hover:opacity-100 transition-opacity"
        >
          <CaretRight size={20} />
        </button>
      </div>
    </div>
  );
}
