import React, { useState, useEffect, useRef } from "react";
import * as Icon from "lucide-react";
import { API, API_NGUONC, safeText, isHoatHinhMovie, mergeDuplicateMovies, getMovieUniqueId, globalDisplayedSlugs, fetchWithCache } from "../../utils/helpers";
import MovieCard from "../../components/common/MovieCard";

export default function MovieSection({ title, slug, type = "the-loai", navigate, progressData }) {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef(null);

  useEffect(() => {
    let isMounted = true; 
    
    const fetchMovies = async () => {
      try {
        setLoading(true);

        let reqs = [];

        // --- SỬ DỤNG FETCH CACHE SIÊU TỐC THAY VÌ FETCH TIMEOUT GỐC ---
        if (slug === 'hoat-hinh') {
            reqs = [
                fetchWithCache(`${API}/danh-sach/hoat-hinh?page=1`),
                fetchWithCache(`${API}/the-loai/hoat-hinh?page=1`),
                fetchWithCache(`${API_NGUONC}/the-loai/hoathinh?page=1`),
                fetchWithCache(`${API}/danh-sach/hoat-hinh?page=2`),
                fetchWithCache(`${API}/the-loai/hoat-hinh?page=2`),
                fetchWithCache(`${API_NGUONC}/the-loai/hoathinh?page=2`)
            ];
        } else {
            let urlOphim = `${API}/${type}/${slug}`;
            let urlNguonc = slug === 'phim-moi-cap-nhat' ? `${API_NGUONC}/phim-moi-cap-nhat` : `${API_NGUONC}/${type}/${slug}`;
            
            reqs = [
                fetchWithCache(`${urlOphim}?page=1`),
                fetchWithCache(`${urlNguonc}?page=1`),
                fetchWithCache(`${urlOphim}?page=2`),
                fetchWithCache(`${urlNguonc}?page=2`),
                fetchWithCache(`${urlOphim}?page=3`),
                fetchWithCache(`${urlNguonc}?page=3`)
            ];
        }

        const results = await Promise.allSettled(reqs);
        
        if (!isMounted) return;

        let allItems = [];
        results.forEach(res => {
            if (res.status === 'fulfilled' && res.value) {
                // Nhờ có fetchWithCache nên data trả về là Object luôn rồi
                const items = res.value.items || res.value.data?.items || [];
                allItems.push(...items);
            }
        });

        let merged = mergeDuplicateMovies(allItems);
        
        if (slug === 'hoat-hinh') {
            // Mục Hoạt hình được quyền thoải mái
        } else {
            merged = merged.filter(m => !isHoatHinhMovie(m));
        }

        let uniqueMovies = [];
        merged.forEach(m => {
            const id = getMovieUniqueId(m);
            if (id && !globalDisplayedSlugs.has(id)) {
                uniqueMovies.push(m);
            }
        });

        let finalMovies = uniqueMovies;
        if (uniqueMovies.length < 10) {
            finalMovies = merged; 
        }

        finalMovies = finalMovies.slice(0, 15);

        finalMovies.forEach(m => {
            const id = getMovieUniqueId(m);
            if (id) globalDisplayedSlugs.add(id);
        });

        setMovies(finalMovies);
        
      } catch (error) {
          console.error(error);
      } finally {
        if (isMounted) {
           setLoading(false);
        }
      }
    };

    fetchMovies();
    return () => { isMounted = false; };
  }, [slug, type]);

  const scroll = (direction) => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current;
      const scrollTo = direction === "left" ? scrollLeft - clientWidth * 0.8 : scrollLeft + clientWidth * 0.8;
      scrollRef.current.scrollTo({ left: scrollTo, behavior: "smooth" });
    }
  };

  if (loading) return (
    <div className="mb-8 md:mb-12 relative group/section transform-gpu">
       <div className="flex items-center gap-4 mb-3 md:mb-4 px-1">
          <h2 className="text-[15px] sm:text-lg md:text-2xl font-black text-white uppercase tracking-tighter flex items-center gap-2 md:gap-3">
            <span className="w-[4px] h-6 md:h-8 bg-[#E50914] block" /> {safeText(title)}
          </h2>
          <Icon.Loader2 className="animate-spin text-[#E50914]" size={20} />
       </div>
    </div>
  );
  if (movies.length === 0) return null;

  return (
    <div className="mb-8 md:mb-12 relative group/section transform-gpu">
      <div className="flex items-center justify-between mb-3 md:mb-4 px-1">
        <h2 className="text-[15px] sm:text-lg md:text-2xl font-black text-white uppercase tracking-tighter flex items-center gap-2 md:gap-3">
          <span className="w-[4px] h-6 md:h-8 bg-[#E50914] block" /> {safeText(title)}
        </h2>
        <button onClick={() => navigate({ type: "list", slug, title, mode: type })} className="text-[#E50914] text-[9px] sm:text-[10px] md:text-xs font-black hover:underline opacity-100 md:opacity-0 group-hover/section:opacity-100 transition-opacity uppercase tracking-widest">Xem tất cả</button>
      </div>
      <div className="relative">
        <button onClick={() => scroll("left")} className="absolute left-0 top-[40%] -translate-y-1/2 z-[40] bg-black/60 hover:bg-black/90 text-white p-2 md:p-3 rounded-r-2xl backdrop-blur-md opacity-0 group-hover/section:opacity-100 transition-all hidden md:flex items-center shadow-2xl transform-gpu">
          <Icon.ChevronLeft size={30} className="md:w-9 md:h-9" />
        </button>
        <div ref={scrollRef} className="flex gap-3 sm:gap-4 md:gap-6 overflow-x-auto scroll-smooth no-scrollbar pb-4 px-1 md:px-2 snap-x snap-mandatory overscroll-x-contain will-change-scroll">
          {movies.map((m) => <MovieCard key={m.slug} m={m} navigate={navigate} progressData={progressData} isRow={true} />)}
        </div>
        <button onClick={() => scroll("right")} className="absolute right-0 top-[40%] -translate-y-1/2 z-[40] bg-black/60 hover:bg-black/90 text-white p-2 md:p-3 rounded-l-2xl backdrop-blur-md opacity-0 group-hover/section:opacity-100 transition-all hidden md:flex items-center shadow-2xl transform-gpu">
          <Icon.ChevronRight size={30} className="md:w-9 md:h-9" />
        </button>
      </div>
    </div>
  );
}