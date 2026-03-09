import React, { useEffect, useRef } from "react";
import * as Icon from "lucide-react";
import { safeText } from "../../utils/helpers";
import MovieCard from "../../components/common/MovieCard";

export default function MovieGrid({ movies, navigate, loading, title, onLoadMore, hasMore, loadingMore }) {
  const observer = useRef();
  const lastElementRef = useRef();

  useEffect(() => {
    if (loading || loadingMore || !hasMore) return;
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver((entries) => { 
        if (entries[0].isIntersecting) onLoadMore(); 
    }, {
        rootMargin: '2000px' 
    });
    
    if (lastElementRef.current) observer.current.observe(lastElementRef.current);
  }, [loading, loadingMore, hasMore, onLoadMore]);

  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-12 pt-20 md:pt-32 pb-10 min-h-screen transform-gpu">
      <h2 className="text-xl md:text-[28px] font-black text-white mb-8 uppercase tracking-tighter flex items-center gap-3">
        <span className="w-[4px] h-6 md:h-9 bg-[#E50914] block" /> {safeText(title)}
      </h2>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-4 sm:gap-6">
        {movies.map((m, idx) => <MovieCard key={`${m.slug || idx}-${idx}`} m={m} navigate={navigate} />)}
      </div>
      {(loading || loadingMore) && <div className="py-12 flex justify-center"><Icon.Loader2 className="animate-spin text-[#E50914]" size={36} /></div>}
      <div ref={lastElementRef} className="h-20" />
    </div>
  );
}