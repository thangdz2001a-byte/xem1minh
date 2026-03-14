import React, { useState, useEffect, useRef } from "react";
import * as Icon from "lucide-react";
import { supabase } from "../../utils/supabaseClient"; 
import { generateRoomId, API, mergeDuplicateMovies } from "../../utils/helpers";
import MovieCard from "../../components/common/MovieCard";

// HÀM LÀM SẠCH MẬT KHẨU
const cleanPassword = (str) => {
  return str
    .replace(/\s/g, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
};

// DANH MỤC PHIM CHO MODAL ĐÃ ĐƯỢC CẬP NHẬT
const CATEGORIES = [
  { name: 'Hành Động', slug: 'hanh-dong', type: 'the-loai' },
  { name: 'Hoạt Hình', slug: 'hoat-hinh', type: 'the-loai' },
  { name: 'Tình Cảm', slug: 'tinh-cam', type: 'the-loai' },
  { name: 'Kinh Dị', slug: 'kinh-di', type: 'the-loai' },
  { name: 'Hài Hước', slug: 'hai-huoc', type: 'the-loai' }
];

export default function WatchPartyLobby({ navigate, user, onLogin }) {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  // STATE TẠO PHÒNG BƯỚC 1
  const [showPartyModal, setShowPartyModal] = useState(false);
  const [roomName, setRoomName] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [password, setPassword] = useState("");

  // STATE TẠO PHÒNG BƯỚC 2 (POPUP CHỌN PHIM)
  const [showMovieModal, setShowMovieModal] = useState(false);
  const [modalCat, setModalCat] = useState(CATEGORIES[0]);
  const [modalSearchTerm, setModalSearchTerm] = useState("");
  const [modalMovies, setModalMovies] = useState([]);
  const [isFetchingModal, setIsFetchingModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const createLockRef = useRef(false);

  // STATE PHÂN TRANG
  const [modalPage, setModalPage] = useState(1);
  const [modalHasMore, setModalHasMore] = useState(false);
  const [isLoadingMoreModal, setIsLoadingMoreModal] = useState(false);
  const observerTarget = useRef(null);

  const catScrollRef = useRef(null);
  const [isDraggingCat, setIsDraggingCat] = useState(false);
  const [startXCat, setStartXCat] = useState(0);
  const [scrollLeftCat, setScrollLeftCat] = useState(0);

  const handleMouseDownCat = (e) => { setIsDraggingCat(true); setStartXCat(e.pageX - catScrollRef.current.offsetLeft); setScrollLeftCat(catScrollRef.current.scrollLeft); };
  const handleMouseLeaveCat = () => setIsDraggingCat(false);
  const handleMouseUpCat = () => setIsDraggingCat(false);
  const handleMouseMoveCat = (e) => { if (!isDraggingCat) return; e.preventDefault(); const x = e.pageX - catScrollRef.current.offsetLeft; catScrollRef.current.scrollLeft = scrollLeftCat - (x - startXCat) * 2; };

  // State Vào phòng Private
  const [selectedPrivateRoom, setSelectedPrivateRoom] = useState(null);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    setLoading(true);

    const mapRoom = (r) => ({
        id: r.id, roomId: r.id, name: r.name, movieId: r.movie_id,
        hostId: r.host_id, hostName: r.host_name, isPublic: r.is_public,
        password: r.password, viewerCount: r.viewer_count,
        createdAt: r.created_at
    });

    const fetchRooms = async () => {
        if (user?.uid) {
            await supabase.from('rooms').delete().eq('host_id', user.uid);
        }

        const { data } = await supabase.from('rooms').select('*').order('created_at', { ascending: false });
        if (data) setRooms(data.map(mapRoom));
        setLoading(false);
    };

    fetchRooms();

    const subscription = supabase.channel('public:rooms')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'rooms' }, payload => {
            setRooms(prev => [mapRoom(payload.new), ...prev]);
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms' }, payload => {
            setRooms(prev => prev.map(r => r.id === payload.new.id ? mapRoom(payload.new) : r));
        })
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'rooms' }, payload => {
            setRooms(prev => prev.filter(r => r.id !== payload.old.id));
        })
        .subscribe();

    return () => { supabase.removeChannel(subscription); };
  }, [user]);

  const loadModalMovies = async (isSearch = false, pageNum = 1, currentList = []) => {
    if (pageNum === 1) setIsFetchingModal(true); 
    else setIsLoadingMoreModal(true); 
    
    try {
      let reqs = [];
      if (isSearch && modalSearchTerm.trim()) {
         const q = encodeURIComponent(modalSearchTerm.trim());
         reqs = [
             fetch(`${API}/tim-kiem?keyword=${q}&page=${pageNum}`).then(r=>r.json())
         ];
      } else {
         const { slug, type } = modalCat;
         if (slug === 'hoat-hinh') {
             reqs = [
                 fetch(`${API}/danh-sach/hoat-hinh?page=${pageNum}`).then(r=>r.json()),
                 fetch(`${API}/the-loai/hoat-hinh?page=${pageNum}`).then(r=>r.json())
             ];
         } else {
             reqs = [
                 fetch(`${API}/${type}/${slug}?page=${pageNum}`).then(r=>r.json())
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

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) observer.unobserve(observerTarget.current);
    };
  }, [modalHasMore, isFetchingModal, isLoadingMoreModal, modalPage, modalSearchTerm, modalMovies]);

  const handleNextToMovieSelection = (e) => {
    e.preventDefault();
    if (!user) return onLogin();
    if (!roomName.trim()) return alert("Vui lòng nhập tên phòng");
    setShowPartyModal(false);
    setShowMovieModal(true);
  };

  const handleCreateFinalRoom = async (movie) => {
    if (createLockRef.current) return;
    createLockRef.current = true;
    setIsCreating(true);

    try {
      const roomId = generateRoomId();
      
      const { error } = await supabase.from('rooms').insert([{
        id: roomId,
        name: roomName.trim(),
        movie_id: movie.slug,
        host_id: user?.uid || "unknown_uid",
        host_name: user?.displayName || user?.email?.split('@')[0] || "Khách",
        is_public: isPublic,
        password: isPublic ? null : password,
        current_time: 0,
        is_playing: false,
        ep_index: 0,
        viewer_count: 1
      }]);

      if (error) throw error;

      setShowMovieModal(false);
      setIsCreating(false);
      navigate({ type: "watch-room", roomId, slug: movie.slug }); 
    } catch (err) {
      alert("Lỗi tạo phòng: " + err.message);
      setIsCreating(false);
      createLockRef.current = false; 
    }
  };

  const handleRoomClick = (room) => {
    if (room.isPublic || room.hostId === user?.uid) {
       navigate({ type: "watch-room", roomId: room.roomId, slug: room.movieId });
    } else {
       setSelectedPrivateRoom(room);
       setPasswordInput("");
       setPasswordError("");
    }
  };

  const handleJoinById = async (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;
    const cleanId = searchTerm.trim().toUpperCase();
    const foundRoom = rooms.find(r => r.roomId === cleanId);
    if (foundRoom) return handleRoomClick(foundRoom);

    setIsJoining(true);
    try {
        const { data, error } = await supabase.from('rooms').select('*').eq('id', cleanId).single();
        
        if (error || !data) {
            alert("Không tìm thấy phòng có mã này!");
        } else {
            const mappedData = {
                id: data.id, roomId: data.id, name: data.name, movieId: data.movie_id,
                hostId: data.host_id, hostName: data.host_name, isPublic: data.is_public,
                password: data.password, viewerCount: data.viewer_count
            };
            handleRoomClick(mappedData);
        }
    } catch(err) { 
        alert("Lỗi kết nối!"); 
    }
    setIsJoining(false);
  };

  const handlePasswordSubmit = (e) => {
     e.preventDefault();
     if (!selectedPrivateRoom) return;
     if (passwordInput === selectedPrivateRoom.password) {
        navigate({ type: "watch-room", roomId: selectedPrivateRoom.roomId, slug: selectedPrivateRoom.movieId });
     } else setPasswordError("Mật khẩu không chính xác!");
  };

  const filteredRooms = rooms.filter(r => 
    r.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    r.roomId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.movieId?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!user) {
    return (
      <div className="pt-24 md:pt-32 pb-20 min-h-screen flex flex-col items-center justify-center text-white px-4 animate-in fade-in duration-500 bg-[#050505]">
        <div className="w-20 h-20 md:w-24 md:h-24 bg-white/5 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(229,9,20,0.2)]">
           <Icon.Users size={40} className="text-[#E50914] md:w-12 md:h-12" />
        </div>
        <h2 className="text-xl md:text-4xl font-black mb-2 md:mb-3 uppercase tracking-widest text-center text-white">Sảnh Xem Chung</h2>
        <p className="text-gray-400 mb-8 text-center text-[11px] md:text-base uppercase tracking-widest">Đăng nhập để trải nghiệm cày phim cùng hội bạn</p>
        <button 
          onClick={onLogin} 
          className="bg-[#E50914] px-6 py-3 md:px-8 md:py-3.5 rounded-full font-black flex items-center gap-2 md:gap-3 hover:bg-red-700 transition transform-gpu hover:scale-105 active:scale-95 shadow-[0_10px_25px_rgba(229,9,20,0.4)] text-xs md:text-base uppercase tracking-widest"
        >
          <Icon.User size={18} /> Bắt đầu ngay
        </button>
      </div>
    );
  }

  return (
    <div className="pt-20 md:pt-32 pb-16 md:pb-20 max-w-[1400px] mx-auto px-4 md:px-12 text-white animate-in fade-in duration-500 min-h-screen relative">
      
      {/* BƯỚC 1: POPUP NHẬP THÔNG TIN PHÒNG */}
      {showPartyModal && (
        <div className="fixed inset-0 z-[500] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 shadow-2xl">
          <form onSubmit={handleNextToMovieSelection} className="bg-[#111] p-5 md:p-8 rounded-2xl md:rounded-3xl w-full max-w-md border border-white/10 shadow-2xl animate-in zoom-in-95 duration-300 relative">
            <button type="button" onClick={() => setShowPartyModal(false)} className="absolute top-3 right-3 md:top-4 md:right-4 text-gray-400 hover:text-white bg-black/50 p-1.5 md:p-2 rounded-full transition">
              <Icon.X size={18} />
            </button>

            <h2 className="text-lg md:text-2xl font-black mb-5 md:mb-6 uppercase tracking-widest flex items-center gap-2 md:gap-3 text-white">
              <span className="w-1.5 h-5 md:h-6 bg-[#E50914] block"></span> TẠO PHÒNG
            </h2>

            <label className="block text-[10px] text-gray-400 mb-1.5 md:mb-2 uppercase font-bold tracking-widest">Tên phòng</label>
            <input
              required
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="Nhập tên phòng..."
              className="w-full bg-[#222] rounded-xl p-3 md:p-4 mb-4 md:mb-5 outline-none border border-white/5 focus:border-[#E50914] text-white text-sm font-bold"
            />

            <div className="flex gap-4 md:gap-6 mb-5 md:mb-6">
              <label className="flex items-center gap-2 text-white cursor-pointer font-bold text-xs md:text-sm">
                <input type="radio" checked={isPublic} onChange={() => setIsPublic(true)} className="accent-[#E50914] w-4 h-4" />
                Công khai
              </label>
              <label className="flex items-center gap-2 text-white cursor-pointer font-bold text-xs md:text-sm">
                <input type="radio" checked={!isPublic} onChange={() => {setIsPublic(false); setPassword("");}} className="accent-[#E50914] w-4 h-4" />
                Riêng tư
              </label>
            </div>

            {!isPublic && (
              <div className="animate-in slide-in-from-top-2 duration-300 mb-5 md:mb-6">
                <label className="block text-[9px] md:text-[10px] text-gray-400 mb-1.5 md:mb-2 uppercase font-bold tracking-widest">
                  Mật khẩu (Không dấu, không khoảng trắng)
                </label>
                <input
                  required
                  value={password}
                  onChange={(e) => setPassword(cleanPassword(e.target.value))}
                  type="text"
                  placeholder="Nhập mật khẩu..."
                  className="w-full bg-[#222] rounded-xl p-3 md:p-4 outline-none border border-white/5 focus:border-[#E50914] text-white text-sm font-bold tracking-widest"
                />
              </div>
            )}

            <div className="flex justify-end gap-2 md:gap-3 mt-6 md:mt-8">
              <button type="button" onClick={() => setShowPartyModal(false)} className="px-5 py-2.5 md:px-6 md:py-3 text-[10px] md:text-xs font-bold text-gray-400 hover:text-white transition uppercase tracking-widest bg-white/5 hover:bg-white/10 rounded-xl">
                Hủy
              </button>
              <button type="submit" className="px-5 py-2.5 md:px-8 md:py-3 bg-[#E50914] hover:bg-red-700 text-white rounded-xl font-black uppercase text-[10px] md:text-xs transition shadow-[0_4px_15px_rgba(229,9,20,0.4)] flex items-center gap-2">
                CHỌN PHIM  <Icon.ArrowRight size={14} className="md:w-4 md:h-4"/>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* BƯỚC 2: MODAL CHỌN PHIM Ở SẢNH */}
      {showMovieModal && (
        <div className="fixed inset-0 z-[1000] bg-black/95 backdrop-blur-md flex justify-center items-center p-0 md:p-4">
          <div className="bg-[#111] border-0 md:border border-white/10 md:rounded-2xl w-full h-full md:max-w-5xl md:h-[85vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom-5 duration-300">
            
            {/* Header Modal */}
            <div className="p-3 md:p-5 flex justify-between items-center shrink-0 border-b border-white/5 bg-[#111] z-10 pt-safe-top">
               <div className="flex items-center gap-3 md:gap-4">
                   <button onClick={() => { setShowMovieModal(false); setShowPartyModal(true); }} className="p-1.5 md:p-2 bg-white/5 hover:bg-white/10 rounded-full transition text-gray-400 hover:text-white"><Icon.ArrowLeft size={18} className="md:w-5 md:h-5"/></button>
                   <h2 className="text-sm md:text-xl font-black uppercase tracking-widest text-white flex items-center gap-2">Chọn Phim</h2>
               </div>
               <button onClick={() => setShowMovieModal(false)} className="p-1.5 md:p-2 bg-white/5 hover:bg-white/10 rounded-full transition text-gray-400 hover:text-white"><Icon.X size={18} className="md:w-5 md:h-5"/></button>
            </div>

            {/* Form search & Categories (Đã fix cuộn) */}
            <div className="p-3 md:p-4 flex flex-col lg:flex-row gap-3 md:gap-4 shrink-0 bg-[#0a0a0a]/50 border-b border-white/5 items-start lg:items-center">
               <form onSubmit={(e) => {e.preventDefault(); setModalPage(1); loadModalMovies(true, 1, []);}} className="relative w-full lg:w-72 shrink-0">
                  <div className="absolute left-3.5 top-0 bottom-0 flex items-center pointer-events-none"><Icon.Search className="text-gray-500" size={14} /></div>
                  <input type="text" value={modalSearchTerm} onChange={(e) => setModalSearchTerm(e.target.value)} placeholder="Tìm theo tên phim..." className="w-full bg-black border border-white/10 rounded-xl py-2.5 pl-9 pr-3 text-sm text-white focus:outline-none focus:border-[#E50914] font-bold tracking-wider" />
               </form>

               {/* Vùng bọc danh mục giúp giới hạn độ rộng để có thể vuốt trên mobile */}
               <div className="w-full overflow-hidden">
                 <div ref={catScrollRef} onMouseDown={handleMouseDownCat} onMouseLeave={handleMouseLeaveCat} onMouseUp={handleMouseUpCat} onMouseMove={handleMouseMoveCat} className="flex gap-2 overflow-x-auto pb-1 select-none cursor-grab snap-x touch-pan-x [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                   {CATEGORIES.map(cat => (
                     <button key={cat.slug} onClick={() => { setModalCat(cat); setModalSearchTerm(""); }} className={`snap-start px-3 py-1.5 md:px-4 md:py-2.5 text-[10px] md:text-xs font-bold rounded-lg md:rounded-xl uppercase tracking-widest whitespace-nowrap shrink-0 transition-colors ${!modalSearchTerm && modalCat.slug === cat.slug ? 'bg-[#E50914] text-white shadow-[0_0_10px_rgba(229,9,20,0.3)]' : 'bg-white/5 border border-white/5 text-gray-400 hover:bg-white/10 hover:text-white'}`}>{cat.name}</button>
                   ))}
                 </div>
               </div>
            </div>

            {/* Danh sách phim */}
            <div className="flex-1 overflow-y-auto p-3 md:p-5 relative [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {isCreating && (
                 <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center">
                    <Icon.Loader2 className="animate-spin text-[#E50914] mb-3 md:mb-4 md:w-12 md:h-12" size={36} />
                    <span className="text-white font-bold uppercase tracking-widest text-xs md:text-sm animate-pulse">Đang thiết lập...</span>
                 </div>
              )}
              {isFetchingModal ? <div className="h-full flex items-center justify-center"><Icon.Loader2 className="animate-spin text-[#E50914] md:w-10 md:h-10" size={32} /></div> : (
                 <>
                   <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 md:gap-4">
                      {modalMovies.map((m, idx) => (
                        <div key={`${m.slug}-${idx}`} className="group relative">
                          <MovieCard 
                            m={m} 
                            isRow={false} 
                            onClickOverride={() => handleCreateFinalRoom(m)} 
                          />
                          <div className="absolute inset-0 z-30 bg-black/40 opacity-0 md:group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none rounded-xl">
                            <span className="bg-[#E50914] text-white text-[10px] font-black px-3 py-1.5 rounded-lg uppercase tracking-widest shadow-2xl scale-90 group-hover:scale-100 transition-transform">
                              Tạo Phòng
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

      {/* POPUP NHẬP MẬT KHẨU PHÒNG PRIVATE */}
      {selectedPrivateRoom && (
        <div className="fixed inset-0 z-[999] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#111] border border-white/10 p-5 md:p-8 rounded-2xl md:rounded-3xl max-w-sm w-full shadow-[0_20px_60px_rgba(0,0,0,0.8)] animate-in zoom-in-95 duration-300 relative">
            <button onClick={() => setSelectedPrivateRoom(null)} className="absolute top-4 right-4 text-gray-500 hover:text-white transition">
               <Icon.X size={18} />
            </button>

            <div className="w-12 h-12 md:w-14 md:h-14 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4 border border-yellow-500/20">
               <Icon.Lock size={24} className="text-yellow-500 md:w-7 md:h-7" />
            </div>
            
            <h3 className="text-base md:text-xl font-black text-center text-white uppercase tracking-tighter mb-1 truncate px-2">
               {selectedPrivateRoom.name}
            </h3>
            <p className="text-gray-400 text-[9px] md:text-xs text-center mb-5 md:mb-6 uppercase tracking-widest font-bold">Phòng Riêng Tư</p>
            
            <form onSubmit={handlePasswordSubmit}>
               <input 
                 type="text" 
                 autoFocus
                 value={passwordInput}
                 onChange={(e) => { 
                   setPasswordInput(cleanPassword(e.target.value)); 
                   setPasswordError(""); 
                 }}
                 placeholder="Nhập mật khẩu..." 
                 className={`w-full bg-[#0a0a0a] border ${passwordError ? 'border-red-500 focus:border-red-500 text-red-500' : 'border-white/10 focus:border-[#E50914] text-white'} rounded-xl px-4 py-3 md:py-3.5 text-xs md:text-sm text-center font-bold outline-none transition-colors mb-2 tracking-widest`}
               />
               {passwordError && <p className="text-red-500 text-[9px] md:text-[10px] font-bold text-center mb-3 md:mb-4 uppercase tracking-widest animate-in slide-in-from-top-1">{passwordError}</p>}
               
               <button type="submit" className={`w-full text-white font-black py-3 md:py-3.5 rounded-xl uppercase tracking-widest text-[10px] md:text-xs transition transform-gpu active:scale-95 mt-3 md:mt-4 ${passwordInput.trim() ? 'bg-[#E50914] hover:bg-red-700 shadow-[0_0_15px_rgba(229,9,20,0.4)]' : 'bg-white/10 text-gray-500 cursor-not-allowed'}`}>
                 Vào Phòng
               </button>
            </form>
          </div>
        </div>
      )}

      {/* HEADER SẢNH & THANH TÌM KIẾM */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 md:mb-12 gap-4 md:gap-6 bg-[#111] p-4 md:p-8 rounded-2xl md:rounded-3xl border border-white/5 shadow-2xl">
        <div>
          <h1 className="text-xl md:text-4xl font-black uppercase tracking-tighter mb-1.5 md:mb-2 flex items-center gap-2 md:gap-3">
             <span className="w-1.5 h-6 md:h-10 bg-[#E50914] block" /> Danh Sách Phòng
          </h1>
          <p className="text-gray-400 text-[10px] md:text-sm uppercase tracking-widest font-bold">Tìm và tham gia cùng bạn bè</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3 md:gap-4 w-full lg:w-auto">
          <form onSubmit={handleJoinById} className="w-full lg:w-[350px] relative">
             <div className="absolute inset-y-0 left-3 md:left-4 flex items-center pointer-events-none">
               <Icon.Search className="text-gray-500 w-4 h-4 md:w-5 md:h-5" />
             </div>
             <input 
               value={searchTerm} 
               onChange={(e) => setSearchTerm(e.target.value)}
               placeholder="Tìm mã phòng, tên..." 
               className="w-full bg-black border border-white/10 rounded-xl md:rounded-2xl py-2.5 md:py-3.5 pl-9 md:pl-11 pr-12 md:pr-14 outline-none focus:border-[#E50914] transition text-xs md:text-sm text-white placeholder:text-gray-600 font-bold"
             />
             <button type="submit" disabled={isJoining || !searchTerm.trim()} className="absolute right-1.5 md:right-2 top-1.5 bottom-1.5 px-3 md:px-4 bg-[#E50914] rounded-lg md:rounded-xl hover:bg-red-700 transition disabled:opacity-50 flex items-center justify-center">
               {isJoining ? <Icon.Loader2 className="animate-spin w-4 h-4 md:w-5 md:h-5" /> : <Icon.ArrowRight className="w-4 h-4 md:w-5 md:h-5" />}
             </button>
          </form>
          
          <button 
            onClick={() => setShowPartyModal(true)} 
            className="w-full sm:w-auto bg-white/10 hover:bg-white/20 text-white px-5 py-2.5 md:px-6 md:py-3.5 rounded-xl md:rounded-2xl font-black uppercase tracking-widest text-[10px] md:text-xs flex justify-center items-center gap-2 transition whitespace-nowrap"
          >
            <Icon.Plus size={16} className="md:w-4 md:h-4" /> Tạo Phòng
          </button>
        </div>
      </div>

      {/* RENDER DANH SÁCH PHÒNG */}
      {loading ? (
        <div className="flex justify-center items-center h-40 md:h-64"><Icon.Loader2 className="animate-spin text-[#E50914] md:w-12 md:h-12" size={40} /></div>
      ) : filteredRooms.length === 0 ? (
        <div className="bg-[#111] border border-white/5 rounded-2xl md:rounded-3xl p-10 md:p-16 text-center flex flex-col items-center justify-center animate-in zoom-in-95 duration-500">
           <div className="w-16 h-16 md:w-24 md:h-24 bg-white/5 rounded-full flex items-center justify-center mb-4 md:mb-6">
              <Icon.Ghost className="text-gray-600 w-8 h-8 md:w-10 md:h-10" />
           </div>
           <h3 className="text-base md:text-xl font-black text-white uppercase tracking-widest mb-1 md:mb-2">Trống Trơn!</h3>
           <p className="text-gray-400 text-[10px] md:text-sm uppercase tracking-widest mb-4 md:mb-6 font-bold">Không tìm thấy phòng nào.</p>
           <button onClick={() => setShowPartyModal(true)} className="px-6 py-2.5 md:px-8 md:py-3.5 bg-[#E50914] hover:bg-red-700 text-white font-black rounded-lg md:rounded-xl uppercase tracking-widest text-[10px] md:text-xs transition shadow-lg">
              Tạo Phòng Ngay
           </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-6">
          {filteredRooms.map(room => (
            <div 
              key={room.id} 
              onClick={() => handleRoomClick(room)}
              className="bg-[#111] border border-white/5 hover:border-[#E50914]/50 rounded-xl md:rounded-2xl p-4 md:p-6 cursor-pointer transition-all duration-300 hover:shadow-[0_10px_30px_rgba(229,9,20,0.15)] hover:-translate-y-1 group relative flex flex-col h-full overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

              <div className="relative z-10 flex flex-col h-full">
                <div className="flex justify-between items-start mb-3 md:mb-5 gap-2">
                  <div className="bg-black border border-white/10 px-2 py-1 md:px-2.5 rounded-md text-[9px] md:text-[10px] font-mono text-gray-300 font-bold">
                    ID: <span className="text-white">{room.roomId}</span>
                  </div>
                  {room.isPublic ? (
                    <div className="bg-green-500/10 text-green-400 px-2 py-1 md:px-2.5 rounded-md text-[8px] md:text-[9px] font-black uppercase tracking-widest border border-green-500/20 flex items-center gap-1 shrink-0">
                       <Icon.Unlock size={8} className="md:w-2.5 md:h-2.5"/> Public
                    </div>
                  ) : (
                    <div className="bg-yellow-500/10 text-yellow-400 px-2 py-1 md:px-2.5 rounded-md text-[8px] md:text-[9px] font-black uppercase tracking-widest border border-yellow-500/20 flex items-center gap-1 shrink-0">
                       <Icon.Lock size={8} className="md:w-2.5 md:h-2.5"/> Private
                    </div>
                  )}
                </div>

                <h3 className="text-base md:text-xl font-black mb-2 md:mb-3 truncate group-hover:text-[#E50914] transition-colors tracking-tighter uppercase">{room.name}</h3>
                
                <div className="space-y-1.5 md:space-y-2 mb-4 md:mb-6">
                   <div className="flex items-center gap-2 text-[10px] md:text-xs text-gray-400 bg-white/5 p-1.5 md:p-2 rounded-lg border border-white/5">
                      <Icon.Crown size={12} className="text-yellow-500 shrink-0 md:w-3.5 md:h-3.5" />
                      <span className="truncate font-bold text-white">{room.hostName}</span>
                   </div>
                   <div className="flex items-center gap-2 text-[10px] md:text-xs text-gray-400 p-1 px-1.5 md:px-2">
                      <Icon.Film size={12} className="text-[#E50914] shrink-0 md:w-3.5 md:h-3.5" />
                      <span className="truncate uppercase tracking-widest font-bold">{String(room.movieId).replace(/-/g, ' ')}</span>
                   </div>
                </div>
                
                <div className="mt-auto pt-3 md:pt-4 border-t border-white/5 flex justify-between items-center">
                  <div className="flex items-center gap-1.5 md:gap-2 text-gray-400 text-[10px] md:text-xs font-bold bg-black px-2 py-1 rounded-md border border-white/5">
                    <Icon.Users size={10} className="text-gray-500 md:w-3 md:h-3" /> {room.viewerCount}
                  </div>
                  <span className="text-[#E50914] text-[9px] md:text-[10px] font-black uppercase tracking-widest flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all transform md:translate-x-2 md:group-hover:translate-x-0 duration-300">
                    {room.isPublic ? "Tham gia" : "Nhập Mật Khẩu"} <Icon.ChevronRight size={12} className="md:w-3.5 md:h-3.5"/>
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}