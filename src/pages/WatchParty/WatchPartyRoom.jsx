import React, { useState, useEffect, useRef } from "react";
import * as Icon from "lucide-react";
import { doc, setDoc, onSnapshot, collection, updateDoc, deleteDoc, addDoc, query, orderBy, serverTimestamp } from "firebase/firestore";
import { db } from "../../config/firebase";
import { API, API_NGUONC, API_NGUONC_DETAIL, getImg } from "../../utils/helpers"; 

// Dữ liệu thể loại cho Modal Đổi Phim
const CATEGORIES = [
  { name: 'Mới Cập Nhật', slug: 'phim-moi-cap-nhat', type: 'danh-sach' },
  { name: 'Hành Động', slug: 'hanh-dong', type: 'the-loai' },
  { name: 'Hoạt Hình', slug: 'hoat-hinh', type: 'the-loai' },
  { name: 'Tình Cảm', slug: 'tinh-cam', type: 'the-loai' },
  { name: 'Kinh Dị', slug: 'kinh-di', type: 'the-loai' },
  { name: 'Hài Hước', slug: 'hai-huoc', type: 'the-loai' },
];

export default function WatchPartyRoom({ roomId, slug, user, navigate }) {
  const [roomData, setRoomData] = useState(null);
  const [usersInRoom, setUsersInRoom] = useState([]);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [activeTab, setActiveTab] = useState("chat"); 
  
  const [movieData, setMovieData] = useState(null);
  const [ep, setEp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [roomClosed, setRoomClosed] = useState(false);

  // --- STATE CHO TÍNH NĂNG ĐỔI PHIM ---
  const [showMovieModal, setShowMovieModal] = useState(false);
  const [modalCat, setModalCat] = useState(CATEGORIES[0]);
  const [modalSearchTerm, setModalSearchTerm] = useState("");
  const [modalMovies, setModalMovies] = useState([]);
  const [isFetchingModal, setIsFetchingModal] = useState(false);
  const [hostConfirmRequest, setHostConfirmRequest] = useState(null); 

  // --- STATE CHO TÍNH NĂNG CHỌN TẬP ---
  const [showEpModal, setShowEpModal] = useState(false);
  const [epChunkIndex, setEpChunkIndex] = useState(0);
  const [currentEpIndex, setCurrentEpIndex] = useState(0);
  const [hostConfirmEpRequest, setHostConfirmEpRequest] = useState(null);

  // --- THÊM MỚI: KÉO CUỘN NGANG CHO CHỌN TẬP ---
  const epScrollRef = useRef(null);
  const [isDraggingEp, setIsDraggingEp] = useState(false);
  const [startXEp, setStartXEp] = useState(0);
  const [scrollLeftEp, setScrollLeftEp] = useState(0);

  const handleMouseDownEp = (e) => {
    setIsDraggingEp(true);
    setStartXEp(e.pageX - epScrollRef.current.offsetLeft);
    setScrollLeftEp(epScrollRef.current.scrollLeft);
  };
  const handleMouseLeaveEp = () => setIsDraggingEp(false);
  const handleMouseUpEp = () => setIsDraggingEp(false);
  const handleMouseMoveEp = (e) => {
    if (!isDraggingEp) return;
    e.preventDefault();
    const x = e.pageX - epScrollRef.current.offsetLeft;
    const walk = (x - startXEp) * 2; // Tốc độ cuộn
    epScrollRef.current.scrollLeft = scrollLeftEp - walk;
  };

  // --- THÊM MỚI: KÉO CUỘN NGANG CHO THỂ LOẠI (BẢNG CHỌN PHIM) ---
  const catScrollRef = useRef(null);
  const [isDraggingCat, setIsDraggingCat] = useState(false);
  const [startXCat, setStartXCat] = useState(0);
  const [scrollLeftCat, setScrollLeftCat] = useState(0);

  const handleMouseDownCat = (e) => {
    setIsDraggingCat(true);
    setStartXCat(e.pageX - catScrollRef.current.offsetLeft);
    setScrollLeftCat(catScrollRef.current.scrollLeft);
  };
  const handleMouseLeaveCat = () => setIsDraggingCat(false);
  const handleMouseUpCat = () => setIsDraggingCat(false);
  const handleMouseMoveCat = (e) => {
    if (!isDraggingCat) return;
    e.preventDefault();
    const x = e.pageX - catScrollRef.current.offsetLeft;
    const walk = (x - startXCat) * 2;
    catScrollRef.current.scrollLeft = scrollLeftCat - walk;
  };

  const vRef = useRef(null);
  const hlsRef = useRef(null);
  const containerRef = useRef(null);
  const messagesEndRef = useRef(null);
  const isHostRef = useRef(false);
  
  const safeToDeleteRef = useRef(false);
  const isChangingMovieRef = useRef(false); 

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showViewerControls, setShowViewerControls] = useState(false);
  const hideControlsTimeoutRef = useRef(null);

  // 1. FETCH DATA PHIM CHÍNH
  useEffect(() => {
    let isMounted = true;
    const fetchMovieData = async () => {
        try {
            setLoading(true);
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

            if (!oItem && !nItem) {
                 const searchSlug = String(slug || "").replace(/-/g, ' ');
                 const sO = await fetch(`${API}/tim-kiem?keyword=${encodeURIComponent(searchSlug)}`).then(r=>r.json()).catch(()=>null);
                 const oMatchSlug = sO?.data?.items?.[0]?.slug;
                 if(oMatchSlug) oItem = await fetch(`${API}/phim/${oMatchSlug}`).then(r=>r.json()).then(j=>j.data.item).catch(()=>null);
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
            setLoading(false);
            isChangingMovieRef.current = false; 
        } catch (e) {
            if (isMounted) navigate({ type: 'watch-party-lobby' });
        }
    };
    fetchMovieData();
    return () => { isMounted = false; };
  }, [slug, navigate]);

  // ĐỒNG BỘ TẬP PHIM TỪ FIREBASE
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

  // 2. LOAD HLS VIDEO
  useEffect(() => {
    if (!ep?.link_m3u8 || !vRef.current) return;
    const v = vRef.current;
    if (v.canPlayType("application/vnd.apple.mpegurl")) {
       v.src = ep.link_m3u8;
    } else if (window.Hls) {
       const hls = new window.Hls();
       hlsRef.current = hls;
       hls.loadSource(ep.link_m3u8);
       hls.attachMedia(v);
    } else {
       let script = document.createElement("script");
       script.src = "https://cdn.jsdelivr.net/npm/hls.js@latest";
       script.onload = () => {
          if (window.Hls && vRef.current) {
             const hls = new window.Hls();
             hlsRef.current = hls;
             hls.loadSource(ep.link_m3u8);
             hls.attachMedia(vRef.current);
          }
       };
       document.body.appendChild(script);
    }
    return () => { if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; } };
  }, [ep]);

  // 3. REALTIME ROOM LOGIC
  useEffect(() => {
    if (!roomId || !user) return;
    const roomRef = doc(db, "rooms", roomId);
    const userRef = doc(db, `rooms/${roomId}/users`, user.uid);

    const defaultName = user.displayName || user.email?.split('@')[0] || "Khách";
    const defaultAvatar = user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(defaultName)}&background=E50914&color=fff`;

    setDoc(userRef, { uid: user.uid, name: defaultName, avatar: defaultAvatar }).catch(()=>{});

    const strictModeTimer = setTimeout(() => { safeToDeleteRef.current = true; }, 2000);

    const unsubRoom = onSnapshot(roomRef, (docSnap) => {
      if(docSnap.exists()) {
        const data = docSnap.data();
        setRoomData(data);
        isHostRef.current = data.hostId === user.uid; 

        if (data.movieId && data.movieId !== slug && !isChangingMovieRef.current) {
            isChangingMovieRef.current = true;
            navigate({ type: 'watch-room', roomId, slug: data.movieId });
        }

        if (data.hostId !== user.uid && vRef.current && data.movieId === slug) {
           const video = vRef.current;
           if (Math.abs(video.currentTime - data.currentTime) > 2) video.currentTime = data.currentTime;
           if (data.isPlaying && video.paused) video.play().catch(()=>{});
           if (!data.isPlaying && !video.paused) video.pause();
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

    const handleTabClose = () => { 
       if(isHostRef.current) deleteDoc(roomRef).catch(()=>{}); 
       else deleteDoc(userRef).catch(()=>{}); 
    };

    window.addEventListener("beforeunload", handleTabClose);

    return () => {
      clearTimeout(strictModeTimer);
      unsubRoom(); unsubUsers(); unsubMessages();
      window.removeEventListener("beforeunload", handleTabClose);
      
      if (!isChangingMovieRef.current) {
         if (isHostRef.current && safeToDeleteRef.current) {
             deleteDoc(roomRef).catch(()=>{}); 
         } else if (!isHostRef.current) {
             deleteDoc(userRef).catch(()=>{}); 
         }
      }
    };
  }, [roomId, user, slug, navigate]);

  useEffect(() => {
    if (roomClosed) {
      const timer = setTimeout(() => navigate({ type: 'watch-party-lobby' }), 5000);
      return () => clearTimeout(timer);
    }
  }, [roomClosed, navigate]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activeTab]);

  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // 4. FETCH DANH SÁCH PHIM CHO MODAL
  const loadModalMovies = async (isSearch = false) => {
    setIsFetchingModal(true);
    try {
      let reqs = [];
      
      if (isSearch && modalSearchTerm.trim()) {
         const q = encodeURIComponent(modalSearchTerm.trim());
         reqs = [
           fetch(`${API}/tim-kiem?keyword=${q}&page=1`).then(r=>r.json()),
           fetch(`${API_NGUONC}/search?keyword=${q}&page=1`).then(r=>r.json())
         ];
      } else {
         if (modalCat.slug === 'phim-moi-cap-nhat') {
            reqs = [
              fetch(`${API}/danh-sach/phim-moi-cap-nhat?page=1`).then(r=>r.json()),
              fetch(`${API_NGUONC}/phim-moi-cap-nhat?page=1`).then(r=>r.json())
            ];
         } else if (modalCat.slug === 'hoat-hinh') {
            reqs = [
              fetch(`${API}/the-loai/hoat-hinh?page=1`).then(r=>r.json()),
              fetch(`${API}/danh-sach/hoat-hinh?page=1`).then(r=>r.json()),
              fetch(`${API_NGUONC}/danh-sach/hoathinh?page=1`).then(r=>r.json())
            ];
         } else {
            reqs = [
              fetch(`${API}/${modalCat.type}/${modalCat.slug}?page=1`).then(r=>r.json()),
              fetch(`${API_NGUONC}/${modalCat.type}/${modalCat.slug}?page=1`).then(r=>r.json())
            ];
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
      setModalMovies(uniqueItems);

    } catch(e) { setModalMovies([]); }
    setIsFetchingModal(false);
  };

  useEffect(() => {
    if (showMovieModal) loadModalMovies(false);
  }, [showMovieModal, modalCat]);

  const handleModalSearchSubmit = (e) => {
     e.preventDefault();
     if (modalSearchTerm.trim()) {
        loadModalMovies(true);
     }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) containerRef.current?.requestFullscreen?.().catch(()=>{});
    else document.exitFullscreen?.().catch(()=>{});
  };

  const handleViewerMouseMove = () => {
    setShowViewerControls(true);
    if (hideControlsTimeoutRef.current) clearTimeout(hideControlsTimeoutRef.current);
    hideControlsTimeoutRef.current = setTimeout(() => setShowViewerControls(false), 3000);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;
    const text = newMessage.trim();
    setNewMessage(""); 
    
    const defaultName = user.displayName || user.email?.split('@')[0] || "Khách";
    const defaultAvatar = user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(defaultName)}&background=E50914&color=fff`;

    try {
      await addDoc(collection(db, `rooms/${roomId}/messages`), {
        uid: user.uid, name: defaultName, avatar: defaultAvatar, text: text, createdAt: serverTimestamp(), type: 'text'
      });
    } catch (err) {}
  };

  // 5. LOGIC XỬ LÝ CHỌN PHIM TỪ MODAL
  const handleSelectMovie = async (newMovieSlug, newMovieName) => {
    setShowMovieModal(false);
    const defaultName = user.displayName || user.email?.split('@')[0] || "Khách";
    const defaultAvatar = user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(defaultName)}&background=E50914&color=fff`;

    if (isHostRef.current) {
        isChangingMovieRef.current = true;
        await updateDoc(doc(db, "rooms", roomId), {
           movieId: newMovieSlug, currentTime: 0, isPlaying: false, epIndex: 0
        });
        await addDoc(collection(db, `rooms/${roomId}/messages`), {
           isSystem: true, text: `Chủ phòng đã đổi phim thành: ${newMovieName}`, createdAt: serverTimestamp()
        });
        navigate({ type: 'watch-room', roomId, slug: newMovieSlug });
    } else {
        await addDoc(collection(db, `rooms/${roomId}/messages`), {
           uid: user.uid, name: defaultName, avatar: defaultAvatar, 
           text: `đã yêu cầu đổi phim:`, type: 'request_movie',
           requestMovieSlug: newMovieSlug, requestMovieName: newMovieName,
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
     
     await updateDoc(doc(db, "rooms", roomId), { movieId: newSlug, currentTime: 0, isPlaying: false, epIndex: 0 });
     await addDoc(collection(db, `rooms/${roomId}/messages`), {
        isSystem: true, text: `Chủ phòng đã đồng ý đổi sang phim: ${newName}`, createdAt: serverTimestamp()
     });
     navigate({ type: 'watch-room', roomId, slug: newSlug });
  };

  // LOGIC CHỌN TẬP PHIM
  const handleSelectEpisode = async (index, epItem) => {
    setShowEpModal(false);
    const defaultName = user.displayName || user.email?.split('@')[0] || "Khách";
    const defaultAvatar = user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(defaultName)}&background=E50914&color=fff`;
    const epNameNumber = epItem.name.replace(/tập\s*/i, '');

    if (isHostRef.current) {
        await updateDoc(doc(db, "rooms", roomId), {
           epIndex: index, currentTime: 0, isPlaying: false
        });
        await addDoc(collection(db, `rooms/${roomId}/messages`), {
           isSystem: true, text: `Chủ phòng đã chuyển sang Tập ${epNameNumber}`, createdAt: serverTimestamp()
        });
    } else {
        await addDoc(collection(db, `rooms/${roomId}/messages`), {
           uid: user.uid, name: defaultName, avatar: defaultAvatar, 
           text: `đã yêu cầu chuyển sang:`, type: 'request_ep',
           requestEpIndex: index, requestEpName: epNameNumber,
           createdAt: serverTimestamp()
        });
        setActiveTab("chat");
    }
  };

  const executeHostChangeEpisode = async () => {
      if (!hostConfirmEpRequest) return;
      const { index, name } = hostConfirmEpRequest;
      setHostConfirmEpRequest(null);
      
      await updateDoc(doc(db, "rooms", roomId), { epIndex: index, currentTime: 0, isPlaying: false });
      await addDoc(collection(db, `rooms/${roomId}/messages`), {
         isSystem: true, text: `Chủ phòng đã đồng ý chuyển sang Tập ${name}`, createdAt: serverTimestamp()
      });
  };

  // Chia chunk tập phim
  const epList = movieData?.episodes?.[0]?.server_data || movieData?.episodes?.[0]?.items || [];
  const hasMultipleEps = epList.length > 1;
  const chunkSize = 50;
  const epChunks = [];
  for (let i = 0; i < epList.length; i += chunkSize) {
      epChunks.push(epList.slice(i, i + chunkSize));
  }

  if (loading || (!roomData && !roomClosed)) return <div className="h-screen w-screen flex justify-center items-center bg-[#050505] overflow-hidden"><Icon.Loader2 className="animate-spin text-[#E50914]" size={40}/></div>;

  const isHost = roomData?.hostId === user?.uid;

  const handleHostPlay = () => { if (isHost && vRef.current) updateDoc(doc(db, "rooms", roomId), { isPlaying: true, currentTime: vRef.current.currentTime }).catch(()=>{}); };
  const handleHostPause = () => { if (isHost && vRef.current) updateDoc(doc(db, "rooms", roomId), { isPlaying: false, currentTime: vRef.current.currentTime }).catch(()=>{}); };
  const handleHostSeek = () => { if (isHost && vRef.current) updateDoc(doc(db, "rooms", roomId), { currentTime: vRef.current.currentTime }).catch(()=>{}); };

  const handleManualLeave = async () => {
     if(isHost) await deleteDoc(doc(db, "rooms", roomId)).catch(()=>{});
     else await deleteDoc(doc(db, `rooms/${roomId}/users`, user.uid)).catch(()=>{});
     navigate({type: 'watch-party-lobby'});
  };

  return (
    <div className="pt-20 md:pt-[88px] pb-4 max-w-[1800px] mx-auto px-2 md:px-4 h-screen w-screen flex flex-col overflow-hidden animate-in fade-in duration-500 bg-[#050505] relative">
      
      {/* ================= MODAL CHỌN TẬP ================= */}
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
                {/* --- UPDATE: TÍCH HỢP DRAG TO SCROLL CHỌN TẬP --- */}
                <div 
                  ref={epScrollRef}
                  onMouseDown={handleMouseDownEp}
                  onMouseLeave={handleMouseLeaveEp}
                  onMouseUp={handleMouseUpEp}
                  onMouseMove={handleMouseMoveEp}
                  className={`flex gap-2 overflow-x-auto no-scrollbar pb-2 select-none ${isDraggingEp ? 'cursor-grabbing' : 'cursor-grab'}`}
                >
                  {epChunks.map((chunk, idx) => {
                    const start = idx * chunkSize + 1;
                    const end = start + chunk.length - 1;
                    const isActive = epChunkIndex === idx;
                    return (
                      <button 
                        key={idx}
                        onClick={() => setEpChunkIndex(idx)}
                        className={`px-4 py-2 text-xs font-bold rounded-lg uppercase tracking-wider whitespace-nowrap transition-all border shrink-0 ${
                          isActive 
                            ? 'bg-white/10 border-red-500/50 text-white' 
                            : 'bg-[#1a1a1a] border-white/5 text-gray-400 hover:bg-white/5 hover:text-white pointer-events-none md:pointer-events-auto'
                        }`}
                        // Ngăn chặn sự kiện click chạy khi đang kéo thả (drag)
                        onMouseUp={(e) => {
                           if(isDraggingEp && Math.abs(e.pageX - epScrollRef.current.offsetLeft - startXEp) > 10) {
                              e.stopPropagation();
                           }
                        }}
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
                    const isCurrent = currentEpIndex === globalIdx;
                    return (
                      <button 
                        key={globalIdx} 
                        onClick={() => handleSelectEpisode(globalIdx, epItem)}
                        className={`py-3 rounded-lg text-sm font-bold transition-all border ${
                          isCurrent 
                            ? 'bg-[#E50914] text-white border-transparent shadow-[0_0_15px_rgba(229,9,20,0.4)]' 
                            : 'bg-[#1a1a1a] text-gray-300 border-white/5 hover:bg-white/10 hover:border-white/20'
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

      {/* ================= MODAL CHỌN KHO PHIM ================= */}
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
                  <div className="absolute left-4 top-0 bottom-0 flex items-center pointer-events-none">
                     <Icon.Search className="text-gray-500" size={16} />
                  </div>
                  <input
                     type="text"
                     value={modalSearchTerm}
                     onChange={(e) => setModalSearchTerm(e.target.value)}
                     placeholder="Tìm theo tên phim..."
                     className="w-full bg-black border border-white/10 rounded-xl py-3 pl-11 pr-4 text-sm text-white focus:outline-none focus:border-[#E50914] transition-colors placeholder:text-gray-600"
                  />
                  <button type="submit" className="hidden">Tìm</button>
               </form>

               {/* --- UPDATE: TÍCH HỢP DRAG TO SCROLL CHỌN THỂ LOẠI --- */}
               <div 
                  ref={catScrollRef}
                  onMouseDown={handleMouseDownCat}
                  onMouseLeave={handleMouseLeaveCat}
                  onMouseUp={handleMouseUpCat}
                  onMouseMove={handleMouseMoveCat}
                  className={`flex gap-2.5 overflow-x-auto no-scrollbar w-full pb-1 lg:pb-0 select-none ${isDraggingCat ? 'cursor-grabbing' : 'cursor-grab'}`}
               >
                 {CATEGORIES.map(cat => (
                   <button 
                     key={cat.slug} 
                     onClick={() => {
                        setModalCat(cat);
                        setModalSearchTerm(""); 
                     }}
                     className={`px-4 py-2.5 text-xs font-bold rounded-xl uppercase tracking-widest whitespace-nowrap shrink-0 transition-colors ${!modalSearchTerm && modalCat.slug === cat.slug ? 'bg-[#E50914] text-white shadow-[0_0_15px_rgba(229,9,20,0.4)]' : 'bg-white/5 border border-white/5 text-gray-400 hover:bg-white/10 hover:text-white'}`}
                     onMouseUp={(e) => {
                        if(isDraggingCat && Math.abs(e.pageX - catScrollRef.current.offsetLeft - startXCat) > 10) {
                           e.stopPropagation();
                        }
                     }}
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
                 <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-5">
                    {modalMovies.map(m => (
                      <div key={m.slug} onClick={() => handleSelectMovie(m.slug, m.name)} className="group cursor-pointer bg-[#0a0a0a] rounded-xl p-2 border border-white/5 hover:border-[#E50914]/50 transition-all hover:bg-white/5">
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
              )}
            </div>
          </div>
        </div>
      )}

      {/* POPUP HOST XÁC NHẬN ĐỔI PHIM / ĐỔI TẬP */}
      {hostConfirmRequest && (
        <div className="fixed inset-0 z-[1001] bg-black/80 backdrop-blur-sm flex justify-center items-center p-4">
           <div className="bg-[#111] border border-white/10 p-6 rounded-2xl max-w-sm text-center shadow-2xl animate-in zoom-in-95">
              <Icon.HelpCircle size={48} className="text-[#E50914] mx-auto mb-4" />
              <h3 className="text-lg font-black text-white uppercase tracking-widest mb-2">Đồng ý đổi phim?</h3>
              <p className="text-gray-400 text-sm mb-6">Bạn có chắc muốn chuyển cả phòng sang xem phim: <br/><strong className="text-white">"{hostConfirmRequest.name}"</strong></p>
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
              <p className="text-gray-400 text-sm mb-6">Bạn có chắc muốn chuyển sang: <br/><strong className="text-white">Tập {hostConfirmEpRequest.name}</strong></p>
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
            <p className="text-gray-400 text-sm mb-6 leading-relaxed">
              Chủ phòng đã rời đi hoặc kết thúc buổi xem chung. Bạn sẽ được tự động chuyển về Sảnh.
            </p>
            <button onClick={() => navigate({ type: 'watch-party-lobby' })} className="w-full bg-[#E50914] hover:bg-red-700 text-white font-black py-3.5 rounded-xl uppercase tracking-widest text-xs transition transform-gpu active:scale-95">
              Về Sảnh Ngay
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 md:gap-4 flex-1 min-h-0">
        <div className="lg:col-span-3 flex flex-col gap-3 min-h-0 h-full">
          <div className="shrink-0 flex flex-wrap items-center justify-between bg-[#111] p-3 md:px-4 rounded-xl border border-white/5 gap-3">
            <div className="flex items-center gap-3">
              <h1 className="text-base md:text-lg font-black text-white uppercase tracking-tighter truncate max-w-[150px] sm:max-w-xs">{roomData?.name || "Đang tải..."}</h1>
              <span className="text-[10px] text-gray-400 bg-white/5 px-2 py-1 rounded-md font-mono border border-white/10 shrink-0">ID: {roomId}</span>
              {roomData?.isPublic ? (
                <span className="text-[9px] bg-green-500/20 text-green-400 px-2 py-1 rounded font-bold uppercase tracking-widest border border-green-500/20 hidden sm:block">Công khai</span>
              ) : (
                <span className="text-[9px] bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded font-bold uppercase tracking-widest border border-yellow-500/20 hidden sm:block">Riêng tư</span>
              )}
            </div>
            
            <div className="flex items-center gap-2">
               {hasMultipleEps && (
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

          <div ref={containerRef} onMouseMove={!isHost ? handleViewerMouseMove : undefined} onMouseLeave={() => !isHost && setShowViewerControls(false)} className="flex-1 min-h-0 w-full bg-black rounded-xl overflow-hidden border border-white/5 relative group flex items-center justify-center">
             <video ref={vRef} className="w-full h-full object-contain bg-black" onPlay={handleHostPlay} onPause={handleHostPause} onSeeked={handleHostSeek} controls={isHost} style={{ pointerEvents: isHost ? 'auto' : 'none' }} playsInline />
             
             {!isHost && (
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

          <div className="shrink-0 bg-[#111] p-3 md:px-4 rounded-xl border border-white/5 flex items-center justify-between">
             <div className="min-w-0 pr-4">
                <h2 className="text-sm md:text-base font-black uppercase tracking-tight text-white mb-0.5 line-clamp-1">{movieData?.name}</h2>
                <p className="text-[10px] md:text-xs text-gray-500 uppercase tracking-widest line-clamp-1">{movieData?.origin_name || movieData?.original_name} • Tập {ep?.name?.replace(/tập\s*/i, '')}</p>
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

        <div className="bg-[#111] border border-white/5 rounded-xl flex flex-col h-full min-h-0 overflow-hidden">
          <div className="shrink-0 flex border-b border-white/5 bg-black/20">
             <button onClick={() => setActiveTab("chat")} className={`flex-1 py-3 text-[10px] md:text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${activeTab === "chat" ? "text-white bg-white/5 border-b-2 border-[#E50914]" : "text-gray-500 hover:text-gray-300"}`}>
               <Icon.MessageSquare size={14} /> Trò chuyện
             </button>
             <button onClick={() => setActiveTab("users")} className={`flex-1 py-3 text-[10px] md:text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${activeTab === "users" ? "text-white bg-white/5 border-b-2 border-[#E50914]" : "text-gray-500 hover:text-gray-300"}`}>
               <Icon.Users size={14} /> Thành viên ({usersInRoom.length})
             </button>
          </div>
          
          {activeTab === "chat" && (
            <div className="flex-1 flex flex-col min-h-0 relative">
              <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3 no-scrollbar bg-gradient-to-b from-transparent to-black/20">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-gray-600 space-y-2 opacity-50">
                    <Icon.MessagesSquare size={32} />
                    <p className="text-[9px] font-bold uppercase tracking-widest mt-1">Bắt đầu trò chuyện</p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    if (msg.isSystem) {
                        return (
                           <div key={msg.id} className="flex justify-center my-2">
                             <span className="bg-white/5 border border-white/10 text-gray-400 text-[10px] px-3 py-1.5 rounded-full uppercase tracking-widest font-bold text-center">
                               {msg.text}
                             </span>
                           </div>
                        );
                    }

                    if (msg.type === 'request_movie') {
                        return (
                          <div key={msg.id} className="flex gap-2 animate-in slide-in-from-bottom-2 duration-300">
                             <img src={msg.avatar} alt="avt" className="w-6 h-6 rounded-full border border-yellow-500/50 object-cover shrink-0 mt-1" />
                             <div className="flex flex-col max-w-[85%] items-start">
                               <span className="text-[8px] text-gray-500 font-bold mb-0.5 px-1">{msg.name}</span>
                               <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl rounded-tl-sm text-xs shadow-sm w-full">
                                  <p className="text-gray-300 italic mb-1">{msg.text}</p>
                                  <p className="text-yellow-400 font-black tracking-tight mb-2 uppercase">{msg.requestMovieName}</p>
                                  {isHost && (
                                     <button 
                                        onClick={() => setHostConfirmRequest({slug: msg.requestMovieSlug, name: msg.requestMovieName})}
                                        className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-black text-[10px] uppercase tracking-widest py-1.5 rounded-lg transition"
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
                          <div key={msg.id} className="flex gap-2 animate-in slide-in-from-bottom-2 duration-300">
                             <img src={msg.avatar} alt="avt" className="w-6 h-6 rounded-full border border-blue-500/50 object-cover shrink-0 mt-1" />
                             <div className="flex flex-col max-w-[85%] items-start">
                               <span className="text-[8px] text-gray-500 font-bold mb-0.5 px-1">{msg.name}</span>
                               <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl rounded-tl-sm text-xs shadow-sm w-full">
                                  <p className="text-gray-300 italic mb-1">{msg.text}</p>
                                  <p className="text-blue-400 font-black tracking-tight mb-2 uppercase">Tập {msg.requestEpName}</p>
                                  {isHost && (
                                     <button 
                                        onClick={() => setHostConfirmEpRequest({index: msg.requestEpIndex, name: msg.requestEpName})}
                                        className="w-full bg-blue-500 hover:bg-blue-400 text-white font-black text-[10px] uppercase tracking-widest py-1.5 rounded-lg transition"
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
                      <div key={msg.id} className={`flex gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'} animate-in slide-in-from-bottom-2 duration-300`}>
                        <img src={msg.avatar} alt="avt" className="w-6 h-6 rounded-full border border-white/10 object-cover shrink-0 mt-1" referrerPolicy="no-referrer" />
                        <div className={`flex flex-col max-w-[85%] ${isMe ? 'items-end' : 'items-start'}`}>
                          <span className="text-[8px] text-gray-500 font-bold mb-0.5 px-1">{isMe ? "Bạn" : msg.name}</span>
                          <div className={`px-3 py-2 rounded-xl text-xs leading-relaxed shadow-sm ${isMe ? 'bg-[#E50914] text-white rounded-tr-sm' : 'bg-white/10 text-gray-200 rounded-tl-sm'}`}>
                            {msg.text}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              <form onSubmit={handleSendMessage} className="shrink-0 p-3 bg-black/40 border-t border-white/5 flex gap-2">
                <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Gửi tin nhắn..." className="flex-1 bg-white/5 border border-transparent rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#E50914]/50 focus:bg-white/10 transition-all placeholder:text-gray-600"/>
                <button type="submit" disabled={!newMessage.trim()} className="bg-[#E50914] text-white px-3.5 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:hover:bg-[#E50914] transition transform-gpu active:scale-95 flex items-center justify-center">
                  <Icon.Send size={14} className="-ml-0.5" />
                </button>
              </form>
            </div>
          )}

          {activeTab === "users" && (
            <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2 no-scrollbar bg-gradient-to-b from-transparent to-black/20">
               {usersInRoom.map((u, idx) => (
                  <div key={idx} className="flex items-center gap-3 bg-white/5 p-2.5 rounded-lg border border-white/5 hover:bg-white/10 transition-colors cursor-default">
                     <img src={u.avatar} alt="avt" className="w-8 h-8 rounded-full border border-white/10 object-cover shrink-0" referrerPolicy="no-referrer" />
                     <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-white truncate mb-0.5">{u.name}</p>
                        {u.uid === roomData?.hostId ? (
                          <span className="inline-block text-[7px] bg-[#E50914] text-white px-1.5 py-0.5 rounded-sm font-black uppercase tracking-[0.2em]">Chủ phòng</span>
                        ) : (
                          <span className="inline-block text-[7px] border border-gray-600 text-gray-400 px-1.5 py-0.5 rounded-sm font-black uppercase tracking-[0.2em]">Thành viên</span>
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