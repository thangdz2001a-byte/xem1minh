import React, { useState, useEffect, useRef } from "react"
import * as Icon from "lucide-react"

const API = "https://ophim1.com/v1/api", IMG = "https://img.ophim.live/uploads/movies";
const getImg = (p) => !p ? "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?q=80&w=500" : (p.startsWith("http") ? p : `${IMG}/${p}`);

// --- Player Component ---
const Player = ({ src, poster }) => {
  const vRef = useRef();
  useEffect(() => {
    let hls;
    const load = () => {
      const v = vRef.current;
      if (v.canPlayType("application/vnd.apple.mpegurl")) v.src = src;
      else if (window.Hls) { hls = new window.Hls(); hls.loadSource(src); hls.attachMedia(v); }
    };
    if (!window.Hls) {
      const s = document.createElement("script"); s.src = "https://cdn.jsdelivr.net/npm/hls.js@latest";
      s.onload = load; document.body.appendChild(s);
    } else load();
    return () => hls?.destroy();
  }, [src]);
  return <div className="relative w-full aspect-video bg-black overflow-hidden shadow-2xl md:rounded-xl"><video ref={vRef} poster={poster} controls className="w-full h-full" /></div>;
};

// --- Header: Đã sửa để HIỆN ĐẦY ĐỦ trên máy tính ---
const Header = ({ setView, search, categories }) => {
  const [txt, setTxt] = useState(""), [isSearchMob, setIsSearchMob] = useState(false);
  const sub = (e) => { e.preventDefault(); if (txt.trim()) { search(txt); setIsSearchMob(false); setTxt(""); } };

  return (
    <header className="fixed top-0 w-full bg-[#0a0a0a]/95 backdrop-blur-md border-b border-white/5 z-50">
      <div className="max-w-7xl mx-auto flex justify-between items-center p-4">
        
        {/* Mobile: Khi bấm tìm kiếm mới hiện ô nhập */}
        {isSearchMob ? (
          <form onSubmit={sub} className="flex-1 flex items-center gap-2 md:hidden">
            <input autoFocus value={txt} onChange={e => setTxt(e.target.value)} placeholder="Tìm tên phim..." className="flex-1 bg-white/10 px-4 py-2 rounded-lg outline-none text-white text-sm" />
            <button type="button" onClick={() => setIsSearchMob(false)} className="text-xs text-gray-400">Hủy</button>
          </form>
        ) : (
          <>
            {/* LOGO & MENU (Desktop) */}
            <div className="flex items-center gap-10">
              <div className="text-orange-500 font-black text-2xl tracking-tighter cursor-pointer" onClick={() => setView({type:"home"})}>MOVIE<span className="text-white">HAY</span></div>
              
              {/* Menu cho Máy tính: Luôn hiện từ màn hình md (768px) trở lên */}
              <nav className="hidden md:flex items-center gap-8 text-sm font-bold text-gray-300">
                <button onClick={() => setView({type:"home"})} className="hover:text-orange-500 transition">TRANG CHỦ</button>
                <div className="relative group flex items-center gap-1 cursor-pointer hover:text-orange-500 transition">
                  THỂ LOẠI <Icon.ChevronDown size={14}/>
                  {/* Dropdown Thể loại */}
                  <div className="absolute hidden group-hover:grid grid-cols-3 gap-x-6 gap-y-3 bg-[#111] p-5 w-[450px] rounded-2xl top-full left-0 border border-white/10 shadow-2xl mt-2 animate-in fade-in zoom-in-95 duration-200">
                    {categories.map(c => <button key={c.slug} onClick={() => setView({type:"list",slug:c.slug,title:c.name,mode:"the-loai"})} className="text-left text-[13px] text-gray-400 hover:text-orange-500 whitespace-nowrap uppercase tracking-wide">{c.name}</button>)}
                  </div>
                </div>
              </nav>
            </div>

            {/* SEARCH (Desktop): Ô tìm kiếm cố định trên máy tính */}
            <div className="flex items-center gap-4">
              <form onSubmit={sub} className="hidden md:flex relative">
                <input value={txt} onChange={e => setTxt(e.target.value)} placeholder="Tìm kiếm phim..." className="bg-white/5 px-5 py-2 rounded-full w-64 outline-none border border-white/10 focus:border-orange-500 transition-all text-sm" />
                <button type="submit" className="absolute right-3 top-2.5 text-gray-400 hover:text-orange-500"><Icon.Search size={16}/></button>
              </form>

              {/* Icon Tìm kiếm cho Mobile */}
              <button onClick={() => setIsSearchMob(true)} className="md:hidden p-2 bg-white/5 rounded-full"><Icon.Search size={20}/></button>
            </div>
          </>
        )}
      </div>
    </header>
  );
};

// --- Bottom Navigation (Chỉ hiện trên Mobile) ---
const BottomNav = ({ setView, categories, currentView }) => {
  const [showCat, setShowCat] = useState(false);
  const NavItem = ({ icon: IconEl, label, active, onClick }) => (
    <button onClick={onClick} className={`flex flex-col items-center gap-1 flex-1 transition-colors ${active ? 'text-orange-500' : 'text-gray-500'}`}>
      <IconEl size={20} />
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );

  return (
    <>
      {/* Drawer Thể loại cho Mobile */}
      <div className={`md:hidden fixed inset-0 bg-black/90 z-[60] transition-opacity duration-300 ${showCat ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setShowCat(false)}>
        <div className={`absolute bottom-0 w-full bg-[#111] rounded-t-[2.5rem] p-8 transition-transform duration-500 ${showCat ? 'translate-y-0' : 'translate-y-full'}`}>
          <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mb-8" />
          <h3 className="text-xl font-black mb-6 text-center text-white">CHỌN THỂ LOẠI</h3>
          <div className="grid grid-cols-3 gap-4 overflow-y-auto max-h-[50vh] pb-6 text-center">
            {categories.map(c => <button key={c.slug} onClick={() => {setView({type:"list",slug:c.slug,title:c.name,mode:"the-loai"}); setShowCat(false)}} className="bg-white/5 py-3 rounded-xl text-[12px] text-gray-300 font-bold active:bg-orange-500 transition-colors">{c.name}</button>)}
          </div>
        </div>
      </div>

      {/* Thanh Bottom Nav */}
      <div className="md:hidden fixed bottom-0 w-full bg-[#0a0a0a]/95 backdrop-blur-xl border-t border-white/5 p-3 px-6 flex justify-around items-center z-50">
        <NavItem icon={Icon.Home} label="Trang chủ" active={currentView === 'home'} onClick={() => setView({type:"home"})} />
        <NavItem icon={Icon.LayoutGrid} label="Thể loại" onClick={() => setShowCat(true)} />
        <NavItem icon={Icon.Flame} label="Hot" onClick={() => setView({type:"home"})} />
        <NavItem icon={Icon.User} label="Cá nhân" onClick={() => {}} />
      </div>
    </>
  );
};

// --- Movie Components ---
const MovieGrid = ({ movies, setView, loading, title }) => (
  loading ? <div className="py-40 flex justify-center"><Icon.Loader2 className="animate-spin text-orange-500" size={32} /></div> :
  <div className="mb-12">
    <div className="flex items-center gap-3 mb-8">
       <div className="h-7 w-1.5 bg-orange-600 rounded-full"></div>
       <h2 className="text-2xl font-black text-white uppercase tracking-tight">{title}</h2>
    </div>
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-5 md:gap-7">
      {movies.map(m => (
        <div key={m.slug} className="group cursor-pointer relative" onClick={() => {setView({type:"detail",slug:m.slug}); window.scrollTo(0,0)}}>
          <div className="relative overflow-hidden rounded-2xl aspect-[2/3] shadow-2xl border border-white/5">
            <img src={getImg(m.thumb_url)} className="w-full h-full object-cover group-hover:scale-110 transition duration-700" loading="lazy" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
               <button className="w-full bg-white text-black py-2 rounded-lg font-bold text-xs transform translate-y-4 group-hover:translate-y-0 transition-transform">XEM NGAY</button>
            </div>
          </div>
          <p className="mt-3 text-[14px] font-bold text-white line-clamp-1 group-hover:text-orange-500 transition">{m.name}</p>
          <div className="flex justify-between items-center mt-1">
             <p className="text-[11px] text-gray-500 font-medium">{m.year}</p>
             <span className="text-[10px] bg-white/10 text-gray-400 px-1.5 py-0.5 rounded italic">{m.quality || 'HD'}</span>
          </div>
        </div>))}
    </div>
  </div>
);

const MovieDetail = ({ slug, setView }) => {
  const [m, setM] = useState(null);
  useEffect(() => { fetch(`${API}/phim/${slug}`).then(r => r.json()).then(j => setM(j.data)); }, [slug]);
  if (!m) return <div className="py-40 flex justify-center"><Icon.Loader2 className="animate-spin text-orange-500" /></div>;
  const i = m.item;
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="relative md:h-[500px] h-[400px] -mx-4 md:mx-0 rounded-b-[3rem] md:rounded-[3rem] overflow-hidden mb-10 shadow-2xl">
        <img src={getImg(i.poster_url)} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#050505] via-transparent to-transparent hidden md:block" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-black/20 to-transparent" />
        <div className="absolute bottom-0 left-0 p-8 md:p-16 max-w-2xl">
          <h1 className="text-3xl md:text-6xl font-black text-white mb-4 leading-tight">{i.name}</h1>
          <div className="flex flex-wrap gap-3 mb-8">
            <span className="bg-orange-600 px-3 py-1 rounded-md text-xs font-black italic">{i.quality}</span>
            <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-md text-xs font-bold">{i.year}</span>
            <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-md text-xs font-bold">{i.category?.[0]?.name}</span>
          </div>
          <button onClick={() => {setView({type:"watch",slug:i.slug,movieData:m}); window.scrollTo(0,0)}} className="bg-white text-black px-10 py-4 rounded-full font-black flex items-center gap-3 hover:bg-orange-500 hover:text-white transition-all transform hover:scale-105 uppercase tracking-widest text-sm shadow-xl"><Icon.Play size={20} fill="currentColor"/> Bắt đầu xem</button>
        </div>
      </div>
      <div className="grid md:grid-cols-3 gap-10 px-2">
         <div className="md:col-span-2">
            <h3 className="text-xl font-black mb-4 flex items-center gap-2"><Icon.Info size={20} className="text-orange-500"/> NỘI DUNG PHIM</h3>
            <div className="text-gray-400 leading-loose text-[15px] bg-white/5 p-6 rounded-3xl" dangerouslySetInnerHTML={{__html:i.content}} />
         </div>
         <div className="space-y-6">
            <h3 className="text-xl font-black mb-4">CHI TIẾT</h3>
            {[{l:"Quốc gia",v:i.country?.[0]?.name},{l:"Thời lượng",v:i.time},{l:"Tập mới nhất",v:i.episode_current}].map(x=>(
              <div key={x.l} className="flex justify-between items-center border-b border-white/5 pb-3">
                <span className="text-gray-500 text-sm">{x.l}</span>
                <span className="text-white font-bold text-sm">{x.v}</span>
              </div>
            ))}
         </div>
      </div>
    </div>
  );
};

const Watch = ({ slug, movieData }) => {
  const [data, setData] = useState(movieData?.item || null), [ep, setEp] = useState(null);
  useEffect(() => { if(movieData) setEp(movieData.item.episodes?.[0]?.server_data?.[0]); else fetch(`${API}/phim/${slug}`).then(r=>r.json()).then(j=>{setData(j.data.item);setEp(j.data.item.episodes?.[0]?.server_data?.[0])}); }, [slug]);
  if (!data) return <div className="py-40 flex justify-center"><Icon.Loader2 className="animate-spin text-orange-500" /></div>;
  return (
    <div className="pt-4 animate-in fade-in duration-500">
      <div className="-mx-4 md:mx-0">
        {ep && <Player src={ep.link_m3u8} poster={getImg(data.poster_url)}/>}
      </div>
      <div className="mt-10 bg-white/5 p-6 rounded-3xl border border-white/5">
        <h3 className="font-black text-xl mb-6 flex items-center gap-3"><Icon.Layers size={22} className="text-orange-500"/> CHỌN TẬP PHIM</h3>
        {data.episodes?.map(s => (
          <div key={s.server_name} className="mb-8">
            <p className="text-[11px] text-gray-500 font-black mb-4 uppercase tracking-widest">{s.server_name}</p>
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-12 gap-3">
              {s.server_data.map(e => (
                <button key={e.slug} onClick={() => {setEp(e); window.scrollTo(0,0)}} className={`py-3 text-xs rounded-xl font-black transition-all ${ep?.slug===e.slug?'bg-orange-600 text-white shadow-lg shadow-orange-600/30':'bg-white/10 text-gray-400 hover:bg-white/20'}`}>{e.name}</button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// --- App Chính ---
export default function App() {
  const [view, setView] = useState({type:"home"}), [movies, setMovies] = useState([]), [loading, setLoading] = useState(true), [cats, setCats] = useState([]);
  
  useEffect(() => { fetch(`${API}/the-loai`).then(r=>r.json()).then(j=>setCats(j.data.items)); }, []);
  
  useEffect(() => { 
    setLoading(true); 
    let url = `${API}/home`;
    if(view.type==="search") url = `${API}/tim-kiem?keyword=${view.keyword}`;
    if(view.type==="list") url = `${API}/${view.mode}/${view.slug}`;
    
    fetch(url).then(r=>r.json()).then(j=>{
      setMovies(j.data.items || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [view]);

  return (
    <div className="bg-[#050505] min-h-screen text-white font-sans antialiased selection:bg-orange-500 selection:text-white">
      <Header setView={setView} search={k => setView({type:"search",keyword:k})} categories={cats} />
      
      {/* Padding Top cho Desktop là 28, Mobile là 20 */}
      <main className="pt-20 md:pt-28 pb-32 md:pb-20 max-w-7xl mx-auto px-4 md:px-8">
        {view.type==="home" && <MovieGrid title="Phim Mới Cập Nhật" movies={movies} loading={loading} setView={setView} />}
        {view.type==="search" && <MovieGrid title={`Kết quả: ${view.keyword}`} movies={movies} loading={loading} setView={setView} />}
        {view.type==="list" && <MovieGrid title={view.title} movies={movies} loading={loading} setView={setView} />}
        {view.type==="detail" && <MovieDetail slug={view.slug} setView={setView} />}
        {view.type==="watch" && <Watch slug={view.slug} movieData={view.movieData} />}
      </main>

      <BottomNav setView={setView} categories={cats} currentView={view.type} />
    </div>
  );
}