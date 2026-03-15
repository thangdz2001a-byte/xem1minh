import React, { useState, useEffect } from "react";
import * as Icon from "lucide-react";
import { supabase } from "../../utils/supabaseClient";

const BAD_WORDS = ["đm", "địt", "lồn", "cặc", "phò", "chó", "ngu", "bet88", "cá cược"];

export default function CommentSection({ slug, user, onLogin }) {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // State cho tính năng Reply
  const [replyingTo, setReplyingTo] = useState(null); // Lưu ID của bình luận đang được trả lời
  const [replyText, setReplyText] = useState("");

  const fetchComments = async () => {
    try {
      const { data, error } = await supabase
        .from("comments")
        .select(`*, profiles(display_name, avatar)`)
        .eq("movie_slug", slug)
        .order("created_at", { ascending: true }); // Xếp cũ nhất lên trước để dễ làm cây Cha-Con, sau đó trên UI ta sẽ đảo ngược mảng gốc

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

  // Hàm Submit dùng chung cho cả Bình luận gốc và Trả lời
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
          parent_id: parentId // Nấu có ID thì nó là câu trả lời
        }]);

      if (error) throw error;

      localStorage.setItem("last_comment_time", Date.now().toString());
      
      // Xóa form
      if (parentId) {
        setReplyText("");
        setReplyingTo(null);
      } else {
        setNewComment("");
      }
      
      fetchComments(); // Tải lại data để hiện comment chờ duyệt
    } catch (error) {
      setErrorMsg("Lỗi khi gửi! Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  };

  const renderAvt = (avatarStr, sizeClass = "w-10 h-10 md:w-12 md:h-12") => {
    if (!avatarStr) return <div className={`${sizeClass} rounded-full flex items-center justify-center bg-gray-800 border-2 border-white/10 shrink-0`}><Icon.User size={sizeClass.includes('w-8') ? 14 : 20} className="text-gray-400" /></div>;
    if (avatarStr.startsWith('http')) {
      return <img src={avatarStr} alt="avt" className={`${sizeClass} rounded-full border-2 border-white/10 object-cover shrink-0`} referrerPolicy="no-referrer" />;
    }
    return <div className={`${sizeClass} rounded-full flex items-center justify-center bg-[#E50914] border-2 border-white/10 shrink-0 uppercase font-black text-white text-xs`}>{avatarStr.charAt(0)}</div>;
  };

  // Tách bình luận gốc (không có parent_id) và đảo ngược để mới nhất lên đầu
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

      {/* Form bình luận gốc */}
      <form onSubmit={(e) => handleSubmit(e, null)} className="mb-8">
        <div className="flex gap-3 md:gap-4 items-start">
          {user ? renderAvt(user.photoURL) : renderAvt(null)}
          <div className="flex-1 flex flex-col gap-2">
            <textarea value={newComment} onChange={(e) => {setNewComment(e.target.value); setErrorMsg("");}} placeholder={user ? "Viết bình luận văn minh nhé..." : "Vui lòng đăng nhập để bình luận..."} disabled={submitting || !user} className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl p-3 text-sm text-white placeholder:text-gray-600 outline-none focus:border-[#E50914] min-h-[80px] resize-y" />
            
            {errorMsg && !replyingTo && <p className="text-[#E50914] text-xs font-bold flex items-center gap-1"><Icon.AlertCircle size={14}/> {errorMsg}</p>}
            
            <button type={user ? "submit" : "button"} onClick={!user ? onLogin : undefined} disabled={submitting || (user && !newComment.trim())} className="self-end px-6 py-2.5 bg-[#E50914] hover:bg-red-700 disabled:bg-gray-800 disabled:text-gray-500 text-white font-black text-xs md:text-sm uppercase tracking-widest rounded-xl transition-all shadow-md flex items-center gap-2">
              {submitting && !replyingTo ? <Icon.Loader2 size={16} className="animate-spin" /> : <Icon.SendHorizontal size={16} />} {user ? "Đăng" : "Đăng Nhập"}
            </button>
          </div>
        </div>
      </form>

      {/* Danh sách bình luận */}
      <div className="space-y-6">
        {loading ? ( <div className="flex justify-center py-8"><Icon.Loader2 className="animate-spin text-[#E50914]" size={32} /></div> ) 
        : rootComments.length === 0 ? ( <p className="text-center py-8 text-gray-500 font-bold uppercase tracking-wider text-xs">Chưa có bình luận nào.</p> ) 
        : (
          rootComments.map((rootCmt) => {
            // Lọc ra các câu trả lời thuộc về bình luận gốc này (sắp xếp từ cũ tới mới để đọc xuôi chiều)
            const replies = comments.filter(c => c.parent_id === rootCmt.id);

            return (
              <div key={rootCmt.id} className={`flex flex-col gap-3 group ${rootCmt.status === 'pending' ? 'opacity-60' : ''}`}>
                
                {/* HIỂN THỊ BÌNH LUẬN GỐC */}
                <div className="flex gap-3 md:gap-4 items-start">
                  {renderAvt(rootCmt.profiles?.avatar)}
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

                {/* KHU VỰC CÁC CÂU TRẢ LỜI (Thụt lề) */}
                {(replies.length > 0 || replyingTo === rootCmt.id) && (
                  <div className="ml-10 md:ml-14 pl-3 md:pl-4 border-l-2 border-white/5 space-y-4 mt-1">
                    
                    {/* Danh sách Reply */}
                    {replies.map(reply => (
                      <div key={reply.id} className={`flex gap-2.5 items-start ${reply.status === 'pending' ? 'opacity-60' : ''}`}>
                        {renderAvt(reply.profiles?.avatar, "w-8 h-8 md:w-10 md:h-10")}
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

                    {/* Khung nhập Reply (chỉ hiện khi bấm nút Trả lời) */}
                    {replyingTo === rootCmt.id && (
                      <form onSubmit={(e) => handleSubmit(e, rootCmt.id)} className="flex gap-2.5 items-start mt-2 animate-in fade-in slide-in-from-top-2">
                        {renderAvt(user?.photoURL, "w-8 h-8 md:w-10 md:h-10")}
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