import React, { useState, useEffect, useRef } from "react";
import * as Icon from "lucide-react";

export default function DropdownGrid({ label, items, navigate, mode }) {
  const [page, setPage] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const cols = mode === "search" ? 4 : 2;
  const itemsPerPage = mode === "search" ? 16 : 14; 
  const totalPages = Math.ceil((items?.length || 0) / itemsPerPage);
  const currentItems = (items || []).slice(page * itemsPerPage, (page + 1) * itemsPerPage);
  const boxWidth = mode === "search" ? "w-[400px]" : "w-[340px]"; 

  return (
    <div
      ref={dropdownRef}
      className="relative flex flex-col items-center justify-center h-full py-4 px-2 lg:px-4 cursor-pointer select-none group w-max"
      onClick={() => {
        setIsOpen(!isOpen);
        setPage(0);
      }}
    >
      <div className="flex items-center justify-center relative transition-colors">
         <span className={`font-black tracking-widest uppercase transition-colors duration-300 whitespace-nowrap ${isOpen ? 'text-[#E50914]' : 'text-gray-300 group-hover:text-[#E50914]'}`}>
           {label}
         </span>
      </div>

      <div
        className={`absolute top-full mt-1 z-50 cursor-default font-sans normal-case tracking-normal font-normal transition-all duration-300 origin-top transform-gpu left-[50%] ${boxWidth}`}
        style={{
           transform: isOpen ? 'translate(-50%, 0) scale(1)' : 'translate(-50%, 10px) scale(0.95)',
           opacity: isOpen ? 1 : 0,
           visibility: isOpen ? 'visible' : 'hidden'
        }}
        onClick={(e) => e.stopPropagation()} 
      >
        <div className="bg-[#141414]/95 backdrop-blur-2xl p-6 rounded-[24px] border border-white/10 shadow-[0_30px_60px_rgba(0,0,0,0.9)] w-full relative">

          <div className={`grid ${cols === 4 ? "grid-cols-4" : "grid-cols-2"} gap-y-3 gap-x-4 min-h-[110px] items-start relative z-20`}>
            {currentItems.map((c) => (
              <button
                key={c.slug || c}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(false); 
                  if (mode === "search") navigate({ type: "search", keyword: c.toString() });
                  else navigate({ type: "list", slug: c.slug, title: c.name, mode: mode });
                }}
                className="py-1.5 text-[14px] font-medium text-gray-400 hover:text-white hover:translate-x-1.5 transition-all text-left w-full truncate flex items-center group/btn"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#E50914] opacity-0 group-hover/btn:opacity-100 transition-opacity mr-2.5 shrink-0 shadow-[0_0_8px_#E50914]"></span>
                {c.name || c}
              </button>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-between items-center mt-5 pt-4 border-t border-white/5 relative z-20">
              <button
                onClick={(e) => { e.stopPropagation(); setPage((p) => Math.max(0, p - 1)); }}
                className={`p-2 rounded-full transition-colors ${page === 0 ? "opacity-30 cursor-not-allowed" : "hover:bg-white/10 text-white"}`}
              >
                <Icon.ChevronLeft size={16} />
              </button>
              <div className="flex gap-2">
                {Array.from({ length: totalPages }).map((_, i) => (
                  <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${i === page ? "bg-[#E50914] scale-150 w-3" : "bg-white/20"}`} />
                ))}
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); setPage((p) => Math.min(totalPages - 1, p + 1)); }}
                className={`p-2 rounded-full transition-colors ${page === totalPages - 1 ? "opacity-30 cursor-not-allowed" : "hover:bg-white/10 text-white"}`}
              >
                <Icon.ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}