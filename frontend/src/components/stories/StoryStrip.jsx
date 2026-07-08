import { Image as ImageIcon, Plus } from "@phosphor-icons/react";
import { getApiUrl } from "../../api";
import { motion } from "framer-motion";

export default function StoryStrip({ user, stories, onStoryClick, onAddStory, uploadingStory, onTriggerRecap }) {
  const listStories = stories || [];

  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-display text-xs font-bold text-stone-800 dark:text-stone-200 flex items-center gap-1.5 uppercase tracking-wider">
          <ImageIcon size={14} className="text-coral-500" weight="fill" />
          Khoảnh khắc 24h
        </h3>
        <button
          onClick={onAddStory}
          disabled={uploadingStory}
          className="text-[9px] font-bold uppercase tracking-wider text-coral-500 hover:text-coral-600 cursor-pointer disabled:opacity-50 transition-colors"
        >
          {uploadingStory ? "Đang đăng..." : "+ Đăng tin"}
        </button>
      </div>
      
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none -mx-4 px-4 mask-edge-fade">
        {/* Add Story Button Card */}
        <motion.div
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={onAddStory}
          className="flex-shrink-0 w-24 h-36 rounded-2xl relative overflow-hidden bg-white/80 dark:bg-stone-900/40 border border-dashed border-coral-300 dark:border-coral-500/50 shadow-sm cursor-pointer flex flex-col items-center justify-center gap-1.5 group transition-colors hover:border-coral-500 dark:hover:border-coral-400"
        >
          <div className="absolute inset-0 bg-stone-50/50 dark:bg-stone-950/20 group-hover:bg-coral-50/10 dark:group-hover:bg-coral-500/5 transition-colors" />
          {user?.AvatarUrl && (
            <img 
              src={user.AvatarUrl} 
              alt="" 
              className="absolute inset-0 w-full h-full object-cover opacity-20 blur-[1px] group-hover:opacity-30 transition-opacity" 
            />
          )}
          <div className="w-8 h-8 rounded-full bg-coral-500 flex items-center justify-center text-white shadow-md shadow-coral-500/25 group-hover:scale-110 transition-transform relative z-10">
            <Plus size={16} weight="bold" />
          </div>
          <span className="text-[9px] font-bold text-coral-500 dark:text-coral-400 relative z-10 uppercase tracking-wider">Đăng tin</span>
        </motion.div>

        {/* Play Story Recap Bubble */}
        <motion.button
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={onTriggerRecap}
          className="flex-shrink-0 w-24 h-36 rounded-2xl relative overflow-hidden bg-gradient-to-tr from-coral-500 to-amber-400 border border-coral-400/20 flex flex-col justify-between p-3 text-left shadow-lg cursor-pointer group"
        >
          <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/30 shadow-inner group-hover:scale-110 transition-transform">
            ▶️
          </div>
          <span className="text-[10px] font-bold text-white leading-tight drop-shadow-md">Xem lại Kỷ niệm</span>
        </motion.button>

        {/* List of active stories grouped by user */}
        {listStories.map((group, index) => {
          const firstItem = group.Items?.[0];
          if (!firstItem) return null;
          return (
            <motion.div
              key={group.UserId}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onStoryClick(index)}
              className="flex-shrink-0 w-24 h-36 rounded-2xl relative overflow-hidden bg-stone-900 border border-stone-200/20 shadow-md cursor-pointer flex flex-col justify-between group"
            >
              <img
                src={getApiUrl(firstItem.ImageUrl)}
                alt="Story"
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 select-none"
              />
              {/* Top avatar preview of owner */}
              <div className="p-2 relative z-10 flex">
                <div className="w-7 h-7 rounded-full p-0.5 bg-gradient-to-tr from-yellow-400 via-pink-500 to-coral-500 shadow-sm">
                  <img 
                    src={group.AvatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${group.Username}`} 
                    alt="" 
                    className="w-full h-full rounded-full border border-black/10 object-cover bg-stone-800" 
                  />
                </div>
              </div>

              {/* Bottom info text */}
              <div className="p-2 relative z-10 w-full">
                <p className="text-[9px] font-bold text-white truncate leading-tight drop-shadow-md">
                  {group.UserId === user.UserId ? "Tin của bạn" : group.Username}
                </p>
              </div>
              
              {/* Dark gradient for text readability */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-black/30 opacity-70 group-hover:opacity-85 transition-opacity pointer-events-none" />
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
