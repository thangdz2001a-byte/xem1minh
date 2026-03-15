import React, { useState, useEffect } from "react";
import * as Icon from "lucide-react";
import { supabase } from "../../utils/supabaseClient";

export default function AdminComments({ user, navigate }) {
  const [pendingComments, setPendingComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // ĐOẠN MỚI THÊM: State để quản lý popup Xóa
  const [commentToDelete, setCommentToDelete] = useState(null);

  useEffect(() => {
    if (!user) {
      navigate({ type: 'home' });
      return;
    }

    // Kiểm tra quyền Admin từ bảng profiles
    const checkAdmin = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('user_id', user.uid)
          .single();
          
        if (error || data?.role !== 'admin') {
          alert("Bạn không có quyền truy cập trang quản trị này!");
          navigate({ type: 'home' });
        } else {
          setIsAdmin(true);
          fetchPending();
        }
      } catch (err) {
        console.error("Lỗi kiểm tra quyền:", err);
        navigate({ type: 'home' });
      }
    };
    
    checkAdmin();
  }, [user]);

  const fetchPending = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("comments")
        .select(`*, profiles(display_name, avatar)`)
        .eq("status", "pending")
        .order("created_at", { ascending: false });
        
      if (error) throw error;
      setPendingComments(data || []);
    } catch (err) {
      console.error("Lỗi tải bình luận chờ duyệt:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      const { error } = await supabase
        .from("comments")
        .update({ status: 'approved' })
        .eq('id', id);
        
      if (error) throw error;
      
      // Xóa comment đã duyệt khỏi danh sách chờ trên UI
      setPendingComments(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      alert("Lỗi khi duyệt bình luận!");
      console.error(err);
    }
  };

  // ĐOẠN MỚI THÊM: Mở popup thay vì dùng window.confirm
  const handleDeleteRequest = (id) => {
    setCommentToDelete(id);
  };

  // ĐOẠN MỚI THÊM: Thực thi xóa khi bấm nút xác nhận trong Popup
  const confirmDelete = async () => {
    if (!commentToDelete) return;
    try {
      const { error } = await supabase
        .from("comments")
        .delete()
        .eq('id', commentToDelete);
        
      if (error) throw error;
      
      // Xóa comment khỏi danh sách trên UI
      setPendingComments(prev => prev.filter(c => c.id !== commentToDelete));
    } catch (err) {
      alert("Lỗi khi xóa bình luận!");
      console.error(err);
    } finally {
      // Đóng popup
      setCommentToDelete(null);
    }
  };

  // Render Avatar (Hỗ trợ cả link ảnh Google và Avatar thú cưng)
  const renderAvt = (avatarStr) => {
    if (!avatarStr) return <div className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-800 border-2 border-white/10 shrink-0"><Icon.User size={20} className="text-gray-400" /></div>;
    
    if (avatarStr.startsWith('http')) {
      return <img src={avatarStr} alt="avt" className="w-10 h-10 rounded-full border-2 border-white/10 object-cover shrink-0" referrerPolicy="no-referrer" />;
    }
    
    return <div className="w-10 h-10 rounded-full flex items-center justify-center bg-[#E50914] border-2 border-white/10 shrink-0 uppercase font-black text-white">{avatarStr.charAt(0)}</div>;
  };

  if (!isAdmin) return null;

  return (
    <div className="pt-24 pb-10 max-w-5xl mx-auto px-4 min-h-screen text-white bg-[#050505]">
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-[#E50914]/10 rounded-full">
            <Icon.ShieldCheck size={28} className="text-[#E50914]" />
          </div>
          <h1 className="text-xl md:text-2xl font-black uppercase tracking-widest text-white">Duyệt Bình Luận</h1>
        </div>
        <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-lg flex items-center gap-2">
          <span className="text-sm font-bold text-gray-400 uppercase tracking-wider">Chờ duyệt:</span>
          <span className="text-lg font-black text-[#E50914]">{pendingComments.length}</span>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Icon.Loader2 className="animate-spin text-[#E50914] w-12 h-12" /></div>
      ) : pendingComments.length === 0 ? (
        <div className="text-center py-20 bg-[#111] rounded-2xl border border-white/5 shadow-xl flex flex-col items-center">
          <Icon.CheckCircle size={64} className="text-green-500 mb-6 opacity-80 drop-shadow-[0_0_15px_rgba(34,197,94,0.5)]" />
          <h2 className="text-xl font-black uppercase text-white tracking-widest mb-2">Sạch sẽ!</h2>
          <p className="text-sm text-gray-400 font-bold tracking-wider">Không có bình luận nào đang chờ duyệt.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pendingComments.map((cmt) => (
            <div key={cmt.id} className="bg-[#111] border border-white/10 p-5 rounded-2xl flex flex-col md:flex-row gap-5 items-start justify-between shadow-xl transition-all hover:border-white/20">
              
              <div className="flex gap-4 flex-1 w-full">
                {renderAvt(cmt.profiles?.avatar)}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="font-black text-[#E50914] text-sm md:text-base">{cmt.profiles?.display_name || "Vô danh"}</span>
                    <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">vừa bình luận tại:</span>
                    <span className="bg-black text-gray-300 text-[10px] px-2.5 py-1 rounded-md border border-white/10 font-bold tracking-widest">{cmt.movie_slug}</span>
                    {cmt.parent_id && (
                      <span className="bg-blue-500/20 text-blue-400 text-[10px] px-2.5 py-1 rounded-md border border-blue-500/20 font-bold uppercase flex items-center gap-1 tracking-widest"><Icon.Reply size={12}/> Trả lời</span>
                    )}
                  </div>
                  <div className="bg-[#0a0a0a] p-4 rounded-xl border border-white/5 text-sm md:text-base text-gray-200 leading-relaxed">
                    {cmt.content}
                  </div>
                  <div className="text-[10px] text-gray-600 font-bold mt-3 uppercase tracking-wider">
                    {new Date(cmt.created_at).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "medium" })}
                  </div>
                </div>
              </div>
              
              <div className="flex flex-row md:flex-col gap-3 w-full md:w-auto shrink-0 mt-2 md:mt-0">
                <button 
                  onClick={() => handleApprove(cmt.id)} 
                  className="flex-1 md:flex-none px-6 py-3 bg-green-600 hover:bg-green-500 text-white font-black text-[11px] md:text-xs uppercase tracking-widest rounded-xl transition-colors shadow-lg flex justify-center items-center gap-2"
                >
                  <Icon.Check size={16}/> Duyệt Ngay
                </button>
                <button 
                  onClick={() => handleDeleteRequest(cmt.id)} // ĐÃ SỬA: Gọi hàm mở popup thay vì xóa thẳng
                  className="flex-1 md:flex-none px-6 py-3 bg-transparent hover:bg-red-600/10 border border-red-600 text-red-500 font-black text-[11px] md:text-xs uppercase tracking-widest rounded-xl transition-colors flex justify-center items-center gap-2"
                >
                  <Icon.Trash2 size={16}/> Xóa Bỏ
                </button>
              </div>

            </div>
          ))}
        </div>
      )}

      {/* ĐOẠN MỚI THÊM: POPUP XÓA BÌNH LUẬN (Thay thế window.confirm) */}
      {commentToDelete && (
        <div className="fixed inset-0 z-[999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111] border border-white/10 rounded-2xl p-6 md:p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200">
            
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-16 h-16 bg-[#E50914]/10 border border-[#E50914]/20 rounded-full flex items-center justify-center mb-4">
                <Icon.AlertTriangle size={32} className="text-[#E50914]" />
              </div>
              <h3 className="text-xl md:text-2xl font-black text-white uppercase tracking-wider mb-2">Xóa Bình Luận?</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                Bạn có chắc chắn muốn xóa vĩnh viễn bình luận này không? Hành động này không thể hoàn tác.
              </p>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => setCommentToDelete(null)} 
                className="flex-1 py-3 rounded-xl font-bold text-sm text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors uppercase tracking-wider"
              >
                Hủy
              </button>
              <button 
                onClick={confirmDelete} 
                className="flex-1 py-3 rounded-xl font-black text-sm bg-[#E50914] hover:bg-red-700 text-white transition-colors uppercase tracking-wider shadow-[0_4px_15px_rgba(229,9,20,0.4)] flex justify-center items-center gap-2"
              >
                <Icon.Trash2 size={16} /> Xóa Luôn
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}