// --- BIẾN TOÀN CỤC ---
export const globalDisplayedSlugs = new Set();
export const tmdbCache = new Map();
export const watchDataCache = new Map();
export const apiCache = new Map(); // Giữ lại đề phòng các file khác gọi tới

// --- API GỐC ĐÃ CHUYỂN QUA CLOUDFLARE WORKER --- 
const WORKER_URL = "https://polite-api.thangdz2001a.workers.dev";

export const API = `${WORKER_URL}/api/ophim`;
export const API_NGUONC = `${WORKER_URL}/api/nguonc/films`;
export const API_NGUONC_DETAIL = `${WORKER_URL}/api/nguonc/film`;
export const IMG = `${WORKER_URL}/images`;
export const API_TMDB = `${WORKER_URL}/api/tmdb`; 
// TMDB API KEY hiện tại đã được Worker tự động gắn vào, 
// nhưng vẫn giữ biến này ở đây phòng trường hợp các file khác gọi trực tiếp
export const TMDB_API_KEY = "0e620a51728a0fea887a8506831d8866";

export const YEARS = Array.from({ length: 20 }, (_, i) => new Date().getFullYear() - i);

// --- UTILS ---

/**
 * Hàm gọi API có tích hợp lưu bộ nhớ tạm (Sống sót qua F5).
 * @param {string} url - Đường link API cần gọi
 * @param {number} ttl - Thời gian sống của cache (Mặc định: 5 phút = 300000ms)
 * @returns Data từ API (đã được parse JSON)
 */
export async function fetchWithCache(url, ttl = 300000) {
  const now = Date.now();
  const cacheKey = `polite_cache_${url}`; // Đặt tên key riêng cho app

  // 1. Kiểm tra xem có dữ liệu trong "ổ cứng" (localStorage) chưa
  const cachedDataStr = localStorage.getItem(cacheKey);

  if (cachedDataStr) {
    try {
      const cachedItem = JSON.parse(cachedDataStr);
      
      // 2. Kiểm tra xem data lưu trong cache đã hết hạn chưa
      if (now - cachedItem.timestamp < ttl) {
        return cachedItem.data; // Còn hạn thì trả về luôn, F5 không sợ!
      } else {
        // Hết hạn thì xóa cache cũ đi
        localStorage.removeItem(cacheKey);
      }
    } catch (e) {
      // Nếu file cache bị lỗi thì xóa đi
      localStorage.removeItem(cacheKey);
    }
  }

  // 3. Nếu chưa có cache hoặc cache hết hạn, tiến hành gọi API thật
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
       throw new Error("Lỗi fetch API");
    }

    const data = await response.json();

    // 4. Lưu kết quả mới xuống localStorage để lần sau F5 lấy ra dùng
    try {
      localStorage.setItem(cacheKey, JSON.stringify({
        timestamp: now,
        data: data
      }));
    } catch (storageError) {
      console.warn("Dung lượng bộ nhớ tạm đầy, tiến hành dọn dẹp...");
      localStorage.clear(); // Phòng trường hợp cache quá nhiều làm đầy bộ nhớ
    }

    return data;
  } catch (error) {
    console.error("Lỗi khi fetch data:", error);
    return null;
  }
}

export function getImg(p) {
  if (!p || typeof p !== 'string') return "";
  if (p.startsWith("http")) return p;
  const path = p.startsWith("/") ? p.substring(1) : p;
  // Sẽ trả ra định dạng: https://polite-api.thangdz2001a.workers.dev/images/ten-anh.jpg
  return `${IMG}/${path}`;
}

export const isValidImg = (img) => {
    if (!img || typeof img !== 'string') return false;
    if (img.length < 10) return false;
    if (img.includes('avatar.png') || img.includes('no-poster') || img.includes('default')) return false;
    // Vẫn giữ check link gốc đề phòng data lấy từ API trả về link cứng
    if (img === 'https://img.ophim.live/uploads/movies/' || img === 'https://img.ophim.live/uploads/movies') return false;
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
  if (typeof data === 'string') return [data];
  if (Array.isArray(data)) {
      return data.map(item => {
          if (typeof item === 'string') return item;
          if (item?.name) return item.name;
          if (item?.NAME) return item.NAME;
          return null;
      }).filter(Boolean);
  }
  if (typeof data === 'object') {
      let names = [];
      Object.values(data).forEach(val => {
          if (val && typeof val === 'object') {
              if (val.LIST && Array.isArray(val.LIST)) {
                  val.LIST.forEach(i => {
                      if (typeof i === 'string') names.push(i);
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
  if (typeof data === 'string') {
      const trimmed = data.trim();
      if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
          try { parsedData = JSON.parse(trimmed); } catch (e) {}
      }
  }
  if (typeof parsedData === 'object' && parsedData !== null) {
      try {
          const names = extractReadableNames(parsedData);
          if (names.length > 0) return names.join(', ');
          return fallback;
      } catch (e) { return fallback; }
  }
  return String(parsedData);
};

export const safeJoin = (data) => safeText(data, "Đang cập nhật");

export const normalizeString = (s) => {
  if (typeof s === 'object' && s !== null) s = extractReadableNames(s).join(' ');
  return String(s || "").normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[:\-]/g, ' ').replace(/\s+/g, ' ').trim();
};

export const getMovieUniqueId = (m) => normalizeString(m?.origin_name || m?.original_name || m?.name);

export const isHoatHinhMovie = (m) => {
    if (!m) return false;
    const type = String(m.type || "").toLowerCase();
    const slug = String(m.slug || "").toLowerCase();
    
    if (type.includes("hoathinh") || type.includes("anime") || type.includes("cartoon")) return true;
    if (slug.includes("hoat-hinh") || slug.includes("anime") || slug.includes("doraemon") || slug.includes("conan") || slug.includes("one-piece") || slug.includes("pokemon")) return true;
    
    let cats = "";
    if (Array.isArray(m.category)) {
        cats = m.category.map(c => typeof c === 'string' ? c : (c.name || "")).join(" ").toLowerCase();
    } else if (typeof m.category === 'string') {
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
  
  items.forEach(item => {
      if (!item) return;
      const epCurrent = String(item.episode_current || "");
      if (epCurrent.toLowerCase().includes("trailer")) return;
      
      const normOrigin = normalizeString(item.origin_name || item.original_name);
      const normName = normalizeString(item.name);
      
      const existingIdx = merged.findIndex(m => {
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

  const extractYear = (dateString) => typeof dateString === 'string' ? dateString.substring(0, 4) : null;

  try {
    let match = null;
    const search = async (query) => {
      // Gọi qua hàm fetchWithCache để tận dụng luôn bộ nhớ tạm nếu muốn, 
      // hoặc giữ nguyên fetch thẳng nếu đã có tmdbCache quản lý phía trên.
      let res = await fetch(`${API_TMDB}/search/multi?query=${encodeURIComponent(String(query || "").trim())}`);
      let data = await res.json();
      return data.results || [];
    };

    let results = [];
    if (originName) results = await search(originName);
    if (results.length === 0 && name) results = await search(name);

    if (results.length > 0) {
       if (year) {
          match = results.find(item => {
              if (item.media_type === 'person' || (!item.poster_path && !item.backdrop_path)) return false;
              const y = extractYear(item.release_date) || extractYear(item.first_air_date);
              return y && Math.abs(parseInt(y) - parseInt(year)) <= 1;
          });
       }
       if (!match) match = results.find(item => item.media_type !== 'person' && (item.poster_path || item.backdrop_path));
    }

    if (match) {
      tmdbCache.set(cacheKey, match);
      return match;
    }
  } catch (error) {}
  tmdbCache.set(cacheKey, null);
  return null;
}

export const generateRoomId = () => Math.random().toString(36).substring(2, 8).toUpperCase();