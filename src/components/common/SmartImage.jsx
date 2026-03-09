import React from "react";
import { getImg, safeText } from "../../utils/helpers";

export default function SmartImage({ src, alt, className }) {
  const finalSrc = src ? getImg(src) : "";

  return (
    <img
      src={finalSrc || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1' height='1'%3E%3Crect width='100%25' height='100%25' fill='%23111'/%3E%3C/svg%3E"}
      alt={safeText(alt, "Movie Poster")}
      className={`${className} bg-[#111]`}
      onError={(e) => {
        if (!e.target.dataset.error) {
          e.target.dataset.error = true;
          e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1' height='1'%3E%3Crect width='100%25' height='100%25' fill='%23111'/%3E%3C/svg%3E";
        }
      }}
    />
  );
}
