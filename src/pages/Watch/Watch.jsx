import React, { useState, useEffect, useRef, useMemo } from "react";
import * as Icon from "lucide-react";
import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../config/firebase";
import {
  API,
  API_NGUONC,
  API_NGUONC_DETAIL,
  getImg,
  safeText,
  formatTime,
  watchDataCache,
  generateRoomId
} from "../../utils/helpers";

/* =========================
   CACHE + HELPERS
========================= */

const requestMemoryCache = new Map();
let hlsScriptPromise = null;

function getCacheKey(url) {
  return `watch_api_cache:${url}`;
}

function getCachedFromStorage(url, ttl = 3 * 60 * 1000) {
  try {
    const raw = localStorage.getItem(getCacheKey(url));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.timestamp || !("data" in parsed)) return null;
    if (Date.now() - parsed.timestamp > ttl) {
      localStorage.removeItem(getCacheKey(url));
      return null;
    }
    return parsed.data;
  } catch {
    return null;
  }
}

function setCachedToStorage(url, data) {
  try {
    localStorage.setItem(
      getCacheKey(url),
      JSON.stringify({
        data,
        timestamp: Date.now()
      })
    );
  } catch {}
}

async function fetchJsonCached(url, { signal, ttl = 3 * 60 * 1000 } = {}) {
  const memoryHit = requestMemoryCache.get(url);
  if (memoryHit) return memoryHit;

  const storageHit = getCachedFromStorage(url, ttl);
  if (storageHit) {
    requestMemoryCache.set(url, Promise.resolve(storageHit));
    return storageHit;
  }

  const promise = fetch(url, { signal }).then(async (r) => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const data = await r.json();
    setCachedToStorage(url, data);
    return data;
  });

  requestMemoryCache.set(url, promise);

  try {
    return await promise;
  } catch (err) {
    requestMemoryCache.delete(url);
    throw err;
  }
}

function ensureHlsScript() {
  if (window.Hls) return Promise.resolve();
  if (hlsScriptPromise) return hlsScriptPromise;

  hlsScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-hls-player="true"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", reject, { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/hls.js@latest";
    script.async = true;
    script.dataset.hlsPlayer = "true";
    script.onload = () => resolve();
    script.onerror = reject;
    document.body.appendChild(script);
  });
  return hlsScriptPromise;
}

function normalizeForMatch(str) {
  return String(str || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function isCrossMatch(m1, m2) {
  if (!m1 || !m2) return false;
  const n1 = normalizeForMatch(m1.name);
  const n2 = normalizeForMatch(m2.name);
  const o1 = normalizeForMatch(m1.origin_name || m1.original_name);
  const o2 = normalizeForMatch(m2.origin_name || m2.original_name);
  if (o1 && o2 && (o1 === o2 || o1.includes(o2) || o2.includes(o1))) return true;
  if (n1 && n2 && (n1 === n2 || n1.includes(n2) || n2.includes(n1))) return true;
  return false;
}

async function fetchNguoncSearch(keyword) {
  const res = await fetchJsonCached(`${API_NGUONC}/search?keyword=${encodeURIComponent(keyword)}`);
  return res?.items || res?.data?.items || res?.data || [];
}

async function fetchOphimSearch(keyword) {
  const res = await fetchJsonCached(`${API}/tim-kiem?keyword=${encodeURIComponent(keyword)}`);
  return res?.data?.items || [];
}

async function fetchNguoncDetail(slug) {
  const res = await fetchJsonCached(`${API_NGUONC_DETAIL}/${slug}`);
  let item = res?.movie || res?.item || res;
  if (item) item.episodes = item.episodes || res?.episodes || [];
  return item || null;
}

async function fetchOphimDetail(slug) {
  const res = await fetchJsonCached(`${API}/phim/${slug}`);
  return res?.data?.item || null;
}

async function syncMovieProgressToFirebase(uid, movieSlug, progressItem) {
  if (!uid || !movieSlug || !progressItem) return;
  const userRef = doc(db, "users", uid);
  try {
    await updateDoc(userRef, {
      [`progress.${movieSlug}`]: progressItem
    });
  } catch {
    await setDoc(userRef, { progress: { [movieSlug]: progressItem } }, { merge: true }).catch(() => {});
  }
}

/* =========================
   PLAYER
========================= */

function Player({
  ep,
  poster,
  movieSlug,
  movieName,
  originName,
  thumbUrl,
  movieYear,
  forceIframe,
  serverSource,
  serverRawName,
  onServerTimeout,
  onWatchPartyClick,
  user
}) {
  const vRef = useRef(null);
  const containerRef = useRef(null);
  const hlsRef = useRef(null);
  const lastSaveRef = useRef(0);
  const progressStoreRef = useRef(null);

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

  const playerStateRef = useRef({});
  useEffect(() => {
    playerStateRef.current = {
      movieSlug, ep, movieName, originName, thumbUrl, movieYear, serverSource, serverRawName, duration, user, poster
    };
  }, [movieSlug, ep, movieName, originName, thumbUrl, movieYear, serverSource, serverRawName, duration, user, poster]);

  useEffect(() => {
    try {
      progressStoreRef.current = JSON.parse(localStorage.getItem("movieProgress") || "{}");
    } catch {
      progressStoreRef.current = {};
    }
  }, [movieSlug]);

  const saveCurrentProgress = async (currTime, totalDur) => {
    const info = playerStateRef.current;
    if (!info.movieSlug || !info.ep?.slug) return;

    const pctRaw = totalDur > 0 ? (currTime / totalDur) * 100 : 0;
    const finalPct = Math.round(Math.max(0, Math.min(100, pctRaw)));

    let finalThumb = info.thumbUrl || info.poster || "";
    if (!finalThumb || finalThumb.includes("placehold.co")) finalThumb = "";

    const progress = progressStoreRef.current || {};
    const nextProgressItem = {
      episodeSlug: info.ep.slug,
      episode_name: info.ep.name || "",
      currentTime: currTime,
      percentage: finalPct,
      name: info.movieName || "",
      origin_name: info.originName || "",
      thumb: finalThumb,
      year: info.movieYear || "",
      serverSource: info.serverSource || "",
      serverRawName: info.serverRawName || "",
      timestamp: Date.now()
    };

    progress[info.movieSlug] = nextProgressItem;
    progressStoreRef.current = progress;
    try { localStorage.setItem("movieProgress", JSON.stringify(progress)); } catch {}

    if (info.user?.uid) {
      syncMovieProgressToFirebase(info.user.uid, info.movieSlug, nextProgressItem);
    }
  };

  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setShowSettings(false);
    setIsIdle(false);
    setHlsError(false);
    setLevels([]);
    setCurrentLevel(-1);
    lastSaveRef.current = 0;
  }, [ep, m3u8Link, forceIframe]);

  useEffect(() => {
    if (!useIframe || !movieSlug || !ep?.slug) return;
    const timer = setInterval(() => saveCurrentProgress(0, 0), 8000);
    return () => clearInterval(timer);
  }, [useIframe, movieSlug, ep]);

  useEffect(() => {
    if (useIframe || !vRef.current || !m3u8Link) return;

    let destroyed = false;
    const v = vRef.current;
    let hlsInstance = null;

    const loadVideo = async () => {
      try {
        let savedTime = 0;
        try {
          const saved = JSON.parse(localStorage.getItem("movieProgress") || "{}")[movieSlug];
          if (saved && saved.episodeSlug === ep.slug && saved.percentage < 99) {
            savedTime = saved.currentTime || 0;
          }
        } catch {}

        if (v.canPlayType("application/vnd.apple.mpegurl")) {
          if (!destroyed) {
            v.src = m3u8Link;
            if (savedTime > 0) {
              v.addEventListener('loadedmetadata', () => { v.currentTime = savedTime; }, { once: true });
            }
          }
          return;
        }

        await ensureHlsScript();
        if (destroyed || !window.Hls) return;

        hlsInstance = new window.Hls({
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 30,
          startPosition: savedTime > 0 ? savedTime : -1 
        });

        hlsRef.current = hlsInstance;
        hlsInstance.loadSource(m3u8Link);
        hlsInstance.attachMedia(v);

        hlsInstance.on(window.Hls.Events.MANIFEST_PARSED, () => {
          setLevels(hlsInstance.levels || []);
          setCurrentLevel(hlsInstance.currentLevel ?? -1);
        });

        hlsInstance.on(window.Hls.Events.LEVEL_SWITCHED, (_, data) => {
          setCurrentLevel(data.level);
        });

        hlsInstance.on(window.Hls.Events.ERROR, (_, data) => {
          if (data?.fatal) {
            hlsInstance.destroy();
            hlsRef.current = null;
            setHlsError(true);
          }
        });
      } catch {
        if (!destroyed) setHlsError(true);
      }
    };

    loadVideo();

    return () => {
      destroyed = true;
      if (hlsInstance) hlsInstance.destroy();
      hlsRef.current = null;
    };
  }, [m3u8Link, useIframe, movieSlug, ep]);

  useEffect(() => {
    let fallbackTimer;
    const video = vRef.current;

    if (!useIframe && video && onServerTimeout && !hlsError) {
      fallbackTimer = setTimeout(() => {
        if (video.readyState < 1) onServerTimeout();
      }, 4500);

      const handleSuccessLoad = () => clearTimeout(fallbackTimer);
      video.addEventListener("canplay", handleSuccessLoad);
      video.addEventListener("loadedmetadata", handleSuccessLoad);
      video.addEventListener("playing", handleSuccessLoad);

      return () => {
        clearTimeout(fallbackTimer);
        video.removeEventListener("canplay", handleSuccessLoad);
        video.removeEventListener("loadedmetadata", handleSuccessLoad);
        video.removeEventListener("playing", handleSuccessLoad);
      };
    }
  }, [ep, useIframe, hlsError, onServerTimeout]);

  useEffect(() => {
    if (useIframe || !vRef.current || hlsError) return;

    const video = vRef.current;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      if (video.currentTime > 0 && video.duration > 0 && Math.abs(video.currentTime - lastSaveRef.current) > 8) {
        lastSaveRef.current = video.currentTime;
        saveCurrentProgress(video.currentTime, video.duration);
      }
    };

    const handleLoadedMetadata = () => {
      setDuration(video.duration || 0);
    };

    const handlePlayState = () => setIsPlaying(true);
    const handlePauseState = () => setIsPlaying(false);

    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("play", handlePlayState);
    video.addEventListener("playing", handlePlayState);
    video.addEventListener("pause", handlePauseState);

    return () => {
      if (video && video.currentTime > 0) {
        saveCurrentProgress(video.currentTime, video.duration || 0);
      }
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("play", handlePlayState);
      video.removeEventListener("playing", handlePlayState);
      video.removeEventListener("pause", handlePauseState);
    };
  }, [ep, hlsError, useIframe, movieSlug]);

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

  let idleTimeout;
  const handleMouseMove = () => {
    setIsIdle(false);
    clearTimeout(idleTimeout);
    idleTimeout = setTimeout(() => { if (isPlaying) setIsIdle(true); }, 3000);
  };

  useEffect(() => {
    if (useIframe || hlsError) return;
    const handleKeyDown = (e) => {
      if (document.activeElement.tagName === "INPUT" || document.activeElement.tagName === "TEXTAREA") return;
      if (e.code === "Space") { e.preventDefault(); togglePlay(); }
      if (e.code === "KeyF") { e.preventDefault(); toggleFullscreen(); }
      if (e.code === "ArrowRight") { e.preventDefault(); skipForward(); }
      if (e.code === "ArrowLeft") { e.preventDefault(); skipBackward(); }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
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
      onMouseLeave={() => { if (isPlaying) setIsIdle(true); }}
      onClick={() => { if (showSettings) setShowSettings(false); }}
    >
      {useIframe && embedLink ? (
        <iframe src={embedLink} className="w-full h-full object-contain bg-black" frameBorder="0" allowFullScreen title="Video Player" />
      ) : (
        <>
          {hlsError && (
            <div className="absolute inset-0 flex flex-col justify-center items-center bg-black/90 z-40 text-center px-4">
              <Icon.AlertTriangle className="text-[#E50914] mb-3" size={48} />
              <p className="text-white text-sm md:text-base font-bold uppercase tracking-widest mb-1">Lỗi kết nối Máy Chủ</p>
            </div>
          )}

          <video ref={vRef} poster={poster} playsInline webkit-playsinline="true" className="w-full h-full object-contain cursor-pointer" onClick={togglePlay} />

          {!useIframe && !hlsError && (
            <button
              onClick={(e) => { e.stopPropagation(); onWatchPartyClick(); }}
              className={`absolute top-4 right-4 z-[45] flex items-center gap-2 bg-black/40 hover:bg-[#E50914] text-white px-3 py-1.5 md:px-4 md:py-2 rounded-lg backdrop-blur-md border border-white/10 transition-all ${isIdle && isPlaying ? "opacity-0 pointer-events-none" : "opacity-100"}`}
            >
              <Icon.Users size={16} />
              <span className="text-[10px] md:text-xs font-black uppercase tracking-widest">Xem Chung</span>
            </button>
          )}

          <div className={`absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/30 pointer-events-none transition-opacity duration-300 ${isIdle && isPlaying ? "opacity-0" : "opacity-100"}`} />

          {!isPlaying && !hlsError && (
            <button onClick={togglePlay} className="absolute inset-0 m-auto w-14 h-14 md:w-20 md:h-20 bg-[#E50914]/90 rounded-full flex justify-center items-center text-white z-20 hover:scale-110 shadow-[0_0_30px_rgba(229,9,20,0.6)] backdrop-blur-md">
              <Icon.Play fill="currentColor" className="w-6 h-6 md:w-8 md:h-8 ml-1" />
            </button>
          )}

          <div className={`absolute bottom-0 left-0 right-0 px-3 md:px-5 pb-3 md:pb-5 pt-12 z-30 transition-transform duration-500 flex flex-col justify-end ${isIdle && isPlaying ? "translate-y-[120%]" : "translate-y-0"}`}>
            <div className="w-full flex items-center mb-2 md:mb-3 relative cursor-pointer" onClick={(e) => e.stopPropagation()}>
              <input
                type="range" min="0" max={duration || 100} step="0.1" value={currentTime}
                onChange={(e) => { if (vRef.current) { const val = parseFloat(e.target.value); vRef.current.currentTime = val; setCurrentTime(val); } }}
                className="custom-range w-full h-1 md:h-1.5"
                style={{ background: `linear-gradient(to right, #E50914 0%, #E50914 ${progressPercent}%, rgba(255,255,255,0.3) ${progressPercent}%, rgba(255,255,255,0.3) 100%)` }}
              />
            </div>

            <div className="flex justify-between items-center text-white w-full" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-2 sm:gap-4">
                <button onClick={skipBackward} className="hover:text-[#E50914] focus:outline-none hover:scale-110">
                  <Icon.RotateCcw className="w-4 h-4 md:w-5 md:h-5" />
                </button>
                <button onClick={togglePlay} className="hover:text-[#E50914] focus:outline-none hover:scale-110">
                  {isPlaying ? <Icon.Pause fill="currentColor" className="w-5 h-5 md:w-6 md:h-6" /> : <Icon.Play fill="currentColor" className="w-5 h-5 md:w-6 md:h-6" />}
                </button>
                <button onClick={skipForward} className="hover:text-[#E50914] focus:outline-none hover:scale-110">
                  <Icon.RotateCw className="w-4 h-4 md:w-5 md:h-5" />
                </button>

                <div className="hidden md:flex group/vol items-center gap-2 relative ml-1">
                  <button onClick={() => { if (vRef.current) vRef.current.muted = !vRef.current.muted; setIsMuted(!isMuted); }} className="hover:text-[#E50914] hover:scale-110">
                    {isMuted || volume === 0 ? <Icon.VolumeX className="w-4 h-4 md:w-5 md:h-5" /> : <Icon.Volume2 className="w-4 h-4 md:w-5 md:h-5" />}
                  </button>
                  <input
                    type="range" min="0" max="1" step="0.05" value={isMuted ? 0 : volume}
                    onChange={(e) => { if (vRef.current) { vRef.current.volume = parseFloat(e.target.value); vRef.current.muted = parseFloat(e.target.value) === 0; } setVolume(parseFloat(e.target.value)); setIsMuted(false); }}
                    className="custom-range w-0 overflow-hidden group-hover/vol:w-20 transition-all duration-300 h-1.5"
                    style={{ background: `linear-gradient(to right, #ffffff 0%, #ffffff ${volumePercent}%, rgba(255,255,255,0.3) ${volumePercent}%, rgba(255,255,255,0.3) 100%)` }}
                  />
                </div>
                <div className="text-[9px] sm:text-[10px] md:text-sm font-bold font-mono tracking-wider whitespace-nowrap ml-1">
                  {formatTime(currentTime)} <span className="text-white/50 mx-1">/</span> {formatTime(duration)}
                </div>
              </div>

              <div className="flex items-center gap-3 sm:gap-4">
                <div className="relative">
                  <button onClick={() => setShowSettings(!showSettings)} className="hover:text-[#E50914] hover:scale-110">
                    <Icon.Settings className={`w-4 h-4 md:w-5 md:h-5 ${showSettings ? "rotate-90 text-[#E50914]" : ""}`} />
                  </button>
                  {showSettings && levels.length > 0 && (
                    <div className="absolute bottom-full right-0 mb-4 bg-[#111]/95 border border-white/10 rounded-xl overflow-hidden py-2 min-w-[120px] flex flex-col items-center z-50">
                      <span className="text-[10px] text-[#E50914] font-black uppercase mb-2 px-4 border-b border-white/10 pb-2 w-full text-center">Chất lượng</span>
                      <button onClick={(e) => switchQuality(-1, e)} className={`w-full px-4 py-2.5 text-xs font-bold ${currentLevel === -1 ? "text-[#E50914] bg-white/5" : "text-gray-300 hover:bg-white/10"}`}>Tự động</button>
                      {levels.map((lvl, index) => (
                        <button key={index} onClick={(e) => switchQuality(index, e)} className={`w-full px-4 py-2.5 text-xs font-bold ${currentLevel === index ? "text-[#E50914] bg-white/5" : "text-gray-300 hover:bg-white/10"}`}>{lvl.height}p</button>
                      ))}
                    </div>
                  )}
                </div>
                <button onClick={toggleFullscreen} className="hover:text-[#E50914] hover:scale-110">
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

/* =========================
   WATCH PAGE ROOT
========================= */

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

  const [showPartyModal, setShowPartyModal] = useState(false);
  const [roomName, setRoomName] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [password, setPassword] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    if (!user) {
      onLogin();
      return;
    }
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

  useEffect(() => {
    if (data?.name && ep?.name) { document.title = `Đang xem: ${data.name} - Tập ${ep.name.replace(/tập\s*/i, "")} - POLITE`; } 
    else if (data?.name) { document.title = `Đang xem: ${data.name} - POLITE`; }
  }, [data, ep]);

  useEffect(() => {
    let isMounted = true;
    if (!data) setLoadingPage(true);
    setLoadingPlayer(true);
    setError(false);

    const fetchMovieData = async () => {
      let savedProg = {};
      try { savedProg = JSON.parse(localStorage.getItem("movieProgress") || "{}")[slug]; } catch {}

      if (watchDataCache.has(slug)) {
        const cached = watchDataCache.get(slug);
        if (!isMounted) return;
        setData(cached.baseItem); setLoadingPage(false); setServerList(cached.serverList);

        let tSvrIdx = 0; let tEp = cached.serverList[0]?.server_data[0]; let tTabIdx = 0;
        if (savedProg?.episodeSlug) {
          let found = false;
          if (savedProg.serverSource) {
            const sIdx = cached.serverList.findIndex(s => s.source === savedProg.serverSource);
            if (sIdx !== -1) {
              const mEp = cached.serverList[sIdx].server_data.find(e => e.slug === savedProg.episodeSlug);
              if (mEp) { tSvrIdx = sIdx; tEp = mEp; tTabIdx = Math.floor(cached.serverList[sIdx].server_data.indexOf(mEp) / 50); found = true; }
            }
          }
          if (!found) {
            for (let i = 0; i < cached.serverList.length; i++) {
              const mEp = cached.serverList[i].server_data.find(e => e.slug === savedProg.episodeSlug);
              if (mEp) { tSvrIdx = i; tEp = mEp; tTabIdx = Math.floor(cached.serverList[i].server_data.indexOf(mEp) / 50); break; }
            }
          }
        }
        setActiveServerIdx(tSvrIdx); setActiveTabIdx(tTabIdx); setEp(tEp); setLoadingPlayer(false);
        return;
      }

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const ophimPromise = fetchJsonCached(`${API}/phim/${slug}`, { signal: controller.signal });
        const nguoncPromise = fetchJsonCached(`${API_NGUONC_DETAIL}/${slug}`, { signal: controller.signal });

        let earlyPageOpened = false;

        ophimPromise.then((res) => {
          if (!isMounted || earlyPageOpened) return;
          const earlyOItem = res?.data?.item || null;
          if (earlyOItem) { earlyPageOpened = true; setData(earlyOItem); setLoadingPage(false); }
        }).catch(() => {});

        nguoncPromise.then((res) => {
          if (!isMounted || earlyPageOpened) return;
          const earlyNItem = res?.movie || res?.item || res || null;
          if (earlyNItem) { earlyPageOpened = true; setData(earlyNItem); setLoadingPage(false); }
        }).catch(() => {});

        const [resOphim, resNguonc] = await Promise.allSettled([ophimPromise, nguoncPromise]);
        clearTimeout(timeoutId);

        let oItem = resOphim.status === "fulfilled" ? resOphim.value?.data?.item : null;
        let nItem = null;
        if (resNguonc.status === "fulfilled" && resNguonc.value) {
          const nData = resNguonc.value;
          nItem = nData?.movie || nData?.item || nData;
          if (nItem) nItem.episodes = nItem.episodes || nData.episodes || [];
        }

        if (!isMounted) return;
        if ((oItem || nItem) && !earlyPageOpened) { setData(oItem || nItem); setLoadingPage(false); earlyPageOpened = true; }

        if (oItem && (!nItem || !nItem.episodes || nItem.episodes.length === 0)) {
          const queries = [oItem.origin_name, oItem.original_name, oItem.name].filter(Boolean).slice(0, 2);
          for (const q of queries) {
            try {
              const itemsList = await fetchNguoncSearch(q);
              let match = itemsList.find((i) => isCrossMatch(oItem, i));
              if (!match && itemsList.length > 0) match = itemsList[0];
              if (match?.slug) {
                const dItem = await fetchNguoncDetail(match.slug);
                if (dItem?.episodes?.length > 0) { nItem = dItem; break; }
              }
            } catch {}
          }
        } else if (!oItem && nItem) {
          const queries = [nItem.origin_name, nItem.original_name, nItem.name].filter(Boolean).slice(0, 2);
          for (const q of queries) {
            try {
              const itemsList = await fetchOphimSearch(q);
              let match = itemsList.find((i) => isCrossMatch(nItem, i));
              if (!match && itemsList.length > 0) match = itemsList[0];
              if (match?.slug) {
                const dItem = await fetchOphimDetail(match.slug);
                if (dItem) { oItem = dItem; break; }
              }
            } catch {}
          }
        } else if (!oItem && !nItem) {
          const searchSlug = String(slug || "").replace(/-/g, " ");
          const [oList, nList] = await Promise.allSettled([ fetchOphimSearch(searchSlug), fetchNguoncSearch(searchSlug) ]);
          const ophimItems = oList.status === "fulfilled" ? oList.value : [];
          const nguoncItems = nList.status === "fulfilled" ? nList.value : [];
          const oMatchSlug = ophimItems[0]?.slug;
          let nMatchSlug = nguoncItems.find((i) => (ophimItems[0] ? isCrossMatch(ophimItems[0], i) : true))?.slug;
          if (!nMatchSlug && nguoncItems.length > 0) nMatchSlug = nguoncItems[0]?.slug;
          const [fbO, fbN] = await Promise.allSettled([ oMatchSlug ? fetchOphimDetail(oMatchSlug) : Promise.resolve(null), nMatchSlug ? fetchNguoncDetail(nMatchSlug) : Promise.resolve(null) ]);
          oItem = fbO.status === "fulfilled" ? fbO.value : null;
          nItem = fbN.status === "fulfilled" ? fbN.value : null;
        }

        if (!isMounted) return;
        if (!oItem && !nItem) { setError(true); setLoadingPage(false); setLoadingPlayer(false); return; }

        const baseItem = oItem || nItem;
        setData(baseItem); setLoadingPage(false);

        let extractedServers = [];
        if (Array.isArray(oItem?.episodes)) {
          oItem.episodes.forEach((svr) => {
            const epsList = svr.server_data || [];
            if (epsList.length > 0) extractedServers.push({ rawName: svr.server_name || "Vietsub", source: "ophim", isIframe: false, server_data: epsList.map((e) => ({ name: e.name, slug: e.slug, link_m3u8: e.link_m3u8 || "", link_embed: e.link_embed || "" })) });
          });
        }
        if (Array.isArray(nItem?.episodes)) {
          nItem.episodes.forEach((svr) => {
            const epsList = svr.items || svr.server_data || [];
            if (epsList.length > 0) extractedServers.push({ rawName: svr.server_name || "Vietsub", source: "nguonc", isIframe: true, server_data: epsList.map((e) => ({ name: e.name, slug: e.slug, link_m3u8: e.m3u8 || e.m3u8_url || e.link_m3u8 || "", link_embed: e.embed || e.embed_url || e.link_embed || "" })) });
          });
        }

        if (extractedServers.length === 0) { setError(true); setLoadingPlayer(false); return; }

        extractedServers.forEach((s) => {
          const raw = String(s.rawName || "Vietsub").toUpperCase();
          if (raw.includes("THUYẾT MINH") || raw.includes("LỒNG TIẾNG")) s.groupType = "THUYẾT MINH";
          else s.groupType = "VIETSUB";
        });
        extractedServers.sort((a, b) => {
          if (a.groupType === "VIETSUB" && b.groupType !== "VIETSUB") return -1;
          if (a.groupType !== "VIETSUB" && b.groupType === "VIETSUB") return 1;
          return (a.source === "ophim" ? -1 : 1) - (b.source === "ophim" ? -1 : 1);
        });
        extractedServers.forEach((s) => { s.sourceName = s.source === "ophim" ? `MÁY CHỦ 1 : ${s.groupType}` : `MÁY CHỦ 2 : ${s.groupType}`; });

        setServerList(extractedServers);
        watchDataCache.set(slug, { baseItem, serverList: extractedServers });

        let targetServerIdx = 0; let targetEp = extractedServers[0].server_data[0]; let targetTabIdx = 0;
        if (savedProg?.episodeSlug) {
          let found = false;
          if (savedProg.serverSource) {
            const sIdx = extractedServers.findIndex(s => s.source === savedProg.serverSource);
            if (sIdx !== -1) {
              const mEp = extractedServers[sIdx].server_data.find(e => e.slug === savedProg.episodeSlug);
              if (mEp) { targetServerIdx = sIdx; targetEp = mEp; targetTabIdx = Math.floor(extractedServers[sIdx].server_data.indexOf(mEp) / 50); found = true; }
            }
          }
          if (!found) {
            for (let i = 0; i < extractedServers.length; i++) {
              const mEp = extractedServers[i].server_data.find(e => e.slug === savedProg.episodeSlug);
              if (mEp) { targetServerIdx = i; targetEp = mEp; targetTabIdx = Math.floor(extractedServers[i].server_data.indexOf(mEp) / 50); break; }
            }
          }
        }

        setActiveServerIdx(targetServerIdx); setActiveTabIdx(targetTabIdx); setEp(targetEp); setLoadingPlayer(false);
      } catch {
        if (isMounted) { setError(true); setLoadingPage(false); setLoadingPlayer(false); }
      }
    };

    fetchMovieData();
    return () => { isMounted = false; };
  }, [slug]);

  const handleServerChange = (idx) => {
    setActiveServerIdx(idx); setActiveTabIdx(0);
    const matchingEp = serverList[idx]?.server_data?.find((e) => e.name === ep?.name);
    setEp(matchingEp || serverList[idx]?.server_data?.[0]);
  };

  const handleServerTimeout = () => {
    if (serverList.length > 1 && activeServerIdx < serverList.length - 1) {
      setIsSwitchingServer(true); setTimeout(() => setIsSwitchingServer(false), 2500); handleServerChange(activeServerIdx + 1);
    }
  };

  const currentServer = serverList[activeServerIdx];
  const episodes = currentServer?.server_data || [];
  const episodeChunks = useMemo(() => {
    const chunks = [];
    for (let i = 0; i < episodes.length; i += 50) chunks.push(episodes.slice(i, i + 50));
    return chunks;
  }, [episodes]);
  const currentChunk = episodeChunks[activeTabIdx] || [];

  if (loadingPage) return <div className="h-screen flex justify-center items-center bg-[#050505]"><Icon.Loader2 className="animate-spin text-[#E50914]" size={40} /></div>;
  if (error || (!data && !loadingPlayer)) return <div className="h-screen flex flex-col justify-center items-center bg-[#050505] text-white"><Icon.AlertTriangle className="text-[#E50914] mb-4" size={48} /><h2 className="text-xl font-bold">Lỗi tải phim!</h2></div>;

  return (
    <div className="pt-16 md:pt-28 pb-10 w-full max-w-[1440px] mx-auto px-0 sm:px-4 md:px-12 animate-in fade-in duration-500 bg-[#050505]">
      {isSwitchingServer && (
        <div className="fixed top-20 right-4 bg-[#E50914] text-white px-5 py-3 rounded-xl z-[200] font-bold flex items-center gap-3"><Icon.Loader2 className="animate-spin" size={18} /> Đang đổi server...</div>
      )}

      {ep ? (
        <Player
          ep={ep}
          poster={getImg(data?.poster_url || data?.thumb_url)}
          movieSlug={slug}
          movieName={data?.name}
          originName={data?.origin_name || data?.original_name}
          thumbUrl={data?.thumb_url || data?.poster_url}
          movieYear={data?.year}
          forceIframe={currentServer?.isIframe}
          serverSource={currentServer?.source}
          serverRawName={currentServer?.rawName}
          onServerTimeout={handleServerTimeout}
          onWatchPartyClick={() => {
            if (user) {
              setShowPartyModal(true);
            } else {
              onLogin();
            }
          }}
          user={user}
        />
      ) : loadingPlayer ? (
        <div className="relative w-full aspect-video bg-[#111] shadow-2xl overflow-hidden flex justify-center items-center animate-pulse"><Icon.Loader2 className="animate-spin text-[#E50914]" size={40} /></div>
      ) : null}

      <div className="mt-6 md:mt-10 bg-[#111] p-5 md:p-8 border-y sm:border border-white/5 shadow-2xl rounded-2xl">
        <h1 className="text-xl md:text-3xl font-black text-white uppercase mb-2 line-clamp-2">{safeText(data?.name)}</h1>
        {ep && <p className="text-gray-400 font-bold uppercase mb-8">Đang phát: Tập <span className="text-[#E50914]">{safeText(ep?.name)}</span></p>}

        {serverList.length > 0 && (
          <div>
            <div className="mb-6">
              {Object.entries(serverList.reduce((acc, s, idx) => { if (!acc[s.groupType]) acc[s.groupType] = []; acc[s.groupType].push({ ...s, originalIndex: idx }); return acc; }, {})).map(([type, servers]) => (
                <div key={type} className="mb-4">
                  <p className="text-gray-400 text-xs font-bold uppercase mb-2">MÁY CHỦ : {type}</p>
                  <div className="flex flex-wrap gap-3">
                    {servers.map((s) => (
                      <button key={s.originalIndex} onClick={() => handleServerChange(s.originalIndex)} className={`px-4 py-2 border rounded-lg font-bold uppercase ${activeServerIdx === s.originalIndex ? "border-[#E50914] bg-[#E50914]/10 text-white" : "border-white/10 text-gray-400 hover:text-white"}`}>{s.sourceName}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {episodeChunks.length > 1 && (
              <div className="mb-6 flex flex-wrap gap-2">
                {episodeChunks.map((_, idx) => (
                  <button key={idx} onClick={() => setActiveTabIdx(idx)} className={`px-4 py-2 font-bold rounded-lg border ${activeTabIdx === idx ? "border-[#E50914] text-[#E50914] bg-[#E50914]/10" : "border-white/10 text-gray-400 hover:text-white"}`}>Tập {idx * 50 + 1} - {Math.min((idx + 1) * 50, episodes.length)}</button>
                ))}
              </div>
            )}

            <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-10 gap-2 md:gap-3">
              {currentChunk.map((e, idx) => (
                <button key={idx} onClick={() => { setEp(e); window.scrollTo(0, 0); }} className={`py-3 rounded-lg font-black uppercase border ${ep?.name === e.name ? "bg-[#E50914] border-[#E50914] text-white scale-105" : "bg-white/5 border-white/5 text-gray-400 hover:text-white"}`}>{safeText(e.name)}</button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* POPUP TẠO PHÒNG XEM CHUNG */}
      {showPartyModal && (
        <div className="fixed inset-0 z-[500] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 shadow-2xl">
          <form
            onSubmit={handleCreateRoom}
            className="bg-[#111] p-6 md:p-8 rounded-3xl w-full max-w-md border border-white/10 shadow-2xl animate-in zoom-in-95 duration-300"
          >
            <h2 className="text-xl md:text-2xl font-black mb-6 uppercase tracking-widest flex items-center gap-3 text-white">
              <span className="w-1.5 h-6 bg-[#E50914] block"></span> TẠO PHÒNG XEM CHUNG
            </h2>

            <label className="block text-[10px] text-gray-400 mb-2 uppercase font-bold tracking-widest">Tên phòng</label>
            <input
              required
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="Nhập tên phòng..."
              className="w-full bg-[#222] rounded-xl p-4 mb-5 outline-none border border-white/5 focus:border-[#E50914] text-white font-bold"
            />

            <div className="flex gap-6 mb-6">
              <label className="flex items-center gap-2 text-white cursor-pointer font-bold text-sm">
                <input type="radio" checked={isPublic} onChange={() => setIsPublic(true)} className="accent-[#E50914]" />
                Công khai
              </label>
              <label className="flex items-center gap-2 text-white cursor-pointer font-bold text-sm">
                <input
                  type="radio"
                  checked={!isPublic}
                  onChange={() => setIsPublic(false)}
                  className="accent-[#E50914]"
                />
                Riêng tư
              </label>
            </div>

            {!isPublic && (
              <div className="animate-in slide-in-from-top-2 duration-300 mb-6">
                <label className="block text-[10px] text-gray-400 mb-2 uppercase font-bold tracking-widest">
                  Mật khẩu
                </label>
                <input
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type="text"
                  placeholder="Nhập mật khẩu..."
                  className="w-full bg-[#222] rounded-xl p-4 outline-none border border-white/5 focus:border-[#E50914] text-white font-bold"
                />
              </div>
            )}

            <div className="flex justify-end gap-3 mt-8">
              <button
                type="button"
                onClick={() => setShowPartyModal(false)}
                className="px-6 py-3 text-xs font-bold text-gray-400 hover:text-white transition uppercase tracking-widest bg-white/5 hover:bg-white/10 rounded-xl"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={isCreating}
                className="px-8 py-3 bg-[#E50914] hover:bg-red-700 disabled:bg-gray-700 text-white rounded-xl font-black uppercase text-xs transition shadow-[0_4px_15px_rgba(229,9,20,0.4)]"
              >
                {isCreating ? "ĐANG TẠO..." : "TẠO PHÒNG"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}