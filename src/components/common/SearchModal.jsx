import React, { useState, useEffect, useRef } from "react";
import * as Icon from "lucide-react";
import { API, mergeDuplicateMovies, normalizeString } from "../../utils/helpers";
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
      if (currentUrl.pathname === "/tim-kiem") {
        const q = currentUrl.searchParams.get("q");
        if (q) setQuery(q);
      }
    } else {
      setQuery("");
      setResults([]);
      setLoading(false);
    }
  }, [isOpen]);

  useEffect(() => {
    const rawQuery = String(query || "").trim();

    if (rawQuery.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const controller = new AbortController();

    const delay = setTimeout(async () => {
      let timeoutId;

      try {
        timeoutId = setTimeout(() => controller.abort(), 8000);

        const normalized = normalizeString(rawQuery);
        const variantSpace = normalized;
        const variantDash = normalized.replace(/\s+/g, "-");
        const variantCompact = normalized.replace(/\s+/g, "");

        const queries = [...new Set([
          rawQuery,
          variantSpace,
          variantDash,
          variantCompact
        ].filter(q => q && q.length >= 2))];

        const responses = await Promise.all(
          queries.map(async (q) => {
            try {
              const encodedQuery = encodeURIComponent(q);
              const url = `${API}/tim-kiem?keyword=${encodedQuery}&limit=50`;
              const response = await fetch(url, { signal: controller.signal });
              const data = await response.json();
              return data?.data?.items || [];
            } catch (err) {
              return [];
            }
          })
        );

        if (!controller.signal.aborted) {
          const mergedRaw = responses.flat();
          const deduped = mergeDuplicateMovies(mergedRaw);
          const nq = normalizeString(rawQuery);

          const scored = deduped
            .map((item) => {
              const name = normalizeString(item?.name || "");
              const origin = normalizeString(item?.origin_name || item?.original_name || "");
              const slug = normalizeString(item?.slug || "");

              let score = 0;

              if (name === nq || origin === nq || slug === nq) score += 100;
              if (name.includes(nq)) score += 40;
              if (origin.includes(nq)) score += 35;
              if (slug.includes(nq)) score += 30;

              if (nq.includes(name) && name.length > 1) score += 15;
              if (nq.includes(origin) && origin.length > 1) score += 10;

              if (item?.poster_url) score += 3;
              if (item?.thumb_url || item?.thumb) score += 2;
              if (item?.year) score += 1;

              return { item, score };
            })
            .sort((a, b) => b.score - a.score)
            .map((x) => x.item);

          setResults(scored);
        }
      } catch (error) {
        if (!controller.signal.aborted) setResults([]);
      } finally {
        clearTimeout(timeoutId);
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 400);

    return () => {
      clearTimeout(delay);
      controller.abort();
    };
  }, [query]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-md flex justify-center pt-16 md:pt-24 px-4 transition-opacity transform-gpu">
      <div className="absolute inset-0" onClick={onClose} />
      
      <div className="relative w-full max-w-3xl bg-[#111] rounded-2xl border border-white/10 shadow-2xl flex flex-col h-fit max-h-[75vh] overflow-hidden transform-gpu">
        
        <form
          onSubmit={(e) => {
            e.preventDefault(); 
            if (query.trim()) {
              navigate({ type: "search", keyword: query });
              onClose();
            }
          }}
          className="flex shrink-0 items-center p-4 border-b border-white/5 bg-[#1a1a1a] relative"
        >
          <Icon.Search className="text-gray-400 absolute left-6" size={20} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm kiếm phim... (Nhấn Enter để tìm)"
            className="w-full bg-transparent outline-none text-white pl-10 pr-20 py-2 text-base md:text-lg"
          />
          <button
            type="submit"
            className="absolute right-6 text-xs text-white font-bold bg-[#E50914] hover:bg-red-700 px-4 py-1.5 rounded transition-colors uppercase tracking-widest"
          >
            TÌM
          </button>
        </form>

        {/* Khu vực hiển thị kết quả (ĐÃ ẨN THANH CUỘN TRẮNG BẰNG CSS TAILWIND) */}
        {query.trim().length >= 2 && (
          <div className="overflow-y-auto flex-1 p-2 overscroll-contain [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {loading ? (
              <div className="py-6 flex justify-center">
                <Icon.Loader2 className="animate-spin text-[#E50914]" size={30} />
              </div>
            ) : results.length > 0 ? (
              <>
                {/* HIỂN THỊ SỐ LƯỢNG KẾT QUẢ Ở ĐÂY */}
                <div className="px-2 pt-1 pb-3 text-[10px] md:text-xs text-gray-500 font-bold uppercase tracking-widest border-b border-white/5 mb-2">
                  Hiển thị {Math.min(results.length, 5)} / {results.length} kết quả
                </div>

                {/* CHỈ RENDER TỐI ĐA 5 KẾT QUẢ BẰNG SLICE(0,5) */}
                {results.slice(0, 5).map((m, idx) => (
                  <SearchItem
                    key={m.slug || `s-${idx}`}
                    m={m}
                    navigate={navigate}
                    onClose={onClose}
                  />
                ))}

                <button
                  type="button"
                  onClick={() => {
                    navigate({ type: "search", keyword: query });
                    onClose();
                  }}
                  className="w-full mt-2 py-4 text-center text-[#E50914] font-bold text-sm hover:bg-white/5 transition-colors rounded-xl border border-dashed border-white/10"
                >
                  Xem tất cả kết quả
                </button>
              </>
            ) : !loading ? (
              <div className="py-6 text-center text-gray-500">
                Không tìm thấy phim nào phù hợp.
              </div>
            ) : null}
          </div>
        )}

      </div>
    </div>
  );
}