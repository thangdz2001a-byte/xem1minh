import React, { useState, useEffect, useRef } from "react";
import * as Icon from "lucide-react";
import { API, API_NGUONC_DETAIL, fetchWithCache, getMoviePoster, getImg } from "../../utils/helpers";
import MovieCard from "../../components/common/MovieCard";

export default function ContinueWatching({ navigate, progressData, hiddenSlugs = [], onRemove, isLoggedIn }) {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [popupMovie, setPopupMovie] = useState(null); 
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const scrollRef = useRef(null);

  const historySlugs = Object.keys(progressData || {})
    .filter((slug) => {
      const prog = progressData[slug];
      if (!prog) return false;
      if (prog.percentage >= 99) return false; 
      if (hiddenSlugs.includes(slug)) return false; 
      return true;
    })
    .sort((a, b) => (progressData[b].timestamp || 0) - (progressData[a].timestamp || 0))
    .join(",");

  useEffect(() => {
    if (!isLoggedIn) {
      setMovies([]);
      setLoading(false);
      return;
    }

    const fetchMovies = async () => {
      setLoading(true);
      const slugs = historySlugs.split(",").filter(Boolean);
      
      if (slugs.length === 0) {
        setMovies([]);
        setLoading(false);
        return;
      }

      const fetchedMovies = await Promise.all(
        slugs.map(async (slug) => {
          try {
            const prog = progressData[slug];
            const fallbackUrl = getMoviePoster(prog, {}, getImg);
            
            const safeThumb = prog.thumb ? getImg(prog.thumb) : fallbackUrl;

            const baseMovie = {
              slug,
              name: prog.name,
              origin_name: prog.origin_name || prog.original_name || "",
              year: prog.year,
              thumb_url: safeThumb, 
              poster_url: safeThumb
            };

            if (baseMovie.name && baseMovie.thumb_url && !baseMovie.thumb_url.includes("placehold.co")) {
              return baseMovie;
            }

            let res = await fetchWithCache(`${API}/phim/${slug}`, 300000);
            let movie = res?.movie || res?.data?.item || res?.item;

            if (!movie) {
              res = await fetchWithCache(`${API_NGUONC_DETAIL}/${slug}`, 300000);
              movie = res?.movie || res?.data?.item || res?.item;
            }

            if (movie) {
              movie.slug = slug;
              return movie;
            }

            return baseMovie;
          } catch (e) {
            return null;
          }
        })
      );

      setMovies(fetchedMovies.filter(Boolean));
      setLoading(false);
    };

    fetchMovies();
  }, [historySlugs, progressData, isLoggedIn]);

  const scroll = (direction) => {
    if (!scrollRef.current) return;
    const { scrollLeft, clientWidth } = scrollRef.current;
    const scrollTo = direction === "left" ? scrollLeft - clientWidth * 0.8 : scrollLeft + clientWidth * 0.8;
    scrollRef.current.scrollTo({ left: scrollTo, behavior: "smooth" });
  };

  const handleRemoveRequest = (movie) => {
    const skipPopup = localStorage.getItem("skip_remove_warning") === "true";
    if (skipPopup) {
      onRemove(movie.slug);
    } else {
      setDontShowAgain(false);
      setPopupMovie(movie); 
    }
  };

  const confirmHide = () => {
    if (popupMovie) {
      if (dontShowAgain) {
        localStorage.setItem("skip_remove_warning", "true");
      }
      onRemove(popupMovie.slug); 
      setPopupMovie(null);       
    }
  };

  // ĐÃ XÓA hàm handleDirectWatchNavigate ở đây để không phá logic của MovieCard

  if (!isLoggedIn) return null;
  if (!loading && movies.length === 0) return null;

  return (
    <>
      <div className="mb-8 md:mb-12 relative group/section transform-gpu animate-in fade-in duration-500">
        <div className="flex items-center gap-4 mb-3 md:mb-4 px-1">
          <h2 className="text-[15px] sm:text-lg md:text-2xl font-black text-white uppercase tracking-tighter flex items-center gap-2 md:gap-3">
            <span className="w-[4px] h-6 md:h-8 bg-[#E50914] block" /> Đang Xem Gần Đây
          </h2>
        </div>

        <div className="relative">
          <button
            onClick={() => scroll("left")}
            className="absolute left-2 md:left-3 top-[38%] -translate-y-1/2 z-[40] hidden md:flex items-center justify-center w-10 h-10 rounded-full bg-black text-white border border-white/10 opacity-0 -translate-x-2 group-hover/section:opacity-100 group-hover/section:translate-x-0 hover:bg-[#151515] hover:border-white/20 hover:scale-105 active:scale-95 transition-all duration-300 shadow-[0_10px_28px_rgba(0,0,0,0.5)]"
          >
            <Icon.ChevronLeft size={20} strokeWidth={2.7} />
          </button>

          <div
            ref={scrollRef}
            className="flex gap-3 sm:gap-4 md:gap-6 overflow-x-auto scroll-smooth pb-4 px-1 md:px-2 snap-x snap-mandatory overscroll-x-contain [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
          >
            {loading ? (
              Array.from({ length: 5 }).map((_, idx) => (
                <div key={idx} className="w-[120px] sm:w-[150px] md:w-52 lg:w-60 shrink-0">
                  <div className="aspect-[2/3] rounded-xl bg-white/5 animate-pulse" />
                </div>
              ))
            ) : (
              movies.map((m) => (
                <MovieCard
                  key={m.slug}
                  m={m}
                  navigate={navigate} // TRUYỀN THẲNG navigate GỐC VÀO ĐÂY
                  progressData={progressData}
                  isRow={true}
                  useTmdb={true}
                  onRemove={() => handleRemoveRequest(m)} 
                />
              ))
            )}
          </div>

          <button
            onClick={() => scroll("right")}
            className="absolute right-2 md:right-3 top-[38%] -translate-y-1/2 z-[40] hidden md:flex items-center justify-center w-10 h-10 rounded-full bg-black text-white border border-white/10 opacity-0 translate-x-2 group-hover/section:opacity-100 group-hover/section:translate-x-0 hover:bg-[#151515] hover:border-white/20 hover:scale-105 active:scale-95 transition-all duration-300 shadow-[0_10px_28px_rgba(0,0,0,0.5)]"
          >
            <Icon.ChevronRight size={20} strokeWidth={2.7} />
          </button>
        </div>
      </div>

      {/* POPUP XÓA */}
      {popupMovie && (
        <div className="fixed inset-0 z-[999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111] border border-white/10 rounded-2xl p-6 md:p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
            
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-[#E50914]/10 rounded-full text-[#E50914]">
                <Icon.Info size={28} strokeWidth={2.5} />
              </div>
              <h3 className="text-xl md:text-2xl font-black text-white uppercase tracking-wider">Lưu ý</h3>
            </div>

            <p className="text-gray-300 mb-4 leading-relaxed">
              Phim <span className="font-bold text-[#E50914]">"{popupMovie.name}"</span> sẽ được ẩn khỏi mục này. 
              <br/><br/>
              Để xóa hẳn tiến trình xem vĩnh viễn, vui lòng vào mục <span className="font-bold text-white cursor-pointer hover:text-[#E50914] transition-colors" onClick={() => { setPopupMovie(null); navigate({ type: "history" }); }}>Phim Đã Xem</span>.
            </p>

            <div 
              className="flex items-center gap-2.5 mb-6 cursor-pointer group w-max"
              onClick={() => setDontShowAgain(!dontShowAgain)}
            >
              <div className={`w-[18px] h-[18px] rounded-md flex items-center justify-center border transition-all duration-200 ${
                dontShowAgain 
                  ? 'bg-[#E50914] border-[#E50914]' 
                  : 'border-white/30 bg-white/5 group-hover:border-white/60'
              }`}>
                {dontShowAgain && <Icon.Check size={14} strokeWidth={4} className="text-white" />}
              </div>
              <span className="text-sm text-gray-400 select-none group-hover:text-gray-200 transition-colors">
                Không hiện lại thông báo này
              </span>
            </div>

            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setPopupMovie(null)} 
                className="px-5 py-2.5 rounded-xl font-bold text-sm text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors uppercase tracking-wider"
              >
                Hủy
              </button>
              <button 
                onClick={confirmHide} 
                className="px-6 py-2.5 rounded-xl font-bold text-sm bg-[#E50914] hover:bg-red-700 text-white transition-colors uppercase tracking-wider shadow-[0_4px_15px_rgba(229,9,20,0.4)]"
              >
                Đã hiểu & Ẩn
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}