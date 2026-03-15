import React, { useState, useEffect, useCallback, useRef } from "react";
import * as Icon from "lucide-react";

// ĐOẠN CODE THÊM MỚI: Import Capacitor App để lắng nghe Deep Link
import { App as CapacitorApp } from '@capacitor/app';

import { supabase } from "./utils/supabaseClient"; 
import {
  API,
  API_TMDB,
  API_NGUONC_DETAIL,
  globalDisplayedSlugs,
  fetchWithCache,
  getMoviePoster,
  getImg,
  matchTmdbToOphim
} from "./utils/helpers"; 

import Header from "./components/layout/Header";
import BottomNav from "./components/layout/BottomNav";
import Hero from "./pages/Home/Hero";
import ContinueWatching from "./pages/Home/ContinueWatching";
import MovieSection from "./pages/Home/MovieSection";
import MovieGrid from "./pages/List/MovieGrid";
import MovieDetail from "./pages/Detail/MovieDetail";
import Watch from "./pages/Watch/Watch";
import WatchPartyLobby from "./pages/WatchParty/WatchPartyLobby";
import WatchPartyRoom from "./pages/WatchParty/WatchPartyRoom";

// ==========================================
// COMPONENT SPLASH SCREEN
// ==========================================
const SplashScreen = ({ isFading }) => (
  <div className={`fixed inset-0 z-[9999] bg-[#050505] flex flex-col items-center justify-center transition-all duration-700 ease-out ${isFading ? "opacity-0 scale-110 pointer-events-none" : "opacity-100 scale-100"}`}>
    <div className="flex flex-col items-center">
      <h1 className="text-5xl md:text-7xl font-black text-[#E50914] tracking-[0.3em] uppercase ml-[0.3em] drop-shadow-[0_0_25px_rgba(229,9,20,0.6)] animate-[pulseGlow_2s_ease-in-out_infinite]">
        POLITE
      </h1>
      <div className="w-48 md:w-64 h-[3px] bg-white/10 mt-8 rounded-full overflow-hidden shadow-[0_0_10px_rgba(229,9,20,0.3)]">
        <div className="w-full h-full bg-[#E50914] origin-left animate-[loadingBar_2s_cubic-bezier(0.4,0,0.2,1)_infinite_alternate]"></div>
      </div>
    </div>
    <style>{`
      @keyframes loadingBar {
        0% { transform: scaleX(0); transform-origin: left; }
        49% { transform: scaleX(1); transform-origin: left; }
        50% { transform: scaleX(1); transform-origin: right; }
        100% { transform: scaleX(0); transform-origin: right; }
      }
      @keyframes pulseGlow {
        0%, 100% { filter: drop-shadow(0 0 15px rgba(229,9,20,0.4)); transform: scale(1); }
        50% { filter: drop-shadow(0 0 35px rgba(229,9,20,0.8)); transform: scale(1.02); }
      }
    `}</style>
  </div>
);
// ==========================================

const getViewUrl = (view) => {
  switch (view.type) {
    case "home": return "/";
    case "detail": return `/phim/${view.slug}`;
    case "watch": return `/xem-phim/${view.slug}`;
    case "watch-party-lobby": return "/xem-chung";
    case "watch-room": return `/phong/${view.roomId}/${view.slug}`;
    case "search": return `/tim-kiem?q=${encodeURIComponent(view.keyword || "")}`;
    case "list": return `/danh-sach/${view.mode}/${view.slug}`;
    case "history": return "/phim-da-xem";
    case "favorites": return "/phim-yeu-thich";
    default: return "/";
  }
};

const parseUrlToView = () => {
  const path = window.location.pathname;
  const searchParams = new URLSearchParams(window.location.search);

  if (path === "/" || path === "") return { type: "home" };
  if (path === "/phim-da-xem") return { type: "history" };
  if (path === "/phim-yeu-thich") return { type: "favorites" };
  if (path.startsWith("/phim/")) return { type: "detail", slug: path.split("/")[2] };
  if (path.startsWith("/xem-phim/")) return { type: "watch", slug: path.split("/")[2] };
  if (path === "/xem-chung") return { type: "watch-party-lobby" };
  if (path.startsWith("/phong/")) {
    const parts = path.split("/");
    return { type: "watch-room", roomId: parts[2], slug: parts[3] };
  }
  if (path.startsWith("/tim-kiem")) {
    return { type: "search", keyword: searchParams.get("q") || "" };
  }
  if (path.startsWith("/danh-sach/")) {
    const parts = path.split("/");
    return { type: "list", mode: parts[2], slug: parts[3], title: "Danh sách phim" };
  }
  return { type: "home" };
};

const TmdbMatcher = ({ slug, setView }) => {
  const [statusText, setStatusText] = useState("Đang kiểm tra dữ liệu trên hệ thống OPhim...");

  useEffect(() => {
    let isMounted = true;
    const runMatch = async () => {
      try {
        const parts = slug.split('-');
        const mediaType = parts[1];
        const tmdbId = parts[2];

        const tmdbRes = await fetchWithCache(`${API_TMDB}/${mediaType}/${tmdbId}?language=vi`, 300000);
        if (!tmdbRes) {
          if (isMounted) {
            alert("Lỗi khi kết nối đến TMDB.");
          }
          window.history.back();
          return;
        }

        const tmdbItem = { ...tmdbRes, media_type: mediaType };
        const ophimMatch = await matchTmdbToOphim(tmdbItem);

        if (ophimMatch) {
          if (ophimMatch.slug) {
            if (isMounted) {
              const newView = { type: "detail", slug: ophimMatch.slug };
              window.history.replaceState(newView, "", `/phim/${ophimMatch.slug}`);
              setView(newView);
            }
          } else {
            if (isMounted) {
              alert("Phim này hiện chưa được cập nhật trên hệ thống để xem!");
              window.history.back();
            }
          }
        } else {
          if (isMounted) {
            alert("Phim này hiện chưa được cập nhật trên hệ thống để xem!");
            window.history.back();
          }
        }
      } catch (e) {
        if (isMounted) {
          alert("Có lỗi xảy ra khi kiểm tra dữ liệu.");
          window.history.back();
        }
      }
    };
    runMatch();
    return () => { isMounted = false; };
  }, [slug, setView]);

  return (
    <div className="flex flex-col justify-center items-center h-[80vh] bg-[#050505]">
      <Icon.Loader2 className="animate-spin text-[#E50914] mb-4" size={50} />
      <p className="text-white text-lg font-bold">{statusText}</p>
    </div>
  );
};

export default function App() {
  const [isAppReady, setIsAppReady] = useState(false);
  
  // STATE SPLASH SCREEN 
  const [showSplash, setShowSplash] = useState(true);
  const [fadeSplash, setFadeSplash] = useState(false);
  const [readyCount, setReadyCount] = useState(0); 
  const fadeLockRef = useRef(false);

  // ==========================================
  // STATE CHO POPUP CHÀO MỪNG LẦN ĐẦU TIÊN
  // ==========================================
  const [showWelcomePopup, setShowWelcomePopup] = useState(false);
  const [dontShowWelcomeAgain, setDontShowWelcomeAgain] = useState(false);

  useEffect(() => {
    const hasSeenWelcome = localStorage.getItem("skip_welcome_popup");
    // Nếu chưa đánh dấu skip và ĐÃ QUA Splash Screen thì chờ 1s rồi hiển thị Popup
    if (!hasSeenWelcome && !showSplash) {
      const timer = setTimeout(() => {
        setShowWelcomePopup(true);
      }, 1000); 
      return () => clearTimeout(timer);
    }
  }, [showSplash]);

  const handleCloseWelcomePopup = () => {
    if (dontShowWelcomeAgain) {
      localStorage.setItem("skip_welcome_popup", "true");
    }
    setShowWelcomePopup(false);
  };
  // ==========================================

  // ==========================================
  // ĐOẠN CODE THÊM MỚI: Bắt URL Scheme trả về từ Safari/Trình duyệt
  // ==========================================
  useEffect(() => {
    const setupDeepLinks = async () => {
      CapacitorApp.addListener('appUrlOpen', (event) => {
        const url = event.url;
        if (url.includes('politephim://login-callback')) {
          console.log('App đã mở từ URL:', url);
          // CapacitorApp lắng nghe và Supabase sẽ tự động nhận hash access_token trên URL
        }
      });
    };

    setupDeepLinks();

    return () => {
      CapacitorApp.removeAllListeners();
    };
  }, []);
  // ==========================================

  // STATE TRANSITION ANIMATION (Hiệu ứng dịu nhẹ)
  const [isTransitioning, setIsTransitioning] = useState(false);
  const transitionTimeoutRef = useRef(null);

  const [view, setView] = useState(() => parseUrlToView());
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cats, setCats] = useState([]);
  const [countries, setCountries] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [progressData, setProgressData] = useState({});
  const [user, setUser] = useState(null);
  const [favorites, setFavorites] = useState({});
  const [historyMovies, setHistoryMovies] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [hiddenContinueWatching, setHiddenContinueWatching] = useState(() => {
    try {
      const localHidden = localStorage.getItem("hidden_continue_watching");
      if (localHidden) {
        return JSON.parse(localHidden);
      } else {
        return [];
      }
    } catch (e) { 
      return []; 
    }
  });

  const normalizeUser = (sessionUser) => {
    if (!sessionUser) {
      return null;
    }
    
    let userDisplayName = "";
    if (sessionUser.user_metadata) {
      if (sessionUser.user_metadata.full_name) {
        userDisplayName = sessionUser.user_metadata.full_name;
      } else if (sessionUser.user_metadata.name) {
        userDisplayName = sessionUser.user_metadata.name;
      } else if (sessionUser.email) {
        userDisplayName = sessionUser.email.split('@')[0];
      }
    } else if (sessionUser.email) {
      userDisplayName = sessionUser.email.split('@')[0];
    }
    
    let photo = "";
    if (sessionUser.user_metadata) {
      if (sessionUser.user_metadata.avatar_url) {
        photo = sessionUser.user_metadata.avatar_url;
      } else if (sessionUser.user_metadata.picture) {
        photo = sessionUser.user_metadata.picture;
      }
    }

    return {
      uid: sessionUser.id,
      email: sessionUser.email,
      displayName: userDisplayName,
      photoURL: photo
    };
  };

  const handleProgressSaved = (slug, newProgressObj) => {
    setProgressData(prev => {
      const updated = { ...prev };
      if (newProgressObj) {
        if (newProgressObj.currentTime > 0) {
          updated[slug] = { ...updated[slug], ...newProgressObj, timestamp: Date.now() };
        }
      }
      return updated;
    });
  };

  const loadAndSyncProgress = async (currentUser) => {
    let lastUid = null;
    try { 
      lastUid = localStorage.getItem("last_uid"); 
    } catch (e) {}

    if (currentUser) {
      if (lastUid) {
        if (lastUid !== currentUser.uid) {
          try { localStorage.removeItem("hidden_continue_watching"); } catch (e) {}
          setHiddenContinueWatching([]);
        }
      }
      try { localStorage.setItem("last_uid", currentUser.uid); } catch (e) {}
    } else {
      if (lastUid) {
        try {
          localStorage.removeItem("hidden_continue_watching");
          localStorage.removeItem("last_uid");
        } catch (e) {}
        setHiddenContinueWatching([]);
      }
      setProgressData({});
      setFavorites({});
      return;
    }

    try {
      const { data: favData } = await supabase
        .from('favorites')
        .select('*')
        .eq('user_id', currentUser.uid);
        
      const formattedFavs = {};
      if (favData) {
        favData.forEach(item => {
          formattedFavs[item.movie_slug] = {
            name: item.movie_name,
            thumb_url: item.thumb_url,
            year: item.year
          };
        });
      }
      setFavorites(formattedFavs);
    } catch (e) { 
      setFavorites({}); 
    }

    try {
      const { data: historyData } = await supabase
        .from('watch_history')
        .select('*')
        .eq('user_id', currentUser.uid)
        .order('updated_at', { ascending: true });

      const formattedProgress = {};
      const dbHiddenSlugs = [];

      if (historyData) {
        historyData.forEach(item => {
          formattedProgress[item.movie_slug] = {
            episodeSlug: item.episode_slug, 
            episode_name: item.episode_name, 
            currentTime: item.current_time, 
            percentage: item.percentage,
            name: item.movie_name, 
            origin_name: item.origin_name, 
            thumb: item.thumb_url, 
            year: item.year,
            serverSource: item.server_source, 
            serverRawName: item.server_raw_name, 
            timestamp: new Date(item.updated_at).getTime()
          };

          if (item.is_hidden === true) {
            dbHiddenSlugs.push(item.movie_slug);
          }
        });
      }
      setProgressData(formattedProgress);
      
      setHiddenContinueWatching(dbHiddenSlugs);
      try { localStorage.setItem("hidden_continue_watching", JSON.stringify(dbHiddenSlugs)); } catch (e) {}

    } catch (e) { 
      setProgressData({}); 
    }
    
    try { localStorage.removeItem("movieProgress"); } catch {}
  };

  useEffect(() => {
    let isMounted = true;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (isMounted) {
        let currentUser = null;
        if (session) {
          if (session.user) {
            currentUser = normalizeUser(session.user);
          }
        }
        setUser(currentUser); 
        setIsAppReady(true); 
        loadAndSyncProgress(currentUser); 
      }
    }).catch(() => {
      if (isMounted) {
        setIsAppReady(true);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) {
        return;
      }
      if (event === 'INITIAL_SESSION') {
        return;
      }
      
      let currentUser = null;
      if (session) {
        if (session.user) {
          currentUser = normalizeUser(session.user);
        }
      }
      setUser(currentUser); 
      loadAndSyncProgress(currentUser);
    });

    return () => { 
      isMounted = false; 
      if (subscription) {
        subscription.unsubscribe(); 
      }
    };
  }, []);

  const handleComponentReady = useCallback(() => {
    setReadyCount(prev => prev + 1);
  }, []);

  useEffect(() => {
    if (!isAppReady) { return; }
    if (!showSplash) { return; }

    const hideSplashSequence = () => {
      if (fadeLockRef.current) { return; }
      fadeLockRef.current = true; 
      setFadeSplash(true); 
      setTimeout(() => {
        setShowSplash(false);
      }, 700);
    };

    if (view.type !== "home") {
      hideSplashSequence();
    } else {
      if (readyCount >= 10) {
        hideSplashSequence();
      }
    }

    const fallbackTimer = setTimeout(() => {
      hideSplashSequence();
    }, 8000); 

    return () => clearTimeout(fallbackTimer);
  }, [isAppReady, readyCount, view.type, showSplash]);

  const handleLogin = async () => {
    try { 
      await supabase.auth.signInWithOAuth({ 
        provider: 'google', 
        // ĐÃ SỬA: Thay window.location.origin thành politephim://login-callback
        options: { redirectTo: 'politephim://login-callback' } 
      }); 
    } 
    catch (e) { alert("Lỗi đăng nhập Google: " + e.message); }
  };

  const handleLogout = async () => {
    try { await supabase.auth.signOut(); } catch {}
    setUser(null); 
    setProgressData({}); 
    setFavorites({}); 
    setHiddenContinueWatching([]);
    try { 
      localStorage.removeItem("movieProgress"); 
      localStorage.removeItem("last_uid"); 
      localStorage.removeItem("hidden_continue_watching"); 
    } catch {}
  };

  const handleUpdateName = async (newName) => {
    if (!user) { return; }
    try {
      await supabase.auth.updateUser({ data: { full_name: newName } });
      setUser((prev) => ({ ...prev, displayName: newName }));
      await supabase.from('profiles').upsert({ user_id: user.uid, display_name: newName }, { onConflict: 'user_id' }).catch(() => {});
    } catch { alert("Lỗi khi cập nhật tên!"); }
  };

  const syncToFirebase = async (newData, field) => {
    if (!user || !user.uid) { return; }
    
    if (field === 'favorites') { 
      try { 
        const slugs = Object.keys(newData);
        const lastSlug = slugs[slugs.length - 1];
        const movie = newData[lastSlug];

        if (movie && lastSlug) {
          await supabase.from('favorites').upsert({ 
            user_id: user.uid, 
            movie_slug: lastSlug,
            movie_name: movie.name,
            thumb_url: movie.thumb_url,
            year: movie.year
          }, { onConflict: 'user_id,movie_slug' }); 
        }
      } catch (e) {
        console.error("Lỗi đồng bộ yêu thích:", e);
      } 
    }
  };

  const hideContinueWatching = async (slug) => {
    if (!slug) { return; }
    
    setHiddenContinueWatching((prev) => {
      if (prev.includes(slug)) {
        return prev;
      } else {
        const updated = [...prev, slug];
        try { localStorage.setItem("hidden_continue_watching", JSON.stringify(updated)); } catch (e) {}
        return updated;
      }
    });

    if (user && user.uid) {
      try {
        await supabase
          .from('watch_history') 
          .update({ is_hidden: true })
          .match({ user_id: user.uid, movie_slug: slug });
      } catch (error) {
        console.error("Lỗi khi update is_hidden lên DB:", error);
      }
    }
  };

  const removeProgressPermanently = async (slug) => {
    if (!slug) { return; }
    const backupProgressData = { ...progressData };
    const backupHistoryMovies = [...historyMovies];
    
    setProgressData((prev) => { 
      const updated = { ...prev }; 
      delete updated[slug]; 
      return updated; 
    });
    setHistoryMovies((prev) => {
      let updated = [];
      for (let i = 0; i < prev.length; i++) {
        if (prev[i].slug !== slug) {
          updated.push(prev[i]);
        }
      }
      return updated;
    });
    
    if (user) {
      if (user.uid) { 
        try { 
          await supabase.from('watch_history').delete().match({ user_id: user.uid, movie_slug: slug }); 
        } catch (e) { 
          setProgressData(backupProgressData); 
          setHistoryMovies(backupHistoryMovies); 
        } 
      }
    }
  };

  const removeFavorite = async (slug) => {
    if (!slug) { return; }
    
    setFavorites((prev) => { 
      const updated = { ...prev }; 
      delete updated[slug]; 
      return updated; 
    });
    
    if (user && user.uid) {
      try { 
        await supabase.from('favorites')
          .delete()
          .match({ user_id: user.uid, movie_slug: slug }); 
      } catch (e) {
        console.error("Lỗi xóa yêu thích:", e);
      }
    }
  };

  // ==========================================
  // HÀM NAVIGATE VỚI HIỆU ỨNG NHẸ NHÀNG, CHẬM RÃI
  // ==========================================
  const navigate = useCallback((newView) => {
    if (isTransitioning) return;
    
    const newUrl = getViewUrl(newView);
    if (window.location.pathname + window.location.search === newUrl) return;

    if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);

    // Kích hoạt làm mờ (opacity 0)
    setIsTransitioning(true);

    // Chờ 400ms để màn hình mờ hẳn đi, sau đó đổi dữ liệu
    transitionTimeoutRef.current = setTimeout(() => {
      window.history.pushState(newView, "", newUrl); 
      setView(newView); 
      window.scrollTo(0, 0);

      // Cho trang hiện rõ lại từ từ
      setTimeout(() => {
        setIsTransitioning(false);
      }, 50); 
    }, 400); 
  }, [isTransitioning]);

  useEffect(() => {
    if (view.type === "home") { 
      globalDisplayedSlugs.clear(); 
      document.title = "POLITE - Trang Chủ"; 
    } else {
      if (view.type === "search") {
        document.title = `Tìm kiếm: ${view.keyword} - POLITE`;
      } else if (view.type === "list") {
        let pageTitle = "Danh sách";
        if (view.title) {
          pageTitle = view.title;
        }
        document.title = `${pageTitle} - POLITE`;
      } else if (view.type === "watch-party-lobby") {
        document.title = "Sảnh Xem Chung - POLITE";
      } else if (view.type === "history") {
        document.title = "Phim Đã Xem - POLITE";
      } else if (view.type === "favorites") {
        document.title = "Phim Yêu Thích - POLITE";
      }
    }
  }, [view.type, view.keyword, view.title, user?.uid]); 

  useEffect(() => {
    if (view.type === "watch" || view.type === "detail" || view.type === "watch-room") {
      const currentSlug = view.slug;
      if (currentSlug) {
        setHiddenContinueWatching((prev) => {
          if (prev.includes(currentSlug)) {
            let updated = [];
            for(let i = 0; i < prev.length; i++) {
              if (prev[i] !== currentSlug) {
                updated.push(prev[i]);
              }
            }
            try { localStorage.setItem("hidden_continue_watching", JSON.stringify(updated)); } catch (e) {}
            
            if (user && user.uid) {
              supabase
                .from('watch_history')
                .update({ is_hidden: false })
                .match({ user_id: user.uid, movie_slug: currentSlug })
                .then(); 
            }

            return updated;
          } else {
            return prev;
          }
        });
      }
    }
  }, [view.type, view.slug, user]);

  // XỬ LÝ NÚT BACK/FORWARD CỦA TRÌNH DUYỆT (Nhẹ nhàng)
  useEffect(() => {
    const handlePopState = (event) => {
      if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);
      setIsTransitioning(true);

      transitionTimeoutRef.current = setTimeout(() => {
        if (event.state) {
          setView(event.state); 
        } else {
          setView(parseUrlToView());
        }
        
        if (user && user.uid) {
          loadAndSyncProgress(user);
        }

        setTimeout(() => {
          setIsTransitioning(false);
        }, 50);
      }, 400); // 400ms chờ mờ dần
    };
    
    window.addEventListener("popstate", handlePopState);
    
    const hash = window.location.hash; 
    const search = window.location.search;
    let isAuthRedirect = false;
    
    if (hash.includes("access_token")) {
      isAuthRedirect = true;
    } else if (search.includes("code=")) {
      isAuthRedirect = true;
    }
    
    if (!isAuthRedirect) {
      window.history.replaceState(view, "", getViewUrl(view));
    }

    Promise.all([
      fetchWithCache(`${API}/the-loai`, 86400000), 
      fetchWithCache(`${API}/quoc-gia`, 86400000)
    ]).then(([catsRes, countriesRes]) => {
      let items = [];
      if (catsRes && catsRes.data && catsRes.data.items) {
        items = catsRes.data.items;
      }
      
      let filteredItems = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].slug !== "hoat-hinh") {
          filteredItems.push(items[i]);
        }
      }
      filteredItems.unshift({ name: "Hoạt Hình", slug: "hoat-hinh" });
      setCats(filteredItems); 
      
      if (countriesRes && countriesRes.data && countriesRes.data.items) {
        setCountries(countriesRes.data.items);
      } else {
        setCountries([]);
      }
    }).catch(() => {});

    return () => { window.removeEventListener("popstate", handlePopState); };
  }, [user]);

  const historySlugsForPage = Object.keys(progressData)
    .sort((a, b) => {
      let timeA = progressData[a].timestamp || 0;
      let timeB = progressData[b].timestamp || 0;
      return timeB - timeA;
    })
    .join(",");

  useEffect(() => {
    if (view.type !== "history") return;
    
    const fetchHistoryMovies = async () => {
      setHistoryLoading(true);
      const slugs = historySlugsForPage.split(",").filter(Boolean);

      const fetchedMovies = await Promise.all(slugs.map(async (slug) => {
        try {
          const prog = progressData[slug];
          if (prog) {
            let originName = prog.origin_name || prog.original_name || "";
            return { 
              slug: slug, 
              name: prog.name, 
              origin_name: originName, 
              year: prog.year, 
              thumb_url: getImg(prog.thumb), 
              poster_url: getImg(prog.thumb) 
            };
          }
          return null;
        } catch (e) { 
          return null; 
        }
      }));

      setHistoryMovies(fetchedMovies.filter(Boolean));
      setHistoryLoading(false);
    };
    
    fetchHistoryMovies();
  }, [view.type, historySlugsForPage, progressData]);

  const fetchData = async (pageNum, isNewView = false) => {
    let currentMode = view.mode || "";
    let currentSlug = view.slug || "";
    let currentKeyword = view.keyword || "";

    const cacheKey = `polite_list_${view.type}_${currentMode}_${currentSlug}_${currentKeyword}_page_${pageNum}`;
    const CACHE_TTL = 3600000;

    if (isNewView) { 
      setLoading(true); 
      setMovies([]); 
    } else { 
      setLoadingMore(true); 
    }

    if (view.type === "actor" || view.type === "history" || view.type === "favorites") { 
      setLoading(false); 
      setLoadingMore(false); 
      return; 
    }

    try {
      const cachedStr = localStorage.getItem(cacheKey);
      if (cachedStr) {
        const parsed = JSON.parse(cachedStr);
        if (Date.now() - parsed.timestamp < CACHE_TTL) {
          setMovies((prev) => {
            let combined = isNewView ? parsed.data : [...prev, ...parsed.data];
            let mapObj = new Map();
            for (let i = 0; i < combined.length; i++) {
              mapObj.set(combined[i].slug, combined[i]);
            }
            return Array.from(mapObj.values());
          });
          
          setHasMore(parsed.data.length > 0);
          setLoading(false); 
          setLoadingMore(false); 
          return;
        }
      }
    } catch (e) {}

    let fetches = []; 
    let isFetchingFromTmdb = false;

    if (view.type === "search") {
      let qStr = view.keyword || "";
      const q = encodeURIComponent(String(qStr).trim()); 
      fetches = [`${API}/tim-kiem?keyword=${q}&page=${pageNum}`];
    } else if (view.type === "list") {
      if (view.mode === "the-loai") {
        const lang = `&language=vi&sort_by=popularity.desc&page=${pageNum}`; 
        let mGenres = "", tGenres = "", extra = "";
        
        switch (view.slug) {
          case "hanh-dong": mGenres = "28"; tGenres = "10759"; break;
          case "tinh-cam": mGenres = "10749"; tGenres = "10768"; break;
          case "kinh-di": mGenres = "27"; tGenres = "9648"; break;
          case "hai-huoc": mGenres = "35"; tGenres = "35"; break;
          case "hoat-hinh": mGenres = "16"; tGenres = "16"; break;
          case "anime": mGenres = "16"; tGenres = "16"; extra = "&with_original_language=ja"; break;
          case "vien-tuong": mGenres = "878"; tGenres = "10765"; break;
          case "hinh-su": mGenres = "80"; tGenres = "80"; break;
          case "co-trang": mGenres = "36"; tGenres = "10768"; extra = "&with_origin_country=CN|KR|JP"; break;
          case "chien-tranh": mGenres = "10752"; tGenres = "10768"; break;
          case "tam-ly": mGenres = "18"; tGenres = "18"; break;
          case "tai-lieu": mGenres = "99"; tGenres = "99"; break;
          case "phieu-luu": mGenres = "12"; tGenres = "10759"; break;
          case "gia-dinh": mGenres = "10751"; tGenres = "10751"; break;
          case "bi-an": mGenres = "9648"; tGenres = "9648"; break;
          case "am-nhac": mGenres = "1044"; break;
          case "vo-thuat": mGenres = "28"; extra = "&with_keywords=779"; break; 
          case "phim-han": 
            isFetchingFromTmdb = true; 
            fetches = [ 
              `${API_TMDB}/discover/movie?with_origin_country=KR${lang}`, 
              `${API_TMDB}/discover/tv?with_origin_country=KR&without_genres=10764,10767,10763${lang}` 
            ]; 
            break;
          default: break;
        }
        
        if (fetches.length === 0) {
          if (mGenres || tGenres) {
            isFetchingFromTmdb = true;
            if (mGenres) { fetches.push(`${API_TMDB}/discover/movie?with_genres=${mGenres}${extra}${lang}`); }
            if (tGenres) { fetches.push(`${API_TMDB}/discover/tv?with_genres=${tGenres}${extra}${lang}`); }
          } else { 
            fetches = [`${API}/${view.mode}/${view.slug}?page=${pageNum}`]; 
          }
        }
      } else {
        if (view.slug === "phim-moi-cap-nhat") { 
          fetches = [`${API}/danh-sach/phim-moi-cap-nhat?page=${pageNum}`]; 
        } else { 
          fetches = [`${API}/${view.mode}/${view.slug}?page=${pageNum}`]; 
        }
      }
    } else { 
      fetches = [`${API}/danh-sach/phim-moi-cap-nhat?page=${pageNum}`]; 
    }

    try {
      const results = await Promise.allSettled(fetches.map((url) => fetchWithCache(url, 300000)));
      let newItems = [];
      
      if (isFetchingFromTmdb) {
        let tmdbItems = [];
        results.forEach((res, idx) => {
          if (res.status === "fulfilled" && res.value && res.value.results) {
            const isTv = fetches[idx].includes('/discover/tv');
            const items = res.value.results.map(item => {
              let mType = item.media_type || (isTv ? "tv" : "movie");
              return { ...item, media_type: mType };
            });
            tmdbItems = [...tmdbItems, ...items];
          }
        });
        
        tmdbItems.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
        
        const matchPromises = tmdbItems.map(async (tItem) => {
          const ophimMatch = await matchTmdbToOphim(tItem);
          if (ophimMatch && ophimMatch.slug) {
            let movieName = tItem.title || tItem.name || ophimMatch.name;
            let originName = tItem.original_title || tItem.original_name || ophimMatch.origin_name;
            let releaseYear = "";
            if (tItem.release_date) releaseYear = tItem.release_date.split("-")[0];
            else if (tItem.first_air_date) releaseYear = tItem.first_air_date.split("-")[0];

            return { 
              ...ophimMatch, 
              slug: ophimMatch.slug, 
              name: movieName, 
              origin_name: originName, 
              poster_path: tItem.poster_path, 
              year: releaseYear, 
              tmdb: { ...tItem, poster_path: tItem.poster_path } 
            };
          } 
          return null; 
        });
        
        const resolvedMatches = await Promise.all(matchPromises);
        newItems = resolvedMatches.filter(Boolean);
      } else {
        results.forEach((res) => {
          if (res.status === "fulfilled") { 
            let items = res.value?.items || res.value?.data?.items;
            if (Array.isArray(items)) { 
              newItems = [...newItems, ...items]; 
            } 
          }
        });
      }
      
      try { localStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), data: newItems })); } catch (e) {}
      
      setMovies((prev) => { 
        let combined = isNewView ? newItems : [...prev, ...newItems];
        let mapObj = new Map();
        for (let i = 0; i < combined.length; i++) {
          mapObj.set(combined[i].slug, combined[i]);
        }
        return Array.from(mapObj.values()); 
      });
      
      setHasMore(newItems.length > 0);
      
    } catch { 
      if (isNewView) setMovies([]); 
      setHasMore(false); 
    } finally { 
      setLoading(false); 
      setLoadingMore(false); 
    }
  };

  useEffect(() => {
    const skipTypes = ["home", "detail", "watch", "watch-party-lobby", "watch-room", "history", "favorites"];
    if (!skipTypes.includes(view.type)) {
      setPage(1); 
      fetchData(1, true);
    }
  }, [view.type, view.mode, view.slug, view.keyword]);

  const loadNextPage = () => { 
    if (!loadingMore && hasMore) { 
      setPage((prev) => { 
        const next = prev + 1; 
        fetchData(next, false); 
        return next; 
      }); 
    }
  };

  return (
    <>
      {showSplash && <SplashScreen isFading={fadeSplash} />}

      <div className={`bg-[#050505] min-h-screen text-white font-sans antialiased selection:bg-[#E50914] selection:text-white pb-16 md:pb-10 overflow-x-hidden ${showSplash ? "opacity-0 h-screen overflow-hidden" : ""}`}>
        <Header navigate={navigate} categories={cats} countries={countries} user={user} onLogin={handleLogin} onLogout={handleLogout} onUpdateName={handleUpdateName} />

        {/* ============================================== */}
        {/* WRAPPER CHỨA HIỆU ỨNG TỪ TỪ, NHẸ NHÀNG DỊU MẮT */}
        {/* ============================================== */}
        <div 
          className={`transition-opacity duration-500 ease-in-out ${isTransitioning ? "opacity-0" : "opacity-100"}`}
        >
          {view.type === "home" ? (
            <div className="flex flex-col">
              <Hero navigate={navigate} onReady={handleComponentReady} />
              <div className="max-w-[1400px] mx-auto w-full px-4 md:px-12 relative z-20 pb-20 pt-8 md:pt-12">
                
                <ContinueWatching navigate={navigate} progressData={progressData} hiddenSlugs={hiddenContinueWatching} onRemove={hideContinueWatching} isLoggedIn={!!user} />
                
                {[
                  { title: "Phim Mới Cập Nhật", slug: "phim-moi-cap-nhat", type: "danh-sach" },
                  { title: "Phim Hàn", slug: "phim-han", type: "the-loai" },
                  { title: "Anime", slug: "anime", type: "the-loai" },
                  { title: "Phim bộ", slug: "phim-bo", type: "danh-sach" },
                  { title: "Phim lẻ", slug: "phim-le", type: "danh-sach" },
                  { title: "Hành động", slug: "hanh-dong", type: "the-loai" },
                  { title: "Tình cảm", slug: "tinh-cam", type: "the-loai" },
                  { title: "Kinh dị", slug: "kinh-di", type: "the-loai" },
                  { title: "Viễn tưởng", slug: "vien-tuong", type: "the-loai" }
                ].map((section, index) => (
                  <MovieSection 
                    key={`${section.slug}-${index}`} 
                    title={section.title} 
                    slug={section.slug} 
                    type={section.type} 
                    navigate={navigate} 
                    progressData={progressData} 
                    onReady={handleComponentReady} 
                  />
                ))}
              </div>
            </div>
          ) : view.type === "detail" ? (
            view.slug?.startsWith("tmdb-") ? <TmdbMatcher slug={view.slug} setView={setView} /> : <MovieDetail slug={view.slug} movieData={view.movieData} navigate={navigate} user={user} onLogin={handleLogin} favorites={favorites} setFavorites={setFavorites} syncToFirebase={syncToFirebase} />
          ) : view.type === "watch" ? (<Watch slug={view.slug} movieData={view.movieData} navigate={navigate} user={user} onLogin={handleLogin} onProgressSaved={handleProgressSaved} progressData={progressData} autoFullscreen={view.autoFullscreen} />
            
          ) : view.type === "watch-party-lobby" ? (
            <WatchPartyLobby navigate={navigate} user={user} onLogin={handleLogin} />
          ) : view.type === "watch-room" ? (
            <WatchPartyRoom roomId={view.roomId} slug={view.slug} navigate={navigate} user={user} />
          ) : view.type === "history" ? (
            <MovieGrid title="Phim Đã Xem" movies={historyMovies} loading={historyLoading} navigate={navigate} hasMore={false} onRemove={removeProgressPermanently} progressData={progressData} />
          ) : view.type === "favorites" ? (
            <MovieGrid title="Phim Yêu Thích" movies={Object.keys(favorites).map((slug) => { const fav = favorites[slug]; const finalPosterUrl = getMoviePoster(fav, {}, getImg); return { slug, name: fav.name, origin_name: fav.origin_name || fav.original_name || "", thumb_url: finalPosterUrl, poster_url: finalPosterUrl, year: fav.year }; }).reverse()} loading={false} navigate={navigate} hasMore={false} onRemove={removeFavorite} />
          ) : (
            <MovieGrid title={view.type === "search" ? `Tìm kiếm: ${view.keyword}` : view.title} movies={movies} loading={loading} navigate={navigate} onLoadMore={loadNextPage} hasMore={hasMore} loadingMore={loadingMore} />
          )}
        </div>
        {/* ============================================== */}
        
        <BottomNav navigate={navigate} setView={setView} categories={cats} countries={countries} currentView={view.type} />
      </div>

      {/* ============================================== */}
      {/* POPUP CHÀO MỪNG LẦN ĐẦU TIÊN (Chỉ hiện khi chưa đăng nhập) */}
      {/* ============================================== */}
      {showWelcomePopup && !user && (
        <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-[#111] border border-white/10 rounded-2xl p-6 md:p-8 max-w-md w-full shadow-2xl relative overflow-hidden">
            
            {/* Hiệu ứng mờ đỏ góc trên cùng */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#E50914] rounded-full mix-blend-screen filter blur-[70px] opacity-30 pointer-events-none"></div>

            <div className="flex flex-col items-center mb-6 text-center">
              <div className="w-16 h-16 bg-[#E50914]/10 rounded-full flex items-center justify-center mb-4 border border-[#E50914]/20">
                <Icon.Clapperboard size={32} className="text-[#E50914]" />
              </div>
              <h3 className="text-2xl md:text-3xl font-black text-white uppercase tracking-wider mb-2">
                Chào Mừng Bạn Đến <span className="text-[#E50914]">POLITE</span>
              </h3>
              <p className="text-gray-400 text-sm md:text-base">
                Đăng nhập ngay hôm nay để mở khóa trải nghiệm điện ảnh trọn vẹn nhất.
              </p>
            </div>

            <div className="space-y-4 mb-8">
              <div className="flex items-start gap-4 p-3 bg-white/5 rounded-xl border border-white/5">
                <Icon.History className="text-[#E50914] shrink-0 mt-0.5" size={20} />
                <div>
                  <h4 className="text-white font-bold text-sm">Lưu Tiến Trình & Đồng Bộ</h4>
                  <p className="text-xs text-gray-400 mt-1">Dữ liệu cá nhân hóa của bạn luôn được đồng bộ thời gian thực. Bất kể bạn dùng thiết bị hay trình duyệt nào, phim bạn xem vẫn luôn ở đúng khung hình.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4 p-3 bg-white/5 rounded-xl border border-white/5">
                <Icon.Heart className="text-[#E50914] shrink-0 mt-0.5" size={20} />
                <div>
                  <h4 className="text-white font-bold text-sm">Bộ Sưu Tập Yêu Thích</h4>
                  <p className="text-xs text-gray-400 mt-1">Tạo riêng cho mình danh sách những bộ phim tâm đắc nhất.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4 p-3 bg-white/5 rounded-xl border border-white/5">
                <Icon.Users className="text-[#E50914] shrink-0 mt-0.5" size={20} />
                <div>
                  <h4 className="text-white font-bold text-sm">Phòng Xem Chung</h4>
                  <p className="text-xs text-gray-400 mt-1">Tạo phòng xem phim và chat trực tiếp cùng bạn bè.</p>
                </div>
              </div>
            </div>

            {/* Checkbox Không hiện lại */}
            <div 
              className="flex items-center justify-center gap-2.5 mb-6 cursor-pointer group"
              onClick={() => setDontShowWelcomeAgain(!dontShowWelcomeAgain)}
            >
              <div className={`w-[18px] h-[18px] rounded-md flex items-center justify-center border transition-all duration-200 ${
                dontShowWelcomeAgain 
                  ? 'bg-[#E50914] border-[#E50914]' 
                  : 'border-white/30 bg-white/5 group-hover:border-white/60'
              }`}>
                {dontShowWelcomeAgain && <Icon.Check size={14} strokeWidth={4} className="text-white" />}
              </div>
              <span className="text-sm text-gray-400 select-none group-hover:text-gray-200 transition-colors">
                Không hiện lại thông báo này
              </span>
            </div>

            <div className="flex flex-col gap-3">
              <button 
                onClick={() => {
                  handleCloseWelcomePopup();
                  handleLogin();
                }} 
                className="w-full py-3.5 rounded-xl font-bold text-sm bg-[#E50914] hover:bg-red-700 text-white transition-colors uppercase tracking-widest shadow-[0_4px_15px_rgba(229,9,20,0.4)] flex justify-center items-center gap-2"
              >
                <Icon.LogIn size={18} />
                Đăng Nhập Ngay
              </button>
              <button 
                onClick={handleCloseWelcomePopup} 
                className="w-full py-3 rounded-xl font-bold text-sm text-gray-400 hover:text-white bg-transparent hover:bg-white/5 transition-colors uppercase tracking-wider"
              >
                Bỏ Qua
              </button>
            </div>

          </div>
        </div>
      )}
      {/* ============================================== */}
    </>
  );
}