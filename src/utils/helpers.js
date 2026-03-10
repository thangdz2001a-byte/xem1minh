// --- BIẾN TOÀN CỤC ---
export const globalDisplayedSlugs = new Set();
export const tmdbCache = new Map();
export const watchDataCache = new Map();
export const apiCache = new Map();
export const pendingRequests = new Map();

// --- API GỐC ĐÃ CHUYỂN QUA CLOUDFLARE WORKER ---
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
      const payload = {
        timestamp: now,
        data
      };

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
  if (p.startsWith("http")) return p;
  const path = p.startsWith("/") ? p.substring(1) : p;
  return `${IMG}/${path}`;
}

export const isValidImg = (img) => {
  if (!img || typeof img !== "string") return false;
  if (img.length < 10) return false;
  if (img.includes("avatar.png") || img.includes("no-poster") || img.includes("default")) return false;
  if (img === "https://img.ophim.live/uploads/movies/" || img === "https://img.ophim.live/uploads/movies") return false;
  if (img === `${IMG}/` || img === IMG) return false;
  return true;
};

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

export const mergeDuplicateMovies = (items) => {
  if (!Array.isArray(items)) return [];

  const merged = [];

  items.forEach((item) => {
    if (!item) return;
    const epCurrent = String(item.episode_current || "");
    if (epCurrent.toLowerCase().includes("trailer")) return;

    const normOrigin = normalizeString(item.origin_name || item.original_name);
    const normName = normalizeString(item.name);

    const existingIdx = merged.findIndex((m) => {
      const mNormOrigin = normalizeString(m.origin_name || m.original_name);
      const mNormName = normalizeString(m.name);
      const matchOrigin = normOrigin && mNormOrigin && normOrigin === mNormOrigin;
      const matchName = normName && mNormName && normName === mNormName;
      const matchSlug = item.slug && m.slug && item.slug === m.slug;
      return matchOrigin || matchName || matchSlug;
    });

    if (existingIdx !== -1) {
      const existingHasImage = isValidImg(merged[existingIdx].thumb_url) || isValidImg(merged[existingIdx].poster_url);
      const newHasImage = isValidImg(item.thumb_url) || isValidImg(item.poster_url);
      if (!existingHasImage && newHasImage) {
        merged[existingIdx] = item;
      }
    } else {
      merged.push(item);
    }
  });

  return merged;
};

export async function fetchTMDB(name, originName, slug, year) {
  const cacheKey = slug || originName || name;
  if (!cacheKey) return null;
  if (tmdbCache.has(cacheKey)) return tmdbCache.get(cacheKey);

  const extractYear = (dateString) => (typeof dateString === "string" ? dateString.substring(0, 4) : null);

  try {
    let match = null;

    const search = async (query) => {
      const data = await fetchWithCache(
        `${API_TMDB}/search/multi?query=${encodeURIComponent(String(query || "").trim())}`,
        86400000
      );
      return data?.results || [];
    };

    let results = [];
    if (originName) results = await search(originName);
    if (results.length === 0 && name) results = await search(name);

    if (results.length > 0) {
      if (year) {
        match = results.find((item) => {
          if (item.media_type === "person" || (!item.poster_path && !item.backdrop_path)) return false;
          const y = extractYear(item.release_date) || extractYear(item.first_air_date);
          return y && Math.abs(parseInt(y) - parseInt(year)) <= 1;
        });
      }
      if (!match) {
        match = results.find((item) => item.media_type !== "person" && (item.poster_path || item.backdrop_path));
      }
    }

    if (match) {
      tmdbCache.set(cacheKey, match);
      return match;
    }
  } catch {}

  tmdbCache.set(cacheKey, null);
  return null;
}

export const generateRoomId = () => Math.random().toString(36).substring(2, 8).toUpperCase();