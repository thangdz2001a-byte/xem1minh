import { useState, useEffect } from "react";
import { fetchTMDB } from "./helpers";

const TMDB_API_KEY = "0e620a51728a0fea887a8506831d8866";
const tmdbCache = new Map();

export default function useTmdbImage(m, enableTmdb = true) {
  const fallbackImg = "https://placehold.co/400x600/111/333?text=Chưa+Có+Ảnh";
  
  const slugKey = m?.slug;

  // 1. KIỂM TRA ĐỒNG BỘ ÉP BUỘC TỪ LOCALSTORAGE TRƯỚC
  let directTmdbUrl = null;
  if (slugKey) {
    try {
      const syncedPoster = localStorage.getItem(`polite_sync_poster_${slugKey}`);
      if (syncedPoster && syncedPoster.includes("tmdb.org")) {
        directTmdbUrl = syncedPoster;
      }
    } catch (e) {}
  }

  // 2. TÌM TRỰC TIẾP TRONG DATA (Nếu truyền từ ngoài vào)
  if (!directTmdbUrl) {
    const directPath = m?.tmdb?.poster_path || m?.poster_path;
    if (directPath && directPath !== "undefined" && directPath !== "null" && directPath.startsWith("/")) {
      directTmdbUrl = `https://image.tmdb.org/t/p/w500${directPath}`;
    }
  }

  const [posterSrc, setPosterSrc] = useState(directTmdbUrl);
  const [isLoading, setIsLoading] = useState(!directTmdbUrl);

  useEffect(() => {
    let isMounted = true;
    
    // Hàm khóa Poster lại để dùng chung
    const lockSyncPoster = (url) => {
      if (url && slugKey && url.includes("tmdb.org")) {
        try { localStorage.setItem(`polite_sync_poster_${slugKey}`, url); } catch(e) {}
      }
    };

    if (!m || !enableTmdb) {
      if (!directTmdbUrl) {
        setPosterSrc(fallbackImg);
        setIsLoading(false);
      }
      return;
    }

    if (directTmdbUrl) {
      lockSyncPoster(directTmdbUrl);
      return;
    }

    // 3. ĐI TÌM TRÊN TMDB NẾU CHƯA CÓ
    const fetchPoster = async () => {
      setIsLoading(true);
      
      try {
        let tmdbId = m.tmdb?.id || m.tmdb?.tmdb_id || m.tmdb?.id_tmdb || m.tmdbId || m.tmdb_id || m.id_tmdb;
        if (typeof m.tmdb === 'number' || (typeof m.tmdb === 'string' && !isNaN(m.tmdb))) tmdbId = m.tmdb;

        let mediaType = (m.type === 'series' || m.type === 'tvshows' || m.type === 'phimbo' || m.tmdb?.type === 'tv') ? 'tv' : 'movie';
        const isValidTmdbId = tmdbId && String(tmdbId) !== "undefined" && String(tmdbId) !== "null";

        if (!isValidTmdbId) {
          const match = await fetchTMDB(m.origin_name, m.original_name, m.name, m.slug, m.year, m.type);
          if (match && match.id) {
            tmdbId = match.id;
            mediaType = match.media_type || mediaType;
          }
        }

        if (!tmdbId || String(tmdbId) === "undefined") {
          if (isMounted) {
            setPosterSrc(fallbackImg);
            setIsLoading(false);
          }
          return;
        }

        let seasonNum = null;
        if (mediaType === 'tv') {
          const stringsToSearch = [m.slug, m.name, m.origin_name, m.original_name].filter(Boolean).map(s => s.toLowerCase());
          for (const str of stringsToSearch) {
            const seasonMatch = str.match(/(?:season|phần|phan|mùa|mua)[\s-]*(\d+)/i);
            if (seasonMatch) {
              seasonNum = parseInt(seasonMatch[1], 10);
              break; 
            }
          }
          if (!seasonNum) seasonNum = 1;
        }

        const cacheKey = (mediaType === 'tv' && seasonNum) ? `${tmdbId}_s${seasonNum}` : String(tmdbId);
        
        if (tmdbCache.has(cacheKey)) {
          if (isMounted) {
            const resultUrl = tmdbCache.get(cacheKey) || fallbackImg;
            lockSyncPoster(resultUrl);
            setPosterSrc(resultUrl);
            setIsLoading(false);
          }
          return;
        }

        let finalUrl = null;
        
        if (mediaType === 'tv') {
          const sRes = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}/season/${seasonNum}?api_key=${TMDB_API_KEY}`).catch(() => null);
          if (sRes && sRes.ok) {
            const sData = await sRes.json();
            if (sData.poster_path) finalUrl = `https://image.tmdb.org/t/p/w500${sData.poster_path}`;
          }

          if (!finalUrl) {
            const mRes = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${TMDB_API_KEY}`).catch(() => null);
            if (mRes && mRes.ok) {
              const mData = await mRes.json();
              if (mData.poster_path) finalUrl = `https://image.tmdb.org/t/p/w500${mData.poster_path}`;
            }
          }
        } else {
          const mRes = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_API_KEY}`).catch(() => null);
          if (mRes && mRes.ok) {
            const mData = await mRes.json();
            if (mData.poster_path) finalUrl = `https://image.tmdb.org/t/p/w500${mData.poster_path}`;
          }
        }

        const result = finalUrl || fallbackImg;
        if (isMounted) {
          tmdbCache.set(cacheKey, result);
          if (finalUrl) lockSyncPoster(result); 
          setPosterSrc(result);
          setIsLoading(false);
        }

      } catch (error) {
        if (isMounted) {
          setPosterSrc(fallbackImg);
          setIsLoading(false);
        }
      }
    };

    fetchPoster();
    return () => { isMounted = false; };
  }, [m, enableTmdb, directTmdbUrl, slugKey]);

  return { posterSrc, isLoading };
}