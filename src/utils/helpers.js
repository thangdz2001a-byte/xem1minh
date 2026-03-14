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

  if (pendingRequests.has(url)) {
    return pendingRequests.get(url);
  }

  const requestPromise = (async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: { Accept: "application/json" }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Lỗi fetch API: ${response.status}`);
      }

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

  if (cleanP.startsWith("http://") || cleanP.startsWith("https://")) {
    return cleanP;
  }

  const path = cleanP.startsWith("/") ? cleanP.slice(1) : cleanP;

  // API trả path đầy đủ kiểu upload/... hoặc uploads/...
  if (path.startsWith("upload/") || path.startsWith("uploads/")) {
    return `https://img.ophim.live/${path}`;
  }

  // API chỉ trả tên file như: nang-nhan-lon-roi-phan-2-poster.jpg
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

// --- POSTER RESOLVERS (HỆ THỐNG MỚI) ---

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
    if (!path.startsWith("http")) {
      return `https://image.tmdb.org/t/p/w500${path}`;
    }
    return path;
  }

  return null;
};

export const getUnifiedPoster = (m, options = {}) => {
  const placeholder = "https://placehold.co/400x600/1a1a1a/e50914?text=No+Image";

  // 1. Thử lấy TMDB
  const tmdbSrc = resolveTmdbPoster(m);
  if (isValidImg(tmdbSrc)) {
    return {
      src: tmdbSrc,
      source: "tmdb",
      usedSeason: m.tmdb?.season || null,
      tmdbId: m.tmdb?.id || null
    };
  }

  // 2. Fallback sang OPhim
  const ophimSrc = resolveOphimPoster(m);
  if (isValidImg(ophimSrc)) {
    return {
      src: ophimSrc,
      source: "ophim",
      usedSeason: null,
      tmdbId: m.tmdb?.id || null
    };
  }

  // 3. Cuối cùng mới trả placeholder
  return {
    src: placeholder,
    source: "placeholder",
    usedSeason: null,
    tmdbId: m.tmdb?.id || null
  };
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
  return h > 0
    ? `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
    : `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export const extractReadableNames = (data) => {
  if (!data) return [];
  if (typeof data === "string") return [data];

  if (Array.isArray(data)) {
    return data
      .map((item) => {
        if (typeof item === "string") return item;
        if (item?.name) return item.name;
        if (item?.NAME) return item.NAME;
        return null;
      })
      .filter(Boolean);
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
    if (
      (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
      (trimmed.startsWith("[") && trimmed.endsWith("]"))
    ) {
      try {
        parsedData = JSON.parse(trimmed);
      } catch {}
    }
  }

  if (typeof parsedData === "object" && parsedData !== null) {
    try {
      const names = extractReadableNames(parsedData);
      if (names.length > 0) return names.join(", ");
      return fallback;
    } catch {
      return fallback;
    }
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
  if (
    slug.includes("hoat-hinh") ||
    slug.includes("anime") ||
    slug.includes("doraemon") ||
    slug.includes("conan") ||
    slug.includes("one-piece") ||
    slug.includes("pokemon")
  )
    return true;

  let cats = "";
  if (Array.isArray(m.category)) {
    cats = m.category.map((c) => (typeof c === "string" ? c : c.name || "")).join(" ").toLowerCase();
  } else if (typeof m.category === "string") {
    cats = m.category.toLowerCase();
  } else if (m.category) {
    cats = JSON.stringify(m.category).toLowerCase();
  }

  if (cats.includes("hoạt hình") || cats.includes("anime") || cats.includes("hoathinh")) return true;
  return false;
};

// --- HÀM GỘP PHIM ĐÃ ĐƯỢC TỐI ƯU TOÀN DIỆN ---
export const mergeDuplicateMovies = (items) => {
  if (!Array.isArray(items)) return [];
  const merged = [];
  const metaMap = new Map();
  
  // Regex nhận diện Phần/Season cực mạnh (bao gồm cả trường hợp chỉ có số ở cuối tên)
  const partRegex = /((phần|phan|part|season|mùa|mua)\s*\d+)|(\s\d+$)/i;

  items.forEach((item) => {
    if (!item) return;

    const epCurrent = String(item.episode_current || "").toLowerCase();
    // Loại bỏ chuẩn xác các phim đang ở trạng thái trailer
    if (epCurrent === "trailer") return;

    const normOrigin = normalizeString(item.origin_name || item.original_name || "");
    const normName = normalizeString(item.name || "");
    const tmdbId = item.tmdb?.id || item.tmdb?.tmdb_id || item.tmdb?.id_tmdb;
    const itemYear = String(item.year || "").trim();
    
    // Tách riêng số phần (nếu không có thì mặc định an toàn là "p1")
    const itemPart = normName.match(partRegex)?.[0]?.trim() || normOrigin.match(partRegex)?.[0]?.trim() || "p1";

    const currentNames = [normName, normOrigin].filter(Boolean);

    const existingIdx = merged.findIndex((m) => {
      const mMeta = metaMap.get(m);
      if (!mMeta) return false;
      
      // 1. Nếu khác "Phần" (Part) thì TUYỆT ĐỐI KHÔNG GỘP
      if (itemPart !== mMeta.part) return false;

      // 2. Nếu cả 2 đều có năm phát hành mà khác nhau thì không gộp. 
      // (Cho phép qua bước này nếu 1 trong 2 bên khuyết thông tin năm)
      if (itemYear && mMeta.year && itemYear !== mMeta.year) return false;
      
      // 3. Nếu cùng phần, cùng ID TMDB thì chắc chắn là 1 phim -> gộp
      if (tmdbId && mMeta.tmdbId && String(tmdbId) === String(mMeta.tmdbId)) return true;
      
      // 4. Nếu cùng Slug thì gộp
      if (item.slug && m.slug && item.slug === m.slug) return true;

      // 5. Nếu khớp tên (đã vượt qua bài test cùng phần và du di năm ở trên) -> gộp
      const targetNames = [mMeta.normName, mMeta.normOrigin].filter(Boolean);
      return currentNames.some(name => targetNames.includes(name));
    });

    if (existingIdx !== -1) {
      const oldItem = merged[existingIdx];
      
      // Phục hồi kiểm tra cả ảnh ngang (thumb) và dọc (poster)
      const existingHasImage = isValidImg(oldItem.poster_url) || isValidImg(oldItem.thumb_url);
      const newHasImage = isValidImg(item.poster_url) || isValidImg(item.thumb_url);

      // Ưu tiên ghi đè nếu bản lưu bị lỗi ảnh mà bản mới có ảnh tốt
      if (!existingHasImage && newHasImage) {
        merged[existingIdx] = { ...oldItem, ...item };
        metaMap.set(merged[existingIdx], metaMap.get(oldItem));
      }

      // Phục hồi cơ chế bổ sung TMDB: Nếu bản lưu thiếu TMDB mà bản mới có, cập nhật thêm vào
      if (!merged[existingIdx].tmdb && item.tmdb) {
        merged[existingIdx].tmdb = item.tmdb;
      }
    } else {
      merged.push(item);
      metaMap.set(item, {
        normOrigin,
        normName,
        year: itemYear,
        part: itemPart,
        tmdbId
      });
    }
  });

  return merged;
};

export async function fetchTMDB(origin_name, original_name, name, slug, year, type) {
  const cacheKey = slug || origin_name || original_name || name;
  if (!cacheKey) return null;
  if (tmdbCache.has(cacheKey)) return tmdbCache.get(cacheKey);

  try {
    const queries = [...new Set([origin_name, original_name, name, slug]
      .filter(Boolean)
      .map(q => String(q))
    )];

    const targetType = (type === "tv" || type === "series" || type === "tvshows" || type === "phimbo") ? "tv" : "movie";
    const targetYear = year ? parseInt(year, 10) : null;

    let bestMatchGlobal = null;
    let highestScoreGlobal = -1;

    for (let query of queries) {
      if (!query.trim()) continue;

      const data = await fetchWithCache(
        `${API_TMDB}/search/multi?query=${encodeURIComponent(query)}&language=vi`,
        86400000
      );

      const results = data?.results?.filter(r => r.media_type === "movie" || r.media_type === "tv") || [];

      if (results.length > 0) {
        results.forEach(item => {
          let score = 0;
          if (item.media_type === targetType) score += 5;
          const itemDate = item.release_date || item.first_air_date;
          if (itemDate && targetYear) {
            const itemYear = parseInt(itemDate.split("-")[0], 10);
            if (itemYear === targetYear) score += 5;
            else if (Math.abs(itemYear - targetYear) === 1) score += 3;
          }
          const itemNames = [item.title, item.name, item.original_title, item.original_name]
            .filter(Boolean)
            .map(n => String(n).toLowerCase());
          const queryLower = query.toLowerCase();

          if (itemNames.includes(queryLower)) score += 3;
          else if (itemNames.some(n => n.includes(queryLower) || queryLower.includes(n))) score += 1;

          if (score > highestScoreGlobal) {
            highestScoreGlobal = score;
            bestMatchGlobal = item;
          }
        });

        if (bestMatchGlobal && highestScoreGlobal >= 5) {
          const finalResult = { id: bestMatchGlobal.id, media_type: bestMatchGlobal.media_type };
          tmdbCache.set(cacheKey, finalResult);
          return finalResult;
        }
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