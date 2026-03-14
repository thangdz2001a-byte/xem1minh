import React, { useRef, useEffect } from "react";
import * as Icon from "lucide-react";
import MovieCard from "../../components/common/MovieCard";
// 🌟 1. IMPORT HÀM GỘP PHIM TỪ HELPERS
import { mergeDuplicateMovies } from "../../utils/helpers";

export default function MovieGrid({
  title,
  movies,
  loading,
  navigate,
  onLoadMore,
  hasMore,
  loadingMore,
  onRemove,
  progressData // 🌟 Bổ sung: Nhận dữ liệu tiến trình từ App.jsx
}) {
  // 🌟 2. BỌC DỮ LIỆU QUA MÀNG LỌC TRƯỚC KHI HIỂN THỊ
  // Tất cả phim truyền vào đây sẽ bị ép gộp lại nếu trùng lặp
  const displayMovies = mergeDuplicateMovies(movies || []);

  // TẠO CẢM BIẾN CUỘN VÔ HẠN (Infinite Scroll Observer)
  const observerTarget = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        // Nếu chạm đến cái target ẩn ở dưới cùng, và còn phim, và đang không tải
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          if (onLoadMore) onLoadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [hasMore, loadingMore, onLoadMore]);

  return (
    <div className="pt-20 md:pt-28 pb-10 w-full max-w-[1440px] mx-auto px-4 md:px-12 animate-in fade-in duration-500 min-h-screen">
      <div className="flex items-center gap-3 mb-6 md:mb-8">
        <div className="w-1.5 h-8 bg-[#E50914] rounded-full"></div>
        <h1 className="text-2xl md:text-3xl font-black text-white uppercase tracking-wider">
          {title}
        </h1>
      </div>

      {loading && displayMovies.length === 0 ? (
        <div className="flex justify-center items-center py-20">
          <Icon.Loader2 className="animate-spin text-[#E50914]" size={40} />
        </div>
      ) : displayMovies.length === 0 ? (
        <div className="flex flex-col justify-center items-center py-20 text-gray-500">
          <Icon.Film size={64} className="mb-4 opacity-20" />
          <p className="text-lg font-bold uppercase tracking-widest">
            Chưa có phim nào
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4 lg:gap-5">
            {/* 🌟 3. MAP QUA MẢNG ĐÃ LỌC (displayMovies) THAY VÌ MẢNG GỐC */}
            {displayMovies.map((m, idx) => (
              <MovieCard
                key={`${m.slug}-${idx}`}
                m={m}
                navigate={navigate}
                onRemove={onRemove}
                progressData={progressData} // 🌟 Bổ sung: Truyền dữ liệu tiến trình xuống MovieCard
              />
            ))}
          </div>

          {/* CỤC THEO DÕI CUỘN VÔ HẠN (ẨN ĐI VÀ TỰ ĐỘNG TRIGGER) */}
          {hasMore && (
            <div ref={observerTarget} className="mt-10 flex justify-center py-10">
              {loadingMore ? (
                <div className="flex items-center gap-3 text-[#E50914] font-bold uppercase tracking-widest text-sm">
                  <Icon.Loader2 className="animate-spin" size={24} />
                  Đang tải thêm phim...
                </div>
              ) : (
                <div className="h-10 w-full"></div> /* Khoảng trống đệm để hứng Scroll */
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}