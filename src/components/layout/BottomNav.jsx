import React, { useState } from "react";
import * as Icon from "lucide-react";
import { YEARS } from "../../utils/helpers";

export default function BottomNav({ navigate, categories, countries, currentView }) {
  const [menuType, setMenuType] = useState(null); 
  
  let menuTitle = "";
  let menuData = [];
  if (menuType === 'cat') { menuTitle = "Chọn Thể Loại"; menuData = categories; }
  if (menuType === 'country') { menuTitle = "Chọn Quốc Gia"; menuData = countries; }

  return (
    <>
      <div className={`md:hidden fixed inset-0 bg-black/90 z-[110] backdrop-blur-sm transition-opacity duration-300 transform-gpu ${menuType ? "opacity-100" : "opacity-0 pointer-events-none"}`} onClick={() => setMenuType(null)}>
        <div className={`absolute bottom-0 w-full bg-[#111] rounded-t-3xl p-6 transition-transform duration-500 delay-100 transform-gpu ${menuType ? "translate-y-0" : "translate-y-full"}`} onClick={(e) => e.stopPropagation()}>
          <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-6" />
          <h3 className="text-lg font-black text-white mb-6 uppercase tracking-widest text-center">{menuTitle || "Chọn Năm"}</h3>
          <div className="grid grid-cols-2 gap-3 overflow-y-auto max-h-[50vh] pb-8 overscroll-contain">
            {menuType === 'year' ? (
               YEARS.map((y) => (
                 <button key={y} onClick={() => { navigate({ type: "search", keyword: y.toString() }); setMenuType(null); }} className="bg-white/5 py-3 rounded-xl text-xs text-gray-300 font-bold active:bg-[#E50914] transition uppercase tracking-tight">{y}</button>
               ))
            ) : (
               menuData && menuData.map((c) => (
                 <button key={c.slug} onClick={() => { navigate({ type: "list", slug: c.slug, title: c.name, mode: menuType === 'cat' ? "the-loai" : "quoc-gia" }); setMenuType(null); }} className="bg-white/5 py-3 rounded-xl text-xs text-gray-300 font-bold active:bg-[#E50914] transition uppercase tracking-tight">{c.name}</button>
               ))
            )}
          </div>
        </div>
      </div>
      <div className="md:hidden fixed bottom-0 w-full bg-[#0a0a0a]/95 backdrop-blur-xl border-t border-white/5 pb-safe z-[100] transform-gpu">
        <div className="flex justify-around items-center p-2.5">
          {[{ id: "home", icon: Icon.Home, label: "Trang chủ" }, { id: "cat", icon: Icon.LayoutGrid, label: "Thể loại" }, { id: "country", icon: Icon.Globe, label: "Quốc gia" }, { id: "watch-party-lobby", icon: Icon.Users, label: "Xem Chung" }].map((item) => (
            <button key={item.id} onClick={() => item.id === "home" ? navigate({ type: "home" }) : item.id === "watch-party-lobby" ? navigate({ type: "watch-party-lobby" }) : setMenuType(item.id)} className={`flex flex-col items-center gap-1 transition-colors ${currentView === item.id || (item.id === "home" && currentView === "home") ? "text-[#E50914]" : "text-gray-500"}`}>
              <item.icon size={20} strokeWidth={currentView === item.id ? 2.5 : 2} />
              <span className="text-[9px] font-black uppercase tracking-widest">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}