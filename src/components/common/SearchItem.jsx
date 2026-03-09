import React, { memo } from "react";
import * as Icon from "lucide-react";
import { safeText } from "../../utils/helpers";
import SmartImage from "./SmartImage";

const SearchItem = memo(function SearchItem({ m, navigate, onClose }) {
  if (!m) return null; 
  
  return (
    <div
      onClick={() => {
        if(m.slug) {
            navigate({ type: "detail", slug: m.slug, movieData: m });
            onClose();
            window.scrollTo(0, 0);
        }
      }}
      className="flex gap-4 p-4 hover:bg-white/5 rounded-xl cursor-pointer transition border-b border-white/5 last:border-0 group/card"
    >
      <div className="w-16 md:w-20 shrink-0 aspect-[2/3] rounded-lg overflow-hidden bg-[#111] shadow-lg transform-gpu">
        <SmartImage
          src={m.thumb_url || m.poster_url}
          className="w-full h-full object-cover group-hover/card:scale-105 transition-transform duration-300 transform-gpu will-change-transform"
          alt={safeText(m.name)}
        />
      </div>
      <div className="flex flex-col justify-center py-1">
        <h4 className="text-base md:text-lg font-bold text-white mb-1 line-clamp-1">{safeText(m.name)}</h4>
        <p className="text-xs md:text-sm text-gray-400 mb-2.5">{safeText(m.origin_name || m.original_name)} • {safeText(m.year)}</p>
        <div className="flex flex-wrap items-center gap-2 text-[11px] md:text-xs text-gray-400 font-medium">
          <span className="text-gray-300">{safeText(m.quality, "HD")}</span>
          <span>•</span>
          <span>{safeText(m.episode_current, "Đang cập nhật")}</span>
          {m.tmdb?.vote_average && !isNaN(Number(m.tmdb.vote_average)) ? (
            <>
              <span>•</span>
              <span className="flex items-center gap-1 text-[#f5c518] font-bold">
                <Icon.Star fill="currentColor" size={12} /> {Number(m.tmdb.vote_average).toFixed(1)}
              </span>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
});

export default SearchItem;