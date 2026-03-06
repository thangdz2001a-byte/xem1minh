import React, { useState, useEffect, useRef } from "react"
import * as Icon from "lucide-react"

const API = "https://ophim1.com/v1/api", IMG = "https://img.ophim.live/uploads/movies";
const getImg = (p) => !p ? "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?q=80&w=500" : (p.startsWith("http") ? p : `${IMG}/${p}`);

// Hàm chuyển đổi giây thành định dạng mm:ss hoặc hh:mm:ss
const formatTime = (seconds) => {
  if (!seconds) return "00:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return h > 0 ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}` : `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

// --- 1. TRÌNH PHÁT VIDEO CÓ LƯU TIẾN TRÌNH XEM ---
const Player = ({ src, poster, movieSlug, episodeSlug }) => {
  const vRef = useRef();
  
  useEffect(() => {
    let hls;
    const load = () => {
      const v = vRef.current;
      if (!v) return;
      if (v.canPlayType("application/vnd.apple.mpegurl")) v.src = src;
      else if (window.Hls) { 
        hls = new window.Hls(); 
        hls.loadSource(src); 
        hls.attachMedia(v); 
      }
    };
    if (!window.Hls) {
      const s = document.createElement("script"); s.src = "https://cdn.jsdelivr.net/npm/hls.js@latest";
      s.onload = load; document.body.appendChild(s);
    } else load();
    return () => hls?.destroy();
  }, [src]);

  useEffect(() => {
    const video = vRef.current;
    if (!video || !movieSlug || !episodeSlug) return;

    const handleTimeUpdate = () => {
      if (video.currentTime > 0 && video.duration > 0) {
        const progress = JSON.parse(localStorage.getItem('movieProgress') || '{}');
        progress[movieSlug] = {
          episodeSlug,
          currentTime: video.currentTime,
          percentage: (video.currentTime / video.duration) * 100
        };
        localStorage.setItem('movieProgress', JSON.stringify(progress));
      }
    };

    const handleLoadedMetadata = () => {
      const progress = JSON.parse(localStorage.getItem('movieProgress') || '{}');
      const saved = progress[movieSlug];
      if (saved && saved.episodeSlug === episodeSlug && saved.percentage < 95) {
        video.currentTime = saved.currentTime;
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [src, movieSlug, episodeSlug]);

  return <div className="relative w-full aspect-video bg-black shadow-2xl md:rounded-2xl overflow-hidden border border-white/5"><video ref={vRef} poster={poster} controls className="w-full h-full object-contain" /></div>;
};

// --- 2. KHUNG POPUP TÌM KIẾM ---
const SearchModal = ({ isOpen, onClose, setView }) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = 'auto';
      setQuery(""); setResults([]); setTotalItems(0);
    }
    return () => { document.body.style.overflow = 'auto'; window.removeEventListener('keydown', handleKeyDown); }
  }, [isOpen]);

  useEffect(() => {
    if (query.trim().length >= 2) {
      setLoading(true);
      const delay = setTimeout(() => {
        fetch(`${API}/tim-kiem?keyword=${query}`)
          .then(r => r.json())
          .then(data => {
             setResults(data?.data?.items || []);
             setTotalItems(data?.data?.params?.pagination?.totalItems || data?.data?.items?.length || 0);
             setLoading(false);
          })
          .catch(() => setLoading(false));
      }, 500);
      return () => clearTimeout(delay);
    } else { setResults([]); setTotalItems(0); }
  }, [query]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) { setView({ type: "search", keyword: query }); onClose(); window.scrollTo(0, 0); }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex justify-center pt-16 md:pt-24 px-4 animate-in fade-in duration-200">
       <div className="absolute inset-0 cursor-pointer" onClick={onClose} />
       <div className="relative w-full max-w-3xl bg-[#1a1a1a] rounded-2xl border border-white/10 shadow-2xl flex flex-col max-h-[75vh] md:max-h-[70vh] overflow-hidden animate-in zoom-in-95 duration-200">
         <form onSubmit={handleSubmit} className="flex items-center p-4 border-b border-white/5 relative bg-[#141414]">
           <Icon.Search className="text-gray-400 absolute left-6" size={20} />
           <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)} placeholder="Tìm kiếm phim..." className="w-full bg-transparent outline-none text-white pl-10 pr-16 py-2 text-lg md:text-xl" />
           <button type="button" onClick={onClose} className="absolute right-4 text-[10px] font-bold text-gray-400 bg-white/10 px-2 py-1 rounded hover:text-white hover:bg-white/20 transition cursor-pointer">ESC</button>
         </form>

         <div className="overflow-y-auto flex-1 p-2 md:p-4 no-scrollbar">
           {query.length < 2 ? (
             <div className="flex flex-col items-center justify-center py-20 text-gray-500">
               <Icon.Search size={48} strokeWidth={1} className="mb-4 opacity-30" />
               <p className="text-sm font-medium">Nhập từ khóa để tìm kiếm phim</p>
               <p className="text-xs mt-2 opacity-70">Tối thiểu 2 ký tự</p>
             </div>
           ) : loading ? (
             <div className="flex justify-center py-20"><Icon.Loader2 className="animate-spin text-[#E50914]" size={36} /></div>
           ) : results.length > 0 ? (
             <div className="flex flex-col">
               <p className="text-[13px] text-gray-400 px-4 py-2 mb-2">Hiển thị {results.length} / {totalItems} kết quả cho "{query}"</p>
               {results.map(m => (
                 <div key={m.slug} onClick={() => { setView({type: "detail", slug: m.slug}); onClose(); window.scrollTo(0,0); }} className="flex gap-4 p-3 hover:bg-white/5 rounded-xl cursor-pointer transition border-b border-white/5 last:border-0 group">
                   <img src={getImg(m.thumb_url)} className="w-14 h-20 md:w-16 md:h-24 object-cover rounded-lg shadow-md group-hover:shadow-lg transition" />
                   <div className="flex flex-col justify-center">
                     <h4 className="text-[15px] md:text-[16px] font-bold text-white mb-1.5 group-hover:text-white transition-colors line-clamp-1">{m.name}</h4>
                     <p className="text-[13px] text-gray-400 mb-2 line-clamp-1">{m.origin_name} • {m.year}</p>
                     <div className="flex items-center gap-2 text-[12px] text-gray-400 font-medium">
                       <span className="text-gray-300">{m.quality || 'HD'}</span><span>•</span>
                       <span className="text-gray-300">{m.episode_current || 'Full'}</span><span>•</span>
                       <span className="flex items-center gap-1 text-[#f5c518]"><Icon.Star fill="currentColor" size={12}/> {m.tmdb?.vote_average ? Number(m.tmdb.vote_average).toFixed(1) : '7.5'}</span>
                     </div>
                   </div>
                 </div>
               ))}
             </div>
           ) : <div className="text-center py-20 text-gray-500 text-sm">Không tìm thấy kết quả nào cho "{query}"</div>}
         </div>
       </div>
    </div>
  );
};

// --- 3. HEADER ---
const Header = ({ setView, search, categories }) => {
  const [scrolled, setScrolled] = useState(false), [isSearchOpen, setIsSearchOpen] = useState(false);
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
    <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} setView={setView} />
    <header className={`fixed top-0 w-full z-[100] transition-all duration-300 ${scrolled ? 'bg-[#050505]/95 backdrop-blur-md border-b border-white/5 py-3 shadow-2xl' : 'bg-gradient-to-b from-black/80 to-transparent py-5'}`}>
      <div className="max-w-7xl mx-auto flex justify-between items-center px-4 md:px-8">
        <div className="flex items-center gap-10">
          <div className="text-[#E50914] font-black text-3xl tracking-widest cursor-pointer flex items-center drop-shadow-md" onClick={() => {setView({type:"home"}); window.scrollTo(0,0)}}>
            POLITE
          </div>
          <nav className="hidden lg:flex gap-8 text-[12px] font-black tracking-widest text-gray-300">
            <button onClick={() => setView({type:"home"})} className="hover:text-white transition uppercase">Trang Chủ</button>
            <div className="relative group cursor-pointer flex items-center gap-1 hover:text-white transition uppercase">
              Thể Loại <Icon.ChevronDown size={14}/>
              <div className="absolute hidden group-hover:grid grid-cols-3 gap-3 bg-[#111]/95 backdrop-blur-xl p-6 w-[500px] rounded-2xl top-full left-0 border border-white/10 shadow-2xl mt-4">
                {categories && categories.length > 0 ? categories.map(c => (
                  <button key={c.slug} onClick={() => setView({type:"list",slug:c.slug,title:c.name,mode:"the-loai"})} className="text-left text-xs text-gray-400 hover:text-white hover:pl-2 transition-all">{c.name}</button>
                )) : <span className="text-xs text-gray-500 col-span-3">Đang tải thể loại...</span>}
              </div>
            </div>
          </nav>
        </div>
        <div className="flex items-center gap-5">
          <div onClick={() => setIsSearchOpen(true)} className="hidden md:flex relative group cursor-pointer">
            <div className="bg-black/40 border border-white/10 px-5 py-2 pl-10 rounded-full w-56 lg:w-72 text-sm text-gray-400 group-hover:bg-black/60 group-hover:border-[#E50914]/50 transition-all backdrop-blur-md flex items-center">Tìm kiếm phim...</div>
            <Icon.Search className="absolute left-4 top-2.5 text-gray-400 group-hover:text-white transition" size={16}/>
          </div>
          <button onClick={() => setIsSearchOpen(true)} className="md:hidden p-2"><Icon.Search size={22} className="text-white"/></button>
          <div className="w-9 h-9 rounded-md bg-gradient-to-br from-[#E50914] to-orange-600 border border-white/20 hidden md:block cursor-pointer" />
        </div>
      </div>
    </header>
    </>
  );
};

// --- 4. BOTTOM NAV ---
const BottomNav = ({ setView, categories, currentView }) => {
  const [showCat, setShowCat] = useState(false);
  return (
    <>
      <div className={`md:hidden fixed inset-0 bg-black/90 z-[110] backdrop-blur-sm transition-opacity duration-300 ${showCat ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setShowCat(false)}>
        <div className={`absolute bottom-0 w-full bg-[#111] rounded-t-3xl p-6 transition-transform duration-500 delay-100 ${showCat ? 'translate-y-0' : 'translate-y-full'}`}>
          <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-6" />
          <h3 className="text-lg font-black text-white mb-6 uppercase tracking-widest text-center">Chọn Thể Loại</h3>
          <div className="grid grid-cols-2 gap-3 overflow-y-auto max-h-[50vh] pb-8">
            {categories && categories.map(c => <button key={c.slug} onClick={() => {setView({type:"list",slug:c.slug,title:c.name,mode:"the-loai"}); setShowCat(false)}} className="bg-white/5 py-3 rounded-xl text-xs text-gray-300 font-bold active:bg-[#E50914] transition">{c.name}</button>)}
          </div>
        </div>
      </div>
      <div className="md:hidden fixed bottom-0 w-full bg-[#0a0a0a]/95 backdrop-blur-xl border-t border-white/5 pb-safe z-[100]">
        <div className="flex justify-around items-center p-3">
          {[ {id:'home', icon: Icon.Home, label: 'Trang chủ'}, {id:'cat', icon: Icon.LayoutGrid, label: 'Thể loại'}, {id:'hot', icon: Icon.Flame, label: 'Hot'}, {id:'user', icon: Icon.User, label: 'Thông tin'} ].map(item => (
            <button key={item.id} onClick={() => item.id === 'home' ? setView({type:"home"}) : item.id === 'cat' ? setShowCat(true) : {}} className={`flex flex-col items-center gap-1.5 transition-colors ${currentView === item.id || (item.id==='home' && currentView==='home') ? 'text-orange-500' : 'text-gray-500'}`}>
              <item.icon size={22} strokeWidth={currentView === item.id ? 2.5 : 2} />
              <span className="text-[10px] font-bold">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
};

// --- 5. BANNER ---
const Hero = () => (
  <div className="relative w-full h-[60vh] md:h-[80vh] flex items-center justify-center text-center">
    <div className="absolute inset-0">
      <img src="https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=2070&auto=format&fit=crop" className="w-full h-full object-cover opacity-60" alt="Cinematic Background" />
      <div className="absolute inset-0 bg-black/50" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/40 to-transparent" />
    </div>
    <div className="relative z-10 max-w-4xl mx-auto px-6 animate-in fade-in slide-in-from-bottom-8 duration-1000 mt-16">
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-[10px] font-bold uppercase tracking-widest mb-6">
        <Icon.Sparkles size={14} className="text-orange-500" /> Nền Tảng Streaming Đỉnh Cao
      </div>
      <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-white mb-6 tracking-tight drop-shadow-2xl uppercase leading-tight">
        THẾ GIỚI ĐIỆN ẢNH <br className="hidden md:block" /> TRONG TẦM TAY
      </h1>
      <p className="text-gray-300 text-sm md:text-lg max-w-2xl mx-auto leading-relaxed">
        Tận hưởng hàng ngàn bộ phim bom tấn, phim truyền hình và các chương trình giải trí đỉnh cao. Chất lượng sắc nét, xem không giới hạn ngay tại nhà.
      </p>
    </div>
  </div>
);

// --- 6. DANH SÁCH PHIM ---
const MovieGrid = ({ movies, setView, loading, title, isHome, onLoadMore, hasMore, loadingMore }) => {
  const observer = useRef();
  const lastElementRef = useRef();
  const [progressData, setProgressData] = useState({});

  useEffect(() => {
    setProgressData(JSON.parse(localStorage.getItem('movieProgress') || '{}'));
  }, [movies]);

  useEffect(() => {
    if (loading || loadingMore) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => { if (entries[0].isIntersecting && hasMore) onLoadMore(); });
    if (lastElementRef.current) observer.current.observe(lastElementRef.current);
  }, [loading, loadingMore, hasMore, onLoadMore]);

  return (
    <div className={isHome ? "max-w-7xl mx-auto px-4 md:px-8 -mt-10 md:-mt-24 relative z-20 pb-10" : "max-w-7xl mx-auto px-4 md:px-8 pt-24 pb-10"}>
      <h2 className="text-xl md:text-2xl font-black text-white mb-6 uppercase tracking-tight flex items-center gap-3">
        <span className="w-1.5 h-7 bg-[#E50914] rounded-full"></span> {title}
      </h2>
      {loading && movies.length === 0 ? <div className="py-20 flex justify-center"><Icon.Loader2 className="animate-spin text-[#E50914]" size={40} /></div> :
      <>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-6">
          {movies && movies.map((m, idx) => {
            if (!m) return null;
            const isLast = idx === movies.length - 1;
            const progData = progressData[m.slug];
            const prog = progData?.percentage || 0;
            return (
              <div ref={isLast ? lastElementRef : null} key={`${m.slug}-${idx}`} className="group cursor-pointer flex flex-col" onClick={() => {setView({type:"detail",slug:m.slug}); window.scrollTo(0,0)}}>
                <div className="relative overflow-hidden rounded-xl aspect-[2/3] bg-[#111] shadow-2xl transition-transform duration-500 group-hover:scale-105 border border-white/5">
                  <img src={getImg(m.thumb_url)} className="w-full h-full object-cover" loading="lazy" alt={m.name} />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-20">
                     <div className="w-14 h-14 rounded-full border-[2px] border-white flex items-center justify-center">
                       <Icon.Play className="text-white ml-1" size={28} fill="currentColor" />
                     </div>
                  </div>
                  <div className="absolute top-2 left-2 bg-[#E50914] text-white text-[10px] px-2 py-0.5 rounded font-black uppercase shadow-lg tracking-widest z-10">{m.quality || 'HD'}</div>
                  {prog > 0 && prog < 95 && (
                     <>
                        <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-10 pointer-events-none"></div>
                        <div className="absolute bottom-3 left-0 w-full flex justify-center items-center z-20 pointer-events-none">
                           <span className="text-[13px] font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] tracking-wider">
                             {progData.episodeSlug?.toUpperCase().replace('TAP-', 'TẬP ')?.replace('FULL', 'FULL')} • {formatTime(progData.currentTime)}
                           </span>
                        </div>
                        <div className="absolute bottom-0 left-0 w-full h-1.5 bg-gray-500/80 z-20">
                           <div className="h-full bg-[#E50914]" style={{ width: `${prog}%` }}></div>
                        </div>
                     </>
                  )}
                </div>
                <div className="mt-3 flex flex-col flex-1">
                  <h3 className="text-[14px] font-bold text-gray-200 line-clamp-1 group-hover:text-white transition-colors">{m.name}</h3>
                  <div className="flex justify-between items-center mt-1">
                    <p className="text-[11px] text-gray-500 font-medium">{m.year} • {m.time || 'Cập nhật'}</p>
                    {m.tmdb?.vote_average ? (
                      <span className="flex items-center gap-1 text-[#f5c518] text-[11px] font-bold">
                        <Icon.Star fill="currentColor" size={10}/> {Number(m.tmdb.vote_average).toFixed(1)}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        {loadingMore && <div className="py-10 flex justify-center"><Icon.Loader2 className="animate-spin text-[#E50914]" size={32} /></div>}
      </>}
    </div>
  );
};

// --- 7. CHI TIẾT PHIM ---
const MovieDetail = ({ slug, setView }) => {
  const [m, setM] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => { 
    fetch(`${API}/phim/${slug}`)
      .then(r => r.json())
      .then(j => setM(j?.data))
      .catch(() => setError(true));
  }, [slug]);

  if (error) return <div className="h-screen flex flex-col justify-center items-center gap-4 text-gray-400"><p>Không thể tải thông tin phim. Vui lòng thử lại sau.</p><button onClick={() => setView({type: "home"})} className="bg-[#E50914] text-white px-4 py-2 rounded-md">Về trang chủ</button></div>;
  if (!m) return <div className="h-screen flex justify-center items-center"><Icon.Loader2 className="animate-spin text-[#E50914]" size={40} /></div>;
  
  const i = m.item;
  return (
    <div className="pb-10 animate-in fade-in duration-700">
      <div className="relative h-[50vh] md:h-[70vh] w-full">
        <img src={getImg(i?.poster_url)} className="w-full h-full object-cover" alt="" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/80 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#050505] via-black/50 to-transparent hidden md:block" />
        <div className="absolute bottom-0 w-full max-w-7xl mx-auto px-4 md:px-8 pb-10 flex flex-col md:flex-row gap-8 items-end md:items-stretch">
          <img src={getImg(i?.thumb_url)} className="w-32 md:w-56 rounded-xl shadow-2xl border border-white/10 hidden md:block" alt="" />
          <div className="flex-1">
            <h1 className="text-3xl md:text-5xl font-black text-white mb-3 tracking-tighter leading-tight">{i?.name}</h1>
            <p className="text-gray-400 text-sm md:text-lg mb-6">{i?.origin_name} ({i?.year})</p>
            <div className="flex flex-wrap gap-2 mb-8 text-xs font-bold">
              <span className="bg-[#E50914] px-3 py-1 rounded text-white">{i?.quality}</span>
              <span className="bg-white/10 border border-white/20 px-3 py-1 rounded text-white">{i?.episode_current}</span>
              <span className="bg-white/10 border border-white/20 px-3 py-1 rounded text-white">{i?.time}</span>
            </div>
            <button onClick={() => {setView({type:"watch",slug:i?.slug,movieData:m}); window.scrollTo(0,0)}} className="w-full md:w-auto bg-[#E50914] hover:bg-red-700 text-white px-10 py-4 rounded-md font-black flex justify-center items-center gap-3 transition-transform transform hover:scale-105 shadow-xl shadow-red-600/20">
              <Icon.Play size={20} fill="currentColor"/> BẮT ĐẦU PHÁT
            </button>
          </div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 md:px-8 mt-8 grid md:grid-cols-3 gap-10">
         <div className="md:col-span-2">
            <h3 className="text-lg font-bold mb-4 text-white uppercase tracking-widest border-l-2 border-[#E50914] pl-3">Nội dung</h3>
            <div className="text-gray-400 text-sm leading-relaxed bg-[#111] p-6 rounded-2xl border border-white/5" dangerouslySetInnerHTML={{__html:i?.content}} />
         </div>
         <div className="bg-[#111] p-6 rounded-2xl border border-white/5 h-fit space-y-4 md:mt-11">
            {[{l:"Quốc gia", v:i?.country?.map(c=>c.name).join(", ")}, {l:"Thể loại", v:i?.category?.map(c=>c.name).join(", ")}, {l:"Diễn viên", v:i?.actor?.slice(0,4).join(", ")}].map(x => (
              <div key={x.l} className="border-b border-white/5 pb-3 last:border-0 last:pb-0">
                <p className="text-xs text-gray-500 mb-1">{x.l}</p>
                <p className="text-sm font-semibold text-gray-200">{x.v || 'Đang cập nhật'}</p>
              </div>
            ))}
         </div>
      </div>
    </div>
  );
};

// --- 8. MÀN HÌNH XEM PHIM ---
const Watch = ({ slug, movieData }) => {
  const [data, setData] = useState(movieData?.item || null), [ep, setEp] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => { 
    if(movieData) {
      setEp(movieData?.item?.episodes?.[0]?.server_data?.[0]);
    } else {
      fetch(`${API}/phim/${slug}`)
        .then(r=>r.json())
        .then(j=>{
          setData(j?.data?.item);
          setEp(j?.data?.item?.episodes?.[0]?.server_data?.[0]);
        })
        .catch(() => setError(true));
    }
  }, [slug, movieData]);

  if (error) return <div className="h-screen flex justify-center items-center text-gray-400">Không thể tải luồng video.</div>;
  if (!data) return <div className="h-screen flex justify-center items-center"><Icon.Loader2 className="animate-spin text-[#E50914]" size={40} /></div>;

  return (
    <div className="pt-20 md:pt-28 pb-10 max-w-7xl mx-auto px-4 md:px-8 animate-in fade-in duration-500">
      {ep && <Player src={ep.link_m3u8} poster={getImg(data?.poster_url)} movieSlug={slug} episodeSlug={ep.slug} />}
      <div className="mt-6 md:mt-10 bg-[#111] p-5 md:p-8 rounded-2xl border border-white/5 shadow-2xl">
        <h1 className="text-2xl font-black text-white mb-2">{data?.name}</h1>
        <p className="text-gray-400 text-sm mb-8">Đang phát: <span className="text-[#E50914] font-bold">{ep?.name}</span></p>
        
        {data?.episodes?.map(s => (
          <div key={s.server_name} className="mb-6 last:mb-0">
            <p className="text-[11px] text-gray-500 font-black mb-4 uppercase tracking-widest">{s.server_name}</p>
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2 md:gap-3">
              {s.server_data.map(e => (
                <button key={e.slug} onClick={() => {setEp(e); window.scrollTo(0,0)}} className={`py-3 text-xs md:text-sm rounded-md font-bold transition-all ${ep?.slug===e.slug?'bg-[#E50914] text-white shadow-lg shadow-red-600/30':'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'}`}>{e.name}</button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// --- APP CHÍNH ---
export default function App() {
  const [view, setView] = useState({type:"home"}), [movies, setMovies] = useState([]), [loading, setLoading] = useState(true), [cats, setCats] = useState([]);
  const [page, setPage] = useState(1), [hasMore, setHasMore] = useState(false), [loadingMore, setLoadingMore] = useState(false);
  
  useEffect(() => { 
    fetch(`${API}/the-loai`)
      .then(r=>r.json())
      .then(j=>setCats(j?.data?.items || []))
      .catch(() => setCats([])); 
  }, []);
  
  const fetchData = (pageNum, isNewView = false) => {
    if (isNewView) setLoading(true); else setLoadingMore(true);
    let url = `${API}/home?page=${pageNum}`;
    if(view.type==="search") url = `${API}/tim-kiem?keyword=${view.keyword}&page=${pageNum}`;
    if(view.type==="list") url = `${API}/${view.mode}/${view.slug}?page=${pageNum}`;
    
    fetch(url)
      .then(r=>r.json())
      .then(j=>{
        const newItems = j?.data?.items || [];
        if (isNewView) setMovies(newItems); else setMovies(prev => [...prev, ...newItems]);
        const pagination = j?.data?.params?.pagination;
        if (pagination) setHasMore(pageNum * pagination.totalItemsPerPage < pagination.totalItems);
        else setHasMore(false);
      })
      .catch(() => {})
      .finally(() => { setLoading(false); setLoadingMore(false); });
  };

  useEffect(() => { setPage(1); setMovies([]); fetchData(1, true); }, [view]);

  const handleLoadMore = () => { if (!loadingMore && hasMore) { const nextPage = page + 1; setPage(nextPage); fetchData(nextPage, false); } };

  return (
    <div className="bg-[#050505] min-h-screen text-white font-sans antialiased selection:bg-[#E50914] selection:text-white pb-16 md:pb-0">
      <Header setView={setView} search={k => setView({type:"search",keyword:k})} categories={cats} />
      
      {view.type==="home" && (
        <>
          <Hero />
          <MovieGrid title="Thịnh Hành" movies={movies} loading={loading} setView={setView} isHome={true} onLoadMore={handleLoadMore} hasMore={hasMore} loadingMore={loadingMore} />
        </>
      )}
      
      {view.type==="search" && <MovieGrid title={`Tìm kiếm: ${view.keyword}`} movies={movies} loading={loading} setView={setView} isHome={false} onLoadMore={handleLoadMore} hasMore={hasMore} loadingMore={loadingMore} />}
      {view.type==="list" && <MovieGrid title={view.title} movies={movies} loading={loading} setView={setView} isHome={false} onLoadMore={handleLoadMore} hasMore={hasMore} loadingMore={loadingMore} />}
      {view.type==="detail" && <MovieDetail slug={view.slug} setView={setView} />}
      {view.type==="watch" && <Watch slug={view.slug} movieData={view.movieData} />}

      <BottomNav setView={setView} categories={cats} currentView={view.type} />
    </div>
  );
}