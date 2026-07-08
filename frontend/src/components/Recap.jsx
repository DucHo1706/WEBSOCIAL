import React, { useState, useEffect } from "react";
import { getApiUrl } from "../api";
import { X, CaretLeft, CaretRight, Sparkle, Smiley } from "@phosphor-icons/react";
import { motion, AnimatePresence } from "framer-motion";

export default function Recap({ memories, onClose }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  // Filter memories that have at least one image
  const slides = memories.filter(m => m.ImageUrl || (m.Images && m.Images.length > 0));

  useEffect(() => {
    if (slides.length === 0) return;

    setProgress(0);
    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          handleNext();
          return 0;
        }
        return p + 1.5; // smooth increment
      });
    }, 75); // ~5 seconds per slide (66 steps * 75ms)

    return () => clearInterval(interval);
  }, [currentIndex, slides.length]);

  const handleNext = () => {
    setCurrentIndex(prev => (prev < slides.length - 1 ? prev + 1 : 0));
    setProgress(0);
  };

  const handlePrev = () => {
    setCurrentIndex(prev => (prev > 0 ? prev - 1 : slides.length - 1));
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
      <div className="fixed inset-0 bg-stone-950 z-55 flex flex-col items-center justify-center text-white p-6 backdrop-blur-xl">
        <button onClick={onClose} className="absolute top-6 right-6 text-stone-400 hover:text-white cursor-pointer transition-colors p-2 hover:bg-white/10 rounded-full">
          <X size={24} />
        </button>
        <Smiley size={48} className="text-coral-500 mb-4 animate-bounce" />
        <h3 className="text-xl font-bold font-display">Chưa Có Kỷ Niệm Nào</h3>
        <p className="text-xs text-stone-400 mt-1 text-center max-w-[28ch]">Hãy chia sẻ một vài bức ảnh kỷ niệm vào nhóm trước để xem trình chiếu!</p>
      </div>
    );
  }

  const currentSlide = slides[currentIndex];
  const slideImageUrl = currentSlide.Images?.[0] || currentSlide.ImageUrl;

  return (
    <div className="fixed inset-0 bg-stone-950 z-55 flex flex-col items-center justify-center select-none overflow-hidden">
      {/* Immersive Blurred Background for visual depth */}
      <div className="absolute inset-0 z-0 select-none pointer-events-none">
        <img 
          src={getApiUrl(slideImageUrl)} 
          alt="" 
          className="w-full h-full object-cover blur-2xl opacity-35 scale-110 transition-all duration-700" 
        />
        <div className="absolute inset-0 bg-black/60" />
      </div>

      {/* Progress Bars Indicator */}
      <div className="absolute top-4 left-4 right-4 flex gap-1.5 z-35">
        {slides.map((_, index) => {
          let width = "0%";
          if (index < currentIndex) width = "100%";
          if (index === currentIndex) width = `${progress}%`;
          return (
            <div key={index} className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden backdrop-blur-xs">
              <div 
                style={{ width }} 
                className="h-full bg-white transition-all duration-75 ease-linear"
              />
            </div>
          );
        })}
      </div>

      {/* Top Header Controls */}
      <div className="absolute top-8 left-4 right-4 flex justify-between items-center z-35 text-white max-w-md mx-auto w-full px-2">
        <div className="flex items-center gap-2">
          <img 
            src={currentSlide.User?.AvatarUrl} 
            alt={currentSlide.User?.Username}
            className="w-8 h-8 rounded-full border border-white/20 shadow-md object-cover bg-stone-800"
          />
          <div>
            <span className="text-xs font-bold block drop-shadow-md">{currentSlide.User?.Username}</span>
            <span className="text-[9px] text-stone-300 font-semibold block uppercase tracking-wider drop-shadow-sm">{getCategoryVietnamese(currentSlide.Category)}</span>
          </div>
        </div>
        <button 
          onClick={onClose} 
          className="w-8 h-8 bg-stone-900/60 hover:bg-stone-900/90 backdrop-blur-md rounded-full flex items-center justify-center text-white cursor-pointer border border-white/10 shadow transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* Image Container with Slider Animation */}
      <div className="w-full h-full max-w-md relative flex items-center justify-center z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.35, ease: "easeInOut" }}
            className="w-full h-[70vh] flex items-center justify-center relative px-4"
          >
            <div className="w-full h-full rounded-3xl overflow-hidden shadow-2xl border border-white/10 bg-stone-900 relative">
              <img 
                src={getApiUrl(slideImageUrl)} 
                alt={currentSlide.Caption} 
                className="w-full h-full object-cover select-none pointer-events-none"
              />
            </div>

            {/* Bottom Caption Overlay */}
            {currentSlide.Caption && (
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.3 }}
                className="absolute bottom-6 left-8 right-8 bg-black/70 backdrop-blur-md border border-white/10 p-4 rounded-2xl text-white shadow-xl max-w-sm mx-auto"
              >
                <p className="text-[9px] font-bold text-coral-400 uppercase tracking-widest flex items-center gap-1.5 mb-1.5">
                  <Sparkle size={12} weight="fill" className="text-coral-500 animate-pulse" />
                  Ghi chú kỷ niệm
                </p>
                <p className="text-xs leading-relaxed font-medium">{currentSlide.Caption}</p>
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation Taps Overlay (Invisible Touch Zones) */}
        <div 
          onClick={handlePrev} 
          className="absolute top-0 bottom-0 left-0 w-[30%] z-20 cursor-pointer"
          title="Xem ảnh trước"
        />
        <div 
          onClick={handleNext} 
          className="absolute top-0 bottom-0 right-0 w-[30%] z-20 cursor-pointer"
          title="Xem ảnh sau"
        />

        {/* Visible Arrow Buttons */}
        <button 
          onClick={handlePrev}
          className="absolute left-6 w-10 h-10 bg-stone-900/60 hover:bg-stone-900/80 backdrop-blur-md rounded-full flex items-center justify-center text-white z-30 cursor-pointer opacity-30 hover:opacity-100 transition-all border border-white/10"
        >
          <CaretLeft size={20} weight="bold" />
        </button>
        <button 
          onClick={handleNext}
          className="absolute right-6 w-10 h-10 bg-stone-900/60 hover:bg-stone-900/80 backdrop-blur-md rounded-full flex items-center justify-center text-white z-30 cursor-pointer opacity-30 hover:opacity-100 transition-all border border-white/10"
        >
          <CaretRight size={20} weight="bold" />
        </button>
      </div>
    </div>
  );
}
