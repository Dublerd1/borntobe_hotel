import type { Room } from '@data/rooms'
import type { Translations } from '@data/translations/en'
import type { Lang } from '@utils/i18n'
import { getPrice } from '@utils/pricing'

interface Props {
  room: Room
  nights: number
  lang: Lang
  t: Translations
  index: number
  onSelect: () => void
}

export default function RoomCard({ room, nights, lang, t, index, onSelect }: Props) {
  const price = getPrice(room, nights)
  const name = lang === 'ru' ? room.nameRu : room.name
  const typeLabel = lang === 'ru' ? room.typeLabelRu : room.typeLabel
  const viewText = lang === 'ru' ? room.viewRu : room.view
  const nightsLabel = nights === 1 ? t.rooms.night : t.rooms.nights
  const features = [room.area, viewText]
  if (room.kitchen) features.push(t.rooms.kitchenYes)
  const hasSecondPhoto = room.photos.length > 1

  return (
    <div
      className="fade-up cursor-pointer flex flex-col group relative"
      style={{ background: '#FFFFFF', transitionDelay: `${index * 0.08}s`, transition: 'box-shadow 0.3s ease, transform 0.3s ease' }}
      onClick={onSelect}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.08)'
        e.currentTarget.style.transform = 'translateY(-4px)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = 'none'
        e.currentTarget.style.transform = 'none'
      }}
    >
      {/* Gold top line — appears on hover */}
      <div className="absolute top-0 left-0 right-0 h-[3px] z-10 transition-transform duration-500 origin-left scale-x-0 group-hover:scale-x-100" style={{ background: '#C8965A' }} />

      {/* Photo with hover crossfade */}
      <div className="overflow-hidden relative">
        <div className="relative w-full h-full card-photo-tall">
          <img src={room.photos[0]} alt={name} loading="lazy"
            className="absolute inset-0 w-full h-full object-cover transition-[transform,opacity] duration-700 ease-out group-hover:scale-105 group-hover:opacity-0" />
          {hasSecondPhoto && (
            <img src={room.photos[1]} alt={`${name} 2`} loading="lazy"
              className="absolute inset-0 w-full h-full object-cover transition-[transform,opacity] duration-700 ease-out scale-105 opacity-0 group-hover:scale-100 group-hover:opacity-100" />
          )}
        </div>
        {/* Photo count */}
        <div className="absolute bottom-3 right-3 flex items-center gap-1.5 px-2.5 py-1" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="0" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" /></svg>
          <span className="text-white text-[11px] font-medium">{room.photos.length}</span>
        </div>
      </div>

      <div className="p-5 md:p-6 flex-1 flex flex-col justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase mb-3 transition-colors duration-300 group-hover:text-[#C8965A]" style={{ letterSpacing: '0.12em', color: '#5C5C5C' }}>{typeLabel}</p>
          <h3 className="text-[18px] md:text-[20px] font-bold uppercase mb-2" style={{ letterSpacing: '0.04em', color: '#141414' }}>{name}</h3>
          <p className="text-[11px] md:text-[12px] uppercase mb-4" style={{ letterSpacing: '0.08em', color: '#5C5C5C' }}>{features.join(' \u00b7 ')}</p>
        </div>
        <div>
          <div className="w-full h-[1px] mb-4" style={{ background: '#D9D5D0' }} />
          <div className="flex items-baseline justify-between mb-1">
            <div className="flex items-baseline gap-1.5">
              <span className="text-[18px] font-bold" style={{ color: '#141414' }}>${price.perNight}</span>
              <span className="text-[13px] font-normal" style={{ color: '#5C5C5C' }}>{price.isMonthly ? t.rooms.perMonth : t.rooms.perNight}</span>
            </div>
            <span className="text-[12px]" style={{ color: '#5C5C5C' }}>${price.total.toLocaleString()} {t.rooms.totalLabel}</span>
          </div>
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-2 transition-colors duration-300 group-hover:text-[#C8965A]" style={{ color: '#141414' }}>
              <span className="text-[12px] font-semibold uppercase" style={{ letterSpacing: '0.1em' }}>{t.booking.viewDetails}</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="transition-transform duration-300 group-hover:translate-x-1"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
            </div>
            <div className="flex items-center gap-1">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5C5C5C" strokeWidth="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
              <span className="text-[11px]" style={{ color: '#5C5C5C' }}>{room.maxGuests}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
