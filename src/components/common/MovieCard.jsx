import React, { memo, useEffect, useState } from "react";
import * as Icon from "lucide-react";
import { safeText, formatTime, getImg } from "../../utils/helpers";
import useTmdbImage from "../../utils/useTmdbImage";

const MovieCard = memo(function MovieCard({
  m,
  navigate,
  progressData,
  isRow = false,
  useTmdb = true,
  onRemove = null,
  onClickOverride = null
}) {
  const { posterSrc, isLoading } = useTmdbImage(m, useTmdb);

  const [imgSrc, setImgSrc] = useState("");
  const [imgStep, setImgStep] = useState("loading");
  
  const [localProgData, setLocalProgData] = useState({});

  if (!m) return null;

  useEffect(() => {
    if (progressData && progressData[m?.slug]) {
      setLocalProgData(progressData[m.slug]);
    } else if (m?.slug) {
      try {
        const storedProgress = JSON.parse(localStorage.getItem("movie_progress") || "{}");
        if (storedProgress[m.slug]) {
          setLocalProgData(storedProgress[m.slug]);
        }
      } catch (e) {
        console.error("Lỗi đọc localStorage:", e);
      }
    }
  }, [progressData, m?.slug]);

  const prog = Math.max(0, Math.min(100, Number(localProgData?.percentage || 0)));
  
  // Xóa số 0 khỏi phần đánh giá
  const voteAverage = m.tmdb?.vote_average;
  const numVote = Number(voteAverage);
  const hasVote = !isNaN(numVote) && numVote > 0;

  const originName = m.origin_name || m.original_name || "";
  const movieName = safeText(m.name, "");

  const rawOphimPoster = m.poster_url || "";
  const rawOphimThumb = m.thumb_url || m.thumb || "";

  const ophimPoster = rawOphimPoster ? getImg(rawOphimPoster) : "";
  const ophimThumb = rawOphimThumb ? getImg(rawOphimThumb) : "";

  const isValidSrc = (src) => {
    if (!src) return false;
    if (String(src).includes("placehold.co")) return false;
    if (String(src) === "null") return false;
    if (String(src) === "undefined") return false;
    if (String(src).length <= 10) return false;
    return true;
  };

  const hasValidTmdbPoster = isValidSrc(posterSrc);
  const hasValidOphimPoster = isValidSrc(ophimPoster);
  const hasValidOphimThumb = isValidSrc(ophimThumb);

  useEffect(() => {
    if (hasValidTmdbPoster) {
      setImgSrc(posterSrc);
      setImgStep("tmdb");
    } else if (hasValidOphimPoster) {
      setImgSrc(ophimPoster);
      setImgStep("ophimPoster");
    } else if (hasValidOphimThumb) {
      setImgSrc(ophimThumb);
      setImgStep("ophimThumb");
    } else {
      setImgSrc("");
      setImgStep("done");
    }
  }, [posterSrc, ophimPoster, ophimThumb, hasValidTmdbPoster, hasValidOphimPoster, hasValidOphimThumb]);

  const handleImageError = () => {
    if (imgStep === "tmdb") {
      if (hasValidOphimPoster) {
        setImgSrc(ophimPoster);
        setImgStep("ophimPoster");
        return;
      }
      if (hasValidOphimThumb) {
        setImgSrc(ophimThumb);
        setImgStep("ophimThumb");
        return;
      }
    }

    if (imgStep === "ophimPoster") {
      if (hasValidOphimThumb) {
        setImgSrc(ophimThumb);
        setImgStep("ophimThumb");
        return;
      }
    }

    setImgSrc("");
    setImgStep("done");
  };

  const handleOpen = () => {
    if (onClickOverride) {
      onClickOverride();
      return;
    }
    if (m.slug) {
      let latestProg = localProgData;
      try {
        const stored = JSON.parse(localStorage.getItem("movie_progress") || "{}");
        if (stored[m.slug]) latestProg = stored[m.slug];
      } catch (e) {}

      // LOGIC FIX: Check currentTime > 0 để bắt chuẩn các phim mới xem vài giây (phần trăm bị = 0)
      const hasHistory = latestProg && latestProg.currentTime > 0;
      const percentage = Math.max(0, Math.min(100, Number(latestProg?.percentage || 0)));

      if (hasHistory && percentage < 99) {
        // Có xem dở -> Phóng thẳng player (tự xoay ngang trên mobile theo web của ông)
        navigate({ type: "watch", slug: m.slug });
      } else {
        // Chưa xem bao giờ hoặc xem xong rồi -> Vào chi tiết bình thường
        navigate({ type: "detail", slug: m.slug, movieData: m });
      }
      window.scrollTo(0, 0);
    }
  };

  const handleRemove = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (typeof onRemove === "function" && m.slug) onRemove(m.slug);
  };

  // FORMAT LẠI TEXT: "T3 | 05:12" hoặc "FULL | 09:12"
  let epDisplay = "FULL";
  const epStr = String(localProgData?.episode_name || localProgData?.episodeSlug || "").trim();
  const numMatch = epStr.match(/\d+/);
  if (numMatch) {
    epDisplay = "T" + numMatch[0];
  } else if (epStr && !epStr.toLowerCase().includes("full")) {
    epDisplay = "FULL";
  }

  const timeText = localProgData?.currentTime > 0 ? formatTime(localProgData.currentTime) : "00:00";
  const isFetching = isLoading;
  let imageContent = null;

  if (isFetching) {
    imageContent = <div className="poster-loading"></div>;
  } else {
    if (imgSrc) {
      imageContent = (
        <img
          src={imgSrc}
          alt={movieName}
          onError={handleImageError}
          className="w-full h-full object-cover relative z-10"
          loading="lazy"
        />
      );
    } else {
      imageContent = (
        <img
          src="https://placehold.co/400x600/111/333?text=Chưa+Có+Ảnh"
          alt="Chưa Có Ảnh"
          className="w-full h-full object-cover relative z-10"
          loading="lazy"
        />
      );
    }
  }

  return (
    <div
      className={`group/card cursor-pointer flex flex-col shrink-0 relative ${
        isRow ? "w-[120px] sm:w-[150px] md:w-52 lg:w-60 snap-start" : ""
      }`}
      onClick={handleOpen}
      style={{ perspective: "1200px" }}
    >
      <style>{`
        @keyframes spinEdge {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .poster-loading {
          position: absolute;
          inset: 0;
          background: #0a0a0a;
          border-radius: inherit;
          overflow: hidden;
          z-index: 10;
        }

        .poster-loading::before {
          content: "";
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: conic-gradient(from 0deg, transparent 70%, rgba(229,9,20, 0.2) 85%, #E50914 100%);
          animation: spinEdge 1.5s linear infinite;
        }

        .poster-loading::after {
          content: "";
          position: absolute;
          inset: 2px;
          background: #0a0a0a;
          border-radius: inherit;
        }
      `}</style>

      {onRemove && (
        <button
          onClick={handleRemove}
          className="absolute top-2 right-2 z-50 bg-[#E50914] text-white p-2 rounded-full opacity-100 md:opacity-0 md:group-hover/card:opacity-100 transition-all hover:scale-110 active:scale-95 shadow-lg"
        >
          <Icon.X size={14} strokeWidth={3} />
        </button>
      )}

      <div className="relative rounded-xl transition-all duration-300 [transform-style:preserve-3d] group-hover/card:[transform:translateZ(24px)_rotateX(3deg)_rotateY(-3deg)]">
        <div className="relative overflow-hidden rounded-xl aspect-[2/3] bg-[#0a0a0a] shadow-xl border border-white/5 transition-all duration-300 group-hover/card:shadow-[0_20px_45px_rgba(0,0,0,0.55)]">
          
          {imageContent}

          {/* HIỂN THỊ TIẾN TRÌNH XEM */}
          {localProgData?.currentTime > 0 && prog < 99 && (
            <>
              {/* Lớp gradient mỏng để chống cháy chữ ở các ảnh nền sáng */}
              <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/60 to-transparent z-20 pointer-events-none" />

              {/* Box hiển thị Tập | Phút siêu gọn, nằm ngay trên thanh tiến trình */}
              <div className="absolute bottom-[10px] left-0 w-full flex justify-center z-30 pointer-events-none">
                <div className="bg-black/40 backdrop-blur-md border border-white/10 px-2 py-[2px] rounded-[6px] shadow-sm">
                  <span className="text-[10px] md:text-[11px] font-semibold text-white drop-shadow-md tracking-wide">
                    {epDisplay} <span className="mx-[2px] text-white/50">|</span> {timeText}
                  </span>
                </div>
              </div>

              {/* Thanh màu đỏ mỏng dưới đáy */}
              <div className="absolute bottom-0 left-0 w-full h-[4px] bg-white/20 z-30">
                <div className="h-full bg-[#E50914]" style={{ width: `${Math.max(1, prog)}%` }} />
              </div>
            </>
          )}
        </div>
      </div>

      <div className="mt-2 md:mt-3 flex flex-col flex-1 px-1">
        <h3 className="text-[12px] md:text-[15px] font-bold text-gray-200 line-clamp-2 uppercase group-hover/card:text-[#E50914] transition-colors">
          {movieName}
        </h3>

        {originName && originName.toLowerCase() !== m.name?.toLowerCase() && (
          <p className="text-[10px] md:text-[12px] text-gray-400 mt-1 truncate">{originName}</p>
        )}

        <div className="flex items-center justify-between mt-1.5">
          <div className="flex items-center gap-1.5 text-[9px] md:text-[11px] text-gray-500 font-medium">
            <span>{safeText(m.year, "2025")}</span>
            <span className="bg-[#E50914] text-white px-1.5 py-[1px] rounded-[4px] font-black uppercase">
              {safeText(m.quality, "HD")}
            </span>
            {(!prog || prog >= 99) && m.episode_current && (
              <span className="text-[#E50914] font-bold ml-1">{m.episode_current}</span>
            )}
          </div>

          {/* Ẩn hoàn toàn nếu sao = 0 */}
          {hasVote ? (
            <span className="flex items-center gap-1 text-[#f5c518] text-[9px] md:text-[11px] font-bold">
              <Icon.Star fill="currentColor" size={10} />
              {numVote.toFixed(1)}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
});

export default MovieCard;