import React, { useState, useEffect } from "react";
import { signInWithPopup, signOut, onAuthStateChanged, updateProfile } from "firebase/auth";
import { doc, setDoc, getDoc, updateDoc } from "firebase/firestore";

import { auth, db, googleProvider } from "./config/firebase";
import { API, API_NGUONC, globalDisplayedSlugs, mergeDuplicateMovies } from "./utils/helpers";

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

const getViewUrl = (view) => {
  switch (view.type) {
    case "home": return "/";
    case "detail": return `/phim/${view.slug}`;
    case "watch": return `/xem-phim/${view.slug}`;
    case "watch-party-lobby": return `/xem-chung`;
    case "watch-room": return `/phong/${view.roomId}/${view.slug}`;
    case "search": return `/tim-kiem?q=${encodeURIComponent(view.keyword || "")}`;
    case "list": return `/danh-sach/${view.mode}/${view.slug}`;
    case "history": return `/phim-da-xem`;
    case "favorites": return `/phim-yeu-thich`;
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
  if (path.startsWith("/tim-kiem")) return { type: "search", keyword: searchParams.get("q") || "" };
  if (path.startsWith("/danh-sach/")) {
      const parts = path.split("/");
      return { type: "list", mode: parts[2], slug: parts[3], title: "Danh sách phim" };
  }
  return { type: "home" };
};

export default function App() {
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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const docRef = doc(db, "users", currentUser.uid);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            const data = docSnap.data();
            const localProgress = JSON.parse(localStorage.getItem("movieProgress") || "{}");
            const mergedProgress = { ...localProgress, ...(data.progress || {}) };
            
            localStorage.setItem("movieProgress", JSON.stringify(mergedProgress));
            setProgressData(mergedProgress);
            setFavorites(data.favorites || {});
          } else {
            await setDoc(docRef, { progress: progressData, favorites: {} });
          }
        } catch (error) {
          console.error("Lỗi lấy dữ liệu user (Firebase offline/bị chặn):", error);
          const localProgress = JSON.parse(localStorage.getItem("movieProgress") || "{}");
          setProgressData(localProgress);
          setFavorites({});
        }
      } else {
        setFavorites({}); 
      }
    });
    return () => unsubscribe();
  }, []); 

  const syncToFirebase = async (newData, field) => {
    if (user) {
      const docRef = doc(db, "users", user.uid);
      await updateDoc(docRef, { [field]: newData }).catch(async () => {
          await setDoc(docRef, { [field]: newData }, { merge: true }).catch(() => {});
      });
    }
  };

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Lỗi đăng nhập:", error);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
  };

  // Cập nhật tên người dùng
  const handleUpdateName = async (newName) => {
    if (auth.currentUser) {
      try {
        await updateProfile(auth.currentUser, { displayName: newName });
        setUser({ ...auth.currentUser, displayName: newName }); // Force update local state
        
        // Đồng bộ vào Firestore (tuỳ chọn nhưng khuyên dùng)
        const docRef = doc(db, "users", auth.currentUser.uid);
        await updateDoc(docRef, { displayName: newName }).catch(() => {});
      } catch (error) {
        console.error("Lỗi đổi tên:", error);
        alert("Lỗi khi cập nhật tên!");
      }
    }
  };

  const refreshProgress = () => { 
      try {
          const currentData = JSON.parse(localStorage.getItem("movieProgress") || "{}");
          setProgressData(currentData); 
          if (user) {
             const docRef = doc(db, "users", user.uid);
             updateDoc(docRef, { progress: currentData }).catch(()=>{});
          }
      } catch(e) { setProgressData({}); }
  };

  const removeProgress = (slug) => {
    try {
        const current = JSON.parse(localStorage.getItem("movieProgress") || "{}");
        delete current[slug];
        localStorage.setItem("movieProgress", JSON.stringify(current));
        refreshProgress();
    } catch(e){}
  };

  const navigate = (newView) => {
    const newUrl = getViewUrl(newView);
    window.history.pushState(newView, '', newUrl);
    setView(newView);
    window.scrollTo(0, 0);
    setTimeout(() => {
        refreshProgress();
    }, 50);
  };

  useEffect(() => {
    if (view.type === "home") {
        globalDisplayedSlugs.clear();
        refreshProgress();
    }
  }, [view.type]);

  useEffect(() => {
    if (view.type === "home") {
        document.title = "POLITE - Trang Chủ";
    } else if (view.type === "search") {
        document.title = `Tìm kiếm: ${view.keyword} - POLITE`;
    } else if (view.type === "list") {
        document.title = `${view.title || 'Danh sách'} - POLITE`;
    } else if (view.type === "watch-party-lobby") {
        document.title = "Sảnh Xem Chung - POLITE";
    } else if (view.type === "history") {
        document.title = "Phim Đã Xem - POLITE";
    } else if (view.type === "favorites") {
        document.title = "Phim Yêu Thích - POLITE";
    }
  }, [view]);

  useEffect(() => {
    const handlePopState = (event) => {
      if (event.state) setView(event.state);
      else setView(parseUrlToView());
    };
    window.addEventListener('popstate', handlePopState);
    
    window.history.replaceState(view, '', getViewUrl(view));

    refreshProgress();
    
    fetch(`${API}/the-loai`).then((r) => r.json()).then((j) => {
        let items = j?.data?.items || [];
        items = items.filter(i => i.slug !== 'hoat-hinh');
        items.unshift({ name: 'Hoạt Hình', slug: 'hoat-hinh' });
        setCats(items);
    }).catch(() => {});
    
    fetch(`${API}/quoc-gia`).then((r) => r.json()).then((j) => setCountries(j?.data?.items || [])).catch(() => {});

    const setupPWA = () => {
      const metaTags = [
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
        { name: 'apple-mobile-web-app-title', content: 'POLITE' },
        { name: 'theme-color', content: '#050505' },
        { name: 'mobile-web-app-capable', content: 'yes' }
      ];
      metaTags.forEach(({ name, content }) => {
        let meta = document.createElement('meta');
        meta.name = name;
        meta.content = content;
        document.head.appendChild(meta);
      });

      const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="20" fill="#000000"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-family="Arial, sans-serif" font-weight="900" font-style="italic" font-size="65" fill="#E50914">P</text></svg>`;
      const iconUrl = `data:image/svg+xml;base64,${btoa(svgIcon)}`;
      
      let appleIcon = document.createElement('link');
      appleIcon.rel = 'apple-touch-icon';
      appleIcon.href = iconUrl;
      document.head.appendChild(appleIcon);

      let standardIcon = document.createElement('link');
      standardIcon.rel = 'icon';
      standardIcon.href = iconUrl;
      document.head.appendChild(standardIcon);
      
      const preconnect = document.createElement('link');
      preconnect.rel = 'preconnect';
      preconnect.href = 'https://i0.wp.com'; 
      document.head.appendChild(preconnect);
    };
    setupPWA();

    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const fetchData = async (pageNum, isNewView = false) => {
    if (isNewView) { setLoading(true); setMovies([]); } 
    else { setLoadingMore(true); }

    if (view.type === "actor" || view.type === "history" || view.type === "favorites") {
       setLoading(false);
       return;
    }

    let fetches = [];
    
    if (view.type === "search") {
      const q = encodeURIComponent(String(view.keyword || "").trim());
      fetches = [
          `${API}/tim-kiem?keyword=${q}&page=${pageNum}`,
          `${API_NGUONC}/search?keyword=${q}&page=${pageNum}`
      ];
    } else if (view.type === "list") {
      if (view.slug === 'hoat-hinh') {
          fetches = [
              `${API}/the-loai/hoat-hinh?page=${pageNum}`,
              `${API}/danh-sach/hoat-hinh?page=${pageNum}`,
              `${API}/the-loai/hoa-hinh?page=${pageNum}`,
              `${API_NGUONC}/the-loai/hoathinh?page=${pageNum}`,
              `${API_NGUONC}/danh-sach/hoathinh?page=${pageNum}`
          ];
      } else if (view.slug === 'phim-moi-cap-nhat') {
          fetches = [
              `${API}/danh-sach/phim-moi-cap-nhat?page=${pageNum}`,
              `${API_NGUONC}/phim-moi-cap-nhat?page=${pageNum}`
          ];
      } else {
          fetches = [
              `${API}/${view.mode}/${view.slug}?page=${pageNum}`,
              `${API_NGUONC}/${view.mode}/${view.slug}?page=${pageNum}`
          ];
      }
    } else {
      fetches = [
          `${API}/danh-sach/phim-moi-cap-nhat?page=${pageNum}`,
          `${API_NGUONC}/phim-moi-cap-nhat?page=${pageNum}`
      ];
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); 

    try {
        const reqs = fetches.map(url => fetch(url, { signal: controller.signal }).then(r => r.json()));
        const results = await Promise.allSettled(reqs);

        clearTimeout(timeoutId);

        let newItems = [];

        results.forEach(res => {
            if (res.status === 'fulfilled') {
                const items = res.value?.items || res.value?.data?.items;
                if (Array.isArray(items)) {
                    newItems = [...newItems, ...items];
                }
            }
        });

        setMovies((prev) => {
            const combined = isNewView ? newItems : [...prev, ...newItems];
            return mergeDuplicateMovies(combined);
        });
        
        setHasMore(newItems.length > 0);
        
    } catch(e) {
        if (isNewView) setMovies([]);
        setHasMore(false);
    } finally {
        clearTimeout(timeoutId);
        setLoading(false);
        setLoadingMore(false);
    }
  };

  useEffect(() => {
    if (view.type !== "home" && view.type !== "detail" && view.type !== "watch" && view.type !== "watch-party-lobby" && view.type !== "watch-room" && view.type !== "history" && view.type !== "favorites") {
      setPage(1); fetchData(1, true);
    }
  }, [view]);

  const loadNextPage = () => {
     if (!loadingMore && hasMore) {
        setPage((p) => {
            fetchData(p + 1, false);
            return p + 1;
        });
     }
  };

  return (
    <div className="bg-[#050505] min-h-screen text-white font-sans antialiased selection:bg-[#E50914] selection:text-white pb-16 md:pb-10 overflow-x-hidden">
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800;900&display=swap" rel="stylesheet" />
      
      <style>{`
        * { font-family: 'Inter', sans-serif !important; font-style: normal !important; scrollbar-width: none !important; -ms-overflow-style: none !important; }
        ::-webkit-scrollbar { display: none !important; width: 0 !important; height: 0 !important; background: transparent !important; }

        html { scroll-behavior: smooth; }
        body { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes custom-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-spin { animation: custom-spin 1s linear infinite !important; }
        
        .custom-range { -webkit-appearance: none; outline: none; border-radius: 4px; }
        .custom-range::-webkit-slider-thumb { -webkit-appearance: none; height: 0px; width: 0px; background: transparent; border: none; box-shadow: none; cursor: pointer; }
        .custom-range::-webkit-slider-runnable-track { width: 100%; height: 100%; background: transparent; cursor: pointer; border-radius: 4px; }
      `}</style>
      
      <Header 
        navigate={navigate} 
        categories={cats} 
        countries={countries} 
        user={user} 
        onLogin={handleLogin} 
        onLogout={handleLogout} 
        onUpdateName={handleUpdateName} 
      />
      
      {view.type === "home" ? (
        <div className="flex flex-col">
          <Hero navigate={navigate} />
          <div className="max-w-[1400px] mx-auto w-full px-4 md:px-12 relative z-20 pb-20 pt-8 md:pt-12">
            
            <ContinueWatching navigate={navigate} progressData={progressData} onRemove={removeProgress} />
            
            {user && Object.keys(favorites).length > 0 && (
              <div className="mb-8 md:mb-12 animate-in fade-in duration-500 transform-gpu">
                <h2 className="text-[15px] sm:text-lg md:text-2xl font-black text-white uppercase tracking-tighter flex items-center gap-2 md:gap-3 mb-3 md:mb-4 px-1">
                  <span className="w-[4px] h-6 md:h-8 bg-[#E50914] block" /> Phim Yêu Thích
                </h2>
                <div className="flex gap-3 sm:gap-4 md:gap-6 overflow-x-auto scroll-smooth no-scrollbar pb-4 px-1 md:px-2 snap-x snap-mandatory">
                  {Object.keys(favorites).reverse().map((slug) => {
                    const fav = favorites[slug];
                    return (
                      <MovieCard 
                        key={slug} 
                        m={{ slug, name: fav.name, origin_name: fav.origin_name, thumb_url: fav.thumb, year: fav.year }} 
                        navigate={navigate} 
                        isRow={true} 
                      />
                    );
                  })}
                </div>
              </div>
            )}

            <MovieSection title="Phim Mới Cập Nhật" slug="phim-moi-cap-nhat" type="danh-sach" navigate={navigate} progressData={progressData} />
            <MovieSection title="Anime / Hoạt Hình Hot" slug="hoat-hinh" type="the-loai" navigate={navigate} progressData={progressData} />
            <MovieSection title="Phim Bộ Mới" slug="phim-bo" type="danh-sach" navigate={navigate} progressData={progressData} />
            <MovieSection title="Phim Lẻ Mới" slug="phim-le" type="danh-sach" navigate={navigate} progressData={progressData} />
            
            <MovieSection title="Hành Động - Viễn Tưởng" slug="hanh-dong" type="the-loai" navigate={navigate} progressData={progressData} />
            <MovieSection title="Tình Cảm - Tâm Lý" slug="tinh-cam" type="the-loai" navigate={navigate} progressData={progressData} />
            <MovieSection title="Kinh Dị - Giật Gân" slug="kinh-di" type="the-loai" navigate={navigate} progressData={progressData} />
            <MovieSection title="Hài Hước" slug="hai-huoc" type="the-loai" navigate={navigate} progressData={progressData} />

            <MovieSection title="Phim Hàn Quốc" slug="han-quoc" type="quoc-gia" navigate={navigate} progressData={progressData} />
            <MovieSection title="Phim Trung Quốc" slug="trung-quoc" type="quoc-gia" navigate={navigate} progressData={progressData} />
            <MovieSection title="Phim Âu - Mỹ" slug="au-my" type="quoc-gia" navigate={navigate} progressData={progressData} />
            <MovieSection title="Phim Việt Nam" slug="viet-nam" type="quoc-gia" navigate={navigate} progressData={progressData} />
          </div>
        </div>
      ) : view.type === "detail" ? (
        <MovieDetail slug={view.slug} movieData={view.movieData} navigate={navigate} user={user} onLogin={handleLogin} favorites={favorites} setFavorites={setFavorites} syncToFirebase={syncToFirebase} />
      ) : view.type === "watch" ? (
        <Watch slug={view.slug} movieData={view.movieData} navigate={navigate} user={user} onLogin={handleLogin} />
      ) : view.type === "watch-party-lobby" ? (
        <WatchPartyLobby navigate={navigate} user={user} onLogin={handleLogin} />
      ) : view.type === "watch-room" ? (
        <WatchPartyRoom roomId={view.roomId} slug={view.slug} navigate={navigate} user={user} />
      ) : view.type === "history" ? (
        <MovieGrid 
          title="Phim Đang Xem Dở" 
          movies={Object.keys(progressData).filter(slug => progressData[slug] && progressData[slug].percentage < 99).map(slug => ({ slug, name: progressData[slug].name, origin_name: progressData[slug].origin_name, thumb_url: progressData[slug].thumb, year: progressData[slug].year })).reverse()} 
          loading={false} 
          navigate={navigate} 
          hasMore={false} 
        />
      ) : view.type === "favorites" ? (
        <MovieGrid 
          title="Phim Yêu Thích" 
          movies={Object.keys(favorites).map(slug => ({ slug, name: favorites[slug].name, origin_name: favorites[slug].origin_name, thumb_url: favorites[slug].thumb, year: favorites[slug].year })).reverse()} 
          loading={false} 
          navigate={navigate} 
          hasMore={false} 
        />
      ) : (
        <MovieGrid 
          title={view.type === "search" ? `Tìm kiếm: ${view.keyword}` : view.title} 
          movies={movies} 
          loading={loading} 
          navigate={navigate}
          onLoadMore={loadNextPage} 
          hasMore={hasMore} 
          loadingMore={loadingMore} 
        />
      )}
      
      <BottomNav navigate={navigate} setView={setView} categories={cats} countries={countries} currentView={view.type} />
    </div>
  );
}