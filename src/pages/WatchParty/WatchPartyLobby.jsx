import React, { useState, useEffect } from "react";
import * as Icon from "lucide-react";
import { collection, query, onSnapshot, doc, getDoc } from "firebase/firestore";
import { db } from "../../config/firebase";

export default function WatchPartyLobby({ navigate, user, onLogin }) {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  // --- STATE CHO MODAL NHẬP MẬT KHẨU ---
  const [selectedPrivateRoom, setSelectedPrivateRoom] = useState(null);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isJoining, setIsJoining] = useState(false);

  // MÀN HÌNH CHƯA ĐĂNG NHẬP
  if (!user) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center text-white px-4 animate-in fade-in duration-500">
        <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(229,9,20,0.2)]">
           <Icon.Users size={48} className="text-[#E50914]" />
        </div>
        <h2 className="text-2xl md:text-4xl font-black mb-3 uppercase tracking-widest text-center text-white">Sảnh Xem Chung</h2>
        <p className="text-gray-400 mb-8 text-center text-sm md:text-base uppercase tracking-widest">Đăng nhập để trải nghiệm cày phim cùng hội bạn</p>
        <button onClick={onLogin} className="bg-[#E50914] px-8 py-3.5 rounded-full font-black flex items-center gap-3 hover:bg-red-700 transition transform-gpu hover:scale-105 active:scale-95 shadow-[0_10px_25px_rgba(229,9,20,0.4)] text-sm md:text-base uppercase tracking-widest">
          <Icon.User size={20} /> Bắt đầu ngay
        </button>
      </div>
    );
  }

  // LOAD DANH SÁCH PHÒNG TỪ FIREBASE
  useEffect(() => {
    // Bỏ điều kiện where() để lấy cả phòng Public lẫn Private
    const q = query(collection(db, "rooms"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let roomList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sắp xếp phòng mới nhất lên đầu
      roomList.sort((a, b) => {
         const timeA = a.createdAt?.toMillis() || 0;
         const timeB = b.createdAt?.toMillis() || 0;
         return timeB - timeA;
      });
      setRooms(roomList);
      setLoading(false);
    }, (error) => {
      console.error("Lỗi tải phòng:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // XỬ LÝ CLICK VÀO PHÒNG
  const handleRoomClick = (room) => {
    // Nếu là phòng Công khai HOẶC mình chính là Chủ phòng -> Vào luôn
    if (room.isPublic || room.hostId === user.uid) {
       navigate({ type: "watch-room", roomId: room.roomId, slug: room.movieId });
    } else {
       // Phòng Riêng tư -> Mở Popup
       setSelectedPrivateRoom(room);
       setPasswordInput("");
       setPasswordError("");
    }
  };

  // XỬ LÝ TÌM PHÒNG BẰNG ID HOẶC TÊN (Nút Enter ở thanh Search)
  const handleJoinById = async (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;
    
    const cleanId = searchTerm.trim().toUpperCase();
    
    // Tìm trong danh sách hiện tại trước
    const foundRoom = rooms.find(r => r.roomId === cleanId);
    if (foundRoom) {
       return handleRoomClick(foundRoom);
    }

    // Nếu không thấy, thử query trực tiếp lên Firebase
    setIsJoining(true);
    try {
        const roomRef = doc(db, "rooms", cleanId);
        const snap = await getDoc(roomRef);
        if (!snap.exists()) {
            alert("Không tìm thấy phòng có mã này!");
        } else {
            handleRoomClick(snap.data());
        }
    } catch(err) {
        alert("Lỗi kết nối!");
    }
    setIsJoining(false);
  };

  // XỬ LÝ SUBMIT MẬT KHẨU
  const handlePasswordSubmit = (e) => {
     e.preventDefault();
     if (!selectedPrivateRoom) return;

     if (passwordInput === selectedPrivateRoom.password) {
        navigate({ type: "watch-room", roomId: selectedPrivateRoom.roomId, slug: selectedPrivateRoom.movieId });
     } else {
        setPasswordError("Mật khẩu không chính xác!");
     }
  };

  // Lọc phòng theo ô tìm kiếm
  const filteredRooms = rooms.filter(r => 
    r.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    r.roomId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.movieId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="pt-24 md:pt-32 pb-20 max-w-[1400px] mx-auto px-4 md:px-12 text-white animate-in fade-in duration-500 min-h-screen relative">
      
      {/* POPUP NHẬP MẬT KHẨU CHO PHÒNG PRIVATE */}
      {selectedPrivateRoom && (
        <div className="fixed inset-0 z-[999] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#111] border border-white/10 p-6 md:p-8 rounded-3xl max-w-sm w-full shadow-[0_20px_60px_rgba(0,0,0,0.8)] animate-in zoom-in-95 duration-300 relative">
            <button onClick={() => setSelectedPrivateRoom(null)} className="absolute top-5 right-5 text-gray-500 hover:text-white transition">
               <Icon.X size={20} />
            </button>

            <div className="w-14 h-14 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-yellow-500/20">
               <Icon.Lock size={28} className="text-yellow-500" />
            </div>
            
            <h3 className="text-lg md:text-xl font-black text-center text-white uppercase tracking-tighter mb-1 truncate px-4">
               {selectedPrivateRoom.name}
            </h3>
            <p className="text-gray-400 text-[10px] md:text-xs text-center mb-6 uppercase tracking-widest font-bold">Phòng Riêng Tư</p>
            
            <form onSubmit={handlePasswordSubmit}>
               <input 
                 type="text" 
                 autoFocus
                 value={passwordInput}
                 onChange={(e) => { setPasswordInput(e.target.value); setPasswordError(""); }}
                 placeholder="Nhập mật khẩu..." 
                 className={`w-full bg-[#0a0a0a] border ${passwordError ? 'border-red-500 focus:border-red-500 text-red-500' : 'border-white/10 focus:border-[#E50914] text-white'} rounded-xl px-4 py-3.5 text-sm text-center outline-none transition-colors mb-2 tracking-widest`}
               />
               {passwordError && <p className="text-red-500 text-[10px] font-bold text-center mb-4 uppercase tracking-widest animate-in slide-in-from-top-1">{passwordError}</p>}
               
               <button type="submit" className={`w-full text-white font-black py-3.5 rounded-xl uppercase tracking-widest text-xs transition transform-gpu active:scale-95 mt-4 ${passwordInput.trim() ? 'bg-[#E50914] hover:bg-red-700 shadow-[0_0_15px_rgba(229,9,20,0.4)]' : 'bg-white/10 text-gray-500 cursor-not-allowed'}`}>
                 Vào Phòng
               </button>
            </form>
          </div>
        </div>
      )}

      {/* HEADER SẢNH & THANH TÌM KIẾM */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 md:mb-12 gap-6 bg-[#111] p-6 md:p-8 rounded-3xl border border-white/5 shadow-2xl">
        <div>
          <h1 className="text-2xl md:text-4xl font-black uppercase tracking-tighter mb-2 flex items-center gap-3">
             <span className="w-1.5 h-8 md:h-10 bg-[#E50914] block" /> Danh Sách Phòng
          </h1>
          <p className="text-gray-400 text-xs md:text-sm uppercase tracking-widest font-bold">Tìm và tham gia cùng bạn bè</p>
        </div>
        
        <form onSubmit={handleJoinById} className="w-full lg:w-[400px] relative">
           <Icon.Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
           <input 
             value={searchTerm} 
             onChange={(e) => setSearchTerm(e.target.value)}
             placeholder="Tìm mã phòng, tên, phim..." 
             className="w-full bg-black border border-white/10 rounded-2xl py-3.5 pl-12 pr-14 outline-none focus:border-[#E50914] transition text-sm text-white placeholder:text-gray-600"
           />
           <button type="submit" disabled={isJoining || !searchTerm.trim()} className="absolute right-2 top-1.5 bottom-1.5 px-3 bg-[#E50914] rounded-xl hover:bg-red-700 transition disabled:opacity-50 flex items-center justify-center">
             {isJoining ? <Icon.Loader2 size={18} className="animate-spin" /> : <Icon.ArrowRight size={18} />}
           </button>
        </form>
      </div>

      {/* RENDER DANH SÁCH PHÒNG */}
      {loading ? (
        <div className="flex justify-center items-center h-64"><Icon.Loader2 className="animate-spin text-[#E50914]" size={48} /></div>
      ) : filteredRooms.length === 0 ? (
        <div className="bg-[#111] border border-white/5 rounded-3xl p-16 text-center flex flex-col items-center justify-center animate-in zoom-in-95 duration-500">
           <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-6">
              <Icon.Ghost size={40} className="text-gray-600" />
           </div>
           <h3 className="text-xl font-black text-white uppercase tracking-widest mb-2">Trống Trơn!</h3>
           <p className="text-gray-400 text-sm uppercase tracking-widest mb-6">Không tìm thấy phòng nào đang mở.</p>
           <button onClick={() => navigate({type: 'home'})} className="px-6 py-3 bg-white/5 hover:bg-[#E50914] text-white font-bold rounded-xl uppercase tracking-widest text-xs transition border border-white/10 hover:border-transparent">
              Về Trang Chủ Chọn Phim
           </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
          {filteredRooms.map(room => (
            <div 
              key={room.id} 
              onClick={() => handleRoomClick(room)}
              className="bg-[#111] border border-white/5 hover:border-[#E50914]/50 rounded-2xl p-5 md:p-6 cursor-pointer transition-all duration-300 hover:shadow-[0_10px_30px_rgba(229,9,20,0.15)] hover:-translate-y-1 group relative flex flex-col h-full overflow-hidden"
            >
              {/* Hiệu ứng ánh sáng góc chéo */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

              <div className="relative z-10 flex flex-col h-full">
                {/* BADGES */}
                <div className="flex justify-between items-start mb-5 gap-2">
                  <div className="bg-black border border-white/10 px-2.5 py-1 rounded-md text-[10px] font-mono text-gray-300 font-bold">
                    ID: <span className="text-white">{room.roomId}</span>
                  </div>
                  {room.isPublic ? (
                    <div className="bg-green-500/10 text-green-400 px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border border-green-500/20 flex items-center gap-1.5 shrink-0">
                       <Icon.Unlock size={10} /> Public
                    </div>
                  ) : (
                    <div className="bg-yellow-500/10 text-yellow-400 px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border border-yellow-500/20 flex items-center gap-1.5 shrink-0">
                       <Icon.Lock size={10} /> Private
                    </div>
                  )}
                </div>

                {/* THÔNG TIN CHÍNH */}
                <h3 className="text-lg md:text-xl font-black mb-3 truncate group-hover:text-[#E50914] transition-colors tracking-tighter uppercase">{room.name}</h3>
                
                <div className="space-y-2 mb-6">
                   <div className="flex items-center gap-2.5 text-xs text-gray-400 bg-white/5 p-2 rounded-lg border border-white/5">
                      <Icon.Crown size={14} className="text-yellow-500 shrink-0" />
                      <span className="truncate font-bold text-white">{room.hostName}</span>
                   </div>
                   <div className="flex items-center gap-2.5 text-xs text-gray-400 p-1 px-2">
                      <Icon.Film size={14} className="text-[#E50914] shrink-0" />
                      <span className="truncate uppercase tracking-widest">{String(room.movieId).replace(/-/g, ' ')}</span>
                   </div>
                </div>
                
                {/* FOOTER CARD */}
                <div className="mt-auto pt-4 border-t border-white/5 flex justify-between items-center">
                  <div className="flex items-center gap-2 text-gray-400 text-xs font-bold bg-black px-2 py-1 rounded-md border border-white/5">
                    <Icon.Users size={12} className="text-gray-500" /> {room.viewerCount}
                  </div>
                  <span className="text-[#E50914] text-[10px] font-black uppercase tracking-widest flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0 duration-300">
                    {room.isPublic ? "Tham gia" : "Nhập Mật Khẩu"} <Icon.ChevronRight size={14} />
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