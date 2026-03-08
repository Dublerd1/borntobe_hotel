import type { Room } from '@data/rooms'
import type { Translations } from '@data/translations/en'
import type { Lang } from '@utils/i18n'
import { getPrice, getNights } from '@utils/pricing'
import { generateBookingId } from '@utils/booking'
import type { BookingStep } from '../types'

interface Props {
  room: Room
  lang: Lang
  t: Translations
  checkIn: Date | null
  checkOut: Date | null
  modalCheckInRef: React.RefObject<HTMLInputElement | null>
  modalCheckOutRef: React.RefObject<HTMLInputElement | null>
  onStepChange: (step: BookingStep) => void
  onBookingIdSet: (id: string) => void
}

export default function RoomDetails({ room, lang, t, checkIn, checkOut, modalCheckInRef, modalCheckOutRef, onStepChange, onBookingIdSet }: Props) {
  const nights = checkIn && checkOut ? getNights(checkIn, checkOut) : 1
  const price = getPrice(room, nights)
  const name = lang === 'ru' ? room.nameRu : room.name
  const floor = lang === 'ru' ? room.floorRu : room.floor
  const view = lang === 'ru' ? room.viewRu : room.view
  const kitchenText = room.kitchen ? t.rooms.kitchenYes : t.rooms.kitchenNo
  const nightsLabel = nights === 1 ? t.rooms.night : t.rooms.nights
  const fmtOpts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }
  const ciFmt = checkIn?.toLocaleDateString('en-GB', fmtOpts) ?? ''
  const coFmt = checkOut?.toLocaleDateString('en-GB', fmtOpts) ?? ''

  return (
    <>
      <div className="grid grid-cols-2 gap-3 md:gap-4 mb-6">
        {[
          [t.rooms.area, room.area],
          [t.rooms.floor, floor],
          [t.rooms.view, view],
          [t.rooms.kitchen, kitchenText],
        ].map(([label, val]) => (
          <div key={label}>
            <p className="text-[11px] font-medium uppercase mb-1" style={{ letterSpacing: '0.1em', color: '#141414' }}>{label}</p>
            <p className="font-medium text-[14px]">{val}</p>
          </div>
        ))}
      </div>

      {/* Dynamic pricing */}
      <div className="p-4 md:p-5 mb-6" style={{ background: '#EDEAE6' }}>
        <div className="flex items-baseline justify-between mb-2">
          <div><span className="text-2xl font-bold">${price.perNight}</span><span className="text-sm" style={{ color: '#5C5C5C' }}> {price.isMonthly ? t.rooms.perMonth : t.rooms.perNight}</span></div>
          <div className="text-right"><span className="text-sm" style={{ color: '#5C5C5C' }}>{t.rooms.total} </span><span className="font-bold">${price.total.toLocaleString()}</span></div>
        </div>
        <div className="text-sm" style={{ color: '#5C5C5C' }}>{ciFmt} &rarr; {coFmt} &middot; {nights} {nightsLabel}</div>
        {/* Date inputs */}
        <div className="flex gap-3 mt-3 pt-3" style={{ borderTop: '1px solid #D9D5D0' }}>
          <div className="flex-1">
            <label className="block text-[10px] font-semibold uppercase mb-1" style={{ letterSpacing: '0.1em', color: '#5C5C5C' }}>{t.booking.checkIn}</label>
            <input ref={modalCheckInRef} type="text"
              className="w-full bg-white text-[13px] px-2 py-1.5 cursor-pointer focus:outline-none"
              style={{ border: '1px solid #D9D5D0', color: '#141414' }}
              placeholder="Select" readOnly />
          </div>
          <div className="flex-1">
            <label className="block text-[10px] font-semibold uppercase mb-1" style={{ letterSpacing: '0.1em', color: '#5C5C5C' }}>{t.booking.checkOut}</label>
            <input ref={modalCheckOutRef} type="text"
              className="w-full bg-white text-[13px] px-2 py-1.5 cursor-pointer focus:outline-none"
              style={{ border: '1px solid #D9D5D0', color: '#141414' }}
              placeholder="Select" readOnly />
          </div>
        </div>
      </div>

      <div className="flex-1" />
      <button
        onClick={() => { onStepChange('form'); onBookingIdSet(generateBookingId()) }}
        className="w-full text-[13px] font-semibold uppercase py-4 cursor-pointer transition-colors duration-300 text-center"
        style={{ background: '#141414', color: '#F7F5F2', letterSpacing: '0.1em' }}
        onMouseEnter={e => { e.currentTarget.style.background = '#C8965A' }}
        onMouseLeave={e => { e.currentTarget.style.background = '#141414' }}
      >
        {t.rooms.bookNow}
      </button>
    </>
  )
}
