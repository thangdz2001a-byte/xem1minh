import React, { useState, useEffect, useRef } from "react";
import * as Icon from "lucide-react";
import { API, API_NGUONC, mergeDuplicateMovies } from "../../utils/helpers";
import SearchItem from "./SearchItem";

export default function SearchModal({ isOpen, onClose, navigate }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
        setTimeout(() => inputRef.current?.focus(), 100);
        
        const currentUrl = new URL(window.location.href);
        if (currentUrl.pathname === '/tim-kiem') {
            const q = currentUrl.searchParams.get('q');
            if (q) setQuery(q);
        }
    } else { 
        setQuery(""); 
        setResults([]); 
        setLoading(false); 
    }
  }, [isOpen]);

  useEffect(() => {
    if (query.trim().length < 2) { 
        setResults([]); 
        setLoading(false); 
        return; 
    }
    
    setLoading(true);
    const controller = new AbortController();
    
    const delay = setTimeout(async () => {
      const timeoutId = setTimeout(() => controller.abort(), 8000); 
      try {
        const encodedQuery = encodeURIComponent(String(query || "").trim());
        
        const pOphim = fetch(`${API}/tim-kiem?keyword=${encodedQuery}`, { signal: controller.signal })
            .then(r => r.json())
            .then(d => {
                if (d?.data?.items && d.data.items.length > 0) return d.data.items;
                throw new Error();
            });
            
        const pNguonc = fetch(`${API_NGUONC}/search?keyword=${encodedQuery}`, { signal: controller.signal })
            .then(r => r.json())
            .then(d => {
                const items = d?.items || d?.data?.items;
                if (items && items.length > 0) return items;
                throw new Error();
            });

        const items = await Promise.any([pOphim, pNguonc]);
        if (!controller.signal.aborted) setResults(mergeDuplicateMovies(items));
        
      } catch (error) {
        if (!controller.signal.aborted) setResults([]);
      } finally {
        clearTimeout(timeoutId);
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 400);
    
    return () => { clearTimeout(delay); controller.abort(); };
  }, [query]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-md flex justify-center pt-16 md:pt-24 px-4 transition-opacity transform-gpu">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative w-full max-w-3xl bg-[#111] rounded-2xl border border-white/10 shadow-2xl flex flex-col max-h-[75vh] overflow-hidden transform-gpu">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (query) { navigate({ type: "search", keyword: query }); onClose(); }
          }}
          className="flex items-center p-4 border-b border-white/5 bg-[#1a1a1a] relative"
        >
          <Icon.Search className="text-gray-400 absolute left-6" size={20} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm kiếm phim..."
            className="w-full bg-transparent outline-none text-white pl-10 pr-20 py-2 text-base md:text-lg"
          />
          <button 
            type="submit" 
            className="absolute right-6 text-xs text-white font-bold bg-[#E50914] hover:bg-red-700 px-4 py-1.5 rounded transition-colors uppercase tracking-widest"
          >
            TÌM
          </button>
        </form>
        <div className="overflow-y-auto flex-1 p-2 no-scrollbar overscroll-contain">
          {loading ? (
            <div className="py-10 flex justify-center"><Icon.Loader2 className="animate-spin text-[#E50914]" size={30} /></div>
          ) : results.length > 0 ? (
            <>
              {results.map((m, idx) => <SearchItem key={m.slug || `s-${idx}`} m={m} navigate={navigate} onClose={onClose} />)}
              <button
                onClick={() => { navigate({ type: "search", keyword: query }); onClose(); }}
                className="w-full mt-2 py-4 text-center text-[#E50914] font-bold text-sm hover:bg-white/5 transition-colors rounded-xl border border-dashed border-white/10"
              >
                Xem tất cả kết quả
              </button>
            </>
          ) : query.trim().length >= 2 && !loading ? (
            <div className="py-10 text-center text-gray-500">Không tìm thấy phim nào phù hợp.</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}