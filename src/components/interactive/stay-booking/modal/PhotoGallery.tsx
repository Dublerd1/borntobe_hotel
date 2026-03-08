import { useRef, useCallback } from 'react'
import type { Room } from '@data/rooms'

interface Props {
  room: Room
  name: string
  activePhoto: number
  setActivePhoto: (i: number | ((p: number) => number)) => void
}

export default function PhotoGallery({ room, name, activePhoto, setActivePhoto }: Props) {
  const touchStartX = useRef(0)

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }, [])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        setActivePhoto(p => p === room.photos.length - 1 ? 0 : p + 1)
      } else {
        setActivePhoto(p => p === 0 ? room.photos.length - 1 : p - 1)
      }
    }
  }, [room.photos.length, setActivePhoto])

  return (
    <div className="md:w-[55%] relative">
      <div
        className="overflow-hidden relative"
        style={{ aspectRatio: '4/3' }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <img src={room.photos[activePhoto]} alt={name} className="w-full h-full object-cover" />
        {room.photos.length > 1 && (
          <>
            <button onClick={e => { e.stopPropagation(); setActivePhoto(p => p === 0 ? room.photos.length - 1 : p - 1) }}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center cursor-pointer transition-colors duration-200 hidden md:flex"
              style={{ background: 'rgba(0,0,0,0.5)', color: 'white' }}
              onMouseEnter={e => e.currentTarget.style.background = '#C8965A'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.5)'}
              aria-label="Previous photo"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
            </button>
            <button onClick={e => { e.stopPropagation(); setActivePhoto(p => p === room.photos.length - 1 ? 0 : p + 1) }}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center cursor-pointer transition-colors duration-200 hidden md:flex"
              style={{ background: 'rgba(0,0,0,0.5)', color: 'white' }}
              onMouseEnter={e => e.currentTarget.style.background = '#C8965A'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.5)'}
              aria-label="Next photo"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
            </button>
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 text-[12px] font-medium text-white" style={{ background: 'rgba(0,0,0,0.5)' }}>
              {activePhoto + 1} / {room.photos.length}
            </div>
          </>
        )}
      </div>
      {/* Thumbnails — hidden on mobile to save space */}
      <div className="hidden md:flex gap-2 p-4 overflow-x-auto">
        {room.photos.map((photo, i) => (
          <img key={i} src={photo} alt={`${name} ${i + 1}`}
            className="w-20 h-14 object-cover shrink-0 cursor-pointer transition-opacity duration-200"
            style={{ opacity: i === activePhoto ? 1 : 0.5, border: i === activePhoto ? '2px solid #C8965A' : '2px solid transparent' }}
            onClick={() => setActivePhoto(i)} />
        ))}
      </div>
      {/* Mobile: dot indicators instead of thumbnails */}
      <div className="flex md:hidden justify-center gap-1.5 py-3">
        {room.photos.map((_, i) => (
          <button key={i} onClick={() => setActivePhoto(i)}
            className="w-1.5 h-1.5 rounded-full transition-all duration-200 cursor-pointer"
            style={{ background: i === activePhoto ? '#C8965A' : '#D9D5D0', transform: i === activePhoto ? 'scale(1.3)' : 'scale(1)' }}
            aria-label={`Photo ${i + 1}`} />
        ))}
      </div>
    </div>
  )
}
