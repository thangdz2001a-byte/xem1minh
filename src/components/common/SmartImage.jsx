import React, { useState } from "react";
import { getImg, safeText } from "../../utils/helpers";

export default function SmartImage({
  src,
  alt,
  className = "",
  loading = "lazy",
  decoding = "async",
  fetchPriority = "auto"
}) {
  const [loaded, setLoaded] = useState(false);
  const finalSrc = src ? getImg(src) : "";

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <div
        className={`absolute inset-0 bg-[#111] transition-opacity duration-300 ${
          loaded ? "opacity-0" : "opacity-100"
        }`}
      />
      <img
        src={
          finalSrc ||
          "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1' height='1'%3E%3Crect width='100%25' height='100%25' fill='%23111'/%3E%3C/svg%3E"
        }
        alt={safeText(alt, "Movie Poster")}
        className="w-full h-full object-cover block bg-[#111]"
        loading={loading}
        decoding={decoding}
        fetchPriority={fetchPriority}
        onLoad={() => setLoaded(true)}
        onError={(e) => {
          if (!e.target.dataset.error) {
            e.target.dataset.error = true;
            e.target.src =
              "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1' height='1'%3E%3Crect width='100%25' height='100%25' fill='%23111'/%3E%3C/svg%3E";
          }
          setLoaded(true);
        }}
      />
    </div>
  );
}