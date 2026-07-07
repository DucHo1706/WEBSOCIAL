import {
  Sparkle,
  CalendarBlank,
  Clock,
  Users,
  Star,
  Heart,
  Image as ImageIcon,
  MagicWand,
  Fire,
  Trophy,
  Gift,
} from "@phosphor-icons/react";

const recapIcons = {
  "🎉": <Sparkle size={14} weight="fill" />,
  "📅": <CalendarBlank size={14} />,
  "⏰": <Clock size={14} />,
  "👥": <Users size={14} />,
  "⭐": <Star size={14} weight="fill" />,
  "❤️": <Heart size={14} weight="fill" />,
  "📸": <ImageIcon size={14} />,
  "✨": <MagicWand size={14} />,
  "🔥": <Fire size={14} />,
  "🏆": <Trophy size={14} />,
  "🎁": <Gift size={14} />,
};

export default function RecapTimeline({ recaps, onDismiss }) {
  if (!recaps || recaps.length === 0) return null;

  return (
    <div className="mb-6 bg-card-custom rounded-3xl p-4 border border-coral-100/40 shadow-sm">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-display text-xs font-bold text-app flex items-center gap-1.5">
          <Sparkle size={14} className="text-coral-500" weight="fill" />
          Kỷ niệm gần đây
        </h3>
        {onDismiss && (
          <button onClick={onDismiss} className="text-[9px] text-secondary-custom hover:text-coral-500 cursor-pointer font-semibold">
            Ẩn
          </button>
        )}
      </div>
      <div className="space-y-2">
        {recaps.slice(0, 4).map((recap, idx) => (
          <div
            key={idx}
            className="flex items-center gap-3 p-2.5 rounded-2xl bg-stone-50/50 dark:bg-[#1c1c1e] border border-stone-100 dark:border-stone-700"
          >
            <span className="w-8 h-8 rounded-full bg-coral-50 dark:bg-coral-500/10 flex items-center justify-center text-sm">
              {recapIcons[recap.icon] || recap.icon || "📌"}
            </span>
            <div className="flex-1">
              <p className="text-[11px] font-bold text-app">{recap.title}</p>
              <p className="text-[9px] text-secondary-custom">{recap.subtitle}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
