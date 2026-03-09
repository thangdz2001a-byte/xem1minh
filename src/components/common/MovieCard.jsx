import React, { memo } from "react";
import * as Icon from "lucide-react";
import { safeText, formatTime } from "../../utils/helpers";
import SmartImage from "./SmartImage";

const MovieCard = memo(function MovieCard({ m, navigate, progressData, isRow = false, onRemove = null, onClickOverride = null }) {
  if (!m) return null;
  const progData = progressData?.[m.slug];
  const prog = progData?.percentage || 0;
  const thumbSrc = m.thumb_url || m.thumb || m.poster_url;
  
  const voteAverage = m.tmdb?.vote_average;

  return (
    <div
      className={`group/card cursor-pointer flex flex-col shrink-0 relative ${isRow ? "w-[120px] sm:w-[150px] md:w-52 lg:w-60 xl:w-64 snap-start" : ""}`}
      onClick={() => {
        if (onClickOverride) onClickOverride();
        else if (m.slug) { navigate({ type: "detail", slug: m.slug, movieData: m }); window.scrollTo(0, 0); }
      }}
    >
      {onRemove && (
        <button onClick={(e) => { e.stopPropagation(); onRemove(m.slug); }} className="absolute top-1.5 right-1.5 md:top-2 md:right-2 z-30 bg-black/60 hover:bg-[#E50914] text-white p-1 md:p-1.5 rounded-full backdrop-blur-md opacity-0 group-hover/card:opacity-100 transition-all border border-white/10 transform-gpu">
          <Icon.X size={12} className="md:w-[14px] md:h-[14px]" strokeWidth={3} />
        </button>
      )}
      
      <div className="relative overflow-hidden rounded-xl aspect-[2/3] bg-[#111] shadow-xl border border-white/5 transform-gpu">
        <SmartImage 
          src={thumbSrc} 
          className="w-full h-full object-cover transition-transform duration-500 group-hover/card:scale-110 transform-gpu will-change-transform" 
          alt={safeText(m.name)} 
          loading="lazy" // <--- ĐÃ THÊM LAZY LOAD GIÚP TRANG CUỘN MƯỢT HƠN
        />
        
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/card:opacity-100 transition-opacity duration-500 z-20 pointer-events-none will-change-opacity" />
        
        <div className="absolute top-1.5 left-1.5 md:top-2 md:left-2 bg-[#E50914] text-white text-[8px] md:text-[10px] px-1.5 md:px-2 py-0.5 rounded font-black uppercase shadow-lg tracking-widest z-10">
          {safeText(m.quality, "HD")}
        </div>

        {prog > 0 && prog < 99 && (
          <>
            <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-10 pointer-events-none" />
            <div className="absolute bottom-2 md:bottom-3 left-0 w-full flex justify-center items-center z-20 pointer-events-none px-1">
              <span className="text-[9px] md:text-[11px] font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] tracking-wider truncate">
                {safeText(String(progData.episodeSlug || "").toUpperCase().replace("TAP-", "TẬP ").replace("FULL", "FULL").replace(/['"]/g, '').trim())} • {formatTime(progData.currentTime)}
              </span>
            </div>
            <div className="absolute bottom-0 left-0 w-full h-1 md:h-1.5 bg-gray-500/80 z-20">
              <div className="h-full bg-[#E50914]" style={{ width: `${prog}%` }} />
            </div>
          </>
        )}
      </div>
      
      <div className="mt-2 md:mt-3 flex flex-col flex-1 px-1">
        <h3 className="text-[12px] sm:text-[13px] md:text-[15px] font-bold text-gray-200 line-clamp-2 group-hover/card:text-white transition-colors uppercase tracking-tight">{safeText(m.name)}</h3>
        
        <div className="flex items-center justify-between mt-1.5 gap-2">
          <div className="flex items-center gap-1.5 text-[9px] sm:text-[10px] md:text-[11px] text-gray-500 font-medium min-w-0">
            <span className="shrink-0">{safeText(m.year, "2025")}</span>
            {!prog && m.episode_current && (
              <>
                <span className="shrink-0 text-gray-700">•</span>
                <span className="text-[#E50914] font-bold truncate">
                  {safeText(m.episode_current)}
                </span>
              </>
            )}
          </div>

          {voteAverage && !isNaN(Number(voteAverage)) ? (
            <span className="flex items-center gap-1 text-[#f5c518] text-[9px] sm:text-[10px] md:text-[11px] font-bold shrink-0">
              <Icon.Star fill="currentColor" size={10} className="md:w-[12px] md:h-[12px]" /> {Number(voteAverage).toFixed(1)}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
});

export default MovieCard;