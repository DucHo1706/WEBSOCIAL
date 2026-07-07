import { X } from "@phosphor-icons/react";
import { getApiUrl } from "../../api";

export default function Lightbox({ imageUrl, onClose }) {
  if (!imageUrl) return null;

  return (
    <div className="lightbox-overlay" onClick={onClose}>
      <img src={getApiUrl(imageUrl)} alt="Xem ảnh" onClick={(e) => e.stopPropagation()} />
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center text-lg cursor-pointer transition-colors"
      >
        ✕
      </button>
    </div>
  );
}
