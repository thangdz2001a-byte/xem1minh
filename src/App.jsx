import React, { useState, useEffect, useRef } from "react"
import { Search, Play, Menu, X, Loader2, ChevronRight, ChevronDown, Star, Info, Users, Globe } from "lucide-react"
import { Routes, Route } from "react-router-dom"

const API_DOMAIN = "https://ophim1.com/v1/api"
const IMAGE_DOMAIN = "https://img.ophim.live/uploads/movies"
const HLS_SCRIPT = "https://cdn.jsdelivr.net/npm/hls.js@latest"

const img = (path) => {
  if (!path) return "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?q=80&w=500"
  if (path.startsWith("http")) return path
  return `${IMAGE_DOMAIN}/${path}`
}

function Player({ src, poster }) {
  const videoRef = useRef(null)

  useEffect(() => {
    let hls
    const start = () => {
      const video = videoRef.current

      if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = src
      } else if (window.Hls) {
        hls = new window.Hls()
        hls.loadSource(src)
        hls.attachMedia(video)
      }
    }

    if (!window.Hls) {
      const script = document.createElement("script")
      script.src = HLS_SCRIPT
      script.onload = start
      document.body.appendChild(script)
    } else {
      start()
    }

    return () => {
      if (hls) hls.destroy()
    }
  }, [src])

  return (
    <div className="bg-black rounded-xl overflow-hidden">
      <video ref={videoRef} poster={poster} controls className="w-full aspect-video"/>
    </div>
  )
}

function Header({ setView, search, categories, countries }) {

  const [text,setText] = useState("")
  const [menu,setMenu] = useState(false)

  const submit = (e)=>{
    e.preventDefault()
    if(text.trim()) search(text)
  }

  return (

<header className="fixed top-0 w-full bg-[#0a0a0a] border-b border-white/10 z-50">

<div className="max-w-7xl mx-auto flex justify-between items-center p-4">

<div className="flex items-center gap-8">

<div className="text-orange-500 font-black text-xl cursor-pointer"
onClick={()=>setView({type:"home"})}>
MOVIE<span className="text-white">HAY</span>
</div>

<nav className="hidden lg:flex gap-6 text-sm text-gray-400">

<button onClick={()=>setView({type:"home"})}>
Trang Chủ
</button>

<div className="relative group">

<button className="flex items-center gap-1">
Thể loại <ChevronDown size={14}/>
</button>

<div className="absolute hidden group-hover:block bg-[#111] p-4 w-56 rounded-lg">

{categories.map(cat=>(
<button key={cat.slug}
onClick={()=>setView({type:"list",slug:cat.slug,title:cat.name,mode:"the-loai"})}
className="block w-full text-left py-1 text-xs">
{cat.name}
</button>
))}

</div>

</div>

</nav>

</div>

<form onSubmit={submit} className="hidden md:flex relative">

<input
value={text}
onChange={(e)=>setText(e.target.value)}
placeholder="Tìm phim..."
className="bg-white/5 px-4 py-2 rounded-full text-white"
/>

<Search size={16} className="absolute right-3 top-2"/>

</form>

<button className="md:hidden" onClick={()=>setMenu(!menu)}>
{menu ? <X/> : <Menu/>}
</button>

</div>

</header>

  )
}

function MovieDetail({ slug,setView }){

const [data,setData] = useState(null)
const [loading,setLoading] = useState(true)

useEffect(()=>{

const fetchDetail = async()=>{

const res = await fetch(`${API_DOMAIN}/phim/${slug}`)
const json = await res.json()

setData(json.data)
setLoading(false)

}

fetchDetail()

},[slug])

if(loading)
return <div className="h-screen flex items-center justify-center">
<Loader2 className="animate-spin text-orange-500"/>
</div>

const movie = data.item

const imdb =
movie.imdb?.rating ||
movie.tmdb?.vote_average ||
"N/A"

  return(

  <div className="pt-20 max-w-7xl mx-auto px-6">

<div className="grid lg:grid-cols-12 gap-10">

<div className="lg:col-span-3">

<img src={img(movie.thumb_url)} className="rounded-xl"/>

<button
onClick={()=>setView({type:"watch",slug:movie.slug,movieData:data})}
className="bg-blue-600 mt-4 w-full py-3 rounded-xl flex justify-center items-center gap-2">

<Play size={18}/> Xem Phim

</button>

</div>

<div className="lg:col-span-9">

<h1 className="text-3xl font-bold">{movie.name}</h1>

<p className="text-gray-400">{movie.origin_name}</p>

<div className="grid grid-cols-4 gap-4 mt-6">

<div className="bg-[#111] p-4 rounded-xl">
<p className="text-xs text-gray-400">Thể loại</p>
<p>{movie.category?.map(c=>c.name).join(", ")}</p>
</div>

<div className="bg-[#111] p-4 rounded-xl">
<p className="text-xs text-gray-400">Quốc gia</p>
<p>{movie.country?.map(c=>c.name).join(", ")}</p>
</div>

<div className="bg-[#111] p-4 rounded-xl">
<p className="text-xs text-gray-400">Năm</p>
<p>{movie.year}</p>
</div>

<div className="bg-[#111] p-4 rounded-xl">
<p className="text-xs text-gray-400 flex items-center gap-1">
<Star size={12}/> IMDb
</p>
<p>{imdb} / 10</p>
</div>

</div>

<div className="mt-10">

<h3 className="flex items-center gap-2 mb-4">
<Users size={18}/> Diễn viên
</h3>

<div className="flex gap-6 overflow-x-auto">

{movie.actor?.map((actor,i)=>{

const name = typeof actor === "string" ? actor : actor.displayName

const avatar =
typeof actor === "object" && actor.primaryImage?.url
? actor.primaryImage.url
: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}`

return(

<div key={i} className="text-center">

<img
src={avatar}
className="w-16 h-16 rounded-full object-cover mx-auto"
/>

<p className="text-xs mt-2">{name}</p>

</div>

)

})}

</div>

</div>

<div className="mt-10">

<div dangerouslySetInnerHTML={{__html:movie.content}}/>

</div>

</div>

</div>

</div>

)

}

function Watch({ slug,movieData,setView }){

const [movie,setMovie] = useState(movieData?.item || null)
const [episode,setEpisode] = useState(null)

useEffect(()=>{

if(movieData){

setEpisode(movieData.item.episodes?.[0]?.server_data?.[0])

}else{

const load = async()=>{

const res = await fetch(`${API_DOMAIN}/phim/${slug}`)
const json = await res.json()

setMovie(json.data.item)
setEpisode(json.data.item.episodes?.[0]?.server_data?.[0])

}

load()

}

},[slug])

if(!movie)
return <div className="h-screen flex justify-center items-center">
<Loader2 className="animate-spin"/>
</div>

return(

<div className="pt-24 max-w-7xl mx-auto px-6">

{episode && <Player src={episode.link_m3u8} poster={img(movie.poster_url)}/>}

<div className="mt-8">

{movie.episodes?.map(server=>(
<div key={server.server_name}>

<p className="text-xs text-gray-500 mb-2">
{server.server_name}
</p>

<div className="grid grid-cols-8 gap-2">

{server.server_data.map(ep=>(
<button
key={ep.slug}
onClick={()=>setEpisode(ep)}
className="bg-white/10 py-2 text-xs rounded">

{ep.name}

</button>
))}

</div>

</div>
))}

</div>

</div>

)

}

function MovieGrid({ movies,setView,loading,title }){

if(loading)
return <div className="py-40 flex justify-center">
<Loader2 className="animate-spin text-orange-500"/>
</div>

return(

<div>

<h2 className="text-2xl font-bold mb-6">{title}</h2>

<div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">

{movies.map(m=>(
<div
key={m.slug}
className="cursor-pointer"
onClick={()=>setView({type:"detail",slug:m.slug})}
>

<img
src={img(m.thumb_url)}
className="rounded-lg"
/>

<p className="mt-2 text-sm">{m.name}</p>

</div>
))}

</div>

</div>

)

}

export default function App(){

const [view,setView] = useState({type:"home"})
const [movies,setMovies] = useState([])
const [loading,setLoading] = useState(true)
const [categories,setCategories] = useState([])
const [countries,setCountries] = useState([])

useEffect(()=>{

fetch(`${API_DOMAIN}/the-loai`)
.then(r=>r.json())
.then(j=>setCategories(j.data.items))

fetch(`${API_DOMAIN}/quoc-gia`)
.then(r=>r.json())
.then(j=>setCountries(j.data.items))

},[])

const loadData = async(url)=>{

setLoading(true)

const res = await fetch(url)
const json = await res.json()

setMovies(json.data.items || [])

setLoading(false)

}

useEffect(()=>{

if(view.type==="home")
loadData(`${API_DOMAIN}/home`)

if(view.type==="search")
loadData(`${API_DOMAIN}/tim-kiem?keyword=${view.keyword}`)

if(view.type==="list")
loadData(`${API_DOMAIN}/${view.mode}/${view.slug}`)

},[view])

return(

<div className="bg-[#050505] min-h-screen text-white">

<Header
setView={setView}
search={(k)=>setView({type:"search",keyword:k})}
categories={categories}
countries={countries}
/>

<main className="pt-24 max-w-7xl mx-auto px-6">

{view.type==="home" &&
<MovieGrid
title="Phim mới"
movies={movies}
loading={loading}
setView={setView}
/>
}

{view.type==="search" &&
<MovieGrid
title={`Tìm: ${view.keyword}`}
movies={movies}
loading={loading}
setView={setView}
/>
}

{view.type==="list" &&
<MovieGrid
title={view.title}
movies={movies}
loading={loading}
setView={setView}
/>
}

{view.type==="detail" &&
<MovieDetail
slug={view.slug}
setView={setView}
/>
}

{view.type==="watch" &&
<Watch
slug={view.slug}
movieData={view.movieData}
setView={setView}
/>
}



</main>

</div>

)

}