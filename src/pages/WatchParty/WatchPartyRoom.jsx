import React, { useState, useEffect, useRef, useMemo } from "react";
import * as Icon from "lucide-react";
import { supabase } from "../../utils/supabaseClient"; 
import { API, API_TMDB, fetchWithCache, matchTmdbToOphim, getImg, mergeDuplicateMovies } from "../../utils/helpers"; 
import MovieCard from "../../components/common/MovieCard";

import Artplayer from "artplayer";
import Hls from "hls.js";

const WORKER_URL = "https://polite-api.thangdz2001a.workers.dev";

const proxyUrl = (url) => {
  if (!url) return url;
  if (url.includes("/proxy/")) return url;
  return `${WORKER_URL}/proxy/${encodeURIComponent(url)}`;
};

// ==========================================
// 1. CÁC COMPONENT SVG AVATAR ĐỘNG VẬT
// ==========================================
const ShibaAvatar = ({ className }) => (<svg viewBox="0 0 100 100" className={className}><path d="M 25 45 L 12 15 L 45 25 Z" fill="#E59A54" stroke="#111" strokeWidth="3" strokeLinejoin="round"/><path d="M 75 45 L 88 15 L 55 25 Z" fill="#E59A54" stroke="#111" strokeWidth="3" strokeLinejoin="round"/><circle cx="50" cy="55" r="38" fill="#E59A54" stroke="#111" strokeWidth="3"/><path d="M 50 93 C 15 93 12 55 12 55 C 30 55 40 40 50 55 C 60 40 70 55 88 55 C 88 55 85 93 50 93 Z" fill="#FFF" stroke="#111" strokeWidth="3" strokeLinejoin="round"/><circle cx="33" cy="48" r="5" fill="#111"/><circle cx="31" cy="46" r="1.5" fill="#FFF"/><circle cx="67" cy="48" r="5" fill="#111"/><circle cx="65" cy="46" r="1.5" fill="#FFF"/><ellipse cx="50" cy="62" rx="6" ry="4" fill="#111"/><path d="M 43 70 Q 50 75 57 70" fill="none" stroke="#111" strokeWidth="3" strokeLinecap="round"/></svg>);
const HuskyAvatar = ({ className }) => (<svg viewBox="0 0 100 100" className={className}><path d="M 28 45 L 18 12 L 45 28 Z" fill="#374151" stroke="#111" strokeWidth="3" strokeLinejoin="round"/><path d="M 72 45 L 82 12 L 55 28 Z" fill="#374151" stroke="#111" strokeWidth="3" strokeLinejoin="round"/><path d="M 28 40 L 22 18 L 40 28 Z" fill="#E5E7EB"/><path d="M 72 40 L 78 18 L 60 28 Z" fill="#E5E7EB"/><circle cx="50" cy="55" r="38" fill="#374151" stroke="#111" strokeWidth="3"/><path d="M 50 93 C 15 93 12 55 12 55 C 30 55 40 35 50 55 C 60 35 70 55 88 55 C 88 55 85 93 50 93 Z" fill="#F3F4F6" stroke="#111" strokeWidth="3" strokeLinejoin="round"/><circle cx="35" cy="36" r="3.5" fill="#F3F4F6"/><circle cx="65" cy="36" r="3.5" fill="#F3F4F6"/><circle cx="33" cy="48" r="5" fill="#111"/><circle cx="31" cy="46" r="1.5" fill="#FFF"/><circle cx="67" cy="48" r="5" fill="#111"/><circle cx="65" cy="46" r="1.5" fill="#FFF"/><ellipse cx="50" cy="64" rx="6" ry="4" fill="#111"/><path d="M 43 72 Q 50 77 57 72" fill="none" stroke="#111" strokeWidth="3" strokeLinecap="round"/></svg>);
const PugAvatar = ({ className }) => (<svg viewBox="0 0 100 100" className={className}><path d="M 25 30 Q 5 30 15 55 Q 25 45 35 35 Z" fill="#111" stroke="#111" strokeWidth="3" strokeLinejoin="round"/><path d="M 75 30 Q 95 30 85 55 Q 75 45 65 35 Z" fill="#111" stroke="#111" strokeWidth="3" strokeLinejoin="round"/><circle cx="50" cy="55" r="38" fill="#D4A373" stroke="#111" strokeWidth="3"/><path d="M 40 28 Q 50 33 60 28" fill="none" stroke="#111" strokeWidth="2.5" strokeLinecap="round"/><ellipse cx="50" cy="62" rx="22" ry="18" fill="#222" stroke="#111" strokeWidth="3"/><circle cx="32" cy="52" r="6" fill="#111"/><circle cx="30" cy="50" r="2" fill="#FFF"/><circle cx="68" cy="52" r="6" fill="#111"/><circle cx="66" cy="50" r="2" fill="#FFF"/><ellipse cx="50" cy="62" rx="5" ry="3" fill="#111"/><path d="M 45 70 Q 50 74 55 70" fill="none" stroke="#FFF" strokeWidth="2" strokeLinecap="round"/></svg>);
const GoldenAvatar = ({ className }) => (<svg viewBox="0 0 100 100" className={className}><path d="M 28 35 C 5 35 5 75 20 70 C 25 68 35 50 35 40 Z" fill="#C98A4B" stroke="#111" strokeWidth="3" strokeLinejoin="round"/><path d="M 72 35 C 95 35 95 75 80 70 C 75 68 65 50 65 40 Z" fill="#C98A4B" stroke="#111" strokeWidth="3" strokeLinejoin="round"/><circle cx="50" cy="55" r="38" fill="#E8A864" stroke="#111" strokeWidth="3"/><circle cx="50" cy="68" r="16" fill="#FDE0B6" stroke="#111" strokeWidth="3"/><circle cx="34" cy="46" r="4.5" fill="#111"/><circle cx="32" cy="44" r="1.5" fill="#FFF"/><circle cx="66" cy="46" r="4.5" fill="#111"/><circle cx="64" cy="44" r="1.5" fill="#FFF"/><ellipse cx="50" cy="64" rx="7" ry="5" fill="#111"/><path d="M 43 72 Q 50 78 57 72" fill="none" stroke="#111" strokeWidth="3" strokeLinecap="round"/></svg>);
const CatAvatar = ({ className }) => (<svg viewBox="0 0 100 100" className={className}><path d="M 25 45 L 15 15 L 45 25 Z" fill="#F97316" stroke="#111" strokeWidth="3" strokeLinejoin="round"/><path d="M 75 45 L 85 15 L 55 25 Z" fill="#F97316" stroke="#111" strokeWidth="3" strokeLinejoin="round"/><path d="M 25 40 L 19 22 L 38 27 Z" fill="#FDBA74" /><path d="M 75 40 L 81 22 L 62 27 Z" fill="#FDBA74" /><circle cx="50" cy="55" r="38" fill="#F97316" stroke="#111" strokeWidth="3"/><path d="M 50 17 L 50 32" stroke="#C2410C" strokeWidth="4" strokeLinecap="round"/><path d="M 40 20 L 43 32" stroke="#C2410C" strokeWidth="4" strokeLinecap="round"/><path d="M 60 20 L 57 32" stroke="#C2410C" strokeWidth="4" strokeLinecap="round"/><circle cx="50" cy="65" r="15" fill="#FFF" stroke="#111" strokeWidth="3"/><circle cx="33" cy="48" r="5" fill="#111"/><circle cx="31" cy="46" r="1.5" fill="#FFF"/><circle cx="67" cy="48" r="5" fill="#111"/><circle cx="65" cy="46" r="1.5" fill="#FFF"/><path d="M 47 62 L 53 62 L 50 66 Z" fill="#F472B6" stroke="#111" strokeWidth="2" strokeLinejoin="round"/><path d="M 45 72 Q 50 76 55 72" fill="none" stroke="#111" strokeWidth="2" strokeLinecap="round"/><path d="M 15 55 L 28 58 M 12 62 L 26 63" stroke="#111" strokeWidth="2" strokeLinecap="round"/><path d="M 85 55 L 72 58 M 88 62 L 74 63" stroke="#111" strokeWidth="2" strokeLinecap="round"/></svg>);
const PandaAvatar = ({ className }) => (<svg viewBox="0 0 100 100" className={className}><circle cx="22" cy="25" r="14" fill="#111" stroke="#111" strokeWidth="3"/><circle cx="78" cy="25" r="14" fill="#111" stroke="#111" strokeWidth="3"/><circle cx="50" cy="55" r="38" fill="#FFF" stroke="#111" strokeWidth="3"/><ellipse cx="32" cy="52" rx="12" ry="16" transform="rotate(-25 32 52)" fill="#111"/><ellipse cx="68" cy="52" rx="12" ry="16" transform="rotate(25 68 52)" fill="#111"/><circle cx="32" cy="48" r="4" fill="#FFF"/><circle cx="30" cy="46" r="1.5" fill="#FFF"/><circle cx="68" cy="48" r="4" fill="#FFF"/><circle cx="66" cy="46" r="1.5" fill="#FFF"/><ellipse cx="50" cy="68" rx="7" ry="4" fill="#111"/><path d="M 44 76 Q 50 80 56 76" fill="none" stroke="#111" strokeWidth="3" strokeLinecap="round"/></svg>);
const FoxAvatar = ({ className }) => (<svg viewBox="0 0 100 100" className={className}><path d="M 25 55 L 10 15 L 45 35 Z" fill="#EA580C" stroke="#111" strokeWidth="3" strokeLinejoin="round"/><path d="M 75 55 L 90 15 L 55 35 Z" fill="#EA580C" stroke="#111" strokeWidth="3" strokeLinejoin="round"/><path d="M 23 45 L 17 22 L 35 34 Z" fill="#FDBA74"/><path d="M 77 45 L 83 22 L 65 34 Z" fill="#FDBA74"/><path d="M 12 55 Q 50 105 88 55 Q 50 25 12 55 Z" fill="#EA580C" stroke="#111" strokeWidth="3" strokeLinejoin="round"/><path d="M 12 55 Q 50 100 50 75 Q 30 65 12 55 Z" fill="#FFF" strokeLinejoin="round"/><path d="M 88 55 Q 50 100 50 75 Q 70 65 88 55 Z" fill="#FFF" strokeLinejoin="round"/><circle cx="35" cy="50" r="5" fill="#111"/><circle cx="33" cy="48" r="1.5" fill="#FFF"/><circle cx="65" cy="50" r="5" fill="#111"/><circle cx="63" cy="48" r="1.5" fill="#FFF"/><circle cx="50" cy="72" r="5" fill="#111"/></svg>);
const BearAvatar = ({ className }) => (<svg viewBox="0 0 100 100" className={className}><circle cx="25" cy="30" r="15" fill="#8B5A2B" stroke="#111" strokeWidth="3"/><circle cx="75" cy="30" r="15" fill="#8B5A2B" stroke="#111" strokeWidth="3"/><circle cx="25" cy="30" r="8" fill="#D2B48C"/><circle cx="75" cy="30" r="8" fill="#D2B48C"/><circle cx="50" cy="60" r="35" fill="#8B5A2B" stroke="#111" strokeWidth="3"/><circle cx="50" cy="70" r="16" fill="#D2B48C" stroke="#111" strokeWidth="3"/><circle cx="35" cy="50" r="4.5" fill="#111"/><circle cx="33" cy="48" r="1.5" fill="#FFF"/><circle cx="65" cy="50" r="4.5" fill="#111"/><circle cx="63" cy="48" r="1.5" fill="#FFF"/><ellipse cx="50" cy="65" rx="7" ry="4" fill="#111"/><path d="M 45 74 Q 50 78 55 74" fill="none" stroke="#111" strokeWidth="3" strokeLinecap="round"/></svg>);
const RabbitAvatar = ({ className }) => (<svg viewBox="0 0 100 100" className={className}><ellipse cx="35" cy="30" rx="10" ry="25" transform="rotate(-15 35 30)" fill="#E2E8F0" stroke="#111" strokeWidth="3"/><ellipse cx="65" cy="30" rx="10" ry="25" transform="rotate(15 65 30)" fill="#E2E8F0" stroke="#111" strokeWidth="3"/><ellipse cx="35" cy="30" rx="4" ry="18" transform="rotate(-15 35 30)" fill="#FBCFE8"/><ellipse cx="65" cy="30" rx="4" ry="18" transform="rotate(15 65 30)" fill="#FBCFE8"/><ellipse cx="50" cy="65" rx="35" ry="28" fill="#E2E8F0" stroke="#111" strokeWidth="3"/><circle cx="35" cy="60" r="5" fill="#111"/><circle cx="33" cy="58" r="1.5" fill="#FFF"/><circle cx="65" cy="60" r="5" fill="#111"/><circle cx="63" cy="58" r="1.5" fill="#FFF"/><ellipse cx="50" cy="68" rx="4" ry="3" fill="#F472B6"/><path d="M 45 75 Q 50 78 55 75" fill="none" stroke="#111" strokeWidth="2" strokeLinecap="round"/></svg>);
const FrogAvatar = ({ className }) => (<svg viewBox="0 0 100 100" className={className}><circle cx="30" cy="35" r="14" fill="#22C55E" stroke="#111" strokeWidth="3"/><circle cx="70" cy="35" r="14" fill="#22C55E" stroke="#111" strokeWidth="3"/><circle cx="30" cy="35" r="8" fill="#FFF" stroke="#111" strokeWidth="2"/><circle cx="70" cy="35" r="8" fill="#FFF" stroke="#111" strokeWidth="2"/><circle cx="32" cy="35" r="4" fill="#111"/><circle cx="72" cy="35" r="4" fill="#111"/><circle cx="33" cy="34" r="1.5" fill="#FFF"/><circle cx="73" cy="34" r="1.5" fill="#FFF"/><ellipse cx="50" cy="65" rx="40" ry="28" fill="#22C55E" stroke="#111" strokeWidth="3"/><path d="M 25 65 Q 50 85 75 65" fill="none" stroke="#111" strokeWidth="3" strokeLinecap="round"/><ellipse cx="20" cy="65" rx="4" ry="2" fill="#16A34A"/><ellipse cx="80" cy="65" rx="4" ry="2" fill="#16A34A"/></svg>);

const avatarsList = [
  { id: 'shiba', name: 'Shiba', Component: ShibaAvatar, bgColor: 'bg-yellow-200' },
  { id: 'husky', name: 'Husky', Component: HuskyAvatar, bgColor: 'bg-blue-200' },
  { id: 'pug', name: 'Pug', Component: PugAvatar, bgColor: 'bg-green-200' },
  { id: 'golden', name: 'Golden', Component: GoldenAvatar, bgColor: 'bg-orange-200' },
  { id: 'cat', name: 'Mèo', Component: CatAvatar, bgColor: 'bg-pink-200' },
  { id: 'panda', name: 'Gấu Trúc', Component: PandaAvatar, bgColor: 'bg-purple-200' },
  { id: 'fox', name: 'Cáo', Component: FoxAvatar, bgColor: 'bg-red-200' },
  { id: 'bear', name: 'Gấu Nâu', Component: BearAvatar, bgColor: 'bg-amber-200' },
  { id: 'rabbit', name: 'Thỏ Trắng', Component: RabbitAvatar, bgColor: 'bg-slate-200' },
  { id: 'frog', name: 'Ếch Xanh', Component: FrogAvatar, bgColor: 'bg-emerald-200' }
];

const renderAvatar = (customId, photoUrl, sizeClass = "w-12 h-12") => {
  const avt = avatarsList.find(a => a.id === customId);
  if (avt) {
      return (
        <div className={`${sizeClass} rounded-full flex items-center justify-center flex-shrink-0 ${avt.bgColor} border-2 border-white/10 overflow-hidden shadow-lg`}>
          <avt.Component className="w-[85%] h-[85%] object-contain drop-shadow-sm" />
        </div>
      );
  }
  return <img src={photoUrl} alt="avt" className={`${sizeClass} rounded-full border-2 border-white/10 object-cover shrink-0 shadow-lg`} referrerPolicy="no-referrer" />;
};

const CATEGORIES = [
  { name: 'Hoạt Hình', slug: 'hoat-hinh', type: 'the-loai' },
  { name: 'Hành Động', slug: 'hanh-dong', type: 'the-loai' },
  { name: 'Tình Cảm', slug: 'tinh-cam', type: 'the-loai' },
  { name: 'Hài Hước', slug: 'hai-huoc', type: 'the-loai' },
  { name: 'Cổ Trang', slug: 'co-trang', type: 'the-loai' },
  { name: 'Tâm Lý', slug: 'tam-ly', type: 'the-loai' },
  { name: 'Hình Sự', slug: 'hinh-su', type: 'the-loai' },
  { name: 'Chiến Tranh', slug: 'chien-tranh', type: 'the-loai' },
  { name: 'Thể Thao', slug: 'the-thao', type: 'the-loai' },
  { name: 'Võ Thuật', slug: 'vo-thuat', type: 'the-loai' },
  { name: 'Viễn Tưởng', slug: 'vien-tuong', type: 'the-loai' },
  { name: 'Phiêu Lưu', slug: 'phieu-luu', type: 'the-loai' },
  { name: 'Khoa Học', slug: 'khoa-hoc', type: 'the-loai' },
  { name: 'Kinh Dị', slug: 'kinh-di', type: 'the-loai' }
];

const getMovieGenres = (m) => {
    if (!m) return "Đang cập nhật";
    const cats = m.category || m.categories || m.v1_category || [];
    if (Array.isArray(cats) && cats.length > 0) {
        return cats.map(c => typeof c === 'object' ? (c.name || "") : c).filter(Boolean).join(', ');
    }
    return "Phim Mới";
};

/* =========================
   WATCH ROOM ROOT
========================= */

export default function WatchPartyRoom({ roomId, slug, user, navigate }) {
  const [roomData, setRoomData] = useState(null);
  
  const [isHostState, setIsHostState] = useState(null);

  const [messages, setMessages] = useState([]); 
  const [onlineUsers, setOnlineUsers] = useState([]); 
  const [myAvatarId, setMyAvatarId] = useState(null);
  
  const [movieData, setMovieData] = useState(null);
  const [ep, setEp] = useState(null);
  
  const [loadingPage, setLoadingPage] = useState(true);
  const [loadingPlayer, setLoadingPlayer] = useState(true);
  const [isLoadingMedia, setIsLoadingMedia] = useState(true); // Thêm state quản lý loading media

  const [roomClosed, setRoomClosed] = useState(false);
  
  const [showHostLeftPopup, setShowHostLeftPopup] = useState(false);
  const [isInitialSyncing, setIsInitialSyncing] = useState(true); 

  const [showMovieModal, setShowMovieModal] = useState(false);
  const [modalCat, setModalCat] = useState(CATEGORIES[0]);
  const [modalSearchTerm, setModalSearchTerm] = useState("");
  const [modalMovies, setModalMovies] = useState([]);
  const [isFetchingModal, setIsFetchingModal] = useState(false);
  
  const [hostConfirmRequest, setHostConfirmRequest] = useState(null); 
  const [hostConfirmEpRequest, setHostConfirmEpRequest] = useState(null);

  const [chatInput, setChatInput] = useState(""); 

  const isWritingRef = useRef(false);
  const channelRef = useRef(null); 

  const [modalPage, setModalPage] = useState(1);
  const [modalHasMore, setModalHasMore] = useState(false);
  const [isLoadingMoreModal, setIsLoadingMoreModal] = useState(false);
  const observerTarget = useRef(null);

  const [showEpModal, setShowEpModal] = useState(false); // Modal popup chọn tập
  const [epChunkIndex, setEpChunkIndex] = useState(0);
  const [currentEpIndex, setCurrentEpIndex] = useState(0);

  const epScrollRef = useRef(null);
  const [isDraggingEp, setIsDraggingEp] = useState(false);
  const [startXEp, setStartXEp] = useState(0);
  const [scrollLeftEp, setScrollLeftEp] = useState(0);

  const handleMouseDownEp = (e) => { setIsDraggingEp(true); setStartXEp(e.pageX - epScrollRef.current.offsetLeft); setScrollLeftEp(epScrollRef.current.scrollLeft); };
  const handleMouseLeaveEp = () => setIsDraggingEp(false);
  const handleMouseUpEp = () => setIsDraggingEp(false);
  const handleMouseMoveEp = (e) => { if (!isDraggingEp) return; e.preventDefault(); const x = e.pageX - epScrollRef.current.offsetLeft; epScrollRef.current.scrollLeft = scrollLeftEp - (x - startXEp) * 2; };

  const catScrollRef = useRef(null);
  const [isDraggingCat, setIsDraggingCat] = useState(false);
  const [startXCat, setStartXCat] = useState(0);
  const [scrollLeftCat, setScrollLeftCat] = useState(0);

  const handleMouseDownCat = (e) => { setIsDraggingCat(true); setStartXCat(e.pageX - catScrollRef.current.offsetLeft); setScrollLeftCat(catScrollRef.current.scrollLeft); };
  const handleMouseLeaveCat = () => setIsDraggingCat(false);
  const handleMouseUpCat = () => setIsDraggingCat(false);
  const handleMouseMoveCat = (e) => { if (!isDraggingCat) return; e.preventDefault(); const x = e.pageX - catScrollRef.current.offsetLeft; catScrollRef.current.scrollLeft = scrollLeftCat - (x - startXCat) * 2; };

  const artRef = useRef(null);
  const artInstanceRef = useRef(null);
  const containerRef = useRef(null);
  const messagesEndRef = useRef(null);
  
  const isHostRef = useRef(false);
  const safeToDeleteRef = useRef(false);
  const isChangingMovieRef = useRef(false); 
  const hasAutoOpenedModal = useRef(false);
  const currentSlugRef = useRef(slug);
  const roomDataRef = useRef(null);

  const navigateRef = useRef(navigate);
  useEffect(() => { navigateRef.current = navigate; }, [navigate]);

  useEffect(() => {
    if (!user) {
      navigateRef.current({ type: 'watch-party-lobby' });
    }
  }, [user]);

  useEffect(() => { currentSlugRef.current = slug; }, [slug]);
  useEffect(() => { roomDataRef.current = roomData; }, [roomData]);

  // BẮT PHÍM TẮT
  useEffect(() => {
    const handleKeyDown = (e) => {
        const art = artInstanceRef.current;
        if (!art) return;
        if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
        const isHost = isHostRef.current;
        switch(e.key.toLowerCase()) {
            case 'f': e.preventDefault(); art.fullscreen = !art.fullscreen; break;
            case ' ': e.preventDefault(); if (isHost) { art.toggle(); } else { if (art.video) { if (art.video.paused) art.video.play().catch(()=>{}); if (art.video.muted) art.video.muted = false; } } break;
            case 'arrowright': if (isHost) { e.preventDefault(); art.seek = art.currentTime + 5; } break;
            case 'arrowleft': if (isHost) { e.preventDefault(); art.seek = Math.max(0, art.currentTime - 5); } break;
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // LẤY AVATAR
  useEffect(() => {
    if (!user?.uid) return;
    supabase.from('profiles').select('avatar').eq('user_id', user.uid).single().then(({data}) => {
        if (data && data.avatar) setMyAvatarId(data.avatar);
    });
  }, [user?.uid]);

  // CẬP NHẬT TRẠNG THÁI LOADING KHI CHUYỂN TẬP
  useEffect(() => {
    setIsLoadingMedia(true);
  }, [ep?.link_m3u8]);

  // LOAD DATA PHIM (GIỮ NGUYÊN LOGIC GỐC, KHÔNG THÊM LỆNH XÓA STATE NÀO CẢ)
  useEffect(() => {
    let isMounted = true;
    if (slug === "dang-chon-phim") { setLoadingPage(false); setLoadingPlayer(false); setIsLoadingMedia(false); return; }
    
    setEp(null);
    if (artInstanceRef.current) {
        try { 
            artInstanceRef.current.pause();
            if (artInstanceRef.current.hls) artInstanceRef.current.hls.destroy();
            artInstanceRef.current.destroy(false); 
        } catch(e){}
        artInstanceRef.current = null;
    }
    if (artRef.current) {
        artRef.current.innerHTML = '';
    }

    const fetchMovieData = async () => {
        setLoadingPage(true); setLoadingPlayer(true); 
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000);
            const res = await fetch(`${API}/phim/${slug}`, { signal: controller.signal }).then(r => r.json());
            clearTimeout(timeoutId);
            
            let oItem = res?.status || res?.item ? (res.item || res.data?.item) : null;
            if (!isMounted) return;
            if (!oItem) {
                alert("Phim này hiện chưa hỗ trợ! Vui lòng chọn phim khác.");
                return navigateRef.current({ type: 'watch-party-lobby' });
            }
            
            setMovieData(oItem);
            setLoadingPage(false); 
            setLoadingPlayer(false); 
            isChangingMovieRef.current = false; 
        } catch (e) {
            if (isMounted) { navigateRef.current({ type: 'watch-party-lobby' }); }
        }
    };
    fetchMovieData();
    return () => { isMounted = false; };
  }, [slug]); 

  // ĐỒNG BỘ TẬP PHIM
  useEffect(() => {
     if (!movieData || !roomData) return;
     const epList = movieData?.episodes?.[0]?.server_data || movieData?.episodes?.[0]?.items || [];
     const rIndex = roomData.epIndex || 0; 
     
     if (epList[rIndex] && (currentEpIndex !== rIndex || !ep)) {
         setCurrentEpIndex(rIndex);
         const targetEp = epList[rIndex];
         setEp({ name: targetEp.name, link_m3u8: targetEp.link_m3u8 || targetEp.m3u8 || targetEp.m3u8_url || "" });
     }
  }, [roomData?.epIndex, movieData, ep]); 

  // KHỞI TẠO PLAYER (CHỈ THÊM CUSTOM NÚT F VÀ GIỮ NGUYÊN CẤU HÌNH GỐC CỦA SẾP)
  useEffect(() => {
    if (!ep?.link_m3u8 || !artRef.current || isHostState === null) return; 

    if (artInstanceRef.current) {
        try { 
            artInstanceRef.current.pause();
            if (artInstanceRef.current.hls) artInstanceRef.current.hls.destroy();
            artInstanceRef.current.destroy(false); 
        } catch(e){}
        artInstanceRef.current = null;
    }
    if (artRef.current) {
        artRef.current.innerHTML = '';
    }
    
    const isHost = isHostState;
    const customControls = [];
    if (isHost) {
        customControls.push({
          position: 'left', index: 10,
          html: `<svg style="width:20px;height:20px;color:white;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 19 2 12 11 5 11 19"></polygon><polygon points="22 19 13 12 22 5 22 19"></polygon></svg>`,
          tooltip: 'Tua lùi 10s', click: () => artInstanceRef.current && (artInstanceRef.current.seek = Math.max(0, artInstanceRef.current.currentTime - 10))
        }, {
          position: 'left', index: 11,
          html: `<svg style="width:20px;height:20px;color:white;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 19 22 12 13 5 13 19"></polygon><polygon points="2 19 11 12 2 5 2 19"></polygon></svg>`,
          tooltip: 'Tua tới 10s', click: () => artInstanceRef.current && (artInstanceRef.current.seek = artInstanceRef.current.currentTime + 10)
        });
    }

    // ĐÂY LÀ NÚT FULLSCREEN NATIVE CHẾ TỪ ĐẦU, BÂY GIỜ ĐÃ CÓ CSS BÓP LẠI ĐỂ HIỆN RA
    customControls.push({
      position: 'right',
      index: 90,
      html: `<svg style="width:20px;height:20px;color:white;margin-right:10px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path></svg>`,
      tooltip: 'Toàn màn hình',
      click: function () {
        if (artInstanceRef.current) {
          if (artInstanceRef.current.fullscreen) {
            artInstanceRef.current.fullscreen = false; 
            if (window.screen && window.screen.orientation && window.screen.orientation.unlock) {
              window.screen.orientation.unlock(); 
            }
          } else {
            artInstanceRef.current.fullscreen = true; 
            if (window.screen && window.screen.orientation && window.screen.orientation.lock) {
              window.screen.orientation.lock("landscape").catch(() => {});
            }
          }
        }
      }
    });

    // GIỮ NGUYÊN CẤU HÌNH PLAYER NHƯ BẢN GỐC CỦA SẾP
    const art = new Artplayer({
      container: artRef.current, url: ep.link_m3u8, volume: 1, isLive: false, muted: false, autoplay: false, pip: true, airplay: true, fullscreen: false, fullscreenWeb: false, setting: true,
      playbackRate: isHost, hotkey: false, backdrop: isHost, theme: '#E50914', lang: 'vi', lock: false, 
      i18n: { 'vi': { 'Play': 'Phát', 'Pause': 'Tạm dừng', 'Settings': 'Cài đặt', 'Speed': 'Tốc độ', 'Quality': 'Chất lượng', 'Auto': 'Tự động' } },
      controls: customControls,
      plugins: [ function (art) { art.on('ready', () => { if (!isHost && art.template.$playAndPause) art.template.$playAndPause.style.display = 'none'; }); } ],
      customType: {
        m3u8: function (video, url, artObj) {
          if (Hls.isSupported()) {
            if (artObj.hls) artObj.hls.destroy();
            const hls = new Hls({ enableWorker: true, backBufferLength: 30 });
            artObj.hls = hls;
            hls.loadSource(url); 
            hls.attachMedia(video); 
            
            hls.on(Hls.Events.ERROR, function (event, data) {
                if (data.fatal) {
                    setIsLoadingMedia(false); // Bỏ loading nếu lỗi
                    if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
                        artObj.notice.show = "Lỗi CORS / Mạng. Cài Extention 'Allow CORS' để test trên localhost!";
                    } else {
                        hls.destroy();
                    }
                }
            });

            // Lược bỏ cài đặt Chất Lượng (Quality) vì Watch Party cần ưu tiên tốc độ stream
            hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {});
          } else if (video.canPlayType('application/vnd.apple.mpegurl')) { video.src = url; }
        },
      },
    });
    artInstanceRef.current = art;

    art.on('video:waiting', () => setIsLoadingMedia(true));
    art.on('video:canplay', () => setIsLoadingMedia(false));
    art.on('video:playing', () => setIsLoadingMedia(false));

    if (isHost) {
        let syncTimeout;
        const syncHost = (eventType, forcePlayingState = null, isBuffering = false) => {
            clearTimeout(syncTimeout);
            syncTimeout = setTimeout(() => {
                channelRef.current?.send({ type: 'broadcast', event: 'sync_player', payload: { movieId: currentSlugRef.current, isPlaying: forcePlayingState !== null ? forcePlayingState : art.playing, isBuffering, currentTime: art.currentTime, updatedAt: Date.now(), action: eventType } });
            }, 150); 
        };
        art.on('video:play', () => syncHost('play', true, false)); art.on('video:pause', () => syncHost('pause', false, false)); art.on('video:seeked', () => syncHost('seeked', null, false));
        art.on('video:waiting', () => syncHost('waiting', false, true)); art.on('video:playing', () => syncHost('playing', true, false));
    }
    
    return () => { 
      if (artInstanceRef.current) { 
        try { 
            artInstanceRef.current.pause();
            if (artInstanceRef.current.hls) artInstanceRef.current.hls.destroy(); 
            artInstanceRef.current.destroy(false); 
        } catch(e){}
        artInstanceRef.current = null; 
      }
      if (artRef.current) {
          artRef.current.innerHTML = '';
      }
    };
  }, [ep?.link_m3u8, roomId, isHostState]);

  // ĐỒNG BỘ: HOST LIÊN TỤC PING TRẠNG THÁI CHO NHỮNG NGƯỜI VÀO SAU
  useEffect(() => {
      if (!isHostState) return;

      const pingInterval = setInterval(() => {
          const art = artInstanceRef.current;
          if (art && channelRef.current) {
              channelRef.current.send({
                  type: 'broadcast',
                  event: 'sync_player',
                  payload: {
                      movieId: currentSlugRef.current,
                      isPlaying: art.playing,
                      isBuffering: false,
                      currentTime: art.currentTime,
                      updatedAt: Date.now(),
                      action: 'ping'
                  }
              });
          }
      }, 3000); 

      return () => clearInterval(pingInterval);
  }, [isHostState, roomId]);

  // TỐI ƯU HÓA: CƠ CHẾ ĐỒNG BỘ MƯỢT MÀ CHO VIEWER (KHÔNG TỐN DATA SUPABASE)
  useEffect(() => {
    const syncInterval = setInterval(() => {
        if (isHostRef.current) return; 
        const art = artInstanceRef.current; if (!art || !art.video) return;
        const video = art.video; const rData = roomDataRef.current;
        if (!rData || rData.movieId !== currentSlugRef.current) return;

        // Nếu video chưa sẵn sàng nhưng host đang play -> Mute và ép play để lách luật trình duyệt
        if (video.readyState === 0 && rData.isPlaying) {
            video.muted = true;
            video.play().catch(()=>{});
            return;
        }

        // Host Pause -> Viewer cũng Pause và ép sát thời gian
        if (!rData.isPlaying || rData.isBuffering) { 
            if (!video.paused) video.pause(); 
            // Ép sát thời gian ngay khi Pause (giảm mức chịu đựng từ 1.5 xuống 0.5s)
            if (Math.abs(rData.currentTime - video.currentTime) > 0.5) video.currentTime = rData.currentTime; 
            return; 
        }
        
        // Host ĐANG PLAY: Tính toán thời gian thực tế của Host
        let expectedTime = rData.currentTime || 0; 
        if (rData.updatedAt && rData.isPlaying) {
            expectedTime += (Date.now() - rData.updatedAt) / 1000;
        }

        const diff = expectedTime - video.currentTime;

        if (video.paused) { 
            // Nếu Viewer đang bị pause, nhảy tới thời gian hiện tại và Play
            video.currentTime = expectedTime;
            const playPromise = video.play();
            if (playPromise !== undefined) {
                playPromise.then(() => { 
                    if (isInitialSyncing && art.notice) art.notice.show = "Đã đồng bộ Live!"; 
                    if (isInitialSyncing) setIsInitialSyncing(false); 
                }).catch(()=>{
                    // Bị trình duyệt chặn AutoPlay (thiếu gesture) -> Mute r play
                    video.muted = true;
                    video.play().catch(()=>{});
                });
            }
        } else {
            // Giảm độ trễ nhảy cóc từ 3 giây xuống 1.5 giây
            if (Math.abs(diff) > 1.5) { 
                video.currentTime = expectedTime; 
            } 
            if (isInitialSyncing) setIsInitialSyncing(false);
        }
    }, 800); 
    return () => clearInterval(syncInterval);
  }, [slug, isInitialSyncing]);

  useEffect(() => {
    if (!roomId || !user?.uid) return;
    const roomChannel = supabase.channel(`room_${roomId}`, { config: { presence: { key: user.uid } } });
    channelRef.current = roomChannel;

    roomChannel
      .on('broadcast', { event: 'sync_player' }, (payload) => { if (!isHostRef.current) roomDataRef.current = { ...roomDataRef.current, ...payload.payload }; })
      .on('broadcast', { event: 'new_message' }, (payload) => { setMessages(prev => [...prev, payload.payload]); })
      .on('presence', { event: 'sync' }, () => {
          const newState = roomChannel.presenceState();
          const users = [];
          for (const uid in newState) {
              if (newState[uid][0]) users.push({ uid, ...newState[uid][0] });
          }
          setOnlineUsers(users); 
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
          if (newPresences[0]) {
              const joinMsg = { id: `join_${key}_${Date.now()}`, isSystem: true, text: `${newPresences[0].name} đã tham gia phòng.` };
              setMessages(prev => [...prev, joinMsg]); 
          }
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
          if (leftPresences[0]) {
              const leaveMsg = { id: `leave_${key}_${Date.now()}`, isSystem: true, text: `${leftPresences[0].name} đã rời phòng.` };
              setMessages(prev => [...prev, leaveMsg]); 
          }
      });

    roomChannel
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` }, (payload) => {
          const data = payload.new;
          const mappedData = { ...data, movieId: data.movie_id, epIndex: data.ep_index, isPlaying: data.is_playing, currentTime: data.current_time, hostId: data.host_id, hostName: data.host_name, isPublic: data.is_public };
          setRoomData(mappedData);
          if (data.movie_id && data.movie_id !== currentSlugRef.current) { isChangingMovieRef.current = true; navigateRef.current({ type: 'watch-room', roomId, slug: data.movie_id }); }
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` }, () => {
          if (!isHostRef.current) { setRoomClosed(true); setShowHostLeftPopup(true); } else { navigateRef.current({ type: 'watch-party-lobby' }); }
      })
      .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
              const { data } = await supabase.from('profiles').select('avatar').eq('user_id', user.uid).single();
              const avatarId = data ? data.avatar : null;
              await roomChannel.track({
                  name: user.displayName || user.email?.split('@')[0] || "Khách",
                  avatar: user.photoURL,
                  customAvatarId: avatarId,
                  onlineAt: new Date().toISOString()
              });
          }
      });

    const fetchInitialRoom = async () => {
        const { data } = await supabase.from('rooms').select('*').eq('id', roomId).single();
        if (data) {
            const mappedData = { ...data, movieId: data.movie_id, epIndex: data.ep_index, isPlaying: data.is_playing, currentTime: data.current_time, hostId: data.host_id, hostName: data.host_name };
            
            isHostRef.current = mappedData.hostId === user.uid; 
            setIsHostState(mappedData.hostId === user.uid); 

            roomDataRef.current = mappedData;
            setRoomData(mappedData); 
            if (currentSlugRef.current === "dang-chon-phim" && mappedData.hostId === user.uid && !hasAutoOpenedModal.current) { setShowMovieModal(true); hasAutoOpenedModal.current = true; }
        } else if (!isHostRef.current) { setRoomClosed(true); setShowHostLeftPopup(true); }
    };
    fetchInitialRoom();

    const strictModeTimer = setTimeout(() => { safeToDeleteRef.current = true; }, 800);
    const destroyRoomInstantly = async () => { if (safeToDeleteRef.current && isHostRef.current && !isChangingMovieRef.current) await supabase.from('rooms').delete().eq('id', roomId); };
    window.addEventListener("beforeunload", destroyRoomInstantly); window.addEventListener("pagehide", destroyRoomInstantly);
    return () => { clearTimeout(strictModeTimer); supabase.removeChannel(roomChannel); window.removeEventListener("beforeunload", destroyRoomInstantly); window.removeEventListener("pagehide", destroyRoomInstantly); destroyRoomInstantly(); };
  }, [roomId, user?.uid]); 

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const getGuaranteedAvatar = async () => {
      if (myAvatarId) return myAvatarId;
      if (user?.uid) {
          const { data } = await supabase.from('profiles').select('avatar').eq('user_id', user.uid).single();
          if (data && data.avatar) {
              setMyAvatarId(data.avatar);
              return data.avatar;
          }
      }
      return null;
  };

  const handleSendChatMessage = async (e) => {
      e.preventDefault();
      if (!chatInput.trim() || !channelRef.current) return;
      
      const { data } = await supabase.from('profiles').select('avatar').eq('user_id', user.uid).single();
      const avatarId = data ? data.avatar : null;
      
      const text = chatInput.trim();
      setChatInput(""); 
      const chatMsg = { 
          id: `chat_${user.uid}_${Date.now()}`, uid: user.uid, text, type: 'chat',
          name: user.displayName || user.email?.split('@')[0] || "Khách", 
          avatar: user.photoURL, customAvatarId: avatarId, createdAt: Date.now() 
      };
      channelRef.current.send({ type: 'broadcast', event: 'new_message', payload: chatMsg });
      setMessages(prev => [...prev, chatMsg]);
  };

  // ==========================================
  // HÀM TẢI PHIM ĐÃ ĐƯỢC TÍCH HỢP TMDB 
  // ==========================================
  const loadModalMovies = async (isSearch = false, pageNum = 1, currentList = []) => {
    if (pageNum === 1) setIsFetchingModal(true); 
    else setIsLoadingMoreModal(true); 
    
    try {
      let fetches = [];
      let isFetchingFromTmdb = false;

      if (isSearch && modalSearchTerm.trim()) {
         const q = encodeURIComponent(modalSearchTerm.trim());
         fetches = [`${API}/tim-kiem?keyword=${q}&page=${pageNum}`];
      } else {
         const { slug, type } = modalCat;
         const lang = `&language=vi&sort_by=popularity.desc&page=${pageNum}`;
         let mGenres = "", tGenres = "", extra = "";

         switch (slug) {
           case "hanh-dong": mGenres = "28"; tGenres = "10759"; break;
           case "tinh-cam": mGenres = "10749"; tGenres = "10768"; break;
           case "kinh-di": mGenres = "27"; tGenres = "9648"; break;
           case "hai-huoc": mGenres = "35"; tGenres = "35"; break;
           case "hoat-hinh": mGenres = "16"; tGenres = "16"; break;
           case "co-trang": mGenres = "36"; tGenres = "10768"; extra = "&with_origin_country=CN|KR|JP"; break;
           case "chien-tranh": mGenres = "10752"; tGenres = "10768"; break;
           case "tam-ly": mGenres = "18"; tGenres = "18"; break;
           case "hinh-su": mGenres = "80"; tGenres = "80"; break;
           case "vien-tuong": mGenres = "878"; tGenres = "10765"; break;
           case "phieu-luu": mGenres = "12"; tGenres = "10759"; break;
           case "khoa-hoc": mGenres = "878"; tGenres = "10765"; break;
           case "vo-thuat": mGenres = "28"; extra = "&with_keywords=779"; break;
           case "the-thao": mGenres = "99"; break;
           default: break;
         }

         if (mGenres || tGenres) {
           isFetchingFromTmdb = true;
           if (mGenres) fetches.push(`${API_TMDB}/discover/movie?with_genres=${mGenres}${extra}${lang}`);
           if (tGenres) fetches.push(`${API_TMDB}/discover/tv?with_genres=${tGenres}${extra}${lang}`);
         } else {
           fetches = [`${API}/${type}/${slug}?page=${pageNum}`];
         }
      }
      
      const results = await Promise.allSettled(
        fetches.map(url => isFetchingFromTmdb ? fetchWithCache(url, 300000) : fetch(url).then(r => r.json()))
      );

      let newItems = [];

      if (isFetchingFromTmdb) {
        let tmdbItems = [];
        results.forEach((res, idx) => {
          if (res.status === "fulfilled" && res.value && res.value.results) {
            const isTv = fetches[idx].includes('/discover/tv');
            const items = res.value.results.map(item => ({ ...item, media_type: item.media_type || (isTv ? "tv" : "movie") }));
            tmdbItems = [...tmdbItems, ...items];
          }
        });

        tmdbItems.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));

        const matchPromises = tmdbItems.map(async (tItem) => {
          const ophimMatch = await matchTmdbToOphim(tItem);
          if (ophimMatch && ophimMatch.slug) {
            let movieName = tItem.title || tItem.name || ophimMatch.name;
            let originName = tItem.original_title || tItem.original_name || ophimMatch.origin_name;
            let releaseYear = tItem.release_date ? tItem.release_date.split("-")[0] : (tItem.first_air_date ? tItem.first_air_date.split("-")[0] : "");

            return {
              ...ophimMatch,
              slug: ophimMatch.slug,
              name: movieName,
              origin_name: originName,
              poster_path: tItem.poster_path,
              poster_url: ophimMatch.poster_url || ophimMatch.thumb_url,
              thumb_url: ophimMatch.thumb_url || ophimMatch.poster_url,
              year: releaseYear,
              tmdb: { ...tItem, poster_path: tItem.poster_path }
            };
          }
          return null;
        });

        const resolvedMatches = await Promise.all(matchPromises);
        newItems = resolvedMatches.filter(Boolean);
      } else {
        results.forEach(res => { 
            if (res.status === 'fulfilled') { 
                const items = res.value?.items || res.value?.data?.items || []; 
                if (Array.isArray(items)) newItems = [...newItems, ...items]; 
            } 
        });
      }
      
      const allRawItems = pageNum === 1 ? newItems : [...currentList, ...newItems];
      const finalList = mergeDuplicateMovies(allRawItems);
      
      setModalMovies(finalList);
      setModalHasMore(newItems.length > 0);

      if (finalList.length < 10 && newItems.length > 0 && pageNum < 10) {
          const nextP = pageNum + 1;
          setModalPage(nextP);
          loadModalMovies(isSearch, nextP, finalList);
          return; 
      }
    } catch(e) { 
        if(pageNum === 1) setModalMovies([]); 
        setModalHasMore(false); 
    }
    setIsFetchingModal(false); 
    setIsLoadingMoreModal(false);
  };

  useEffect(() => { 
      if (showMovieModal) { 
          setModalPage(1); 
          loadModalMovies(!!modalSearchTerm, 1, []); 
      } 
  }, [showMovieModal, modalCat]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && modalHasMore && !isFetchingModal && !isLoadingMoreModal) {
          const nextPage = modalPage + 1;
          setModalPage(nextPage);
          loadModalMovies(!!modalSearchTerm, nextPage, modalMovies);
        }
      },
      { threshold: 0.1 }
    );
    if (observerTarget.current) observer.observe(observerTarget.current);
    return () => { if (observerTarget.current) observer.unobserve(observerTarget.current); };
  }, [modalHasMore, isFetchingModal, isLoadingMoreModal, modalPage, modalSearchTerm, modalMovies]);

  const handleSelectMovie = async (m) => {
    if (isWritingRef.current) return; isWritingRef.current = true; setShowMovieModal(false);
    try {
        if (isHostRef.current) {
            isChangingMovieRef.current = true;
            await supabase.from('rooms').update({ movie_id: m.slug, current_time: 0, is_playing: false, ep_index: 0, updated_at: new Date().toISOString() }).eq('id', roomId);
            if (currentSlugRef.current !== "dang-chon-phim") {
                const msg = { id: Date.now().toString(), isSystem: true, text: `Chủ phòng đổi phim: ${m.name}` };
                channelRef.current?.send({ type: 'broadcast', event: 'new_message', payload: msg });
                setMessages(prev => [...prev, msg]);
            }
            navigateRef.current({ type: 'watch-room', roomId, slug: m.slug }); 
        } else {
            const genres = getMovieGenres(m); const finalAvatar = await getGuaranteedAvatar(); 
            const poster = getImg(m.poster_url || m.thumb_url);
            const reqMsg = { id: Date.now().toString(), uid: user.uid, name: user.displayName || "Khách", avatar: user.photoURL, customAvatarId: finalAvatar, text: `Yêu cầu đổi phim:`, type: 'request_movie', requestMovieSlug: m.slug, requestMovieName: m.name, requestMoviePoster: poster, movieItem: m, requestMovieOrigin: m.origin_name || m.original_name || "", requestMovieGenre: genres, createdAt: Date.now() };
            channelRef.current?.send({ type: 'broadcast', event: 'new_message', payload: reqMsg }); setMessages(prev => [...prev, reqMsg]);
        }
    } catch (e) {} finally { setTimeout(() => { isWritingRef.current = false; }, 1000); }
  };

  const executeHostChangeMovie = async () => {
     if (!hostConfirmRequest || isWritingRef.current) return; isWritingRef.current = true; isChangingMovieRef.current = true;
     const { slug: newSlug, name: newName } = hostConfirmRequest; setHostConfirmRequest(null);
     try {
         await supabase.from('rooms').update({ movie_id: newSlug, current_time: 0, is_playing: false, ep_index: 0, updated_at: new Date().toISOString() }).eq('id', roomId);
         if (currentSlugRef.current !== "dang-chon-phim") {
            const msg = { id: Date.now().toString(), isSystem: true, text: `Chủ phòng đổi phim: ${newName}` };
            channelRef.current?.send({ type: 'broadcast', event: 'new_message', payload: msg }); setMessages(prev => [...prev, msg]);
         }
         navigateRef.current({ type: 'watch-room', roomId, slug: newSlug }); 
     } catch (e) {} finally { setTimeout(() => { isWritingRef.current = false; }, 1000); }
  };

  const handleSelectEpisode = async (index, epItem) => {
    if (isWritingRef.current) return; isWritingRef.current = true; setShowEpModal(false);
    try {
        if (isHostRef.current) {
            await supabase.from('rooms').update({ ep_index: index, current_time: 0, is_playing: false, updated_at: new Date().toISOString() }).eq('id', roomId);
            const msg = { id: Date.now().toString(), isSystem: true, text: `Chủ phòng đổi Tập ${epItem.name.replace(/tập\s*/i, '')}` };
            channelRef.current?.send({ type: 'broadcast', event: 'new_message', payload: msg }); setMessages(prev => [...prev, msg]);
        } else {
            const finalAvatar = await getGuaranteedAvatar(); 
            const reqMsg = { id: Date.now().toString(), uid: user.uid, name: user.displayName || "Khách", avatar: user.photoURL, customAvatarId: finalAvatar, text: `Yêu cầu đổi tập:`, type: 'request_ep', requestEpIndex: index, requestEpName: epItem.name.replace(/tập\s*/i, ''), createdAt: Date.now() };
            channelRef.current?.send({ type: 'broadcast', event: 'new_message', payload: reqMsg }); setMessages(prev => [...prev, reqMsg]);
        }
    } catch (e) {} finally { setTimeout(() => { isWritingRef.current = false; }, 1000); }
  };

  const executeHostChangeEpisode = async () => {
      if (!hostConfirmEpRequest || isWritingRef.current) return; isWritingRef.current = true;
      const { index, name } = hostConfirmEpRequest; setHostConfirmEpRequest(null);
      try {
          await supabase.from('rooms').update({ ep_index: index, current_time: 0, is_playing: false, updated_at: new Date().toISOString() }).eq('id', roomId);
          const msg = { id: Date.now().toString(), isSystem: true, text: `Chủ phòng đổi Tập ${name}` };
          channelRef.current?.send({ type: 'broadcast', event: 'new_message', payload: msg }); setMessages(prev => [...prev, msg]);
      } catch (e) {} finally { setTimeout(() => { isWritingRef.current = false; }, 1000); }
  };

  const epList = movieData?.episodes?.[0]?.server_data || movieData?.episodes?.[0]?.items || [];
  const chunkSize = 50; const epChunks = [];
  for (let i = 0; i < epList.length; i += chunkSize) epChunks.push(epList.slice(i, i + chunkSize));

  if (loadingPage) return <div className="h-screen w-screen flex justify-center items-center bg-[#050505] overflow-hidden"></div>;

  return (
    <div className="pt-20 md:pt-[88px] pb-4 max-w-[1920px] mx-auto px-2 md:px-4 h-[100dvh] w-full flex flex-col lg:overflow-hidden overflow-y-auto animate-in fade-in duration-500 bg-[#050505] relative text-white">
      
      {!isHostRef.current && ( <style>{`.art-control-playAndPause { display: none !important; } .art-progress { pointer-events: none !important; } .art-video { pointer-events: none !important; }`}</style> )}

      {/* POPUP: HOST THOÁT */}
      {showHostLeftPopup && (
        <div className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-md flex justify-center items-center p-4 animate-in fade-in">
           <div className="bg-[#111] border border-white/10 p-8 rounded-2xl text-center shadow-[0_0_40px_rgba(229,9,20,0.2)]">
              <div className="w-16 h-16 bg-[#E50914]/10 rounded-full flex items-center justify-center mx-auto mb-5">
                 <Icon.MonitorOff size={32} className="text-[#E50914]" />
              </div>
              <h3 className="text-xl font-black uppercase mb-3">Phòng Đã Đóng</h3>
              <p className="text-gray-400 mb-8 text-sm">Chủ phòng đã rời đi hoặc kết thúc phiên xem chung.</p>
              <button onClick={() => navigateRef.current({ type: 'watch-party-lobby' })} className="w-full py-3.5 bg-[#E50914] text-white font-black rounded-xl uppercase text-sm">Về Sảnh</button>
           </div>
        </div>
      )}

      {/* POPUP CHỌN TẬP */}
      {showEpModal && (
        <div className="fixed inset-0 z-[1000] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 transition-opacity duration-300" onClick={() => setShowEpModal(false)}>
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
              {epChunks.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-3 mb-4 border-b border-white/5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  {epChunks.map((chunk, idx) => (
                    <button 
                      key={idx} 
                      onClick={() => setEpChunkIndex(idx)} 
                      className={`shrink-0 px-4 py-2 rounded-lg text-[10px] md:text-xs font-bold uppercase transition-colors ${
                        epChunkIndex === idx 
                        ? "bg-white/10 text-white border border-[#E50914]" 
                        : "text-gray-500 hover:text-gray-300 border border-transparent"
                      }`}
                    >
                      Từ {idx * chunkSize + 1} - {idx * chunkSize + chunk.length}
                    </button>
                  ))}
                </div>
              )}
              <div className="grid grid-cols-5 sm:grid-cols-6 lg:grid-cols-8 gap-2">
                {epChunks[epChunkIndex]?.map((epItem, localIdx) => {
                  const globalIdx = epChunkIndex * chunkSize + localIdx;
                  return (
                    <button 
                      key={globalIdx} 
                      onClick={() => handleSelectEpisode(globalIdx, epItem)} 
                      className={`py-2.5 md:py-3 rounded-md text-xs md:text-sm font-black uppercase transition-all duration-200 ${
                        currentEpIndex === globalIdx 
                        ? "bg-[#E50914] text-white shadow-[0_2px_8px_rgba(229,9,20,0.5)] transform scale-105 z-10" 
                        : "bg-[#1a1a1a] text-gray-400 border border-white/5 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      {epItem.name.replace(/tập\s*/i, '')}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CHỌN PHIM */}
      {showMovieModal && (
        <div className="fixed inset-0 z-[1000] bg-black/95 backdrop-blur-md flex justify-center items-center p-0 md:p-4">
          <div className="bg-[#111] border-0 md:border border-white/10 md:rounded-2xl w-full h-full md:max-w-5xl md:h-[85vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom-5 duration-300">
            
            <div className="p-3 md:p-5 flex justify-between items-center shrink-0 border-b border-white/5 pt-safe-top">
               <div className="flex items-center gap-2 md:gap-3">
                 <Icon.Film size={18} className="text-[#E50914] md:w-5 md:h-5" />
                 <h2 className="text-sm md:text-xl font-black uppercase tracking-widest text-white">{isHostRef.current ? "Chọn Phim Mới" : "Yêu Cầu Đổi Phim"}</h2>
               </div>
               <button onClick={() => setShowMovieModal(false)} className="p-1.5 md:p-2 bg-white/5 hover:bg-white/10 rounded-full transition text-gray-400 hover:text-white"><Icon.X size={18} className="md:w-5 md:h-5"/></button>
            </div>
            
            <div className="p-3 md:p-4 flex flex-col lg:flex-row gap-3 md:gap-4 shrink-0 bg-[#0a0a0a]/50 border-b border-white/5 items-start lg:items-center">
               <form onSubmit={(e) => {e.preventDefault(); setModalPage(1); loadModalMovies(true, 1, []);}} className="relative w-full lg:w-72 shrink-0">
                  <div className="absolute left-3.5 top-0 bottom-0 flex items-center pointer-events-none"><Icon.Search className="text-gray-500" size={14} /></div>
                  <input type="text" value={modalSearchTerm} onChange={(e) => setModalSearchTerm(e.target.value)} placeholder="Tìm theo tên phim..." className="w-full bg-black border border-white/10 rounded-xl py-2.5 pl-9 pr-3 text-sm text-white focus:outline-none focus:border-[#E50914] font-bold tracking-wider" />
               </form>

               <div className="w-full overflow-hidden">
                 <div ref={catScrollRef} onMouseDown={handleMouseDownCat} onMouseLeave={handleMouseLeaveCat} onMouseUp={handleMouseUpCat} onMouseMove={handleMouseMoveCat} className="flex gap-2 overflow-x-auto pb-1 select-none cursor-grab snap-x touch-pan-x [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                   {CATEGORIES.map(cat => (
                     <button key={cat.slug} onClick={() => { setModalCat(cat); setModalSearchTerm(""); }} className={`snap-start px-3 py-1.5 md:px-4 md:py-2.5 text-[10px] md:text-xs font-bold rounded-lg md:rounded-xl uppercase tracking-widest whitespace-nowrap shrink-0 transition-colors ${!modalSearchTerm && modalCat.slug === cat.slug ? 'bg-[#E50914] text-white shadow-[0_0_10px_rgba(229,9,20,0.3)]' : 'bg-white/5 border border-white/5 text-gray-400 hover:bg-white/10 hover:text-white'}`}>{cat.name}</button>
                   ))}
                 </div>
               </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-3 md:p-5 relative [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {isFetchingModal ? <div className="h-full flex items-center justify-center"><Icon.Loader2 className="animate-spin text-[#E50914] md:w-10 md:h-10" size={32}/></div> : (
                 <>
                   <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 md:gap-4">
                      {modalMovies.map((m, idx) => (
                        <div key={`${m.slug}-${idx}`} className="group relative">
                          <MovieCard 
                            m={m} 
                            isRow={false} 
                            onClickOverride={() => handleSelectMovie(m)} 
                          />
                          <div className="absolute inset-0 z-30 bg-black/40 opacity-0 md:group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none rounded-xl">
                            <span className="bg-[#E50914] text-white text-[10px] font-black px-3 py-1.5 rounded-lg uppercase tracking-widest shadow-2xl scale-90 group-hover:scale-100 transition-transform">
                              {isHostRef.current ? "Chọn Phim Này" : "Yêu Cầu Đổi"}
                            </span>
                          </div>
                        </div>
                      ))}
                   </div>
                   
                   {modalHasMore && (
                     <div ref={observerTarget} className="mt-6 md:mt-8 flex justify-center py-6 md:py-8">
                       {isLoadingMoreModal ? (
                         <div className="flex items-center gap-2 text-[#E50914] font-bold uppercase tracking-widest text-xs md:text-sm">
                           <Icon.Loader2 className="animate-spin md:w-6 md:h-6" size={18} /> Đang tải...
                         </div>
                       ) : (
                         <div className="h-10 w-full"></div>
                       )}
                     </div>
                   )}
                 </>
              )}
            </div>

          </div>
        </div>
      )}

      {/* POPUP: CONFIRM YÊU CẦU ĐỔI PHIM */}
      {hostConfirmRequest && (
        <div className="fixed inset-0 z-[1001] bg-black/80 backdrop-blur-sm flex justify-center items-center p-4">
           <div className="bg-[#111] border border-white/10 w-[320px] flex flex-col justify-center items-center p-6 rounded-3xl text-center shadow-[0_0_40px_rgba(229,9,20,0.15)] animate-in zoom-in-95">
              <Icon.HelpCircle size={48} className="text-[#E50914] mx-auto mb-4 drop-shadow-[0_0_10px_rgba(229,9,20,0.5)]" />
              <h3 className="text-xl font-black uppercase tracking-widest mb-2 text-white">Đồng ý yêu cầu?</h3>
              <p className="text-gray-400 text-sm mb-6 flex-1 flex flex-col items-center justify-center">
                Bạn sẽ đổi phòng sang phim:
                <strong className="text-[#E50914] mt-2 block text-base line-clamp-2 leading-tight">{hostConfirmRequest.name}</strong>
              </p>
              <div className="flex gap-3 w-full">
                  <button onClick={() => setHostConfirmRequest(null)} className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white font-black rounded-xl text-xs md:text-sm uppercase transition-colors">Hủy</button>
                  <button onClick={executeHostChangeMovie} className="flex-1 py-3 bg-[#E50914] hover:bg-red-700 text-white font-black rounded-xl text-xs md:text-sm uppercase shadow-lg transition-colors">Đồng Ý</button>
              </div>
           </div>
        </div>
      )}

      {/* POPUP: CONFIRM YÊU CẦU ĐỔI TẬP */}
      {hostConfirmEpRequest && (
        <div className="fixed inset-0 z-[1001] bg-black/80 backdrop-blur-sm flex justify-center items-center p-4">
           <div className="bg-[#111] border border-white/10 w-[320px] flex flex-col justify-center items-center p-6 rounded-3xl text-center shadow-[0_0_40px_rgba(229,9,20,0.15)] animate-in zoom-in-95">
              <Icon.HelpCircle size={48} className="text-[#E50914] mx-auto mb-4 drop-shadow-[0_0_10px_rgba(229,9,20,0.5)]" />
              <h3 className="text-xl font-black uppercase tracking-widest mb-2 text-white">Đồng ý yêu cầu?</h3>
              <p className="text-gray-400 text-sm mb-6 flex-1 flex flex-col items-center justify-center">
                Bạn sẽ chuyển phòng sang:
                <strong className="text-[#E50914] mt-2 block text-base leading-tight">Tập {hostConfirmEpRequest.name}</strong>
              </p>
              <div className="flex gap-3 w-full">
                  <button onClick={() => setHostConfirmEpRequest(null)} className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white font-black rounded-xl text-xs md:text-sm uppercase transition-colors">Hủy</button>
                  <button onClick={executeHostChangeEpisode} className="flex-1 py-3 bg-[#E50914] hover:bg-red-700 text-white font-black rounded-xl text-xs md:text-sm uppercase shadow-lg transition-colors">Đồng Ý</button>
              </div>
           </div>
        </div>
      )}

      {/* MAIN LAYOUT */}
      <div className="flex flex-col lg:grid lg:grid-cols-4 gap-3 md:gap-4 lg:flex-1 lg:min-h-0">
        
        {/* CỘT TRÁI: VIDEO PLAYER */}
        <div className="w-full flex flex-col gap-3 lg:col-span-3 lg:min-h-0 lg:h-full relative shrink-0">
          
          <div className="shrink-0 flex flex-wrap items-center justify-between bg-[#111] p-3 md:px-4 rounded-xl border border-white/5 gap-3 shadow-lg">
            <div className="flex items-center gap-3"><h1 className="text-base md:text-lg font-black uppercase tracking-tighter truncate max-w-[150px] sm:max-w-xs">{roomData?.name || "Đang tải..."}</h1><span className="text-[10px] text-gray-400 bg-white/5 px-2 py-1 rounded-md font-mono border border-white/10 shrink-0">ID: {roomId}</span></div>
            <div className="flex items-center gap-2">
               <button onClick={() => setShowMovieModal(true)} className="px-3 py-1.5 bg-[#E50914]/10 text-[#E50914] hover:bg-[#E50914] hover:text-white text-[10px] md:text-xs font-black rounded-lg uppercase flex items-center gap-2 border border-[#E50914]/20 transition-colors"><Icon.RefreshCcw size={14} /> <span className="hidden sm:inline">{isHostRef.current ? "Đổi Phim" : "Yêu Cầu Đổi Phim"}</span></button>
               <button onClick={async () => { if(isHostRef.current) await supabase.from('rooms').delete().eq('id', roomId); navigateRef.current({type: 'watch-party-lobby'}); }} className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-[10px] md:text-xs font-black rounded-lg uppercase flex items-center gap-2 border border-white/5 transition-colors"><Icon.LogOut size={14} /> <span className="hidden sm:inline">Thoát</span></button>
            </div>
          </div>

          <div ref={containerRef} className="w-full aspect-video lg:aspect-auto lg:flex-1 lg:min-h-0 bg-black rounded-xl overflow-hidden border border-white/5 relative group flex items-center justify-center shadow-2xl">
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
                   padding: 0 4px !important;
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
             
             <div className={`absolute inset-0 z-[150] bg-[#050505] flex flex-col justify-center items-center transition-opacity duration-300 ${isLoadingMedia ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
                <div className="w-12 h-12 md:w-16 md:h-16 border-[4px] border-white/10 border-t-[#E50914] rounded-full animate-spin"></div>
             </div>

             <div ref={artRef} className={`w-full h-full object-contain ${loadingPlayer ? 'opacity-0' : 'opacity-100'}`}></div>
             
             {slug === "dang-chon-phim" && (
                 <div className="absolute inset-0 z-[160] bg-[#111] flex flex-col justify-center items-center">
                     <Icon.Film size={64} className="text-gray-600 mb-4 animate-pulse" />
                     <p className="text-gray-400 font-bold uppercase tracking-widest text-sm text-center px-4">{isHostRef.current ? "Vui lòng chọn phim để bắt đầu!" : "Đang chờ chủ phòng chọn phim..."}</p>
                     {isHostRef.current && <button onClick={() => setShowMovieModal(true)} className="mt-6 bg-[#E50914] hover:bg-red-700 px-8 py-3.5 rounded-xl font-black uppercase tracking-widest text-xs transition shadow-[0_4px_15px_rgba(229,9,20,0.4)]">Chọn Phim Ngay</button>}
                 </div>
             )}
          </div>

          <div className="shrink-0 bg-[#111] p-3 md:px-4 rounded-xl border border-white/5 flex items-center justify-between shadow-lg">
             <div className="min-w-0 pr-4">
                <h2 className="text-sm md:text-base font-black uppercase tracking-tight mb-0.5 line-clamp-1">{movieData?.name || "Chưa chọn phim"}</h2>
                <div className="flex items-center gap-1.5 mt-1">
                   <span className="text-[10px] md:text-xs text-gray-500 uppercase tracking-widest font-bold">Đang phát:</span>
                   {ep?.name && (
                      <button onClick={() => setShowEpModal(true)} className="bg-[#E50914] text-white text-[10px] md:text-xs font-black px-2.5 py-0.5 rounded shadow-[0_2px_10px_rgba(229,9,20,0.3)] hover:scale-105 transition-transform">
                         {safeText(ep.name).replace(/tập\s*/i, '')}
                      </button>
                   )}
                </div>
             </div>
             <div className={`shrink-0 ${isHostRef.current ? 'bg-[#E50914]/10 text-[#E50914]' : 'bg-white/5 text-gray-400'} text-[9px] font-bold uppercase px-2.5 py-1.5 rounded-md border border-current flex items-center gap-1.5`}>
                {isHostRef.current ? <><Icon.Key size={12}/> Host</> : <><Icon.User size={12}/> Viewer</>}
             </div>
          </div>
        </div>

        {/* CỘT PHẢI: KHUNG CHAT VÀ ONLINE */}
        <div className="flex-1 lg:flex-[none] flex flex-col gap-3 md:gap-4 lg:min-h-0 lg:h-full min-h-[400px]">
          
          {/* USER ONLINE */}
          <div className="bg-[#111] p-4 rounded-xl border border-white/5 shadow-2xl shrink-0">
              <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-3">
                  <h3 className="text-xs md:text-sm font-black uppercase tracking-widest flex items-center gap-2"><Icon.Users size={16} className="text-[#E50914]"/> Người xem</h3>
                  <span className="text-xs font-mono font-bold text-gray-400 bg-white/5 px-2 py-1 rounded-md">{onlineUsers.length}</span>
              </div>
              <div className="flex flex-wrap gap-2.5 max-h-24 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  {onlineUsers.map(u => (
                      <div key={u.uid} className="relative group" title={u.name}>
                          {renderAvatar(u.customAvatarId, u.avatar, "w-10 h-10")}
                          <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-[#111]"></span>
                          <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-black text-[10px] font-bold rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition pointer-events-none z-50">
                              {u.name} {u.uid === roomData?.hostId && "(Host)"}
                          </div>
                      </div>
                  ))}
              </div>
          </div>

          {/* CHAT BOX */}
          <div className="bg-[#111] border border-white/5 rounded-xl flex-1 flex flex-col min-h-0 overflow-hidden shadow-2xl">
            <div className="shrink-0 flex items-center justify-center border-b border-white/5 bg-black/20 py-3 md:py-4">
               <h3 className="text-xs md:text-sm font-black uppercase tracking-widest flex items-center gap-2"><Icon.MessageSquareText size={18} className="text-[#E50914]"/> Trò Chuyện</h3>
            </div>
            
            <div className="flex-1 min-h-0 overflow-y-auto p-4 md:p-5 space-y-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {messages.length === 0 && (
                 <div className="h-full flex flex-col items-center justify-center text-gray-600">
                    <Icon.MessageCircle size={40} className="mb-3 opacity-50"/>
                    <span className="text-[10px] font-bold uppercase tracking-wider">Hãy nói gì đó đi...</span>
                 </div>
              )}
              {messages.map((msg) => (
                <div key={msg.id} className={`animate-in fade-in slide-in-from-bottom-2 ${msg.type === 'chat' && msg.uid === user.uid ? 'text-right' : ''}`}>
                  
                  {msg.isSystem && (
                    <div className="flex justify-center my-4">
                        <span className="bg-white/10 text-gray-300 text-[10px] md:text-xs px-5 py-2.5 rounded-full uppercase font-black text-center border border-white/20 shadow-md">
                            {msg.text}
                        </span>
                    </div>
                  )}
                  
                  {msg.type === 'chat' && (
                      <div className={`flex gap-3 items-start ${msg.uid === user.uid ? 'flex-row-reverse' : ''}`}>
                          {msg.uid !== user.uid && renderAvatar(msg.customAvatarId, msg.avatar, "w-8 h-8 shrink-0 mt-0.5")}
                          <div className={`flex flex-col ${msg.uid === user.uid ? 'items-end' : 'items-start'}`}>
                              {msg.uid !== user.uid && <span className="text-xs text-gray-400 font-bold mb-1 mx-1">{msg.name}</span>}
                              <div className={`px-4 py-2.5 rounded-2xl max-w-[250px] text-sm md:text-base ${msg.uid === user.uid ? 'bg-[#E50914] text-white rounded-br-none' : 'bg-[#1a1a1a] text-gray-200 rounded-bl-none border border-white/5'}`}>
                                  {msg.text}
                              </div>
                          </div>
                      </div>
                  )}

                  {(msg.type === 'request_movie' || msg.type === 'request_ep') && (
                      <div className="bg-[#1a1a1a] rounded-xl border border-white/5 overflow-hidden shadow-lg p-3 my-3">
                        <div className="flex items-center gap-3 mb-3 border-b border-white/5 pb-3">
                            {renderAvatar(msg.customAvatarId, msg.avatar, "w-10 h-10")}
                            <div>
                                <span className="text-sm md:text-base font-black text-white uppercase block leading-tight">{msg.name}</span>
                                <span className="text-[10px] md:text-xs text-[#E50914] font-bold uppercase mt-0.5 block">{msg.text}</span>
                            </div>
                        </div>
                        {msg.type === 'request_movie' && (
                            <div className="flex gap-4 items-center mt-2">
                                <div className="w-16 h-24 md:w-[80px] md:h-[120px] bg-black rounded-lg shrink-0 overflow-hidden shadow-md border border-white/10">
                                    <img src={msg.requestMoviePoster} alt="poster" className="w-full h-full object-cover"/>
                                </div>
                                <div className="flex-1 min-w-0 flex flex-col justify-center">
                                    <h4 className="text-sm md:text-base font-black text-white line-clamp-2 leading-snug mb-1">{msg.requestMovieName}</h4>
                                    <p className="text-[10px] md:text-xs text-gray-400 font-bold uppercase truncate mb-2">{msg.requestMovieGenre}</p>
                                    {isHostRef.current && ( <button onClick={() => setHostConfirmRequest({slug: msg.requestMovieSlug, name: msg.requestMovieName})} className="self-start bg-[#E50914] hover:bg-red-700 text-white text-[10px] md:text-xs font-black uppercase py-2 px-4 rounded-lg transition-colors shadow-md">Duyệt</button> )}
                                </div>
                            </div>
                        )}
                        {msg.type === 'request_ep' && (
                            <div className="flex items-center justify-between gap-3 mt-2">
                                <span className="text-sm md:text-base font-black text-white flex items-center gap-2"><Icon.PlaySquare size={20} className="text-[#E50914] md:w-6 md:h-6"/> Tập {msg.requestEpName}</span>
                                {isHostRef.current && ( <button onClick={() => setHostConfirmEpRequest({index: msg.requestEpIndex, name: msg.requestEpName})} className="bg-[#E50914] hover:bg-red-700 text-white text-[10px] md:text-xs font-black uppercase py-2 px-4 rounded-lg shadow-md transition-colors">Duyệt</button> )}
                            </div>
                        )}
                      </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSendChatMessage} className="shrink-0 p-3 md:p-4 border-t border-white/5 bg-black/20 flex gap-2.5 items-center">
                <input 
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Nhập nội dung..."
                    className="flex-1 bg-black border border-white/10 rounded-full px-4 py-2 md:px-5 md:py-2.5 text-xs md:text-sm text-white placeholder:text-gray-600 outline-none focus:border-[#E50914] font-bold transition-colors"
                />
                <button type="submit" disabled={!chatInput.trim()} className="w-9 h-9 md:w-10 md:h-10 shrink-0 bg-[#E50914] hover:bg-red-700 rounded-full flex items-center justify-center text-white disabled:opacity-40 disabled:bg-gray-700 transition active:scale-90 shadow-lg">
                    <Icon.SendHorizontal size={16} className="md:w-[18px] md:h-[18px]" />
                </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}