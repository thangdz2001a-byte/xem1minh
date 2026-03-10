import React, { useState, useEffect, useRef, useMemo } from "react";
import * as Icon from "lucide-react";
import { API, API_NGUONC_DETAIL, getImg } from "../../utils/helpers";
import MovieCard from "../../components/common/MovieCard";

export default function ContinueWatching({ navigate, progressData, onRemove }) {
  const scrollRef = useRef(null);
  const [fetchedData, setFetchedData] = useState({});
  // Biến state mới để kiểm tra xem có cần cuộn hay không
  const [canScroll, setCanScroll] = useState(false);

  const watchedSlugs = useMemo(
    () =>
      Object.keys(progressData || {}).filter((key) => {
        const item = progressData[key];
        const pct = item ? Number(item.percentage || 0) : 0;
        return item && typeof item === "object" && !isNaN(pct) && pct > 0 && pct < 99;
      }),
    [progressData]
  );

  useEffect(() => {
    const fetchMissingData = async () => {
      const newFetched = { ...fetchedData };
      let hasChanges = false;

      for (const slug of watchedSlugs) {
        if (!progressData[slug]?.origin_name && !newFetched[slug]) {
          try {
            const res = await fetch(`${API}/phim/${slug}`);
            const j = await res.json();

            if (j?.data?.item) {
              newFetched[slug] = j.data.item;
              hasChanges = true;
            } else {
              const res2 = await fetch(`${API_NGUONC_DETAIL}/${slug}`);
              const j2 = await res2.json();

              const item2 = j2?.movie || j2?.item;
              if (item2) {
                newFetched[slug] = {
                  ...item2,
                  episodes: j2?.episodes || item2?.episodes || []
                };
                hasChanges = true;
              }
            }
          } catch (e) {}
        }
      }

      if (hasChanges) {
        setFetchedData(newFetched);
      }
    };

    if (watchedSlugs.length > 0) {
      fetchMissingData();
    }
  }, [watchedSlugs, progressData, fetchedData]);

  // THUẬT TOÁN ĐO CHIỀU RỘNG: Chỉ hiện mũi tên nếu số phim nhiều hơn chiều rộng màn hình
  useEffect(() => {
    const checkScroll = () => {
      if (scrollRef.current) {
        const { scrollWidth, clientWidth } = scrollRef.current;
        setCanScroll(scrollWidth > clientWidth);
      }
    };

    checkScroll();
    // Đợi layout render xong thì check lại lần nữa cho chắc ăn
    const timeout = setTimeout(checkScroll, 150);

    window.addEventListener("resize", checkScroll);
    return () => {
      clearTimeout(timeout);
      window.removeEventListener("resize", checkScroll);
    };
  }, [watchedSlugs.length, fetchedData]);

  if (watchedSlugs.length === 0) return null;

  const scroll = (direction) => {
    if (!scrollRef.current) return;
    const { scrollLeft, clientWidth } = scrollRef.current;
    const nextLeft =
      direction === "left"
        ? scrollLeft - clientWidth * 0.8
        : scrollLeft + clientWidth * 0.8;

    scrollRef.current.scrollTo({
      left: nextLeft,
      behavior: "smooth"
    });
  };

  const sortedSlugs = [...watchedSlugs].sort(
    (a, b) => (progressData[b]?.timestamp || 0) - (progressData[a]?.timestamp || 0)
  );

  return (
    <div className="mb-8 md:mb-12 animate-in slide-in-from-left duration-500 transform-gpu group/section">
      <div className="flex items-center mb-3 md:mb-4 px-1">
        <h2 className="text-[15px] sm:text-lg md:text-2xl font-black text-white uppercase tracking-tighter flex items-center gap-2 md:gap-3">
          <span className="w-[4px] h-6 md:h-8 bg-[#E50914] block" />
          Tiếp tục xem
        </h2>
      </div>

      <div className="relative">
        {/* Nút Trái: Trả lại 2 bên lề, và chỉ render nếu canScroll là true */}
        {canScroll && (
          <button
            onClick={() => scroll("left")}
            aria-label="Cuộn sang trái"
            type="button"
            className="absolute left-2 md:left-3 top-[38%] -translate-y-1/2 z-[40] hidden md:flex items-center justify-center w-10 h-10 rounded-full bg-black text-white border border-white/10 opacity-0 -translate-x-2 group-hover/section:opacity-100 group-hover/section:translate-x-0 hover:bg-[#151515] hover:border-white/20 hover:scale-105 active:scale-95 transition-all duration-300 shadow-[0_10px_28px_rgba(0,0,0,0.55)]"
          >
            <Icon.ChevronLeft size={20} strokeWidth={2.7} />
          </button>
        )}

        <div
          ref={scrollRef}
          className="flex gap-3 sm:gap-4 md:gap-6 overflow-x-auto scroll-smooth no-scrollbar pb-4 px-1 md:px-2 snap-x snap-mandatory overscroll-x-contain will-change-scroll"
        >
          {sortedSlugs.map((slug) => {
            const prog = progressData[slug] || {};
            const fetched = fetchedData[slug] || {};

            let rawThumb = prog.thumb || prog.thumb_url || fetched.thumb_url || fetched.poster_url;
            let thumb = "https://placehold.co/400x225/1a1a1a/e50914?text=No+Image";
            if (rawThumb && typeof rawThumb === "string" && !rawThumb.includes("placehold.co") && rawThumb !== "undefined" && rawThumb !== "null") {
               thumb = getImg(rawThumb);
            }

            const movieObject = {
              slug: slug,
              name: prog.name || fetched.name || "Phim đang xem",
              origin_name: prog.origin_name || fetched.origin_name || fetched.original_name || "",
              thumb_url: thumb,
              poster_url: fetched.poster_url || thumb,
              year: prog.year || fetched.year || "",
              quality: fetched.quality || "HD",
              tmdb: fetched.tmdb || null
            };

            return (
              <MovieCard
                key={slug}
                m={movieObject}
                navigate={navigate}
                progressData={progressData}
                isRow={true}
                onRemove={onRemove}
                onClickOverride={() => {
                  navigate({
                    type: "watch",
                    slug: slug,
                    movieData: { item: movieObject }
                  });
                  window.scrollTo(0, 0);
                }}
              />
            );
          })}
        </div>

        {/* Nút Phải: Trả lại 2 bên lề, và chỉ render nếu canScroll là true */}
        {canScroll && (
          <button
            onClick={() => scroll("right")}
            aria-label="Cuộn sang phải"
            type="button"
            className="absolute right-2 md:right-3 top-[38%] -translate-y-1/2 z-[40] hidden md:flex items-center justify-center w-10 h-10 rounded-full bg-black text-white border border-white/10 opacity-0 translate-x-2 group-hover/section:opacity-100 group-hover/section:translate-x-0 hover:bg-[#151515] hover:border-white/20 hover:scale-105 active:scale-95 transition-all duration-300 shadow-[0_10px_28px_rgba(0,0,0,0.55)]"
          >
            <Icon.ChevronRight size={20} strokeWidth={2.7} />
          </button>
        )}
      </div>
    </div>
  );
}