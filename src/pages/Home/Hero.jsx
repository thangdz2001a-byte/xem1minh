import React, { useState, useEffect, memo, useCallback, useRef } from "react";
import * as Icon from "lucide-react";
import useTmdbImage from "../../utils/useTmdbImage";
import { normalizeString } from "../../utils/helpers";

const TMDB_API_KEY = "e11b0ed320fafa701781e40898da1813";

const HeroPoster = memo(({ movie }) => {
  const { posterSrc, isLoading } = useTmdbImage(movie);

  if (isLoading) {
    return (
      <div className="w-full h-full bg-[#0a0a0a] flex items-center justify-center">
        <Icon.Image size={32} className="text-white/10" />
      </div>
    );
  }

  return (
    <img
      src={posterSrc}
      className="w-full h-full object-cover select-none"
      alt="poster"
      loading="lazy"
    />
  );
});

const HeroBackdrop = memo(({ movie }) => {
  const { posterSrc } = useTmdbImage(movie);

  return (
    <img 
      src={posterSrc || "https://placehold.co/1920x1080/111/333?text=No+Backdrop"} 
      className="w-full h-full object-cover blur-[60px] opacity-25 scale-110 transition-all duration-1000" 
      alt="backdrop" 
    />
  );
});

export default function Hero({ navigate, onReady }) {
  const [bannerMovies, setBannerMovies] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const touchStart = useRef(0);
  const touchEnd = useRef(0);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const verifyMovieOnOPhim = async (tmdbMovie) => {
    try {
      const query = tmdbMovie.original_title || tmdbMovie.original_name || tmdbMovie.title || tmdbMovie.name;
      if (!query) return null;

      const res = await fetch(`https://ophim1.com/v1/api/tim-kiem?keyword=${encodeURIComponent(query)}`);
      const json = await res.json();
      const items = json?.data?.items || [];

      if (items.length === 0) return null;

      const targetTmdbId = String(tmdbMovie.id);
      const targetType = tmdbMovie.media_type === 'tv' ? 'tv' : 'movie';
      const dateStr = tmdbMovie.release_date || tmdbMovie.first_air_date;
      const targetYear = dateStr ? parseInt(dateStr.split('-')[0], 10) : null;
      
      const targetNames = [
        tmdbMovie.title, 
        tmdbMovie.original_title, 
        tmdbMovie.name, 
        tmdbMovie.original_name
      ].filter(Boolean).map(normalizeString);

      let bestMatch = null;
      let highestScore = -1;

      for (const item of items) {
        const itemTmdbId = String(item.tmdb?.id || item.tmdb?.id_tmdb || item.tmdb?.tmdb_id || item.tmdb_id);
        if (itemTmdbId && itemTmdbId !== "undefined" && itemTmdbId === targetTmdbId) {
          return { ...item, tmdb: tmdbMovie }; 
        }

        let score = 0;
        const itemTypeRaw = String(item.type || "").toLowerCase();
        const itemType = (itemTypeRaw === 'series' || itemTypeRaw === 'tvshows' || itemTypeRaw === 'phimbo') ? 'tv' : 'movie';
        if (itemType === targetType) score += 5;

        const itemYear = parseInt(item.year, 10);
        if (itemYear && targetYear) {
          const diff = Math.abs(itemYear - targetYear);
          if (diff === 0) score += 5;
          else if (diff === 1) score += 3;
          else continue; 
        }

        const itemNames = [item.name, item.origin_name, item.original_name, item.slug].filter(Boolean).map(normalizeString);

        let isNameMatched = false;
        for (const tName of targetNames) {
          if (itemNames.includes(tName)) {
            score += 3;
            isNameMatched = true;
            break;
          } else if (itemNames.some(iName => iName.includes(tName) || tName.includes(iName))) {
            score += 1;
            isNameMatched = true;
            break;
          }
        }

        if (score > highestScore && isNameMatched) {
          highestScore = score;
          bestMatch = { ...item, tmdb: tmdbMovie };
        }
      }

      if (bestMatch && highestScore >= 8) {
        return bestMatch;
      }

    } catch (error) {}
    return null;
  };

  const fetchBannerData = useCallback(async (isMounted) => {
    const CACHE_KEY = "polite_hero_banner";
    const CACHE_TTL = 3600000; 

    try {
      const cachedStr = localStorage.getItem(CACHE_KEY);
      if (cachedStr) {
        const parsed = JSON.parse(cachedStr);
        if (Date.now() - parsed.timestamp < CACHE_TTL) {
          if (isMounted) {
            setBannerMovies(parsed.data);
            setCurrentIndex(Math.floor(parsed.data.length / 2));
            setLoading(false);
            if (onReady) onReady(); 
          }
          return;
        }
      }
    } catch (e) {}

    try {
      setLoading(true);
      const currentHour = new Date().getHours();
      const isAfternoon = currentHour >= 12;

      const tmdbRes = await fetch(`https://api.themoviedb.org/3/trending/all/day?api_key=${TMDB_API_KEY}&language=vi-VN`);
      const tmdbData = await tmdbRes.json();
      const allTrending = tmdbData.results?.slice(0, 20) || [];

      const verifiedResults = await Promise.all(allTrending.map(verifyMovieOnOPhim));
      
      const groupMorning = verifiedResults.slice(0, 10).filter(Boolean);
      const groupAfternoon = verifiedResults.slice(10, 20).filter(Boolean);

      let displayItems = isAfternoon ? groupAfternoon : groupMorning;

      if (displayItems.length < 10) {
        const fallbackItems = isAfternoon ? groupMorning : groupAfternoon;
        displayItems = [...displayItems, ...fallbackItems].slice(0, 10);
      }

      if (isMounted) {
        setBannerMovies(displayItems);
        setCurrentIndex(Math.floor(displayItems.length / 2));
        
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), data: displayItems }));
        } catch (e) {}
      }
    } catch (error) {
      console.error("Lỗi fetch banner:", error);
    } finally {
      if (isMounted) {
        setLoading(false);
        if (onReady) onReady(); 
      }
    }
  }, [onReady]); 

  useEffect(() => {
    let isMounted = true;
    fetchBannerData(isMounted);
    return () => { isMounted = false; };
  }, [fetchBannerData]);

  useEffect(() => {
    if (bannerMovies.length === 0) return;
    const timer = setInterval(() => setCurrentIndex(p => (p + 1) % bannerMovies.length), 5000);
    return () => clearInterval(timer);
  }, [bannerMovies.length]);

  const handleTouchEnd = () => {
    const diff = touchStart.current - touchEnd.current;
    if (diff > 50) setCurrentIndex(p => (p + 1) % bannerMovies.length);
    if (diff < -50) setCurrentIndex(p => (p - 1 + bannerMovies.length) % bannerMovies.length);
  };

  const currentMovie = bannerMovies[currentIndex];
  if (loading || !currentMovie) return <div className="w-full h-[85vh] bg-[#050505] flex items-center justify-center"><Icon.Loader2 className="animate-spin text-red-600" size={40} /></div>;

  return (
    <div className="relative w-full h-[85vh] md:h-[100vh] bg-[#050505] overflow-hidden flex flex-col items-center justify-center">
      
      <div className="absolute inset-0 z-0">
        <HeroBackdrop movie={currentMovie} />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/40 to-transparent" />
      </div>

      <div className="relative z-10 w-full flex flex-col items-center pt-12 md:pt-16">
        
        <div 
          className="relative w-full h-[50vh] md:h-[55vh] flex justify-center items-center"
          onTouchStart={(e) => (touchStart.current = e.targetTouches[0].clientX)}
          onTouchMove={(e) => (touchEnd.current = e.targetTouches[0].clientX)}
          onTouchEnd={handleTouchEnd}
        >
          {bannerMovies.map((movie, index) => {
            let offset = index - currentIndex;
            const N = bannerMovies.length;
            if (offset > Math.floor(N / 2)) offset -= N;
            else if (offset < -Math.floor((N - 1) / 2)) offset += N;

            const absOffset = Math.abs(offset);
            const isVisible = absOffset <= 2; 
            
            const tx = isMobile ? offset * 145 : offset * 260;

            return (
              <div
                key={`hero-${movie._id || movie.slug}-${index}`}
                className={`absolute w-[200px] md:w-[260px] aspect-[2/3] rounded-2xl md:rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition-all duration-700 ease-out ${!isVisible ? 'opacity-0' : 'opacity-100'}`}
                style={{
                  transform: `translateX(${tx}px) scale(${1 - absOffset * 0.15})`,
                  zIndex: 10 - absOffset,
                  filter: `brightness(${1 - absOffset * 0.4}) blur(${absOffset * 1}px)`,
                  visibility: isVisible ? 'visible' : 'hidden',
                }}
                onClick={() => {
                  if (offset !== 0) setCurrentIndex(index);
                  else navigate({ type: "detail", slug: movie.slug, movieData: movie });
                }}
              >
                <HeroPoster movie={movie} />
              </div>
            );
          })}
        </div>

        <div className="text-center mt-4 md:mt-10 px-4 md:px-6 max-w-4xl w-full">
          {/* TÊN PHIM: To hơn (text-3xl) và line-height khít lại (leading-tight) */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white uppercase mb-3 md:mb-4 drop-shadow-2xl tracking-tighter line-clamp-2 md:line-clamp-none leading-tight">
            {currentMovie?.name}
          </h1>
          
          {/* THÔNG TIN: Chữ to hơn (text-xs), điểm nhấn rõ hơn */}
          <div className="flex justify-center items-center gap-2 md:gap-3 text-xs sm:text-sm md:text-sm font-bold text-gray-400 mb-5 md:mb-8 uppercase tracking-widest flex-wrap">
            <span className="text-red-600">{currentMovie?.year}</span>
            <span className="w-1.5 h-1.5 bg-gray-800 rounded-full" />
            <span className="text-[#f5c518] flex items-center gap-1"><Icon.Star size={14} fill="currentColor" /> {Number(currentMovie?.tmdb?.vote_average || 0).toFixed(1)}</span>
            <span className="w-1.5 h-1.5 bg-gray-800 rounded-full" />
            <span className="border border-gray-800 px-2.5 py-1 rounded text-white text-[10px] md:text-[11px]">TMDB TRENDING</span>
          </div>
          
          {/* NÚT XEM NGAY: Text to hơn (text-sm), padding rộng ra chút xíu */}
          <button 
             onClick={() => navigate({ type: "detail", slug: currentMovie?.slug, movieData: currentMovie })}
             className="bg-[#E50914] text-white px-10 py-3.5 md:px-14 md:py-4 rounded-full font-black flex items-center gap-3 mx-auto hover:scale-105 active:scale-95 transition-all shadow-[0_4px_25px_rgba(229,9,20,0.5)] text-sm md:text-base"
          >
            <Icon.Play size={20} fill="currentColor" /> <span className="tracking-widest uppercase">Xem ngay</span>
          </button>
        </div>
      </div>
    </div>
  );
}