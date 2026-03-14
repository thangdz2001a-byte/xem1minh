// --- BIẾN TOÀN CỤC ---
export const globalDisplayedSlugs = new Set();
export const tmdbCache = new Map();
export const watchDataCache = new Map();
export const apiCache = new Map();
export const pendingRequests = new Map();

// --- API GỐC ---
const WORKER_URL = "https://polite-api.thangdz2001a.workers.dev";

export const API = `${WORKER_URL}/api/ophim`;
export const API_NGUONC = `${WORKER_URL}/api/nguonc/films`;
export const API_NGUONC_DETAIL = `${WORKER_URL}/api/nguonc/film`;
export const IMG = `${WORKER_URL}/images`;
export const API_TMDB = `${WORKER_URL}/api/tmdb`;
export const TMDB_API_KEY = "0e620a51728a0fea887a8506831d8866";

export const YEARS = Array.from({ length: 20 }, (_, i) => new Date().getFullYear() - i);

// --- UTILS ---
export async function fetchWithCache(url, ttl = 300000) {
  const now = Date.now();
  const cacheKey = `polite_cache_${url}`;

  if (apiCache.has(url)) {
    const inMemory = apiCache.get(url);
    if (now - inMemory.timestamp < ttl) {
      return inMemory.data;
    }
    apiCache.delete(url);
  }

  const cachedDataStr = localStorage.getItem(cacheKey);
  if (cachedDataStr) {
    try {
      const cachedItem = JSON.parse(cachedDataStr);
      if (now - cachedItem.timestamp < ttl) {
        apiCache.set(url, cachedItem);
        return cachedItem.data;
      } else {
        localStorage.removeItem(cacheKey);
      }
    } catch {
      localStorage.removeItem(cacheKey);
    }
  }

  if (pendingRequests.has(url)) return pendingRequests.get(url);

  const requestPromise = (async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: { Accept: "application/json" }
      });

      clearTimeout(timeoutId);

      if (!response.ok) throw new Error(`Lỗi fetch API: ${response.status}`);

      const data = await response.json();
      const payload = { timestamp: now, data };

      apiCache.set(url, payload);

      try {
        localStorage.setItem(cacheKey, JSON.stringify(payload));
      } catch (storageError) {
        console.warn("Không thể ghi cache localStorage:", storageError);
      }

      return data;
    } catch (error) {
      console.error("Lỗi khi fetch data:", error);
      return null;
    } finally {
      pendingRequests.delete(url);
    }
  })();

  pendingRequests.set(url, requestPromise);
  return requestPromise;
}

export function getImg(p) {
  if (!p || typeof p !== "string") return "";
  const cleanP = p.trim();
  if (!cleanP || cleanP === "null" || cleanP === "undefined") return "";
  if (cleanP.startsWith("http://") || cleanP.startsWith("https://")) return cleanP;
  const path = cleanP.startsWith("/") ? cleanP.slice(1) : cleanP;
  if (path.startsWith("upload/") || path.startsWith("uploads/")) return `https://img.ophim.live/${path}`;
  return `https://img.ophim.live/uploads/movies/${path}`;
}

export const isValidImg = (img) => {
  if (!img || typeof img !== "string") return false;
  const s = img.toLowerCase();
  if (s.length < 10) return false;
  if (s === "null" || s === "undefined" || s === "") return false;
  if (s.includes("avatar.png") || s.includes("no-poster") || s.includes("default") || s.includes("placehold.co")) return false;
  if (s === "https://img.ophim.live/uploads/movies/" || s === "https://img.ophim.live/uploads/movies") return false;
  if (s === `${IMG}/` || s === IMG || s.endsWith("/images") || s.endsWith("/images/")) return false;
  return true;
};

// --- POSTER RESOLVERS ---
export const resolveOphimPoster = (m) => {
  if (!m) return null;
  const raw = m.poster_url || m.thumb_url || m.thumb;
  if (!raw) return null;
  const fullUrl = getImg(raw);
  return isValidImg(fullUrl) ? fullUrl : null;
};

export const resolveTmdbPoster = (m) => {
  if (!m) return null;
  let path = m.tmdb?.poster_path || m.poster_path;
  if (path && typeof path === "string" && path !== "null" && path !== "undefined") {
    if (!path.startsWith("http")) return `https://image.tmdb.org/t/p/w500${path}`;
    return path;
  }
  return null;
};

export const getUnifiedPoster = (m, options = {}) => {
  const placeholder = "https://placehold.co/400x600/1a1a1a/e50914?text=No+Image";
  const tmdbSrc = resolveTmdbPoster(m);
  if (isValidImg(tmdbSrc)) return { src: tmdbSrc, source: "tmdb", usedSeason: m.tmdb?.season || null, tmdbId: m.tmdb?.id || null };
  const ophimSrc = resolveOphimPoster(m);
  if (isValidImg(ophimSrc)) return { src: ophimSrc, source: "ophim", usedSeason: null, tmdbId: m.tmdb?.id || null };
  return { src: placeholder, source: "placeholder", usedSeason: null, tmdbId: m.tmdb?.id || null };
};

export const getMoviePoster = (prog = {}, fetched = {}, getImgHelper) => {
  const unified = getUnifiedPoster({ ...prog, ...fetched });
  return unified.src;
};

// --- CÁC HÀM TIỆN ÍCH KHÁC ---
export function formatTime(seconds) {
  if (isNaN(seconds)) return "00:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return h > 0 ? `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}` : `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export const extractReadableNames = (data) => {
  if (!data) return [];
  if (typeof data === "string") return [data];
  if (Array.isArray(data)) {
    return data.map((item) => {
      if (typeof item === "string") return item;
      if (item?.name) return item.name;
      if (item?.NAME) return item.NAME;
      return null;
    }).filter(Boolean);
  }
  if (typeof data === "object") {
    let names = [];
    Object.values(data).forEach((val) => {
      if (val && typeof val === "object") {
        if (val.LIST && Array.isArray(val.LIST)) {
          val.LIST.forEach((i) => {
            if (typeof i === "string") names.push(i);
            else if (i?.name) names.push(i.name);
            else if (i?.NAME) names.push(i.NAME);
          });
        } else if (val.name) names.push(val.name);
        else if (val.NAME) names.push(val.NAME);
      }
    });
    return names;
  }
  return [];
};

export const safeText = (data, fallback = "") => {
  if (data === null || data === undefined || data === "") return fallback;
  let parsedData = data;
  if (typeof data === "string") {
    const trimmed = data.trim();
    if ((trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
      try { parsedData = JSON.parse(trimmed); } catch {}
    }
  }
  if (typeof parsedData === "object" && parsedData !== null) {
    try {
      const names = extractReadableNames(parsedData);
      if (names.length > 0) return names.join(", ");
      return fallback;
    } catch { return fallback; }
  }
  return String(parsedData);
};

export const safeJoin = (data) => safeText(data, "Đang cập nhật");

export const normalizeString = (s) => {
  if (typeof s === "object" && s !== null) s = extractReadableNames(s).join(" ");
  return String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['".,?!()]/g, "")
    .replace(/[:\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

export const getMovieUniqueId = (m) => normalizeString(m?.origin_name || m?.original_name || m?.name);

export const isHoatHinhMovie = (m) => {
  if (!m) return false;
  const type = String(m.type || "").toLowerCase();
  const slug = String(m.slug || "").toLowerCase();
  if (type.includes("hoathinh") || type.includes("anime") || type.includes("cartoon")) return true;
  if (slug.includes("hoat-hinh") || slug.includes("anime") || slug.includes("doraemon") || slug.includes("conan") || slug.includes("one-piece") || slug.includes("pokemon")) return true;
  
  let cats = "";
  if (Array.isArray(m.category)) cats = m.category.map((c) => (typeof c === "string" ? c : c.name || "")).join(" ").toLowerCase();
  else if (typeof m.category === "string") cats = m.category.toLowerCase();
  else if (m.category) cats = JSON.stringify(m.category).toLowerCase();

  if (cats.includes("hoạt hình") || cats.includes("anime") || cats.includes("hoathinh")) return true;
  return false;
};

// =========================================================================
// KIỂM CHỨNG & DỌN DẸP DỮ LIỆU FAKE TỪ API (HỆ THỐNG MỚI)
// =========================================================================

/**
 * Phát hiện và hủy bỏ các ID TMDB râu ông nọ cắm cằm bà kia của API
 */
export const verifyAndCleanTmdbId = (m) => {
  if (!m || !m.tmdb || !m.tmdb.id) return m;

  const localType = String(m.type || "").toLowerCase();
  const tmdbType = String(m.tmdb.type || "").toLowerCase();

  const isLocalMovie = localType === "single" || localType === "phimle";
  const isLocalTv = localType === "series" || localType === "tvshows" || localType === "hoathinh" || localType === "phimbo";

  const isTmdbMovie = tmdbType === "movie";
  const isTmdbTv = tmdbType === "tv";

  let isFake = false;
  // Bắt quả tang sai lệch thể loại rõ ràng
  if (isLocalMovie && isTmdbTv) isFake = true;
  if (isLocalTv && isTmdbMovie) isFake = true;

  if (isFake) {
    m.tmdb.id = null;
    m.tmdb.tmdb_id = null;
    m.tmdb.id_tmdb = null;
    m.tmdb.type = null;
  }
  return m;
};

// =========================================================================
// HÀM GỘP PHIM (TÍCH HỢP TRẠM KIỂM DUYỆT)
// =========================================================================

export const mergeDuplicateMovies = (rawItems) => {
  if (!Array.isArray(rawItems)) return [];
  const merged = [];
  const metaMap = new Map();
  const partRegex = /((phần|phan|part|season|mùa|mua)\s*\d+)|(\s\d+$)/i;

  // BƯỚC 1: LỌC QUA TRẠM KIỂM DUYỆT ĐỂ LỘT SẠCH ID FAKE TRƯỚC KHI GỘP
  const items = rawItems.map(item => verifyAndCleanTmdbId({ ...item }));

  items.forEach((item) => {
    if (!item) return;

    const epCurrent = String(item.episode_current || "").toLowerCase();
    if (epCurrent === "trailer") return;

    const normOrigin = normalizeString(item.origin_name || item.original_name || "");
    const normName = normalizeString(item.name || "");
    const tmdbId = item.tmdb?.id || item.tmdb?.tmdb_id || item.tmdb?.id_tmdb;
    const itemYear = String(item.year || "").trim();
    
    const itemPart = normName.match(partRegex)?.[0]?.trim() || normOrigin.match(partRegex)?.[0]?.trim() || "p1";
    const currentNames = [normName, normOrigin].filter(Boolean);

    const existingIdx = merged.findIndex((m) => {
      const mMeta = metaMap.get(m);
      if (!mMeta) return false;
      
      if (itemPart !== mMeta.part) return false;
      if (itemYear && mMeta.year && itemYear !== mMeta.year) return false;
      
      // BƯỚC 2: CHẶN GỘP NẾU 2 PHIM MANG 2 ID KHÁC NHAU HOÀN TOÀN
      if (tmdbId && mMeta.tmdbId && String(tmdbId) !== String(mMeta.tmdbId)) return false;

      // NẾU CÙNG ID HOẶC CÙNG SLUG THÌ CHẮC CHẮN GỘP
      if (tmdbId && mMeta.tmdbId && String(tmdbId) === String(mMeta.tmdbId)) return true;
      if (item.slug && m.slug && item.slug === m.slug) return true;

      // BƯỚC 3: DÙNG TÊN ĐỂ GỘP (Do đã chặn trường hợp khác ID ở Bước 2)
      const targetNames = [mMeta.normName, mMeta.normOrigin].filter(Boolean);
      return currentNames.some(name => targetNames.includes(name));
    });

    if (existingIdx !== -1) {
      const oldItem = merged[existingIdx];
      const existingHasImage = isValidImg(oldItem.poster_url) || isValidImg(oldItem.thumb_url);
      const newHasImage = isValidImg(item.poster_url) || isValidImg(item.thumb_url);

      if (!existingHasImage && newHasImage) {
        merged[existingIdx] = { ...oldItem, ...item };
        metaMap.set(merged[existingIdx], metaMap.get(oldItem));
      }

      // Đắp ID thật vào bộ phim bị thiếu ID (hoặc vừa bị xóa ID fake)
      if (!merged[existingIdx].tmdb && item.tmdb && item.tmdb.id) {
        merged[existingIdx].tmdb = item.tmdb;
        metaMap.get(merged[existingIdx]).tmdbId = item.tmdb.id;
      }
    } else {
      merged.push(item);
      metaMap.set(item, { normOrigin, normName, year: itemYear, part: itemPart, tmdbId });
    }
  });

  return merged;
};

// =========================================================================
// THUẬT TOÁN TÌM KIẾM CỐT LÕI (SIÊU CẤP TMDB)
// =========================================================================

export function stringSimilarity(s1, s2) {
  if (!s1 || !s2) return 0;
  let longer = s1.toLowerCase().trim();
  let shorter = s2.toLowerCase().trim();
  if (longer.length < shorter.length) {
    longer = s2.toLowerCase().trim();
    shorter = s1.toLowerCase().trim();
  }
  let longerLength = longer.length;
  if (longerLength === 0) return 1.0;

  let costs = new Array();
  for (let i = 0; i <= longer.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= shorter.length; j++) {
      if (i === 0) costs[j] = j;
      else {
        if (j > 0) {
          let newValue = costs[j - 1];
          if (longer.charAt(i - 1) !== shorter.charAt(j - 1)) {
            newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
          }
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
    }
    if (i > 0) costs[shorter.length] = lastValue;
  }
  return (longerLength - costs[shorter.length]) / parseFloat(longerLength);
}

export function cleanTitleForSearch(title) {
  if (!title) return "";
  return title
    .replace(/(?:\s*(?:phần|phan|season|mùa|mua|part|tập|tap)\s*\d+.*)/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

export async function fetchTMDB(origin_name, original_name, name, slug, year, type) {
  const cacheKey = `tmdb_search_${slug || origin_name || original_name || name}`;
  if (!cacheKey) return null;
  if (tmdbCache.has(cacheKey)) return tmdbCache.get(cacheKey);

  try {
    const rawQueries = [origin_name, original_name, name, slug].filter(Boolean).map(q => String(q));
    const cleanedQueries = rawQueries.map(cleanTitleForSearch).filter(Boolean);
    const queries = [...new Set([...rawQueries, ...cleanedQueries])];

    const targetType = (type === "tv" || type === "series" || type === "tvshows" || type === "phimbo") ? "tv" : "movie";
    const targetYear = year ? parseInt(year, 10) : null;

    let bestMatchGlobal = null;
    let highestScoreGlobal = -100;

    for (let query of queries) {
      if (!query.trim()) continue;

      const data = await fetchWithCache(`${API_TMDB}/search/multi?query=${encodeURIComponent(query)}&language=vi`, 86400000);
      const results = data?.results?.filter(r => r.media_type === "movie" || r.media_type === "tv") || [];

      if (results.length > 0) {
        results.forEach(item => {
          let score = 0;

          if (item.media_type === targetType) score += 5;
          const itemDate = item.release_date || item.first_air_date;
          if (itemDate && targetYear) {
            const itemYear = parseInt(itemDate.split("-")[0], 10);
            if (itemYear === targetYear) score += 10;
            else if (Math.abs(itemYear - targetYear) === 1) score += 4;
          }

          const itemNames = [item.title, item.name, item.original_title, item.original_name].filter(Boolean).map(n => String(n).toLowerCase());
          const queryLower = query.toLowerCase();
          
          let maxSim = 0;
          itemNames.forEach(n => {
            const sim = stringSimilarity(n, queryLower);
            if (sim > maxSim) maxSim = sim;
          });

          if (maxSim >= 0.95) score += 15;
          else if (maxSim >= 0.85) score += 10;
          else if (maxSim >= 0.70) score += 5;
          else if (maxSim >= 0.50) score += 2;

          if (itemNames.includes(queryLower)) score += 5; 
          else if (itemNames.some(n => n.includes(queryLower) || queryLower.includes(n))) score += 2;

          if (item.genre_ids?.includes(99)) score -= 20;
          if (item.genre_ids?.includes(10764)) score -= 20;

          const titleLower = (item.title || item.name || item.original_title || "").toLowerCase();
          if (titleLower.includes("making of") || titleLower.includes("making season") || titleLower.includes("behind the scenes") || titleLower.includes("the challenge")) {
            score -= 30;
          }

          const pop = item.popularity || 0;
          const popularityBonus = Math.min(pop / 10, 15);
          score += popularityBonus;

          if (score > highestScoreGlobal) {
            highestScoreGlobal = score;
            bestMatchGlobal = item;
          }
        });

        if (bestMatchGlobal && highestScoreGlobal >= 30) break; 
      }
    }

    if (bestMatchGlobal && highestScoreGlobal > 0) {
      const finalResult = { id: bestMatchGlobal.id, media_type: bestMatchGlobal.media_type };
      tmdbCache.set(cacheKey, finalResult);
      return finalResult;
    }

  } catch (error) {
    console.error("Lỗi fetch TMDB multi search:", error);
  }

  tmdbCache.set(cacheKey, null);
  return null;
}

export const generateRoomId = () => Math.random().toString(36).substring(2, 8).toUpperCase();

export async function matchTmdbToOphim(tmdbItem) {
  if (!tmdbItem) return null;

  let title = tmdbItem.title || tmdbItem.name || tmdbItem.original_title || tmdbItem.original_name;
  if (!title) return null;

  let tmdbType = tmdbItem.media_type === "movie" ? "movie" : "tv";
  let tmdbYearStr = tmdbItem.release_date || tmdbItem.first_air_date;
  let tmdbYear = tmdbYearStr ? parseInt(tmdbYearStr.split("-")[0], 10) : null;
  const tmdbId = tmdbItem.id;

  try {
    const searchQueries = [...new Set([tmdbItem.title, tmdbItem.name, tmdbItem.original_title, tmdbItem.original_name].filter(Boolean))];
    let bestMatch = null;
    let highestScore = 0;

    for (let query of searchQueries) {
      let searchUrl = `${API}/tim-kiem?keyword=${encodeURIComponent(query)}&limit=15`;
      let searchData = await fetchWithCache(searchUrl, 300000);

      let items = searchData?.data?.items || searchData?.items || [];

      for (let item of items) {
        let score = 0;
        let itemTmdbId = item.tmdb?.id || item.tmdb?.tmdb_id || item.tmdb?.id_tmdb;

        if (itemTmdbId && String(itemTmdbId) === String(tmdbId)) return item;

        let itemType = String(item.type || "").toLowerCase();
        let isItemTv = itemType.includes("series") || itemType.includes("tv") || itemType.includes("bo");

        if ((tmdbType === "tv" && isItemTv) || (tmdbType === "movie" && !isItemTv)) score += 2;
        if (item.year && tmdbYear) {
          let itemYear = parseInt(item.year, 10);
          if (itemYear === tmdbYear) score += 3;
          else if (Math.abs(itemYear - tmdbYear) === 1) score += 1;
        }

        let itemNormName = normalizeString(item.name);
        let itemNormOrigin = normalizeString(item.origin_name || item.original_name || "");

        if (searchQueries.some(q => {
          let nq = normalizeString(q);
          return nq === itemNormName || nq === itemNormOrigin;
        })) score += 5;

        if (score >= 7 && score > highestScore) {
          highestScore = score;
          bestMatch = item;
        }
      }
      if (highestScore >= 10) break;
    }
    return bestMatch;
  } catch (error) {
    console.error("Lỗi khi match TMDB sang OPhim:", error);
    return null;
  }
}