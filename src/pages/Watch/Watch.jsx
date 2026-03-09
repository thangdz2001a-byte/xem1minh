import React, { useState, useEffect, useRef } from "react";
import * as Icon from "lucide-react";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../config/firebase";
import { API, API_NGUONC, API_NGUONC_DETAIL, getImg, safeText, formatTime, watchDataCache, generateRoomId } from "../../utils/helpers";

function Player({ ep, poster, movieSlug, movieName, originName, thumbUrl, movieYear, forceIframe, serverSource, serverRawName, onServerTimeout, onWatchPartyClick }) {
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

  const playerStateRef = useRef({});
  useEffect(() => {
      playerStateRef.current = { movieSlug, ep, movieName, originName, thumbUrl, movieYear, serverSource, serverRawName, duration };
  }, [movieSlug, ep, movieName, originName, thumbUrl, movieYear, serverSource, serverRawName, duration]);

  const saveCurrentProgress = (currTime, totalDuration) => {
      const info = playerStateRef.current;
      if (!info.movieSlug || !info.ep?.slug) return;
      const progress = JSON.parse(localStorage.getItem("movieProgress") || "{}");
      progress[info.movieSlug] = {
          episodeSlug: info.ep.slug,
          currentTime: currTime,
          percentage: totalDuration > 0 ? (currTime / totalDuration) * 100 : 1,
          name: info.movieName,
          origin_name: info.originName, 
          thumb: info.thumbUrl,
          year: info.movieYear,
          serverSource: info.serverSource,
          serverRawName: info.serverRawName 
      };
      localStorage.setItem("movieProgress", JSON.stringify(progress));
  };

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
    const saveIframeProg = () => saveCurrentProgress(0, 0); 
    const timer = setInterval(saveIframeProg, 5000); 
    return () => {
        clearInterval(timer);
        saveIframeProg();
    };
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
    let fallbackTimer;
    const video = vRef.current;
    
    if (!useIframe && video && onServerTimeout && !hlsError) {
        fallbackTimer = setTimeout(() => {
            if (video.readyState === 0) {
                onServerTimeout();
            }
        }, 3000);

        const handleSuccessLoad = () => clearTimeout(fallbackTimer);
        
        video.addEventListener('canplay', handleSuccessLoad);
        video.addEventListener('loadedmetadata', handleSuccessLoad);
        video.addEventListener('playing', handleSuccessLoad);

        return () => {
            clearTimeout(fallbackTimer);
            video.removeEventListener('canplay', handleSuccessLoad);
            video.removeEventListener('loadedmetadata', handleSuccessLoad);
            video.removeEventListener('playing', handleSuccessLoad);
        };
    }
  }, [ep, useIframe, hlsError, onServerTimeout]);

  useEffect(() => {
    if (useIframe || !vRef.current || hlsError) return; 
    const video = vRef.current;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      if (video.currentTime > 0 && video.duration > 0 && Math.abs(video.currentTime - lastSaveRef.current) > 5) {
        lastSaveRef.current = video.currentTime;
        saveCurrentProgress(video.currentTime, video.duration);
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
      if (video && video.currentTime > 0 && video.duration > 0) {
          saveCurrentProgress(video.currentTime, video.duration);
      }
      
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

          {/* NÚT XEM CHUNG */}
          {!useIframe && !hlsError && (
            <button 
              onClick={(e) => { e.stopPropagation(); onWatchPartyClick(); }}
              className={`absolute top-4 right-4 z-[45] flex items-center gap-2 bg-black/40 hover:bg-[#E50914] text-white px-3 py-1.5 md:px-4 md:py-2 rounded-lg backdrop-blur-md border border-white/10 transition-all duration-300 transform-gpu active:scale-95 shadow-lg group/btn-party ${isIdle && isPlaying ? 'opacity-0' : 'opacity-100'}`}
            >
              <Icon.Users size={16} className="text-[#E50914] group-hover/btn-party:text-white transition-colors" />
              <span className="text-[10px] md:text-xs font-black uppercase tracking-widest">Xem Chung</span>
            </button>
          )}

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

export default function Watch({ slug, movieData, navigate, user, onLogin }) {
  const [data, setData] = useState(movieData?.item || movieData || null);
  const [ep, setEp] = useState(null);
  const [serverList, setServerList] = useState([]);
  
  const [activeServerIdx, setActiveServerIdx] = useState(0);
  const [activeTabIdx, setActiveTabIdx] = useState(0);
  
  const [loadingPage, setLoadingPage] = useState(!data);
  const [loadingPlayer, setLoadingPlayer] = useState(true);
  const [error, setError] = useState(false);
  const [isSwitchingServer, setIsSwitchingServer] = useState(false);

  // --- LOGIC XEM CHUNG MỚI THÊM VÀO ---
  const [showPartyModal, setShowPartyModal] = useState(false);
  const [roomName, setRoomName] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [password, setPassword] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    if (!user) return onLogin();
    if (!roomName.trim()) return alert("Vui lòng nhập tên phòng");
    
    setIsCreating(true);
    try {
      const roomId = generateRoomId();
      const roomRef = doc(db, "rooms", roomId);
      
      await setDoc(roomRef, {
        roomId: roomId || "unknown_id",
        name: roomName.trim(),
        movieId: slug || "", 
        hostId: user?.uid || "unknown_uid",
        hostName: user?.displayName || user?.email || "Khách", 
        isPublic: isPublic,
        password: isPublic ? null : password,
        currentTime: 0,
        isPlaying: false,
        createdAt: serverTimestamp(),
        viewerCount: 1
      });

      setShowPartyModal(false);
      setIsCreating(false);
      
      navigate({ type: "watch-room", roomId, slug });

    } catch (err) {
      console.error("Lỗi chi tiết khi tạo phòng Firebase:", err);
      alert("Lỗi tạo phòng: " + err.message);
      setIsCreating(false);
    }
  };
  // ------------------------------------

  useEffect(() => {
      if (data?.name && ep?.name) {
          document.title = `Đang xem: ${data.name} - Tập ${ep.name.replace(/tập\s*/i, '')} - POLITE`;
      } else if (data?.name) {
          document.title = `Đang xem: ${data.name} - POLITE`;
      }
  }, [data, ep]);

  useEffect(() => {
    let isMounted = true;
    if (!data) setLoadingPage(true);
    setLoadingPlayer(true);
    setError(false);

    const fetchMovieData = async () => {
        const savedProgress = JSON.parse(localStorage.getItem("movieProgress") || "{}")[slug];

        if (watchDataCache.has(slug)) {
            const cached = watchDataCache.get(slug);
            setData(cached.baseItem);
            setServerList(cached.serverList);

            let targetServerIdx = 0;
            let targetEp = cached.serverList[0]?.server_data[0];
            let targetTabIdx = 0;

            if (savedProgress?.serverSource) {
                const foundIdx = cached.serverList.findIndex(s => s.source === savedProgress.serverSource && s.rawName === savedProgress.serverRawName);
                if (foundIdx !== -1) {
                    targetServerIdx = foundIdx;
                    const matchEp = cached.serverList[foundIdx].server_data.find(e => e.slug === savedProgress.episodeSlug);
                    if (matchEp) {
                        const epIndex = cached.serverList[foundIdx].server_data.findIndex(e => e.slug === savedProgress.episodeSlug);
                        targetTabIdx = Math.floor(epIndex / 50);
                        targetEp = matchEp;
                    } else {
                        targetEp = cached.serverList[foundIdx].server_data[0];
                    }
                }
            }

            setActiveServerIdx(targetServerIdx);
            setActiveTabIdx(targetTabIdx);
            setEp(targetEp);
            setLoadingPage(false);
            setLoadingPlayer(false);
            return; 
        }

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);
            
            const [resOphim, resNguonc] = await Promise.allSettled([
                fetch(`${API}/phim/${slug}`, { signal: controller.signal }).then(r => r.json()),
                fetch(`${API_NGUONC_DETAIL}/${slug}`, { signal: controller.signal }).then(r => r.json())
            ]);
            clearTimeout(timeoutId);

            let oItem = resOphim.status === 'fulfilled' ? resOphim.value?.data?.item : null;
            let nItem = null;

            if (resNguonc.status === 'fulfilled' && resNguonc.value) {
                let nData = resNguonc.value;
                nItem = nData?.movie || nData?.item || nData;
                if (nItem) {
                    nItem.episodes = nItem.episodes || nData.episodes || [];
                }
            }

            const normalizeForMatch = (str) => String(str || "").normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');

            const isCrossMatch = (m1, m2) => {
                if(!m1 || !m2) return false;
                const n1 = normalizeForMatch(m1.name); const n2 = normalizeForMatch(m2.name);
                const o1 = normalizeForMatch(m1.origin_name || m1.original_name); const o2 = normalizeForMatch(m2.origin_name || m2.original_name);
                if (o1 && o2 && (o1 === o2 || o1.includes(o2) || o2.includes(o1))) return true;
                if (n1 && n2 && (n1 === n2 || n1.includes(n2) || n2.includes(n1))) return true;
                return false;
            };

            if (oItem && (!nItem || !nItem.episodes || nItem.episodes.length === 0)) {
                 const queries = [oItem.origin_name, oItem.original_name, oItem.name].filter(Boolean);
                 for (let q of queries) {
                      try {
                          const sRes = await fetch(`${API_NGUONC}/search?keyword=${encodeURIComponent(q)}`).then(r=>r.json());
                          const itemsList = sRes?.items || sRes?.data?.items || sRes?.data || [];
                          let match = itemsList.find(i => isCrossMatch(oItem, i));
                          if (!match && itemsList.length > 0) {
                              match = itemsList[0]; 
                          }
                          if (match && match.slug) {
                              const dRes = await fetch(`${API_NGUONC_DETAIL}/${match.slug}`).then(r=>r.json());
                              let dItem = dRes?.movie || dRes?.item || dRes;
                              if (dItem) {
                                  dItem.episodes = dItem.episodes || dRes.episodes || [];
                                  if (dItem.episodes.length > 0) {
                                      nItem = dItem;
                                      break;
                                  }
                              }
                          }
                      } catch(e){}
                 }
            } 
            else if (!oItem && nItem) {
                 const queries = [nItem.origin_name, nItem.original_name, nItem.name].filter(Boolean);
                 for (let q of queries) {
                      try {
                          const sRes = await fetch(`${API}/tim-kiem?keyword=${encodeURIComponent(q)}`).then(r=>r.json());
                          const itemsList = sRes?.data?.items || [];
                          let match = itemsList.find(i => isCrossMatch(nItem, i));
                          if (!match && itemsList.length > 0) match = itemsList[0];
                          if (match && match.slug) {
                              const dRes = await fetch(`${API}/phim/${match.slug}`).then(r=>r.json());
                              if (dRes?.data?.item) {
                                  oItem = dRes.data.item;
                                  break;
                              }
                          }
                      } catch(e){}
                 }
            } 
            else if (!oItem && !nItem) {
                 const searchSlug = String(slug || "").replace(/-/g, ' ');
                 const [sO, sN] = await Promise.allSettled([
                     fetch(`${API}/tim-kiem?keyword=${encodeURIComponent(searchSlug)}`).then(r=>r.json()),
                     fetch(`${API_NGUONC}/search?keyword=${encodeURIComponent(searchSlug)}`).then(r=>r.json())
                 ]);
                 
                 const oList = sO.status === 'fulfilled' ? (sO.value?.data?.items || []) : [];
                 const nList = sN.status === 'fulfilled' ? (sN.value?.items || sN.value?.data?.items || sN.value?.data || []) : [];
                 
                 const oMatchSlug = oList[0]?.slug;
                 let nMatchSlug = nList.find(i => oList[0] ? isCrossMatch(oList[0], i) : true)?.slug;
                 if (!nMatchSlug && nList.length > 0) nMatchSlug = nList[0].slug;

                 const [fbO, fbN] = await Promise.allSettled([
                    oMatchSlug ? fetch(`${API}/phim/${oMatchSlug}`).then(r=>r.json()) : Promise.reject(),
                    nMatchSlug ? fetch(`${API_NGUONC_DETAIL}/${nMatchSlug}`).then(r=>r.json()) : Promise.reject()
                 ]);
                 
                 oItem = fbO.status === 'fulfilled' ? fbO.value?.data?.item : null;
                 
                 if (fbN.status === 'fulfilled' && fbN.value) {
                     let dItem = fbN.value?.movie || fbN.value?.item || fbN.value;
                     if (dItem) {
                         dItem.episodes = dItem.episodes || fbN.value.episodes || [];
                         nItem = dItem;
                     }
                 }
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
            
            if (Array.isArray(oItem?.episodes)) {
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

            if (Array.isArray(nItem?.episodes)) {
                nItem.episodes.forEach((svr) => {
                    const epsList = svr.items || svr.server_data || [];
                    if (epsList.length > 0) {
                        extractedServers.push({
                            rawName: svr.server_name || "Vietsub",
                            source: 'nguonc',
                            isIframe: true, 
                            server_data: epsList.map(e => ({ 
                                name: e.name, 
                                slug: e.slug, 
                                link_m3u8: e.m3u8 || e.m3u8_url || e.link_m3u8 || "", 
                                link_embed: e.embed || e.embed_url || e.link_embed || "" 
                            }))
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
                let raw = String(s.rawName || "Vietsub").toUpperCase();
                if (raw.includes('THUYẾT MINH') || raw.includes('LỒNG TIẾNG')) {
                    s.groupType = 'THUYẾT MINH';
                } else {
                    s.groupType = 'VIETSUB';
                }
            });

            extractedServers.sort((a, b) => {
                if (a.groupType === 'VIETSUB' && b.groupType !== 'VIETSUB') return -1;
                if (a.groupType !== 'VIETSUB' && b.groupType === 'VIETSUB') return 1;
                return (a.source === 'ophim' ? -1 : 1) - (b.source === 'ophim' ? -1 : 1);
            });

            extractedServers.forEach((s) => {
                if (s.source === 'ophim') {
                    s.sourceName = `MÁY CHỦ 1 : ${s.groupType}`; 
                } else {
                    s.sourceName = `MÁY CHỦ 2 : ${s.groupType}`;
                }
            });

            setServerList(extractedServers);

            watchDataCache.set(slug, {
                baseItem: baseItem,
                serverList: extractedServers
            });

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

  const handleServerChange = (idx) => {
      setActiveServerIdx(idx);
      setActiveTabIdx(0); 
      const matchingEp = serverList[idx]?.server_data?.find(e => e.name === ep?.name);
      setEp(matchingEp || serverList[idx]?.server_data?.[0]);
  };

  const handleServerTimeout = () => {
     if (serverList.length > 1 && activeServerIdx < serverList.length - 1) {
         setIsSwitchingServer(true);
         setTimeout(() => setIsSwitchingServer(false), 2500); 
         handleServerChange(activeServerIdx + 1);
     }
  };

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

  return (
    <div className="pt-16 md:pt-28 pb-10 w-full max-w-[1440px] mx-auto px-0 sm:px-4 md:px-12 animate-in fade-in duration-500 bg-[#050505]">
      
      {isSwitchingServer && (
         <div className="fixed top-20 right-4 bg-[#E50914] text-white px-5 py-3 rounded-xl z-[200] shadow-[0_10px_25px_rgba(229,9,20,0.5)] font-bold text-xs md:text-sm flex items-center gap-3 animate-in slide-in-from-right uppercase tracking-widest">
            <Icon.Loader2 className="animate-spin" size={18} />
            Server tải chậm, đang tự động đổi...
         </div>
      )}

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
             onServerTimeout={handleServerTimeout}
             onWatchPartyClick={() => user ? setShowPartyModal(true) : onLogin()}
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
                 {/* RENDERING MÁY CHỦ */}
                 {Object.entries(
                    serverList.reduce((acc, s, idx) => {
                        if (!acc[s.groupType]) acc[s.groupType] = [];
                        acc[s.groupType].push({ ...s, originalIndex: idx });
                        return acc;
                    }, {})
                 ).map(([type, servers]) => (
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

      {showPartyModal && (
        <div className="fixed inset-0 z-[500] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 shadow-2xl">
          <form onSubmit={handleCreateRoom} className="bg-[#111] p-6 md:p-8 rounded-3xl w-full max-w-md border border-white/10 shadow-2xl animate-in zoom-in-95 duration-300">
            <h2 className="text-xl md:text-2xl font-black mb-6 uppercase tracking-widest flex items-center gap-3 text-white">
              <span className="w-1.5 h-6 bg-[#E50914] block"></span> TẠO PHÒNG XEM CHUNG
            </h2>
            
            <label className="block text-[10px] text-gray-400 mb-2 uppercase font-bold tracking-widest">Tên phòng</label>
            <input required value={roomName} onChange={e=>setRoomName(e.target.value)} placeholder="Nhập tên phòng..." className="w-full bg-[#222] rounded-xl p-4 mb-5 outline-none border border-white/5 focus:border-[#E50914] text-white" />

            <div className="flex gap-6 mb-6">
               <label className="flex items-center gap-2 text-white cursor-pointer"><input type="radio" checked={isPublic} onChange={()=>setIsPublic(true)} className="accent-[#E50914]"/> Công khai</label>
               <label className="flex items-center gap-2 text-white cursor-pointer"><input type="radio" checked={!isPublic} onChange={()=>setIsPublic(false)} className="accent-[#E50914]"/> Riêng tư</label>
            </div>

            {!isPublic && (
              <div className="animate-in slide-in-from-top-2 duration-300 mb-6">
                <label className="block text-[10px] text-gray-400 mb-2 uppercase font-bold tracking-widest">Mật khẩu</label>
                <input required value={password} onChange={e=>setPassword(e.target.value)} type="text" placeholder="Nhập mật khẩu..." className="w-full bg-[#222] rounded-xl p-4 outline-none border border-white/5 focus:border-[#E50914] text-white" />
              </div>
            )}

            <div className="flex justify-end gap-4">
              <button type="button" onClick={() => setShowPartyModal(false)} className="px-6 py-3 text-xs text-gray-400 hover:text-white transition uppercase font-black tracking-widest">Hủy</button>
              <button type="submit" disabled={isCreating} className="px-8 py-3 bg-[#E50914] hover:bg-red-700 disabled:bg-gray-700 text-white rounded-xl font-black uppercase text-xs transition shadow-lg shadow-red-900/40">
                {isCreating ? "ĐANG TẠO..." : "TẠO PHÒNG"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}