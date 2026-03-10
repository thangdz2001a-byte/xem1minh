import React, { useState, useEffect, useRef, useMemo } from "react";
import * as Icon from "lucide-react";
import { doc, setDoc, getDoc, onSnapshot, collection, updateDoc, deleteDoc, addDoc, query, orderBy, serverTimestamp } from "firebase/firestore";
import { db } from "../../config/firebase";
import { API, API_NGUONC, API_NGUONC_DETAIL, getImg } from "../../utils/helpers"; 

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

const renderAvatar = (customId, photoUrl, sizeClass = "w-8 h-8") => {
  const avt = avatarsList.find(a => a.id === customId);
  if (avt) {
      return (
        <div className={`${sizeClass} rounded-full flex items-center justify-center flex-shrink-0 ${avt.bgColor} border border-white/10 overflow-hidden shadow-md`}>
          <avt.Component className="w-[85%] h-[85%] object-contain drop-shadow-sm" />
        </div>
      );
  }
  return <img src={photoUrl} alt="avt" className={`${sizeClass} rounded-full border border-white/10 object-cover shrink-0 shadow-md`} referrerPolicy="no-referrer" />;
};

const CATEGORIES = [
  { name: 'Mới Cập Nhật', slug: 'phim-moi-cap-nhat', type: 'danh-sach' },
  { name: 'Hành Động', slug: 'hanh-dong', type: 'the-loai' },
  { name: 'Hoạt Hình', slug: 'hoat-hinh', type: 'the-loai' },
  { name: 'Tình Cảm', slug: 'tinh-cam', type: 'the-loai' },
  { name: 'Kinh Dị', slug: 'kinh-di', type: 'the-loai' },
  { name: 'Hài Hước', slug: 'hai-huoc', type: 'the-loai' },
];

async function fetchJsonCached(url, { signal, ttl = 3 * 60 * 1000 } = {}) {
  const promise = fetch(url, { signal }).then(async (r) => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  });
  try { return await promise; } catch (err) { throw err; }
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

/* =========================
   WATCH ROOM ROOT
========================= */

export default function WatchPartyRoom({ roomId, slug, user, navigate }) {
  const [roomData, setRoomData] = useState(null);
  const [usersInRoom, setUsersInRoom] = useState([]);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [activeTab, setActiveTab] = useState("chat"); 
  const [myAvatarId, setMyAvatarId] = useState(null);
  
  const [movieData, setMovieData] = useState(null);
  const [ep, setEp] = useState(null);
  const [loadingPage, setLoadingPage] = useState(true);
  const [loadingPlayer, setLoadingPlayer] = useState(true);
  const [roomClosed, setRoomClosed] = useState(false);

  const [showMovieModal, setShowMovieModal] = useState(false);
  const [modalCat, setModalCat] = useState(CATEGORIES[0]);
  const [modalSearchTerm, setModalSearchTerm] = useState("");
  const [modalMovies, setModalMovies] = useState([]);
  const [isFetchingModal, setIsFetchingModal] = useState(false);
  const [hostConfirmRequest, setHostConfirmRequest] = useState(null); 
  
  const [modalPage, setModalPage] = useState(1);
  const [modalHasMore, setModalHasMore] = useState(false);
  const [isLoadingMoreModal, setIsLoadingMoreModal] = useState(false);
  const modalObserverTarget = useRef(null);

  const [showEpModal, setShowEpModal] = useState(false);
  const [epChunkIndex, setEpChunkIndex] = useState(0);
  const [currentEpIndex, setCurrentEpIndex] = useState(0);
  const [hostConfirmEpRequest, setHostConfirmEpRequest] = useState(null);

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

  const vRef = useRef(null);
  const containerRef = useRef(null);
  const messagesEndRef = useRef(null);
  const isHostRef = useRef(false);
  const safeToDeleteRef = useRef(false);
  const isChangingMovieRef = useRef(false); 
  const hasAutoOpenedModal = useRef(false);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showViewerControls, setShowViewerControls] = useState(false);
  const hideControlsTimeoutRef = useRef(null);

  // FETCH PHIM CHÍNH
  useEffect(() => {
    let isMounted = true;

    if (slug === "dang-chon-phim") {
        setLoadingPage(false);
        setLoadingPlayer(false);
        return;
    }

    const fetchMovieData = async () => {
        try {
            setLoadingPage(true);
            setLoadingPlayer(true);
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000);
            
            const [resOphim, resNguonc] = await Promise.allSettled([
                fetch(`${API}/phim/${slug}`, { signal: controller.signal }).then(r => r.json()),
                fetch(`${API_NGUONC_DETAIL}/${slug}`, { signal: controller.signal }).then(r => r.json())
            ]);
            clearTimeout(timeoutId);

            let oItem = resOphim.status === 'fulfilled' ? resOphim.value?.data?.item : null;
            let nItem = null;

            if (resNguonc.status === 'fulfilled') {
                let nData = resNguonc.value;
                nItem = nData?.movie || nData?.item || nData;
                if (nItem && nData?.episodes) nItem.episodes = nData.episodes;
            }

            if (!isMounted) return;
            if (!oItem && !nItem) return navigate({ type: 'watch-party-lobby' });

            const baseItem = oItem || nItem;
            setMovieData(baseItem);

            let targetList = baseItem?.episodes?.[0]?.server_data || baseItem?.episodes?.[0]?.items || [];
            if(targetList.length > 0) {
               setEp({ name: targetList[0].name, link_m3u8: targetList[0].link_m3u8 || targetList[0].m3u8 || targetList[0].m3u8_url || "" });
               setCurrentEpIndex(0);
            }
            setLoadingPage(false);
            setLoadingPlayer(false);
            isChangingMovieRef.current = false; 
        } catch (e) {
            if (isMounted) navigate({ type: 'watch-party-lobby' });
        }
    };
    fetchMovieData();
    return () => { isMounted = false; };
  }, [slug, navigate]);

  useEffect(() => {
     if (!movieData || !roomData) return;
     const epList = movieData?.episodes?.[0]?.server_data || movieData?.episodes?.[0]?.items || [];
     const rIndex = roomData.epIndex || 0; 

     if (epList[rIndex] && currentEpIndex !== rIndex) {
         setCurrentEpIndex(rIndex);
         const targetEp = epList[rIndex];
         setEp({ name: targetEp.name, link_m3u8: targetEp.link_m3u8 || targetEp.m3u8 || targetEp.m3u8_url || "" });
     }
  }, [roomData?.epIndex, movieData]);

  // LOAD HLS
  useEffect(() => {
    if (!ep?.link_m3u8 || !vRef.current) return;
    const v = vRef.current;
    let hlsInstance = null;

    if (v.canPlayType("application/vnd.apple.mpegurl")) {
       v.src = ep.link_m3u8;
    } else {
       const loadHls = async () => {
         await ensureHlsScript();
         if (window.Hls) {
            hlsInstance = new window.Hls();
            hlsInstance.loadSource(ep.link_m3u8);
            hlsInstance.attachMedia(v);
         }
       };
       loadHls();
    }
    return () => { if (hlsInstance) hlsInstance.destroy(); };
  }, [ep, loadingPlayer]);

  // THUẬT TOÁN ĐỒNG BỘ MỚI NÂNG CẤP (TỰ ĐỘNG BÙ TRỪ VÀ ÉP TỐC ĐỘ ĐỂ BẮT KỊP HOST)
  useEffect(() => {
    const video = vRef.current;
    const isViewer = roomData && roomData.hostId !== user?.uid;
    
    if (!video || !isViewer || slug === "dang-chon-phim" || roomData.movieId !== slug) return;

    const syncVideo = () => {
        let targetTime = roomData.currentTime || 0;
        
        if (roomData.isPlaying && roomData.updatedAt) {
            // Khoảng thời gian đã trôi qua từ lúc host cập nhật
            const elapsedSeconds = (Date.now() - roomData.updatedAt) / 1000;
            // Cộng thêm thời gian trôi qua và BÙ TRỪ 1.5 GIÂY (thời gian HLS buffer)
            targetTime = targetTime + elapsedSeconds + 1.5;
        }

        const diff = targetTime - video.currentTime;

        // Nếu lệch quá xa (> 3 giây), thì nhảy cóc (Hard Sync)
        if (Math.abs(diff) > 3) {
            video.currentTime = targetTime;
        } 
        // Nếu bị chậm hơn Host (0.5s đến 3s) -> Cho video chạy nhanh lên 1.15x để đuổi theo
        else if (diff > 0.5) {
            video.playbackRate = 1.15;
        } 
        // Nếu bị chạy nhanh hơn Host -> Cho video chạy chậm lại 0.9x để chờ Host
        else if (diff < -0.5) {
            video.playbackRate = 0.9;
        } 
        // Lệch rất ít (hoàn hảo) -> Trả về tốc độ chuẩn 1.0x
        else {
            video.playbackRate = 1.0;
        }

        if (roomData.isPlaying && video.paused) {
            video.play().catch(e => console.log("Lỗi tự động Play (Trình duyệt chặn):", e));
        } else if (!roomData.isPlaying && !video.paused) {
            video.pause();
        }
    };

    // Khi video vừa load xong, đồng bộ luôn
    if (video.readyState >= 1) syncVideo();

    video.addEventListener("canplay", syncVideo);
    video.addEventListener("loadedmetadata", syncVideo);

    // VÒNG LẶP CHÉO: Check mỗi 2 giây để Viewer tự động chạy theo Host mà không cần đợi Host ấn gì
    const interval = setInterval(() => {
        if (video.readyState >= 1) syncVideo();
    }, 2000);

    return () => {
        video.removeEventListener("canplay", syncVideo);
        video.removeEventListener("loadedmetadata", syncVideo);
        clearInterval(interval);
        if (video) video.playbackRate = 1.0; // Reset tốc độ khi out
    };
  }, [roomData, slug, user?.uid]);

  // REALTIME ROOM LOGIC
  useEffect(() => {
    if (!roomId || !user) return;
    
    let currentCustomAvatar = null;
    getDoc(doc(db, "users", user.uid)).then(snap => {
        if(snap.exists() && snap.data().avatar) {
            currentCustomAvatar = snap.data().avatar;
            setMyAvatarId(currentCustomAvatar);
        }
        const defaultName = user.displayName || user.email?.split('@')[0] || "Khách";
        const defaultAvatar = user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(defaultName)}&background=E50914&color=fff`;
        setDoc(doc(db, `rooms/${roomId}/users`, user.uid), { uid: user.uid, name: defaultName, avatar: defaultAvatar, customAvatarId: currentCustomAvatar }).catch(()=>{});
    });

    const roomRef = doc(db, "rooms", roomId);
    const userRef = doc(db, `rooms/${roomId}/users`, user.uid);
    const strictModeTimer = setTimeout(() => { safeToDeleteRef.current = true; }, 800);

    const unsubRoom = onSnapshot(roomRef, (docSnap) => {
      if(docSnap.exists()) {
        const data = docSnap.data();
        setRoomData(data);
        isHostRef.current = data.hostId === user.uid; 

        if (slug === "dang-chon-phim" && data.hostId === user.uid && !hasAutoOpenedModal.current) {
           setShowMovieModal(true);
           hasAutoOpenedModal.current = true;
        }

        if (data.movieId && data.movieId !== slug && !isChangingMovieRef.current) {
            isChangingMovieRef.current = true;
            navigate({ type: 'watch-room', roomId, slug: data.movieId });
        }
      } else {
        if (!isHostRef.current) setRoomClosed(true); 
        else navigate({ type: 'watch-party-lobby' }); 
      }
    });

    const unsubUsers = onSnapshot(collection(db, `rooms/${roomId}/users`), (snap) => {
       const users = snap.docs.map(d => d.data());
       setUsersInRoom(users);
       updateDoc(roomRef, { viewerCount: users.length }).catch(()=>{});
    });

    const qMessages = query(collection(db, `rooms/${roomId}/messages`), orderBy("createdAt", "asc"));
    const unsubMessages = onSnapshot(qMessages, (snap) => {
       setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const handleCleanup = () => {
       if (isChangingMovieRef.current) return;
       if (isHostRef.current) {
           deleteDoc(roomRef).catch(()=>{}); 
       } else {
           deleteDoc(userRef).catch(()=>{}); 
       }
    };
    
    window.addEventListener("beforeunload", handleCleanup);

    return () => {
      clearTimeout(strictModeTimer);
      unsubRoom(); unsubUsers(); unsubMessages();
      window.removeEventListener("beforeunload", handleCleanup);
      handleCleanup(); 
    };
  }, [roomId, user, slug, navigate]);

  useEffect(() => {
    if (roomClosed) {
      const timer = setTimeout(() => navigate({ type: 'watch-party-lobby' }), 3000);
      return () => clearTimeout(timer);
    }
  }, [roomClosed, navigate]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activeTab]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) containerRef.current?.requestFullscreen?.().catch(()=>{});
    else document.exitFullscreen?.().catch(()=>{});
  };

  const handleViewerMouseMove = () => {
    setShowViewerControls(true);
    if (hideControlsTimeoutRef.current) clearTimeout(hideControlsTimeoutRef.current);
    hideControlsTimeoutRef.current = setTimeout(() => setShowViewerControls(false), 3000);
  };

  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const loadModalMovies = async (isSearch = false, pageNum = 1) => {
    if (pageNum === 1) {
        setIsFetchingModal(true);
        setModalMovies([]);
    } else {
        setIsLoadingMoreModal(true);
    }

    try {
      let reqs = [];
      if (isSearch && modalSearchTerm.trim()) {
         const q = encodeURIComponent(modalSearchTerm.trim());
         reqs = [
           fetch(`${API}/tim-kiem?keyword=${q}&page=${pageNum}`).then(r=>r.json()),
           fetch(`${API_NGUONC}/search?keyword=${q}&page=${pageNum}`).then(r=>r.json())
         ];
      } else {
         if (modalCat.slug === 'phim-moi-cap-nhat') {
            reqs = [fetch(`${API}/danh-sach/phim-moi-cap-nhat?page=${pageNum}`).then(r=>r.json()), fetch(`${API_NGUONC}/phim-moi-cap-nhat?page=${pageNum}`).then(r=>r.json())];
         } else if (modalCat.slug === 'hoat-hinh') {
            reqs = [fetch(`${API}/the-loai/hoat-hinh?page=${pageNum}`).then(r=>r.json()), fetch(`${API}/danh-sach/hoat-hinh?page=${pageNum}`).then(r=>r.json()), fetch(`${API_NGUONC}/danh-sach/hoathinh?page=${pageNum}`).then(r=>r.json())];
         } else {
            reqs = [fetch(`${API}/${modalCat.type}/${modalCat.slug}?page=${pageNum}`).then(r=>r.json()), fetch(`${API_NGUONC}/${modalCat.type}/${modalCat.slug}?page=${pageNum}`).then(r=>r.json())];
         }
      }

      const results = await Promise.allSettled(reqs);
      let newItems = [];
      results.forEach(res => {
          if (res.status === 'fulfilled') {
              const items = res.value?.items || res.value?.data?.items || [];
              if (Array.isArray(items)) newItems = [...newItems, ...items];
          }
      });

      const uniqueItems = Array.from(new Map(newItems.map(item => [item.slug || item.name, item])).values());
      
      if (pageNum === 1) setModalMovies(uniqueItems);
      else setModalMovies(prev => Array.from(new Map([...prev, ...uniqueItems].map(item => [item.slug || item.name, item])).values()));
      
      setModalHasMore(newItems.length > 0);
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
        loadModalMovies(!!modalSearchTerm, 1);
    }
  }, [showMovieModal, modalCat]);

  const handleModalSearchSubmit = (e) => {
     e.preventDefault();
     if (modalSearchTerm.trim()) { setModalPage(1); loadModalMovies(true, 1); }
  };

  useEffect(() => {
     const observer = new IntersectionObserver((entries) => {
         if (entries[0].isIntersecting && modalHasMore && !isLoadingMoreModal && !isFetchingModal) {
             setModalPage(p => { const next = p + 1; loadModalMovies(!!modalSearchTerm, next); return next; });
         }
     }, { threshold: 0.1 });

     if (modalObserverTarget.current) observer.observe(modalObserverTarget.current);
     return () => { if (modalObserverTarget.current) observer.unobserve(modalObserverTarget.current); }
  }, [modalHasMore, isLoadingMoreModal, isFetchingModal, modalSearchTerm]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;
    const text = newMessage.trim();
    setNewMessage(""); 
    
    const defaultName = user.displayName || user.email?.split('@')[0] || "Khách";
    const defaultAvatar = user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(defaultName)}&background=E50914&color=fff`;

    try {
      await addDoc(collection(db, `rooms/${roomId}/messages`), {
        uid: user.uid, name: defaultName, avatar: defaultAvatar, customAvatarId: myAvatarId,
        text: text, createdAt: serverTimestamp(), type: 'text'
      });
    } catch (err) {}
  };

  const handleSelectMovie = async (m) => {
    setShowMovieModal(false);
    const defaultName = user.displayName || user.email?.split('@')[0] || "Khách";
    const defaultAvatar = user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(defaultName)}&background=E50914&color=fff`;

    const poster = getImg(m.poster_url || m.thumb_url || "https://placehold.co/400x225/1a1a1a/e50914?text=No+Image");
    const origin = m.origin_name || m.original_name || m.year || "Phim Mới";

    if (isHostRef.current) {
        isChangingMovieRef.current = true;
        await updateDoc(doc(db, "rooms", roomId), { movieId: m.slug, currentTime: 0, isPlaying: false, epIndex: 0, updatedAt: Date.now() });
        await addDoc(collection(db, `rooms/${roomId}/messages`), { isSystem: true, text: `Chủ phòng đã đổi phim thành: ${m.name}`, createdAt: serverTimestamp() });
        navigate({ type: 'watch-room', roomId, slug: m.slug });
    } else {
        await addDoc(collection(db, `rooms/${roomId}/messages`), {
           uid: user.uid, name: defaultName, avatar: defaultAvatar, customAvatarId: myAvatarId,
           text: `đã yêu cầu đổi phim:`, type: 'request_movie',
           requestMovieSlug: m.slug, requestMovieName: m.name,
           requestMoviePoster: poster, requestMovieOrigin: origin,
           createdAt: serverTimestamp()
        });
        setActiveTab("chat");
    }
  };

  const executeHostChangeMovie = async () => {
     if (!hostConfirmRequest) return;
     isChangingMovieRef.current = true;
     const { slug: newSlug, name: newName } = hostConfirmRequest;
     setHostConfirmRequest(null);
     
     await updateDoc(doc(db, "rooms", roomId), { movieId: newSlug, currentTime: 0, isPlaying: false, epIndex: 0, updatedAt: Date.now() });
     await addDoc(collection(db, `rooms/${roomId}/messages`), { isSystem: true, text: `Chủ phòng đã đồng ý đổi sang phim: ${newName}`, createdAt: serverTimestamp() });
     navigate({ type: 'watch-room', roomId, slug: newSlug });
  };

  const handleSelectEpisode = async (index, epItem) => {
    setShowEpModal(false);
    const defaultName = user.displayName || user.email?.split('@')[0] || "Khách";
    const defaultAvatar = user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(defaultName)}&background=E50914&color=fff`;
    const epNameNumber = epItem.name.replace(/tập\s*/i, '');

    if (isHostRef.current) {
        await updateDoc(doc(db, "rooms", roomId), { epIndex: index, currentTime: 0, isPlaying: false, updatedAt: Date.now() });
        await addDoc(collection(db, `rooms/${roomId}/messages`), { isSystem: true, text: `Chủ phòng đã chuyển sang Tập ${epNameNumber}`, createdAt: serverTimestamp() });
    } else {
        await addDoc(collection(db, `rooms/${roomId}/messages`), {
           uid: user.uid, name: defaultName, avatar: defaultAvatar, customAvatarId: myAvatarId,
           text: `đã yêu cầu chuyển sang:`, type: 'request_ep',
           requestEpIndex: index, requestEpName: epNameNumber, createdAt: serverTimestamp()
        });
        setActiveTab("chat");
    }
  };

  const executeHostChangeEpisode = async () => {
      if (!hostConfirmEpRequest) return;
      const { index, name } = hostConfirmEpRequest;
      setHostConfirmEpRequest(null);
      await updateDoc(doc(db, "rooms", roomId), { epIndex: index, currentTime: 0, isPlaying: false, updatedAt: Date.now() });
      await addDoc(collection(db, `rooms/${roomId}/messages`), { isSystem: true, text: `Chủ phòng đã đồng ý chuyển sang Tập ${name}`, createdAt: serverTimestamp() });
  };

  const epList = movieData?.episodes?.[0]?.server_data || movieData?.episodes?.[0]?.items || [];
  const hasMultipleEps = epList.length > 1;
  const chunkSize = 50;
  const epChunks = [];
  for (let i = 0; i < epList.length; i += chunkSize) epChunks.push(epList.slice(i, i + chunkSize));

  if (loadingPage) return <div className="h-screen w-screen flex justify-center items-center bg-[#050505] overflow-hidden"><Icon.Loader2 className="animate-spin text-[#E50914]" size={40}/></div>;

  const isHost = roomData?.hostId === user?.uid;

  const handleHostPlay = () => { if (isHost && vRef.current) updateDoc(doc(db, "rooms", roomId), { isPlaying: true, currentTime: vRef.current.currentTime, updatedAt: Date.now() }).catch(()=>{}); };
  const handleHostPause = () => { if (isHost && vRef.current) updateDoc(doc(db, "rooms", roomId), { isPlaying: false, currentTime: vRef.current.currentTime, updatedAt: Date.now() }).catch(()=>{}); };
  const handleHostSeek = () => { if (isHost && vRef.current) updateDoc(doc(db, "rooms", roomId), { currentTime: vRef.current.currentTime, updatedAt: Date.now() }).catch(()=>{}); };

  const handleManualLeave = async () => {
     if(isHost) await deleteDoc(doc(db, "rooms", roomId)).catch(()=>{});
     else await deleteDoc(doc(db, `rooms/${roomId}/users`, user.uid)).catch(()=>{});
     navigate({type: 'watch-party-lobby'});
  };

  return (
    <div className="pt-20 md:pt-[88px] pb-4 max-w-[1800px] mx-auto px-2 md:px-4 h-screen w-screen flex flex-col overflow-hidden animate-in fade-in duration-500 bg-[#050505] relative">
      
      {showEpModal && (
        <div className="fixed inset-0 z-[1000] bg-black/90 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-4xl h-[80vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="p-4 md:p-5 flex justify-between items-center shrink-0 border-b border-white/5">
               <h2 className="text-lg md:text-xl font-black uppercase tracking-widest text-white flex items-center gap-2">
                 <Icon.ListVideo size={20} className="text-[#E50914]" /> Chọn Tập Phim
               </h2>
               <button onClick={() => setShowEpModal(false)} className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition text-gray-400 hover:text-white">
                 <Icon.X size={20}/>
               </button>
            </div>
            {epChunks.length > 1 && (
              <div className="p-4 border-b border-white/5 bg-black/40 shrink-0">
                <div 
                  ref={epScrollRef} onMouseDown={handleMouseDownEp} onMouseLeave={handleMouseLeaveEp} onMouseUp={handleMouseUpEp} onMouseMove={handleMouseMoveEp}
                  className={`flex gap-2 overflow-x-auto no-scrollbar pb-2 select-none ${isDraggingEp ? 'cursor-grabbing' : 'cursor-grab'}`}
                >
                  {epChunks.map((chunk, idx) => {
                    const start = idx * chunkSize + 1;
                    const end = start + chunk.length - 1;
                    return (
                      <button 
                        key={idx} onClick={() => setEpChunkIndex(idx)}
                        className={`px-4 py-2 text-xs font-bold rounded-lg uppercase tracking-wider whitespace-nowrap transition-all border shrink-0 ${epChunkIndex === idx ? 'bg-white/10 border-red-500/50 text-white' : 'bg-[#1a1a1a] border-white/5 text-gray-400 hover:bg-white/5 hover:text-white pointer-events-none md:pointer-events-auto'}`}
                        onMouseUp={(e) => { if(isDraggingEp && Math.abs(e.pageX - epScrollRef.current.offsetLeft - startXEp) > 10) e.stopPropagation(); }}
                      >
                        TẬP {start} - {end}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 no-scrollbar">
               <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-3">
                 {epChunks[epChunkIndex]?.map((epItem, localIdx) => {
                    const globalIdx = epChunkIndex * chunkSize + localIdx;
                    return (
                      <button 
                        key={globalIdx} onClick={() => handleSelectEpisode(globalIdx, epItem)}
                        className={`py-3 rounded-lg text-sm font-bold transition-all border ${currentEpIndex === globalIdx ? 'bg-[#E50914] text-white border-transparent shadow-[0_0_15px_rgba(229,9,20,0.4)]' : 'bg-[#1a1a1a] text-gray-300 border-white/5 hover:bg-white/10 hover:border-white/20'}`}
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

      {showMovieModal && (
        <div className="fixed inset-0 z-[1000] bg-black/90 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="p-4 md:p-5 flex justify-between items-center shrink-0 border-b border-white/5">
               <h2 className="text-lg md:text-xl font-black uppercase tracking-widest text-white flex items-center gap-2">
                 <Icon.Film size={20} className="text-[#E50914]" /> Chọn Phim Mới
               </h2>
               <button onClick={() => setShowMovieModal(false)} className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition text-gray-400 hover:text-white">
                 <Icon.X size={20}/>
               </button>
            </div>
            
            <div className="p-4 md:px-5 flex flex-col lg:flex-row gap-4 shrink-0 bg-[#0a0a0a]/50 border-b border-white/5 items-start lg:items-center">
               <form onSubmit={handleModalSearchSubmit} className="relative w-full lg:w-72 shrink-0">
                  <div className="absolute left-4 top-0 bottom-0 flex items-center pointer-events-none"><Icon.Search className="text-gray-500" size={16} /></div>
                  <input
                     type="text" value={modalSearchTerm} onChange={(e) => setModalSearchTerm(e.target.value)} placeholder="Tìm theo tên phim..."
                     className="w-full bg-black border border-white/10 rounded-xl py-3 pl-11 pr-4 text-base md:text-sm text-white focus:outline-none focus:border-[#E50914] transition-colors placeholder:text-gray-600 font-bold tracking-wider"
                  />
                  <button type="submit" className="hidden">Tìm</button>
               </form>

               <div 
                  ref={catScrollRef} onMouseDown={handleMouseDownCat} onMouseLeave={handleMouseLeaveCat} onMouseUp={handleMouseUpCat} onMouseMove={handleMouseMoveCat}
                  className={`flex gap-2.5 overflow-x-auto no-scrollbar w-full pb-1 lg:pb-0 select-none ${isDraggingCat ? 'cursor-grabbing' : 'cursor-grab'}`}
               >
                 {CATEGORIES.map(cat => (
                   <button 
                     key={cat.slug} 
                     onClick={() => { setModalCat(cat); setModalSearchTerm(""); }}
                     className={`px-4 py-2.5 text-xs font-bold rounded-xl uppercase tracking-widest whitespace-nowrap shrink-0 transition-colors ${!modalSearchTerm && modalCat.slug === cat.slug ? 'bg-[#E50914] text-white shadow-[0_0_15px_rgba(229,9,20,0.4)]' : 'bg-white/5 border border-white/5 text-gray-400 hover:bg-white/10 hover:text-white'}`}
                     onMouseUp={(e) => { if(isDraggingCat && Math.abs(e.pageX - catScrollRef.current.offsetLeft - startXCat) > 10) e.stopPropagation(); }}
                   >
                      {cat.name}
                   </button>
                 ))}
               </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-5 no-scrollbar">
              {isFetchingModal ? (
                 <div className="h-full flex items-center justify-center"><Icon.Loader2 className="animate-spin text-[#E50914]" size={40}/></div>
              ) : modalMovies.length === 0 ? (
                 <div className="h-full flex flex-col items-center justify-center opacity-50">
                    <Icon.Ghost size={48} className="mb-4 text-gray-500" />
                    <p className="text-sm font-bold uppercase tracking-widest text-gray-400">Không tìm thấy phim nào!</p>
                 </div>
              ) : (
                 <>
                   <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-5">
                      {modalMovies.map(m => (
                        <div key={m.slug} onClick={() => handleSelectMovie(m)} className="group cursor-pointer bg-[#0a0a0a] rounded-xl p-2 border border-white/5 hover:border-[#E50914]/50 transition-all hover:bg-white/5">
                          <div className="w-full aspect-[2/3] rounded-lg overflow-hidden mb-3 relative">
                            <img src={getImg(m.thumb_url || m.poster_url)} alt={m.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                               <span className="bg-[#E50914] text-white text-[10px] font-black px-3 py-1.5 rounded-lg uppercase tracking-widest">Chọn phim</span>
                            </div>
                          </div>
                          <h3 className="text-xs md:text-sm font-bold text-white truncate px-1 text-center group-hover:text-[#E50914] transition-colors">{m.name}</h3>
                        </div>
                      ))}
                   </div>
                   
                   {modalHasMore && (
                      <div ref={modalObserverTarget} className="flex justify-center items-center py-8 mt-4">
                         {isLoadingMoreModal && <Icon.Loader2 className="animate-spin text-[#E50914]" size={30} />}
                      </div>
                   )}
                 </>
              )}
            </div>
          </div>
        </div>
      )}

      {hostConfirmRequest && (
        <div className="fixed inset-0 z-[1001] bg-black/80 backdrop-blur-sm flex justify-center items-center p-4">
           <div className="bg-[#111] border border-white/10 p-6 rounded-2xl max-w-sm text-center shadow-2xl animate-in zoom-in-95">
              <Icon.HelpCircle size={48} className="text-[#E50914] mx-auto mb-4" />
              <h3 className="text-lg font-black text-white uppercase tracking-widest mb-2">Đồng ý đổi phim?</h3>
              <p className="text-gray-400 text-sm mb-6">Bạn có chắc muốn chuyển cả phòng sang xem phim: <br/><strong className="text-[#E50914] font-black text-lg mt-1 block">{hostConfirmRequest.name}</strong></p>
              <div className="flex gap-3">
                 <button onClick={() => setHostConfirmRequest(null)} className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl text-xs uppercase tracking-widest transition">Hủy</button>
                 <button onClick={executeHostChangeMovie} className="flex-1 py-3 bg-[#E50914] hover:bg-red-700 text-white font-bold rounded-xl text-xs uppercase tracking-widest transition shadow-[0_0_15px_rgba(229,9,20,0.4)]">Đồng Ý</button>
              </div>
           </div>
        </div>
      )}

      {hostConfirmEpRequest && (
        <div className="fixed inset-0 z-[1001] bg-black/80 backdrop-blur-sm flex justify-center items-center p-4">
           <div className="bg-[#111] border border-white/10 p-6 rounded-2xl max-w-sm text-center shadow-2xl animate-in zoom-in-95">
              <Icon.HelpCircle size={48} className="text-[#E50914] mx-auto mb-4" />
              <h3 className="text-lg font-black text-white uppercase tracking-widest mb-2">Đồng ý đổi tập?</h3>
              <p className="text-gray-400 text-sm mb-6">Bạn có chắc muốn chuyển sang: <br/><strong className="text-[#E50914] font-black text-xl mt-1 block">Tập {hostConfirmEpRequest.name}</strong></p>
              <div className="flex gap-3">
                 <button onClick={() => setHostConfirmEpRequest(null)} className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl text-xs uppercase tracking-widest transition">Hủy</button>
                 <button onClick={executeHostChangeEpisode} className="flex-1 py-3 bg-[#E50914] hover:bg-red-700 text-white font-bold rounded-xl text-xs uppercase tracking-widest transition shadow-[0_0_15px_rgba(229,9,20,0.4)]">Đồng Ý</button>
              </div>
           </div>
        </div>
      )}

      {roomClosed && (
        <div className="fixed inset-0 z-[999] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#111] border border-white/10 p-6 md:p-8 rounded-3xl max-w-sm w-full text-center shadow-[0_20px_60px_rgba(0,0,0,0.8)] animate-in zoom-in-95 duration-300">
            <Icon.AlertOctagon size={64} className="text-[#E50914] mx-auto mb-4" />
            <h3 className="text-xl font-black text-white uppercase tracking-widest mb-2">Phòng Đã Đóng!</h3>
            <p className="text-gray-400 text-sm mb-6 leading-relaxed">Chủ phòng đã rời đi hoặc kết thúc buổi xem chung. Bạn sẽ được tự động chuyển về Sảnh.</p>
            <button onClick={() => navigate({ type: 'watch-party-lobby' })} className="w-full bg-[#E50914] hover:bg-red-700 text-white font-black py-3.5 rounded-xl uppercase tracking-widest text-xs transition transform-gpu active:scale-95">Về Sảnh Ngay</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 md:gap-4 flex-1 min-h-0">
        
        {/* KHUNG VIDEO BÊN TRÁI */}
        <div className="lg:col-span-3 flex flex-col gap-3 min-h-0 h-full">
          <div className="shrink-0 flex flex-wrap items-center justify-between bg-[#111] p-3 md:px-4 rounded-xl border border-white/5 gap-3 shadow-lg">
            <div className="flex items-center gap-3">
              <h1 className="text-base md:text-lg font-black text-white uppercase tracking-tighter truncate max-w-[150px] sm:max-w-xs">{roomData?.name || "Đang tải..."}</h1>
              <span className="text-[10px] text-gray-400 bg-white/5 px-2 py-1 rounded-md font-mono border border-white/10 shrink-0">ID: {roomId}</span>
            </div>
            <div className="flex items-center gap-2">
               {hasMultipleEps && slug !== "dang-chon-phim" && (
                 <button onClick={() => setShowEpModal(true)} className="shrink-0 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white text-[10px] md:text-xs font-black rounded-lg transition-colors uppercase tracking-widest flex items-center gap-2 border border-white/5">
                   <Icon.ListVideo size={14} /> <span className="hidden sm:inline">{isHost ? "Chọn Tập" : "Yêu Cầu Tập"}</span>
                 </button>
               )}
               <button onClick={() => setShowMovieModal(true)} className="shrink-0 px-3 py-1.5 bg-[#E50914]/10 text-[#E50914] hover:bg-[#E50914] hover:text-white text-[10px] md:text-xs font-black rounded-lg transition-colors uppercase tracking-widest flex items-center gap-2 border border-[#E50914]/20">
                 <Icon.RefreshCcw size={14} /> <span className="hidden sm:inline">{isHost ? "Đổi Phim" : "Yêu Cầu Đổi Phim"}</span>
               </button>
               <button onClick={handleManualLeave} className="shrink-0 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white text-[10px] md:text-xs font-black rounded-lg transition-colors uppercase tracking-widest flex items-center gap-2 border border-white/5">
                 <Icon.LogOut size={14} /> <span className="hidden sm:inline">{isHost ? "Đóng Phòng" : "Thoát"}</span>
               </button>
            </div>
          </div>

          {slug === "dang-chon-phim" ? (
             <div className="relative w-full flex-1 bg-[#111] shadow-2xl overflow-hidden flex flex-col justify-center items-center border border-white/5 rounded-2xl">
                 <Icon.Film size={56} className="text-gray-600 mb-4 animate-pulse" />
                 <p className="text-gray-400 font-bold uppercase tracking-widest text-sm md:text-base text-center px-4">
                    {isHost ? "Phòng đã sẵn sàng. Vui lòng chọn phim!" : "Đang chờ chủ phòng chọn phim..."}
                 </p>
                 {isHost && (
                    <button onClick={() => setShowMovieModal(true)} className="mt-6 bg-[#E50914] px-8 py-3 rounded-xl font-black text-white uppercase text-xs tracking-widest shadow-lg hover:bg-red-700 transition-colors">
                       Chọn Phim Ngay
                    </button>
                 )}
             </div>
          ) : (
             <div ref={containerRef} onMouseMove={!isHost ? handleViewerMouseMove : undefined} onMouseLeave={() => !isHost && setShowViewerControls(false)} className="flex-1 min-h-0 w-full bg-black rounded-xl overflow-hidden border border-white/5 relative group flex items-center justify-center shadow-2xl">
                
                <video 
                   ref={vRef} 
                   className={`w-full h-full object-contain bg-black ${loadingPlayer ? 'opacity-0 absolute' : 'opacity-100'}`} 
                   onPlay={handleHostPlay} 
                   onPause={handleHostPause} 
                   onSeeked={handleHostSeek} 
                   controls={isHost} 
                   style={{ pointerEvents: isHost ? 'auto' : 'none' }} 
                   playsInline 
                />
                
                {loadingPlayer && (
                   <Icon.Loader2 className="animate-spin text-[#E50914] absolute z-50" size={40} />
                )}
                
                {!isHost && !loadingPlayer && (
                  <>
                    <div className="absolute inset-0 z-30 pointer-events-auto cursor-pointer" onDoubleClick={toggleFullscreen} />
                    <div className={`absolute inset-0 z-40 flex flex-col justify-between pointer-events-none transition-opacity duration-300 ${showViewerControls ? 'opacity-100' : 'opacity-0'}`}>
                       <div className="p-4 flex justify-between items-start">
                          <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg text-[10px] font-bold text-white tracking-widest uppercase border border-white/10 flex items-center gap-2 shadow-lg">
                             <Icon.Radio size={12} className="text-[#E50914] animate-pulse" /> Xem cùng Host
                          </div>
                       </div>
                       <div className="p-4 flex justify-between items-center bg-gradient-to-t from-black/90 to-transparent pointer-events-auto">
                          <div className="flex items-center gap-3 group/vol">
                            <button onClick={() => { const newMuted = !isMuted; setIsMuted(newMuted); if (vRef.current) vRef.current.muted = newMuted; }} className="text-white hover:text-[#E50914] transition focus:outline-none">
                               {isMuted || volume === 0 ? <Icon.VolumeX size={20}/> : <Icon.Volume2 size={20}/>}
                            </button>
                            <input type="range" min="0" max="1" step="0.05" value={isMuted ? 0 : volume} onChange={(e) => { const val = parseFloat(e.target.value); setVolume(val); setIsMuted(val === 0); if (vRef.current) { vRef.current.volume = val; vRef.current.muted = val === 0; } }} className="w-0 overflow-hidden group-hover/vol:w-20 transition-all duration-300 accent-[#E50914] h-1.5 bg-white/20 rounded-full cursor-pointer opacity-0 group-hover/vol:opacity-100"/>
                          </div>
                          <button onClick={toggleFullscreen} className="text-white hover:text-[#E50914] transition focus:outline-none">
                             {isFullscreen ? <Icon.Minimize size={20}/> : <Icon.Maximize size={20}/>}
                          </button>
                       </div>
                    </div>
                  </>
                )}
             </div>
          )}

          <div className="shrink-0 bg-[#111] p-3 md:px-4 rounded-xl border border-white/5 flex items-center justify-between shadow-lg">
             <div className="min-w-0 pr-4">
                <h2 className="text-sm md:text-base font-black uppercase tracking-tight text-white mb-0.5 line-clamp-1">{movieData?.name || (slug === "dang-chon-phim" ? "Chưa chọn phim" : "Đang tải...")}</h2>
                <p className="text-[10px] md:text-xs text-gray-500 uppercase tracking-widest line-clamp-1 font-bold">{movieData?.origin_name || movieData?.original_name || ""} {ep?.name ? `• Tập ${ep.name.replace(/tập\s*/i, '')}` : ""}</p>
             </div>
             {isHost ? (
                <div className="shrink-0 bg-[#E50914]/10 text-[#E50914] text-[9px] md:text-[10px] font-bold uppercase tracking-widest px-2.5 py-1.5 rounded-md border border-[#E50914]/20 flex items-center gap-1.5">
                   <Icon.Key size={12}/> Host
                </div>
             ) : (
                <div className="shrink-0 bg-white/5 text-gray-400 text-[9px] md:text-[10px] font-bold uppercase tracking-widest px-2.5 py-1.5 rounded-md border border-white/10 flex items-center gap-1.5">
                   <Icon.User size={12}/> Viewer
                </div>
             )}
          </div>
        </div>

        {/* KHUNG CHAT BÊN PHẢI */}
        <div className="bg-[#111] border border-white/5 rounded-xl flex flex-col h-full min-h-0 overflow-hidden shadow-2xl">
          <div className="shrink-0 flex border-b border-white/5 bg-black/20">
             <button onClick={() => setActiveTab("chat")} className={`flex-1 py-3.5 text-[10px] md:text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${activeTab === "chat" ? "text-white bg-white/5 border-b-2 border-[#E50914]" : "text-gray-500 hover:text-gray-300"}`}>
               <Icon.MessageSquare size={14} /> Trò chuyện
             </button>
             <button onClick={() => setActiveTab("users")} className={`flex-1 py-3.5 text-[10px] md:text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${activeTab === "users" ? "text-white bg-white/5 border-b-2 border-[#E50914]" : "text-gray-500 hover:text-gray-300"}`}>
               <Icon.Users size={14} /> Thành viên ({usersInRoom.length})
             </button>
          </div>
          
          {activeTab === "chat" && (
            <div className="flex-1 flex flex-col min-h-0 relative">
              <div className="flex-1 min-h-0 overflow-y-auto p-3 md:p-4 space-y-4 no-scrollbar bg-gradient-to-b from-transparent to-black/20">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-gray-600 space-y-2 opacity-50">
                    <Icon.MessagesSquare size={40} />
                    <p className="text-[10px] font-bold uppercase tracking-widest mt-1">Bắt đầu trò chuyện</p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    if (msg.isSystem) {
                        return (
                           <div key={msg.id} className="flex justify-center my-3">
                             <span className="bg-white/5 border border-white/10 text-gray-400 text-[10px] px-4 py-2 rounded-full uppercase tracking-widest font-bold text-center drop-shadow-md">
                               {msg.text}
                             </span>
                           </div>
                        );
                    }

                    if (msg.type === 'request_movie') {
                        return (
                          <div key={msg.id} className="flex gap-2.5 animate-in slide-in-from-bottom-2 duration-300 mb-2">
                             {renderAvatar(msg.customAvatarId, msg.avatar, "w-8 h-8 md:w-10 md:h-10")}
                             <div className="flex flex-col w-full max-w-[85%] items-start">
                               <div className="flex items-center gap-1.5 mb-1.5 px-1 flex-wrap">
                                 <span className="text-[10px] md:text-xs text-gray-300 font-black uppercase tracking-wider">{msg.name}</span>
                                 <span className="text-[10px] md:text-[11px] text-gray-500 font-medium italic">{msg.text}</span>
                               </div>
                               <div className="p-3 bg-[#161616] border border-white/10 rounded-2xl rounded-tl-sm shadow-lg w-full max-w-sm">
                                  <div className="flex gap-3 md:gap-4 mb-3 bg-black/40 p-2 md:p-3 rounded-xl border border-white/5">
                                    <img src={msg.requestMoviePoster} alt="Poster" className="w-16 h-24 md:w-24 md:h-36 rounded-lg object-cover border border-white/10 shadow-md shrink-0" />
                                    <div className="flex flex-col justify-center flex-1 min-w-0">
                                      <p className="text-[#E50914] font-black tracking-tight text-sm md:text-xl leading-snug uppercase line-clamp-3">{msg.requestMovieName}</p>
                                      <p className="text-gray-500 text-[9px] md:text-xs uppercase tracking-widest mt-2 font-bold line-clamp-2">{msg.requestMovieOrigin}</p>
                                    </div>
                                  </div>
                                  {isHost && (
                                     <button 
                                        onClick={() => setHostConfirmRequest({slug: msg.requestMovieSlug, name: msg.requestMovieName})}
                                        className="w-full bg-[#E50914] hover:bg-red-700 text-white font-black text-[10px] md:text-xs uppercase tracking-widest py-2 md:py-2.5 rounded-xl transition shadow-md"
                                     >
                                        Đồng ý chuyển
                                     </button>
                                  )}
                               </div>
                             </div>
                          </div>
                        )
                    }

                    if (msg.type === 'request_ep') {
                        return (
                          <div key={msg.id} className="flex gap-2.5 animate-in slide-in-from-bottom-2 duration-300 mb-2">
                             {renderAvatar(msg.customAvatarId, msg.avatar, "w-8 h-8 md:w-10 md:h-10")}
                             <div className="flex flex-col max-w-[85%] w-full items-start">
                               <div className="flex items-center gap-1.5 mb-1.5 px-1 flex-wrap">
                                 <span className="text-[10px] md:text-xs text-gray-300 font-black uppercase tracking-wider">{msg.name}</span>
                                 <span className="text-[10px] md:text-[11px] text-gray-500 font-medium italic">{msg.text}</span>
                               </div>
                               <div className="p-3 md:p-4 bg-blue-500/10 border border-blue-500/30 rounded-2xl rounded-tl-sm shadow-lg w-full text-center">
                                  <p className="text-blue-400 font-black tracking-tight mb-3 uppercase text-xl md:text-2xl">Tập {msg.requestEpName}</p>
                                  {isHost && (
                                     <button 
                                        onClick={() => setHostConfirmEpRequest({index: msg.requestEpIndex, name: msg.requestEpName})}
                                        className="w-full bg-blue-500 hover:bg-blue-400 text-white font-black text-[10px] md:text-xs uppercase tracking-widest py-2 md:py-2.5 rounded-xl transition shadow-md"
                                     >
                                        Đồng ý chuyển
                                     </button>
                                  )}
                               </div>
                             </div>
                          </div>
                        )
                    }

                    const isMe = msg.uid === user?.uid;
                    return (
                      <div key={msg.id} className={`flex gap-2.5 mb-2 ${isMe ? 'flex-row-reverse' : 'flex-row'} animate-in slide-in-from-bottom-2 duration-300`}>
                        {renderAvatar(msg.customAvatarId, msg.avatar, "w-8 h-8 md:w-10 md:h-10")}
                        <div className={`flex flex-col max-w-[85%] ${isMe ? 'items-end' : 'items-start'}`}>
                          <span className={`text-[10px] md:text-xs font-bold mb-1 px-1 tracking-wider uppercase ${isMe ? 'text-[#E50914]' : 'text-gray-400'}`}>{isMe ? "Bạn" : msg.name}</span>
                          <div className={`px-4 py-2.5 rounded-2xl text-[13px] md:text-sm font-bold leading-relaxed shadow-md ${isMe ? 'bg-[#E50914] text-white rounded-tr-sm' : 'bg-white/10 text-gray-200 rounded-tl-sm border border-white/5'}`}>
                            {msg.text}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              <form onSubmit={handleSendMessage} className="shrink-0 p-3 bg-black/60 border-t border-white/5 flex gap-2">
                <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Nhập tin nhắn..." className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-base md:text-sm text-white focus:outline-none focus:border-[#E50914] focus:bg-[#111] transition-all placeholder:text-gray-500 font-bold"/>
                <button type="submit" disabled={!newMessage.trim()} className="bg-[#E50914] text-white px-5 rounded-xl hover:bg-red-700 disabled:opacity-50 transition transform-gpu active:scale-95 flex items-center justify-center shadow-lg">
                  <Icon.Send size={18} className="-ml-0.5" />
                </button>
              </form>
            </div>
          )}

          {activeTab === "users" && (
            <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3 no-scrollbar bg-gradient-to-b from-transparent to-black/20">
               {usersInRoom.map((u, idx) => (
                  <div key={idx} className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/5 hover:bg-white/10 transition-colors cursor-default shadow-sm">
                     {renderAvatar(u.customAvatarId, u.avatar, "w-10 h-10")}
                     <div className="flex-1 min-w-0">
                        <p className="text-sm font-black text-white truncate mb-0.5 tracking-tight uppercase">{u.name}</p>
                        {u.uid === roomData?.hostId ? (
                          <span className="inline-block text-[9px] bg-[#E50914] text-white px-2 py-0.5 rounded font-black uppercase tracking-[0.2em] shadow-md">Chủ phòng</span>
                        ) : (
                          <span className="inline-block text-[9px] border border-gray-600 text-gray-400 px-2 py-0.5 rounded font-black uppercase tracking-[0.2em]">Thành viên</span>
                        )}
                     </div>
                  </div>
               ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}