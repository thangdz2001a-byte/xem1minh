import React, { useState, useEffect, useRef, useMemo } from "react";
import * as Icon from "lucide-react";
import { API, API_NGUONC_DETAIL } from "../../utils/helpers";
import MovieCard from "../../components/common/MovieCard";

export default function ContinueWatching({ navigate, progressData, onRemove }) {
  const scrollRef = useRef(null);
  
  const watchedSlugs = useMemo(() => Object.keys(progressData).filter((key) => {
      const item = progressData[key];
      return item && typeof item === 'object' && item.percentage < 99;
  }), [progressData]);
  
  const [fetchedData, setFetchedData] = useState({});

  useEffect(() => {
    const fetchMissingData = async () => {
      let newFetched = { ...fetchedData };
      let hasChanges = false;
      
      for (const slug of watchedSlugs) {
        if (!progressData[slug].origin_name && !newFetched[slug]) {
          try {
            const res = await fetch(`${API}/phim/${slug}`);
            const j = await res.json();
            if (j?.data?.item) {
              newFetched[slug] = j.data.item;
              hasChanges = true;
            } else {
               const res2 = await fetch(`${API_NGUONC_DETAIL}/${slug}`);
               const j2 = await res2.json();
               
               let item2 = j2?.movie || j2?.item;
               if (item2) {
                   if(j2?.episodes) item2.episodes = j2.episodes;
                   newFetched[slug] = item2;
                   hasChanges = true;
               }
            }
          } catch (e) {}
        }
      }
      
      if (hasChanges) {
        setFetchedData(newFetched);
      }
    };
    
    if (watchedSlugs.length > 0) {
      fetchMissingData();
    }
  }, [watchedSlugs, progressData]);

  if (watchedSlugs.length === 0) return null;

  const scroll = (direction) => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current;
      const scrollTo = direction === "left" ? scrollLeft - clientWidth * 0.8 : scrollLeft + clientWidth * 0.8;
      scrollRef.current.scrollTo({ left: scrollTo, behavior: "smooth" });
    }
  };

  return (
    <div className="mb-8 md:mb-12 animate-in slide-in-from-left duration-500 group/section transform-gpu">
      <div className="flex items-center mb-3 md:mb-4 px-1">
        <h2 className="text-[15px] sm:text-lg md:text-2xl font-black text-white uppercase tracking-tighter flex items-center gap-2 md:gap-3">
          <span className="w-[4px] h-6 md:h-8 bg-[#E50914] block" /> Tiếp tục xem
        </h2>
      </div>
      <div className="relative">
        <button onClick={() => scroll("left")} className="absolute left-0 top-[40%] -translate-y-1/2 z-[40] bg-black/60 hover:bg-black/90 text-white p-2 md:p-3 rounded-r-2xl backdrop-blur-md opacity-0 group-hover/section:opacity-100 transition-all hidden md:flex items-center shadow-2xl transform-gpu">
          <Icon.ChevronLeft size={30} className="md:w-9 md:h-9" />
        </button>
        <div ref={scrollRef} className="flex gap-3 sm:gap-4 md:gap-6 overflow-x-auto scroll-smooth no-scrollbar pb-4 px-1 md:px-2 snap-x snap-mandatory overscroll-x-contain will-change-scroll">
          {watchedSlugs.reverse().map((slug) => {
            const prog = progressData[slug];
            const fetched = fetchedData[slug];
            
            const exactOriginName = prog.origin_name || fetched?.origin_name || fetched?.original_name || prog.name;
            const exactYear = prog.year || fetched?.year;
            const thumb = fetched?.thumb_url || fetched?.poster_url || prog.thumb;

            return (
              <MovieCard 
                key={slug} 
                m={{ 
                  slug, 
                  name: prog.name, 
                  origin_name: exactOriginName, 
                  thumb: thumb,
                  year: exactYear
                }} 
                navigate={navigate} 
                progressData={progressData} 
                isRow={true} 
                onRemove={onRemove} 
                onClickOverride={() => { navigate({ type: "watch", slug, movieData: { item: { slug, name: prog.name, origin_name: exactOriginName, thumb_url: thumb, year: exactYear } } }); window.scrollTo(0, 0); }} 
              />
            );
          })}
        </div>
        <button onClick={() => scroll("right")} className="absolute right-0 top-[40%] -translate-y-1/2 z-[40] bg-black/60 hover:bg-black/90 text-white p-2 md:p-3 rounded-l-2xl backdrop-blur-md opacity-0 group-hover/section:opacity-100 transition-all hidden md:flex items-center shadow-2xl transform-gpu">
          <Icon.ChevronRight size={30} className="md:w-9 md:h-9" />
        </button>
      </div>
    </div>
  );
}