import React, { useState, useEffect, useMemo } from "react";
import * as Icon from "lucide-react";
import {
  API,
  getImg,
  safeText,
  isHoatHinhMovie,
  mergeDuplicateMovies,
  getMovieUniqueId,
  globalDisplayedSlugs,
  fetchWithCache
} from "../../utils/helpers";

export default function Hero({ navigate }) {
  const [bannerMovies, setBannerMovies] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  const [touchStartX, setTouchStartX] = useState(0);
  const [touchEndX, setTouchEndX] = useState(0);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();

    let rafId;
    const onResize = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(handleResize);
    };

    window.addEventListener("resize", onResize, { passive: true });
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const fetchBannerData = async () => {
      try {
        setLoading(true);

        const [res1, res2, res3] = await Promise.all([
          fetchWithCache(`${API}/danh-sach/phim-moi-cap-nhat?page=1`, 300000),
          fetchWithCache(`${API}/danh-sach/phim-moi-cap-nhat?page=2`, 300000),
          fetchWithCache(`${API}/danh-sach/phim-moi-cap-nhat?page=3`, 300000)
        ]);

        let rawItems = [
          ...(res1?.data?.items || []),
          ...(res2?.data?.items || []),
          ...(res3?.data?.items || [])
        ];

        rawItems = rawItems.filter((m) => {
          const epStr = String(m.episode_current || "").toLowerCase();
          if (epStr.includes("trailer")) return false;
          if (isHoatHinhMovie(m)) return false;
          return true;
        });

        const items = mergeDuplicateMovies(rawItems);
        const finalBanner = items.slice(0, 7);

        if (!isMounted) return;

        setBannerMovies(finalBanner);
        setCurrentIndex(Math.floor(finalBanner.length / 2));

        finalBanner.forEach((m) => {
          const id = getMovieUniqueId(m);
          if (id) globalDisplayedSlugs.add(id);
        });
      } catch (error) {
        console.error(error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchBannerData();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (bannerMovies.length === 0) return;
    const timer = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % bannerMovies.length);
    }, 3200);
    return () => clearInterval(timer);
  }, [bannerMovies.length]);

  const currentMovie = bannerMovies[currentIndex];

  const nextMovie = useMemo(() => {
    if (!bannerMovies.length) return null;
    return bannerMovies[(currentIndex + 1) % bannerMovies.length];
  }, [bannerMovies, currentIndex]);

  useEffect(() => {
    if (!nextMovie) return;
    const nextSrc = getImg(nextMovie.poster_url || nextMovie.thumb_url);
    if (!nextSrc) return;

    const img = new Image();
    img.decoding = "async";
    img.src = nextSrc;
  }, [nextMovie]);

  const handleTouchStart = (e) => setTouchStartX(e.targetTouches[0].clientX);
  const handleTouchMove = (e) => setTouchEndX(e.targetTouches[0].clientX);

  const handleTouchEnd = () => {
    if (!touchStartX || !touchEndX || bannerMovies.length === 0) return;

    const distance = touchStartX - touchEndX;

    if (distance > 50) {
      setCurrentIndex((prev) => (prev + 1) % bannerMovies.length);
    } else if (distance < -50) {
      setCurrentIndex((prev) => (prev - 1 + bannerMovies.length) % bannerMovies.length);
    }

    setTouchStartX(0);
    setTouchEndX(0);
  };

  if (loading) {
    return (
      <div className="w-full h-[70vh] sm:h-[80vh] md:h-[95vh] lg:h-[100vh] flex justify-center items-center bg-[#050505]">
        <Icon.Loader2 className="animate-spin text-[#E50914]" size={36} />
      </div>
    );
  }

  if (bannerMovies.length === 0) return null;

  return (
    <div className="relative w-full h-[85vh] md:h-[100vh] max-h-[900px] min-h-[680px] md:min-h-[750px] bg-[#050505] overflow-hidden flex flex-col items-center justify-center transform-gpu pt-16 md:pt-10 pb-12 md:pb-4">
      <div className="absolute inset-0 z-0 pointer-events-none">
        <img
          src={getImg(currentMovie?.poster_url || currentMovie?.thumb_url)}
          loading="eager"
          fetchPriority="high"
          decoding="async"
          className="w-full h-full object-cover blur-[40px] opacity-40 scale-125 transform-gpu transition-all duration-700"
          alt=""
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/70 to-transparent" />
      </div>

      <div className="relative z-10 w-full max-w-[1440px] h-full flex flex-col justify-center items-center pointer-events-none mt-10 md:mt-24">
        <div
          className="relative w-full h-[45vh] md:h-[55vh] flex justify-center items-center pointer-events-auto"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {bannerMovies.map((movie, index) => {
            let offset = index - currentIndex;
            const N = bannerMovies.length;

            if (offset > Math.floor(N / 2)) offset -= N;
            else if (offset < -Math.floor((N - 1) / 2)) offset += N;

            const absOffset = Math.abs(offset);
            const direction = offset < 0 ? -1 : 1;

            const positionConfigDesktop = {
              0: { translateX: 0, scale: 1.15, zIndex: 10, brightness: 1, opacity: 1 },
              1: { translateX: 220, scale: 0.9, zIndex: 5, brightness: 0.35, opacity: 1 },
              2: { translateX: 380, scale: 0.75, zIndex: 4, brightness: 0.2, opacity: 1 },
              3: { translateX: 500, scale: 0.6, zIndex: 3, brightness: 0.1, opacity: 1 }
            };

            const positionConfigMobile = {
              0: { translateX: 0, scale: 1.15, zIndex: 10, brightness: 1, opacity: 1 },
              1: { translateX: 120, scale: 0.85, zIndex: 5, brightness: 0.35, opacity: 1 },
              2: { translateX: 200, scale: 0.65, zIndex: 4, brightness: 0.2, opacity: 1 },
              3: { translateX: 260, scale: 0.5, zIndex: 3, brightness: 0.1, opacity: 1 }
            };

            const configMap = isMobile ? positionConfigMobile : positionConfigDesktop;
            const config = configMap[absOffset] || {
              translateX: 600,
              scale: 0.4,
              zIndex: 0,
              brightness: 0,
              opacity: 0
            };

            const tx = absOffset === 0 ? 0 : config.translateX * direction;

            return (
              <div
                key={movie.slug + index}
                className="absolute top-1/2 left-1/2 w-[150px] sm:w-[190px] md:w-[220px] aspect-[2/3] rounded-2xl overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.6)] cursor-pointer select-none"
                style={{
                  transform: `translate(calc(-50% + ${tx}px), -50%) scale(${config.scale})`,
                  zIndex: config.zIndex,
                  filter: `brightness(${config.brightness})`,
                  opacity: config.opacity,
                  transition: "all 0.5s cubic-bezier(0.25, 0.8, 0.25, 1)",
                  pointerEvents: config.opacity === 0 ? "none" : "auto"
                }}
                onClick={() => {
                  if (absOffset === 0) {
                    navigate({ type: "detail", slug: movie.slug, movieData: movie });
                    window.scrollTo(0, 0);
                  } else {
                    setCurrentIndex(index);
                  }
                }}
              >
                <img
                  src={getImg(movie.thumb_url || movie.poster_url)}
                  loading={absOffset <= 1 ? "eager" : "lazy"}
                  fetchPriority={absOffset === 0 ? "high" : absOffset === 1 ? "auto" : "low"}
                  decoding="async"
                  className="w-full h-full object-cover block"
                  alt={safeText(movie.name)}
                />
              </div>
            );
          })}
        </div>

        <div className="w-full max-w-4xl text-center mt-6 md:mt-8 px-4 z-[40] pointer-events-none relative pb-6 md:pb-12">
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-[42px] font-[900] text-white uppercase tracking-tighter line-clamp-2 mb-2 drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)] !font-sans leading-tight">
            {safeText(currentMovie?.name)}
          </h1>

          <p className="text-[#f5c518] text-[10px] md:text-sm font-black mb-3 md:mb-4 drop-shadow-md uppercase tracking-[0.2em] !font-sans">
            {safeText(currentMovie?.origin_name || currentMovie?.original_name)}
          </p>

          <div className="flex justify-center items-center gap-2 md:gap-3 text-[10px] md:text-xs font-black text-gray-300 mb-6 uppercase tracking-widest drop-shadow-md">
            <span className="text-[#E50914]">{safeText(currentMovie?.year, "2025")}</span>
            <span className="text-gray-500">|</span>
            <span className="bg-[#E50914] px-1.5 py-0.5 rounded text-white">
              {safeText(currentMovie?.quality, "HD")}
            </span>
          </div>

          <button
            onClick={() => {
              navigate({ type: "detail", slug: currentMovie?.slug, movieData: currentMovie });
              window.scrollTo(0, 0);
            }}
            className="bg-[#E50914] hover:bg-red-700 text-white px-8 py-3 md:px-10 md:py-3.5 rounded-full font-black flex items-center gap-2 mx-auto transition-transform hover:scale-105 shadow-[0_8px_25px_rgba(229,9,20,0.6)] uppercase tracking-widest text-[10px] md:text-xs pointer-events-auto"
          >
            <Icon.Play size={16} fill="currentColor" /> XEM NGAY
          </button>

          <div className="flex justify-center items-center gap-1.5 md:gap-2 mt-6 md:mt-8 pointer-events-auto">
            {bannerMovies.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`h-1.5 rounded-full transition-all duration-500 ease-out ${
                  currentIndex === idx
                    ? "w-8 md:w-10 bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)]"
                    : "w-3 md:w-4 bg-white/30 hover:bg-white/60"
                }`}
                aria-label={`Đi tới phim ${idx + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}