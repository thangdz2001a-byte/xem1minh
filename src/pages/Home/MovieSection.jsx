import React, { useState, useEffect, useRef } from "react";
import * as Icon from "lucide-react";
import {
  API,
  API_NGUONC,
  safeText,
  isHoatHinhMovie,
  mergeDuplicateMovies,
  getMovieUniqueId,
  globalDisplayedSlugs,
  fetchWithCache
} from "../../utils/helpers";
import MovieCard from "../../components/common/MovieCard";

export default function MovieSection({ title, slug, type = "the-loai", navigate, progressData }) {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [shouldLoad, setShouldLoad] = useState(false);
  const scrollRef = useRef(null);
  const sectionRef = useRef(null);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin: "350px 0px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!shouldLoad) return;

    let isMounted = true;

    const fetchMovies = async () => {
      try {
        setLoading(true);

        let reqs = [];

        if (slug === "hoat-hinh") {
          reqs = [
            fetchWithCache(`${API}/danh-sach/hoat-hinh?page=1`, 300000),
            fetchWithCache(`${API}/the-loai/hoat-hinh?page=1`, 300000),
            fetchWithCache(`${API_NGUONC}/the-loai/hoathinh?page=1`, 300000),
            fetchWithCache(`${API}/danh-sach/hoat-hinh?page=2`, 300000),
            fetchWithCache(`${API}/the-loai/hoat-hinh?page=2`, 300000),
            fetchWithCache(`${API_NGUONC}/the-loai/hoathinh?page=2`, 300000)
          ];
        } else {
          const urlOphim = `${API}/${type}/${slug}`;
          const urlNguonc =
            slug === "phim-moi-cap-nhat"
              ? `${API_NGUONC}/phim-moi-cap-nhat`
              : `${API_NGUONC}/${type}/${slug}`;

          reqs = [
            fetchWithCache(`${urlOphim}?page=1`, 300000),
            fetchWithCache(`${urlNguonc}?page=1`, 300000),
            fetchWithCache(`${urlOphim}?page=2`, 300000),
            fetchWithCache(`${urlNguonc}?page=2`, 300000),
            fetchWithCache(`${urlOphim}?page=3`, 300000),
            fetchWithCache(`${urlNguonc}?page=3`, 300000)
          ];
        }

        const results = await Promise.allSettled(reqs);

        if (!isMounted) return;

        let allItems = [];
        results.forEach((res) => {
          if (res.status === "fulfilled" && res.value) {
            const items = res.value.items || res.value.data?.items || [];
            allItems.push(...items);
          }
        });

        let merged = mergeDuplicateMovies(allItems);

        if (slug !== "hoat-hinh") {
          merged = merged.filter((m) => !isHoatHinhMovie(m));
        }

        const uniqueMovies = [];
        merged.forEach((m) => {
          const id = getMovieUniqueId(m);
          if (id && !globalDisplayedSlugs.has(id)) {
            uniqueMovies.push(m);
          }
        });

        let finalMovies = uniqueMovies.length < 10 ? merged : uniqueMovies;
        finalMovies = finalMovies.slice(0, 15);

        finalMovies.forEach((m) => {
          const id = getMovieUniqueId(m);
          if (id) globalDisplayedSlugs.add(id);
        });

        setMovies(finalMovies);
      } catch (error) {
        console.error(error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchMovies();

    return () => {
      isMounted = false;
    };
  }, [shouldLoad, slug, type]);

  const scroll = (direction) => {
    if (!scrollRef.current) return;

    const { scrollLeft, clientWidth } = scrollRef.current;
    const scrollTo =
      direction === "left"
        ? scrollLeft - clientWidth * 0.8
        : scrollLeft + clientWidth * 0.8;

    scrollRef.current.scrollTo({
      left: scrollTo,
      behavior: "smooth"
    });
  };

  if (!shouldLoad) {
    return (
      <div ref={sectionRef} className="mb-8 md:mb-12 relative transform-gpu">
        <div className="flex items-center gap-4 mb-3 md:mb-4 px-1">
          <h2 className="text-[15px] sm:text-lg md:text-2xl font-black text-white uppercase tracking-tighter flex items-center gap-2 md:gap-3">
            <span className="w-[4px] h-6 md:h-8 bg-[#E50914] block" /> {safeText(title)}
          </h2>
        </div>
        <div className="flex gap-3 sm:gap-4 md:gap-6 overflow-hidden pb-4 px-1 md:px-2">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div
              key={idx}
              className="w-[120px] sm:w-[150px] md:w-52 lg:w-60 xl:w-64 shrink-0"
            >
              <div className="aspect-[2/3] rounded-xl bg-white/5 animate-pulse" />
              <div className="h-4 mt-3 rounded bg-white/5 animate-pulse" />
              <div className="h-3 mt-2 w-2/3 rounded bg-white/5 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div ref={sectionRef} className="mb-8 md:mb-12 relative group/section transform-gpu">
        <div className="flex items-center gap-4 mb-3 md:mb-4 px-1">
          <h2 className="text-[15px] sm:text-lg md:text-2xl font-black text-white uppercase tracking-tighter flex items-center gap-2 md:gap-3">
            <span className="w-[4px] h-6 md:h-8 bg-[#E50914] block" /> {safeText(title)}
          </h2>
          <Icon.Loader2 className="animate-spin text-[#E50914]" size={20} />
        </div>
      </div>
    );
  }

  if (movies.length === 0) return null;

  return (
    <div ref={sectionRef} className="mb-8 md:mb-12 relative group/section transform-gpu">
      <div className="flex items-center justify-between mb-3 md:mb-4 px-1">
        <h2 className="text-[15px] sm:text-lg md:text-2xl font-black text-white uppercase tracking-tighter flex items-center gap-2 md:gap-3">
          <span className="w-[4px] h-6 md:h-8 bg-[#E50914] block" /> {safeText(title)}
        </h2>

        <button
          onClick={() => navigate({ type: "list", slug, title, mode: type })}
          className="text-[#E50914] text-[9px] sm:text-[10px] md:text-xs font-black hover:underline opacity-100 transition-opacity uppercase tracking-widest"
        >
          Xem tất cả
        </button>
      </div>

      <div className="relative">
        <button
          onClick={() => scroll("left")}
          aria-label="Cuộn sang trái"
          className="absolute left-2 md:left-3 top-[38%] -translate-y-1/2 z-[40] hidden md:flex items-center justify-center w-10 h-10 rounded-full bg-black text-white border border-white/10 opacity-0 -translate-x-2 group-hover/section:opacity-100 group-hover/section:translate-x-0 hover:bg-[#151515] hover:border-white/20 hover:scale-105 active:scale-95 transition-all duration-300 shadow-[0_10px_28px_rgba(0,0,0,0.55)]"
        >
          <Icon.ChevronLeft size={20} strokeWidth={2.7} />
        </button>

        <div
          ref={scrollRef}
          className="flex gap-3 sm:gap-4 md:gap-6 overflow-x-auto scroll-smooth no-scrollbar pb-4 px-1 md:px-2 snap-x snap-mandatory overscroll-x-contain"
        >
          {movies.map((m) => (
            <MovieCard
              key={m.slug}
              m={m}
              navigate={navigate}
              progressData={progressData}
              isRow={true}
            />
          ))}
        </div>

        <button
          onClick={() => scroll("right")}
          aria-label="Cuộn sang phải"
          className="absolute right-2 md:right-3 top-[38%] -translate-y-1/2 z-[40] hidden md:flex items-center justify-center w-10 h-10 rounded-full bg-black text-white border border-white/10 opacity-0 translate-x-2 group-hover/section:opacity-100 group-hover/section:translate-x-0 hover:bg-[#151515] hover:border-white/20 hover:scale-105 active:scale-95 transition-all duration-300 shadow-[0_10px_28px_rgba(0,0,0,0.55)]"
        >
          <Icon.ChevronRight size={20} strokeWidth={2.7} />
        </button>
      </div>
    </div>
  );
}