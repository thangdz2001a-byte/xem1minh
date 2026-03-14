import React, { useState, useEffect } from "react";
import * as Icon from "lucide-react";
import { supabase } from "../../utils/supabaseClient"; 
import { YEARS } from "../../utils/helpers";
import SearchModal from "../common/SearchModal";
import DropdownGrid from "../common/DropdownGrid";

// ==========================================
// 1. CÁC COMPONENT SVG AVATAR ĐỘNG VẬT (10 CON)
// ==========================================
const ShibaAvatar = ({ className }) => (
  <svg viewBox="0 0 100 100" className={className}>
    <path d="M 25 45 L 12 15 L 45 25 Z" fill="#E59A54" stroke="#111" strokeWidth="3" strokeLinejoin="round"/>
    <path d="M 75 45 L 88 15 L 55 25 Z" fill="#E59A54" stroke="#111" strokeWidth="3" strokeLinejoin="round"/>
    <circle cx="50" cy="55" r="38" fill="#E59A54" stroke="#111" strokeWidth="3"/>
    <path d="M 50 93 C 15 93 12 55 12 55 C 30 55 40 40 50 55 C 60 40 70 55 88 55 C 88 55 85 93 50 93 Z" fill="#FFF" stroke="#111" strokeWidth="3" strokeLinejoin="round"/>
    <circle cx="33" cy="48" r="5" fill="#111"/>
    <circle cx="31" cy="46" r="1.5" fill="#FFF"/>
    <circle cx="67" cy="48" r="5" fill="#111"/>
    <circle cx="65" cy="46" r="1.5" fill="#FFF"/>
    <ellipse cx="50" cy="62" rx="6" ry="4" fill="#111"/>
    <path d="M 43 70 Q 50 75 57 70" fill="none" stroke="#111" strokeWidth="3" strokeLinecap="round"/>
  </svg>
);

const HuskyAvatar = ({ className }) => (
  <svg viewBox="0 0 100 100" className={className}>
    <path d="M 28 45 L 18 12 L 45 28 Z" fill="#374151" stroke="#111" strokeWidth="3" strokeLinejoin="round"/>
    <path d="M 72 45 L 82 12 L 55 28 Z" fill="#374151" stroke="#111" strokeWidth="3" strokeLinejoin="round"/>
    <path d="M 28 40 L 22 18 L 40 28 Z" fill="#E5E7EB"/>
    <path d="M 72 40 L 78 18 L 60 28 Z" fill="#E5E7EB"/>
    <circle cx="50" cy="55" r="38" fill="#374151" stroke="#111" strokeWidth="3"/>
    <path d="M 50 93 C 15 93 12 55 12 55 C 30 55 40 35 50 55 C 60 35 70 55 88 55 C 88 55 85 93 50 93 Z" fill="#F3F4F6" stroke="#111" strokeWidth="3" strokeLinejoin="round"/>
    <circle cx="35" cy="36" r="3.5" fill="#F3F4F6"/>
    <circle cx="65" cy="36" r="3.5" fill="#F3F4F6"/>
    <circle cx="33" cy="48" r="5" fill="#111"/>
    <circle cx="31" cy="46" r="1.5" fill="#FFF"/>
    <circle cx="67" cy="48" r="5" fill="#111"/>
    <circle cx="65" cy="46" r="1.5" fill="#FFF"/>
    <ellipse cx="50" cy="64" rx="6" ry="4" fill="#111"/>
    <path d="M 43 72 Q 50 77 57 72" fill="none" stroke="#111" strokeWidth="3" strokeLinecap="round"/>
  </svg>
);

const PugAvatar = ({ className }) => (
  <svg viewBox="0 0 100 100" className={className}>
    <path d="M 25 30 Q 5 30 15 55 Q 25 45 35 35 Z" fill="#111" stroke="#111" strokeWidth="3" strokeLinejoin="round"/>
    <path d="M 75 30 Q 95 30 85 55 Q 75 45 65 35 Z" fill="#111" stroke="#111" strokeWidth="3" strokeLinejoin="round"/>
    <circle cx="50" cy="55" r="38" fill="#D4A373" stroke="#111" strokeWidth="3"/>
    <path d="M 40 28 Q 50 33 60 28" fill="none" stroke="#111" strokeWidth="2.5" strokeLinecap="round"/>
    <ellipse cx="50" cy="62" rx="22" ry="18" fill="#222" stroke="#111" strokeWidth="3"/>
    <circle cx="32" cy="52" r="6" fill="#111"/>
    <circle cx="30" cy="50" r="2" fill="#FFF"/>
    <circle cx="68" cy="52" r="6" fill="#111"/>
    <circle cx="66" cy="50" r="2" fill="#FFF"/>
    <ellipse cx="50" cy="62" rx="5" ry="3" fill="#111"/>
    <path d="M 45 70 Q 50 74 55 70" fill="none" stroke="#FFF" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const GoldenAvatar = ({ className }) => (
  <svg viewBox="0 0 100 100" className={className}>
    <path d="M 28 35 C 5 35 5 75 20 70 C 25 68 35 50 35 40 Z" fill="#C98A4B" stroke="#111" strokeWidth="3" strokeLinejoin="round"/>
    <path d="M 72 35 C 95 35 95 75 80 70 C 75 68 65 50 65 40 Z" fill="#C98A4B" stroke="#111" strokeWidth="3" strokeLinejoin="round"/>
    <circle cx="50" cy="55" r="38" fill="#E8A864" stroke="#111" strokeWidth="3"/>
    <circle cx="50" cy="68" r="16" fill="#FDE0B6" stroke="#111" strokeWidth="3"/>
    <circle cx="34" cy="46" r="4.5" fill="#111"/>
    <circle cx="32" cy="44" r="1.5" fill="#FFF"/>
    <circle cx="66" cy="46" r="4.5" fill="#111"/>
    <circle cx="64" cy="44" r="1.5" fill="#FFF"/>
    <ellipse cx="50" cy="64" rx="7" ry="5" fill="#111"/>
    <path d="M 43 72 Q 50 78 57 72" fill="none" stroke="#111" strokeWidth="3" strokeLinecap="round"/>
  </svg>
);

const CatAvatar = ({ className }) => (
  <svg viewBox="0 0 100 100" className={className}>
    <path d="M 25 45 L 15 15 L 45 25 Z" fill="#F97316" stroke="#111" strokeWidth="3" strokeLinejoin="round"/>
    <path d="M 75 45 L 85 15 L 55 25 Z" fill="#F97316" stroke="#111" strokeWidth="3" strokeLinejoin="round"/>
    <path d="M 25 40 L 19 22 L 38 27 Z" fill="#FDBA74" />
    <path d="M 75 40 L 81 22 L 62 27 Z" fill="#FDBA74" />
    <circle cx="50" cy="55" r="38" fill="#F97316" stroke="#111" strokeWidth="3"/>
    <path d="M 50 17 L 50 32" stroke="#C2410C" strokeWidth="4" strokeLinecap="round"/>
    <path d="M 40 20 L 43 32" stroke="#C2410C" strokeWidth="4" strokeLinecap="round"/>
    <path d="M 60 20 L 57 32" stroke="#C2410C" strokeWidth="4" strokeLinecap="round"/>
    <circle cx="50" cy="65" r="15" fill="#FFF" stroke="#111" strokeWidth="3"/>
    <circle cx="33" cy="48" r="5" fill="#111"/>
    <circle cx="31" cy="46" r="1.5" fill="#FFF"/>
    <circle cx="67" cy="48" r="5" fill="#111"/>
    <circle cx="65" cy="46" r="1.5" fill="#FFF"/>
    <path d="M 47 62 L 53 62 L 50 66 Z" fill="#F472B6" stroke="#111" strokeWidth="2" strokeLinejoin="round"/>
    <path d="M 45 72 Q 50 76 55 72" fill="none" stroke="#111" strokeWidth="2" strokeLinecap="round"/>
    <path d="M 15 55 L 28 58 M 12 62 L 26 63" stroke="#111" strokeWidth="2" strokeLinecap="round"/>
    <path d="M 85 55 L 72 58 M 88 62 L 74 63" stroke="#111" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const PandaAvatar = ({ className }) => (
  <svg viewBox="0 0 100 100" className={className}>
    <circle cx="22" cy="25" r="14" fill="#111" stroke="#111" strokeWidth="3"/>
    <circle cx="78" cy="25" r="14" fill="#111" stroke="#111" strokeWidth="3"/>
    <circle cx="50" cy="55" r="38" fill="#FFF" stroke="#111" strokeWidth="3"/>
    <ellipse cx="32" cy="52" rx="12" ry="16" transform="rotate(-25 32 52)" fill="#111"/>
    <ellipse cx="68" cy="52" rx="12" ry="16" transform="rotate(25 68 52)" fill="#111"/>
    <circle cx="32" cy="48" r="4" fill="#FFF"/>
    <circle cx="30" cy="46" r="1.5" fill="#FFF"/>
    <circle cx="68" cy="48" r="4" fill="#FFF"/>
    <circle cx="66" cy="46" r="1.5" fill="#FFF"/>
    <ellipse cx="50" cy="68" rx="7" ry="4" fill="#111"/>
    <path d="M 44 76 Q 50 80 56 76" fill="none" stroke="#111" strokeWidth="3" strokeLinecap="round"/>
  </svg>
);

const FoxAvatar = ({ className }) => (
  <svg viewBox="0 0 100 100" className={className}>
    <path d="M 25 55 L 10 15 L 45 35 Z" fill="#EA580C" stroke="#111" strokeWidth="3" strokeLinejoin="round"/>
    <path d="M 75 55 L 90 15 L 55 35 Z" fill="#EA580C" stroke="#111" strokeWidth="3" strokeLinejoin="round"/>
    <path d="M 23 45 L 17 22 L 35 34 Z" fill="#FDBA74"/>
    <path d="M 77 45 L 83 22 L 65 34 Z" fill="#FDBA74"/>
    <path d="M 12 55 Q 50 105 88 55 Q 50 25 12 55 Z" fill="#EA580C" stroke="#111" strokeWidth="3" strokeLinejoin="round"/>
    <path d="M 12 55 Q 50 100 50 75 Q 30 65 12 55 Z" fill="#FFF" strokeLinejoin="round"/>
    <path d="M 88 55 Q 50 100 50 75 Q 70 65 88 55 Z" fill="#FFF" strokeLinejoin="round"/>
    <circle cx="35" cy="50" r="5" fill="#111"/>
    <circle cx="33" cy="48" r="1.5" fill="#FFF"/>
    <circle cx="65" cy="50" r="5" fill="#111"/>
    <circle cx="63" cy="48" r="1.5" fill="#FFF"/>
    <circle cx="50" cy="72" r="5" fill="#111"/>
  </svg>
);

const BearAvatar = ({ className }) => (
  <svg viewBox="0 0 100 100" className={className}>
    <circle cx="25" cy="30" r="15" fill="#8B5A2B" stroke="#111" strokeWidth="3"/>
    <circle cx="75" cy="30" r="15" fill="#8B5A2B" stroke="#111" strokeWidth="3"/>
    <circle cx="25" cy="30" r="8" fill="#D2B48C"/>
    <circle cx="75" cy="30" r="8" fill="#D2B48C"/>
    <circle cx="50" cy="60" r="35" fill="#8B5A2B" stroke="#111" strokeWidth="3"/>
    <circle cx="50" cy="70" r="16" fill="#D2B48C" stroke="#111" strokeWidth="3"/>
    <circle cx="35" cy="50" r="4.5" fill="#111"/>
    <circle cx="33" cy="48" r="1.5" fill="#FFF"/>
    <circle cx="65" cy="50" r="4.5" fill="#111"/>
    <circle cx="63" cy="48" r="1.5" fill="#FFF"/>
    <ellipse cx="50" cy="65" rx="7" ry="4" fill="#111"/>
    <path d="M 45 74 Q 50 78 55 74" fill="none" stroke="#111" strokeWidth="3" strokeLinecap="round"/>
  </svg>
);

const RabbitAvatar = ({ className }) => (
  <svg viewBox="0 0 100 100" className={className}>
    <ellipse cx="35" cy="30" rx="10" ry="25" transform="rotate(-15 35 30)" fill="#E2E8F0" stroke="#111" strokeWidth="3"/>
    <ellipse cx="65" cy="30" rx="10" ry="25" transform="rotate(15 65 30)" fill="#E2E8F0" stroke="#111" strokeWidth="3"/>
    <ellipse cx="35" cy="30" rx="4" ry="18" transform="rotate(-15 35 30)" fill="#FBCFE8"/>
    <ellipse cx="65" cy="30" rx="4" ry="18" transform="rotate(15 65 30)" fill="#FBCFE8"/>
    <ellipse cx="50" cy="65" rx="35" ry="28" fill="#E2E8F0" stroke="#111" strokeWidth="3"/>
    <circle cx="35" cy="60" r="5" fill="#111"/>
    <circle cx="33" cy="58" r="1.5" fill="#FFF"/>
    <circle cx="65" cy="60" r="5" fill="#111"/>
    <circle cx="63" cy="58" r="1.5" fill="#FFF"/>
    <ellipse cx="50" cy="68" rx="4" ry="3" fill="#F472B6"/>
    <path d="M 45 75 Q 50 78 55 75" fill="none" stroke="#111" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const FrogAvatar = ({ className }) => (
  <svg viewBox="0 0 100 100" className={className}>
    <circle cx="30" cy="35" r="14" fill="#22C55E" stroke="#111" strokeWidth="3"/>
    <circle cx="70" cy="35" r="14" fill="#22C55E" stroke="#111" strokeWidth="3"/>
    <circle cx="30" cy="35" r="8" fill="#FFF" stroke="#111" strokeWidth="2"/>
    <circle cx="70" cy="35" r="8" fill="#FFF" stroke="#111" strokeWidth="2"/>
    <circle cx="32" cy="35" r="4" fill="#111"/>
    <circle cx="72" cy="35" r="4" fill="#111"/>
    <circle cx="33" cy="34" r="1.5" fill="#FFF"/>
    <circle cx="73" cy="34" r="1.5" fill="#FFF"/>
    <ellipse cx="50" cy="65" rx="40" ry="28" fill="#22C55E" stroke="#111" strokeWidth="3"/>
    <path d="M 25 65 Q 50 85 75 65" fill="none" stroke="#111" strokeWidth="3" strokeLinecap="round"/>
    <ellipse cx="20" cy="65" rx="4" ry="2" fill="#16A34A"/>
    <ellipse cx="80" cy="65" rx="4" ry="2" fill="#16A34A"/>
  </svg>
);

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

// ==========================================
// 2. COMPONENT CHÍNH (HEADER)
// ==========================================
export default function Header({ navigate, categories, countries, user, onLogin, onLogout, onUpdateName }) {
  const [scrolled, setScrolled] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  
  const [showNameModal, setShowNameModal] = useState(false);
  const [editName, setEditName] = useState("");

  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [customAvatarId, setCustomAvatarId] = useState(null); 
  const [tempAvatarId, setTempAvatarId] = useState(null); 

  // FIX LỖI 406 CHÍ MẠNG: Dùng .limit(1) thay vì single()
  useEffect(() => {
    const fetchAvatarFromSupabase = async () => {
      // BỘ LỌC CHẶN: CHỈ GỌI KHI CÓ USER ID
      if (user && user.uid) {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('avatar')
            .eq('user_id', user.uid)
            .limit(1); // Cứu tinh chống lỗi 406
            
          if (data && data.length > 0 && data[0].avatar) {
            setCustomAvatarId(data[0].avatar);
          } else {
            setCustomAvatarId(null);
          }
        } catch (error) {
          console.error("Lỗi tải avatar:", error);
        }
      } else {
        setCustomAvatarId(null);
      }
    };
    fetchAvatarFromSupabase();
  }, [user]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleOpenNameModal = () => {
    setEditName(user?.displayName || "");
    setShowProfile(false);
    setShowNameModal(true);
  };

  const handleSubmitName = (e) => {
    e.preventDefault();
    if (editName.trim() && editName.trim() !== user.displayName) {
      if (onUpdateName) onUpdateName(editName.trim());
    }
    setShowNameModal(false);
  };

  const handleOpenAvatarModal = () => {
    setTempAvatarId(customAvatarId);
    setShowProfile(false);
    setShowAvatarModal(true);
  };

  const handleConfirmAvatar = async () => {
    setCustomAvatarId(tempAvatarId);
    setShowAvatarModal(false);
    
    if (user && user.uid) {
      try {
        await supabase
          .from('profiles')
          .upsert({ user_id: user.uid, avatar: tempAvatarId || null }, { onConflict: 'user_id' });
      } catch (error) {
        console.error("Lỗi đồng bộ avatar:", error);
      }
    }
  };

  const activeAvatar = avatarsList.find(a => a.id === customAvatarId);
  const tempAvatarData = avatarsList.find(a => a.id === tempAvatarId);

  return (
    <>
      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} navigate={navigate} />
      
      {/* MODAL ĐỔI TÊN HIỂN THỊ */}
      {showNameModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <form onSubmit={handleSubmitName} className="w-full max-w-md bg-[#111] border border-white/10 rounded-2xl p-6 shadow-2xl relative animate-in zoom-in-95 duration-200">
            <button 
              type="button" 
              onClick={() => setShowNameModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white bg-black/50 p-2 rounded-full transition"
            >
              <Icon.X size={20} />
            </button>
            <h2 className="text-white text-lg font-black tracking-widest uppercase mb-4 flex items-center gap-2">
              <Icon.Edit3 size={18} className="text-[#E50914]"/> ĐỔI TÊN HIỂN THỊ
            </h2>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder
              autoFocus
              maxLength={25}
              className="w-full bg-[#222] border border-white/10 rounded-xl p-4 text-white outline-none focus:border-[#E50914] transition-colors mb-6 font-bold"
            />
            <div className="flex justify-end gap-3">
              <button 
                type="button" 
                onClick={() => setShowNameModal(false)} 
                className="px-5 py-2.5 text-sm font-bold text-gray-400 hover:text-white transition uppercase tracking-widest"
              >
                Hủy
              </button>
              <button 
                type="submit" 
                className="px-6 py-2.5 bg-[#E50914] hover:bg-red-700 text-white text-sm font-black rounded-xl transition uppercase tracking-widest shadow-[0_4px_15px_rgba(229,9,20,0.4)]"
              >
                Lưu Thay Đổi
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL CHỌN AVATAR (GRID 10 CON) */}
      {showAvatarModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-[800px] bg-[#111] border border-white/10 rounded-2xl p-5 sm:p-8 shadow-2xl relative animate-in zoom-in-95 duration-200">
            <button 
              onClick={() => setShowAvatarModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white bg-black/50 p-2 rounded-full transition"
            >
              <Icon.X size={20} />
            </button>

            <h2 className="text-gray-300 text-sm md:text-base font-black tracking-widest uppercase mb-6 flex items-center gap-2">
              <Icon.Image size={20} className="text-[#E50914]"/> CHỌN AVATAR ĐỘNG VẬT
            </h2>
            
            {/* LƯỚI 5 CỘT */}
            <div className="grid grid-cols-5 gap-3 sm:gap-6 mb-8 place-items-center">
              {avatarsList.map((avatar) => {
                const isSelected = tempAvatarId === avatar.id;
                return (
                  <div
                    key={avatar.id}
                    onClick={() => setTempAvatarId(avatar.id)}
                    className={`
                      relative cursor-pointer transition-all duration-300 ease-out flex-shrink-0
                      w-14 h-14 sm:w-20 sm:h-20 lg:w-24 lg:h-24 rounded-full p-1.5 sm:p-2
                      ${avatar.bgColor}
                      ${isSelected 
                        ? 'scale-110 border-[3px] sm:border-[4px] border-[#E50914] shadow-[0_0_20px_rgba(229,9,20,0.6)] z-10' 
                        : 'border-2 border-transparent hover:scale-105 opacity-70 hover:opacity-100'
                      }
                    `}
                  >
                    <avatar.Component className="w-full h-full object-contain drop-shadow-md" />
                  </div>
                );
              })}
            </div>

            <div className="border-t border-white/10 pt-5 flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
                <p className="text-gray-400 text-sm order-2 md:order-1">
                  Đang chọn: <strong className="text-white capitalize">{tempAvatarData ? tempAvatarData.name : 'Ảnh Google'}</strong>
                </p>
                <button 
                  onClick={() => setTempAvatarId(null)}
                  className={`order-1 md:order-2 text-xs font-bold tracking-widest uppercase px-4 py-2.5 rounded-lg transition-colors border ${tempAvatarId === null ? 'bg-white/10 border-white text-white' : 'bg-transparent border-white/20 text-gray-400 hover:bg-white/5'}`}
                >
                  Dùng ảnh Google
                </button>
              </div>

              <div className="flex gap-3 w-full md:w-auto mt-4 md:mt-0">
                <button 
                  onClick={() => setShowAvatarModal(false)}
                  className="flex-1 md:flex-none px-6 py-3 text-xs font-bold text-gray-400 hover:text-white transition uppercase tracking-widest bg-white/5 hover:bg-white/10 rounded-xl"
                >
                  Hủy
                </button>
                <button 
                  onClick={handleConfirmAvatar}
                  className="flex-1 md:flex-none px-8 py-3 bg-[#E50914] hover:bg-red-700 text-white text-xs font-black rounded-xl transition uppercase tracking-widest shadow-[0_4px_15px_rgba(229,9,20,0.4)]"
                >
                  Xác Nhận
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ĐÃ THÊM pt-[env(safe-area-inset-top)] VÀO MỘT DIV BỌC TRONG HEADER ĐỂ TRÁNH GÂY LỖI PADDING CŨ CỦA SẾP */}
      <header className={`fixed top-0 w-full z-[100] transition-all duration-300 transform-gpu ${scrolled ? "bg-[#050505]/95 backdrop-blur-md border-b border-white/5 py-2 md:py-3 shadow-2xl" : "bg-transparent py-4 md:py-5"}`}>
        <div className="pt-[env(safe-area-inset-top)]">
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
              
              <button onClick={() => navigate({ type: "watch-party-lobby" })} className="relative font-black tracking-widest text-gray-300 hover:text-[#E50914] transition-colors duration-300 uppercase py-4 px-2 group flex items-center gap-1.5">
                <Icon.Users size={16} /> <span className="hidden lg:inline">Xem Chung</span>
              </button>
            </nav>

            <div className="flex items-center gap-3 md:gap-5 shrink-0">
              <div onClick={() => setIsSearchOpen(true)} className="hidden lg:flex relative group cursor-pointer transform-gpu">
                <div className="bg-black/30 border border-white/10 px-4 py-2 pl-10 rounded-full w-48 lg:w-72 text-xs lg:text-sm text-gray-400 group-hover:bg-black/60 transition-all backdrop-blur-md flex items-center">Tìm kiếm phim...</div>
                <Icon.Search className="absolute left-3.5 top-2 lg:top-2.5 text-gray-400 group-hover:text-white transition" size={16} />
              </div>
              <button onClick={() => setIsSearchOpen(true)} className="lg:hidden p-1.5"><Icon.Search size={20} className="text-white" /></button>

              <div className="relative">
                {user ? (
                  <div 
                    className={`w-8 h-8 md:w-10 md:h-10 rounded-full border-2 border-[#E50914] overflow-hidden cursor-pointer flex items-center justify-center transition-transform hover:scale-110 ${activeAvatar ? activeAvatar.bgColor : 'bg-black'}`}
                    onClick={() => setShowProfile(!showProfile)}
                  >
                    {activeAvatar ? (
                      <activeAvatar.Component className="w-[85%] h-[85%] object-contain drop-shadow-sm" />
                    ) : (
                      <img src={user.photoURL} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    )}
                  </div>
                ) : (
                  <button 
                    onClick={onLogin} 
                    className="bg-[#E50914] text-white text-[10px] md:text-xs font-bold px-3 py-1.5 md:px-4 md:py-2 rounded flex items-center gap-2 hover:bg-red-700 transition"
                  >
                    <Icon.User size={14} /> <span className="hidden md:block">ĐĂNG NHẬP</span>
                  </button>
                )}

                {user && showProfile && (
                  <div className="absolute right-0 top-full mt-2 w-56 bg-[#111] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200">
                    <div className="px-4 py-3 border-b border-white/10 bg-white/5 flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full border border-white/20 overflow-hidden flex-shrink-0 flex items-center justify-center ${activeAvatar ? activeAvatar.bgColor : 'bg-black'}`}>
                         {activeAvatar ? <activeAvatar.Component className="w-[85%] h-[85%] object-contain" /> : <img src={user.photoURL} className="w-full h-full object-cover" referrerPolicy="no-referrer" alt="Avatar" />}
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-sm font-bold text-white truncate">{user.displayName}</p>
                        <p className="text-[10px] text-gray-400 truncate">{user.email}</p>
                      </div>
                    </div>
                    
                    <button onClick={handleOpenAvatarModal} className="w-full text-left px-4 py-3 text-sm text-gray-300 hover:text-white hover:bg-white/5 flex items-center gap-3 transition-colors">
                      <Icon.Image size={16} /> Đổi Avatar 
                    </button>

                    <button onClick={handleOpenNameModal} className="w-full text-left px-4 py-3 text-sm text-gray-300 hover:text-white hover:bg-white/5 flex items-center gap-3 transition-colors">
                      <Icon.Edit3 size={16} /> Đổi tên hiển thị
                    </button>
                    
                    <button onClick={() => { setShowProfile(false); navigate({ type: "history" }); }} className="w-full text-left px-4 py-3 text-sm text-gray-300 hover:text-[#E50914] hover:bg-white/5 flex items-center gap-3 transition-colors">
                      <Icon.Clock size={16} /> Phim đã xem
                    </button>
                    
                    <button onClick={() => { setShowProfile(false); navigate({ type: "favorites" }); }} className="w-full text-left px-4 py-3 text-sm text-gray-300 hover:text-[#E50914] hover:bg-white/5 flex items-center gap-3 transition-colors">
                      <Icon.Heart size={16} /> Phim yêu thích
                    </button>

                    <button onClick={() => { setShowProfile(false); navigate({ type: "watch-party-lobby" }); }} className="w-full text-left px-4 py-3 text-sm text-gray-300 hover:text-[#E50914] hover:bg-white/5 flex md:hidden items-center gap-3 transition-colors border-t border-white/5">
                      <Icon.Users size={16} /> Phòng xem chung
                    </button>

                    <button 
                      onClick={() => { setShowProfile(false); onLogout(); }}
                      className="w-full text-left px-4 py-3 text-sm text-gray-300 hover:text-red-500 hover:bg-red-500/10 flex items-center gap-3 border-t border-white/10 transition-colors"
                    >
                      <Icon.LogOut size={16} /> Đăng xuất
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>
    </>
  );
}