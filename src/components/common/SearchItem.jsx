import React, { useEffect, useState } from "react";
import * as Icon from "lucide-react";
import { safeText, getImg } from "../../utils/helpers";
import useTmdbImage from "../../utils/useTmdbImage";

export default function SearchItem({ m, navigate, onClose }) {
  const { posterSrc, isLoading } = useTmdbImage(m);

  const [imgSrc, setImgSrc] = useState("");
  const [imgStep, setImgStep] = useState("loading");

  if (!m) return null;

  const voteAverage = m.tmdb?.vote_average;
  const hasVote = voteAverage != null && !isNaN(Number(voteAverage));
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

  // SỬA LẠI Ở ĐÂY: Dùng trực tiếp isLoading để gọi hiệu ứng vòng đỏ giống bản cũ
  const isFetching = isLoading;

  let imageContent = null;

  if (isFetching) {
    // Render hiệu ứng vòng quay đỏ khi đang fetch data
    imageContent = <div className="search-poster-loading"></div>;
  } else {
    if (imgSrc) {
      imageContent = (
        <img
          src={imgSrc}
          alt={movieName}
          onError={handleImageError}
          className="w-full h-full object-cover object-center relative z-10"
          loading="lazy"
        />
      );
    } else {
      // Ảnh đen dự phòng "Chưa Có Ảnh" khi tất cả các link đều tịt
      imageContent = (
        <img
          src="https://placehold.co/400x600/111/333?text=Chưa+Có+Ảnh"
          alt="Chưa Có Ảnh"
          className="w-full h-full object-cover object-center relative z-10"
          loading="lazy"
        />
      );
    }
  }

  return (
    <div
      className="flex items-center gap-4 p-2 md:p-3 hover:bg-white/5 cursor-pointer transition-colors rounded-xl border border-transparent hover:border-white/10 group"
      onClick={() => {
        if (m.slug) {
          navigate({ type: "detail", slug: m.slug, movieData: m });
          window.scrollTo(0, 0);
          if (onClose) onClose();
        }
      }}
    >
      <style>{`
        @keyframes spinEdge {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .search-poster-loading {
          position: absolute;
          inset: 0;
          background: #0a0a0a;
          border-radius: inherit;
          overflow: hidden;
          z-index: 10;
        }

        .search-poster-loading::before {
          content: "";
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: conic-gradient(from 0deg, transparent 70%, rgba(229,9,20, 0.2) 85%, #E50914 100%);
          animation: spinEdge 1.5s linear infinite;
        }

        .search-poster-loading::after {
          content: "";
          position: absolute;
          inset: 1.5px;
          background: #0a0a0a;
          border-radius: inherit;
        }
      `}</style>

      <div className="relative w-14 md:w-16 shrink-0 aspect-[2/3] rounded-lg overflow-hidden bg-[#222] shadow-md border border-white/5 group-hover:shadow-xl transition-all">
        {imageContent}
      </div>

      <div className="flex-1 min-w-0">
        <h4 className="text-white text-sm md:text-base font-bold truncate group-hover:text-[#E50914] transition-colors">
          {movieName}
        </h4>

        {originName &&
          originName.trim().toLowerCase() !== movieName.trim().toLowerCase() && (
            <p className="text-[#f5c518] text-[10px] md:text-xs truncate mt-0.5">
              {originName} {m.year ? `• ${m.year}` : ""}
            </p>
          )}

        <div className="flex items-center gap-2 mt-1.5 md:mt-2 text-[10px] md:text-xs text-gray-400 font-medium">
          <span className="bg-[#E50914] text-white px-1.5 py-0.5 rounded text-[9px] md:text-[10px] font-black tracking-wider uppercase">
            {safeText(m.quality, "HD")}
          </span>

          <span className="shrink-0">•</span>

          <span className="truncate text-gray-300">
            {safeText(m.episode_current || "Full")}
          </span>

          {hasVote && (
            <>
              <span className="shrink-0">•</span>
              <span className="flex items-center gap-1 text-[#f5c518] font-bold">
                <Icon.Star fill="currentColor" size={12} className="w-3 h-3 md:w-3.5 md:h-3.5" />
                {Number(voteAverage).toFixed(1)}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}