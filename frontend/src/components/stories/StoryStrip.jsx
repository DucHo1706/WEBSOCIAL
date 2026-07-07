import { Plus, X, Image as ImageIcon } from "@phosphor-icons/react";
import { getApiUrl } from "../../api";

export default function StoryStrip({ user, stories, onStoryClick, onAddStory, uploadingStory }) {
  if (!stories || stories.length === 0) return null;

  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-display text-sm font-bold text-app flex items-center gap-1.5">
          <ImageIcon size={16} className="text-coral-500" weight="fill" />
          Tin 24h
        </h3>
        <button
          onClick={onAddStory}
          disabled={uploadingStory}
          className="text-[9px] font-bold text-coral-500 hover:text-coral-600 cursor-pointer disabled:opacity-50"
        >
          {uploadingStory ? "Đang đăng..." : "+ Đăng tin"}
        </button>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none -mx-4 px-4">
        <div
          onClick={onAddStory}
          className="flex-shrink-0 w-24 h-36 rounded-2xl relative overflow-hidden bg-white dark:bg-[#1C1C1E] border-2 border-dashed border-coral-300 dark:border-coral-500 shadow-sm cursor-pointer hover:scale-102 transition-transform flex flex-col items-center justify-center gap-1 group"
        >
          <div className="w-8 h-8 rounded-full bg-coral-500 flex items-center justify-center text-white group-hover:scale-110 transition-transform">
            <Plus size={16} weight="bold" />
          </div>
          <span className="text-[9px] font-bold text-coral-500">Đăng tin</span>
        </div>
        {stories.map((story) => (
          <div
            key={story.StoryId}
            onClick={() => onStoryClick(story)}
            className="flex-shrink-0 w-24 h-36 rounded-2xl relative overflow-hidden bg-white dark:bg-[#1C1C1E] border border-custom shadow-sm cursor-pointer hover:scale-102 transition-transform flex flex-col justify-between group"
          >
            <div className="h-[70%] w-full overflow-hidden bg-stone-100 dark:bg-[#2C2C2E]">
              <img
                src={getApiUrl(story.ImageUrl)}
                alt={story.Caption || "Story"}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-1.5">
              <p className="text-[8px] font-bold text-app truncate leading-tight">
                {story.User?.Username}
              </p>
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
          </div>
        ))}
      </div>
    </div>
  );
}
