import React, { useState, useEffect } from "react";
import {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  updateProfile
} from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc, deleteField } from "firebase/firestore";

import { auth, db, googleProvider } from "./config/firebase";
import {
  API,
  API_NGUONC,
  IMG,
  globalDisplayedSlugs,
  mergeDuplicateMovies,
  fetchWithCache
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
    return {
      type: "list",
      mode: parts[2],
      slug: parts[3],
      title: "Danh sách phim"
    };
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

  const loadAndSyncProgress = async (currentUser) => {
    const lastUid = localStorage.getItem("last_uid");

    if (currentUser) {
      if (lastUid && lastUid !== currentUser.uid) {
        localStorage.removeItem("movieProgress");
      }
      localStorage.setItem("last_uid", currentUser.uid);
    } else {
      if (lastUid) {
        localStorage.removeItem("movieProgress");
        localStorage.removeItem("last_uid");
      }
    }

    let localData = {};
    try {
      localData = JSON.parse(localStorage.getItem("movieProgress") || "{}");
    } catch {}

    if (!currentUser) {
      setProgressData(localData);
      return;
    }

    try {
      const docRef = doc(db, "users", currentUser.uid);
      const snap = await getDoc(docRef);

      let firebaseData = {};
      if (snap.exists()) {
        firebaseData = snap.data().progress || {};
        setFavorites(snap.data().favorites || {});
      } else {
        await setDoc(docRef, { progress: {}, favorites: {} });
      }

      const mergedData = { ...firebaseData };
      for (const slug in localData) {
        if (!mergedData[slug] || (localData[slug].timestamp > (mergedData[slug].timestamp || 0))) {
          mergedData[slug] = localData[slug];
        }
      }

      setProgressData(mergedData);
      localStorage.setItem("movieProgress", JSON.stringify(mergedData));

      await updateDoc(docRef, { progress: mergedData }).catch(() => {});
    } catch (e) {
      setProgressData(localData);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      loadAndSyncProgress(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const syncToFirebase = async (newData, field) => {
    if (!user?.uid) return;
    try {
      const docRef = doc(db, "users", user.uid);
      await updateDoc(docRef, { [field]: newData });
    } catch {
      try {
        const docRef = doc(db, "users", user.uid);
        await setDoc(docRef, { [field]: newData }, { merge: true });
      } catch {}
    }
  };

  const handleLogin = async () => {
    try { await signInWithPopup(auth, googleProvider); } catch {}
  };

  const handleLogout = async () => {
    try { await signOut(auth); } catch {}
    setUser(null);
    setProgressData({});
    setFavorites({});
    try { 
      localStorage.removeItem("movieProgress"); 
      localStorage.removeItem("last_uid");
    } catch {}
  };

  const handleUpdateName = async (newName) => {
    if (!auth.currentUser) return;
    try {
      await updateProfile(auth.currentUser, { displayName: newName });
      setUser({ ...auth.currentUser, displayName: newName });
      const docRef = doc(db, "users", auth.currentUser.uid);
      await updateDoc(docRef, { displayName: newName }).catch(() => {});
    } catch {
      alert("Lỗi khi cập nhật tên!");
    }
  };

  // Hàm xóa lịch sử xem dở
  const removeProgress = async (slug) => {
    if (!slug) return;

    setProgressData((prev) => {
      const updated = { ...prev };
      delete updated[slug];
      try { localStorage.setItem("movieProgress", JSON.stringify(updated)); } catch {}
      return updated;
    });

    if (user?.uid) {
      try {
        const docRef = doc(db, "users", user.uid);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          await updateDoc(docRef, {
            [`progress.${slug}`]: deleteField()
          });
        }
      } catch (e) {
        console.error("Xóa trên Firebase thất bại:", e);
      }
    }
  };

  // Hàm xóa Phim Yêu Thích 
  const removeFavorite = async (slug) => {
    if (!slug) return;

    setFavorites((prev) => {
      const updated = { ...prev };
      delete updated[slug];
      return updated;
    });

    if (user?.uid) {
      try {
        const docRef = doc(db, "users", user.uid);
        await updateDoc(docRef, { [`favorites.${slug}`]: deleteField() });
      } catch (e) {
        console.error("Xóa phim yêu thích thất bại:", e);
      }
    }
  };

  const navigate = (newView) => {
    const newUrl = getViewUrl(newView);
    window.history.pushState(newView, "", newUrl);
    setView(newView);
    window.scrollTo(0, 0);

    if (newView.type === "home") {
      setTimeout(() => loadAndSyncProgress(user), 100);
    }
  };

  useEffect(() => {
    if (view.type === "home") {
      globalDisplayedSlugs.clear();
      document.title = "POLITE - Trang Chủ";
    } else if (view.type === "search") document.title = `Tìm kiếm: ${view.keyword} - POLITE`;
    else if (view.type === "list") document.title = `${view.title || "Danh sách"} - POLITE`;
    else if (view.type === "watch-party-lobby") document.title = "Sảnh Xem Chung - POLITE";
    else if (view.type === "history") document.title = "Phim Đã Xem - POLITE";
    else if (view.type === "favorites") document.title = "Phim Yêu Thích - POLITE";
  }, [view]);

  useEffect(() => {
    const handlePopState = (event) => {
      if (event.state) setView(event.state);
      else setView(parseUrlToView());
    };

    window.addEventListener("popstate", handlePopState);
    window.history.replaceState(view, "", getViewUrl(view));

    Promise.all([
      fetchWithCache(`${API}/the-loai`, 86400000),
      fetchWithCache(`${API}/quoc-gia`, 86400000)
    ]).then(([catsRes, countriesRes]) => {
      let items = catsRes?.data?.items || [];
      items = items.filter((i) => i.slug !== "hoat-hinh");
      items.unshift({ name: "Hoạt Hình", slug: "hoat-hinh" });
      setCats(items);
      setCountries(countriesRes?.data?.items || []);
    }).catch(() => {});

    const setupPWA = () => {
      const metaTags = [
        { name: "apple-mobile-web-app-capable", content: "yes" },
        { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
        { name: "apple-mobile-web-app-title", content: "POLITE" },
        { name: "theme-color", content: "#050505" },
        { name: "mobile-web-app-capable", content: "yes" }
      ];

      metaTags.forEach(({ name, content }) => {
        if (document.querySelector(`meta[name="${name}"]`)) return;
        const meta = document.createElement("meta");
        meta.name = name;
        meta.content = content;
        document.head.appendChild(meta);
      });

      const preconnects = [
        "https://fonts.googleapis.com",
        "https://fonts.gstatic.com",
        "https://polite-api.thangdz2001a.workers.dev"
      ];

      preconnects.forEach((href) => {
        if (!document.querySelector(`link[rel="preconnect"][href="${href}"]`)) {
          const link = document.createElement("link");
          link.rel = "preconnect";
          link.href = href;
          if (href.includes("gstatic")) link.crossOrigin = "true";
          document.head.appendChild(link);
        }
      });

      const dnsPrefetchTarget = new URL(IMG).origin;
      if (!document.querySelector(`link[rel="dns-prefetch"][href="${dnsPrefetchTarget}"]`)) {
        const dns = document.createElement("link");
        dns.rel = "dns-prefetch";
        dns.href = dnsPrefetchTarget;
        document.head.appendChild(dns);
      }
    };

    setupPWA();

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  const fetchData = async (pageNum, isNewView = false) => {
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

    let fetches = [];

    if (view.type === "search") {
      const q = encodeURIComponent(String(view.keyword || "").trim());
      fetches = [
        `${API}/tim-kiem?keyword=${q}&page=${pageNum}`,
        `${API_NGUONC}/search?keyword=${q}&page=${pageNum}`
      ];
    } else if (view.type === "list") {
      if (view.slug === "hoat-hinh") {
        fetches = [
          `${API}/the-loai/hoat-hinh?page=${pageNum}`,
          `${API}/danh-sach/hoat-hinh?page=${pageNum}`,
          `${API}/the-loai/hoa-hinh?page=${pageNum}`,
          `${API_NGUONC}/the-loai/hoathinh?page=${pageNum}`,
          `${API_NGUONC}/danh-sach/hoathinh?page=${pageNum}`
        ];
      } else if (view.slug === "phim-moi-cap-nhat") {
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

    try {
      const results = await Promise.allSettled(
        fetches.map((url) => fetchWithCache(url, 300000))
      );

      let newItems = [];
      results.forEach((res) => {
        if (res.status === "fulfilled") {
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
    } catch {
      if (isNewView) setMovies([]);
      setHasMore(false);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    if (
      view.type !== "home" &&
      view.type !== "detail" &&
      view.type !== "watch" &&
      view.type !== "watch-party-lobby" &&
      view.type !== "watch-room" &&
      view.type !== "history" &&
      view.type !== "favorites"
    ) {
      setPage(1);
      fetchData(1, true);
    }
  }, [view]);

  const loadNextPage = () => {
    if (!loadingMore && hasMore) {
      setPage((prevPage) => {
        const nextPage = prevPage + 1;
        fetchData(nextPage, false);
        return nextPage;
      });
    }
  };

  return (
    <div className="bg-[#050505] min-h-screen text-white font-sans antialiased selection:bg-[#E50914] selection:text-white pb-16 md:pb-10 overflow-x-hidden">
      {/* TÍCH HỢP FONTS: Oswald cho tiêu đề bự, Inter cho mô tả */}
      <link href="https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;700;900&family=Inter:wght@400;600;800;900&display=swap" rel="stylesheet" />

      <style>{`
        * { scrollbar-width: none !important; -ms-overflow-style: none !important; }
        
        /* Font siêu ngầu cho Tên Phim và Tiêu Đề */
        h1, h2, h3, .font-black, .font-bold { font-family: 'Oswald', Impact, 'Arial Black', sans-serif !important; }
        
        /* Font dễ đọc cho các thông tin phụ */
        p, span, div, a, button { font-family: 'Inter', sans-serif; }
        
        ::-webkit-scrollbar { display: none !important; }
        html { scroll-behavior: smooth; }
        body { -webkit-font-smoothing: antialiased; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes custom-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-spin { animation: custom-spin 1s linear infinite !important; }
      `}</style>

      <Header navigate={navigate} categories={cats} countries={countries} user={user} onLogin={handleLogin} onLogout={handleLogout} onUpdateName={handleUpdateName} />

      {view.type === "home" ? (
        <div className="flex flex-col">
          <Hero navigate={navigate} />
          <div className="max-w-[1400px] mx-auto w-full px-4 md:px-12 relative z-20 pb-20 pt-8 md:pt-12">
            <ContinueWatching navigate={navigate} progressData={progressData} onRemove={removeProgress} />
            <MovieSection title="Phim Mới Cập Nhật" slug="phim-moi-cap-nhat" type="danh-sach" navigate={navigate} progressData={progressData} />
            <MovieSection title="Anime / Hoạt Hình Hot" slug="hoat-hinh" type="the-loai" navigate={navigate} progressData={progressData} />
            <MovieSection title="Phim Bộ Mới" slug="phim-bo" type="danh-sach" navigate={navigate} progressData={progressData} />
            <MovieSection title="Phim Lẻ Mới" slug="phim-le" type="danh-sach" navigate={navigate} progressData={progressData} />
            <MovieSection title="Hành Động - Viễn Tưởng" slug="hanh-dong" type="the-loai" navigate={navigate} progressData={progressData} />
            <MovieSection title="Tình Cảm - Tâm Lý" slug="tinh-cam" type="the-loai" navigate={navigate} progressData={progressData} />
            <MovieSection title="Kinh Dị - Giật Gân" slug="kinh-di" type="the-loai" navigate={navigate} progressData={progressData} />
            <MovieSection title="Hài Hước" slug="hai-huoc" type="the-loai" navigate={navigate} progressData={progressData} />
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
          title="Phim Đã Xem "
          movies={Object.keys(progressData).filter((slug) => progressData[slug] && progressData[slug].percentage < 99).map((slug) => ({
              slug,
              name: progressData[slug].name,
              origin_name: progressData[slug].origin_name || progressData[slug].original_name || "",
              thumb_url: progressData[slug].thumb || progressData[slug].thumb_url || "",
              poster_url: progressData[slug].poster || progressData[slug].poster_url || "",
              year: progressData[slug].year
            })).reverse()}
          loading={false}
          navigate={navigate}
          hasMore={false}
          onRemove={removeProgress} // Kích hoạt xóa lịch sử
        />
      ) : view.type === "favorites" ? (
        <MovieGrid
          title="Phim Yêu Thích"
          movies={Object.keys(favorites).map((slug) => ({
            slug,
            name: favorites[slug].name,
            origin_name: favorites[slug].origin_name || favorites[slug].original_name || "",
            thumb_url: favorites[slug].thumb || favorites[slug].thumb_url || "",
            poster_url: favorites[slug].poster || favorites[slug].poster_url || favorites[slug].thumb || "",
            year: favorites[slug].year
          })).reverse()}
          loading={false}
          navigate={navigate}
          hasMore={false}
          onRemove={removeFavorite} // Kích hoạt xóa yêu thích
        />
      ) : (
        <MovieGrid title={view.type === "search" ? `Tìm kiếm: ${view.keyword}` : view.title} movies={movies} loading={loading} navigate={navigate} onLoadMore={loadNextPage} hasMore={hasMore} loadingMore={loadingMore} />
      )}

      <BottomNav navigate={navigate} setView={setView} categories={cats} countries={countries} currentView={view.type} />
    </div>
  );
}