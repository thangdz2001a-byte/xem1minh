import React, { useState, useEffect, useRef, memo, useMemo } from "react";
import * as Icon from "lucide-react";

// --- BIẾN TOÀN CỤC CHỐNG TRÙNG LẶP TRÊN TRANG CHỦ ---
const globalDisplayedSlugs = new Set();

// --- CẤU HÌNH API --- 
const WORKER_URL = "https://polite-api.thangdz2001a.workers.dev";
const API = "https://ophim1.com/v1/api";
const API_NGUONC = "https://phim.nguonc.com/api/films";
const API_NGUONC_DETAIL = "https://phim.nguonc.com/api/film";
const IMG = "https://img.ophim.live/uploads/movies";
const TMDB_API_KEY = "0e620a51728a0fea887a8506831d8866";

const YEARS = Array.from({ length: 20 }, (_, i) => new Date().getFullYear() - i);

// --- UTILS ---
function getImg(p) {
  if (!p || typeof p !== 'string') return "";
  if (p.startsWith("http")) return p;
  const path = p.startsWith("/") ? p.substring(1) : p;
  return `${IMG}/${path}`;
}

// KIỂM TRA ẢNH LỖI (ƯU TIÊN OPHIM, FALLBACK NGUONC)
const isValidImg = (img) => {
    if (!img || typeof img !== 'string') return false;
    if (img.length < 10) return false;
    if (img.includes('avatar.png') || img.includes('no-poster') || img.includes('default')) return false;
    if (img === 'https://img.ophim.live/uploads/movies/' || img === 'https://img.ophim.live/uploads/movies') return false;
    return true;
};

function formatTime(seconds) {
  if (isNaN(seconds)) return "00:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return h > 0
    ? `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
    : `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

const extractReadableNames = (data) => {
  if (!data) return [];
  if (typeof data === 'string') return [data];
  if (Array.isArray(data)) {
      return data.map(item => {
          if (typeof item === 'string') return item;
          if (item?.name) return item.name;
          if (item?.NAME) return item.NAME;
          return null;
      }).filter(Boolean);
  }
  if (typeof data === 'object') {
      let names = [];
      Object.values(data).forEach(val => {
          if (val && typeof val === 'object') {
              if (val.LIST && Array.isArray(val.LIST)) {
                  val.LIST.forEach(i => {
                      if (typeof i === 'string') names.push(i);
                      else if (i?.name) names.push(i.name);
                      else if (i?.NAME) names.push(i.NAME);
                  });
              } else if (val.name) names.push(val.name);
              else if (val.NAME) names.push(val.NAME);
          }
      });
      return names;
  }
  return [];
};

const safeText = (data, fallback = "") => {
  if (data === null || data === undefined || data === "") return fallback;
  let parsedData = data;
  if (typeof data === 'string') {
      const trimmed = data.trim();
      if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
          try { parsedData = JSON.parse(trimmed); } catch (e) {}
      }
  }
  if (typeof parsedData === 'object' && parsedData !== null) {
      try {
          const names = extractReadableNames(parsedData);
          if (names.length > 0) return names.join(', ');
          return fallback;
      } catch (e) { return fallback; }
  }
  return String(parsedData);
};

const safeJoin = (data) => safeText(data, "Đang cập nhật");

const normalizeString = (s) => {
  if (typeof s === 'object' && s !== null) s = extractReadableNames(s).join(' ');
  return String(s || "").normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[:\-]/g, ' ').replace(/\s+/g, ' ').trim();
};

const getMovieUniqueId = (m) => normalizeString(m?.origin_name || m?.original_name || m?.name);

// --- BỘ LỌC CÁCH LY HOẠT HÌNH / ANIME TUYỆT ĐỐI ---
const isHoatHinhMovie = (m) => {
    if (!m) return false;
    const type = String(m.type || "").toLowerCase();
    const slug = String(m.slug || "").toLowerCase();
    
    if (type.includes("hoathinh") || type.includes("anime") || type.includes("cartoon")) return true;
    if (slug.includes("hoat-hinh") || slug.includes("anime") || slug.includes("doraemon") || slug.includes("conan") || slug.includes("one-piece") || slug.includes("pokemon")) return true;
    
    let cats = "";
    if (Array.isArray(m.category)) {
        cats = m.category.map(c => typeof c === 'string' ? c : (c.name || "")).join(" ").toLowerCase();
    } else if (typeof m.category === 'string') {
        cats = m.category.toLowerCase();
    } else if (m.category) {
        cats = JSON.stringify(m.category).toLowerCase();
    }
    
    if (cats.includes("hoạt hình") || cats.includes("anime") || cats.includes("hoathinh")) return true;
    
    return false;
};

// --- GỘP PHIM VÀ BẮT ẢNH LỖI (ƯU TIÊN OPHIM, FALLBACK NGUONC) ---
const mergeDuplicateMovies = (items) => {
  if (!Array.isArray(items)) return [];
  const merged = [];
  
  items.forEach(item => {
      if (!item) return;
      const epCurrent = String(item.episode_current || "");
      if (epCurrent.toLowerCase().includes("trailer")) return;
      
      const normOrigin = normalizeString(item.origin_name || item.original_name);
      const normName = normalizeString(item.name);
      
      const existingIdx = merged.findIndex(m => {
          const mNormOrigin = normalizeString(m.origin_name || m.original_name);
          const mNormName = normalizeString(m.name);
          const matchOrigin = normOrigin && mNormOrigin && normOrigin === mNormOrigin;
          const matchName = normName && mNormName && normName === mNormName;
          const matchSlug = item.slug && m.slug && item.slug === m.slug;
          return matchOrigin || matchName || matchSlug;
      });
      
      if (existingIdx !== -1) {
          const existingHasImage = isValidImg(merged[existingIdx].thumb_url) || isValidImg(merged[existingIdx].poster_url);
          const newHasImage = isValidImg(item.thumb_url) || isValidImg(item.poster_url);
          // Nếu Ophim bị lỗi ảnh (avatar.png), dùng NguonC đè lên
          if (!existingHasImage && newHasImage) {
              merged[existingIdx] = item; 
          }
      } else {
          merged.push(item);
      }
  });
  return merged;
};

// --- HỆ THỐNG CACHE VÀ RÀ SOÁT TMDB ---
const tmdbCache = new Map();

async function fetchTMDB(name, originName, slug, year) {
  const cacheKey = slug || originName || name;
  if (!cacheKey) return null;
  if (tmdbCache.has(cacheKey)) return tmdbCache.get(cacheKey);

  const extractYear = (dateString) => typeof dateString === 'string' ? dateString.substring(0, 4) : null;

  try {
    let match = null;
    const search = async (query) => {
      let res = await fetch(`${WORKER_URL}/api/tmdb/search/multi?query=${encodeURIComponent(String(query || "").trim())}`);
      let data = await res.json();
      return data.results || [];
    };

    let results = [];
    if (originName) results = await search(originName);
    if (results.length === 0 && name) results = await search(name);

    if (results.length > 0) {
       if (year) {
          match = results.find(item => {
             if (item.media_type === 'person' || (!item.poster_path && !item.backdrop_path)) return false;
             const y = extractYear(item.release_date) || extractYear(item.first_air_date);
             return y && Math.abs(parseInt(y) - parseInt(year)) <= 1;
          });
       }
       if (!match) match = results.find(item => item.media_type !== 'person' && (item.poster_path || item.backdrop_path));
    }

    if (match) {
      tmdbCache.set(cacheKey, match);
      return match;
    }
  } catch (error) {}
  tmdbCache.set(cacheKey, null);
  return null;
}

// --- CÁC COMPONENT ---
function SmartImage({ src, alt, className }) {
  const finalSrc = src ? getImg(src) : "";

  return (
    <img
      src={finalSrc || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1' height='1'%3E%3Crect width='100%25' height='100%25' fill='%23111'/%3E%3C/svg%3E"}
      alt={safeText(alt, "Movie Poster")}
      className={`${className} bg-[#111]`}
      onError={(e) => {
        if (!e.target.dataset.error) {
          e.target.dataset.error = true;
          e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1' height='1'%3E%3Crect width='100%25' height='100%25' fill='%23111'/%3E%3C/svg%3E";
        }
      }}
    />
  );
}

function Player({ ep, poster, movieSlug, movieName, originName, thumbUrl, movieYear, forceIframe, serverSource, serverRawName }) {
  const vRef = useRef(null);
  const containerRef = useRef(null);
  const hlsRef = useRef(null);
  const lastSaveRef = useRef(0); 
  
  const m3u8Link = ep?.link_m3u8;
  const embedLink = ep?.link_embed;
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isIdle, setIsIdle] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [hlsError, setHlsError] = useState(false);
  
  const [levels, setLevels] = useState([]);
  const [currentLevel, setCurrentLevel] = useState(-1);
  
  const useIframe = forceIframe || !m3u8Link || m3u8Link.trim() === "";
  const idleTimeoutRef = useRef(null);

  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setShowSettings(false);
    setIsIdle(false);
    setHlsError(false);
    lastSaveRef.current = 0;
  }, [ep, m3u8Link, forceIframe]);

  useEffect(() => {
    if (!useIframe || !movieSlug || !ep?.slug) return;
    const timer = setTimeout(() => {
      const progress = JSON.parse(localStorage.getItem("movieProgress") || "{}");
      const currentProg = progress[movieSlug];
      progress[movieSlug] = {
        episodeSlug: ep.slug,
        currentTime: currentProg?.currentTime || 0,
        percentage: Math.max(currentProg?.percentage || 0, 1),
        name: movieName,
        origin_name: originName, 
        thumb: thumbUrl,
        year: movieYear,
        serverSource: serverSource,
        serverRawName: serverRawName 
      };
      localStorage.setItem("movieProgress", JSON.stringify(progress));
    }, 5000); 
    return () => clearTimeout(timer);
  }, [useIframe, movieSlug, ep, movieName, originName, thumbUrl, movieYear, serverSource, serverRawName]);

  useEffect(() => {
    if (useIframe || !vRef.current || !m3u8Link) return; 
    
    const v = vRef.current;
    let hls;

    const loadVideo = () => {
      if (v.canPlayType("application/vnd.apple.mpegurl")) {
        v.src = m3u8Link;
      } else if (window.Hls) {
        hls = new window.Hls(); 
        hlsRef.current = hls;
        hls.loadSource(m3u8Link);
        hls.attachMedia(v);
        
        hls.on(window.Hls.Events.MANIFEST_PARSED, () => {
          setLevels(hls.levels);
          setCurrentLevel(hls.currentLevel);
        });

        hls.on(window.Hls.Events.LEVEL_SWITCHED, (event, data) => {
          setCurrentLevel(data.level);
        });

        hls.on(window.Hls.Events.ERROR, function (event, data) {
          if (data.fatal) {
            switch (data.type) {
              case window.Hls.ErrorTypes.NETWORK_ERROR:
              case window.Hls.ErrorTypes.MEDIA_ERROR:
              default:
                hls.destroy();
                setHlsError(true);
                break;
            }
          }
        });
      }
    };

    if (!window.Hls) {
      let existingScript = document.querySelector('script[src="https://cdn.jsdelivr.net/npm/hls.js@latest"]');
      if (!existingScript) {
        existingScript = document.createElement("script");
        existingScript.src = "https://cdn.jsdelivr.net/npm/hls.js@latest";
        document.body.appendChild(existingScript);
      }
      existingScript.addEventListener('load', loadVideo);
    } else {
      loadVideo();
    }

    return () => {
      if (hls) {
         hls.destroy();
         hlsRef.current = null;
      }
    };
  }, [m3u8Link, useIframe]);

  useEffect(() => {
    if (useIframe || !vRef.current || hlsError) return; 
    const video = vRef.current;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      if (video.currentTime > 0 && video.duration > 0 && Math.abs(video.currentTime - lastSaveRef.current) > 5) {
        lastSaveRef.current = video.currentTime;
        const progress = JSON.parse(localStorage.getItem("movieProgress") || "{}");
        progress[movieSlug] = {
          episodeSlug: ep.slug,
          currentTime: video.currentTime,
          percentage: (video.currentTime / video.duration) * 100,
          name: movieName,
          origin_name: originName, 
          thumb: thumbUrl,
          year: movieYear,
          serverSource: serverSource,
          serverRawName: serverRawName 
        };
        localStorage.setItem("movieProgress", JSON.stringify(progress));
      }
    };

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
      const progress = JSON.parse(localStorage.getItem("movieProgress") || "{}");
      const saved = progress[movieSlug];
      if (saved && saved.episodeSlug === ep.slug && saved.percentage < 99) {
        video.currentTime = saved.currentTime;
      }
    };

    const handlePlayState = () => setIsPlaying(true);
    const handlePauseState = () => setIsPlaying(false);

    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("play", handlePlayState);
    video.addEventListener("playing", handlePlayState); 
    video.addEventListener("pause", handlePauseState);
    video.addEventListener("waiting", handlePauseState);
    
    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("play", handlePlayState);
      video.removeEventListener("playing", handlePlayState);
      video.removeEventListener("pause", handlePauseState);
      video.removeEventListener("waiting", handlePauseState);
    };
  }, [ep, hlsError, useIframe, movieSlug, movieName, originName, thumbUrl, movieYear, serverSource, serverRawName]);

  const togglePlay = (e) => {
    if (e) e.stopPropagation();
    if (!vRef.current || hlsError) return;
    if (vRef.current.paused) {
      const playPromise = vRef.current.play();
      if (playPromise !== undefined) playPromise.then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    } else {
      vRef.current.pause();
      setIsPlaying(false);
    }
  };

  const toggleFullscreen = (e) => {
    if (e) e.stopPropagation();
    const container = containerRef.current;
    const video = vRef.current;
    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
      if (container.requestFullscreen) container.requestFullscreen().catch(() => {});
      else if (container.webkitRequestFullscreen) container.webkitRequestFullscreen();
      else if (video && video.webkitEnterFullscreen) video.webkitEnterFullscreen();
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    }
  };

  const switchQuality = (index, e) => {
    if (e) e.stopPropagation();
    if (hlsRef.current) {
      hlsRef.current.currentLevel = index;
      setCurrentLevel(index);
      setShowSettings(false);
    }
  };

  const skipBackward = (e) => {
    if (e) e.stopPropagation();
    if (vRef.current) {
      vRef.current.currentTime = Math.max(0, vRef.current.currentTime - 15);
      setCurrentTime(vRef.current.currentTime);
    }
  };

  const skipForward = (e) => {
    if (e) e.stopPropagation();
    if (vRef.current) {
      vRef.current.currentTime = Math.min(duration, vRef.current.currentTime + 15);
      setCurrentTime(vRef.current.currentTime);
    }
  };

  const handleMouseMove = () => {
    setIsIdle(false);
    if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
    idleTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setIsIdle(true);
    }, 3000);
  };

  useEffect(() => {
    if (useIframe || hlsError) return;
    const handleKeyDown = (e) => {
      if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;
      if (e.code === 'Space') { e.preventDefault(); togglePlay(); }
      if (e.code === 'KeyF') { e.preventDefault(); toggleFullscreen(); }
      if (e.code === 'ArrowRight') { e.preventDefault(); skipForward(); }
      if (e.code === 'ArrowLeft') { e.preventDefault(); skipBackward(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [useIframe, hlsError, isPlaying, duration]);

  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(!!(document.fullscreenElement || document.webkitFullscreenElement));
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    return () => {
       document.removeEventListener("fullscreenchange", handleFullscreenChange);
       document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
    };
  }, []);

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const volumePercent = isMuted ? 0 : volume * 100;

  return (
    <div 
      ref={containerRef} 
      className={`relative w-full aspect-video bg-black shadow-2xl md:rounded-2xl overflow-hidden border border-white/5 group flex justify-center items-center transform-gpu ${isIdle && isPlaying ? "cursor-none" : "cursor-default"}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => { if(isPlaying) setIsIdle(true); }}
      onClick={() => { if(showSettings) setShowSettings(false); }}
    >
      {useIframe && embedLink ? (
        <iframe 
          src={embedLink} 
          className="w-full h-full object-contain bg-black" 
          frameBorder="0" 
          allowFullScreen 
          title="Video Player"
        />
      ) : (
        <>
          {hlsError && (
            <div className="absolute inset-0 flex flex-col justify-center items-center bg-black/90 z-40 text-center px-4">
              <Icon.AlertTriangle className="text-[#E50914] mb-3" size={48} />
              <p className="text-white text-sm md:text-base font-bold uppercase tracking-widest mb-1">Lỗi kết nối Máy Chủ</p>
              <p className="text-gray-400 text-xs md:text-sm">Luồng video bị chặn. Vui lòng chọn Máy Chủ Phát khác.</p>
            </div>
          )}

          <video 
            ref={vRef} 
            poster={poster} 
            playsInline
            webkit-playsinline="true"
            className="w-full h-full object-contain cursor-pointer" 
            onClick={togglePlay}
          />

          <div className={`absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/30 pointer-events-none transition-opacity duration-300 will-change-opacity transform-gpu ${isIdle && isPlaying ? 'opacity-0' : 'opacity-100'}`} />

          {!isPlaying && !hlsError && (
            <button onClick={togglePlay} className="absolute inset-0 m-auto w-14 h-14 md:w-20 md:h-20 bg-[#E50914]/90 rounded-full flex justify-center items-center text-white z-20 hover:scale-110 transition-transform shadow-[0_0_30px_rgba(229,9,20,0.6)] backdrop-blur-md transform-gpu">
              <Icon.Play fill="currentColor" className="w-6 h-6 md:w-8 md:h-8 ml-1" />
            </button>
          )}

          <div className={`absolute bottom-0 left-0 right-0 px-3 md:px-5 pb-3 md:pb-5 pt-12 z-30 transition-transform duration-500 transform-gpu flex flex-col justify-end ${isIdle && isPlaying ? 'translate-y-[120%]' : 'translate-y-0'}`}>
            
            <div className="w-full flex items-center mb-2 md:mb-3 group/progress relative cursor-pointer will-change-transform" onClick={(e) => e.stopPropagation()}>
              <input
                type="range"
                min="0"
                max={duration || 100}
                step="0.1" 
                value={currentTime}
                onChange={(e) => { 
                  if (vRef.current) {
                    const val = parseFloat(e.target.value);
                    vRef.current.currentTime = val; 
                    setCurrentTime(val); 
                  }
                }}
                className="custom-range w-full h-1 md:h-1.5 transition-all relative z-10"
                style={{
                  background: `linear-gradient(to right, #E50914 0%, #E50914 ${progressPercent}%, rgba(255,255,255,0.3) ${progressPercent}%, rgba(255,255,255,0.3) 100%)`
                }}
              />
            </div>

            <div className="flex justify-between items-center text-white w-full" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-2 sm:gap-4">
                <button onClick={skipBackward} className="hover:text-[#E50914] transition-colors focus:outline-none p-1 md:p-0 transform-gpu hover:scale-110">
                  <Icon.RotateCcw className="w-4 h-4 md:w-5 md:h-5" />
                </button>
                <button onClick={togglePlay} className="hover:text-[#E50914] transition-colors focus:outline-none p-1 md:p-0 transform-gpu hover:scale-110">
                  {isPlaying ? <Icon.Pause fill="currentColor" className="w-5 h-5 md:w-6 md:h-6" /> : <Icon.Play fill="currentColor" className="w-5 h-5 md:w-6 md:h-6" />}
                </button>
                <button onClick={skipForward} className="hover:text-[#E50914] transition-colors focus:outline-none p-1 md:p-0 transform-gpu hover:scale-110">
                  <Icon.RotateCw className="w-4 h-4 md:w-5 md:h-5" />
                </button>
                
                <div className="hidden md:flex group/vol items-center gap-2 relative ml-1">
                  <button onClick={() => { if(vRef.current) vRef.current.muted = !vRef.current.muted; setIsMuted(!isMuted); }} className="focus:outline-none hover:text-[#E50914] transition-colors transform-gpu hover:scale-110">
                    {isMuted || volume === 0 ? <Icon.VolumeX className="w-4 h-4 md:w-5 md:h-5" /> : <Icon.Volume2 className="w-4 h-4 md:w-5 md:h-5" />}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={isMuted ? 0 : volume}
                    onChange={(e) => { 
                      if(vRef.current) {
                        const vVal = parseFloat(e.target.value);
                        vRef.current.volume = vVal; 
                        vRef.current.muted = vVal === 0;
                      }
                      setVolume(parseFloat(e.target.value));
                      if(parseFloat(e.target.value) > 0) setIsMuted(false);
                    }}
                    className="custom-range w-0 overflow-hidden group-hover/vol:w-20 transition-all duration-300 h-1 md:h-1.5"
                    style={{
                      background: `linear-gradient(to right, #ffffff 0%, #ffffff ${volumePercent}%, rgba(255,255,255,0.3) ${volumePercent}%, rgba(255,255,255,0.3) 100%)`
                    }}
                  />
                </div>

                <div className="text-[9px] sm:text-[10px] md:text-sm font-bold font-mono tracking-wider drop-shadow-md select-none whitespace-nowrap ml-1">
                  {formatTime(currentTime)} <span className="text-white/50 mx-0.5 md:mx-1">/</span> {formatTime(duration)}
                </div>
              </div>

              <div className="flex items-center gap-3 sm:gap-4">
                <div className="relative">
                  <button onClick={() => setShowSettings(!showSettings)} className="hover:text-[#E50914] transition-all duration-300 focus:outline-none p-1 flex items-center transform-gpu hover:scale-110">
                    <Icon.Settings className={`w-4 h-4 md:w-5 md:h-5 ${showSettings ? "rotate-90 text-[#E50914]" : ""}`} />
                  </button>
                  {showSettings && levels.length > 0 && (
                    <div className="absolute bottom-full right-0 mb-4 bg-[#111]/95 border border-white/10 rounded-xl overflow-hidden py-2 min-w-[100px] md:min-w-[120px] flex flex-col items-center backdrop-blur-xl z-50 shadow-[0_10px_40px_rgba(0,0,0,0.8)] transform-gpu">
                      <span className="text-[9px] md:text-[10px] text-[#E50914] font-black uppercase tracking-[0.2em] mb-2 px-4 border-b border-white/10 pb-2 w-full text-center">Chất lượng</span>
                      <button onClick={(e) => switchQuality(-1, e)} className={`w-full px-4 py-2.5 text-[10px] md:text-xs font-bold hover:bg-white/10 transition-colors ${currentLevel === -1 ? 'text-[#E50914] bg-white/5' : 'text-gray-300'}`}>Tự động</button>
                      {levels.map((lvl, index) => (
                        <button key={index} onClick={(e) => switchQuality(index, e)} className={`w-full px-4 py-2.5 text-[10px] md:text-xs font-bold hover:bg-white/10 transition-colors ${currentLevel === index ? 'text-[#E50914] bg-white/5' : 'text-gray-300'}`}>
                          {lvl.height}p
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <button onClick={toggleFullscreen} className="hover:text-[#E50914] transition-colors focus:outline-none p-1 flex items-center transform-gpu hover:scale-110">
                  {isFullscreen ? <Icon.Minimize className="w-4 h-4 md:w-5 md:h-5" /> : <Icon.Maximize className="w-4 h-4 md:w-5 md:h-5" />}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

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

function SearchModal({ isOpen, onClose, navigate }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
        setTimeout(() => inputRef.current?.focus(), 100);
    } else { 
        setQuery(""); 
        setResults([]); 
        setLoading(false); 
    }
  }, [isOpen]);

  useEffect(() => {
    if (query.trim().length < 2) { 
        setResults([]); 
        setLoading(false); 
        return; 
    }
    
    setLoading(true);
    const controller = new AbortController();
    
    const delay = setTimeout(async () => {
      const timeoutId = setTimeout(() => controller.abort(), 8000); 
      try {
        const encodedQuery = encodeURIComponent(String(query || "").trim());
        
        const pOphim = fetch(`${API}/tim-kiem?keyword=${encodedQuery}`, { signal: controller.signal })
            .then(r => r.json())
            .then(d => {
                if (d?.data?.items && d.data.items.length > 0) return d.data.items;
                throw new Error();
            });
            
        const pNguonc = fetch(`${API_NGUONC}/search?keyword=${encodedQuery}`, { signal: controller.signal })
            .then(r => r.json())
            .then(d => {
                const items = d?.items || d?.data?.items;
                if (items && items.length > 0) return items;
                throw new Error();
            });

        const items = await Promise.any([pOphim, pNguonc]);
        if (!controller.signal.aborted) setResults(mergeDuplicateMovies(items));
        
      } catch (error) {
        if (!controller.signal.aborted) setResults([]);
      } finally {
        clearTimeout(timeoutId);
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 400);
    
    return () => { clearTimeout(delay); controller.abort(); };
  }, [query]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-md flex justify-center pt-16 md:pt-24 px-4 transition-opacity transform-gpu">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative w-full max-w-3xl bg-[#111] rounded-2xl border border-white/10 shadow-2xl flex flex-col max-h-[75vh] overflow-hidden transform-gpu">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (query) { navigate({ type: "search", keyword: query }); onClose(); }
          }}
          className="flex items-center p-4 border-b border-white/5 bg-[#1a1a1a] relative"
        >
          <Icon.Search className="text-gray-400 absolute left-6" size={20} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm kiếm phim..."
            className="w-full bg-transparent outline-none text-white pl-10 pr-20 py-2 text-base md:text-lg"
          />
          <button 
            type="submit" 
            className="absolute right-6 text-xs text-white font-bold bg-[#E50914] hover:bg-red-700 px-4 py-1.5 rounded transition-colors uppercase tracking-widest"
          >
            TÌM
          </button>
        </form>
        <div className="overflow-y-auto flex-1 p-2 no-scrollbar overscroll-contain">
          {loading ? (
            <div className="py-10 flex justify-center"><Icon.Loader2 className="animate-spin text-[#E50914]" size={30} /></div>
          ) : results.length > 0 ? (
            <>
              {results.map((m, idx) => <SearchItem key={m.slug || `s-${idx}`} m={m} navigate={navigate} onClose={onClose} />)}
              <button
                onClick={() => { navigate({ type: "search", keyword: query }); onClose(); }}
                className="w-full mt-2 py-4 text-center text-[#E50914] font-bold text-sm hover:bg-white/5 transition-colors rounded-xl border border-dashed border-white/10"
              >
                Xem tất cả kết quả
              </button>
            </>
          ) : query.trim().length >= 2 && !loading ? (
            <div className="py-10 text-center text-gray-500">Không tìm thấy phim nào phù hợp.</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

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

function MovieSection({ title, slug, type = "the-loai", navigate, progressData }) {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef(null);

  useEffect(() => {
    const controller = new AbortController();
    
    const fetchMovies = async () => {
      try {
        setLoading(true);
        
        const fetchTimeout = (url, ms) => {
            const abortCtrl = new AbortController();
            const id = setTimeout(() => abortCtrl.abort(), ms);
            return fetch(url, { signal: abortCtrl.signal })
                .then(r => r.json())
                .finally(() => clearTimeout(id));
        };

        let reqs = [];

        // NẾU LÀ MỤC HOẠT HÌNH: PHẢI GỌI CẢ /DANH-SACH LẪN /THE-LOAI ĐỂ TRÁNH API TRẢ MẢNG RỖNG
        if (slug === 'hoat-hinh') {
            reqs = [
                fetchTimeout(`${API}/danh-sach/hoat-hinh?page=1`, 4000),
                fetchTimeout(`${API}/the-loai/hoat-hinh?page=1`, 4000),
                fetchTimeout(`${API_NGUONC}/the-loai/hoathinh?page=1`, 4000),
                fetchTimeout(`${API}/danh-sach/hoat-hinh?page=2`, 4000),
                fetchTimeout(`${API}/the-loai/hoat-hinh?page=2`, 4000),
                fetchTimeout(`${API_NGUONC}/the-loai/hoathinh?page=2`, 4000)
            ];
        } else {
            let urlOphim = `${API}/${type}/${slug}`;
            let urlNguonc = slug === 'phim-moi-cap-nhat' ? `${API_NGUONC}/phim-moi-cap-nhat` : `${API_NGUONC}/${type}/${slug}`;
            
            reqs = [
                fetchTimeout(`${urlOphim}?page=1`, 4000),
                fetchTimeout(`${urlNguonc}?page=1`, 4000),
                fetchTimeout(`${urlOphim}?page=2`, 4000),
                fetchTimeout(`${urlNguonc}?page=2`, 4000),
                fetchTimeout(`${urlOphim}?page=3`, 4000),
                fetchTimeout(`${urlNguonc}?page=3`, 4000)
            ];
        }

        const results = await Promise.allSettled(reqs);
        
        let allItems = [];
        results.forEach(res => {
            if (res.status === 'fulfilled' && res.value) {
                const items = res.value.items || res.value.data?.items || [];
                allItems.push(...items);
            }
        });

        let merged = mergeDuplicateMovies(allItems);
        
        // RÀO CHẮN HOẠT HÌNH: CHỈ CHO PHÉP XUẤT HIỆN Ở MỤC HOẠT HÌNH
        if (slug === 'hoat-hinh') {
            // Không filter isHoatHinhMovie nữa vì đã lấy đúng endpoint dành riêng cho Hoạt Hình
        } else {
            merged = merged.filter(m => !isHoatHinhMovie(m));
        }

        // BỘ LỌC CHỐNG TRÙNG LẶP TOÀN CỤC TRÊN TRANG CHỦ
        let uniqueMovies = [];
        merged.forEach(m => {
            const id = getMovieUniqueId(m);
            if (id && !globalDisplayedSlugs.has(id)) {
                uniqueMovies.push(m);
            }
        });

        // BẢO HIỂM GIAO DIỆN: Nếu lọc xong mà còn quá ít phim, thì lấy lại phim cũ để không bị cụt
        let finalMovies = uniqueMovies;
        if (uniqueMovies.length < 10) {
            finalMovies = merged; 
        }

        // LUÔN LUÔN CẮT LẤY 15 PHIM
        finalMovies = finalMovies.slice(0, 15);

        // LƯU CÁC PHIM NÀY VÀO DANH SÁCH ĐÃ HIỂN THỊ
        finalMovies.forEach(m => {
            const id = getMovieUniqueId(m);
            if (id) globalDisplayedSlugs.add(id);
        });

        setMovies(finalMovies);
        
      } catch (error) {
      } finally {
        if (!controller.signal.aborted) {
           setLoading(false);
        }
      }
    };

    fetchMovies();
    return () => controller.abort();
  }, [slug, type]);

  const scroll = (direction) => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current;
      const scrollTo = direction === "left" ? scrollLeft - clientWidth * 0.8 : scrollLeft + clientWidth * 0.8;
      scrollRef.current.scrollTo({ left: scrollTo, behavior: "smooth" });
    }
  };

  if (loading) return (
    <div className="mb-8 md:mb-12 relative group/section transform-gpu">
       <div className="flex items-center gap-4 mb-3 md:mb-4 px-1">
          <h2 className="text-[15px] sm:text-lg md:text-2xl font-black text-white uppercase tracking-tighter flex items-center gap-2 md:gap-3">
            <span className="w-[4px] h-6 md:h-8 bg-[#E50914] block" /> {safeText(title)}
          </h2>
          <Icon.Loader2 className="animate-spin text-[#E50914]" size={20} />
       </div>
    </div>
  );
  if (movies.length === 0) return null;

  return (
    <div className="mb-8 md:mb-12 relative group/section transform-gpu">
      <div className="flex items-center justify-between mb-3 md:mb-4 px-1">
        <h2 className="text-[15px] sm:text-lg md:text-2xl font-black text-white uppercase tracking-tighter flex items-center gap-2 md:gap-3">
          <span className="w-[4px] h-6 md:h-8 bg-[#E50914] block" /> {safeText(title)}
        </h2>
        <button onClick={() => navigate({ type: "list", slug, title, mode: type })} className="text-[#E50914] text-[9px] sm:text-[10px] md:text-xs font-black hover:underline opacity-100 md:opacity-0 group-hover/section:opacity-100 transition-opacity uppercase tracking-widest">Xem tất cả</button>
      </div>
      <div className="relative">
        <button onClick={() => scroll("left")} className="absolute left-0 top-[40%] -translate-y-1/2 z-[40] bg-black/60 hover:bg-black/90 text-white p-2 md:p-3 rounded-r-2xl backdrop-blur-md opacity-0 group-hover/section:opacity-100 transition-all hidden md:flex items-center shadow-2xl transform-gpu">
          <Icon.ChevronLeft size={30} className="md:w-9 md:h-9" />
        </button>
        <div ref={scrollRef} className="flex gap-3 sm:gap-4 md:gap-6 overflow-x-auto scroll-smooth no-scrollbar pb-4 px-1 md:px-2 snap-x snap-mandatory overscroll-x-contain will-change-scroll">
          {movies.map((m) => <MovieCard key={m.slug} m={m} navigate={navigate} progressData={progressData} isRow={true} />)}
        </div>
        <button onClick={() => scroll("right")} className="absolute right-0 top-[40%] -translate-y-1/2 z-[40] bg-black/60 hover:bg-black/90 text-white p-2 md:p-3 rounded-l-2xl backdrop-blur-md opacity-0 group-hover/section:opacity-100 transition-all hidden md:flex items-center shadow-2xl transform-gpu">
          <Icon.ChevronRight size={30} className="md:w-9 md:h-9" />
        </button>
      </div>
    </div>
  );
}

function ContinueWatching({ navigate, progressData, onRemove }) {
  const scrollRef = useRef(null);
  
  const watchedSlugs = useMemo(() => Object.keys(progressData).filter((key) => {
      const item = progressData[key];
      return item && typeof item === 'object' && item.percentage < 99;
  }), [progressData]);
  
  const [fetchedData, setFetchedData] = useState({});

  useEffect(() => {
    const fetchMissingData = async () => {
      let newFetched = { ...fetchedData };
      let hasChanges = false;
      
      for (const slug of watchedSlugs) {
        if (!progressData[slug].origin_name && !newFetched[slug]) {
          try {
            const res = await fetch(`${API}/phim/${slug}`);
            const j = await res.json();
            if (j?.data?.item) {
              newFetched[slug] = j.data.item;
              hasChanges = true;
            } else {
               const res2 = await fetch(`${API_NGUONC_DETAIL}/${slug}`);
               const j2 = await res2.json();
               if(j2?.movie || j2?.item) {
                   newFetched[slug] = j2.movie || j2.item;
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
  }, [watchedSlugs, progressData]);

  if (watchedSlugs.length === 0) return null;

  const scroll = (direction) => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current;
      const scrollTo = direction === "left" ? scrollLeft - clientWidth * 0.8 : scrollLeft + clientWidth * 0.8;
      scrollRef.current.scrollTo({ left: scrollTo, behavior: "smooth" });
    }
  };

  return (
    <div className="mb-8 md:mb-12 animate-in slide-in-from-left duration-500 group/section transform-gpu">
      <div className="flex items-center mb-3 md:mb-4 px-1">
        <h2 className="text-[15px] sm:text-lg md:text-2xl font-black text-white uppercase tracking-tighter flex items-center gap-2 md:gap-3">
          <span className="w-[4px] h-6 md:h-8 bg-[#E50914] block" /> Tiếp tục xem
        </h2>
      </div>
      <div className="relative">
        <button onClick={() => scroll("left")} className="absolute left-0 top-[40%] -translate-y-1/2 z-[40] bg-black/60 hover:bg-black/90 text-white p-2 md:p-3 rounded-r-2xl backdrop-blur-md opacity-0 group-hover/section:opacity-100 transition-all hidden md:flex items-center shadow-2xl transform-gpu">
          <Icon.ChevronLeft size={30} className="md:w-9 md:h-9" />
        </button>
        <div ref={scrollRef} className="flex gap-3 sm:gap-4 md:gap-6 overflow-x-auto scroll-smooth no-scrollbar pb-4 px-1 md:px-2 snap-x snap-mandatory overscroll-x-contain will-change-scroll">
          {watchedSlugs.reverse().map((slug) => {
            const prog = progressData[slug];
            const fetched = fetchedData[slug];
            
            const exactOriginName = prog.origin_name || fetched?.origin_name || fetched?.original_name || prog.name;
            const exactYear = prog.year || fetched?.year;
            const thumb = fetched?.thumb_url || fetched?.poster_url || prog.thumb;

            return (
              <MovieCard 
                key={slug} 
                m={{ 
                  slug, 
                  name: prog.name, 
                  origin_name: exactOriginName, 
                  thumb: thumb,
                  year: exactYear
                }} 
                navigate={navigate} 
                progressData={progressData} 
                isRow={true} 
                onRemove={onRemove} 
                onClickOverride={() => { navigate({ type: "watch", slug, movieData: { item: { slug, name: prog.name, origin_name: exactOriginName, thumb_url: thumb, year: exactYear } } }); window.scrollTo(0, 0); }} 
              />
            );
          })}
        </div>
        <button onClick={() => scroll("right")} className="absolute right-0 top-[40%] -translate-y-1/2 z-[40] bg-black/60 hover:bg-black/90 text-white p-2 md:p-3 rounded-l-2xl backdrop-blur-md opacity-0 group-hover/section:opacity-100 transition-all hidden md:flex items-center shadow-2xl transform-gpu">
          <Icon.ChevronRight size={30} className="md:w-9 md:h-9" />
        </button>
      </div>
    </div>
  );
}

const DropdownGrid = ({ label, items, navigate, mode }) => {
  const [page, setPage] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const cols = mode === "search" ? 4 : 2;
  const itemsPerPage = mode === "search" ? 16 : 14; 
  const totalPages = Math.ceil((items?.length || 0) / itemsPerPage);
  const currentItems = (items || []).slice(page * itemsPerPage, (page + 1) * itemsPerPage);
  const boxWidth = mode === "search" ? "w-[400px]" : "w-[340px]"; 

  return (
    <div
      ref={dropdownRef}
      className="relative flex flex-col items-center justify-center h-full py-4 px-2 lg:px-4 cursor-pointer select-none group w-max"
      onClick={() => {
        setIsOpen(!isOpen);
        setPage(0);
      }}
    >
      <div className="flex items-center justify-center relative transition-colors">
         <span className={`font-black tracking-widest uppercase transition-colors duration-300 whitespace-nowrap ${isOpen ? 'text-[#E50914]' : 'text-gray-300 group-hover:text-[#E50914]'}`}>
           {label}
         </span>
      </div>

      <div
        className={`absolute top-full mt-1 z-50 cursor-default font-sans normal-case tracking-normal font-normal transition-all duration-300 origin-top transform-gpu left-[50%] ${boxWidth}`}
        style={{
           transform: isOpen ? 'translate(-50%, 0) scale(1)' : 'translate(-50%, 10px) scale(0.95)',
           opacity: isOpen ? 1 : 0,
           visibility: isOpen ? 'visible' : 'hidden'
        }}
        onClick={(e) => e.stopPropagation()} 
      >
        <div className="bg-[#141414]/95 backdrop-blur-2xl p-6 rounded-[24px] border border-white/10 shadow-[0_30px_60px_rgba(0,0,0,0.9)] w-full relative">

          <div className={`grid ${cols === 4 ? "grid-cols-4" : "grid-cols-2"} gap-y-3 gap-x-4 min-h-[110px] items-start relative z-20`}>
            {currentItems.map((c) => (
              <button
                key={c.slug || c}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(false); 
                  if (mode === "search") navigate({ type: "search", keyword: c.toString() });
                  else navigate({ type: "list", slug: c.slug, title: c.name, mode: mode });
                }}
                className="py-1.5 text-[14px] font-medium text-gray-400 hover:text-white hover:translate-x-1.5 transition-all text-left w-full truncate flex items-center group/btn"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#E50914] opacity-0 group-hover/btn:opacity-100 transition-opacity mr-2.5 shrink-0 shadow-[0_0_8px_#E50914]"></span>
                {c.name || c}
              </button>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-between items-center mt-5 pt-4 border-t border-white/5 relative z-20">
              <button
                onClick={(e) => { e.stopPropagation(); setPage((p) => Math.max(0, p - 1)); }}
                className={`p-2 rounded-full transition-colors ${page === 0 ? "opacity-30 cursor-not-allowed" : "hover:bg-white/10 text-white"}`}
              >
                <Icon.ChevronLeft size={16} />
              </button>
              <div className="flex gap-2">
                {Array.from({ length: totalPages }).map((_, i) => (
                  <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${i === page ? "bg-[#E50914] scale-150 w-3" : "bg-white/20"}`} />
                ))}
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); setPage((p) => Math.min(totalPages - 1, p + 1)); }}
                className={`p-2 rounded-full transition-colors ${page === totalPages - 1 ? "opacity-30 cursor-not-allowed" : "hover:bg-white/10 text-white"}`}
              >
                <Icon.ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

function Header({ navigate, categories, countries }) {
  const [scrolled, setScrolled] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} navigate={navigate} />
      <header className={`fixed top-0 w-full z-[100] transition-all duration-300 transform-gpu ${scrolled ? "bg-[#050505]/95 backdrop-blur-md border-b border-white/5 py-2 md:py-3 shadow-2xl" : "bg-transparent py-4 md:py-5"}`}>
        <div className="max-w-[1440px] mx-auto px-4 md:px-12 flex justify-between items-center gap-4">
          
          <div 
            className="text-[#E50914] font-[900] text-2xl md:text-[32px] tracking-widest cursor-pointer drop-shadow-md select-none shrink-0" 
            onClick={() => { navigate({ type: "home" }); window.scrollTo(0, 0); }}
          >
            POLITE
          </div>

          <nav className="hidden md:flex items-center justify-center text-[11px] lg:text-[13px] text-gray-300 whitespace-nowrap gap-2 lg:gap-6">
            <button onClick={() => navigate({ type: "home" })} className="relative font-black tracking-widest text-gray-300 hover:text-[#E50914] transition-colors duration-300 uppercase py-4 px-2 group">
              Trang Chủ
            </button>
            <DropdownGrid label="Thể Loại" items={categories} navigate={navigate} mode="the-loai" />
            <DropdownGrid label="Quốc Gia" items={countries} navigate={navigate} mode="quoc-gia" />
            <DropdownGrid label="Năm Phát Hành" items={YEARS} navigate={navigate} mode="search" />
          </nav>

          <div className="flex items-center gap-3 md:gap-5 shrink-0">
            <div onClick={() => setIsSearchOpen(true)} className="hidden lg:flex relative group cursor-pointer transform-gpu">
              <div className="bg-black/30 border border-white/10 px-4 py-2 pl-10 rounded-full w-48 lg:w-72 text-xs lg:text-sm text-gray-400 group-hover:bg-black/60 transition-all backdrop-blur-md flex items-center">Tìm kiếm phim...</div>
              <Icon.Search className="absolute left-3.5 top-2 lg:top-2.5 text-gray-400 group-hover:text-white transition" size={16} />
            </div>
            <button onClick={() => setIsSearchOpen(true)} className="lg:hidden p-1.5"><Icon.Search size={20} className="text-white" /></button>
          </div>
        </div>
      </header>
    </>
  );
}

function BottomNav({ navigate, categories, countries, currentView }) {
  const [menuType, setMenuType] = useState(null); 
  
  let menuTitle = "";
  let menuData = [];
  if (menuType === 'cat') { menuTitle = "Chọn Thể Loại"; menuData = categories; }
  if (menuType === 'country') { menuTitle = "Chọn Quốc Gia"; menuData = countries; }

  return (
    <>
      <div className={`md:hidden fixed inset-0 bg-black/90 z-[110] backdrop-blur-sm transition-opacity duration-300 transform-gpu ${menuType ? "opacity-100" : "opacity-0 pointer-events-none"}`} onClick={() => setMenuType(null)}>
        <div className={`absolute bottom-0 w-full bg-[#111] rounded-t-3xl p-6 transition-transform duration-500 delay-100 transform-gpu ${menuType ? "translate-y-0" : "translate-y-full"}`} onClick={(e) => e.stopPropagation()}>
          <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-6" />
          <h3 className="text-lg font-black text-white mb-6 uppercase tracking-widest text-center">{menuTitle || "Chọn Năm"}</h3>
          <div className="grid grid-cols-2 gap-3 overflow-y-auto max-h-[50vh] pb-8 overscroll-contain">
            {menuType === 'year' ? (
               YEARS.map((y) => (
                 <button key={y} onClick={() => { navigate({ type: "search", keyword: y.toString() }); setMenuType(null); }} className="bg-white/5 py-3 rounded-xl text-xs text-gray-300 font-bold active:bg-[#E50914] transition uppercase tracking-tight">{y}</button>
               ))
            ) : (
               menuData && menuData.map((c) => (
                 <button key={c.slug} onClick={() => { navigate({ type: "list", slug: c.slug, title: c.name, mode: menuType === 'cat' ? "the-loai" : "quoc-gia" }); setMenuType(null); }} className="bg-white/5 py-3 rounded-xl text-xs text-gray-300 font-bold active:bg-[#E50914] transition uppercase tracking-tight">{c.name}</button>
               ))
            )}
          </div>
        </div>
      </div>
      <div className="md:hidden fixed bottom-0 w-full bg-[#0a0a0a]/95 backdrop-blur-xl border-t border-white/5 pb-safe z-[100] transform-gpu">
        <div className="flex justify-around items-center p-2.5">
          {[{ id: "home", icon: Icon.Home, label: "Trang chủ" }, { id: "cat", icon: Icon.LayoutGrid, label: "Thể loại" }, { id: "country", icon: Icon.Globe, label: "Quốc gia" }, { id: "year", icon: Icon.Calendar, label: "Năm" }].map((item) => (
            <button key={item.id} onClick={() => item.id === "home" ? navigate({ type: "home" }) : setMenuType(item.id)} className={`flex flex-col items-center gap-1 transition-colors ${currentView === item.id || (item.id === "home" && currentView === "home") ? "text-[#E50914]" : "text-gray-500"}`}>
              <item.icon size={20} strokeWidth={currentView === item.id ? 2.5 : 2} />
              <span className="text-[9px] font-black uppercase tracking-widest">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

function Hero({ navigate }) {
  const [bannerMovies, setBannerMovies] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  const [touchStartX, setTouchStartX] = useState(0);
  const [touchEndX, setTouchEndX] = useState(0);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize(); 
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const fetchBannerData = async () => {
      try {
        const res1 = await fetch(`${API}/danh-sach/phim-moi-cap-nhat?page=1`).then(r=>r.json());
        const res2 = await fetch(`${API}/danh-sach/phim-moi-cap-nhat?page=2`).then(r=>r.json());
        const res3 = await fetch(`${API}/danh-sach/phim-moi-cap-nhat?page=3`).then(r=>r.json());
        
        let rawItems = [...(res1?.data?.items || []), ...(res2?.data?.items || []), ...(res3?.data?.items || [])];
        
        rawItems = rawItems.filter(m => {
            const epStr = String(m.episode_current || "").toLowerCase();
            if (epStr.includes("trailer")) return false;
            // LỌC BỎ 100% HOẠT HÌNH KHỎI BANNER
            if (isHoatHinhMovie(m)) return false;
            return true;
        });

        let items = mergeDuplicateMovies(rawItems);

        // LUÔN ÉP LẤY ĐÚNG 7 PHIM HOT NHẤT
        const finalBanner = items.slice(0, 7);
        setBannerMovies(finalBanner);
        setCurrentIndex(Math.floor(finalBanner.length / 2));
        
        finalBanner.forEach(m => {
            const id = getMovieUniqueId(m);
            if (id) globalDisplayedSlugs.add(id);
        });

      } catch (error) { console.error(error); } finally { setLoading(false); }
    };
    fetchBannerData();
  }, []);

  useEffect(() => {
    if (bannerMovies.length === 0) return;
    const timer = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % bannerMovies.length);
    }, 3200); 
    return () => clearInterval(timer);
  }, [bannerMovies.length, currentIndex]);

  const handleTouchStart = (e) => setTouchStartX(e.targetTouches[0].clientX);
  const handleTouchMove = (e) => setTouchEndX(e.targetTouches[0].clientX);
  const handleTouchEnd = () => {
    if (!touchStartX || !touchEndX) return;
    const distance = touchStartX - touchEndX;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;
    
    if (isLeftSwipe) {
      setCurrentIndex((prev) => (prev + 1) % bannerMovies.length);
    } else if (isRightSwipe) {
      setCurrentIndex((prev) => (prev - 1 + bannerMovies.length) % bannerMovies.length);
    }
    setTouchStartX(0);
    setTouchEndX(0);
  };

  if (loading) return <div className="w-full h-[70vh] sm:h-[80vh] md:h-[95vh] lg:h-[100vh] flex justify-center items-center bg-[#050505]"><Icon.Loader2 className="animate-spin text-[#E50914]" size={36} /></div>;
  if (bannerMovies.length === 0) return null;

  const currentMovie = bannerMovies[currentIndex];

  return (
    <div 
      className="relative w-full h-[85vh] md:h-[100vh] max-h-[900px] min-h-[680px] md:min-h-[750px] bg-[#050505] overflow-hidden flex flex-col items-center justify-center transform-gpu pt-16 md:pt-10 pb-12 md:pb-4" 
    >
      <div className="absolute inset-0 z-0 pointer-events-none">
        <img
          src={getImg(currentMovie?.poster_url || currentMovie?.thumb_url)}
          className="w-full h-full object-cover blur-[40px] opacity-40 scale-125 transform-gpu transition-all duration-1000 will-change-transform"
          alt=""
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/70 to-transparent" />
      </div>

      <div 
        className="relative z-10 w-full max-w-[1440px] h-full flex flex-col justify-center items-center pointer-events-none mt-10 md:mt-24"
      >
        <div 
          className="relative w-full h-[45vh] md:h-[55vh] flex justify-center items-center pointer-events-auto"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
           {bannerMovies.map((movie, index) => {
              let offset = index - currentIndex;
              const N = bannerMovies.length;
              if (offset > Math.floor(N / 2)) {
                 offset -= N;
              } else if (offset < -Math.floor((N - 1) / 2)) {
                 offset += N;
              }
              
              const absOffset = Math.abs(offset);
              const direction = offset < 0 ? -1 : 1;

              const positionConfigDesktop = {
                 0: { translateX: 0, scale: 1.15, zIndex: 10, brightness: 1, opacity: 1 },
                 1: { translateX: 220, scale: 0.9, zIndex: 5, brightness: 0.35, opacity: 1 },
                 2: { translateX: 380, scale: 0.75, zIndex: 4, brightness: 0.2, opacity: 1 },
                 3: { translateX: 500, scale: 0.6, zIndex: 3, brightness: 0.1, opacity: 1 },
              };

              const positionConfigMobile = {
                 0: { translateX: 0, scale: 1.15, zIndex: 10, brightness: 1, opacity: 1 },
                 1: { translateX: 120, scale: 0.85, zIndex: 5, brightness: 0.35, opacity: 1 },
                 2: { translateX: 200, scale: 0.65, zIndex: 4, brightness: 0.2, opacity: 1 },
                 3: { translateX: 260, scale: 0.5, zIndex: 3, brightness: 0.1, opacity: 1 },
              };

              const configMap = isMobile ? positionConfigMobile : positionConfigDesktop;
              const config = configMap[absOffset] || { translateX: 600, scale: 0.4, zIndex: 0, brightness: 0, opacity: 0 };
              
              const tx = absOffset === 0 ? 0 : config.translateX * direction;
              
              return (
                 <div
                   key={movie.slug + index}
                   className="absolute top-1/2 left-1/2 w-[150px] sm:w-[190px] md:w-[220px] aspect-[2/3] rounded-2xl overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.6)] cursor-pointer select-none will-change-transform"
                   style={{
                     transform: `translate(calc(-50% + ${tx}px), -50%) scale(${config.scale})`,
                     zIndex: config.zIndex,
                     filter: `brightness(${config.brightness})`,
                     opacity: config.opacity,
                     transition: 'all 0.5s cubic-bezier(0.25, 0.8, 0.25, 1)',
                     pointerEvents: config.opacity === 0 ? 'none' : 'auto'
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
                    <div className="absolute top-2 left-2 md:top-3 md:left-3 bg-[#E50914] text-white text-[10px] md:text-xs px-2 py-0.5 rounded font-black uppercase z-10 shadow-md">
                       HD
                    </div>
                    <img
                       src={getImg(movie.thumb_url || movie.poster_url)}
                       className="w-full h-full object-cover block"
                       alt={safeText(movie.name)}
                    />
                 </div>
              );
           })}
        </div>

        <div className="w-full max-w-4xl text-center mt-6 md:mt-8 px-4 z-[40] pointer-events-none relative pb-6 md:pb-12 transition-opacity duration-500">
           
           <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-[42px] font-[900] text-white uppercase tracking-tighter line-clamp-2 mb-2 drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)] !font-sans leading-tight">
             {safeText(currentMovie?.name)}
           </h1>
           
           <p className="text-[#f5c518] text-[10px] md:text-sm font-black mb-3 md:mb-4 drop-shadow-md uppercase tracking-[0.2em] !font-sans">
              {safeText(currentMovie?.origin_name || currentMovie?.original_name)}
           </p>
           
           <div className="flex justify-center items-center gap-2 md:gap-3 text-[10px] md:text-xs font-black text-gray-300 mb-6 uppercase tracking-widest drop-shadow-md">
             <span className="text-[#E50914]">{safeText(currentMovie?.year, "2025")}</span>
             <span className="text-gray-500">|</span>
             <span className="bg-[#E50914] px-1.5 py-0.5 rounded text-white">{safeText(currentMovie?.quality, "HD")}</span>
             {currentMovie?.episode_current && (
               <>
                 <span className="text-gray-500">|</span>
                 <span className="text-gray-200">{safeText(currentMovie?.episode_current)}</span>
               </>
             )}
           </div>
           
           <button
             onClick={() => { navigate({ type: "detail", slug: currentMovie?.slug, movieData: currentMovie }); window.scrollTo(0,0); }}
             className="bg-[#E50914] hover:bg-red-700 text-white px-8 py-3 md:px-10 md:py-3.5 rounded-full font-black flex items-center gap-2 mx-auto transition-transform hover:scale-105 shadow-[0_8px_25px_rgba(229,9,20,0.6)] uppercase tracking-widest text-[10px] md:text-xs pointer-events-auto"
           >
              <Icon.Play size={16} fill="currentColor" /> XEM NGAY
           </button>
           
           <div className="flex justify-center items-center gap-1.5 md:gap-2 mt-6 md:mt-8 pointer-events-auto">
             {bannerMovies.map((_, idx) => (
               <button
                 key={idx}
                 onClick={() => setCurrentIndex(idx)}
                 className={`h-1.5 md:h-1.5 rounded-full transition-all duration-500 ease-out ${
                   currentIndex === idx ? "w-8 md:w-10 bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)]" : "w-3 md:w-4 bg-white/30 hover:bg-white/60"
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

function MovieGrid({ movies, navigate, loading, title, onLoadMore, hasMore, loadingMore }) {
  const observer = useRef();
  const lastElementRef = useRef();

  useEffect(() => {
    if (loading || loadingMore || !hasMore) return;
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver((entries) => { 
        if (entries[0].isIntersecting) onLoadMore(); 
    }, {
        rootMargin: '2000px' 
    });
    
    if (lastElementRef.current) observer.current.observe(lastElementRef.current);
  }, [loading, loadingMore, hasMore, onLoadMore]);

  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-12 pt-20 md:pt-32 pb-10 min-h-screen transform-gpu">
      <h2 className="text-xl md:text-[28px] font-black text-white mb-8 uppercase tracking-tighter flex items-center gap-3">
        <span className="w-[4px] h-6 md:h-9 bg-[#E50914] block" /> {safeText(title)}
      </h2>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-4 sm:gap-6">
        {movies.map((m, idx) => <MovieCard key={`${m.slug || idx}-${idx}`} m={m} navigate={navigate} />)}
      </div>
      {(loading || loadingMore) && <div className="py-12 flex justify-center"><Icon.Loader2 className="animate-spin text-[#E50914]" size={36} /></div>}
      <div ref={lastElementRef} className="h-20" />
    </div>
  );
}

function MovieDetail({ slug, movieData, navigate }) {
  const [m, setM] = useState(() => movieData ? { item: movieData.item || movieData } : null);
  const [cast, setCast] = useState([]); 
  const [loadingPage, setLoadingPage] = useState(!movieData);
  const [error, setError] = useState(false);

  useEffect(() => {
    let isSubscribed = true;
    const fetchFastActors = async () => {
       const q = String(m?.item?.origin_name || m?.item?.original_name || m?.item?.name || String(slug || "").replace(/-/g, ' '));
       if (!q) return;
       try {
           const searchRes = await fetch(`${WORKER_URL}/api/tmdb/search/multi?query=${encodeURIComponent(q)}`).then(r=>r.json());
           const match = searchRes?.results?.find(i => i.media_type !== 'person' && (i.poster_path || i.backdrop_path));
           if (match && isSubscribed) {
               const castRes = await fetch(`https://api.themoviedb.org/3/${match.media_type || 'movie'}/${match.id}/credits?api_key=${TMDB_API_KEY}&language=vi-VN`).then(r=>r.json());
               if (castRes?.cast && isSubscribed) setCast(castRes.cast.slice(0, 12));
           }
       } catch (e) {}
    };
    if (m?.item) fetchFastActors();
    return () => { isSubscribed = false; }
  }, [m?.item?.name, m?.item?.origin_name, slug]);

  useEffect(() => {
    const fetchDetail = async () => {
      if (!m?.item?.content) setLoadingPage(true);
      setError(false);
      try {
        const pOphim = fetch(`${API}/phim/${slug}`).then(r => r.json()).then(j => { if (j?.data?.item) return j.data.item; throw new Error(); });
        const pNguonc = fetch(`${API_NGUONC_DETAIL}/${slug}`).then(r => r.json()).then(j => { if (j?.movie || j?.item) return j.movie || j.item; throw new Error(); });
        
        let item;
        try {
             item = await Promise.any([pOphim, pNguonc]);
        } catch(e) {
             const searchSlug = String(slug || "").replace(/-/g, ' ');
             const searchOphim = fetch(`${API}/tim-kiem?keyword=${encodeURIComponent(searchSlug)}`)
                .then(r=>r.json())
                .then(j => j?.data?.items?.[0]?.slug ? fetch(`${API}/phim/${j.data.items[0].slug}`).then(r=>r.json()).then(j=>j.data.item) : Promise.reject());
             const searchNguonc = fetch(`${API_NGUONC}/search?keyword=${encodeURIComponent(searchSlug)}`)
                .then(r=>r.json())
                .then(j => { 
                    const list = j?.items || j?.data?.items || [];
                    const s = list[0]?.slug; 
                    return s ? fetch(`${API_NGUONC_DETAIL}/${s}`).then(r=>r.json()).then(j=>j.movie||j.item) : Promise.reject()
                });
             item = await Promise.any([searchOphim, searchNguonc]);
        }
        
        if (!item) {
            setError(true);
            setLoadingPage(false);
            return;
        }

        setM({ item });
        setLoadingPage(false);

      } catch (e) {
        setError(true);
        setLoadingPage(false);
      }
    };
    if (slug) fetchDetail();
  }, [slug]);

  if (loadingPage) return <div className="h-screen flex justify-center items-center bg-[#050505]"><Icon.Loader2 className="animate-spin text-[#E50914]" size={40} /></div>;
  
  if (error || !m || !m.item) return (
     <div className="h-screen flex flex-col justify-center items-center bg-[#050505] text-white">
        <Icon.AlertTriangle className="text-[#E50914] mb-4" size={48}/>
        <h2 className="text-xl font-bold">Lỗi tải phim!</h2>
        <p className="text-gray-400 mt-2">Dữ liệu phim có thể đã bị xóa hoặc máy chủ đang quá tải.</p>
        <button onClick={() => navigate({type: 'home'})} className="mt-6 bg-[#E50914] hover:bg-red-700 transition-colors px-6 py-2.5 rounded-full font-bold uppercase text-xs tracking-widest">
           Về Trang Chủ
        </button>
     </div>
  );

  const i = m.item;
  const backdropUrl = getImg(i.poster_url || i.thumb_url);

  return (
    <div className="pb-20 animate-in fade-in duration-700 bg-[#050505]">
      <div className="relative min-h-[70vh] md:h-[95vh] max-h-[900px] w-full overflow-hidden flex flex-col justify-end transform-gpu">
        <img src={backdropUrl} className="absolute inset-0 w-full h-full object-cover object-top opacity-40 blur-xl scale-125 transform-gpu" alt="" />
        
        <div 
          className="absolute inset-0 pointer-events-none z-10"
          style={{
            background: `
              linear-gradient(to top, #050505 0%, #050505 5%, rgba(5,5,5,0.8) 25%, transparent 70%),
              linear-gradient(to right, #050505 0%, rgba(5,5,5,0.8) 15%, transparent 40%),
              linear-gradient(to left, #050505 0%, rgba(5,5,5,0.8) 15%, transparent 40%)
            `
          }}
        />
        
        <div className="relative max-w-[1440px] mx-auto w-full px-4 md:px-12 pb-16 flex flex-col md:flex-row gap-10 items-center md:items-end text-center md:text-left z-20">
          <div className="w-44 md:w-72 shrink-0 shadow-[0_20px_50px_rgba(0,0,0,0.8)] rounded-2xl overflow-hidden border border-white/10 transform-gpu">
            <SmartImage src={i.thumb_url || i.poster_url} className="w-full h-full object-cover" />
          </div>
          <div className="flex-1">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-white mb-4 uppercase tracking-tighter leading-none !font-sans">{safeText(i.name)}</h1>
            <div className="flex flex-wrap justify-center md:justify-start items-center gap-2 md:gap-4 mb-6 md:mb-10 text-gray-300 text-[10px] md:text-base font-black tracking-widest uppercase !font-sans">
              <span className="text-[#E50914]">{safeText(i.year)}</span><span>|</span>
              <span className="bg-[#E50914] px-2 py-0.5 rounded text-white text-[9px] md:text-xs font-black">{safeText(i.quality, "HD")}</span><span>|</span>
              <span className="border-2 border-gray-600 px-2 py-0.5 rounded text-xs">{safeText(i.episode_current)}</span>
              {i.time && (
                <>
                   <span>|</span>
                   <span className="text-gray-400 text-xs flex items-center gap-1"><Icon.Clock size={14} /> {safeText(i.time)}</span>
                </>
              )}
            </div>
            <button 
              onClick={() => { navigate({ type: "watch", slug: i.slug, movieData: m }); window.scrollTo(0, 0); }} 
              className="bg-[#E50914] hover:bg-red-700 text-white px-10 py-4 md:px-14 md:py-5 rounded-full font-black flex items-center gap-3 transition-transform transform-gpu hover:scale-105 active:scale-95 shadow-[0_10px_30px_rgba(229,9,20,0.5)] uppercase tracking-widest text-sm mx-auto md:mx-0 !font-sans"
            >
              <Icon.Play fill="currentColor" /> BẮT ĐẦU XEM
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 md:px-12 mt-8 md:mt-16 grid md:grid-cols-12 gap-8 items-start relative z-20">
        <div className="md:col-span-8 bg-[#111]/50 p-6 md:p-10 rounded-3xl border border-white/5 backdrop-blur-md shadow-2xl">
           <h3 className="text-xl font-black text-white uppercase mb-6 flex items-center gap-3">
             <span className="w-1.5 h-7 bg-[#E50914] block" /> Nội dung phim
           </h3>
           
           <div className="text-gray-400 leading-relaxed text-base md:text-lg font-medium">
             {i.content ? (
                <div dangerouslySetInnerHTML={{ __html: typeof i.content === 'string' ? i.content : safeText(i.content) }} />
             ) : (
                <div className="animate-pulse flex flex-col gap-3">
                    <div className="h-4 bg-white/10 rounded w-full"></div>
                    <div className="h-4 bg-white/10 rounded w-5/6"></div>
                    <div className="h-4 bg-white/10 rounded w-4/6"></div>
                </div>
             )}
           </div>
           
           {cast && cast.length > 0 && (
             <div className="mt-10 pt-8 border-t border-white/5 animate-in fade-in duration-500">
                <h4 className="text-sm font-black text-white uppercase mb-6 tracking-[0.2em] text-[#E50914]">Diễn viên (TMDB)</h4>
                <div className="flex gap-4 md:gap-6 overflow-x-auto scroll-smooth no-scrollbar pb-4 overscroll-x-contain">
                  {cast.map((actor, idx) => (
                    <div 
                      key={idx} 
                      className="shrink-0 text-center w-[72px] md:w-[88px]"
                    >
                      <div className="w-16 h-16 md:w-[80px] md:h-[80px] mx-auto rounded-full overflow-hidden bg-[#222] mb-3 md:mb-4 border border-white/10 transition-colors transform-gpu shadow-lg flex items-center justify-center">
                         <img 
                            src={actor.profile_path ? `https://image.tmdb.org/t/p/w200${actor.profile_path}` : 'https://ui-avatars.com/api/?name=' + encodeURIComponent(String(actor.name || "").trim()) + '&background=111&color=fff'} 
                            alt={safeText(actor.name)} 
                            className="w-full h-full object-cover" 
                         />
                      </div>
                      <p className="text-[10px] md:text-[11px] text-gray-400 font-bold leading-snug line-clamp-2 uppercase tracking-tight transition-colors">{safeText(actor.name)}</p>
                    </div>
                  ))}
                </div>
             </div>
           )}

        </div>

        <div className="md:col-span-4 bg-[#111]/50 p-6 md:p-10 rounded-3xl border border-white/5 backdrop-blur-md shadow-2xl space-y-8">
           {[{ l: "Quốc gia", v: safeJoin(i?.country) }, { l: "Thể loại", v: safeJoin(i?.category) }, { l: "Đạo diễn", v: safeJoin(i?.director) }, { l: "Diễn viên (Chữ)", v: safeJoin(i?.actor) }].map((x, idx) => {
             if (!x.v || x.v === 'Đang cập nhật' || x.v === '') return null;
             return (
              <div key={idx} className="space-y-2 md:space-y-3 border-b border-white/5 pb-4 md:pb-6 last:border-0 last:pb-0">
                <p className="text-[10px] md:text-xs text-gray-500 font-black uppercase tracking-[0.3em]">{x.l}</p>
                <p className="text-xs md:text-base font-bold text-gray-300 leading-snug uppercase tracking-tight">{safeText(x.v)}</p>
              </div>
             )
          })}
        </div>
      </div>
    </div>
  );
}

function Watch({ slug, movieData }) {
  const [data, setData] = useState(movieData?.item || movieData || null);
  const [ep, setEp] = useState(null);
  const [serverList, setServerList] = useState([]);
  
  const [activeServerIdx, setActiveServerIdx] = useState(0);
  const [activeTabIdx, setActiveTabIdx] = useState(0);
  
  const [loadingPage, setLoadingPage] = useState(!data);
  const [loadingPlayer, setLoadingPlayer] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    if (!data) setLoadingPage(true);
    setLoadingPlayer(true);
    setError(false);

    const fetchMovieData = async () => {
        const savedProgress = JSON.parse(localStorage.getItem("movieProgress") || "{}")[slug];
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);
            
            const [resOphim, resNguonc] = await Promise.allSettled([
                fetch(`${API}/phim/${slug}`, { signal: controller.signal }).then(r => r.json()),
                fetch(`${API_NGUONC_DETAIL}/${slug}`, { signal: controller.signal }).then(r => r.json())
            ]);
            clearTimeout(timeoutId);

            let oItem = resOphim.status === 'fulfilled' ? resOphim.value?.data?.item : null;
            let nItem = resNguonc.status === 'fulfilled' ? (resNguonc.value?.movie || resNguonc.value?.item) : null;

            // --- THUẬT TOÁN TRUY QUÉT CHÉO GỘP SERVER (Khắc phục "Ẩn Danh 2" vs "Tài Xế Ẩn Danh (Phần 2)") ---
            const normalizeForMatch = (str) => String(str || "").normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');

            const isCrossMatch = (m1, m2) => {
                if(!m1 || !m2) return false;
                const n1 = normalizeForMatch(m1.name); const n2 = normalizeForMatch(m2.name);
                const o1 = normalizeForMatch(m1.origin_name || m1.original_name); const o2 = normalizeForMatch(m2.origin_name || m2.original_name);
                
                if (o1 && o2 && o1 === o2) return true;
                if (n1 && n2 && n1 === n2) return true;
                
                const y1 = m1.year; const y2 = m2.year;
                if (y1 && y2 && String(y1) === String(y2)) {
                    if (o1 && o2 && (o1.includes(o2) || o2.includes(o1))) return true;
                    if (n1 && n2 && (n1.includes(n2) || n2.includes(n1))) return true;
                }
                return false;
            };

            if (oItem && !nItem) {
                 const queries = [oItem.origin_name, oItem.original_name, oItem.name, oItem.name.replace(/phần \d+/i, '').trim()].filter(Boolean);
                 for (let q of queries) {
                      try {
                          const sRes = await fetch(`${API_NGUONC}/search?keyword=${encodeURIComponent(q)}`).then(r=>r.json());
                          const itemsList = sRes?.items || sRes?.data?.items || [];
                          
                          let match = itemsList.find(i => isCrossMatch(oItem, i));
                          if (!match && itemsList.length > 0) {
                              if (normalizeForMatch(q) === normalizeForMatch(oItem.origin_name || oItem.original_name)) {
                                  match = itemsList[0];
                              }
                          }

                          if (match && match.slug) {
                              const dRes = await fetch(`${API_NGUONC_DETAIL}/${match.slug}`).then(r=>r.json());
                              nItem = dRes?.movie || dRes?.item;
                              if (nItem) break;
                          }
                      } catch(e){}
                 }
            } else if (!oItem && nItem) {
                 const queries = [nItem.origin_name, nItem.original_name, nItem.name, nItem.name.replace(/phần \d+/i, '').trim()].filter(Boolean);
                 for (let q of queries) {
                      try {
                          const sRes = await fetch(`${API}/tim-kiem?keyword=${encodeURIComponent(q)}`).then(r=>r.json());
                          const itemsList = sRes?.data?.items || [];
                          
                          let match = itemsList.find(i => isCrossMatch(nItem, i));
                          if (!match && itemsList.length > 0) {
                              if (normalizeForMatch(q) === normalizeForMatch(nItem.origin_name || nItem.original_name)) {
                                  match = itemsList[0];
                              }
                          }
                          
                          if (match && match.slug) {
                              const dRes = await fetch(`${API}/phim/${match.slug}`).then(r=>r.json());
                              oItem = dRes?.data?.item;
                              if (oItem) break;
                          }
                      } catch(e){}
                 }
            } else if (!oItem && !nItem) {
                 const searchSlug = String(slug || "").replace(/-/g, ' ');
                 const [sO, sN] = await Promise.allSettled([
                     fetch(`${API}/tim-kiem?keyword=${encodeURIComponent(searchSlug)}`).then(r=>r.json()),
                     fetch(`${API_NGUONC}/search?keyword=${encodeURIComponent(searchSlug)}`).then(r=>r.json())
                 ]);
                 
                 const oList = sO.status === 'fulfilled' ? (sO.value?.data?.items || []) : [];
                 const nList = sN.status === 'fulfilled' ? (sN.value?.items || sN.value?.data?.items || []) : [];
                 
                 const oMatchSlug = oList[0]?.slug;
                 const nMatchSlug = nList.find(i => oList[0] ? isCrossMatch(oList[0], i) : true)?.slug || nList[0]?.slug;

                 const [fbO, fbN] = await Promise.allSettled([
                    oMatchSlug ? fetch(`${API}/phim/${oMatchSlug}`).then(r=>r.json()) : Promise.reject(),
                    nMatchSlug ? fetch(`${API_NGUONC_DETAIL}/${nMatchSlug}`).then(r=>r.json()) : Promise.reject()
                 ]);
                 oItem = fbO.status === 'fulfilled' ? fbO.value?.data?.item : null;
                 nItem = fbN.status === 'fulfilled' ? (fbN.value?.movie || fbN.value?.item) : null;
            }

            if (!isMounted) return;

            if (!oItem && !nItem) {
                setError(true);
                setLoadingPage(false);
                setLoadingPlayer(false);
                return;
            }

            const baseItem = oItem || nItem;
            setData(baseItem);

            let extractedServers = [];
            
            if (oItem?.episodes?.length > 0) {
                oItem.episodes.forEach((svr) => {
                    const epsList = svr.server_data || [];
                    if (epsList.length > 0) {
                        extractedServers.push({
                            rawName: svr.server_name || "Vietsub",
                            source: 'ophim',
                            isIframe: false,
                            server_data: epsList.map(e => ({ name: e.name, slug: e.slug, link_m3u8: e.link_m3u8 || "", link_embed: e.link_embed || "" }))
                        });
                    }
                });
            }

            if (nItem?.episodes?.length > 0) {
                nItem.episodes.forEach((svr) => {
                    const epsList = svr.items || svr.server_data || [];
                    if (epsList.length > 0) {
                        extractedServers.push({
                            rawName: svr.server_name || "Vietsub",
                            source: 'nguonc',
                            isIframe: true,
                            server_data: epsList.map(e => ({ name: e.name, slug: e.slug, link_m3u8: e.m3u8 || e.m3u8_url || e.link_m3u8 || "", link_embed: e.embed || e.embed_url || e.link_embed || "" }))
                        });
                    }
                });
            }

            if (extractedServers.length === 0) {
                setError(true);
                setLoadingPage(false);
                setLoadingPlayer(false);
                return;
            }

            extractedServers.forEach(s => {
                s.groupType = String(s.rawName || "Vietsub").replace(/#\d+/g, '').trim().toUpperCase();
            });

            extractedServers.sort((a, b) => {
                if (a.groupType !== b.groupType) return a.groupType.localeCompare(b.groupType);
                const sourceRankA = a.source === 'ophim' ? 1 : (a.source === 'nguonc' ? 2 : 3);
                const sourceRankB = b.source === 'ophim' ? 1 : (b.source === 'nguonc' ? 2 : 3);
                return sourceRankA - sourceRankB;
            });

            const counts = {};
            extractedServers.forEach((s) => {
                counts[s.groupType] = (counts[s.groupType] || 0) + 1;
                s.sourceName = `MÁY CHỦ ${counts[s.groupType]} : ${s.groupType}`;
            });

            setServerList(extractedServers);

            let targetServerIdx = 0;
            let targetEp = extractedServers[0].server_data[0];
            let targetTabIdx = 0;

            if (savedProgress?.serverSource) {
                const foundIdx = extractedServers.findIndex(s => s.source === savedProgress.serverSource && s.rawName === savedProgress.serverRawName);
                if (foundIdx !== -1) {
                    targetServerIdx = foundIdx;
                    const matchEp = extractedServers[foundIdx].server_data.find(e => e.slug === savedProgress.episodeSlug);
                    if (matchEp) {
                        const epIndex = extractedServers[foundIdx].server_data.findIndex(e => e.slug === savedProgress.episodeSlug);
                        targetTabIdx = Math.floor(epIndex / 50);
                        targetEp = matchEp;
                    } else {
                        targetEp = extractedServers[foundIdx].server_data[0];
                    }
                }
            }

            setActiveServerIdx(targetServerIdx);
            setActiveTabIdx(targetTabIdx);
            setEp(targetEp);
            
            setLoadingPage(false);
            setLoadingPlayer(false);

        } catch (e) {
            if (isMounted) {
                setError(true);
                setLoadingPage(false);
                setLoadingPlayer(false);
            }
        }
    };

    fetchMovieData();
    return () => { isMounted = false; };
  }, [slug]);

  if (loadingPage) return <div className="h-screen flex justify-center items-center bg-[#050505]"><Icon.Loader2 className="animate-spin text-[#E50914]" size={40} /></div>;
  
  if (error || (!data && !loadingPlayer)) return (
     <div className="h-screen flex flex-col justify-center items-center bg-[#050505] text-white">
        <Icon.AlertTriangle className="text-[#E50914] mb-4" size={48}/>
        <h2 className="text-xl font-bold">Lỗi tải phim!</h2>
        <p className="text-gray-400 mt-2">Dữ liệu phim có thể đã bị xóa hoặc máy chủ đang quá tải.</p>
        <button onClick={() => navigate({type: 'home'})} className="mt-6 bg-[#E50914] hover:bg-red-700 transition-colors px-6 py-2.5 rounded-full font-bold uppercase text-xs tracking-widest">
           Về Trang Chủ
        </button>
     </div>
  );

  const currentServer = serverList[activeServerIdx];
  const episodes = currentServer?.server_data || [];
  const EPISODES_PER_PAGE = 50;

  const episodeChunks = [];
  for (let i = 0; i < episodes.length; i += EPISODES_PER_PAGE) {
      episodeChunks.push(episodes.slice(i, i + EPISODES_PER_PAGE));
  }
  const currentChunk = episodeChunks[activeTabIdx] || [];

  const handleServerChange = (idx) => {
      setActiveServerIdx(idx);
      setActiveTabIdx(0); 
      const matchingEp = serverList[idx]?.server_data?.find(e => e.name === ep?.name);
      setEp(matchingEp || serverList[idx]?.server_data?.[0]);
  };

  return (
    <div className="pt-16 md:pt-28 pb-10 w-full max-w-[1440px] mx-auto px-0 sm:px-4 md:px-12 animate-in fade-in duration-500 bg-[#050505]">
      
      {ep ? (
          <Player 
             ep={ep} 
             poster={getImg(data?.poster_url || data?.thumb_url)} 
             movieSlug={slug} 
             episodeSlug={ep.slug} 
             movieName={data?.name} 
             originName={data?.origin_name || data?.original_name} 
             thumbUrl={data?.thumb_url || data?.poster_url} 
             movieYear={data?.year}
             forceIframe={currentServer?.isIframe}
             serverSource={currentServer?.source}
             serverRawName={currentServer?.rawName}
          />
      ) : loadingPlayer ? (
          <div className="relative w-full aspect-video bg-[#111] shadow-2xl md:rounded-2xl overflow-hidden border border-white/5 flex justify-center items-center animate-pulse">
              <Icon.Loader2 className="animate-spin text-[#E50914]" size={40} />
          </div>
      ) : null}
      
      <div className="mt-6 md:mt-10 bg-[#111] p-5 md:p-8 rounded-none sm:rounded-2xl border-y sm:border border-white/5 shadow-2xl">
        <h1 className="text-xl md:text-3xl font-black text-white mb-2 md:mb-4 uppercase tracking-tighter line-clamp-2 !font-sans">{safeText(data?.name)}</h1>
        
        {ep ? (
          <p className="text-gray-400 text-xs md:text-lg mb-8 md:mb-10 font-bold uppercase tracking-widest !font-sans">
            Đang phát: Tập <span className="text-[#E50914]">{safeText(String(ep?.name || "").replace(/tập\s*/i, '').replace(/['"]/g, '').trim())}</span>
          </p>
        ) : (
          <div className="h-5 bg-white/10 rounded w-48 mb-8 md:mb-10 animate-pulse" />
        )}
        
        {serverList.length > 0 ? (
           <div className="animate-in fade-in duration-500">
              <div className="mb-6 md:mb-8">
                 {/* RENDER GROUP MÁY CHỦ BỞI TYPE VÀ ÉP VIETSUB LÊN ĐẦU TIÊN */}
                 {Object.entries(
                    serverList.reduce((acc, s, idx) => {
                        if (!acc[s.groupType]) acc[s.groupType] = [];
                        acc[s.groupType].push({ ...s, originalIndex: idx });
                        return acc;
                    }, {})
                 ).sort(([typeA], [typeB]) => {
                     if (typeA.includes('VIETSUB') && !typeB.includes('VIETSUB')) return -1;
                     if (!typeA.includes('VIETSUB') && typeB.includes('VIETSUB')) return 1;
                     return typeA.localeCompare(typeB);
                 }).map(([type, servers]) => (
                     <div key={type} className="mb-4 last:mb-0">
                         <p className="text-gray-400 text-[10px] md:text-xs font-bold uppercase mb-2 tracking-widest">
                             MÁY CHỦ : {type}
                         </p>
                         <div className="flex flex-wrap gap-3">
                            {servers.map((s) => (
                               <button
                                  key={s.originalIndex}
                                  onClick={() => handleServerChange(s.originalIndex)}
                                  className={`flex items-center gap-2 px-4 py-2 md:px-5 md:py-2.5 rounded-lg border transition-all ${activeServerIdx === s.originalIndex ? "border-[#E50914] bg-[#E50914]/10 text-white shadow-[0_0_15px_rgba(229,9,20,0.2)]" : "border-white/10 bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 hover:border-white/20"}`}
                               >
                                  <span className="text-xs md:text-sm font-bold uppercase tracking-widest">{s.sourceName}</span>
                               </button>
                            ))}
                         </div>
                     </div>
                 ))}
              </div>

              {episodeChunks.length > 1 && (
                 <div className="mb-6 md:mb-8">
                    <p className="text-gray-500 text-[10px] md:text-xs font-black uppercase tracking-[0.2em] mb-3 md:mb-4 border-l-2 border-[#E50914] pl-2 leading-none">
                      Chọn Nhóm Tập
                    </p>
                    <div className="flex flex-wrap gap-2 md:gap-3">
                       {episodeChunks.map((_, idx) => {
                          const start = idx * EPISODES_PER_PAGE + 1;
                          const end = Math.min((idx + 1) * EPISODES_PER_PAGE, episodes.length);
                          return (
                             <button
                                key={idx}
                                onClick={() => setActiveTabIdx(idx)}
                                className={`px-3 py-2 md:px-4 md:py-2.5 text-[10px] md:text-xs font-bold rounded-lg border transition-all uppercase tracking-widest ${activeTabIdx === idx ? "border-[#E50914] text-[#E50914] bg-[#E50914]/10" : "border-white/10 text-gray-400 bg-white/5 hover:text-white hover:bg-white/10"}`}
                             >
                                Tập {start} - {end}
                             </button>
                          )
                       })}
                    </div>
                 </div>
              )}

              <div>
                 <div className="flex justify-between items-center mb-3 md:mb-4">
                     <p className="text-gray-500 text-[10px] md:text-xs font-black uppercase tracking-[0.2em] border-l-2 border-[#E50914] pl-2 leading-none">
                       Danh Sách Tập
                     </p>
                 </div>
                 <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2 md:gap-3">
                    {currentChunk.map((e, idx) => {
                       const isActive = ep?.name === e.name;
                       return (
                          <button
                             key={idx}
                             onClick={() => {
                                setEp(e);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                             }}
                             className={`py-3 md:py-4 text-[11px] md:text-sm rounded-lg border transition-all font-black uppercase tracking-tighter flex items-center justify-center ${isActive ? "bg-[#E50914] border-[#E50914] text-white shadow-[0_4px_15px_rgba(229,9,20,0.4)] scale-105 z-10 transform-gpu" : "bg-white/5 border-white/5 text-gray-400 hover:bg-white/10 hover:text-white hover:border-white/20"}`}
                          >
                             {safeText(String(e.name || "").replace(/tập\s*/i, '').replace(/['"]/g, '').trim())}
                          </button>
                       )
                    })}
                 </div>
              </div>
           </div>
        ) : (
           <div className="animate-pulse space-y-6">
              <div className="h-20 bg-white/5 rounded-lg w-full"></div>
              <div className="h-40 bg-white/5 rounded-lg w-full"></div>
           </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [view, setView] = useState({ type: "home" });
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cats, setCats] = useState([]);
  const [countries, setCountries] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [progressData, setProgressData] = useState({});

  const refreshProgress = () => { 
      try {
          setProgressData(JSON.parse(localStorage.getItem("movieProgress") || "{}")); 
      } catch(e) { setProgressData({}); }
  };

  const removeProgress = (slug) => {
    try {
        const current = JSON.parse(localStorage.getItem("movieProgress") || "{}");
        delete current[slug];
        localStorage.setItem("movieProgress", JSON.stringify(current));
        refreshProgress();
    } catch(e){}
  };

  const navigate = (newView) => {
    window.history.pushState(newView, '', '');
    setView(newView);
    window.scrollTo(0, 0);
  };

  // KHI TRỞ VỀ TRANG CHỦ THÌ RESET BỘ LỌC PHIM ĐÃ HIỂN THỊ ĐỂ LOAD LẠI TỪ ĐẦU
  useEffect(() => {
    if (view.type === "home") {
        globalDisplayedSlugs.clear();
    }
  }, [view.type]);

  useEffect(() => {
    const handlePopState = (event) => {
      if (event.state) setView(event.state);
      else setView({ type: "home" });
    };
    window.addEventListener('popstate', handlePopState);
    window.history.replaceState({ type: "home" }, '', '');

    document.title = "POLITE";
    refreshProgress();
    
    fetch(`${API}/the-loai`).then((r) => r.json()).then((j) => {
        let items = j?.data?.items || [];
        items = items.filter(i => i.slug !== 'hoat-hinh');
        items.unshift({ name: 'Hoạt Hình', slug: 'hoat-hinh' });
        setCats(items);
    }).catch(() => {});
    
    fetch(`${API}/quoc-gia`).then((r) => r.json()).then((j) => setCountries(j?.data?.items || [])).catch(() => {});

    const setupPWA = () => {
      const metaTags = [
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
        { name: 'apple-mobile-web-app-title', content: 'POLITE' },
        { name: 'theme-color', content: '#050505' },
        { name: 'mobile-web-app-capable', content: 'yes' }
      ];
      metaTags.forEach(({ name, content }) => {
        let meta = document.createElement('meta');
        meta.name = name;
        meta.content = content;
        document.head.appendChild(meta);
      });

      const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="20" fill="#000000"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-family="Arial, sans-serif" font-weight="900" font-style="italic" font-size="65" fill="#E50914">P</text></svg>`;
      const iconUrl = `data:image/svg+xml;base64,${btoa(svgIcon)}`;
      
      let appleIcon = document.createElement('link');
      appleIcon.rel = 'apple-touch-icon';
      appleIcon.href = iconUrl;
      document.head.appendChild(appleIcon);

      let standardIcon = document.createElement('link');
      standardIcon.rel = 'icon';
      standardIcon.href = iconUrl;
      document.head.appendChild(standardIcon);
      
      const preconnect = document.createElement('link');
      preconnect.rel = 'preconnect';
      preconnect.href = 'https://i0.wp.com'; 
      document.head.appendChild(preconnect);
    };
    setupPWA();

    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const fetchData = async (pageNum, isNewView = false) => {
    if (isNewView) { setLoading(true); setMovies([]); } 
    else { setLoadingMore(true); }

    if (view.type === "actor") return;

    let fetches = [];
    
    if (view.type === "search") {
      const q = encodeURIComponent(String(view.keyword || "").trim());
      fetches = [
          `${API}/tim-kiem?keyword=${q}&page=${pageNum}`,
          `${API_NGUONC}/search?keyword=${q}&page=${pageNum}`
      ];
    } else if (view.type === "list") {
      if (view.slug === 'hoat-hinh') {
          fetches = [
              `${API}/the-loai/hoat-hinh?page=${pageNum}`,
              `${API}/danh-sach/hoat-hinh?page=${pageNum}`,
              `${API}/the-loai/hoa-hinh?page=${pageNum}`,
              `${API_NGUONC}/the-loai/hoathinh?page=${pageNum}`,
              `${API_NGUONC}/danh-sach/hoathinh?page=${pageNum}`
          ];
      } else if (view.slug === 'phim-moi-cap-nhat') {
          fetches = [
              `${API}/danh-sach/phim-moi-cap-nhat?page=${pageNum}`,
              `${API_NGUONC}/phim-moi-cap-nhat?page=${pageNum}`
          ];
      } else {
          fetches = [
              `${API}/${view.mode}/${view.slug}?page=${pageNum}`,
              `${API_NGUONC}/${view.mode}/${view.slug}?page=${pageNum}`
          ];
      }
    } else {
      fetches = [
          `${API}/danh-sach/phim-moi-cap-nhat?page=${pageNum}`,
          `${API_NGUONC}/phim-moi-cap-nhat?page=${pageNum}`
      ];
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); 

    try {
        const reqs = fetches.map(url => fetch(url, { signal: controller.signal }).then(r => r.json()));
        const results = await Promise.allSettled(reqs);

        clearTimeout(timeoutId);

        let newItems = [];

        results.forEach(res => {
            if (res.status === 'fulfilled') {
                const items = res.value?.items || res.value?.data?.items;
                if (Array.isArray(items)) {
                    newItems = [...newItems, ...items];
                }
            }
        });

        setMovies((prev) => {
            const combined = isNewView ? newItems : [...prev, ...newItems];
            return mergeDuplicateMovies(combined);
        });
        
        setHasMore(newItems.length > 0);
        
    } catch(e) {
        if (isNewView) setMovies([]);
        setHasMore(false);
    } finally {
        clearTimeout(timeoutId);
        setLoading(false);
        setLoadingMore(false);
    }
  };

  useEffect(() => {
    if (view.type !== "home" && view.type !== "detail" && view.type !== "watch") {
      setPage(1); fetchData(1, true);
    }
  }, [view]);

  const loadNextPage = () => {
     if (!loadingMore && hasMore) {
        setPage((p) => {
            fetchData(p + 1, false);
            return p + 1;
        });
     }
  };

  return (
    <div className="bg-[#050505] min-h-screen text-white font-sans antialiased selection:bg-[#E50914] selection:text-white pb-16 md:pb-10 overflow-x-hidden">
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800;900&display=swap" rel="stylesheet" />
      
      <style>{`
        * { font-family: 'Inter', sans-serif !important; font-style: normal !important; }
        html { scroll-behavior: smooth; }
        body { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes custom-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-spin { animation: custom-spin 1s linear infinite !important; }
        
        .custom-range { -webkit-appearance: none; outline: none; border-radius: 4px; }
        .custom-range::-webkit-slider-thumb { -webkit-appearance: none; height: 0px; width: 0px; background: transparent; border: none; box-shadow: none; cursor: pointer; }
        .custom-range::-webkit-slider-runnable-track { width: 100%; height: 100%; background: transparent; cursor: pointer; border-radius: 4px; }
      `}</style>
      
      <Header navigate={navigate} categories={cats} countries={countries} />
      
      {view.type === "home" ? (
        <div className="flex flex-col">
          <Hero navigate={navigate} />
          <div className="max-w-[1400px] mx-auto w-full px-4 md:px-12 relative z-20 pb-20 pt-8 md:pt-12">
            
            <ContinueWatching navigate={navigate} progressData={progressData} onRemove={removeProgress} />
            <MovieSection title="Phim Mới Cập Nhật" slug="phim-moi-cap-nhat" type="danh-sach" navigate={navigate} progressData={progressData} />
            <MovieSection title="Anime / Hoạt Hình Hot" slug="hoat-hinh" type="the-loai" navigate={navigate} progressData={progressData} />
            <MovieSection title="Phim Bộ Mới" slug="phim-bo" type="danh-sach" navigate={navigate} progressData={progressData} />
            <MovieSection title="Phim Lẻ Mới" slug="phim-le" type="danh-sach" navigate={navigate} progressData={progressData} />
            
            <MovieSection title="Hành Động - Viễn Tưởng" slug="hanh-dong" type="the-loai" navigate={navigate} progressData={progressData} />
            <MovieSection title="Tình Cảm - Tâm Lý" slug="tinh-cam" type="the-loai" navigate={navigate} progressData={progressData} />
            <MovieSection title="Kinh Dị - Giật Gân" slug="kinh-di" type="the-loai" navigate={navigate} progressData={progressData} />
            <MovieSection title="Hài Hước" slug="hai-huoc" type="the-loai" navigate={navigate} progressData={progressData} />

            <MovieSection title="Phim Hàn Quốc" slug="han-quoc" type="quoc-gia" navigate={navigate} progressData={progressData} />
            <MovieSection title="Phim Trung Quốc" slug="trung-quoc" type="quoc-gia" navigate={navigate} progressData={progressData} />
            <MovieSection title="Phim Âu - Mỹ" slug="au-my" type="quoc-gia" navigate={navigate} progressData={progressData} />
            <MovieSection title="Phim Việt Nam" slug="viet-nam" type="quoc-gia" navigate={navigate} progressData={progressData} />
          </div>
        </div>
      ) : view.type === "detail" ? (
        <MovieDetail slug={view.slug} movieData={view.movieData} navigate={navigate} />
      ) : view.type === "watch" ? (
        <Watch slug={view.slug} movieData={view.movieData} />
      ) : (
        <MovieGrid 
          title={view.type === "search" ? `Tìm kiếm: ${view.keyword}` : view.title} 
          movies={movies} 
          loading={loading} 
          navigate={navigate}
          onLoadMore={loadNextPage} 
          hasMore={hasMore} 
          loadingMore={loadingMore} 
        />
      )}
      
      <BottomNav navigate={navigate} setView={setView} categories={cats} countries={countries} currentView={view.type} />
    </div>
  );
}