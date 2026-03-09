import React, { useState, useEffect } from "react";
import * as Icon from "lucide-react";
import { API, API_NGUONC, API_NGUONC_DETAIL, API_TMDB, TMDB_API_KEY, getImg, safeText, safeJoin } from "../../utils/helpers";
import SmartImage from "../../components/common/SmartImage";

export default function MovieDetail({ slug, movieData, navigate, user, onLogin, favorites, setFavorites, syncToFirebase }) {
  const [m, setM] = useState(() => movieData ? { item: movieData.item || movieData } : null);
  const [cast, setCast] = useState([]); 
  const [loadingPage, setLoadingPage] = useState(!movieData);
  const [error, setError] = useState(false);

  useEffect(() => {
    let isSubscribed = true;
    const fetchFastActors = async () => {
       const q = String(m?.item?.origin_name || m?.item?.original_name || m?.item?.name || String(slug || "").replace(/-/g, ' '));
       if (!q) return;
       try {
           const searchRes = await fetch(`${API_TMDB}/search/multi?query=${encodeURIComponent(q)}`).then(r=>r.json());
           const match = searchRes?.results?.find(i => i.media_type !== 'person' && (i.poster_path || i.backdrop_path));
           if (match && isSubscribed) {
               const castRes = await fetch(`${API_TMDB}/${match.media_type || 'movie'}/${match.id}/credits?api_key=${TMDB_API_KEY}&language=vi-VN`).then(r=>r.json());
               if (castRes?.cast && isSubscribed) setCast(castRes.cast.slice(0, 12));
           }
       } catch (e) {}
    };
    if (m?.item) fetchFastActors();
    return () => { isSubscribed = false; }
  }, [m?.item?.name, m?.item?.origin_name, slug]);

  useEffect(() => {
    const fetchDetail = async () => {
      if (!m?.item?.content) setLoadingPage(true);
      setError(false);
      try {
        const pOphim = fetch(`${API}/phim/${slug}`).then(r => r.json()).then(j => { if (j?.data?.item) return j.data.item; throw new Error(); });
        const pNguonc = fetch(`${API_NGUONC_DETAIL}/${slug}`).then(r => r.json()).then(j => { if (j?.movie || j?.item) return j.movie || j.item; throw new Error(); });
        
        let item;
        try {
             item = await Promise.any([pOphim, pNguonc]);
        } catch(e) {
             const searchSlug = String(slug || "").replace(/-/g, ' ');
             const searchOphim = fetch(`${API}/tim-kiem?keyword=${encodeURIComponent(searchSlug)}`)
                .then(r=>r.json())
                .then(j => j?.data?.items?.[0]?.slug ? fetch(`${API}/phim/${j.data.items[0].slug}`).then(r=>r.json()).then(j=>j.data.item) : Promise.reject());
             const searchNguonc = fetch(`${API_NGUONC}/search?keyword=${encodeURIComponent(searchSlug)}`)
                .then(r=>r.json())
                .then(j => { 
                    const list = j?.items || j?.data?.items || [];
                    const s = list[0]?.slug; 
                    return s ? fetch(`${API_NGUONC_DETAIL}/${s}`).then(r=>r.json()).then(j=>j.movie||j.item) : Promise.reject()
                });
             item = await Promise.any([searchOphim, searchNguonc]);
        }
        
        if (!item) {
            setError(true);
            setLoadingPage(false);
            return;
        }

        setM({ item });
        setLoadingPage(false);

      } catch (e) {
        setError(true);
        setLoadingPage(false);
      }
    };
    if (slug) fetchDetail();
  }, [slug]);

  useEffect(() => {
      if (m?.item?.name) {
          document.title = `${m.item.name} - POLITE`;
      }
  }, [m]);

  const isFavorite = favorites && favorites[slug];

  const toggleFavorite = () => {
    if (!user) {
      alert("Vui lòng đăng nhập để lưu phim yêu thích!");
      return;
    }
    const newFavorites = { ...favorites };
    if (isFavorite) {
      delete newFavorites[slug];
    } else {
      newFavorites[slug] = {
        name: m.item.name,
        origin_name: m.item.origin_name || m.item.original_name,
        thumb: m.item.thumb_url || m.item.poster_url,
        year: m.item.year
      };
    }
    setFavorites(newFavorites);
    syncToFirebase(newFavorites, "favorites");
  };

  if (loadingPage) return <div className="h-screen flex justify-center items-center bg-[#050505]"><Icon.Loader2 className="animate-spin text-[#E50914]" size={40} /></div>;
  
  if (error || !m || !m.item) return (
     <div className="h-screen flex flex-col justify-center items-center bg-[#050505] text-white">
        <Icon.AlertTriangle className="text-[#E50914] mb-4" size={48}/>
        <h2 className="text-xl font-bold">Lỗi tải phim!</h2>
        <p className="text-gray-400 mt-2">Dữ liệu phim có thể đã bị xóa hoặc máy chủ đang quá tải.</p>
        <button onClick={() => navigate({type: 'home'})} className="mt-6 bg-[#E50914] hover:bg-red-700 transition-colors px-6 py-2.5 rounded-full font-bold uppercase text-xs tracking-widest">
           Về Trang Chủ
        </button>
     </div>
  );

  const i = m.item;
  const backdropUrl = getImg(i.poster_url || i.thumb_url);

  return (
    <div className="pb-20 animate-in fade-in duration-700 bg-[#050505] relative">
      <div className="relative min-h-[70vh] md:h-[95vh] max-h-[900px] w-full overflow-hidden flex flex-col justify-end transform-gpu">
        <img src={backdropUrl} className="absolute inset-0 w-full h-full object-cover object-top opacity-40 blur-xl scale-125 transform-gpu" alt="" />
        
        <div 
          className="absolute inset-0 pointer-events-none z-10"
          style={{
            background: `
              linear-gradient(to top, #050505 0%, #050505 5%, rgba(5,5,5,0.8) 25%, transparent 70%),
              linear-gradient(to right, #050505 0%, rgba(5,5,5,0.8) 15%, transparent 40%),
              linear-gradient(to left, #050505 0%, rgba(5,5,5,0.8) 15%, transparent 40%)
            `
          }}
        />
        
        <div className="relative max-w-[1440px] mx-auto w-full px-4 md:px-12 pb-16 flex flex-col md:flex-row gap-10 items-center md:items-end text-center md:text-left z-20">
          <div className="w-44 md:w-72 shrink-0 shadow-[0_20px_50px_rgba(0,0,0,0.8)] rounded-2xl overflow-hidden border border-white/10 transform-gpu">
            <SmartImage src={i.thumb_url || i.poster_url} className="w-full h-full object-cover" />
          </div>
          <div className="flex-1">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-white mb-4 uppercase tracking-tighter leading-none !font-sans">{safeText(i.name)}</h1>
            <div className="flex flex-wrap justify-center md:justify-start items-center gap-2 md:gap-4 mb-6 md:mb-10 text-gray-300 text-[10px] md:text-base font-black tracking-widest uppercase !font-sans">
              <span className="text-[#E50914]">{safeText(i.year)}</span><span>|</span>
              <span className="bg-[#E50914] px-2 py-0.5 rounded text-white text-[9px] md:text-xs font-black">{safeText(i.quality, "HD")}</span><span>|</span>
              <span className="border-2 border-gray-600 px-2 py-0.5 rounded text-xs">{safeText(i.episode_current)}</span>
              {i.time && (
                <>
                   <span>|</span>
                   <span className="text-gray-400 text-xs flex items-center gap-1"><Icon.Clock size={14} /> {safeText(i.time)}</span>
                </>
              )}
            </div>
            
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 md:gap-4 mx-auto md:mx-0">
              <button 
                onClick={() => { navigate({ type: "watch", slug: i.slug, movieData: m }); window.scrollTo(0, 0); }} 
                className="bg-[#E50914] hover:bg-red-700 text-white px-8 py-3.5 md:px-10 md:py-4 rounded-full font-black flex items-center gap-2 transition-transform transform-gpu hover:scale-105 shadow-[0_10px_30px_rgba(229,9,20,0.5)] uppercase tracking-widest text-xs md:text-sm !font-sans"
              >
                <Icon.Play fill="currentColor" size={20} /> BẮT ĐẦU XEM
              </button>

              <button 
                onClick={toggleFavorite}
                className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center transition-all backdrop-blur-md hover:scale-105 shrink-0"
                title={isFavorite ? "Bỏ yêu thích" : "Thêm vào yêu thích"}
              >
                <Icon.Heart size={20} fill={isFavorite ? "#E50914" : "transparent"} color={isFavorite ? "#E50914" : "white"} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 md:px-12 mt-8 md:mt-16 grid md:grid-cols-12 gap-8 items-start relative z-20">
        <div className="md:col-span-8 bg-[#111]/50 p-6 md:p-10 rounded-3xl border border-white/5 backdrop-blur-md shadow-2xl">
            <h3 className="text-xl font-black text-white uppercase mb-6 flex items-center gap-3">
              <span className="w-1.5 h-7 bg-[#E50914] block" /> Nội dung phim
            </h3>
            
            <div className="text-gray-400 leading-relaxed text-base md:text-lg font-medium">
              {i.content ? (
                 <div dangerouslySetInnerHTML={{ __html: typeof i.content === 'string' ? i.content : safeText(i.content) }} />
              ) : (
                <div className="animate-pulse flex flex-col gap-3">
                    <div className="h-4 bg-white/10 rounded w-full"></div>
                    <div className="h-4 bg-white/10 rounded w-5/6"></div>
                    <div className="h-4 bg-white/10 rounded w-4/6"></div>
                </div>
              )}
            </div>
            
            {cast && cast.length > 0 && (
              <div className="mt-10 pt-8 border-t border-white/5 animate-in fade-in duration-500">
                 <h4 className="text-sm font-black text-white uppercase mb-6 tracking-[0.2em] text-[#E50914]">Diễn viên (TMDB)</h4>
                 <div className="flex gap-4 md:gap-6 overflow-x-auto scroll-smooth no-scrollbar pb-4 overscroll-x-contain">
                   {cast.map((actor, idx) => (
                     <div 
                       key={idx} 
                       className="shrink-0 text-center w-[72px] md:w-[88px]"
                     >
                       <div className="w-16 h-16 md:w-[80px] md:h-[80px] mx-auto rounded-full overflow-hidden bg-[#222] mb-3 md:mb-4 border border-white/10 transition-colors transform-gpu shadow-lg flex items-center justify-center">
                          <img 
                             src={actor.profile_path ? `https://image.tmdb.org/t/p/w200${actor.profile_path}` : 'https://ui-avatars.com/api/?name=' + encodeURIComponent(String(actor.name || "").trim()) + '&background=111&color=fff'} 
                             alt={safeText(actor.name)} 
                             className="w-full h-full object-cover" 
                          />
                       </div>
                       <p className="text-[10px] md:text-[11px] text-gray-400 font-bold leading-snug line-clamp-2 uppercase tracking-tight transition-colors">{safeText(actor.name)}</p>
                     </div>
                   ))}
                 </div>
              </div>
            )}
        </div>

        <div className="md:col-span-4 bg-[#111]/50 p-6 md:p-10 rounded-3xl border border-white/5 backdrop-blur-md shadow-2xl space-y-8">
            {[{ l: "Quốc gia", v: safeJoin(i?.country) }, { l: "Thể loại", v: safeJoin(i?.category) }, { l: "Đạo diễn", v: safeJoin(i?.director) }, { l: "Diễn viên (Chữ)", v: safeJoin(i?.actor) }].map((x, idx) => {
              if (!x.v || x.v === 'Đang cập nhật' || x.v === '') return null;
              return (
               <div key={idx} className="space-y-2 md:space-y-3 border-b border-white/5 pb-4 md:pb-6 last:border-0 last:pb-0">
                 <p className="text-[10px] md:text-xs text-gray-500 font-black uppercase tracking-[0.3em]">{x.l}</p>
                 <p className="text-xs md:text-base font-bold text-gray-300 leading-snug uppercase tracking-tight">{safeText(x.v)}</p>
               </div>
              )
           })}
        </div>
      </div>
    </div>
  );
}