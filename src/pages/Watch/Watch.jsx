import React, { useState, useEffect, useRef, useMemo } from "react";
import * as Icon from "lucide-react";
import { supabase } from "../../utils/supabaseClient";

import {
  API,
  API_NGUONC,
  API_NGUONC_DETAIL,
  getImg,
  safeText,
  watchDataCache,
  generateRoomId
} from "../../utils/helpers";

import Artplayer from "artplayer";
import Hls from "hls.js";

const requestMemoryCache = new Map();

function getCacheKey(url) { return `watch_api_cache:${url}`; }

function getCachedFromStorage(url, ttl = 3 * 60 * 1000) {
  try {
    const raw = localStorage.getItem(getCacheKey(url));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.timestamp || !("data" in parsed)) return null;
    if (Date.now() - parsed.timestamp > ttl) { localStorage.removeItem(getCacheKey(url)); return null; }
    return parsed.data;
  } catch { return null; }
}

function setCachedToStorage(url, data) {
  try { localStorage.setItem(getCacheKey(url), JSON.stringify({ data, timestamp: Date.now() })); } catch {}
}

async function fetchJsonCached(url, { signal, ttl = 3 * 60 * 1000 } = {}) {
  const memoryHit = requestMemoryCache.get(url);
  if (memoryHit) return memoryHit;
  const storageHit = getCachedFromStorage(url, ttl);
  if (storageHit) { requestMemoryCache.set(url, Promise.resolve(storageHit)); return storageHit; }
  const promise = fetch(url, { signal }).then(async (r) => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const data = await r.json();
    setCachedToStorage(url, data);
    return data;
  });
  requestMemoryCache.set(url, promise);
  try { return await promise; } catch (err) { requestMemoryCache.delete(url); throw err; }
}

function normalizeForMatch(str) {
  return String(str || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function isCrossMatch(m1, m2) {
  if (!m1 || !m2) return false;
  const n1 = normalizeForMatch(m1.name); const n2 = normalizeForMatch(m2.name);
  const o1 = normalizeForMatch(m1.origin_name || m1.original_name); const o2 = normalizeForMatch(m2.origin_name || m2.original_name);
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

function Player({ ep, poster, movieSlug, movieName, originName, thumbUrl, movieYear, forceIframe, serverSource, serverRawName, onServerTimeout, onWatchPartyClick, user, savedTime, onProgressSaved, autoFullscreen, isSwitchingServer }) {
  const artRef = useRef(null);
  const lastLocalSaveRef = useRef(0);
  const lastDbSaveRef = useRef(0);
  const hasAutoFullscreened = useRef(false);
  const userRef = useRef(user);

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
  }, [ep?.link_m3u8, ep?.link_embed]);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const m3u8Link = ep?.link_m3u8;
  const embedLink = ep?.link_embed;
  const useIframe = forceIframe || !m3u8Link || m3u8Link.trim() === "";

  const saveCurrentProgress = async (currTime, totalDur, syncToDb = false) => {
    const currentUser = userRef.current;
    if (!movieSlug || !ep?.slug || !currentUser?.uid) return;
    if (useIframe || currTime < 1) return;

    const pctRaw = totalDur > 0 ? (currTime / totalDur) * 100 : 0;
    const finalPct = Math.round(Math.max(0, Math.min(100, pctRaw)));

    let finalThumb = thumbUrl || poster || "";
    if (!finalThumb || String(finalThumb) === "null" || String(finalThumb).includes("placehold.co")) {
      finalThumb = "";
    } else {
      finalThumb = getImg(finalThumb); 
    }

    const progressObj = {
      episodeSlug: ep.slug,
      episode_name: ep.name || "",
      currentTime: currTime,
      percentage: finalPct,
      name: movieName || "",
      origin_name: originName || "",
      thumb: finalThumb,
      year: movieYear || "",
      serverSource: serverSource || "",
      serverRawName: serverRawName || "",
      timestamp: Date.now()
    };

    if (onProgressSaved) onProgressSaved(movieSlug, progressObj);

    if (syncToDb) {
      const payload = {
        user_id: currentUser.uid,
        movie_slug: movieSlug,
        episode_slug: ep.slug,
        episode_name: ep.name || "",
        current_time: currTime,
        percentage: finalPct,
        movie_name: movieName || "",
        origin_name: originName || "",
        thumb_url: finalThumb,
        year: movieYear || "",
        server_source: serverSource || "",
        server_raw_name: serverRawName || "",
        updated_at: new Date().toISOString()
      };
      try {
        supabase.from('watch_history').upsert(payload, { onConflict: 'user_id,movie_slug' }).then();
      } catch (e) {}
    }
  };

  useEffect(() => {
    if (useIframe || !artRef.current || !m3u8Link) return;

    hasAutoFullscreened.current = false;

    let artInstance = new Artplayer({
      container: artRef.current,
      url: m3u8Link,
      poster: poster,
      volume: 1,
      isLive: false,
      muted: false,
      autoplay: false, 
      pip: true, 
      airplay: false, 
      autoSize: false,
      autoMini: true,
      setting: true,
      loop: false,
      flip: false,
      playbackRate: true,
      aspectRatio: false,
      fullscreen: true, 
      fullscreenWeb: false, 
      subtitleOffset: false,
      miniProgressBar: true,
      mutex: true,
      backdrop: true,
      playsInline: true,
      autoPlayback: false, 
      theme: '#E50914',
      hotkey: false,
      lang: 'vi',
      i18n: {
        'vi': { 'Play': 'Phát', 'Pause': 'Tạm dừng', 'Volume': 'Âm lượng', 'Mute': 'Tắt âm', 'Settings': 'Cài đặt', 'Speed': 'Tốc độ phát', 'Normal': 'Bình thường', 'Quality': 'Chất lượng', 'Auto': 'Tự động', 'Notice': 'Thông báo' }
      },
      customType: {
        m3u8: function (video, url, art) {
          if (Hls.isSupported()) {
            if (art.hls) art.hls.destroy();
            const hls = new Hls({ enableWorker: true, lowLatencyMode: true, backBufferLength: 30 });
            hls.loadSource(url);
            hls.attachMedia(video);
            art.hls = hls; 
            
            hls.on(Hls.Events.MANIFEST_PARSED, function (event, data) {
              if (savedTime > 0) {
                video.currentTime = savedTime;
                art.notice.show = 'Đã khôi phục thời gian xem trước đó';
              }
            });
            
            hls.on(Hls.Events.ERROR, function (event, data) { 
                if (data.fatal) { 
                    setIsLoading(false);
                    art.notice.show = 'Máy chủ quá tải, đang đổi Server...'; 
                    if (onServerTimeout) onServerTimeout(); 
                } 
            });
            art.on('destroy', () => { if (art.hls) { art.hls.stopLoad(); art.hls.destroy(); art.hls = null; } });
          } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = url;
            video.addEventListener('loadedmetadata', () => {
              if (savedTime > 0) {
                video.currentTime = savedTime;
                art.notice.show = 'Đã khôi phục thời gian xem trước đó';
              }
            });
          }
        },
      },
      controls: [
        { position: 'left', index: 10, html: `<svg class="art-icon-seek" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 19 2 12 11 5 11 19"></polygon><polygon points="22 19 13 12 22 5 22 19"></polygon></svg>`, tooltip: 'Tua lùi 10s', click: function () { if (artInstance) artInstance.seek = Math.max(0, artInstance.currentTime - 10); } },
        { position: 'left', index: 11, html: `<svg class="art-icon-seek" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 19 22 12 13 5 13 19"></polygon><polygon points="2 19 11 12 2 5 2 19"></polygon></svg>`, tooltip: 'Tua tới 10s', click: function () { if (artInstance) artInstance.seek = artInstance.currentTime + 10; } },
        ...(serverSource === "ophim" ? [{ 
          position: 'right', 
          index: 10,
          html: `
            <div class="watch-party-btn">
              <svg class="wp-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg> 
              <span class="watch-party-text">Xem Chung</span>
            </div>
            <style>
              .watch-party-btn { display: flex; align-items: center; gap: 6px; background: rgba(229,9,20,0.9); padding: 6px 12px; border-radius: 6px; font-weight: 900; font-size: 11px; cursor: pointer; color: white; text-transform: uppercase; letter-spacing: 1px; margin-right: 8px; }
              .wp-icon { width: 14px; height: 14px; stroke-width: 2.5px; }
              @media (max-width: 640px) { 
                .watch-party-text { display: none; } 
                .watch-party-btn { padding: 4px; border-radius: 50%; margin-right: 0px; background: transparent; } 
                .wp-icon { width: 18px; height: 18px; stroke-width: 2px; } 
              }
            </style>
          `, 
          tooltip: 'Mở phòng xem chung', 
          click: function () { if (onWatchPartyClick) onWatchPartyClick(); } 
        }] : [])
      ],
    });

    artInstance.on('video:waiting', () => setIsLoading(true));
    artInstance.on('video:canplay', () => setIsLoading(false));
    artInstance.on('video:playing', () => setIsLoading(false));

    artInstance.on('fullscreen', (state) => {
      try {
        if (state) {
          if (window.screen && window.screen.orientation && window.screen.orientation.lock) {
            window.screen.orientation.lock("landscape").catch(() => {});
          }
        } else {
          if (window.screen && window.screen.orientation && window.screen.orientation.unlock) {
            window.screen.orientation.unlock();
          }
        }
      } catch (e) {}
    });

    artInstance.on('ready', () => {
      if (autoFullscreen && !hasAutoFullscreened.current) {
        hasAutoFullscreened.current = true;
        
        setTimeout(() => {
          artInstance.fullscreen = true;
          artInstance.muted = true;
          artInstance.play().then(() => {
            artInstance.notice.show = "Đã tự động phát (Tắt tiếng). Vui lòng chạm bật âm lượng!";
          }).catch(() => {});
        }, 500); 
      }
    });

    artInstance.on('video:timeupdate', () => {
      const video = artInstance.video;
      if (video.currentTime > 0 && video.duration > 0) {
        if (Math.abs(video.currentTime - lastLocalSaveRef.current) >= 5) {
          lastLocalSaveRef.current = video.currentTime;
          saveCurrentProgress(video.currentTime, video.duration, false); 
        }
        if (Math.abs(video.currentTime - lastDbSaveRef.current) >= 60) {
          lastDbSaveRef.current = video.currentTime;
          saveCurrentProgress(video.currentTime, video.duration, true);
        }
      }
    });

    artInstance.on('video:pause', () => {
       const video = artInstance.video;
       if (video.currentTime > 0) { lastDbSaveRef.current = video.currentTime; saveCurrentProgress(video.currentTime, video.duration, true); }
    });

    const handleBeforeUnload = () => { if (artInstance && artInstance.video && artInstance.video.currentTime > 1) { saveCurrentProgress(artInstance.video.currentTime, artInstance.video.duration || 0, true); } };
    window.addEventListener('beforeunload', handleBeforeUnload);

    const handleGlobalKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
      switch(e.key.toLowerCase()) {
        case 'f': 
          artInstance.fullscreen = !artInstance.fullscreen;
          break;
        case ' ': e.preventDefault(); artInstance.toggle(); break;
        case 'arrowright': e.preventDefault(); artInstance.seek = artInstance.currentTime + 5; break;
        case 'arrowleft': e.preventDefault(); artInstance.seek = Math.max(0, artInstance.currentTime - 5); break;
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);

    let fallbackTimer = setTimeout(() => { if (artInstance.video && artInstance.video.readyState < 1 && onServerTimeout) { onServerTimeout(); } }, 6000);
    artInstance.on('video:canplay', () => clearTimeout(fallbackTimer));

    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown); 
      window.removeEventListener('beforeunload', handleBeforeUnload);
      clearTimeout(fallbackTimer);
      if (artInstance) {
        try {
          const videoEl = artInstance.video;
          if (videoEl) {
             if (videoEl.currentTime > 0) { saveCurrentProgress(videoEl.currentTime, videoEl.duration || 0, true); }
             videoEl.muted = true; videoEl.pause(); videoEl.removeAttribute('src'); videoEl.load();
          }
          if (artInstance.hls) { artInstance.hls.stopLoad(); artInstance.hls.destroy(); artInstance.hls = null; }
          artInstance.destroy(false);
        } catch (e) {}
      }
    };
  }, [m3u8Link, useIframe, ep, movieSlug]);

  return (
    <div className="relative w-full aspect-video bg-[#050505] shadow-[0_20px_50px_rgba(0,0,0,0.5)] md:rounded-2xl overflow-hidden border border-white/5 flex justify-center items-center">
      <style>{`
        .art-icon-seek {
          width: 20px;
          height: 20px;
          color: white;
        }

        @media (max-width: 640px) {
          .art-controls-left .art-control,
          .art-controls-right .art-control {
            margin: 0 !important;
            padding: 0 3px !important;
          }
          
          .art-control svg, .art-icon-seek {
            width: 18px !important;
            height: 18px !important;
          }

          .art-control-time {
            font-size: 10px !important;
            padding: 0 2px !important;
          }
        }
        .art-spinner { display: none !important; }
      `}</style>

      <div className={`absolute inset-0 z-[150] bg-[#050505] flex flex-col justify-center items-center transition-opacity duration-300 ${isLoading || isSwitchingServer ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
         <div className="w-12 h-12 md:w-16 md:h-16 border-[4px] border-white/10 border-t-[#E50914] rounded-full animate-spin"></div>
         {isSwitchingServer && <span className="mt-4 text-white text-[10px] md:text-xs font-bold uppercase tracking-widest animate-pulse">Đang đổi máy chủ...</span>}
      </div>

      {useIframe && embedLink ? (
        <iframe onLoad={() => setIsLoading(false)} src={embedLink} className="w-full h-full object-contain bg-black" frameBorder="0" allowFullScreen title="Video Player" />
      ) : (
        <div ref={artRef} className="w-full h-full object-contain"></div>
      )}
    </div>
  );
}

export default function Watch({ slug, movieData, navigate, user, onLogin, onProgressSaved, progressData, autoFullscreen }) {
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

  const [restoredTime, setRestoredTime] = useState(0);
  
  const [showEpModal, setShowEpModal] = useState(false);

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    if (!user) { onLogin(); return; }
    if (!roomName.trim()) return alert("Vui lòng nhập tên phòng");
    setIsCreating(true);
    try {
      const roomId = generateRoomId();
      await supabase.from('rooms').insert([{
        id: roomId, name: roomName.trim(), movie_id: slug || "",
        host_id: user?.uid || "unknown_uid", host_name: user?.displayName || user?.email?.split('@')[0] || "Khách",
        is_public: isPublic, password: isPublic ? null : password,
        current_time: 0, is_playing: false, ep_index: 0, viewer_count: 1
      }]);
      setShowPartyModal(false); setIsCreating(false); navigate({ type: "watch-room", roomId, slug });
    } catch (err) { alert("Lỗi tạo phòng: " + err.message); setIsCreating(false); }
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
      
      if (progressData && progressData[slug]) {
         savedProg = progressData[slug];
      } else if (user?.uid) {
         try {
             const { data: historyData } = await supabase
                .from('watch_history')
                .select('*')
                .eq('user_id', user.uid)
                .eq('movie_slug', slug)
                .limit(1);
                
             if (historyData && historyData.length > 0) {
                 const hd = historyData[0];
                 savedProg = { episodeSlug: hd.episode_slug, currentTime: hd.current_time, serverSource: hd.server_source };
             }
         } catch(e) {}
      }

      if (watchDataCache.has(slug)) {
        const cached = watchDataCache.get(slug);
        if (!isMounted) return;
        setData(cached.baseItem); setLoadingPage(false); setServerList(cached.serverList);

        let targetServerIdx = 0; let targetEp = cached.serverList[0]?.server_data[0]; let targetTabIdx = 0; let rTime = 0;
        if (savedProg?.episodeSlug) {
          let found = false;
          if (savedProg.serverSource) {
            const sIdx = cached.serverList.findIndex(s => s.source === savedProg.serverSource);
            if (sIdx !== -1) {
              const mEp = cached.serverList[sIdx].server_data.find(e => e.slug === savedProg.episodeSlug);
              if (mEp) { targetServerIdx = sIdx; targetEp = mEp; targetTabIdx = Math.floor(cached.serverList[sIdx].server_data.indexOf(mEp) / 50); found = true; rTime = Number(savedProg.currentTime) || 0; }
            }
          }
          if (!found) {
            for (let i = 0; i < cached.serverList.length; i++) {
              const mEp = cached.serverList[i].server_data.find(e => e.slug === savedProg.episodeSlug);
              if (mEp) { targetServerIdx = i; targetEp = mEp; targetTabIdx = Math.floor(cached.serverList[i].server_data.indexOf(mEp) / 50); rTime = Number(savedProg.currentTime) || 0; break; }
            }
          }
        }
        setActiveServerIdx(targetServerIdx); setActiveTabIdx(targetTabIdx); setEp(targetEp); setRestoredTime(rTime); setLoadingPlayer(false);
        return;
      }

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        const ophimPromise = fetchJsonCached(`${API}/phim/${slug}`, { signal: controller.signal });
        const nguoncPromise = fetchJsonCached(`${API_NGUONC_DETAIL}/${slug}`, { signal: controller.signal });

        let earlyPageOpened = false;
        ophimPromise.then((res) => { if (!isMounted || earlyPageOpened) return; const earlyOItem = res?.data?.item || null; if (earlyOItem) { earlyPageOpened = true; setData(earlyOItem); setLoadingPage(false); } }).catch(() => {});
        nguoncPromise.then((res) => { if (!isMounted || earlyPageOpened) return; const earlyNItem = res?.movie || res?.item || res || null; if (earlyNItem) { earlyPageOpened = true; setData(earlyNItem); setLoadingPage(false); } }).catch(() => {});

        const [resOphim, resNguonc] = await Promise.allSettled([ophimPromise, nguoncPromise]);
        clearTimeout(timeoutId);

        let oItem = resOphim.status === "fulfilled" ? resOphim.value?.data?.item : null;
        let nItem = null;
        if (resNguonc.status === "fulfilled" && resNguonc.value) { const nData = resNguonc.value; nItem = nData?.movie || nData?.item || nData; if (nItem) nItem.episodes = nItem.episodes || nData.episodes || []; }

        if (!isMounted) return;
        if ((oItem || nItem) && !earlyPageOpened) { setData(oItem || nItem); setLoadingPage(false); earlyPageOpened = true; }

        if (oItem && (!nItem || !nItem.episodes || nItem.episodes.length === 0)) {
          const queries = [oItem.origin_name, oItem.original_name, oItem.name].filter(Boolean).slice(0, 2);
          for (const q of queries) { try { const itemsList = await fetchNguoncSearch(q); let match = itemsList.find((i) => isCrossMatch(oItem, i)); if (!match && itemsList.length > 0) match = itemsList[0]; if (match?.slug) { const dItem = await fetchNguoncDetail(match.slug); if (dItem?.episodes?.length > 0) { nItem = dItem; break; } } } catch {} }
        } else if (!oItem && nItem) {
          const queries = [nItem.origin_name, nItem.original_name, nItem.name].filter(Boolean).slice(0, 2);
          for (const q of queries) { try { const itemsList = await fetchOphimSearch(q); let match = itemsList.find((i) => isCrossMatch(nItem, i)); if (!match && itemsList.length > 0) match = itemsList[0]; if (match?.slug) { const dItem = await fetchOphimDetail(match.slug); if (dItem) { oItem = dItem; break; } } } catch {} }
        } else if (!oItem && !nItem) {
          const searchSlug = String(slug || "").replace(/-/g, " ");
          const [oList, nList] = await Promise.allSettled([ fetchOphimSearch(searchSlug), fetchNguoncSearch(searchSlug) ]);
          const ophimItems = oList.status === "fulfilled" ? oList.value : [];
          const nguoncItems = nList.status === "fulfilled" ? nList.value : [];
          const oMatchSlug = ophimItems[0]?.slug;
          let nMatchSlug = nguoncItems.find((i) => (ophimItems[0] ? isCrossMatch(ophimItems[0], i) : true))?.slug;
          if (!nMatchSlug && nguoncItems.length > 0) nMatchSlug = nguoncItems[0]?.slug;
          const [fbO, fbN] = await Promise.allSettled([ oMatchSlug ? fetchOphimDetail(oMatchSlug) : Promise.resolve(null), nMatchSlug ? fetchNguoncDetail(nMatchSlug) : Promise.resolve(null) ]);
          oItem = fbO.status === "fulfilled" ? fbO.value : null; nItem = fbN.status === "fulfilled" ? fbN.value : null;
        }

        if (!isMounted) return;
        if (!oItem && !nItem) { setError(true); setLoadingPage(false); setLoadingPlayer(false); return; }

        const baseItem = oItem || nItem;
        setData(baseItem); setLoadingPage(false);

        let extractedServers = [];
        if (Array.isArray(oItem?.episodes)) { oItem.episodes.forEach((svr) => { const epsList = svr.server_data || []; if (epsList.length > 0) extractedServers.push({ rawName: svr.server_name || "Vietsub", source: "ophim", isIframe: false, server_data: epsList.map((e) => ({ name: e.name, slug: e.slug, link_m3u8: e.link_m3u8 || "", link_embed: e.link_embed || "" })) }); }); }
        if (Array.isArray(nItem?.episodes)) { nItem.episodes.forEach((svr) => { const epsList = svr.items || svr.server_data || []; if (epsList.length > 0) extractedServers.push({ rawName: svr.server_name || "Vietsub", source: "nguonc", isIframe: true, server_data: epsList.map((e) => ({ name: e.name, slug: e.slug, link_m3u8: e.m3u8 || e.m3u8_url || e.link_m3u8 || "", link_embed: e.embed || e.embed_url || e.link_embed || "" })) }); }); }

        if (extractedServers.length === 0) { setError(true); setLoadingPlayer(false); return; }

        extractedServers.forEach((s) => { const raw = String(s.rawName || "Vietsub").toUpperCase(); if (raw.includes("THUYẾT MINH") || raw.includes("LỒNG TIẾNG")) s.groupType = "THUYẾT MINH"; else s.groupType = "VIETSUB"; });
        extractedServers.sort((a, b) => { if (a.groupType === "VIETSUB" && b.groupType !== "VIETSUB") return -1; if (a.groupType !== "VIETSUB" && b.groupType === "VIETSUB") return 1; return (a.source === "ophim" ? -1 : 1) - (b.source === "ophim" ? -1 : 1); });
        extractedServers.forEach((s) => { s.sourceName = s.source === "ophim" ? `MÁY CHỦ 1 : ${s.groupType}` : `MÁY CHỦ 2 : ${s.groupType}`; });

        setServerList(extractedServers);
        watchDataCache.set(slug, { baseItem, serverList: extractedServers });

        let targetServerIdx = 0; let targetEp = extractedServers[0].server_data[0]; let targetTabIdx = 0; let rTime = 0;
        
        // ĐÃ SỬA LỖI ĐỒNG BỘ LỊCH SỬ Ở ĐÂY: Sử dụng extractedServers thay vì cached.serverList
        if (savedProg?.episodeSlug) {
          let found = false;
          if (savedProg.serverSource) {
            const sIdx = extractedServers.findIndex(s => s.source === savedProg.serverSource);
            if (sIdx !== -1) {
              const mEp = extractedServers[sIdx].server_data.find(e => e.slug === savedProg.episodeSlug);
              if (mEp) { targetServerIdx = sIdx; targetEp = mEp; targetTabIdx = Math.floor(extractedServers[sIdx].server_data.indexOf(mEp) / 50); found = true; rTime = Number(savedProg.currentTime) || 0; }
            }
          }
          if (!found) {
            for (let i = 0; i < extractedServers.length; i++) {
              const mEp = extractedServers[i].server_data.find(e => e.slug === savedProg.episodeSlug);
              if (mEp) { targetServerIdx = i; targetEp = mEp; targetTabIdx = Math.floor(extractedServers[i].server_data.indexOf(mEp) / 50); rTime = Number(savedProg.currentTime) || 0; break; }
            }
          }
        }
        setActiveServerIdx(targetServerIdx); setActiveTabIdx(targetTabIdx); setEp(targetEp); setRestoredTime(rTime); setLoadingPlayer(false);
      } catch {
        if (isMounted) { setError(true); setLoadingPage(false); setLoadingPlayer(false); }
      }
    };

    fetchMovieData();
    return () => { isMounted = false; };
  }, [slug, user?.uid]); 

  const handleServerChange = (idx) => {
    setActiveServerIdx(idx); setActiveTabIdx(0);
    const matchingEp = serverList[idx]?.server_data?.find((e) => e.name === ep?.name);
    setEp(matchingEp || serverList[idx]?.server_data?.[0]);
    setRestoredTime(0);
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
          onWatchPartyClick={() => { if (user) { setShowPartyModal(true); } else { onLogin(); } }}
          user={user}
          savedTime={restoredTime}
          onProgressSaved={onProgressSaved}
          autoFullscreen={autoFullscreen}
          isSwitchingServer={isSwitchingServer}
        />
      ) : loadingPlayer ? (
        <div className="relative w-full aspect-video bg-[#111] shadow-2xl overflow-hidden flex justify-center items-center animate-pulse"><Icon.Loader2 className="animate-spin text-[#E50914]" size={40} /></div>
      ) : null}

      <div className="mt-4 md:mt-8 bg-[#111] p-4 md:p-8 border-y sm:border border-white/5 shadow-xl md:rounded-2xl">
        <div className="border-b border-white/10 pb-4">
          <h1 className="text-lg md:text-3xl font-black text-white uppercase tracking-tight mb-2 line-clamp-2 leading-snug">{safeText(data?.name)}</h1>
          
          {ep && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] md:text-xs text-gray-400 font-bold uppercase tracking-widest">Đang phát:</span>
              
              {/* ĐÃ NÂNG CẤP NÚT CHỌN TẬP Ở ĐÂY: Thêm chữ Tập, Icon mũi tên và hiệu ứng Hover */}
              <button 
                onClick={() => setShowEpModal(true)} 
                className="group flex items-center gap-1.5 bg-[#E50914] text-white text-[11px] md:text-xs font-black px-3 py-1.5 md:px-4 md:py-2 rounded-md shadow-[0_2px_10px_rgba(229,9,20,0.3)] hover:bg-red-700 hover:scale-105 transition-all duration-200"
                title="Bấm vào đây để chọn tập khác"
              >
                <span>Tập {safeText(ep?.name).replace(/tập\s*/i, '')}</span>
                <Icon.ChevronDown size={14} className="group-hover:translate-y-0.5 transition-transform" />
              </button>
            </div>
          )}
        </div>

        {serverList.length > 0 && (
          <div className="mt-4 md:mt-6">
            <div className="flex flex-col gap-3">
              {Object.entries(serverList.reduce((acc, s, idx) => { if (!acc[s.groupType]) acc[s.groupType] = []; acc[s.groupType].push({ ...s, originalIndex: idx }); return acc; }, {})).map(([type, servers]) => (
                <div key={type} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                  <span className="text-gray-500 text-[10px] md:text-xs font-black uppercase w-20 md:w-24 shrink-0 tracking-widest">{type}</span>
                  <div className="flex flex-wrap gap-2">
                    {servers.map((s) => (
                      <button 
                        key={s.originalIndex} 
                        onClick={() => handleServerChange(s.originalIndex)} 
                        className={`px-3 py-1.5 md:px-4 md:py-2 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-wide transition-all duration-200 ${
                          activeServerIdx === s.originalIndex 
                          ? "bg-[#E50914] text-white shadow-[0_2px_10px_rgba(229,9,20,0.4)] border border-[#E50914]" 
                          : "bg-[#1a1a1a] text-gray-400 border border-white/10 hover:bg-white/10 hover:text-white"
                        }`}
                      >
                        {s.source === "ophim" ? "MÁY CHỦ 1" : "MÁY CHỦ 2"}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {episodeChunks.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] border-b border-white/5 mt-4">
                {episodeChunks.map((_, idx) => (
                  <button 
                    key={idx} 
                    onClick={() => setActiveTabIdx(idx)} 
                    className={`shrink-0 px-3 py-1.5 md:px-4 md:py-2 rounded-lg text-[10px] md:text-xs font-bold uppercase transition-colors ${
                      activeTabIdx === idx 
                      ? "bg-white/10 text-white border-b-2 border-[#E50914] rounded-b-none" 
                      : "text-gray-500 hover:text-gray-300 border-b-2 border-transparent"
                    }`}
                  >
                    Từ {idx * 50 + 1} - {Math.min((idx + 1) * 50, episodes.length)}
                  </button>
                ))}
              </div>
            )}

            <div className="grid grid-cols-5 sm:grid-cols-8 lg:grid-cols-12 gap-1.5 md:gap-2 mt-4">
              {currentChunk.map((e, idx) => (
                <button 
                  key={idx} 
                  onClick={() => { setEp(e); setRestoredTime(0); window.scrollTo(0, 0); }} 
                  className={`py-2 md:py-2.5 rounded-md text-[11px] md:text-sm font-black uppercase transition-all duration-200 ${
                    ep?.name === e.name 
                    ? "bg-[#E50914] text-white shadow-[0_2px_8px_rgba(229,9,20,0.5)] transform scale-105 z-10" 
                    : "bg-[#1a1a1a] text-gray-400 border border-white/5 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {safeText(e.name).replace(/tập\s*/i, '')}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {showEpModal && (
        <div className="fixed inset-0 z-[500] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 transition-opacity duration-300" onClick={() => setShowEpModal(false)}>
          <div className="bg-[#111] w-full sm:w-[600px] max-h-[75vh] sm:max-h-[85vh] rounded-t-3xl sm:rounded-2xl flex flex-col shadow-[0_-10px_50px_rgba(0,0,0,0.5)] animate-in slide-in-from-bottom-full duration-300 border-t border-white/10 sm:border-0" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 md:p-5 flex justify-between items-center border-b border-white/10 shrink-0">
              <h3 className="text-sm md:text-base font-black uppercase tracking-widest text-white flex items-center gap-2">
                <Icon.ListVideo size={18} className="text-[#E50914]"/> CHỌN TẬP
              </h3>
              <button onClick={() => setShowEpModal(false)} className="p-1.5 bg-white/5 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition">
                <Icon.X size={18} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 md:p-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {episodeChunks.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-3 mb-4 border-b border-white/5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  {episodeChunks.map((_, idx) => (
                    <button 
                      key={idx} 
                      onClick={() => setActiveTabIdx(idx)} 
                      className={`shrink-0 px-4 py-2 rounded-lg text-[10px] md:text-xs font-bold uppercase transition-colors ${
                        activeTabIdx === idx 
                        ? "bg-white/10 text-white border border-[#E50914]" 
                        : "text-gray-500 hover:text-gray-300 border border-transparent"
                      }`}
                    >
                      Từ {idx * 50 + 1} - {Math.min((idx + 1) * 50, episodes.length)}
                    </button>
                  ))}
                </div>
              )}
              <div className="grid grid-cols-5 sm:grid-cols-6 lg:grid-cols-8 gap-2">
                {currentChunk.map((e, idx) => (
                  <button 
                    key={idx} 
                    onClick={() => { setEp(e); setRestoredTime(0); setShowEpModal(false); window.scrollTo(0, 0); }} 
                    className={`py-2.5 md:py-3 rounded-md text-xs md:text-sm font-black uppercase transition-all duration-200 ${
                      ep?.name === e.name 
                      ? "bg-[#E50914] text-white shadow-[0_2px_8px_rgba(229,9,20,0.5)] transform scale-105 z-10" 
                      : "bg-[#1a1a1a] text-gray-400 border border-white/5 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    {safeText(e.name).replace(/tập\s*/i, '')}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {showPartyModal && (
        <div className="fixed inset-0 z-[500] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 shadow-2xl">
          <form onSubmit={handleCreateRoom} className="bg-[#111] p-6 md:p-8 rounded-3xl w-full max-w-md border border-white/10 shadow-2xl animate-in zoom-in-95 duration-300">
            <h2 className="text-xl md:text-2xl font-black mb-6 uppercase tracking-widest flex items-center gap-3 text-white"><span className="w-1.5 h-6 bg-[#E50914] block"></span> TẠO PHÒNG XEM CHUNG</h2>
            <label className="block text-[10px] text-gray-400 mb-2 uppercase font-bold tracking-widest">Tên phòng</label>
            <input required value={roomName} onChange={(e) => setRoomName(e.target.value)} placeholder="Nhập tên phòng..." className="w-full bg-[#222] rounded-xl p-4 mb-5 outline-none border border-white/5 focus:border-[#E50914] text-white font-bold" />
            <div className="flex gap-6 mb-6">
              <label className="flex items-center gap-2 text-white cursor-pointer font-bold text-sm"><input type="radio" checked={isPublic} onChange={() => setIsPublic(true)} className="accent-[#E50914]" /> Công khai</label>
              <label className="flex items-center gap-2 text-white cursor-pointer font-bold text-sm"><input type="radio" checked={!isPublic} onChange={() => setIsPublic(false)} className="accent-[#E50914]" /> Riêng tư</label>
            </div>
            {!isPublic && (
              <div className="animate-in slide-in-from-top-2 duration-300 mb-6">
                <label className="block text-[10px] text-gray-400 mb-2 uppercase font-bold tracking-widest">Mật khẩu</label>
                <input required value={password} onChange={(e) => setPassword(e.target.value)} type="text" placeholder="Nhập mật khẩu..." className="w-full bg-[#222] rounded-xl p-4 outline-none border border-white/5 focus:border-[#E50914] text-white font-bold" />
              </div>
            )}
            <div className="flex justify-end gap-3 mt-8">
              <button type="button" onClick={() => setShowPartyModal(false)} className="px-6 py-3 text-xs font-bold text-gray-400 hover:text-white transition uppercase tracking-widest bg-white/5 hover:bg-white/10 rounded-xl">Hủy</button>
              <button type="submit" disabled={isCreating} className="px-8 py-3 bg-[#E50914] hover:bg-red-700 disabled:bg-gray-700 text-white rounded-xl font-black uppercase text-xs transition shadow-[0_4px_15px_rgba(229,9,20,0.4)]">{isCreating ? "ĐANG TẠO..." : "TẠO PHÒNG"}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}