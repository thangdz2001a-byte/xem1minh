import { useState, useEffect } from "react";
import { fetchTMDB } from "./helpers";

const TMDB_API_KEY = "0e620a51728a0fea887a8506831d8866";
const tmdbCache = new Map();

// HÀM LỌC RÁC: Xóa chữ "Phần 1", "Season 2" để TMDB không bị ngu
const cleanTitleForTMDB = (title) => {
  if (!title) return "";
  return title.replace(/(phần|mùa|season|part)\s*\d+/gi, '').replace(/\s+/g, ' ').trim();
};

export default function useTmdbImage(m, enableTmdb = true) {
  const fallbackImg = "https://placehold.co/400x600/111/333?text=Chưa+Có+Ảnh";
  
  const slugKey = m?.slug;

  // 1. KIỂM TRA ĐỒNG BỘ ÉP BUỘC TỪ LOCALSTORAGE TRƯỚC (Lấy ảnh tốc độ bàn thờ lúc F5)
  let directTmdbUrl = null;
  if (slugKey) {
    try {
      const syncedPoster = localStorage.getItem(`polite_sync_poster_${slugKey}`);
      if (syncedPoster && syncedPoster.includes("tmdb.org")) {
        directTmdbUrl = syncedPoster;
      }
    } catch (e) {}
  }

  // 2. TÌM TRỰC TIẾP TRONG DATA (Nếu API phim đã nhả sẵn)
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
    
    // Hàm khóa Poster lại để dùng chung, cấm mất lúc F5
    const lockSyncPoster = (url) => {
      if (url && slugKey && url.includes("tmdb.org")) {
        try { localStorage.setItem(`polite_sync_poster_${slugKey}`, url); } catch(e) {}
      }
    };

    if (!m || !enableTmdb) {
      if (!directTmdbUrl && isMounted) {
        setPosterSrc(fallbackImg);
        setIsLoading(false);
      }
      return;
    }

    if (directTmdbUrl) {
      lockSyncPoster(directTmdbUrl);
      if (isMounted) setIsLoading(false);
      return;
    }

    // 3. ĐI TÌM TRÊN TMDB BẰNG API VÀ ÉP BUỘC LẤY CHUẨN ẢNH
    const fetchPoster = async () => {
      setIsLoading(true);
      
      try {
        let tmdbId = m.tmdb?.id || m.tmdb?.tmdb_id || m.tmdb?.id_tmdb || m.tmdbId || m.tmdb_id || m.id_tmdb;
        if (typeof m.tmdb === 'number' || (typeof m.tmdb === 'string' && !isNaN(m.tmdb))) tmdbId = m.tmdb;
        if (tmdbId == "0") tmdbId = null; // OPhim hay trả về ID "0" mạo danh

        let mediaType = (m.type === 'series' || m.type === 'tvshows' || m.type === 'phimbo' || m.tmdb?.type === 'tv') ? 'tv' : 'movie';
        const isValidTmdbId = tmdbId && String(tmdbId) !== "undefined" && String(tmdbId) !== "null";
        let finalUrl = null;

        // BƯỚC 3.1: Nếu không có ID -> Search TMDB -> Giật luôn ảnh từ kết quả search cho nhanh
        if (!isValidTmdbId) {
          const cleanOrigin = cleanTitleForTMDB(m.origin_name || m.original_name);
          const cleanName = cleanTitleForTMDB(m.name);

          const match = await fetchTMDB(cleanOrigin, m.original_name, cleanName, m.slug, m.year, m.type);
          if (match && match.id) {
            tmdbId = match.id;
            mediaType = match.media_type || mediaType;
            if (match.poster_path) {
                finalUrl = `https://image.tmdb.org/t/p/w500${match.poster_path}`;
            }
          }
        }

        if ((!tmdbId || String(tmdbId) === "undefined") && !finalUrl) {
          if (isMounted) {
            setPosterSrc(fallbackImg);
            setIsLoading(false);
          }
          return;
        }

        // BƯỚC 3.2: Nếu có ID mà chưa có ảnh -> Gọi API chọc sâu vào chi tiết
        if (!finalUrl) {
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
            
            // Lấy từ RAM Cache nếu vừa gọi xong
            if (tmdbCache.has(cacheKey)) {
              if (isMounted) {
                const resultUrl = tmdbCache.get(cacheKey) || fallbackImg;
                lockSyncPoster(resultUrl);
                setPosterSrc(resultUrl);
                setIsLoading(false);
              }
              return;
            }
            
            // Xử lý bắt ảnh phim bộ (Ép lấy bằng được)
            if (mediaType === 'tv') {
              const sRes = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}/season/${seasonNum}?api_key=${TMDB_API_KEY}`).catch(() => null);
              if (sRes && sRes.ok) {
                const sData = await sRes.json();
                if (sData.poster_path) finalUrl = `https://image.tmdb.org/t/p/w500${sData.poster_path}`;
              }

              // Nếu Season không có ảnh, lùi lại lấy ảnh bìa của cả TV Show
              if (!finalUrl) {
                const mRes = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${TMDB_API_KEY}`).catch(() => null);
                if (mRes && mRes.ok) {
                  const mData = await mRes.json();
                  if (mData.poster_path) finalUrl = `https://image.tmdb.org/t/p/w500${mData.poster_path}`;
                }
              }
            } else {
              // Xử lý phim lẻ
              const mRes = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_API_KEY}`).catch(() => null);
              if (mRes && mRes.ok) {
                const mData = await mRes.json();
                if (mData.poster_path) finalUrl = `https://image.tmdb.org/t/p/w500${mData.poster_path}`;
              }
            }
            
            if (finalUrl) tmdbCache.set(cacheKey, finalUrl);
        }

        const result = finalUrl || fallbackImg;
        if (isMounted) {
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