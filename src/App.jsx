import React, { useState, useEffect, useRef, memo } from "react";
import * as Icon from "lucide-react";

const API = "https://ophim1.com/v1/api",
  IMG = "https://img.ophim.live/uploads/movies";

// Hàm xử lý ảnh thông minh: Tối ưu đường dẫn và fallback
const getImg = (p) => {
  if (!p)
    return "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?q=80&w=500";
  if (p.startsWith("http")) return p;
  const path = p.startsWith("/") ? p.substring(1) : p;
  return `${IMG}/${path}`;
};

// Định dạng thời gian
const formatTime = (seconds) => {
  if (!seconds) return "00:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return h > 0
    ? `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
    : `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
};

// --- 1. TRÌNH PHÁT VIDEO ---
const Player = ({
  src,
  poster,
  movieSlug,
  episodeSlug,
  movieName,
  thumbUrl,
}) => {
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
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/hls.js@latest";
      s.onload = load;
      document.body.appendChild(s);
    } else load();
    return () => hls?.destroy();
  }, [src]);

  useEffect(() => {
    const video = vRef.current;
    if (!video || !movieSlug || !episodeSlug) return;

    const handleTimeUpdate = () => {
      if (video.currentTime > 0 && video.duration > 0) {
        const progress = JSON.parse(
          localStorage.getItem("movieProgress") || "{}"
        );
        progress[movieSlug] = {
          episodeSlug,
          currentTime: video.currentTime,
          percentage: (video.currentTime / video.duration) * 100,
          name: movieName,
          thumb: thumbUrl,
        };
        localStorage.setItem("movieProgress", JSON.stringify(progress));
      }
    };

    const handleLoadedMetadata = () => {
      const progress = JSON.parse(
        localStorage.getItem("movieProgress") || "{}"
      );
      const saved = progress[movieSlug];
      if (saved && saved.episodeSlug === episodeSlug && saved.percentage < 95) {
        video.currentTime = saved.currentTime;
      }
    };

    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
    };
  }, [src, movieSlug, episodeSlug, movieName, thumbUrl]);

  return (
    <div className="relative w-full aspect-video bg-black shadow-2xl md:rounded-2xl overflow-hidden border border-white/5">
      <video
        ref={vRef}
        poster={poster}
        controls
        className="w-full h-full object-contain"
      />
    </div>
  );
};

// --- 2. POPUP TÌM KIẾM ---
const SearchModal = ({ isOpen, onClose, setView }) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 100);
    else {
      setQuery("");
      setResults([]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (query.trim().length < 2) return;
    setLoading(true);
    const controller = new AbortController();
    const delay = setTimeout(() => {
      fetch(`${API}/tim-kiem?keyword=${query}`, { signal: controller.signal })
        .then((r) => r.json())
        .then((data) => {
          setResults(data?.data?.items || []);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }, 400);
    return () => {
      clearTimeout(delay);
      controller.abort();
    };
  }, [query]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex justify-center pt-16 md:pt-24 px-4">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative w-full max-w-3xl bg-[#1a1a1a] rounded-2xl border border-white/10 shadow-2xl flex flex-col max-h-[70vh] overflow-hidden">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (query) {
              setView({ type: "search", keyword: query });
              onClose();
            }
          }}
          className="flex items-center p-4 border-b border-white/5 bg-[#141414]"
        >
          <Icon.Search className="text-gray-400 absolute left-6" size={20} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm kiếm phim..."
            className="w-full bg-transparent outline-none text-white pl-10 pr-10 py-2 text-lg"
          />
        </form>
        <div className="overflow-y-auto flex-1 p-2 no-scrollbar">
          {loading ? (
            <div className="py-10 flex justify-center">
              <Icon.Loader2 className="animate-spin text-[#E50914]" />
            </div>
          ) : (
            results.map((m) => (
              <div
                key={m.slug}
                onClick={() => {
                  setView({ type: "detail", slug: m.slug });
                  onClose();
                  window.scrollTo(0, 0);
                }}
                className="flex gap-4 p-3 hover:bg-white/5 rounded-xl cursor-pointer transition border-b border-white/5 last:border-0 group/card"
              >
                <img
                  src={getImg(m.thumb_url)}
                  className="w-14 h-20 object-cover rounded-lg"
                  loading="lazy"
                  decoding="async"
                />
                <div className="flex flex-col justify-center">
                  <h4 className="text-sm font-bold text-white line-clamp-1">
                    {m.name}
                  </h4>
                  <p className="text-xs text-gray-500">
                    {m.year} • {m.origin_name}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

// --- 3. MOVIE CARD (Tối ưu với memo) ---
const MovieCard = memo(
  ({
    m,
    setView,
    progressData,
    isRow = false,
    onRemove = null,
    onClickOverride = null,
  }) => {
    const progData = progressData?.[m.slug];
    const prog = progData?.percentage || 0;
    const thumbSrc = m.thumb_url || m.thumb || m.poster_url;

    return (
      <div
        className={`group/card cursor-pointer flex flex-col shrink-0 relative ${
          isRow ? "w-40 md:w-60 lg:w-64" : ""
        }`}
        onClick={() => {
          if (onClickOverride) onClickOverride();
          else {
            setView({ type: "detail", slug: m.slug });
            window.scrollTo(0, 0);
          }
        }}
      >
        {onRemove && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove(m.slug);
            }}
            className="absolute top-2 right-2 z-30 bg-black/60 hover:bg-[#E50914] text-white p-1.5 rounded-full backdrop-blur-md opacity-0 group-hover/card:opacity-100 transition-all border border-white/10"
          >
            <Icon.X size={14} strokeWidth={3} />
          </button>
        )}

        <div className="relative overflow-hidden rounded-xl aspect-[2/3] bg-[#111] shadow-2xl transition-transform duration-500 group-hover/card:scale-105 border border-white/5">
          <img
            src={getImg(thumbSrc)}
            className="w-full h-full object-cover transition-opacity duration-300 group-hover/card:opacity-80"
            loading="lazy"
            decoding="async"
            alt={m.name}
          />
          <div className="absolute inset-0 bg-white/5 opacity-0 group-hover/card:opacity-100 transition-opacity z-20 pointer-events-none" />
          <div className="absolute top-2 left-2 bg-[#E50914] text-white text-[10px] px-2 py-0.5 rounded font-black uppercase shadow-lg tracking-widest z-10">
            {m.quality || "HD"}
          </div>

          {prog > 0 && prog < 95 && (
            <>
              <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-10 pointer-events-none"></div>
              <div className="absolute bottom-3 left-0 w-full flex justify-center items-center z-20 pointer-events-none px-2">
                <span className="text-[11px] md:text-[12px] font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] tracking-wider truncate">
                  {progData.episodeSlug
                    ?.toUpperCase()
                    .replace("TAP-", "TẬP ")
                    ?.replace("FULL", "FULL")}{" "}
                  • {formatTime(progData.currentTime)}
                </span>
              </div>
              <div className="absolute bottom-0 left-0 w-full h-1.5 bg-gray-500/80 z-20">
                <div
                  className="h-full bg-[#E50914]"
                  style={{ width: `${prog}%` }}
                ></div>
              </div>
            </>
          )}
        </div>
        <div className="mt-3 flex flex-col flex-1 px-1">
          <h3 className="text-[13px] md:text-[14px] font-bold text-gray-200 line-clamp-1 group-hover/card:text-white transition-colors">
            {m.name}
          </h3>
          <div className="flex justify-between items-center mt-1">
            <p className="text-[10px] md:text-[11px] text-gray-500 font-medium">
              {m.year || "2025"}
            </p>
            {m.tmdb?.vote_average ? (
              <span className="flex items-center gap-1 text-[#f5c518] text-[10px] font-bold">
                <Icon.Star fill="currentColor" size={10} />{" "}
                {Number(m.tmdb.vote_average).toFixed(1)}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    );
  }
);

// --- 4. HÀNG PHIM (Lướt ngang) ---
const MovieSection = ({
  title,
  slug,
  type = "the-loai",
  setView,
  progressData,
}) => {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef(null);

  useEffect(() => {
    const controller = new AbortController();
    let url = slug === "phim-moi" ? `${API}/home` : `${API}/${type}/${slug}`;
    fetch(url, { signal: controller.signal })
      .then((r) => r.json())
      .then((j) => {
        setMovies(j?.data?.items || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
    return () => controller.abort();
  }, [slug, type]);

  const scroll = (direction) => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current;
      const scrollTo =
        direction === "left"
          ? scrollLeft - clientWidth * 0.8
          : scrollLeft + clientWidth * 0.8;
      scrollRef.current.scrollTo({ left: scrollTo, behavior: "smooth" });
    }
  };

  if (loading || movies.length === 0) return null;

  return (
    <div className="mb-10 relative group/section">
      <div className="flex items-center justify-between mb-4 px-1">
        <h2 className="text-lg md:text-2xl font-black text-white uppercase tracking-tight flex items-center gap-3">
          <span className="w-1.5 h-6 md:h-7 bg-[#E50914] rounded-full"></span>{" "}
          {title}
        </h2>
        <button
          onClick={() => setView({ type: "list", slug, title, mode: type })}
          className="text-[#E50914] text-[10px] md:text-xs font-bold hover:underline opacity-0 group-hover/section:opacity-100 transition-opacity"
        >
          XEM TẤT CẢ
        </button>
      </div>
      <div className="relative">
        <button
          onClick={() => scroll("left")}
          className="absolute left-0 top-[40%] -translate-y-1/2 z-[40] bg-black/60 hover:bg-black/90 text-white p-3 rounded-r-2xl backdrop-blur-md opacity-0 group-hover/section:opacity-100 transition-all hidden md:flex items-center shadow-2xl"
        >
          <Icon.ChevronLeft size={36} />
        </button>
        <div
          ref={scrollRef}
          className="flex gap-4 md:gap-6 overflow-x-auto scroll-smooth no-scrollbar pb-4 px-2"
        >
          {movies.map((m) => (
            <MovieCard
              key={m.slug}
              m={m}
              setView={setView}
              progressData={progressData}
              isRow={true}
            />
          ))}
        </div>
        <button
          onClick={() => scroll("right")}
          className="absolute right-0 top-[40%] -translate-y-1/2 z-[40] bg-black/60 hover:bg-black/90 text-white p-3 rounded-l-2xl backdrop-blur-md opacity-0 group-hover/section:opacity-100 transition-all hidden md:flex items-center shadow-2xl"
        >
          <Icon.ChevronRight size={36} />
        </button>
      </div>
    </div>
  );
};

// HÀNG PHIM TIẾP TỤC XEM
const ContinueWatching = ({ setView, progressData, onRemove }) => {
  const scrollRef = useRef(null);
  const watchedSlugs = Object.keys(progressData).filter(
    (key) => progressData[key].percentage < 95
  );
  if (watchedSlugs.length === 0) return null;

  const scroll = (direction) => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current;
      const scrollTo =
        direction === "left"
          ? scrollLeft - clientWidth * 0.8
          : scrollLeft + clientWidth * 0.8;
      scrollRef.current.scrollTo({ left: scrollTo, behavior: "smooth" });
    }
  };

  return (
    <div className="mb-10 animate-in slide-in-from-left duration-500 group/section">
      <div className="flex items-center mb-4 px-1">
        <h2 className="text-lg md:text-2xl font-black text-white uppercase tracking-tight flex items-center gap-3">
          <span className="w-1.5 h-6 md:h-7 bg-[#E50914] rounded-full"></span>{" "}
          Tiếp tục xem
        </h2>
      </div>
      <div className="relative">
        <button
          onClick={() => scroll("left")}
          className="absolute left-0 top-[40%] -translate-y-1/2 z-[40] bg-black/60 hover:bg-black/90 text-white p-3 rounded-r-2xl backdrop-blur-md opacity-0 group-hover/section:opacity-100 transition-all hidden md:flex items-center shadow-2xl"
        >
          <Icon.ChevronLeft size={36} />
        </button>
        <div
          ref={scrollRef}
          className="flex gap-4 md:gap-6 overflow-x-auto scroll-smooth no-scrollbar pb-4 px-2"
        >
          {watchedSlugs.reverse().map((slug) => (
            <MovieCard
              key={slug}
              m={{
                slug,
                name: progressData[slug].name,
                thumb: progressData[slug].thumb,
              }}
              setView={setView}
              progressData={progressData}
              isRow={true}
              onRemove={onRemove}
              onClickOverride={() => {
                setView({ type: "watch", slug });
                window.scrollTo(0, 0);
              }}
            />
          ))}
        </div>
        <button
          onClick={() => scroll("right")}
          className="absolute right-0 top-[40%] -translate-y-1/2 z-[40] bg-black/60 hover:bg-black/90 text-white p-3 rounded-l-2xl backdrop-blur-md opacity-0 group-hover/section:opacity-100 transition-all hidden md:flex items-center shadow-2xl"
        >
          <Icon.ChevronRight size={36} />
        </button>
      </div>
    </div>
  );
};

// --- 5. HEADER ---
const Header = ({ setView, categories }) => {
  const [scrolled, setScrolled] = useState(false),
    [isSearchOpen, setIsSearchOpen] = useState(false);
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        setView={setView}
      />
      <header
        className={`fixed top-0 w-full z-[100] transition-all duration-300 ${
          scrolled
            ? "bg-[#050505]/95 backdrop-blur-md border-b border-white/5 py-3 shadow-2xl"
            : "bg-gradient-to-b from-black/80 to-transparent py-5"
        }`}
      >
        <div className="max-w-7xl mx-auto flex justify-between items-center px-4 md:px-8">
          <div className="flex items-center gap-10">
            <div
              className="text-[#E50914] font-black text-3xl tracking-widest cursor-pointer drop-shadow-md"
              onClick={() => {
                setView({ type: "home" });
                window.scrollTo(0, 0);
              }}
            >
              POLITE
            </div>
            <nav className="hidden lg:flex gap-8 text-[12px] font-black tracking-widest text-gray-300">
              <button
                onClick={() => setView({ type: "home" })}
                className="hover:text-white transition uppercase"
              >
                Trang Chủ
              </button>
              <div className="relative group cursor-pointer flex items-center gap-1 hover:text-white transition uppercase">
                Thể Loại <Icon.ChevronDown size={14} />
                <div className="absolute hidden group-hover:grid grid-cols-3 gap-3 bg-[#111]/95 backdrop-blur-xl p-6 w-[500px] rounded-2xl top-full left-0 border border-white/10 shadow-2xl mt-4">
                  {categories &&
                    categories.map((c) => (
                      <button
                        key={c.slug}
                        onClick={() =>
                          setView({
                            type: "list",
                            slug: c.slug,
                            title: c.name,
                            mode: "the-loai",
                          })
                        }
                        className="text-left text-xs text-gray-400 hover:text-white hover:pl-2 transition-all"
                      >
                        {c.name}
                      </button>
                    ))}
                </div>
              </div>
            </nav>
          </div>
          <div className="flex items-center gap-5">
            <div
              onClick={() => setIsSearchOpen(true)}
              className="hidden md:flex relative group cursor-pointer"
            >
              <div className="bg-black/40 border border-white/10 px-5 py-2 pl-10 rounded-full w-56 lg:w-72 text-sm text-gray-400 group-hover:bg-black/60 transition-all backdrop-blur-md flex items-center">
                Tìm kiếm phim...
              </div>
              <Icon.Search
                className="absolute left-4 top-2.5 text-gray-400 group-hover:text-white transition"
                size={16}
              />
            </div>
            <button
              onClick={() => setIsSearchOpen(true)}
              className="md:hidden p-2"
            >
              <Icon.Search size={22} className="text-white" />
            </button>
          </div>
        </div>
      </header>
    </>
  );
};

// --- 6. BOTTOM NAV ---
const BottomNav = ({ setView, categories, currentView }) => {
  const [showCat, setShowCat] = useState(false);
  return (
    <>
      <div
        className={`md:hidden fixed inset-0 bg-black/90 z-[110] backdrop-blur-sm transition-opacity duration-300 ${
          showCat ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setShowCat(false)}
      >
        <div
          className={`absolute bottom-0 w-full bg-[#111] rounded-t-3xl p-6 transition-transform duration-500 delay-100 ${
            showCat ? "translate-y-0" : "translate-y-full"
          }`}
        >
          <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-6" />
          <h3 className="text-lg font-black text-white mb-6 uppercase tracking-widest text-center">
            Chọn Thể Loại
          </h3>
          <div className="grid grid-cols-2 gap-3 overflow-y-auto max-h-[50vh] pb-8">
            {categories &&
              categories.map((c) => (
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
                  className="bg-white/5 py-3 rounded-xl text-xs text-gray-300 font-bold active:bg-[#E50914] transition"
                >
                  {c.name}
                </button>
              ))}
          </div>
        </div>
      </div>
      <div className="md:hidden fixed bottom-0 w-full bg-[#0a0a0a]/95 backdrop-blur-xl border-t border-white/5 pb-safe z-[100]">
        <div className="flex justify-around items-center p-3">
          {[
            { id: "home", icon: Icon.Home, label: "Trang chủ" },
            { id: "cat", icon: Icon.LayoutGrid, label: "Thể loại" },
            { id: "hot", icon: Icon.Flame, label: "Hot" },
            { id: "user", icon: Icon.User, label: "Thông tin" },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() =>
                item.id === "home"
                  ? setView({ type: "home" })
                  : item.id === "cat"
                  ? setShowCat(true)
                  : {}
              }
              className={`flex flex-col items-center gap-1.5 transition-colors ${
                currentView === item.id ||
                (item.id === "home" && currentView === "home")
                  ? "text-[#E50914]"
                  : "text-gray-500"
              }`}
            >
              <item.icon
                size={22}
                strokeWidth={currentView === item.id ? 2.5 : 2}
              />
              <span className="text-[10px] font-bold">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
};

// --- 7. BANNER ---
const Hero = () => (
  <div className="relative w-full h-[60vh] md:h-[80vh] flex items-center justify-center text-center">
    <div className="absolute inset-0">
      <img
        src="https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=2070&auto=format&fit=crop"
        className="w-full h-full object-cover opacity-60"
        alt=""
        decoding="async"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/40 to-transparent" />
    </div>
    <div className="relative z-10 max-w-4xl mx-auto px-6 animate-in fade-in slide-in-from-bottom-8 duration-1000 mt-16">
      <h1 className="text-4xl md:text-7xl font-black text-white mb-6 tracking-tight drop-shadow-2xl uppercase">
        THẾ GIỚI ĐIỆN ẢNH <br className="hidden md:block" /> TRONG TẦM TAY
      </h1>
      <p className="text-gray-300 text-sm md:text-lg max-w-2xl mx-auto leading-relaxed">
        Tận hưởng hàng ngàn bộ phim bom tấn sắc nét, xem không giới hạn ngay tại
        nhà.
      </p>
    </div>
  </div>
);

// --- 8. DANH SÁCH GRID (SEARCH/CATEGORY) ---
const MovieGrid = ({
  movies,
  setView,
  loading,
  title,
  onLoadMore,
  hasMore,
  loadingMore,
}) => {
  const observer = useRef();
  const lastElementRef = useRef();
  const [progressData, setProgressData] = useState({});

  useEffect(() => {
    setProgressData(JSON.parse(localStorage.getItem("movieProgress") || "{}"));
  }, [movies]);

  useEffect(() => {
    if (loading || loadingMore || !hasMore) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) onLoadMore();
    });
    if (lastElementRef.current)
      observer.current.observe(lastElementRef.current);
  }, [loading, loadingMore, hasMore]);

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 pt-24 pb-10">
      <h2 className="text-xl md:text-2xl font-black text-white mb-6 uppercase tracking-tight flex items-center gap-3">
        <span className="w-1.5 h-7 bg-[#E50914] rounded-full"></span> {title}
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-6">
        {movies.map((m, idx) => (
          <MovieCard
            key={`${m.slug}-${idx}`}
            m={m}
            setView={setView}
            progressData={progressData}
          />
        ))}
      </div>
      {(loading || loadingMore) && (
        <div className="py-10 flex justify-center">
          <Icon.Loader2 className="animate-spin text-[#E50914]" size={32} />
        </div>
      )}
      <div ref={lastElementRef} className="h-10" />
    </div>
  );
};

// --- 9. CHI TIẾT PHIM ---
const MovieDetail = ({ slug, setView }) => {
  const [m, setM] = useState(null);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`${API}/phim/${slug}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((j) => setM(j?.data))
      .catch(() => {});
    return () => controller.abort();
  }, [slug]);

  if (!m)
    return (
      <div className="h-screen flex justify-center items-center">
        <Icon.Loader2 className="animate-spin text-[#E50914]" size={40} />
      </div>
    );
  const i = m.item;

  return (
    <div className="pb-20 animate-in fade-in duration-700">
      <div className="relative min-h-[65vh] md:h-[80vh] w-full overflow-hidden flex flex-col justify-end pt-24 px-4 md:px-8">
        <img
          src={getImg(i?.poster_url || i?.thumb_url)}
          className="absolute inset-0 w-full h-full object-cover opacity-60"
          decoding="async"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/80 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#050505] via-black/20 to-transparent hidden md:block" />
        <div className="relative z-10 w-full max-w-7xl mx-auto pb-8 flex flex-col md:flex-row gap-6 md:gap-10 items-center md:items-end">
          <div className="w-36 md:w-56 lg:w-64 shrink-0 shadow-2xl">
            <img
              src={getImg(i?.thumb_url || i?.poster_url)}
              className="w-full aspect-[2/3] object-cover rounded-xl border border-white/5"
              decoding="async"
            />
          </div>
          <div className="flex-1 text-center md:text-left w-full">
            <h1 className="text-2xl md:text-6xl font-black text-white mb-2 leading-tight drop-shadow-2xl">
              {i?.name}
            </h1>
            <div className="flex flex-wrap justify-center md:justify-start items-center gap-2 mb-6 text-gray-400 text-[10px] md:text-sm font-bold">
              <span className="text-green-500">98% Match</span>
              <span>•</span>
              <span>{i?.year}</span>
              <span>•</span>
              <span className="bg-[#E50914] px-1.5 py-0.5 rounded text-white text-[9px]">
                HD
              </span>
              <span>•</span>
              <span>{i?.episode_current}</span>
            </div>
            <button
              onClick={() => {
                setView({ type: "watch", slug: i?.slug, movieData: m });
                window.scrollTo(0, 0);
              }}
              className="w-full md:w-fit md:min-w-[280px] bg-[#E50914] hover:bg-red-700 text-white px-10 py-3.5 rounded-full font-black flex justify-center items-center gap-3 transition-all transform active:scale-95 shadow-xl uppercase tracking-widest"
            >
              <Icon.Play size={20} fill="currentColor" /> BẮT ĐẦU PHÁT
            </button>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 md:px-8 mt-12 grid md:grid-cols-12 gap-8 items-start">
        <div className="md:col-span-8 bg-[#111] p-6 md:p-8 rounded-2xl border border-white/5 shadow-xl h-fit">
          <div className="flex items-center gap-3 mb-6">
            <span className="w-1 h-7 bg-[#E50914] rounded-full"></span>
            <h3 className="text-sm font-black text-white uppercase tracking-widest">
              Nội dung phim
            </h3>
          </div>
          <div
            className="text-gray-300 text-[13px] md:text-base leading-relaxed"
            dangerouslySetInnerHTML={{ __html: i?.content }}
          />
        </div>
        <div className="md:col-span-4 bg-[#111] p-6 md:p-8 rounded-2xl border border-white/5 shadow-xl space-y-8 h-fit">
          {[
            { l: "Quốc gia", v: i?.country?.map((c) => c.name).join(", ") },
            { l: "Thể loại", v: i?.category?.map((c) => c.name).join(", ") },
            { l: "Diễn viên", v: i?.actor?.slice(0, 8).join(", ") },
          ].map((x) => (
            <div
              key={x.l}
              className="space-y-1.5 border-b border-white/5 pb-4 last:border-0 last:pb-0"
            >
              <p className="text-[9px] text-gray-500 font-black uppercase tracking-[0.25em]">
                {x.l}
              </p>
              <p className="text-xs md:text-sm font-bold text-gray-300 leading-snug">
                {x.v || "Đang cập nhật"}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// --- 10. MÀN HÌNH XEM PHIM ---
const Watch = ({ slug, movieData }) => {
  const [data, setData] = useState(movieData?.item || null),
    [ep, setEp] = useState(null);
  useEffect(() => {
    if (movieData?.item) {
      setData(movieData.item);
      setEp(movieData.item.episodes?.[0]?.server_data?.[0]);
    } else {
      fetch(`${API}/phim/${slug}`)
        .then((r) => r.json())
        .then((j) => {
          setData(j?.data?.item);
          setEp(j?.data?.item?.episodes?.[0]?.server_data?.[0]);
        });
    }
  }, [slug, movieData]);

  if (!data)
    return (
      <div className="h-screen flex justify-center items-center">
        <Icon.Loader2 className="animate-spin text-[#E50914]" size={40} />
      </div>
    );

  return (
    <div className="pt-20 md:pt-28 pb-10 max-w-7xl mx-auto px-4 md:px-8 animate-in fade-in duration-500">
      {ep && (
        <Player
          src={ep.link_m3u8}
          poster={getImg(data?.poster_url || data?.thumb_url)}
          movieSlug={slug}
          episodeSlug={ep.slug}
          movieName={data?.name}
          thumbUrl={data?.thumb_url || data?.poster_url}
        />
      )}
      <div className="mt-10 bg-[#111] p-6 rounded-2xl border border-white/5 shadow-2xl">
        <h1 className="text-2xl font-black text-white mb-2">{data?.name}</h1>
        <p className="text-gray-400 text-sm mb-8">
          Đang phát:{" "}
          <span className="text-[#E50914] font-bold">{ep?.name}</span>
        </p>
        {data?.episodes?.map((s) => (
          <div key={s.server_name} className="mb-6 last:mb-0">
            <p className="text-[11px] text-gray-500 font-black mb-4 uppercase tracking-widest">
              {s.server_name}
            </p>
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2 md:gap-3">
              {s.server_data.map((e) => (
                <button
                  key={e.slug}
                  onClick={() => {
                    setEp(e);
                    window.scrollTo(0, 0);
                  }}
                  className={`py-3 text-xs md:text-sm rounded-md font-bold transition-all ${
                    ep?.slug === e.slug
                      ? "bg-[#E50914] text-white shadow-lg shadow-red-600/30"
                      : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {e.name}
                </button>
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
  const [view, setView] = useState({ type: "home" }),
    [movies, setMovies] = useState([]),
    [loading, setLoading] = useState(true),
    [cats, setCats] = useState([]);
  const [page, setPage] = useState(1),
    [hasMore, setHasMore] = useState(false),
    [loadingMore, setLoadingMore] = useState(false);
  const [progressData, setProgressData] = useState({});

  const refreshProgress = () => {
    setProgressData(JSON.parse(localStorage.getItem("movieProgress") || "{}"));
  };
  const removeProgress = (slug) => {
    const current = JSON.parse(localStorage.getItem("movieProgress") || "{}");
    delete current[slug];
    localStorage.setItem("movieProgress", JSON.stringify(current));
    refreshProgress();
  };

  useEffect(() => {
    refreshProgress();
    fetch(`${API}/the-loai`)
      .then((r) => r.json())
      .then((j) => setCats(j?.data?.items || []))
      .catch(() => {});
  }, [view]);

  const fetchData = (pageNum, isNewView = false) => {
    if (isNewView) setLoading(true);
    else setLoadingMore(true);
    let url = "";
    if (view.type === "search")
      url = `${API}/tim-kiem?keyword=${view.keyword}&page=${pageNum}`;
    else if (view.type === "list")
      url = `${API}/${view.mode}/${view.slug}?page=${pageNum}`;
    else url = `${API}/home?page=${pageNum}`;

    fetch(url)
      .then((r) => r.json())
      .then((j) => {
        const newItems = j?.data?.items || [];
        if (isNewView) setMovies(newItems);
        else setMovies((prev) => [...prev, ...newItems]);
        const pagination = j?.data?.params?.pagination;
        setHasMore(
          pagination
            ? pageNum * pagination.totalItemsPerPage < pagination.totalItems
            : false
        );
      })
      .catch(() => {})
      .finally(() => {
        setLoading(false);
        setLoadingMore(false);
      });
  };

  useEffect(() => {
    if (view.type !== "home") {
      setPage(1);
      setMovies([]);
      fetchData(1, true);
    }
  }, [view]);

  return (
    <div className="bg-[#050505] min-h-screen text-white font-sans antialiased selection:bg-[#E50914] selection:text-white pb-16 md:pb-10">
      <style>{`.no-scrollbar::-webkit-scrollbar { display: none; }.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }`}</style>
      <Header setView={setView} categories={cats} />
      {view.type === "home" ? (
        <>
          <Hero />
          <div className="max-w-7xl mx-auto px-4 md:px-8 -mt-10 md:-mt-24 relative z-20 pb-20">
            <MovieSection
              title="Phim Mới Cập Nhật"
              slug="phim-moi"
              setView={setView}
              progressData={progressData}
            />
            <MovieSection
              title="Phim Trending 🔥"
              slug="phim-bo"
              setView={setView}
              progressData={progressData}
            />
            <ContinueWatching
              setView={setView}
              progressData={progressData}
              onRemove={removeProgress}
            />
            <MovieSection
              title="Hành Động & Phiêu Lưu"
              slug="hanh-dong"
              setView={setView}
              progressData={progressData}
            />
            <MovieSection
              title="Viễn Tưởng & Siêu Anh Hùng"
              slug="vien-tuong"
              setView={setView}
              progressData={progressData}
            />
            <MovieSection
              title="Kinh Dị & Giật Gân"
              slug="kinh-di"
              setView={setView}
              progressData={progressData}
            />
          </div>
        </>
      ) : view.type === "detail" ? (
        <MovieDetail slug={view.slug} setView={setView} />
      ) : view.type === "watch" ? (
        <Watch slug={view.slug} movieData={view.movieData} />
      ) : (
        <MovieGrid
          title={
            view.type === "search" ? `Tìm kiếm: ${view.keyword}` : view.title
          }
          movies={movies}
          loading={loading}
          setView={setView}
          onLoadMore={() => {
            if (!loadingMore && hasMore) {
              setPage((p) => p + 1);
              fetchData(page + 1, false);
            }
          }}
          hasMore={hasMore}
          loadingMore={loadingMore}
        />
      )}
      <BottomNav setView={setView} categories={cats} currentView={view.type} />
    </div>
  );
}
