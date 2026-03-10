import React, { memo } from "react";
import * as Icon from "lucide-react";
import { safeText, formatTime } from "../../utils/helpers";
import SmartImage from "./SmartImage";

const MovieCard = memo(function MovieCard({
  m,
  navigate,
  progressData,
  isRow = false,
  onRemove = null,
  onClickOverride = null
}) {
  if (!m) return null;

  const progData = progressData?.[m.slug] || {};
  const rawProg = Number(progData?.percentage || 0);
  const prog = Math.max(0, Math.min(100, rawProg));

  const thumbSrc = m.thumb_url || m.thumb || m.poster_url || "";
  const voteAverage = m.tmdb?.vote_average;
  const hasVote = voteAverage && !isNaN(Number(voteAverage));
  
  // Lấy tên tiếng anh / tên gốc
  const originName = m.origin_name || m.original_name || "";

  const handleOpen = () => {
    if (onClickOverride) {
      onClickOverride();
      return;
    }

    if (m.slug) {
      navigate({ type: "detail", slug: m.slug, movieData: { item: m } });
      window.scrollTo(0, 0);
    }
  };

  const handleRemove = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (typeof onRemove === "function" && m.slug) {
      onRemove(m.slug);
    }
  };

  const progressLabel = safeText(
    String(progData?.episode_name || progData?.episodeSlug || "")
      .toUpperCase()
      .replace("TAP-", "TẬP ")
      .replace(/['"]/g, "")
      .trim()
  );

  return (
    <div
      className={`group/card cursor-pointer flex flex-col shrink-0 relative ${
        isRow ? "w-[120px] sm:w-[150px] md:w-52 lg:w-60 xl:w-64 snap-start" : ""
      }`}
      onClick={handleOpen}
      style={{ perspective: "1200px" }}
    >
      {onRemove && (
        <button
          type="button"
          aria-label="Xóa khỏi tiếp tục xem"
          onClick={handleRemove}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          className="absolute top-2 right-2 z-50 bg-[#E50914] hover:bg-[#ff1a1a] text-white p-2 rounded-full shadow-[0_10px_28px_rgba(229,9,20,0.42)] transition-all border border-white/10 opacity-100 md:opacity-0 md:group-hover/card:opacity-100 hover:scale-110 active:scale-95"
        >
          <Icon.X size={14} className="md:w-[16px] md:h-[16px]" strokeWidth={3} />
        </button>
      )}

      <div className="relative rounded-xl transition-all duration-300 [transform-style:preserve-3d] group-hover/card:[transform:translateZ(24px)_rotateX(3deg)_rotateY(-3deg)]">
        <div className="relative overflow-hidden rounded-xl aspect-[2/3] bg-[#111] shadow-xl border border-white/5 transition-all duration-300 group-hover/card:shadow-[0_20px_45px_rgba(0,0,0,0.55)] group-hover/card:border-white/15">
          <SmartImage
            src={thumbSrc}
            className="w-full h-full object-cover"
            alt={safeText(m.name, "Movie")}
            loading="lazy"
            decoding="async"
            fetchPriority="low"
          />

          {prog > 0 && prog < 99 && (
            <>
              <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-10 pointer-events-none" />

              <div className="absolute bottom-2 md:bottom-3 left-0 w-full flex justify-between items-center z-20 pointer-events-none px-2 md:px-3">
                <span className="text-[9px] md:text-[11px] font-bold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] tracking-wider truncate max-w-full">
                  {progressLabel || `${Math.round(prog)}% đã xem`}
                </span>
                {progData?.currentTime > 0 && (
                  <span className="text-[9px] md:text-[11px] font-mono font-bold text-white/90 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] shrink-0 ml-1">
                    {formatTime(progData.currentTime)}
                  </span>
                )}
              </div>

              <div className="absolute bottom-0 left-0 w-full h-1 md:h-1.5 bg-white/20 z-20">
                <div
                  className="h-full bg-[#E50914] transition-all duration-300"
                  style={{ width: `${prog}%` }}
                />
              </div>
            </>
          )}
        </div>
      </div>

      <div className="mt-2 md:mt-3 flex flex-col flex-1 px-1">
        <h3 className="text-[12px] sm:text-[13px] md:text-[15px] font-bold text-gray-200 line-clamp-2 transition-colors uppercase tracking-tight group-hover/card:text-[#E50914]">
          {safeText(m.name)}
        </h3>

        {/* HIỂN THỊ TÊN TIẾNG ANH (TÊN GỐC) */}
        {originName && originName.toLowerCase() !== m.name?.toLowerCase() && (
          <p className="text-[10px] md:text-[12px] text-gray-400 mt-1 truncate">
            {originName}
          </p>
        )}

        <div className="flex items-center justify-between mt-1.5 gap-2">
          <div className="flex items-center gap-1.5 text-[9px] sm:text-[10px] md:text-[11px] text-gray-500 font-medium min-w-0 flex-wrap">
            <span className="shrink-0">{safeText(m.year, "2025")}</span>

            <span className="bg-[#E50914] text-white text-[8px] md:text-[9px] px-1.5 py-[1px] rounded-[4px] font-black uppercase tracking-wide shrink-0">
              {safeText(m.quality, "HD")}
            </span>

            {!prog && m.episode_current && (
              <>
                <span className="shrink-0 text-gray-700">•</span>
                <span className="text-[#E50914] font-bold truncate max-w-[80px]">
                  {safeText(m.episode_current)}
                </span>
              </>
            )}

            {prog > 0 && prog < 99 && (
              <>
                <span className="shrink-0 text-gray-700">•</span>
                <span className="text-white/70 font-bold truncate">
                  {Math.round(prog)}%
                </span>
              </>
            )}
          </div>

          {hasVote ? (
            <span className="flex items-center gap-1 text-[#f5c518] text-[9px] sm:text-[10px] md:text-[11px] font-bold shrink-0">
              <Icon.Star fill="currentColor" size={10} className="md:w-[12px] md:h-[12px]" />
              {Number(voteAverage).toFixed(1)}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
});

export default MovieCard;