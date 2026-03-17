import React, { useState, useEffect } from "react";
import * as Icon from "lucide-react";
import { supabase } from "../../utils/supabaseClient";

// ==========================================
// 1. CÁC COMPONENT SVG AVATAR ĐỘNG VẬT
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


const BAD_WORDS = ["đm", "địt", "lồn", "cặc", "phò", "chó", "ngu", "bet88", "cá cược"];

export default function CommentSection({ slug, user, onLogin }) {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // State cho tính năng Reply
  const [replyingTo, setReplyingTo] = useState(null); 
  const [replyText, setReplyText] = useState("");

  // ĐÃ THÊM: State lưu avatar hiện tại của user đang đăng nhập
  const [currentUserAvatar, setCurrentUserAvatar] = useState(null);

  // ĐÃ THÊM: Tự động fetch avatar mới nhất của user đang đăng nhập từ DB
  useEffect(() => {
    const fetchCurrentProfile = async () => {
      if (user && (user.uid || user.id)) {
        try {
          const { data } = await supabase
            .from('profiles')
            .select('avatar')
            .eq('user_id', user.uid || user.id)
            .limit(1);
          if (data && data.length > 0) {
            setCurrentUserAvatar(data[0].avatar);
          }
        } catch (e) {}
      }
    };
    fetchCurrentProfile();
  }, [user]);

  const fetchComments = async () => {
    try {
      const { data, error } = await supabase
        .from("comments")
        .select(`*, profiles(display_name, avatar)`)
        .eq("movie_slug", slug)
        .order("created_at", { ascending: true }); 

      if (error) throw error;
      setComments(data || []);
    } catch (error) {
      console.error("Lỗi tải bình luận:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [slug]);

  const checkSpamAndToxicity = (text) => {
    const lastCommentTime = localStorage.getItem("last_comment_time");
    if (lastCommentTime && Date.now() - parseInt(lastCommentTime) < 30000) {
      return "Bạn bình luận quá nhanh! Vui lòng đợi 30 giây.";
    }
    const lowerText = text.toLowerCase();
    const isToxic = BAD_WORDS.some(word => lowerText.includes(word));
    if (isToxic) {
      return "Bình luận chứa từ ngữ vi phạm tiêu chuẩn cộng đồng.";
    }
    return null;
  };

  const handleSubmit = async (e, parentId = null) => {
    e.preventDefault();
    if (!user) return onLogin();
    
    const textToSubmit = parentId ? replyText : newComment;
    if (!textToSubmit.trim() || submitting) return;

    setErrorMsg("");
    const warning = checkSpamAndToxicity(textToSubmit);
    if (warning) {
      setErrorMsg(warning);
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("comments")
        .insert([{ 
          movie_slug: slug, 
          user_id: user.uid, 
          content: textToSubmit.trim(),
          parent_id: parentId 
        }]);

      if (error) throw error;

      localStorage.setItem("last_comment_time", Date.now().toString());
      
      if (parentId) {
        setReplyText("");
        setReplyingTo(null);
      } else {
        setNewComment("");
      }
      
      fetchComments(); 
    } catch (error) {
      setErrorMsg("Lỗi khi gửi! Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  };

  const renderAvt = (avatarStr, sizeClass = "w-10 h-10 md:w-12 md:h-12") => {
    if (!avatarStr) return <div className={`${sizeClass} rounded-full flex items-center justify-center bg-gray-800 border-2 border-white/10 shrink-0`}><Icon.User size={sizeClass.includes('w-8') ? 14 : 20} className="text-gray-400" /></div>;
    
    // 1. Quét xem có phải là 1 trong 10 con động vật SVG không
    const animalAvatar = avatarsList.find(a => a.id === avatarStr);
    if (animalAvatar) {
      return (
        <div className={`${sizeClass} rounded-full border-2 border-white/10 overflow-hidden flex-shrink-0 flex items-center justify-center ${animalAvatar.bgColor}`}>
          <animalAvatar.Component className="w-[85%] h-[85%] object-contain drop-shadow-sm" />
        </div>
      );
    }

    // 2. Nếu là link mạng Google (có http)
    if (avatarStr.startsWith('http')) {
      return <img src={avatarStr} alt="avt" className={`${sizeClass} rounded-full border-2 border-white/10 object-cover shrink-0`} referrerPolicy="no-referrer" />;
    }

    // 3. Rơi vào mặc định
    return <div className={`${sizeClass} rounded-full flex items-center justify-center bg-[#E50914] border-2 border-white/10 shrink-0 uppercase font-black text-white text-xs`}>{avatarStr.charAt(0)}</div>;
  };

  const rootComments = comments.filter(c => !c.parent_id).reverse();
  const approvedCount = comments.filter(c => c.status === 'approved').length;

  return (
    <div className="mt-4 md:mt-8 bg-[#111] p-4 md:p-8 border-y sm:border border-white/5 shadow-xl md:rounded-2xl animate-in fade-in duration-500">
      <div className="border-b border-white/10 pb-3 mb-4 flex items-center justify-between">
        <h3 className="text-base md:text-xl font-black text-white uppercase tracking-widest flex items-center gap-2">
          <Icon.MessageCircle size={24} className="text-[#E50914]" /> Bình luận
        </h3>
        <span className="text-xs font-bold text-gray-400 bg-white/5 px-3 py-1 rounded-lg">{approvedCount}</span>
      </div>

      <form onSubmit={(e) => handleSubmit(e, null)} className="mb-8">
        <div className="flex gap-3 md:gap-4 items-start">
          {/* ĐÃ SỬA: Thay vì truyền mỗi thông tin Google, giờ ưu tiên lấy avatar đã fetch từ database của user hiện tại */}
          {user ? renderAvt(currentUserAvatar || user?.user_metadata?.avatar_url || user?.user_metadata?.picture || user?.user_metadata?.avatar || user?.photoURL) : renderAvt(null)}
          <div className="flex-1 flex flex-col gap-2">
            <textarea value={newComment} onChange={(e) => {setNewComment(e.target.value); setErrorMsg("");}} placeholder={user ? "Viết bình luận văn minh nhé..." : "Vui lòng đăng nhập để bình luận..."} disabled={submitting || !user} className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl p-3 text-sm text-white placeholder:text-gray-600 outline-none focus:border-[#E50914] min-h-[80px] resize-y" />
            
            {errorMsg && !replyingTo && <p className="text-[#E50914] text-xs font-bold flex items-center gap-1"><Icon.AlertCircle size={14}/> {errorMsg}</p>}
            
            <button type={user ? "submit" : "button"} onClick={!user ? onLogin : undefined} disabled={submitting || (user && !newComment.trim())} className="self-end px-6 py-2.5 bg-[#E50914] hover:bg-red-700 disabled:bg-gray-800 disabled:text-gray-500 text-white font-black text-xs md:text-sm uppercase tracking-widest rounded-xl transition-all shadow-md flex items-center gap-2">
              {submitting && !replyingTo ? <Icon.Loader2 size={16} className="animate-spin" /> : <Icon.SendHorizontal size={16} />} {user ? "Đăng" : "Đăng Nhập"}
            </button>
          </div>
        </div>
      </form>

      <div className="space-y-6">
        {loading ? ( <div className="flex justify-center py-8"><Icon.Loader2 className="animate-spin text-[#E50914]" size={32} /></div> ) 
        : rootComments.length === 0 ? ( <p className="text-center py-8 text-gray-500 font-bold uppercase tracking-wider text-xs">Chưa có bình luận nào.</p> ) 
        : (
          rootComments.map((rootCmt) => {
            const replies = comments.filter(c => c.parent_id === rootCmt.id);

            return (
              <div key={rootCmt.id} className={`flex flex-col gap-3 group ${rootCmt.status === 'pending' ? 'opacity-60' : ''}`}>
                
                <div className="flex gap-3 md:gap-4 items-start">
                  {renderAvt(user && (user.uid === rootCmt.user_id || user.id === rootCmt.user_id) ? (currentUserAvatar || user?.user_metadata?.avatar_url || user?.user_metadata?.picture || user?.user_metadata?.avatar || rootCmt.profiles?.avatar) : rootCmt.profiles?.avatar)}
                  <div className="flex-1 min-w-0">
                    <div className="bg-[#1a1a1a] p-3 md:p-4 rounded-2xl rounded-tl-none border border-white/5">
                      <div className="flex items-center gap-2 mb-1.5">
                        <h4 className="text-xs md:text-sm font-black text-gray-300">{rootCmt.profiles?.display_name || "Vô danh"}</h4>
                        {rootCmt.status === 'pending' && <span className="text-[9px] bg-yellow-500/20 text-yellow-500 border border-yellow-500/30 px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">Chờ duyệt</span>}
                      </div>
                      <p className="text-sm md:text-base text-gray-100 whitespace-pre-wrap leading-relaxed">{rootCmt.content}</p>
                    </div>
                    
                    <div className="flex items-center gap-4 ml-2 mt-1.5">
                      <span className="text-[10px] md:text-xs text-gray-600 font-bold uppercase tracking-wider">
                        {new Date(rootCmt.created_at).toLocaleDateString("vi-VN", { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </span>
                      {rootCmt.status === 'approved' && (
                        <button onClick={() => { setReplyingTo(rootCmt.id); setReplyText(""); setErrorMsg(""); }} className="text-[10px] md:text-xs font-black text-gray-400 hover:text-white uppercase tracking-wider flex items-center gap-1 transition-colors">
                          <Icon.Reply size={14} /> Trả lời
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {(replies.length > 0 || replyingTo === rootCmt.id) && (
                  <div className="ml-10 md:ml-14 pl-3 md:pl-4 border-l-2 border-white/5 space-y-4 mt-1">
                    
                    {replies.map(reply => (
                      <div key={reply.id} className={`flex gap-2.5 items-start ${reply.status === 'pending' ? 'opacity-60' : ''}`}>
                        {renderAvt(user && (user.uid === reply.user_id || user.id === reply.user_id) ? (currentUserAvatar || user?.user_metadata?.avatar_url || user?.user_metadata?.picture || user?.user_metadata?.avatar || reply.profiles?.avatar) : reply.profiles?.avatar, "w-8 h-8 md:w-10 md:h-10")}
                        <div className="flex-1 min-w-0">
                          <div className="bg-[#0a0a0a] p-3 rounded-2xl rounded-tl-none border border-white/5">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="text-[11px] md:text-xs font-black text-gray-300">{reply.profiles?.display_name || "Vô danh"}</h4>
                              {reply.status === 'pending' && <span className="text-[8px] bg-yellow-500/20 text-yellow-500 border border-yellow-500/30 px-1.5 py-0.5 rounded-full uppercase tracking-wider font-bold">Chờ duyệt</span>}
                            </div>
                            <p className="text-xs md:text-sm text-gray-200 whitespace-pre-wrap leading-relaxed">{reply.content}</p>
                          </div>
                          <span className="text-[9px] md:text-[10px] text-gray-600 font-bold ml-2 mt-1 inline-block uppercase tracking-wider">
                            {new Date(reply.created_at).toLocaleDateString("vi-VN", { day: '2-digit', month: '2-digit', year: 'numeric' })}
                          </span>
                        </div>
                      </div>
                    ))}

                    {replyingTo === rootCmt.id && (
                      <form onSubmit={(e) => handleSubmit(e, rootCmt.id)} className="flex gap-2.5 items-start mt-2 animate-in fade-in slide-in-from-top-2">
                        {/* ĐÃ SỬA: Cập nhật biến currentUserAvatar ở input trả lời */}
                        {renderAvt(currentUserAvatar || user?.user_metadata?.avatar_url || user?.user_metadata?.picture || user?.user_metadata?.avatar || user?.photoURL, "w-8 h-8 md:w-10 md:h-10")}
                        <div className="flex-1 flex flex-col gap-2">
                          <textarea 
                            autoFocus 
                            value={replyText} 
                            onChange={(e) => {setReplyText(e.target.value); setErrorMsg("");}} 
                            placeholder="Viết câu trả lời..." 
                            disabled={submitting || !user} 
                            className="w-full bg-[#151515] border border-white/10 rounded-xl p-3 text-xs md:text-sm text-white placeholder:text-gray-600 outline-none focus:border-[#E50914] min-h-[60px] resize-y" 
                          />
                          {errorMsg && replyingTo === rootCmt.id && <p className="text-[#E50914] text-[10px] font-bold"><Icon.AlertCircle size={12} className="inline mr-1"/>{errorMsg}</p>}
                          
                          <div className="flex gap-2 justify-end">
                            <button type="button" onClick={() => setReplyingTo(null)} className="px-4 py-2 text-[10px] md:text-xs font-black uppercase tracking-wider text-gray-400 hover:text-white transition">Hủy</button>
                            <button type="submit" disabled={submitting || (user && !replyText.trim())} className="px-5 py-2 bg-[#E50914] hover:bg-red-700 disabled:bg-gray-800 disabled:text-gray-500 text-white font-black text-[10px] md:text-xs uppercase tracking-widest rounded-lg transition-all shadow-md flex items-center gap-1.5">
                              {submitting && replyingTo === rootCmt.id ? <Icon.Loader2 size={14} className="animate-spin" /> : <Icon.Reply size={14} />} Gửi
                            </button>
                          </div>
                        </div>
                      </form>
                    )}

                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}