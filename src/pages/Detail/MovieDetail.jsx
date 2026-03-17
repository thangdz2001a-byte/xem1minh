import React, { useState, useEffect } from "react";
import * as Icon from "lucide-react";
import { Helmet } from "react-helmet-async";
import { API, TMDB_API_KEY, safeText, safeJoin, fetchTMDB, verifyAndCleanTmdbId, getImg } from "../../utils/helpers";
import useTmdbImage from "../../utils/useTmdbImage";

// ==========================================
// COMPONENT SPLASH SCREEN
// ==========================================
const SplashScreen = ({ isFading }) => (
  <div className={`fixed inset-0 z-[9999] bg-[#050505] flex flex-col items-center justify-center transition-all duration-700 ease-out ${isFading ? "opacity-0 scale-110 pointer-events-none" : "opacity-100 scale-100"}`}>
    <div className="flex flex-col items-center">
      <h1 className="text-5xl md:text-7xl font-black text-[#E50914] tracking-[0.3em] uppercase ml-[0.3em] animate-[pulseGlow_2s_ease-in-out_infinite]">
        POLITE
      </h1>
      
      <div className="w-48 md:w-64 h-[3px] bg-white/10 mt-8 rounded-full overflow-hidden shadow-[0_0_10px_rgba(229,9,20,0.3)] relative">
        <div className="absolute top-0 bottom-0 bg-[#E50914] animate-[loadingBar_2s_ease-in-out_infinite]"></div>
      </div>
    </div>
    
    <style>{`
      @keyframes loadingBar {
        0% { left: -100%; right: 100%; }
        50% { left: 0; right: 0; }
        100% { left: 100%; right: -100%; }
      }
      
      @keyframes pulseGlow {
        0%, 100% { 
          text-shadow: 0 0 15px rgba(229,9,20,0.4); 
          transform: scale(1); 
        }
        50% { 
          text-shadow: 0 0 35px rgba(229,9,20,0.8); 
          transform: scale(1.02); 
        }
      }
    `}</style>
  </div>
);
// ==========================================

function MovieDetailContent({ slug, movieData, navigate, user, onLogin, favorites, setFavorites, syncToFirebase }) {
  const [m, setM] = useState(movieData ? { item: movieData } : null);
  const [cast, setCast] = useState([]);
  const [error, setError] = useState(false);

  const [backdropSrc, setBackdropSrc] = useState(null);
  const [trailerKey, setTrailerKey] = useState(null);
  const [showTrailerModal, setShowTrailerModal] = useState(false);
  const [isBackdropLoaded, setIsBackdropLoaded] = useState(false);

  const [ophimFetched, setOphimFetched] = useState(false);
  const [tmdbFetched, setTmdbFetched] = useState(false);
  const [imagesPreloaded, setImagesPreloaded] = useState(false);

  const [showSplash, setShowSplash] = useState(true);
  const [fadeSplash, setFadeSplash] = useState(false);

  // ==========================================
  // [TƯ DUY MỚI] ĐỌC Ổ CỨNG TRƯỚC KHI RENDER
  // ==========================================
  const getCachedPoster = () => {
    try {
      const cached = localStorage.getItem(`polite_sync_poster_${slug}`);
      if (cached && cached.includes("tmdb.org")) return cached;
    } catch(e) {}
    return null;
  };

  const initialCached = getCachedPoster();

  // Khởi tạo state với ảnh từ ổ cứng (nếu có) -> Tốc độ ánh sáng lúc F5
  const [imgSrc, setImgSrc] = useState(initialCached || "");
  const [imgStep, setImgStep] = useState(initialCached ? "tmdb" : "loading");

  const { posterSrc: tmdbPosterSrc, isLoading: isPosterLoading } = useTmdbImage(m?.item);

  const rawOphimPosterPath = m?.item?.poster_url || "";
  const ophimPosterSrc = rawOphimPosterPath ? getImg(rawOphimPosterPath) : "";

  const isValidSrc = (src) => {
    if (!src) return false;
    if (String(src).includes("placehold.co")) return false;
    if (String(src) === "null") return false;
    if (String(src) === "undefined") return false;
    if (String(src).length <= 10) return false;
    return true;
  };

  const hasValidTmdbPoster = isValidSrc(tmdbPosterSrc);
  const hasValidOphimPoster = isValidSrc(ophimPosterSrc);

  // ==========================================
  // LOGIC FIX LỖI NHÁY ẢNH NGANG LÚC F5 + KHÓA Ổ CỨNG
  // ==========================================
  useEffect(() => {
    // 1. TMDB trả về ảnh dọc đẹp -> Lấy dùng và Khóa vào ổ cứng
    if (hasValidTmdbPoster) {
      setImgSrc(tmdbPosterSrc);
      setImgStep("tmdb");
      try { localStorage.setItem(`polite_sync_poster_${slug}`, tmdbPosterSrc); } catch(e) {}
    } 
    // 2. NẾU VẪN ĐANG TÌM TMDB -> Tuyệt đối không cho OPhim chèn ảnh vào
    else if (!tmdbFetched || isPosterLoading) {
      // Án binh bất động (Nếu F5 thì nó đang hiện ảnh từ localStorage rồi)
    } 
    // 3. TMDB chịu thua -> Lấy OPhim (chỉ áp dụng nếu chưa có ảnh TMDB nào)
    else if (hasValidOphimPoster && imgStep !== "tmdb") {
      setImgSrc(ophimPosterSrc);
      setImgStep("ophimPoster");
    } 
    // 4. Chịu thua toàn tập
    else if (imgStep !== "tmdb") {
      setImgSrc("");
      setImgStep("done");
    }
  }, [tmdbPosterSrc, ophimPosterSrc, hasValidTmdbPoster, hasValidOphimPoster, isPosterLoading, tmdbFetched, slug, imgStep]);

  const handleImageError = () => {
    if (imgStep === "tmdb" && hasValidOphimPoster) {
      setImgSrc(ophimPosterSrc);
      setImgStep("ophimPoster");
      return;
    }
    setImgSrc("");
    setImgStep("done");
  };

  useEffect(() => {
    setIsBackdropLoaded(false);
    setTrailerKey(null);
    setBackdropSrc(null);
    setTmdbFetched(false);
    setImagesPreloaded(false);
    setOphimFetched(false);
    setM(movieData ? { item: movieData } : null);
    setCast([]);

    setShowSplash(true);
    setFadeSplash(false);
  }, [slug, movieData]);

  useEffect(() => {
    const fetchDetail = async () => {
      setError(false);
      try {
        const resp = await fetch(`${API}/phim/${slug}`).then(r => r.json());
        let itemOphim = resp?.data?.item;

        if (!itemOphim) {
          const searchSlug = String(slug || "").replace(/-/g, " ");
          itemOphim = await fetch(`${API}/tim-kiem?keyword=${encodeURIComponent(searchSlug)}`)
            .then(r => r.json())
            .then(j =>
              j?.data?.items?.[0]?.slug
                ? fetch(`${API}/phim/${j.data.items[0].slug}`).then(r => r.json()).then(j => j.data.item)
                : null
            )
            .catch(() => null);
        }

        if (!itemOphim) {
          setError(true);
          return;
        }

        itemOphim = verifyAndCleanTmdbId(itemOphim);

        setM(prev => {
          const oldItem = prev?.item || movieData || {};
          return {
            item: {
              ...oldItem,
              ...itemOphim,
              tmdb: movieData?.tmdb || oldItem.tmdb || itemOphim.tmdb
            }
          };
        });
      } catch (e) {
        setError(true);
      } finally {
        setOphimFetched(true);
      }
    };

    if (slug) {
      fetchDetail();
    }
  }, [slug, movieData]);

  useEffect(() => {
    let isSubscribed = true;

    const fetchTmdbEnrichment = async () => {
      try {
        let tmdbId = m?.item?.tmdb?.id || m?.item?.tmdb?.tmdb_id || m?.item?.tmdb?.id_tmdb;
        let mediaType = (m?.item?.tmdb?.type === "tv" || m?.item?.type === "series" || m?.item?.type === "phimbo") ? "tv" : "movie";

        if (!tmdbId) {
          const match = await fetchTMDB(
            m?.item?.name,
            m?.item?.origin_name || m?.item?.original_name,
            slug,
            m?.item?.year,
            m?.item?.country
          );
          if (match && match.id) {
            tmdbId = match.id;
            mediaType = match.media_type || mediaType;
          }
        }

        if (!tmdbId) {
          setTmdbFetched(true);
          return;
        }

        const baseRes = await fetch(
          `https://api.themoviedb.org/3/${mediaType}/${tmdbId}?api_key=${TMDB_API_KEY}&append_to_response=videos,images&include_image_language=vi,en,null`
        ).catch(() => null);

        let tmdbBase = null;

        if (baseRes && baseRes.ok) {
          tmdbBase = await baseRes.json();

          if (tmdbBase.images?.backdrops?.length > 0) {
            const backdrops = tmdbBase.images.backdrops;
            let candidates = backdrops.filter(b => b.iso_639_1 === null);
            if (candidates.length === 0) {
              candidates = backdrops;
            }
            candidates.sort((a, b) => b.vote_average - a.vote_average);
            setBackdropSrc(`https://image.tmdb.org/t/p/original${candidates[0].file_path}`);
          } else if (tmdbBase.backdrop_path) {
            setBackdropSrc(`https://image.tmdb.org/t/p/original${tmdbBase.backdrop_path}`);
          }

          let foundTrailer = null;
          if (tmdbBase.videos?.results) {
            const vids = tmdbBase.videos.results;
            const trailer = vids.find(v => v.site === "YouTube" && v.type === "Trailer") || vids.find(v => v.site === "YouTube");
            if (trailer) {
              foundTrailer = trailer.key;
            }
          }
          setTrailerKey(foundTrailer);
        }

        const tmdbVi = await fetch(
          `https://api.themoviedb.org/3/${mediaType}/${tmdbId}?api_key=${TMDB_API_KEY}&language=vi-VN&append_to_response=credits`
        ).then(r => r.json()).catch(() => null);

        if (tmdbVi && isSubscribed) {
          if (tmdbVi.credits?.cast) {
            setCast(tmdbVi.credits.cast.slice(0, 12));
          }

          setM(prev => {
            if (!prev || !prev.item || prev.item._tmdbMerged) {
              return prev;
            }
            const newItem = { ...prev.item, _tmdbMerged: true };
            if (tmdbVi.overview?.trim()) {
              newItem.content = tmdbVi.overview;
            }
            return { item: newItem };
          });
        }
      } catch (e) {
      } finally {
        if (isSubscribed) {
          setTmdbFetched(true);
        }
      }
    };

    if (ophimFetched && m?.item) {
      fetchTmdbEnrichment();
    }

    return () => {
      isSubscribed = false;
    };
  }, [ophimFetched, m?.item?.slug]);

  useEffect(() => {
    if (!tmdbFetched || isPosterLoading || imgStep === "loading" || imagesPreloaded) {
      return;
    }

    let pDone = false, bDone = false;

    const check = () => {
      if (pDone && bDone) {
        setImagesPreloaded(true);
      }
    };

    if (imgSrc) {
      const imgP = new Image();
      imgP.src = imgSrc;
      imgP.onload = () => { pDone = true; check(); };
      imgP.onerror = () => { pDone = true; check(); };
    } else {
      pDone = true;
    }

    if (backdropSrc) {
      const imgB = new Image();
      imgB.src = backdropSrc;
      imgB.onload = () => { bDone = true; check(); };
      imgB.onerror = () => { bDone = true; check(); };
    } else {
      bDone = true;
    }
  }, [tmdbFetched, isPosterLoading, imgSrc, backdropSrc, imgStep, imagesPreloaded]);

  useEffect(() => {
    if (imagesPreloaded && tmdbFetched && ophimFetched) {
      const timer = setTimeout(() => {
        setFadeSplash(true);
        setTimeout(() => {
          setShowSplash(false);
          setIsBackdropLoaded(true);
        }, 700);
      }, 400); 
      return () => clearTimeout(timer);
    }
  }, [imagesPreloaded, tmdbFetched, ophimFetched]);

  useEffect(() => {
    const fallback = setTimeout(() => {
      if (showSplash) {
        setFadeSplash(true);
        setTimeout(() => {
          setShowSplash(false);
          setIsBackdropLoaded(true);
        }, 700);
      }
    }, 8000);
    return () => clearTimeout(fallback);
  }, [showSplash]);

  const toggleFavorite = () => {
    if (!user) {
      onLogin();
      return;
    }
    if (!m?.item) return;

    const movieToSave = {
      name: m.item.name,
      origin_name: m.item.origin_name || m.item.original_name,
      thumb_url: imgSrc || m.item.thumb_url || m.item.poster_url,
      poster_url: imgSrc || m.item.poster_url || m.item.thumb_url,
      year: m.item.year,
      timestamp: Date.now()
    };

    setFavorites((prev) => {
      const updated = { ...prev };
      if (updated[slug]) {
        delete updated[slug];
      } else {
        updated[slug] = movieToSave;
      }
      syncToFirebase(updated, "favorites");
      return updated;
    });
  };

  if (error || (!m?.item && !showSplash)) {
    return (
      <div className="h-screen flex flex-col justify-center items-center bg-[#050505] w-full px-4 text-center text-white">
        <Icon.AlertTriangle className="text-[#E50914] mb-4" size={48} />
        <h2 className="text-xl font-bold">Lỗi tải phim!</h2>
        <button onClick={() => navigate({ type: "home" })} className="mt-6 bg-[#E50914] px-6 py-2.5 rounded-full font-bold uppercase text-xs">Về Trang Chủ</button>
      </div>
    );
  }

  const i = m?.item || {};
  const renderImg = imgSrc || "https://placehold.co/400x600/111/333?text=Chưa+Có+Ảnh";
  const isFavorited = !!favorites[slug];

  const isTrailerOnly = i.status === "trailer" || String(i.episode_current).toLowerCase().includes("trailer");

  const plainTextContent = i?.content
    ? i.content.replace(/<[^>]+>/g, '').substring(0, 160) + '...'
    : "Xem phim trực tuyến chất lượng cao tại POLITE";

  return (
    <>
      <Helmet>
        <title>{i.name ? `Xem phim ${i.name} ${i.year ? `(${i.year})` : ''} Vietsub HD | POLITE` : 'Đang tải phim... | POLITE'}</title>
        <meta name="description" content={plainTextContent} />
        <meta property="og:title" content={i.name ? `Xem phim ${i.name} Vietsub HD | POLITE` : 'Xem phim trực tuyến tại POLITE'} />
        <meta property="og:description" content={plainTextContent} />
        <meta property="og:image" content={backdropSrc || renderImg} />
        <meta property="og:type" content="video.movie" />
      </Helmet>

      {showSplash && <SplashScreen isFading={fadeSplash} />}

      <div className={`pb-20 bg-[#050505] relative w-full overflow-x-hidden transition-opacity duration-1000 ${showSplash ? "opacity-0 h-screen overflow-hidden" : "opacity-100"}`}>
        {showTrailerModal && trailerKey && (
          <div className="fixed inset-0 z-[9999] bg-black/95 flex justify-center items-center p-4">
            <div className="w-full max-w-6xl aspect-video relative">
              <button onClick={() => setShowTrailerModal(false)} className="absolute -top-12 right-0 text-white hover:text-[#E50914] transition-colors">
                <Icon.X size={32} />
              </button>
              <iframe className="w-full h-full" src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1`} allowFullScreen></iframe>
            </div>
          </div>
        )}

        <div className="relative min-h-[70vh] md:min-h-[80vh] w-full flex flex-col items-center pt-24 md:pt-32 bg-[#050505]">
          <img
            src={renderImg}
            onError={handleImageError}
            className={`absolute top-0 left-0 w-full h-[55vh] md:h-[80vh] object-cover blur-[50px] transition-opacity duration-1000 ${isBackdropLoaded ? "opacity-0" : "opacity-50"}`}
            alt="Blur background"
          />

          {backdropSrc && (
            <img
              src={backdropSrc}
              className={`absolute top-0 left-0 w-full h-[55vh] md:h-[80vh] object-cover md:object-top transition-opacity duration-1000 ${isBackdropLoaded ? "opacity-70 md:opacity-80" : "opacity-0"}`}
              alt="Backdrop"
            />
          )}

          <div className="absolute top-0 left-0 w-full h-[55vh] md:h-[80vh] z-10 bg-gradient-to-b from-transparent via-[#050505]/70 to-[#050505]"></div>

          <div className="relative z-20 w-full max-w-[1440px] px-4 md:px-12 pb-8 md:pb-12 flex flex-col md:flex-row gap-6 md:gap-10 items-center md:items-end mt-[15vh] md:mt-[30vh]">
            <div className="relative aspect-[2/3] w-[150px] sm:w-[180px] md:w-[224px] shadow-2xl rounded-xl overflow-hidden border border-white/10 bg-black shrink-0">
              <img
                src={renderImg}
                onError={handleImageError}
                className="w-full h-full object-cover"
                alt={i.name}
              />
            </div>

            <div className="flex-1 text-center md:text-left w-full flex flex-col items-center md:items-start mt-2 md:mt-0">
              <h1 className="text-3xl sm:text-4xl md:text-6xl font-black text-white mb-3 md:mb-4 uppercase leading-tight line-clamp-3">
                {i.name}
              </h1>

              <div className="flex flex-wrap justify-center md:justify-start gap-2 md:gap-4 mb-6 md:mb-8 text-gray-300 font-bold uppercase text-[10px] md:text-xs items-center">
                <span className="text-[#E50914]">{i.year}</span><span className="hidden md:inline">|</span>
                <span className="bg-[#E50914] px-2 py-0.5 rounded text-white">{i.quality}</span><span className="hidden md:inline">|</span>
                <span>{i.episode_current}</span>
              </div>

              <div className="flex flex-col md:flex-row gap-3 md:gap-4 w-full md:w-auto">
                {!isTrailerOnly && (
                  <>
                    <button
                      onClick={() => navigate({ type: "watch", slug: i.slug, movieData: m })}
                      className="w-full md:w-auto justify-center bg-[#E50914] text-white px-8 md:px-10 py-3 md:py-4 rounded-full font-black flex items-center gap-2 transition-transform hover:scale-105 shadow-[0_4px_15px_rgba(229,9,20,0.4)] uppercase text-xs md:text-sm"
                    >
                      <Icon.Play fill="currentColor" size={18} /> XEM NGAY
                    </button>

                    <button
                      onClick={toggleFavorite}
                      className={`w-full md:w-auto justify-center border text-white px-6 md:px-8 py-3 md:py-4 rounded-full font-black flex items-center gap-2 transition-all hover:scale-105 backdrop-blur-md uppercase text-xs md:text-sm
                        ${isFavorited ? "bg-[#E50914]/20 border-[#E50914]" : "bg-white/5 border-white/20 hover:bg-white/20"}
                      `}
                    >
                      <Icon.Heart size={18} fill={isFavorited ? "#E50914" : "none"} className={isFavorited ? "text-[#E50914]" : "text-white"} />
                      <span>{isFavorited ? "Đã Thích" : "Yêu Thích"}</span>
                    </button>
                  </>
                )}

                {trailerKey && (
                  <button
                    onClick={() => setShowTrailerModal(true)}
                    className="w-full md:w-auto justify-center bg-white/5 border border-white/20 text-white px-6 md:px-8 py-3 md:py-4 rounded-full font-black flex items-center gap-2 transition-transform hover:scale-105 backdrop-blur-md uppercase text-xs md:text-sm"
                  >
                    <Icon.Youtube size={18} /> TRAILER
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-[1400px] mx-auto px-4 md:px-12 mt-4 md:mt-8 grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8 z-20 relative">
          <div className="md:col-span-8 bg-[#111]/50 p-5 md:p-10 rounded-2xl md:rounded-3xl border border-white/5 backdrop-blur-md">
            <h3 className="text-lg md:text-xl font-black text-white uppercase mb-4 md:mb-6 flex items-center gap-3">
              <span className="w-1.5 h-6 md:h-7 bg-[#E50914] block" /> Nội dung phim
            </h3>
            <div className="text-gray-400 leading-relaxed text-[13px] md:text-lg text-justify md:text-left" dangerouslySetInnerHTML={{ __html: i.content }} />

            {cast.length > 0 && (
              <div className="mt-8 md:mt-10 pt-6 md:pt-8 border-t border-white/5">
                <h4 className="text-[11px] md:text-xs font-black text-[#E50914] uppercase mb-4 md:mb-6 tracking-widest">Diễn viên</h4>
                <div className="flex gap-4 md:gap-6 overflow-x-auto pb-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  {cast.map((actor, idx) => (
                    <div key={idx} className="shrink-0 text-center w-[70px] md:w-[80px]">
                      <img
                        src={actor.profile_path ? `https://image.tmdb.org/t/p/w200${actor.profile_path}` : `https://ui-avatars.com/api/?name=${actor.name}`}
                        className="w-14 h-14 md:w-20 md:h-20 rounded-full object-cover mb-2 border border-white/10"
                        alt={actor.name}
                      />
                      <p className="text-[9px] md:text-[10px] text-gray-400 font-bold line-clamp-2 uppercase">{actor.name}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="md:col-span-4 bg-[#111]/50 p-5 md:p-10 rounded-2xl md:rounded-3xl border border-white/5 backdrop-blur-md space-y-6 md:space-y-8">
            {[{ l: "Quốc gia", v: safeJoin(i?.country) }, { l: "Thể loại", v: safeJoin(i?.category) }, { l: "Đạo diễn", v: safeJoin(i?.director) }].map((x, idx) => {
              if (x.v) {
                return (
                  <div key={idx} className="border-b border-white/5 pb-4 md:pb-6 last:border-0">
                    <p className="text-[9px] md:text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1.5 md:mb-2">{x.l}</p>
                    <p className="text-xs md:text-sm font-bold text-gray-300 uppercase leading-relaxed">{x.v}</p>
                  </div>
                );
              }
              return null;
            })}
          </div>
        </div>
      </div>
    </>
  );
}

// ĐÂY LÀ "TRÒ BẨN" CỨU TINH CỦA MÀY ĐÂY. BỌC LẠI BẰNG KEY ĐỂ NÓ RESET 100% MỖI LẦN CHUYỂN PHIM
export default function MovieDetail(props) {
  return <MovieDetailContent key={props.slug} {...props} />;
}