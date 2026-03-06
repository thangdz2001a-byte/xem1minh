import React, { useState, useEffect, useRef } from "react";
import * as Icon from "lucide-react";

const API = "https://ophim1.com/v1/api",
  IMG = "https://img.ophim.live/uploads/movies";
const getImg = (p) =>
  !p
    ? "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?q=80&w=500"
    : p.startsWith("http")
    ? p
    : `${IMG}/${p}`;

// --- Player Component ---
const Player = ({ src, poster }) => {
  const vRef = useRef();
  useEffect(() => {
    let hls;
    const load = () => {
      const v = vRef.current;
      if (v.canPlayType("application/vnd.apple.mpegurl")) v.src = src;
      else if (window.Hls) {
        hls = new window.Hls();
        hls.loadSource(src);
        hls.attachMedia(v);
      }
    };
    if (!window.Hls) {
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/hls.js@latest";
      s.onload = load;
      document.body.appendChild(s);
    } else load();
    return () => hls?.destroy();
  }, [src]);
  return (
    <div className="relative w-full aspect-video bg-black overflow-hidden shadow-2xl md:rounded-xl">
      <video ref={vRef} poster={poster} controls className="w-full h-full" />
    </div>
  );
};

// --- Header: Chứa Logo và Ô tìm kiếm ---
const Header = ({ setView, search }) => {
  const [txt, setTxt] = useState(""),
    [isSearch, setIsSearch] = useState(false);
  const sub = (e) => {
    e.preventDefault();
    if (txt.trim()) {
      search(txt);
      setIsSearch(false);
      setTxt("");
    }
  };

  return (
    <header className="fixed top-0 w-full bg-[#0a0a0a]/90 backdrop-blur-lg border-b border-white/5 z-50">
      <div className="max-w-7xl mx-auto flex justify-between items-center p-4">
        {!isSearch ? (
          <>
            <div
              className="text-orange-500 font-black text-2xl tracking-tighter cursor-pointer"
              onClick={() => setView({ type: "home" })}
            >
              MOVIE<span className="text-white">HAY</span>
            </div>
            <button
              onClick={() => setIsSearch(true)}
              className="p-2 bg-white/5 rounded-full"
            >
              <Icon.Search size={20} />
            </button>
          </>
        ) : (
          <form
            onSubmit={sub}
            className="flex-1 flex items-center gap-2 animate-in slide-in-from-right duration-300"
          >
            <input
              autoFocus
              value={txt}
              onChange={(e) => setTxt(e.target.value)}
              placeholder="Tìm tên phim..."
              className="flex-1 bg-white/10 px-4 py-2 rounded-lg outline-none text-sm text-white"
            />
            <button
              type="button"
              onClick={() => setIsSearch(false)}
              className="text-xs text-gray-400"
            >
              Hủy
            </button>
          </form>
        )}
      </div>
    </header>
  );
};

// --- Bottom Nav: Giải quyết vấn đề mất nút Trang chủ/Thể loại ---
const BottomNav = ({ setView, categories, currentView }) => {
  const [showCat, setShowCat] = useState(false);
  const NavItem = ({ icon: IconEl, label, active, onClick }) => (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 flex-1 ${
        active ? "text-orange-500" : "text-gray-500"
      }`}
    >
      <IconEl size={20} />
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );

  return (
    <>
      {/* Bảng chọn Thể loại hiện lên từ dưới (Drawer) */}
      <div
        className={`fixed inset-0 bg-black/80 z-[60] transition-opacity ${
          showCat ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setShowCat(false)}
      >
        <div
          className={`absolute bottom-0 w-full bg-[#111] rounded-t-3xl p-6 transition-transform duration-300 ${
            showCat ? "translate-y-0" : "translate-y-full"
          }`}
        >
          <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-6" />
          <h3 className="text-lg font-bold mb-4 text-white">Thể loại</h3>
          <div className="grid grid-cols-3 gap-3 overflow-y-auto max-h-[60vh]">
            {categories.map((c) => (
              <button
                key={c.slug}
                onClick={() => {
                  setView({
                    type: "list",
                    slug: c.slug,
                    title: c.name,
                    mode: "the-loai",
                  });
                  setShowCat(false);
                }}
                className="bg-white/5 py-3 rounded-xl text-[11px] text-gray-300"
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Thanh Bottom Nav chính */}
      <div className="fixed bottom-0 w-full bg-[#0a0a0a]/95 backdrop-blur-md border-t border-white/5 p-3 flex justify-around items-center z-50 lg:hidden">
        <NavItem
          icon={Icon.Home}
          label="Trang chủ"
          active={currentView === "home"}
          onClick={() => setView({ type: "home" })}
        />
        <NavItem
          icon={Icon.Grid}
          label="Thể loại"
          onClick={() => setShowCat(true)}
        />
        <NavItem
          icon={Icon.TrendingUp}
          label="Hot"
          onClick={() => setView({ type: "home" })}
        />
        <NavItem icon={Icon.Info} label="Thông tin" onClick={() => {}} />
      </div>
    </>
  );
};

// --- MovieGrid Component ---
const MovieGrid = ({ movies, setView, loading, title }) =>
  loading ? (
    <div className="py-40 flex justify-center">
      <Icon.Loader2 className="animate-spin text-orange-500" />
    </div>
  ) : (
    <div className="mb-8 pb-10">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold text-white">{title}</h2>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {movies.map((m) => (
          <div
            key={m.slug}
            className="relative group cursor-pointer"
            onClick={() => {
              setView({ type: "detail", slug: m.slug });
              window.scrollTo(0, 0);
            }}
          >
            <div className="rounded-xl overflow-hidden aspect-[3/4] shadow-lg border border-white/5">
              <img
                src={getImg(m.thumb_url)}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
            <p className="mt-2 text-[13px] font-semibold text-white line-clamp-1">
              {m.name}
            </p>
            <p className="text-[10px] text-gray-500">{m.year}</p>
          </div>
        ))}
      </div>
    </div>
  );

// --- MovieDetail Component ---
const MovieDetail = ({ slug, setView }) => {
  const [m, setM] = useState(null);
  useEffect(() => {
    fetch(`${API}/phim/${slug}`)
      .then((r) => r.json())
      .then((j) => setM(j.data));
  }, [slug]);
  if (!m)
    return (
      <div className="py-40 flex justify-center">
        <Icon.Loader2 className="animate-spin text-orange-500" />
      </div>
    );
  const i = m.item;
  return (
    <div className="animate-in fade-in duration-500 pb-20">
      <div className="relative h-[35vh] -mx-4 mb-6">
        <img
          src={getImg(i.poster_url)}
          className="w-full h-full object-cover opacity-20 blur-sm"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050505] to-transparent" />
        <div className="absolute bottom-0 w-full p-6 text-center">
          <img
            src={getImg(i.thumb_url)}
            className="w-28 h-40 object-cover mx-auto rounded-xl shadow-2xl mb-4 border border-white/10"
          />
          <h1 className="text-xl font-black text-white">{i.name}</h1>
        </div>
      </div>
      <button
        onClick={() => setView({ type: "watch", slug: i.slug, movieData: m })}
        className="bg-orange-600 w-full py-4 rounded-2xl font-bold flex justify-center gap-2 mb-6 text-white shadow-lg"
      >
        <Icon.Play size={20} fill="currentColor" /> XEM PHIM
      </button>
      <div
        className="text-sm text-gray-400 leading-relaxed mb-10 px-2"
        dangerouslySetInnerHTML={{ __html: i.content }}
      />
    </div>
  );
};

// --- Watch Component ---
const Watch = ({ slug, movieData }) => {
  const [data, setData] = useState(movieData?.item || null),
    [ep, setEp] = useState(null);
  useEffect(() => {
    if (movieData) setEp(movieData.item.episodes?.[0]?.server_data?.[0]);
    else
      fetch(`${API}/phim/${slug}`)
        .then((r) => r.json())
        .then((j) => {
          setData(j.data.item);
          setEp(j.data.item.episodes?.[0]?.server_data?.[0]);
        });
  }, [slug]);
  if (!data)
    return (
      <div className="py-40 flex justify-center">
        <Icon.Loader2 className="animate-spin text-orange-500" />
      </div>
    );
  return (
    <div className="-mx-4 md:mx-0 pb-24">
      {ep && <Player src={ep.link_m3u8} poster={getImg(data.poster_url)} />}
      <div className="p-4">
        <h3 className="font-bold text-white mb-4 flex items-center gap-2">
          <Icon.Menu size={18} className="text-orange-500" /> Danh sách tập
        </h3>
        <div className="grid grid-cols-4 gap-2">
          {data.episodes?.[0]?.server_data.map((e) => (
            <button
              key={e.slug}
              onClick={() => {
                setEp(e);
                window.scrollTo(0, 0);
              }}
              className={`py-2 text-xs rounded-lg font-bold ${
                ep?.slug === e.slug
                  ? "bg-orange-600 text-white"
                  : "bg-white/5 text-gray-400"
              }`}
            >
              {e.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// --- Main App ---
export default function App() {
  const [view, setView] = useState({ type: "home" }),
    [movies, setMovies] = useState([]),
    [loading, setLoading] = useState(true),
    [cats, setCats] = useState([]);
  useEffect(() => {
    fetch(`${API}/the-loai`)
      .then((r) => r.json())
      .then((j) => setCats(j.data.items));
  }, []);
  useEffect(() => {
    setLoading(true);
    let url = `${API}/home`;
    if (view.type === "search") url = `${API}/tim-kiem?keyword=${view.keyword}`;
    if (view.type === "list") url = `${API}/${view.mode}/${view.slug}`;
    fetch(url)
      .then((r) => r.json())
      .then((j) => {
        setMovies(j.data.items || []);
        setLoading(false);
      });
  }, [view]);

  return (
    <div className="bg-[#050505] min-h-screen text-white font-sans antialiased selection:bg-orange-500/30">
      <Header
        setView={setView}
        search={(k) => setView({ type: "search", keyword: k })}
      />
      <main className="pt-20 pb-10 max-w-7xl mx-auto px-4 md:px-6">
        {view.type === "home" && (
          <MovieGrid
            title="Phim Mới"
            movies={movies}
            loading={loading}
            setView={setView}
          />
        )}
        {view.type === "search" && (
          <MovieGrid
            title={`Tìm: ${view.keyword}`}
            movies={movies}
            loading={loading}
            setView={setView}
          />
        )}
        {view.type === "list" && (
          <MovieGrid
            title={view.title}
            movies={movies}
            loading={loading}
            setView={setView}
          />
        )}
        {view.type === "detail" && (
          <MovieDetail slug={view.slug} setView={setView} />
        )}
        {view.type === "watch" && (
          <Watch slug={view.slug} movieData={view.movieData} />
        )}
      </main>
      <BottomNav setView={setView} categories={cats} currentView={view.type} />
    </div>
  );
}
