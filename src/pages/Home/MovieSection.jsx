import React, { useState, useEffect, useRef } from "react";
import * as Icon from "lucide-react";
import {
  API,
  API_TMDB,
  safeText,
  getMovieUniqueId,
  globalDisplayedSlugs,
  fetchWithCache,
  matchTmdbToOphim,
  getImg 
} from "../../utils/helpers";
import MovieCard from "../../components/common/MovieCard";

export default function MovieSection({ title, slug, type = "the-loai", navigate, progressData, onReady }) {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef(null);

  useEffect(() => {
    let isMounted = true;

    const fetchMovies = async () => {
      const cacheKey = `polite_section_final_${slug}`;
      const CACHE_TTL = 3600000; // Cache 1 tiếng
      const MAX_MOVIES = 10; // Lấy 10 phim cho nhẹ mượt

      // KHÓA BÁO CÁO 1 LẦN
      let reportedReady = false;
      const triggerReady = () => {
        if (!reportedReady && onReady) {
          onReady();
          reportedReady = true;
        }
      };

      try {
        setLoading(true);

        // 1. KIỂM TRA CACHE TRƯỚC
        try {
          const cachedStr = localStorage.getItem(cacheKey);
          if (cachedStr) {
            const parsed = JSON.parse(cachedStr);
            if (Date.now() - parsed.timestamp < CACHE_TTL) {
              const cachedMovies = parsed.data.slice(0, MAX_MOVIES); 
              setMovies(cachedMovies);
              
              if (slug !== "phim-moi-cap-nhat") {
                cachedMovies.forEach(m => {
                  const id = getMovieUniqueId(m);
                  if (id) globalDisplayedSlugs.add(id);
                });
              }
              
              if (isMounted) {
                setLoading(false);
                triggerReady(); // CÓ CACHE THÌ BÁO XONG LUÔN
              }
              return; 
            }
          }
        } catch (e) {}

        // 2. GỌI API PHIM MỚI CẬP NHẬT TỪ OPHIM
        if (slug === "phim-moi-cap-nhat") {
          const res = await fetchWithCache(`${API}/${type}/${slug}?page=1`, CACHE_TTL);
          if (!isMounted) return;
          const rawItems = res?.items || res?.data?.items || [];
          
          const formattedItems = rawItems.map(item => ({
            ...item,
            poster_url: getImg(item.poster_url || item.thumb_url),
            thumb_url: getImg(item.thumb_url || item.poster_url)
          }));

          const finalMovies = formattedItems.slice(0, MAX_MOVIES);
          
          try {
            localStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), data: finalMovies }));
          } catch (e) {}
          
          if (isMounted) {
             setMovies(finalMovies);
             setLoading(false);
             triggerReady(); // XONG THÌ BÁO CÁO
          }
          return;
        }

        // 3. CÁC MỤC CÒN LẠI LẤY TỪ TMDB
        let baseTmdbUrls = [];
        switch (slug) {
          case "phim-han": 
            baseTmdbUrls = [
              `${API_TMDB}/discover/movie?with_origin_country=KR&language=vi`,
              `${API_TMDB}/discover/tv?with_origin_country=KR&without_genres=10764,10767,10763&language=vi`
            ]; break;
          case "anime": baseTmdbUrls = [`${API_TMDB}/discover/tv?with_genres=16&with_original_language=ja&language=vi`]; break;
          case "phim-bo": baseTmdbUrls = [`${API_TMDB}/discover/tv?language=vi`]; break;
          case "phim-le": baseTmdbUrls = [`${API_TMDB}/discover/movie?language=vi`]; break;
          case "hanh-dong": baseTmdbUrls = [`${API_TMDB}/discover/movie?with_genres=28&language=vi`]; break;
          case "tinh-cam": baseTmdbUrls = [`${API_TMDB}/discover/movie?with_genres=10749&language=vi`]; break;
          case "kinh-di": baseTmdbUrls = [`${API_TMDB}/discover/movie?with_genres=27&language=vi`]; break;
          case "vien-tuong": baseTmdbUrls = [`${API_TMDB}/discover/movie?with_genres=878&language=vi`]; break;
          default: baseTmdbUrls = [`${API_TMDB}/trending/all/day?language=vi`];
        }

        let fetchPromises = [];
        for (let page = 1; page <= 3; page++) {
          baseTmdbUrls.forEach(url => fetchPromises.push(fetchWithCache(`${url}&page=${page}`, 300000)));
        }

        const responses = await Promise.all(fetchPromises);
        if (!isMounted) return;
        
        let tmdbItems = [];
        responses.forEach((res, idx) => {
          if (res?.results) {
            const isTv = baseTmdbUrls[idx % baseTmdbUrls.length].includes('/discover/tv');
            const items = res.results.map(item => ({
              ...item,
              media_type: item.media_type || (isTv ? 'tv' : 'movie')
            }));
            tmdbItems = [...tmdbItems, ...items];
          }
        });

        const uniqueTmdb = Array.from(new Map(tmdbItems.map(item => [item.id, item])).values());
        uniqueTmdb.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));

        const finalMovies = [];
        const BATCH_SIZE = 12; 
        
        for (let i = 0; i < uniqueTmdb.length; i += BATCH_SIZE) {
          if (finalMovies.length >= MAX_MOVIES) break; 
          
          const batch = uniqueTmdb.slice(i, i + BATCH_SIZE);
          const matchPromises = batch.map(async (tItem) => {
            const ophimMatch = await matchTmdbToOphim(tItem);
            if (ophimMatch && ophimMatch.slug) {
              return {
                ...ophimMatch,
                slug: ophimMatch.slug,
                tmdb: { ...(ophimMatch.tmdb || {}), ...tItem, poster_path: tItem.poster_path },
                poster_path: tItem.poster_path,
                name: tItem.title || tItem.name || ophimMatch.name,
                origin_name: tItem.original_title || tItem.original_name || ophimMatch.origin_name,
                year: (tItem.release_date || tItem.first_air_date || "").split("-")[0] || ophimMatch.year
              };
            }
            return null;
          });

          const matchResults = await Promise.allSettled(matchPromises);
          
          for (const res of matchResults) {
            if (res.status === 'fulfilled' && res.value) {
              const mergedMovie = res.value;
              const id = getMovieUniqueId(mergedMovie);
              if (id && !globalDisplayedSlugs.has(id)) {
                finalMovies.push(mergedMovie);
                globalDisplayedSlugs.add(id);
              }
              if (finalMovies.length >= MAX_MOVIES) break; 
            }
          }
        }

        try {
          localStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), data: finalMovies }));
        } catch (e) {}

        if (isMounted) {
          setMovies(finalMovies);
          setLoading(false);
          triggerReady(); // XONG THÌ BÁO CÁO
        }

      } catch (error) {
        if (isMounted) {
          setLoading(false);
          triggerReady();
        }
      }
    };

    fetchMovies();

    return () => { isMounted = false; };
  }, [slug, type, onReady]);

  const scroll = (direction) => {
    if (!scrollRef.current) return;
    const { scrollLeft, clientWidth } = scrollRef.current;
    const scrollTo = direction === "left" ? scrollLeft - clientWidth * 0.8 : scrollLeft + clientWidth * 0.8;
    scrollRef.current.scrollTo({ left: scrollTo, behavior: "smooth" });
  };

  if (loading) {
    return (
      <div className="mb-8 md:mb-12 relative group/section transform-gpu">
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
    <div className="mb-8 md:mb-12 relative group/section transform-gpu">
      <div className="flex items-center justify-between mb-3 md:mb-4 px-1">
        <h2 className="text-[15px] sm:text-lg md:text-2xl font-black text-white uppercase tracking-tighter flex items-center gap-2 md:gap-3">
          <span className="w-[4px] h-6 md:h-8 bg-[#E50914] block" /> {safeText(title)}
        </h2>
        <button onClick={() => navigate({ type: "list", slug, title, mode: type })} className="text-[#E50914] text-[9px] sm:text-[10px] md:text-xs font-black hover:underline opacity-100 transition-opacity uppercase tracking-widest">
          Xem tất cả
        </button>
      </div>

      <div className="relative">
        <button onClick={() => scroll("left")} className="absolute left-2 md:left-3 top-[38%] -translate-y-1/2 z-[40] hidden md:flex items-center justify-center w-10 h-10 rounded-full bg-black text-white border border-white/10 opacity-0 -translate-x-2 group-hover/section:opacity-100 group-hover/section:translate-x-0 hover:bg-[#151515] hover:border-white/20 hover:scale-105 active:scale-95 transition-all duration-300 shadow-[0_10px_28px_rgba(0,0,0,0.55)]">
          <Icon.ChevronLeft size={20} strokeWidth={2.7} />
        </button>
        <div ref={scrollRef} className="flex gap-3 sm:gap-4 md:gap-6 overflow-x-auto scroll-smooth pb-4 px-1 md:px-2 snap-x snap-mandatory overscroll-x-contain [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">  
          {movies.map((m) => (<MovieCard key={m.slug} m={m} navigate={navigate} progressData={progressData} isRow={true} useTmdb={true} />))}
        </div>
        <button onClick={() => scroll("right")} className="absolute right-2 md:right-3 top-[38%] -translate-y-1/2 z-[40] hidden md:flex items-center justify-center w-10 h-10 rounded-full bg-black text-white border border-white/10 opacity-0 translate-x-2 group-hover/section:opacity-100 group-hover/section:translate-x-0 hover:bg-[#151515] hover:border-white/20 hover:scale-105 active:scale-95 transition-all duration-300 shadow-[0_10px_28px_rgba(0,0,0,0.55)]">
          <Icon.ChevronRight size={20} strokeWidth={2.7} />
        </button>
      </div>
    </div>
  );
}