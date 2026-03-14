import React from "react";

const FALLBACK_IMAGE = "https://placehold.co/400x600/111/333?text=No+Image";

const SmartImage = ({ src, className, alt, ...props }) => {
  return (
    <img
      src={src || FALLBACK_IMAGE}
      className={className}
      alt={alt || ""}
      onError={(e) => {
        if (e.currentTarget.src !== FALLBACK_IMAGE) {
          e.currentTarget.src = FALLBACK_IMAGE;
        }
      }}
      {...props}
    />
  );
};

export default SmartImage;