import React, { useState, useEffect, useRef, memo, useMemo } from "react";
import * as Icon from "lucide-react";

// --- CẤU HÌNH API ---
const API = "https://ophim1.com/v1/api";
const API_NGUONC = "https://phim.nguonc.com/api/films";
const API_NGUONC_DETAIL = "https://phim.nguonc.com/api/film";
const IMG = "https://img.ophim.live/uploads/movies";
const TMDB_API_KEY = "0e620a51728a0fea887a8506831d8866";

// Danh sách Năm tĩnh
const YEARS = Array.from({ length: 20 }, (_, i) => new Date().getFullYear() - i);

// --- UTILS ---
function getImg(p) {
  if (!p) return "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?q=80&w=500";
  if (p.startsWith("http")) return p;
  const path = p.startsWith("/") ? p.substring(1) : p;
  return `${IMG}/${path}`;
}

function formatTime(seconds) {
  if (isNaN(seconds)) return "00:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return h > 0
    ? `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
    : `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

const safeJoin = (data) => {
  if (!data) return "Đang cập nhật";
  if (typeof data === 'string') return data;
  if (Array.isArray(data)) {
      return data.map(item => typeof item === 'object' && item !== null ? item.name : item).join(", ");
  }
  return "Đang cập nhật";
};

// --- HỆ THỐNG CACHE TMDB ---
const tmdbCache = new Map();

async function fetchTMDB(name, originName, slug, year) {
  const cacheKey = slug || originName || name;
  if (!cacheKey) return null;
  if (tmdbCache.has(cacheKey)) return tmdbCache.get(cacheKey);

  const extractYear = (dateString) => dateString ? dateString.substring(0, 4) : null;

  try {
    let match = null;
    const search = async (query) => {
      let res = await fetch(`https://api.themoviedb.org/3/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&language=vi-VN`);
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
       if (!match) {
          match = results.find(item => item.media_type !== 'person' && (item.poster_path || item.backdrop_path));
       }
    }

    if (match) {
      tmdbCache.set(cacheKey, match);
      return match;
    }
  } catch (error) {}
  tmdbCache.set(cacheKey, null);
  return null;
}

function useTMDBData(name, originName, slug, year) {
  const cacheKey = slug || originName || name;
  const [data, setData] = useState(() => (cacheKey ? tmdbCache.get(cacheKey) : null));
  const [loading, setLoading] = useState(() => (cacheKey ? !tmdbCache.has(cacheKey) : false));

  useEffect(() => {
    if (!cacheKey) return;
    if (tmdbCache.has(cacheKey)) {
      setData(tmdbCache.get(cacheKey));
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);
    fetchTMDB(name, originName, slug, year).then((res) => {
      if (isMounted) {
        setData(res);
        setLoading(false);
      }
    });

    return () => { isMounted = false; };
  }, [name, originName, slug, year, cacheKey]);

  return { data, loading };
}

// --- CÁC COMPONENT ---

function SmartImage({ src, alt, className }) {
  let finalSrc = src ? getImg(src) : "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?q=80&w=500";
  
  return (
    <img
      src={finalSrc}
      alt={alt}
      className={className}
      loading="lazy"
      decoding="async"
      onError={(e) => {
        if (!e.target.dataset.error) {
          e.target.dataset.error = true;
          e.target.src = "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?q=80&w=500";
        }
      }}
    />
  );
}

function Player({ ep, poster, movieSlug, movieName, originName, thumbUrl, movieYear, forceIframe }) {
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
  
  const [useIframe, setUseIframe] = useState(forceIframe || !m3u8Link || m3u8Link.trim() === "");
  const idleTimeoutRef = useRef(null);

  useEffect(() => {
    setUseIframe(forceIframe || !m3u8Link || m3u8Link.trim() === "");
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
        year: movieYear 
      };
      localStorage.setItem("movieProgress", JSON.stringify(progress));
    }, 5000); 
    return () => clearTimeout(timer);
  }, [useIframe, movieSlug, ep, movieName, originName, thumbUrl, movieYear]);

  useEffect(() => {
    if (useIframe || !vRef.current || !m3u8Link) return; 
    
    const v = vRef.current;
    let hls;

    const loadVideo = () => {
      if (v.canPlayType("application/vnd.apple.mpegurl")) {
        v.src = m3u8Link;
      } else if (window.Hls) {
        hls = new window.Hls({
           maxBufferLength: 30,
           maxMaxBufferLength: 600,
        });
        hlsRef.current = hls;
        hls.loadSource(m3u8Link);
        hls.attachMedia(v);
        
        hls.on(window.Hls.Events.MANIFEST_PARSED, (event, data) => {
          setLevels(hls.levels);
          setCurrentLevel(hls.currentLevel);
          v.play().catch(() => {});
        });

        hls.on(window.Hls.Events.LEVEL_SWITCHED, (event, data) => {
          setCurrentLevel(data.level);
        });

        hls.on(window.Hls.Events.ERROR, function (event, data) {
          if (data.fatal) {
            switch (data.type) {
              case window.Hls.ErrorTypes.NETWORK_ERROR:
                hls.destroy();
                setHlsError(true);
                break;
              case window.Hls.ErrorTypes.MEDIA_ERROR:
                hls.recoverMediaError();
                break;
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
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/hls.js@latest";
      s.onload = loadVideo;
      document.body.appendChild(s);
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
          year: movieYear 
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

    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("play", () => setIsPlaying(true));
    video.addEventListener("pause", () => setIsPlaying(false));
    
    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("play", () => setIsPlaying(true));
      video.removeEventListener("pause", () => setIsPlaying(false));
    };
  }, [ep, hlsError, useIframe, movieSlug, movieName, originName, thumbUrl, movieYear]);

  const togglePlay = (e) => {
    if (e) e.stopPropagation();
    if (!vRef.current || hlsError) return;
    if (vRef.current.paused) vRef.current.play();
    else vRef.current.pause();
  };

  const toggleFullscreen = (e) => {
    if (e) e.stopPropagation();
    const container = containerRef.current;
    const video = vRef.current;

    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
      if (container.requestFullscreen) {
        container.requestFullscreen().catch(() => {});
      } else if (container.webkitRequestFullscreen) {
        container.webkitRequestFullscreen();
      } else if (video && video.webkitEnterFullscreen) {
        video.webkitEnterFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      }
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
      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      }
      if (e.code === 'KeyF') {
        e.preventDefault();
        toggleFullscreen();
      }
      if (e.code === 'ArrowRight') {
         e.preventDefault();
         skipForward();
      }
      if (e.code === 'ArrowLeft') {
         e.preventDefault();
         skipBackward();
      }
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
                value={currentTime}
                onChange={(e) => { 
                  if (vRef.current) {
                    vRef.current.currentTime = e.target.value; 
                    setCurrentTime(e.target.value); 
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
                        vRef.current.volume = e.target.value; 
                        vRef.current.muted = e.target.value === "0";
                      }
                      setVolume(e.target.value);
                      if(e.target.value > 0) setIsMuted(false);
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
  return (
    <div
      onClick={() => {
        if(m.slug) {
            navigate({ type: "detail", slug: m.slug });
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
          alt={m.name}
        />
      </div>
      <div className="flex flex-col justify-center py-1">
        <h4 className="text-base md:text-lg font-bold text-white mb-1 line-clamp-1">{m.name}</h4>
        <p className="text-xs md:text-sm text-gray-400 mb-2.5">{(m.origin_name || m.original_name)} • {m.year}</p>
        <div className="flex flex-wrap items-center gap-2 text-[11px] md:text-xs text-gray-400 font-medium">
          <span className="text-gray-300">{m.quality || "HD"}</span>
          <span>•</span>
          <span>{m.episode_current || "Đang cập nhật"}</span>
          {m.tmdb?.vote_average ? (
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
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 100);
    else { setQuery(""); setResults([]); }
  }, [isOpen]);

  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); return; }
    setLoading(true);
    const controller = new AbortController();
    const delay = setTimeout(async () => {
      try {
        const encodedQuery = encodeURIComponent(query);
        const [ophimRes, nguoncRes] = await Promise.allSettled([
          fetch(`${API}/tim-kiem?keyword=${encodedQuery}`, { signal: controller.signal }),
          fetch(`${API_NGUONC}/search?keyword=${encodedQuery}`, { signal: controller.signal })
        ]);

        let combinedItems = [];
        
        if (ophimRes.status === 'fulfilled') {
          const ophimJson = await ophimRes.value.json();
          if (ophimJson?.data?.items) combinedItems = [...combinedItems, ...ophimJson.data.items];
        }
        
        if (nguoncRes.status === 'fulfilled') {
          const nguoncJson = await nguoncRes.value.json();
          const nguoncItems = nguoncJson?.items || nguoncJson?.data?.items || [];
          combinedItems = [...combinedItems, ...nguoncItems];
        }

        const uniqueMap = new Map();
        combinedItems.forEach(m => uniqueMap.set(m.slug, m));
        
        setResults(Array.from(uniqueMap.values()));
      } catch (error) {
        if (error.name !== 'AbortError') console.error("Lỗi tìm kiếm:", error);
      } finally {
        setLoading(false);
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
              {results.map((m) => <SearchItem key={m.slug} m={m} navigate={navigate} onClose={onClose} />)}
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
  const progData = progressData?.[m.slug];
  const prog = progData?.percentage || 0;
  // Ưu tiên thumb_url trước để lấy poster dọc chuẩn
  const thumbSrc = m.thumb_url || m.thumb || m.poster_url;
  
  const voteAverage = m.tmdb?.vote_average;

  return (
    <div
      className={`group/card cursor-pointer flex flex-col shrink-0 relative ${isRow ? "w-[120px] sm:w-[150px] md:w-52 lg:w-60 xl:w-64 snap-start" : ""}`}
      onClick={() => {
        if (onClickOverride) onClickOverride();
        else if (m.slug) { navigate({ type: "detail", slug: m.slug }); window.scrollTo(0, 0); }
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
          alt={m.name} 
        />
        
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/card:opacity-100 transition-opacity duration-500 z-20 pointer-events-none will-change-opacity" />
        
        <div className="absolute top-1.5 left-1.5 md:top-2 md:left-2 bg-[#E50914] text-white text-[8px] md:text-[10px] px-1.5 md:px-2 py-0.5 rounded font-black uppercase shadow-lg tracking-widest z-10">
          {m.quality || "HD"}
        </div>

        {/* Cập nhật style cho episode_current ở phía dưới giống Ophim */}
        {!prog && m.episode_current && (
          <div className="absolute bottom-0 left-0 w-full p-2 flex justify-start items-end bg-gradient-to-t from-black/90 via-black/40 to-transparent z-10 pointer-events-none">
            <span className="bg-[#111]/80 backdrop-blur-sm text-gray-200 text-[9px] md:text-[11px] px-2 py-1 rounded font-bold shadow-md border border-white/10">
              {m.episode_current}
            </span>
          </div>
        )}
        
        {prog > 0 && prog < 99 && (
          <>
            <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-10 pointer-events-none" />
            <div className="absolute bottom-2 md:bottom-3 left-0 w-full flex justify-center items-center z-20 pointer-events-none px-1">
              <span className="text-[9px] md:text-[11px] font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] tracking-wider truncate">
                {progData.episodeSlug?.toUpperCase().replace("TAP-", "TẬP ")?.replace("FULL", "FULL")?.replace(/['"]/g, '').trim()} • {formatTime(progData.currentTime)}
              </span>
            </div>
            <div className="absolute bottom-0 left-0 w-full h-1 md:h-1.5 bg-gray-500/80 z-20">
              <div className="h-full bg-[#E50914]" style={{ width: `${prog}%` }} />
            </div>
          </>
        )}
      </div>
      
      <div className="mt-2 md:mt-3 flex flex-col flex-1 px-1">
        <h3 className="text-[12px] sm:text-[13px] md:text-[15px] font-bold text-gray-200 line-clamp-2 group-hover/card:text-white transition-colors uppercase tracking-tight">{m.name}</h3>
        <div className="flex justify-between items-center mt-1">
          <p className="text-[9px] sm:text-[10px] md:text-[11px] text-gray-500 font-medium">{m.year || "2025"}</p>
          {voteAverage ? (
            <span className="flex items-center gap-1 text-[#f5c518] text-[9px] sm:text-[10px] md:text-[11px] font-bold">
              <Icon.Star fill="currentColor" size={10} className="md:w-[12px] md:h-[12px]" /> {Number(voteAverage).toFixed(1)}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
});

function TrendingSection({ navigate, progressData }) {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef(null);

  // Lấy dữ liệu 100% từ Ophim thay vì TMDB
  useEffect(() => {
    const fetchTrendingFromOphim = async () => {
      try {
        const [resPhimBo, resPhimLe] = await Promise.allSettled([
           fetch(`${API}/danh-sach/phim-bo?page=1`),
           fetch(`${API}/danh-sach/phim-le?page=1`)
        ]);

        let combined = [];
        if (resPhimBo.status === 'fulfilled') {
           const j = await resPhimBo.value.json();
           if(j?.data?.items) combined = [...combined, ...j.data.items.slice(0, 10)];
        }
        if (resPhimLe.status === 'fulfilled') {
           const j = await resPhimLe.value.json();
           if(j?.data?.items) combined = [...combined, ...j.data.items.slice(0, 10)];
        }

        // Randomize the items to make it look organic
        combined = combined.sort(() => 0.5 - Math.random());
        
        const uniqueMovies = Array.from(new Map(combined.map(m => [m.slug, m])).values());
        setMovies(uniqueMovies);
      } catch (error) {
        console.error("Lỗi fetch trending:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTrendingFromOphim();
  }, []);

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
            <span className="w-[4px] h-6 md:h-8 bg-[#E50914] block" /> Phim Thịnh Hành 🔥
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
          <span className="w-[4px] h-6 md:h-8 bg-[#E50914] block" /> Phim Thịnh Hành 🔥
        </h2>
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

function MovieSection({ title, slug, type = "the-loai", navigate, progressData }) {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef(null);

  useEffect(() => {
    const controller = new AbortController();
    
    const fetchAndFilterMovies = async () => {
      try {
        setLoading(true);
        let combinedItems = [];

        try {
          const nguoncUrl = type === 'danh-sach' 
            ? `${API_NGUONC}/phim-moi-cap-nhat` 
            : `${API_NGUONC}/${type === 'quoc-gia' ? 'quoc-gia' : 'the-loai'}/${slug}`;
          const resN = await fetch(nguoncUrl, { signal: controller.signal });
          const jN = await resN.json();
          if (jN?.items) combinedItems = [...combinedItems, ...jN.items];
          else if (jN?.data?.items) combinedItems = [...combinedItems, ...jN.data.items];
        } catch (e) {}

        try {
          const resO = await fetch(`${API}/${type}/${slug}`, { signal: controller.signal });
          const jO = await resO.json();
          if (jO?.data?.items) combinedItems = [...combinedItems, ...jO.data.items];
        } catch (e) {}

        if (combinedItems.length === 0) {
          setLoading(false);
          return;
        }

        const uniqueMap = new Map();
        combinedItems.forEach(m => uniqueMap.set(m.slug, m));
        
        setMovies(Array.from(uniqueMap.values()));
      } catch (error) {
        if (error.name !== 'AbortError') console.error("Lỗi fetch section:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAndFilterMovies();
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
            <span className="w-[4px] h-6 md:h-8 bg-[#E50914] block" /> {title}
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
          <span className="w-[4px] h-6 md:h-8 bg-[#E50914] block" /> {title}
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
  const watchedSlugs = useMemo(() => Object.keys(progressData).filter((key) => progressData[key].percentage < 99), [progressData]);
  
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
                onClickOverride={() => { navigate({ type: "watch", slug }); window.scrollTo(0, 0); }} 
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

// --- FIX LỖI CĂN CHỈNH MENU (DROPDOWN GRID) ---
const DropdownGrid = ({ label, items, navigate, mode }) => {
  const [page, setPage] = useState(0);
  const cols = mode === "search" ? 4 : 3;
  const itemsPerPage = mode === "search" ? 12 : 9;
  const totalPages = Math.ceil((items?.length || 0) / itemsPerPage);
  const currentItems = (items || []).slice(page * itemsPerPage, (page + 1) * itemsPerPage);

  // TÍNH TOÁN VỊ TRÍ ĐỂ CHỮ THẲNG HÀNG VỚI CỘT GIỮA
  let wrapperClass = "left-1/2 -translate-x-[65%]"; // Kéo box sang trái 65% để cột 2 vừa vặn nằm dưới chữ
  let arrowClass = "left-[65%]";
  let boxWidth = "w-[380px]";

  // Điều chỉnh riêng cho "Quốc gia" và "Năm" để không bị tràn màn hình
  if (mode === "search") {
    wrapperClass = "left-1/2 -translate-x-[80%]"; // "Năm Phát Hành" nằm sát lề phải, phải dịch về trái nhiều hơn
    arrowClass = "left-[80%]";
    boxWidth = "w-[420px]";
  } else if (mode === "quoc-gia") {
    wrapperClass = "left-1/2 -translate-x-[70%]";
    arrowClass = "left-[70%]";
  }

  return (
    <div
      className="group cursor-pointer relative flex items-center h-full py-4 px-1 lg:px-2"
      onMouseEnter={() => setPage(0)}
    >
      <span className="font-black tracking-widest uppercase hover:text-white transition whitespace-nowrap">
        {label}
      </span>
      <Icon.ChevronDown
        size={12}
        strokeWidth={3}
        className="ml-1.5 opacity-60 group-hover:rotate-180 transition-transform duration-300"
      />

      <div
        className={`absolute top-full pt-[22px] hidden group-hover:block z-50 cursor-default font-sans normal-case tracking-normal font-normal ${wrapperClass}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`bg-[#111] p-5 rounded-[20px] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.9)] relative ${boxWidth}`}>
          <div className={`absolute -top-[6px] -translate-x-1/2 w-3 h-3 bg-[#111] border-t border-l border-white/10 rotate-45 rounded-tl-[2px] z-10 ${arrowClass}`} />

          <div className={`grid ${cols === 4 ? "grid-cols-4" : "grid-cols-3"} gap-2 text-center min-h-[110px] items-start relative z-20`}>
            {currentItems.map((c) => (
              <button
                key={c.slug || c}
                onClick={(e) => {
                  e.stopPropagation();
                  if (mode === "search") navigate({ type: "search", keyword: c.toString() });
                  else navigate({ type: "list", slug: c.slug, title: c.name, mode: mode });
                }}
                className="py-2.5 px-1 text-[11px] font-bold text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all uppercase tracking-tight text-center w-full truncate"
              >
                {c.name || c}
              </button>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-between items-center mt-3 pt-3 border-t border-white/10 relative z-20">
              <button
                onClick={(e) => { e.stopPropagation(); setPage((p) => Math.max(0, p - 1)); }}
                className={`p-1.5 rounded-full transition-colors ${page === 0 ? "opacity-30 cursor-not-allowed" : "hover:bg-white/10 text-white"}`}
              >
                <Icon.ChevronLeft size={16} />
              </button>
              <div className="flex gap-1.5">
                {Array.from({ length: totalPages }).map((_, i) => (
                  <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all ${i === page ? "bg-[#E50914] scale-125" : "bg-white/20"}`} />
                ))}
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); setPage((p) => Math.min(totalPages - 1, p + 1)); }}
                className={`p-1.5 rounded-full transition-colors ${page === totalPages - 1 ? "opacity-30 cursor-not-allowed" : "hover:bg-white/10 text-white"}`}
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
            <button onClick={() => navigate({ type: "home" })} className="font-black tracking-widest hover:text-white transition uppercase py-4 px-2">Trang Chủ</button>
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

// LÀM LẠI HERO: SỬA LỖI TEXT CHẮN POSTER VÀ TỐI ƯU UX CLICK
function Hero({ navigate }) {
  const [bannerMovies, setBannerMovies] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [hoveredPosterIndex, setHoveredPosterIndex] = useState(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize(); 
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const fetchBannerData = async () => {
      try {
        const [ophimRes, nguoncRes] = await Promise.allSettled([
          fetch(`${API}/danh-sach/phim-moi-cap-nhat`),
          fetch(`${API_NGUONC}/phim-moi-cap-nhat`)
        ]);

        let combinedItems = [];
        if (ophimRes.status === 'fulfilled') {
          const j = await ophimRes.value.json();
          if(j?.data?.items) combinedItems = [...combinedItems, ...j.data.items];
        }
        if (nguoncRes.status === 'fulfilled') {
           const jN = await nguoncRes.value.json();
           if(jN?.items) combinedItems = [...combinedItems, ...jN.items];
           else if(jN?.data?.items) combinedItems = [...combinedItems, ...jN.data.items];
        }

        if (combinedItems.length === 0) { setLoading(false); return; }

        const uniqueMovies = Array.from(new Map(combinedItems.map(m => [m.slug, m])).values());
        const candidates = uniqueMovies.slice(0, 5); 

        setBannerMovies(candidates);
        setCurrentIndex(Math.floor(candidates.length / 2)); 

      } catch (error) { console.error(error); } finally { setLoading(false); }
    };
    fetchBannerData();
  }, []);

  // TỐI ƯU UX: Reset lại bộ đếm 6 giây mỗi khi người dùng chủ động đổi phim (thay đổi currentIndex)
  useEffect(() => {
    if (bannerMovies.length === 0) return;
    const timer = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % bannerMovies.length);
    }, 6000); 
    return () => clearInterval(timer);
  }, [bannerMovies.length, currentIndex]);

  if (loading) return <div className="w-full h-[70vh] sm:h-[80vh] md:h-[95vh] lg:h-[100vh] flex justify-center items-center bg-[#050505]"><Icon.Loader2 className="animate-spin text-[#E50914]" size={36} /></div>;
  if (bannerMovies.length === 0) return null;

  const currentMovie = bannerMovies[currentIndex];

  return (
    <div 
      className="relative w-full h-[85vh] md:h-[100vh] max-h-[900px] min-h-[600px] bg-[#050505] overflow-hidden flex flex-col items-center justify-center transform-gpu pt-10" 
      style={{ perspective: '1200px' }} 
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
        className="relative z-10 w-full max-w-[1440px] h-full flex flex-col justify-center items-center pointer-events-none mt-16 md:mt-24"
      >
        <div className="relative w-full h-[45vh] md:h-[55vh] flex justify-center items-center transform-style-3d pointer-events-auto">
           {bannerMovies.map((movie, index) => {
              const offset = index - currentIndex; 
              let continuousOffset = offset;
              const N = bannerMovies.length;
              if (offset > Math.floor(N / 2)) {
                continuousOffset -= N;
              } else if (offset < -Math.floor((N - 1) / 2)) {
                continuousOffset += N;
              }
              
              const absOffset = Math.abs(continuousOffset);
              const sign = Math.sign(continuousOffset);
              const isHidden = absOffset > 2;

              const translateMultiplier = isMobile ? 85 : 90; 
              const translateX = continuousOffset * translateMultiplier; 
              
              const translateZ = absOffset === 0 ? (isMobile ? 30 : 50) : -absOffset * (isMobile ? 80 : 120);
              const rotateY = sign * (isMobile ? -15 : -20);
              const scale = absOffset === 0 ? (isMobile ? 1.05 : 1.15) : (isMobile ? 0.85 : 0.85); 
              const zIndex = 30 - absOffset;

              const isHovered = hoveredPosterIndex === index;
              const isCenter = absOffset === 0;
              const isBright = isHovered || (hoveredPosterIndex === null && isCenter);
              
              return (
                 <div
                   key={movie.slug + index}
                   onMouseEnter={() => setHoveredPosterIndex(index)}
                   onMouseLeave={() => setHoveredPosterIndex(null)}
                   className="absolute w-[150px] sm:w-[190px] md:w-[240px] lg:w-[280px] aspect-[2/3] rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.6)] cursor-pointer will-change-transform smooth-transition"
                   style={{
                     transform: `translate3d(${translateX}%, 0, ${translateZ}px) rotateY(${absOffset === 0 ? 0 : rotateY}deg) scale(${scale})`,
                     zIndex,
                     opacity: isHidden ? 0 : 1, 
                     pointerEvents: isHidden ? 'none' : 'auto'
                   }}
                   onClick={() => {
                      if (absOffset === 0) {
                         navigate({ type: "detail", slug: movie.slug });
                         window.scrollTo(0, 0);
                      } else {
                         setCurrentIndex(index);
                      }
                   }}
                 >
                    <img
                       src={getImg(movie.thumb_url || movie.poster_url)}
                       className="w-full h-full object-cover"
                       alt={movie.name}
                    />
                    
                    <div 
                      className="absolute inset-0 bg-black pointer-events-none smooth-transition"
                      style={{ opacity: isBright ? 0 : 0.6 }}
                    />

                    <div className="absolute top-2 left-2 md:top-3 md:left-3 bg-[#E50914] text-white text-[10px] md:text-xs px-2 py-0.5 rounded font-black uppercase z-10 shadow-md">
                      HD
                    </div>
                 </div>
              );
           })}
        </div>

        {/* FIX 1: Đổi margin âm thành margin dương (mt-6) để đẩy text xuống, không che lấp click poster */}
        <div className="w-full max-w-4xl text-center mt-6 md:mt-8 px-4 z-[40] transition-all duration-500 pointer-events-auto relative">
           
           {/* FIX 2: Hạ kích thước font xuống 40px (hoặc 42px) cho vừa vặn, không bị khổng lồ */}
           <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-[42px] font-[900] text-white uppercase tracking-tighter line-clamp-2 mb-2 drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)] !font-sans leading-tight">
             {currentMovie?.name}
           </h1>
           
           <p className="text-[#f5c518] text-[10px] md:text-sm font-black mb-3 md:mb-4 drop-shadow-md uppercase tracking-[0.2em] !font-sans">
              {currentMovie?.origin_name || currentMovie?.original_name}
           </p>
           
           <div className="flex justify-center items-center gap-2 md:gap-3 text-[10px] md:text-xs font-black text-gray-300 mb-6 uppercase tracking-widest drop-shadow-md">
             <span className="text-[#E50914]">{currentMovie?.year || "2024"}</span>
             <span className="text-gray-500">|</span>
             <span className="bg-[#E50914] px-1.5 py-0.5 rounded text-white">{currentMovie?.quality || "HD"}</span>
             {currentMovie?.episode_current && (
               <>
                 <span className="text-gray-500">|</span>
                 <span className="text-gray-200">{currentMovie?.episode_current}</span>
               </>
             )}
           </div>
           
           <button
              onClick={() => { navigate({ type: "detail", slug: currentMovie?.slug }); window.scrollTo(0,0); }}
              className="bg-[#E50914] hover:bg-red-700 text-white px-8 py-3 md:px-10 md:py-3.5 rounded-full font-black flex items-center gap-2 mx-auto transition-transform hover:scale-105 shadow-[0_8px_25px_rgba(229,9,20,0.6)] uppercase tracking-widest text-[10px] md:text-xs"
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
  const [progressData, setProgressData] = useState({});

  useEffect(() => { setProgressData(JSON.parse(localStorage.getItem("movieProgress") || "{}")); }, [movies]);

  useEffect(() => {
    if (loading || loadingMore || !hasMore) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver((entries) => { if (entries[0].isIntersecting) onLoadMore(); });
    if (lastElementRef.current) observer.current.observe(lastElementRef.current);
  }, [loading, loadingMore, hasMore, onLoadMore]);

  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-12 pt-20 md:pt-32 pb-10 min-h-screen transform-gpu">
      <h2 className="text-xl md:text-[28px] font-black text-white mb-8 uppercase tracking-tighter flex items-center gap-3">
        <span className="w-[4px] h-6 md:h-9 bg-[#E50914] block" /> {title}
      </h2>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-4 sm:gap-6">
        {movies.map((m, idx) => <MovieCard key={`${m.slug}-${idx}`} m={m} navigate={navigate} progressData={progressData} />)}
      </div>
      {(loading || loadingMore) && <div className="py-12 flex justify-center"><Icon.Loader2 className="animate-spin text-[#E50914]" size={36} /></div>}
      <div ref={lastElementRef} className="h-20" />
    </div>
  );
}

function MovieDetail({ slug, navigate }) {
  const [m, setM] = useState(null);
  const [cast, setCast] = useState([]); 
  const [loadingPage, setLoadingPage] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const fetchDetail = async () => {
      setLoadingPage(true);
      setError(false);
      try {
        const fetchWithTimeout = (url) => Promise.race([
          fetch(url, { signal: controller.signal }).then(r => r.json()),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000))
        ]);

        const [resO, resN] = await Promise.allSettled([
          fetchWithTimeout(`${API}/phim/${slug}`),
          fetchWithTimeout(`${API_NGUONC_DETAIL}/${slug}`)
        ]);

        let finalItem = null;
        if (resO.status === 'fulfilled' && resO.value?.data?.item) {
           finalItem = resO.value.data.item;
        }
        if (!finalItem && resN.status === 'fulfilled' && (resN.value?.movie || resN.value?.item)) {
           finalItem = resN.value.movie || resN.value.item;
        }
        
        if (finalItem) {
           setM({ item: finalItem });
           setLoadingPage(false);
           return;
        } 
        
        const searchSlug = slug.replace(/-/g, ' ');
        try {
           const searchRes = await fetch(`${API_NGUONC}/search?keyword=${encodeURIComponent(searchSlug)}`);
           const searchJ = await searchRes.json();
           const match = searchJ?.items?.[0] || searchJ?.data?.items?.[0];
           if (match && match.slug) {
              const resN2 = await fetch(`${API_NGUONC_DETAIL}/${match.slug}`).then(r => r.json());
              if (resN2?.movie || resN2?.item) {
                 setM({ item: resN2.movie || resN2.item });
                 setLoadingPage(false);
                 return;
              }
           }
        } catch(e) {}
        
        try {
           const searchResO = await fetch(`${API_NGUONC}/tim-kiem?keyword=${encodeURIComponent(searchSlug)}`);
           const searchJO = await searchResO.json();
           const matchO = searchJO?.data?.items?.[0];
           if (matchO && matchO.slug) {
               const resO2 = await fetch(`${API}/phim/${matchO.slug}`).then(r => r.json());
               if (resO2?.data?.item) {
                   setM({ item: resO2.data.item });
                   setLoadingPage(false);
                   return;
               }
           }
        } catch(e) {}

        setError(true);
      } catch (e) {
        if (e.name !== 'AbortError') setError(true);
      } finally {
        setLoadingPage(false);
      }
    };
    if (slug) fetchDetail();
    return () => controller.abort();
  }, [slug]);

  const i = m?.item;
  
  const { data: tmdbData } = useTMDBData(i?.name, i?.origin_name || i?.original_name, i?.slug, i?.year);
  const voteAverage = tmdbData?.vote_average || i?.tmdb?.vote_average;

  useEffect(() => {
    if (tmdbData?.id) {
       const type = tmdbData.media_type || (i?.episode_total > 1 ? 'tv' : 'movie');
       fetch(`https://api.themoviedb.org/3/${type}/${tmdbData.id}/credits?api_key=${TMDB_API_KEY}&language=vi-VN`)
         .then(r => r.json())
         .then(d => {
            if (Array.isArray(d.cast)) setCast(d.cast.slice(0, 12)); 
         })
         .catch(e => console.log(e));
    }
  }, [tmdbData?.id, tmdbData?.media_type, i?.episode_total]);

  if (loadingPage) return <div className="h-screen flex justify-center items-center bg-[#050505]"><Icon.Loader2 className="animate-spin text-[#E50914]" size={40} /></div>;
  
  if (error || !m || !i) return (
     <div className="h-screen flex flex-col justify-center items-center bg-[#050505] text-white">
        <Icon.AlertTriangle className="text-[#E50914] mb-4" size={48}/>
        <h2 className="text-xl font-bold">Lỗi tải phim!</h2>
        <p className="text-gray-400 mt-2">Dữ liệu phim có thể đã bị xóa hoặc máy chủ đang quá tải.</p>
        <button onClick={() => navigate({type: 'home'})} className="mt-6 bg-[#E50914] hover:bg-red-700 transition-colors px-6 py-2.5 rounded-full font-bold uppercase text-xs tracking-widest">
           Về Trang Chủ
        </button>
     </div>
  );

  const backdropUrl = getImg(i?.poster_url || i?.thumb_url);

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
        
        <div className="relative max-w-[1400px] mx-auto w-full px-4 md:px-12 pb-16 flex flex-col md:flex-row gap-10 items-center md:items-end text-center md:text-left z-20">
          <div className="w-44 md:w-72 shrink-0 shadow-[0_20px_50px_rgba(0,0,0,0.8)] rounded-2xl overflow-hidden border border-white/10 transform-gpu">
            <SmartImage src={i?.thumb_url || i?.poster_url} className="w-full h-full object-cover" />
          </div>
          <div className="flex-1">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-white mb-4 uppercase tracking-tighter leading-none !font-sans">{i?.name}</h1>
            <div className="flex flex-wrap justify-center md:justify-start items-center gap-2 md:gap-4 mb-6 md:mb-10 text-gray-300 text-[10px] md:text-base font-black tracking-widest uppercase !font-sans">
              {voteAverage && <span className="flex items-center gap-1 text-[#f5c518]"><Icon.Star fill="currentColor" size={16} /> {Number(voteAverage).toFixed(1)}</span>}
              {voteAverage && <span>|</span>}
              <span className="text-[#E50914]">{i?.year}</span><span>|</span>
              <span className="bg-[#E50914] px-2 py-0.5 rounded text-white text-[9px] md:text-xs font-black">{i?.quality || "HD"}</span><span>|</span>
              <span className="border-2 border-gray-600 px-2 py-0.5 rounded text-xs">{i?.episode_current}</span>
            </div>
            <button 
              onClick={() => { navigate({ type: "watch", slug: i?.slug, movieData: m }); window.scrollTo(0, 0); }} 
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
           <div className="text-gray-400 leading-relaxed text-base md:text-lg font-medium" dangerouslySetInnerHTML={{ __html: typeof i?.content === 'string' ? i.content : "Đang cập nhật nội dung..." }} />
           
           {cast && cast.length > 0 && (
             <div className="mt-10 pt-8 border-t border-white/5">
                <h4 className="text-sm font-black text-white uppercase mb-6 tracking-[0.2em] text-[#E50914]">Diễn viên</h4>
                <div className="flex gap-4 md:gap-6 overflow-x-auto scroll-smooth no-scrollbar pb-4 overscroll-x-contain">
                  {cast.map((actor, idx) => (
                    <div 
                      key={idx} 
                      onClick={() => { navigate({ type: "actor", actorId: actor.id, actorName: actor.name }); window.scrollTo(0,0); }} 
                      className="cursor-pointer shrink-0 text-center w-[72px] md:w-[88px] group"
                    >
                      <div className="w-16 h-16 md:w-[80px] md:h-[80px] mx-auto rounded-full overflow-hidden bg-[#222] mb-3 md:mb-4 border border-white/10 group-hover:border-[#E50914] group-hover:scale-105 transition-transform transform-gpu shadow-lg flex items-center justify-center">
                         <img 
                            src={actor.profile_path ? `https://image.tmdb.org/t/p/w200${actor.profile_path}` : 'https://ui-avatars.com/api/?name=' + encodeURIComponent(actor.name) + '&background=111&color=fff'} 
                            alt={actor.name} 
                            className="w-full h-full object-cover" 
                            loading="lazy"
                         />
                      </div>
                      <p className="text-[10px] md:text-[11px] text-gray-400 group-hover:text-white font-bold leading-snug line-clamp-2 uppercase tracking-tight">{actor.name}</p>
                    </div>
                  ))}
                </div>
             </div>
           )}

        </div>

        <div className="md:col-span-4 bg-[#111]/50 p-6 md:p-10 rounded-3xl border border-white/5 backdrop-blur-md shadow-2xl space-y-8">
           {[{ l: "Quốc gia", v: safeJoin(i?.country) }, { l: "Thể loại", v: safeJoin(i?.category) }, ...(cast.length === 0 ? [{ l: "Diễn viên", v: safeJoin(i?.actor) }] : [])].map((x) => (
            <div key={x.l} className="space-y-2 md:space-y-3 border-b border-white/5 pb-4 md:pb-6 last:border-0 last:pb-0">
              <p className="text-[10px] md:text-xs text-gray-500 font-black uppercase tracking-[0.3em]">{x.l}</p>
              <p className="text-xs md:text-base font-bold text-gray-300 leading-snug uppercase tracking-tight">{x.v}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Watch({ slug, movieData }) {
  const [data, setData] = useState(movieData?.item || null);
  const [ep, setEp] = useState(null);
  const [serverList, setServerList] = useState([]);
  
  const [activeServerIdx, setActiveServerIdx] = useState(0);
  const [activeTabIdx, setActiveTabIdx] = useState(0);
  const [loadingPage, setLoadingPage] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchDualSources = async () => {
      let ophimItem = movieData?.item;
      let nguoncItem = null;
      setLoadingPage(true);
      setError(false);

      try {
        const [resO, resN] = await Promise.allSettled([
          !ophimItem ? fetch(`${API}/phim/${slug}`).then(r => r.json()) : Promise.resolve({ data: { item: ophimItem } }),
          fetch(`${API_NGUONC_DETAIL}/${slug}`).then(r => r.json())
        ]);

        if (resO.status === 'fulfilled' && resO.value?.data?.item) ophimItem = resO.value.data.item;
        if (resN.status === 'fulfilled' && (resN.value?.movie || resN.value?.item)) nguoncItem = resN.value.movie || resN.value.item;

        if (!nguoncItem && (ophimItem?.name || ophimItem?.origin_name)) {
            const searchRes = await fetch(`${API_NGUONC}/search?keyword=${encodeURIComponent(ophimItem.origin_name || ophimItem.name)}`);
            const searchJ = await searchRes.json();
            let match = searchJ?.items?.[0] || searchJ?.data?.items?.[0]; 
            
            if (!match && ophimItem.name) {
              const searchRes2 = await fetch(`${API_NGUONC}/search?keyword=${encodeURIComponent(ophimItem.name)}`);
              const searchJ2 = await searchRes2.json();
              match = searchJ2?.items?.[0] || searchJ2?.data?.items?.[0]; 
            }

            if (match && match.slug) {
              const detailRes = await fetch(`${API_NGUONC_DETAIL}/${match.slug}`);
              const detailJ = await detailRes.json();
              nguoncItem = detailJ?.movie || detailJ?.item || detailJ?.data?.item;
            }
        }

        let combinedServers = [];
        let serverIndexCount = 1;
        
        if (ophimItem?.episodes) {
          ophimItem.episodes.forEach((server) => {
            const eps = server.server_data || [];
            if (eps.length > 0) {
              combinedServers.push({
                sourceName: `Máy Chủ ${serverIndexCount++}`,
                isIframe: false, 
                server_data: eps.map(e => ({
                  name: e.name,
                  slug: e.slug,
                  link_m3u8: e.link_m3u8 || "",
                  link_embed: e.link_embed || ""
                }))
              });
            }
          });
        }

        if (nguoncItem?.episodes) {
          nguoncItem.episodes.forEach((server) => {
            const eps = server.server_data || server.items || [];
            if (eps.length > 0) {
              combinedServers.push({
                sourceName: `Máy Chủ ${serverIndexCount++}`,
                isIframe: true,
                server_data: eps.map(e => ({
                  name: e.name,
                  slug: e.slug,
                  link_m3u8: e.link_m3u8 || e.m3u8_url || e.m3u8 || e.hls_link || "", 
                  link_embed: e.link_embed || e.embed_url || e.embed || ""
                }))
              });
            }
          });
        }

        const finalData = ophimItem || nguoncItem;
        
        if (!finalData) {
           setError(true);
        } else {
           setData(finalData);
           setServerList(combinedServers);
           if (combinedServers.length > 0 && combinedServers[0].server_data?.length > 0) {
             setEp(combinedServers[0].server_data[0]);
             setActiveServerIdx(0);
             setActiveTabIdx(0);
           }
        }
      } catch(e) {
          setError(true);
      } finally {
          setLoadingPage(false);
      }
    };

    fetchDualSources();
  }, [slug, movieData]);

  if (loadingPage) return <div className="h-screen flex justify-center items-center bg-[#050505]"><Icon.Loader2 className="animate-spin text-[#E50914]" size={40} /></div>;
  
  if (error || !data) return (
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
      const newServer = serverList[idx];
      const matchingEp = newServer?.server_data?.find(e => e.name === ep?.name);
      if (matchingEp) setEp(matchingEp);
      else if (newServer?.server_data?.length > 0) setEp(newServer.server_data[0]);
  };

  return (
    <div className="pt-16 md:pt-28 pb-10 w-full max-w-[1400px] mx-auto px-0 sm:px-4 md:px-12 animate-in fade-in duration-500 bg-[#050505]">
      
      {ep && <Player 
         ep={ep} 
         poster={getImg(data?.poster_url || data?.thumb_url)} 
         movieSlug={slug} 
         episodeSlug={ep.slug} 
         movieName={data?.name} 
         originName={data?.origin_name || data?.original_name} 
         thumbUrl={data?.thumb_url || data?.poster_url} 
         movieYear={data?.year}
         forceIframe={currentServer?.isIframe}
      />}
      
      <div className="mt-6 md:mt-10 bg-[#111] p-5 md:p-8 rounded-none sm:rounded-2xl border-y sm:border border-white/5 shadow-2xl">
        <h1 className="text-xl md:text-3xl font-black text-white mb-2 md:mb-4 uppercase tracking-tighter line-clamp-2 !font-sans">{data?.name}</h1>
        
        <p className="text-gray-400 text-xs md:text-lg mb-8 md:mb-10 font-bold uppercase tracking-widest !font-sans">
          Đang phát: Tập <span className="text-[#E50914]">{ep?.name?.replace(/tập\s*/i, '').replace(/['"]/g, '').trim()}</span>
        </p>
        
        {serverList.length > 0 && (
           <>
              <div className="mb-6 md:mb-8">
                 <p className="text-gray-500 text-[10px] md:text-xs font-black uppercase tracking-[0.2em] mb-3 md:mb-4 border-l-2 border-[#E50914] pl-2 leading-none">
                   Chọn Máy Chủ Phát
                 </p>
                 <div className="flex flex-wrap gap-3">
                    {serverList.map((s, idx) => (
                       <button
                          key={idx}
                          onClick={() => handleServerChange(idx)}
                          className={`flex items-center gap-2 px-4 py-2 md:px-5 md:py-2.5 rounded-lg border transition-all ${activeServerIdx === idx ? "border-[#E50914] bg-[#E50914]/10 text-white shadow-[0_0_15px_rgba(229,9,20,0.2)]" : "border-white/10 bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 hover:border-white/20"}`}
                       >
                          <span className="text-xs md:text-sm font-bold uppercase tracking-widest">{s.sourceName}</span>
                       </button>
                    ))}
                 </div>
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
                     <span className="text-gray-600 text-[9px] md:text-[10px] uppercase tracking-widest font-bold">
                       Click để xem
                     </span>
                 </div>
                 <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2 md:gap-3">
                    {currentChunk.map((e, idx) => {
                       const isActive = ep?.link_m3u8 === e.link_m3u8 && ep?.name === e.name;
                       return (
                          <button
                             key={idx}
                             onClick={() => {
                                setEp(e);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                             }}
                             className={`py-3 md:py-4 text-[11px] md:text-sm rounded-lg border transition-all font-black uppercase tracking-tighter flex items-center justify-center ${isActive ? "bg-[#E50914] border-[#E50914] text-white shadow-[0_4px_15px_rgba(229,9,20,0.4)] scale-105 z-10 transform-gpu" : "bg-white/5 border-white/5 text-gray-400 hover:bg-white/10 hover:text-white hover:border-white/20"}`}
                          >
                             {e.name?.replace(/tập\s*/i, '').replace(/['"]/g, '').trim()}
                          </button>
                       )
                    })}
                 </div>
              </div>
           </>
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

  const refreshProgress = () => { setProgressData(JSON.parse(localStorage.getItem("movieProgress") || "{}")); };
  const removeProgress = (slug) => {
    const current = JSON.parse(localStorage.getItem("movieProgress") || "{}");
    delete current[slug];
    localStorage.setItem("movieProgress", JSON.stringify(current));
    refreshProgress();
  };

  const navigate = (newView) => {
    window.history.pushState(newView, '', '');
    setView(newView);
    window.scrollTo(0, 0);
  };

  useEffect(() => {
    const handlePopState = (event) => {
      if (event.state) setView(event.state);
      else setView({ type: "home" });
    };
    window.addEventListener('popstate', handlePopState);
    window.history.replaceState({ type: "home" }, '', '');

    document.title = "POLITE";
    refreshProgress();
    
    fetch(`${API}/the-loai`).then((r) => r.json()).then((j) => setCats(j?.data?.items || [])).catch(() => {});
    fetch(`${API}/quoc-gia`).then((r) => r.json()).then((j) => setCountries(j?.data?.items || [])).catch(() => {});

    // SETUP PWA
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

      const manifest = {
        name: "POLITE Phim",
        short_name: "POLITE",
        start_url: ".",
        display: "standalone",
        background_color: "#050505",
        theme_color: "#050505",
        icons: [{ src: iconUrl, sizes: "512x512", type: "image/svg+xml" }]
      };
      const blob = new Blob([JSON.stringify(manifest)], { type: 'application/json' });
      const manifestUrl = URL.createObjectURL(blob);
      let manifestLink = document.createElement('link');
      manifestLink.rel = 'manifest';
      manifestLink.href = manifestUrl;
      document.head.appendChild(manifestLink);
    };
    setupPWA();

    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const fetchData = async (pageNum, isNewView = false) => {
    if (isNewView) { setLoading(true); setMovies([]); } 
    else { setLoadingMore(true); }

    if (view.type === "actor") {
       try {
         const tmdbRes = await fetch(`https://api.themoviedb.org/3/person/${view.actorId}/combined_credits?api_key=${TMDB_API_KEY}&language=vi-VN`);
         const tmdbData = await tmdbRes.json();
         
         const topMovies = (tmdbData.cast || [])
            .filter(m => (m.media_type === "movie" || m.media_type === "tv") && !m.character?.toLowerCase().includes("self") && !m.character?.toLowerCase().includes("voice") && !m.character?.toLowerCase().includes("uncredited"))
            .sort((a,b) => b.popularity - a.popularity)
            .slice(0, 40); 

         const searchPromises = topMovies.map(async (tmdbItem) => {
            const titleQuery = tmdbItem.original_title || tmdbItem.original_name || tmdbItem.title || tmdbItem.name;
            const releaseYear = (tmdbItem.release_date || tmdbItem.first_air_date || '').substring(0, 4);
            if (!titleQuery) return null;
            
            const normalize = (s) => (s || "").toLowerCase().replace(/[:\-]/g, ' ').replace(/\s+/g, ' ').trim();
            const qOrig = normalize(tmdbItem.original_title || tmdbItem.original_name);
            const qLocal = normalize(tmdbItem.title || tmdbItem.name);

            const checkMatch = (items) => {
                if (!items || items.length === 0) return null;
                let match = items.find(m => normalize(m.origin_name || m.original_name) === qOrig);
                if (!match) match = items.find(m => normalize(m.name) === qLocal);
                if (!match && qOrig.length > 3) {
                    match = items.find(m => {
                        const mOrig = normalize(m.origin_name || m.original_name);
                        const isSimilarName = mOrig.includes(qOrig) || qOrig.includes(mOrig) || normalize(m.name).includes(qLocal);
                        const isSameYear = releaseYear && m.year && Math.abs(parseInt(m.year) - parseInt(releaseYear)) <= 1;
                        return isSimilarName && isSameYear;
                    });
                }
                return match || null; 
            };

            try {
               const [resN, resO] = await Promise.allSettled([
                  fetch(`${API_NGUONC}/search?keyword=${encodeURIComponent(titleQuery)}`).then(r => r.json()),
                  fetch(`${API}/tim-kiem?keyword=${encodeURIComponent(titleQuery)}`).then(r => r.json())
               ]);
               
               let matchResult = null;
               if (resN.status === 'fulfilled') matchResult = checkMatch(resN.value?.items || resN.value?.data?.items);
               if (!matchResult && resO.status === 'fulfilled') matchResult = checkMatch(resO.value?.data?.items);
               
               return matchResult;
            } catch(e) { return null; }
         });

         const results = await Promise.all(searchPromises);
         const validMovies = results.filter(Boolean);
         
         const uniqueMap = new Map();
         validMovies.forEach(m => {
            const key = m.origin_name || m.original_name || m.slug;
            if(!uniqueMap.has(key)) uniqueMap.set(key, m);
         });
         
         setMovies(Array.from(uniqueMap.values()).slice(0, 20));
         setHasMore(false); 
       } catch(e) {
         console.error(e);
       } finally {
         setLoading(false);
         setLoadingMore(false);
       }
       return; 
    }

    let urlOphim = "";
    let urlNguonc = "";
    
    if (view.type === "search") {
      urlOphim = `${API}/tim-kiem?keyword=${encodeURIComponent(view.keyword)}&page=${pageNum}`;
      urlNguonc = `${API_NGUONC}/search?keyword=${encodeURIComponent(view.keyword)}&page=${pageNum}`;
    } else if (view.type === "list") {
      urlOphim = `${API}/${view.mode}/${view.slug}?page=${pageNum}`;
      urlNguonc = `${API_NGUONC}/${view.mode === 'quoc-gia' ? 'quoc-gia' : 'the-loai'}/${view.slug}?page=${pageNum}`;
    } else {
      urlOphim = `${API}/home?page=${pageNum}`;
      urlNguonc = `${API_NGUONC}/phim-moi-cap-nhat?page=${pageNum}`;
    }

    Promise.allSettled([
      fetch(urlOphim).then(r => r.json()),
      fetch(urlNguonc).then(r => r.json())
    ]).then(([resO, resN]) => {
      let newItems = [];
      let totalPages = 1;

      if (resO.status === 'fulfilled' && resO.value?.data?.items) {
        newItems = [...newItems, ...resO.value.data.items];
        totalPages = Math.max(totalPages, resO.value.data.params?.pagination?.totalPages || 1);
      }
      
      if (resN.status === 'fulfilled') {
        const nguoncItems = resN.value?.items || resN.value?.data?.items || [];
        newItems = [...newItems, ...nguoncItems];
        totalPages = Math.max(totalPages, resN.value?.paginate?.total_page || resN.value?.data?.params?.pagination?.totalPages || 1);
      }

      setMovies((prev) => {
        const combined = isNewView ? newItems : [...prev, ...newItems];
        const uniqueMap = new Map();
        combined.forEach(m => uniqueMap.set(m.slug, m));
        return Array.from(uniqueMap.values());
      });
      
      setHasMore(pageNum < totalPages);
    })
    .catch(() => {})
    .finally(() => { setLoading(false); setLoadingMore(false); });
  };

  useEffect(() => {
    if (view.type !== "home" && view.type !== "detail" && view.type !== "watch") {
      setPage(1); fetchData(1, true);
    }
  }, [view]);

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
        
        /* Hiệu ứng Coverflow */
        .transform-style-3d { transform-style: preserve-3d; }
        
        /* Cấu hình transition siêu mượt 120fps */
        .smooth-transition {
          transition: transform 0.9s cubic-bezier(0.23, 1, 0.32, 1), opacity 0.9s cubic-bezier(0.23, 1, 0.32, 1);
        }
        
        .custom-range { -webkit-appearance: none; outline: none; border-radius: 4px; }
        .custom-range::-webkit-slider-thumb { -webkit-appearance: none; height: 14px; width: 14px; border-radius: 50%; background: #E50914; cursor: pointer; box-shadow: 0 0 5px rgba(0,0,0,0.5); }
        .custom-range::-webkit-slider-runnable-track { width: 100%; height: 100%; background: transparent; cursor: pointer; border-radius: 4px; }
        .custom-range::-moz-range-thumb { height: 14px; width: 14px; border-radius: 50%; background: #E50914; border: none; cursor: pointer; box-shadow: 0 0 5px rgba(0,0,0,0.5); }
        .custom-range::-moz-range-track { width: 100%; height: 100%; background: transparent; cursor: pointer; border-radius: 4px; }
      `}</style>
      
      <Header navigate={navigate} categories={cats} countries={countries} />
      
      {view.type === "home" ? (
        <div className="flex flex-col">
          <Hero navigate={navigate} />
          <div className="max-w-[1400px] mx-auto w-full px-4 md:px-12 relative z-20 pb-20 pt-8 md:pt-12">
            <MovieSection title="Phim Mới Cập Nhật" slug="phim-moi-cap-nhat" type="danh-sach" navigate={navigate} progressData={progressData} />
            <TrendingSection navigate={navigate} progressData={progressData} />
            <ContinueWatching navigate={navigate} progressData={progressData} onRemove={removeProgress} />
            
            <MovieSection title="Hành Động - Viễn Tưởng" slug="hanh-dong" type="the-loai" navigate={navigate} progressData={progressData} />
            <MovieSection title="Tình Cảm - Tâm Lý" slug="tinh-cam" type="the-loai" navigate={navigate} progressData={progressData} />
            <MovieSection title="Hoạt Hình (Anime/Cartoon)" slug="hoat-hinh" type="the-loai" navigate={navigate} progressData={progressData} />
            <MovieSection title="Kinh Dị - Giật Gân" slug="kinh-di" type="the-loai" navigate={navigate} progressData={progressData} />
            <MovieSection title="Hài Hước" slug="hai-huoc" type="the-loai" navigate={navigate} progressData={progressData} />

            <MovieSection title="Phim Hàn Quốc" slug="han-quoc" type="quoc-gia" navigate={navigate} progressData={progressData} />
            <MovieSection title="Phim Trung Quốc" slug="trung-quoc" type="quoc-gia" navigate={navigate} progressData={progressData} />
            <MovieSection title="Phim Âu - Mỹ" slug="au-my" type="quoc-gia" navigate={navigate} progressData={progressData} />
            <MovieSection title="Phim Việt Nam" slug="viet-nam" type="quoc-gia" navigate={navigate} progressData={progressData} />
          </div>
        </div>
      ) : view.type === "detail" ? (
        <MovieDetail slug={view.slug} navigate={navigate} />
      ) : view.type === "watch" ? (
        <Watch slug={view.slug} movieData={view.movieData} />
      ) : (
        <MovieGrid 
          title={view.type === "actor" ? `Phim của: ${view.actorName}` : view.type === "search" ? `Tìm kiếm: ${view.keyword}` : view.title} 
          movies={movies} 
          loading={loading} 
          navigate={navigate}
          onLoadMore={() => { if (!loadingMore && hasMore) { setPage((p) => p + 1); fetchData(page + 1, false); } }} 
          hasMore={hasMore} 
          loading_more={loadingMore} 
        />
      )}
      
      <BottomNav navigate={navigate} setView={setView} categories={cats} countries={countries} currentView={view.type} />
    </div>
  );
}