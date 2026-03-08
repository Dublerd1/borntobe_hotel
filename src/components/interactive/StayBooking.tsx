import { useState, useCallback, useRef, useEffect } from 'react'
import type { Room } from '@data/rooms'
import type { Lang } from '@utils/i18n'
import { en } from '@data/translations/en'
import { ru } from '@data/translations/ru'
import { getPrice, getNights } from '@utils/pricing'
import { getBookingMessage, bookVia } from '@utils/booking'

interface Props {
  lang: Lang
  rooms: Room[]
}

interface SearchParams {
  checkIn: Date
  checkOut: Date
  guests: number
  children: number
  propertyType: string
}

const translations = { en, ru }

export default function StayBooking({ lang, rooms }: Props) {
  const t = translations[lang]
  const [searchParams, setSearchParams] = useState<SearchParams | null>(null)
  const [modalRoom, setModalRoom] = useState<Room | null>(null)
  const [modalNights, setModalNights] = useState(0)
  const [isSticky, setIsSticky] = useState(false)
  const [activePhoto, setActivePhoto] = useState(0)
  const resultsRef = useRef<HTMLDivElement>(null)

  // Flatpickr refs
  const checkInRef = useRef<HTMLInputElement>(null)
  const checkOutRef = useRef<HTMLInputElement>(null)
  const checkInMobileRef = useRef<HTMLInputElement>(null)
  const checkOutMobileRef = useRef<HTMLInputElement>(null)

  // Form state
  const [guests, setGuests] = useState(2)
  const [children, setChildren] = useState(0)
  const [propertyType, setPropertyType] = useState('any')

  // Init Flatpickr
  useEffect(() => {
    const loadFlatpickr = async () => {
      const flatpickr = (await import('flatpickr')).default
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const weekLater = new Date()
      weekLater.setDate(weekLater.getDate() + 8)

      const createOpts = (isCheckOut: boolean) => ({
        dateFormat: 'd M Y',
        minDate: isCheckOut ? weekLater : tomorrow,
        defaultDate: isCheckOut ? weekLater : tomorrow,
        monthSelectorType: 'static' as const,
        disableMobile: true,
        onChange(selectedDates: Date[]) {
          if (!isCheckOut && selectedDates[0]) {
            const minCO = new Date(selectedDates[0])
            minCO.setDate(minCO.getDate() + 1)
            ;[checkOutRef, checkOutMobileRef].forEach(ref => {
              const fp = ref.current?._flatpickr
              if (fp) {
                fp.set('minDate', minCO)
                if (fp.selectedDates[0] && fp.selectedDates[0] <= selectedDates[0]) fp.setDate(minCO)
              }
            })
            ;[checkInRef, checkInMobileRef].forEach(ref => {
              const fp = ref.current?._flatpickr
              if (fp && ref.current !== document.activeElement) fp.setDate(selectedDates[0], false)
            })
          }
          if (isCheckOut && selectedDates[0]) {
            ;[checkOutRef, checkOutMobileRef].forEach(ref => {
              const fp = ref.current?._flatpickr
              if (fp && ref.current !== document.activeElement) fp.setDate(selectedDates[0], false)
            })
          }
        },
      })

      if (checkInRef.current) flatpickr(checkInRef.current, createOpts(false))
      if (checkOutRef.current) flatpickr(checkOutRef.current, createOpts(true))
      if (checkInMobileRef.current) flatpickr(checkInMobileRef.current, createOpts(false))
      if (checkOutMobileRef.current) flatpickr(checkOutMobileRef.current, createOpts(true))
    }
    loadFlatpickr()
  }, [])

  // Sticky scroll
  useEffect(() => {
    const handleScroll = () => {
      if (!searchParams) { setIsSticky(false); return }
      setIsSticky(window.scrollY > window.innerHeight - 200)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [searchParams])

  // Search
  const handleSearch = useCallback(() => {
    const ci = checkInRef.current?._flatpickr?.selectedDates[0] ?? checkInMobileRef.current?._flatpickr?.selectedDates[0]
    const co = checkOutRef.current?._flatpickr?.selectedDates[0] ?? checkOutMobileRef.current?._flatpickr?.selectedDates[0]
    if (!ci || !co) return
    setSearchParams({ checkIn: ci, checkOut: co, guests, children, propertyType })
  }, [guests, children, propertyType])

  // Scroll to results
  useEffect(() => {
    if (searchParams && resultsRef.current) {
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        setTimeout(() => {
          document.querySelectorAll('.fade-up').forEach(el => el.classList.add('visible'))
        }, 300)
      }, 100)
    }
  }, [searchParams])

  // Filtered rooms
  const nights = searchParams ? getNights(searchParams.checkIn, searchParams.checkOut) : 0
  const nightsLabel = nights === 1 ? t.rooms.night : t.rooms.nights
  let filtered: Room[] = []
  let dateRange = ''
  if (searchParams) {
    filtered = rooms.filter(r => r.maxGuests >= searchParams.guests)
    if (searchParams.propertyType !== 'any') filtered = filtered.filter(r => r.type === searchParams.propertyType)
    filtered.sort((a, b) => getPrice(a, nights).perNight - getPrice(b, nights).perNight)
    const fmtOpts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }
    dateRange = `${searchParams.checkIn.toLocaleDateString('en-GB', fmtOpts)}\u2013${searchParams.checkOut.toLocaleDateString('en-GB', fmtOpts)}`
  }

  // Book via messenger
  const handleBook = (platform: 'telegram' | 'whatsapp' | 'instagram') => {
    if (!modalRoom || !searchParams) return
    const name = lang === 'ru' ? modalRoom.nameRu : modalRoom.name
    const fmtOpts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }
    const msg = getBookingMessage({
      roomName: name,
      checkIn: searchParams.checkIn.toLocaleDateString('en-GB', fmtOpts),
      checkOut: searchParams.checkOut.toLocaleDateString('en-GB', fmtOpts),
      guests: searchParams.guests,
      children: searchParams.children,
      messageTemplate: t.rooms.bookMsg,
    })
    bookVia(platform, msg)
  }

  const typeValues = ['any', 'apartment', 'deluxe', 'townhouse']
  const selectArrow = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 10 10'%3E%3Cpath fill='rgba(255,255,255,0.5)' d='M5 7L0 2h10z'/%3E%3C/svg%3E\")"

  return (
    <>
      {/* ==================== HERO ==================== */}
      <section
        className="h-screen relative flex flex-col items-center bg-cover"
        style={{ backgroundImage: "url('/content/photos/01-hero/night_facade_pool_float.jpg')", backgroundPosition: 'center 40%' }}
        id="hero"
      >
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.1) 30%, rgba(0,0,0,0.1) 60%, rgba(0,0,0,0.4) 100%)' }}
        />
        <div className="relative z-10 text-center px-4" style={{ marginTop: '35vh' }}>
          <h1
            className="text-white font-bold text-[56px] md:text-[88px] lg:text-[110px] uppercase"
            style={{ letterSpacing: '0.08em', textShadow: '0 2px 30px rgba(0,0,0,0.5)', lineHeight: 1 }}
          >
            {t.hero.title}
          </h1>
          <p
            className="text-white/80 italic font-medium text-[18px] md:text-[20px] lg:text-[22px] mt-6 md:mt-8"
            style={{ letterSpacing: '0.15em', textShadow: '0 2px 30px rgba(0,0,0,0.5)' }}
          >
            {t.hero.subtitle}
          </p>
        </div>

        {/* ===== BOOKING BAR ===== */}
        <div
          id="bookingWrapper"
          className={isSticky
            ? 'fixed top-[64px] md:top-[80px] left-0 right-0 z-40 w-full'
            : 'absolute bottom-[60px] md:bottom-[80px] left-0 right-0 z-10 px-4 md:px-10 lg:px-20'
          }
        >
          <div
            className={isSticky
              ? 'border-t border-white/[0.08]'
              : 'max-w-[900px] mx-auto'
            }
            style={isSticky
              ? { background: '#141414', backdropFilter: 'none', padding: '0 40px', maxWidth: '100%', borderRadius: 0 }
              : { background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', overflow: 'hidden' }
            }
          >
            {/* Desktop */}
            <div className="hidden md:flex items-center">
              <div className={isSticky ? 'flex-1 px-4 py-2' : 'flex-1 px-5 py-4'}>
                <label className={`block font-semibold tracking-[1.5px] uppercase ${isSticky ? 'text-[9px] mb-px text-white/60' : 'text-[10px] mb-0.5 text-white/50'}`}>{t.booking.checkIn}</label>
                <input ref={checkInRef} type="text" className={`w-full bg-transparent text-white font-normal focus:outline-none cursor-pointer ${isSticky ? 'text-[13px]' : 'text-[14px]'}`} placeholder="Select" readOnly />
              </div>
              <div className={`w-px shrink-0 ${isSticky ? 'h-6 bg-white/25' : 'h-8 bg-white/[0.12]'}`} />
              <div className={isSticky ? 'flex-1 px-4 py-2' : 'flex-1 px-5 py-4'}>
                <label className={`block font-semibold tracking-[1.5px] uppercase ${isSticky ? 'text-[9px] mb-px text-white/60' : 'text-[10px] mb-0.5 text-white/50'}`}>{t.booking.checkOut}</label>
                <input ref={checkOutRef} type="text" className={`w-full bg-transparent text-white font-normal focus:outline-none cursor-pointer ${isSticky ? 'text-[13px]' : 'text-[14px]'}`} placeholder="Select" readOnly />
              </div>
              <div className={`w-px shrink-0 ${isSticky ? 'h-6 bg-white/25' : 'h-8 bg-white/[0.12]'}`} />
              <div className={isSticky ? 'flex-1 px-4 py-2' : 'flex-1 px-5 py-4'}>
                <label className={`block font-semibold tracking-[1.5px] uppercase ${isSticky ? 'text-[9px] mb-px text-white/60' : 'text-[10px] mb-0.5 text-white/50'}`}>{t.booking.guests}</label>
                <select value={guests} onChange={e => setGuests(Number(e.target.value))} className={`w-full bg-transparent text-white font-normal focus:outline-none pr-5 cursor-pointer appearance-none ${isSticky ? 'text-[13px]' : 'text-[14px]'}`}
                  style={{ backgroundImage: selectArrow, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 4px center' }}>
                  {t.booking.guestOptions.map((label, i) => <option key={i} value={i+1} style={{ background: '#141414', color: 'white' }}>{label}</option>)}
                </select>
              </div>
              <div className={`w-px shrink-0 ${isSticky ? 'h-6 bg-white/25' : 'h-8 bg-white/[0.12]'}`} />
              <div className={isSticky ? 'flex-[0.6] px-4 py-2' : 'flex-[0.6] px-4 py-4'}>
                <label className={`block font-semibold tracking-[1.5px] uppercase ${isSticky ? 'text-[9px] mb-px text-white/60' : 'text-[10px] mb-0.5 text-white/50'}`}>{t.booking.children}</label>
                <select value={children} onChange={e => setChildren(Number(e.target.value))} className={`w-full bg-transparent text-white font-normal focus:outline-none pr-5 cursor-pointer appearance-none ${isSticky ? 'text-[13px]' : 'text-[14px]'}`}
                  style={{ backgroundImage: selectArrow, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 4px center' }}>
                  {[0,1,2].map(v => <option key={v} value={v} style={{ background: '#141414', color: 'white' }}>{v}</option>)}
                </select>
              </div>
              <div className={`w-px shrink-0 ${isSticky ? 'h-6 bg-white/25' : 'h-8 bg-white/[0.12]'}`} />
              <div className={isSticky ? 'flex-1 px-4 py-2' : 'flex-1 px-4 py-4'}>
                <label className={`block font-semibold tracking-[1.5px] uppercase ${isSticky ? 'text-[9px] mb-px text-white/60' : 'text-[10px] mb-0.5 text-white/50'}`}>{t.booking.type}</label>
                <select value={propertyType} onChange={e => setPropertyType(e.target.value)} className={`w-full bg-transparent text-white font-normal focus:outline-none pr-5 cursor-pointer appearance-none ${isSticky ? 'text-[13px]' : 'text-[14px]'}`}
                  style={{ backgroundImage: selectArrow, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 4px center' }}>
                  {t.booking.typeOptions.map((label, i) => <option key={i} value={typeValues[i]} style={{ background: '#141414', color: 'white' }}>{label}</option>)}
                </select>
              </div>
              <button onClick={handleSearch}
                className={`uppercase shrink-0 cursor-pointer flex items-center justify-center gap-2 font-semibold transition-all duration-300 self-stretch ${isSticky
                  ? 'px-6 text-[11px] tracking-[1.5px]'
                  : 'px-7 text-[12px] tracking-[1.5px]'
                }`}
                style={isSticky
                  ? { background: '#C8965A', color: '#F7F5F2', borderRadius: 0 }
                  : { background: 'rgba(255,255,255,0.1)', color: 'white' }
                }
                onMouseEnter={e => {
                  if (isSticky) { e.currentTarget.style.background = '#F7F5F2'; e.currentTarget.style.color = '#141414' }
                  else { e.currentTarget.style.background = 'rgba(255,255,255,0.2)' }
                }}
                onMouseLeave={e => {
                  if (isSticky) { e.currentTarget.style.background = '#C8965A'; e.currentTarget.style.color = '#F7F5F2' }
                  else { e.currentTarget.style.background = 'rgba(255,255,255,0.1)' }
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                {t.booking.search}
              </button>
            </div>

            {/* Mobile */}
            <div className="md:hidden flex flex-col" style={isSticky ? undefined : { overflow: 'hidden' }}>
              <div className="flex">
                <div className="flex-1 px-5 py-3.5 border-b border-white/[0.12]">
                  <label className="block text-[10px] font-semibold tracking-[1.5px] uppercase text-white/50 mb-0.5">{t.booking.checkIn}</label>
                  <input ref={checkInMobileRef} type="text" className="w-full bg-transparent text-white text-[14px] font-normal focus:outline-none cursor-pointer" placeholder="Select" readOnly />
                </div>
                <div className="w-px bg-white/[0.12]" />
                <div className="flex-1 px-5 py-3.5 border-b border-white/[0.12]">
                  <label className="block text-[10px] font-semibold tracking-[1.5px] uppercase text-white/50 mb-0.5">{t.booking.checkOut}</label>
                  <input ref={checkOutMobileRef} type="text" className="w-full bg-transparent text-white text-[14px] font-normal focus:outline-none cursor-pointer" placeholder="Select" readOnly />
                </div>
              </div>
              <div className="flex">
                <div className="flex-1 px-5 py-3.5 border-b border-white/[0.12]">
                  <label className="block text-[10px] font-semibold tracking-[1.5px] uppercase text-white/50 mb-0.5">{t.booking.guests}</label>
                  <select value={guests} onChange={e => setGuests(Number(e.target.value))} className="w-full bg-transparent text-white text-[14px] font-normal focus:outline-none pr-5 cursor-pointer appearance-none"
                    style={{ backgroundImage: selectArrow, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 4px center' }}>
                    {t.booking.guestOptions.map((label, i) => <option key={i} value={i+1} style={{ background: '#141414', color: 'white' }}>{label}</option>)}
                  </select>
                </div>
                <div className="w-px bg-white/[0.12]" />
                <div className="flex-[0.6] px-5 py-3.5 border-b border-white/[0.12]">
                  <label className="block text-[10px] font-semibold tracking-[1.5px] uppercase text-white/50 mb-0.5">{t.booking.children}</label>
                  <select value={children} onChange={e => setChildren(Number(e.target.value))} className="w-full bg-transparent text-white text-[14px] font-normal focus:outline-none pr-5 cursor-pointer appearance-none"
                    style={{ backgroundImage: selectArrow, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 4px center' }}>
                    {[0,1,2].map(v => <option key={v} value={v} style={{ background: '#141414', color: 'white' }}>{v}</option>)}
                  </select>
                </div>
                <div className="w-px bg-white/[0.12]" />
                <div className="flex-1 px-5 py-3.5 border-b border-white/[0.12]">
                  <label className="block text-[10px] font-semibold tracking-[1.5px] uppercase text-white/50 mb-0.5">{t.booking.type}</label>
                  <select value={propertyType} onChange={e => setPropertyType(e.target.value)} className="w-full bg-transparent text-white text-[14px] font-normal focus:outline-none pr-5 cursor-pointer appearance-none"
                    style={{ backgroundImage: selectArrow, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 4px center' }}>
                    {t.booking.typeOptions.map((label, i) => <option key={i} value={typeValues[i]} style={{ background: '#141414', color: 'white' }}>{label}</option>)}
                  </select>
                </div>
              </div>
              <button onClick={handleSearch}
                className="uppercase w-full py-3.5 cursor-pointer text-[12px] tracking-[1.5px] font-semibold transition-all duration-300"
                style={{ background: 'rgba(255,255,255,0.1)', color: 'white' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.2)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)' }}
              >
                {t.booking.search}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== RESULTS ==================== */}
      {searchParams && (
        <section id="results" ref={resultsRef} style={{ background: '#EDEAE6' }}>
          <div className="max-w-[1440px] mx-auto px-6 md:px-10 lg:px-20 pt-32 md:pt-40 pb-10">
            <div className="text-center mb-4">
              <h2 className="text-[28px] md:text-[40px] font-bold uppercase" style={{ letterSpacing: '0.06em', color: '#141414' }}>
                {t.booking.selectYourStay}
              </h2>
              <div className="w-12 h-[2px] mx-auto mt-4 mb-3" style={{ background: '#C8965A' }} />
              <p className="text-[13px] uppercase" style={{ letterSpacing: '0.1em', color: '#5C5C5C' }}>
                {filtered.length} {t.booking.roomsFound} &middot; {nights} {nightsLabel} &middot; {dateRange}
              </p>
            </div>
          </div>
          <div className="max-w-[1440px] mx-auto px-6 md:px-10 lg:px-20 pb-32">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filtered.map((room, i) => {
                const price = getPrice(room, nights)
                const name = lang === 'ru' ? room.nameRu : room.name
                const typeLabel = lang === 'ru' ? room.typeLabelRu : room.typeLabel
                const viewText = lang === 'ru' ? room.viewRu : room.view
                const features = [room.area, viewText]
                if (room.kitchen) features.push(t.rooms.kitchenYes)
                const totalText = price.isMonthly
                  ? `${Math.ceil(nights/30)} ${t.rooms.months} \u00b7 $${price.total.toLocaleString()} ${t.rooms.totalLabel}`
                  : `${nights} ${nightsLabel} \u00b7 $${price.total.toLocaleString()} ${t.rooms.totalLabel}`

                return (
                  <div key={room.id} className="fade-up cursor-pointer overflow-hidden transition-[box-shadow,transform] duration-300 flex flex-col"
                    style={{ background: '#FFFFFF', transitionDelay: `${i*0.08}s` }}
                    onClick={() => { setModalRoom(room); setModalNights(nights); setActivePhoto(0); document.body.style.overflow = 'hidden' }}
                    onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.12)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
                    onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none' }}
                  >
                    <div className="overflow-hidden">
                      <img src={room.photos[0]} alt={name} loading="lazy" className="w-full object-cover transition-transform duration-[600ms]" style={{ aspectRatio: '3/2' }}
                        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.03)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'none'} />
                    </div>
                    <div className="p-5 pb-0 flex-1">
                      <p className="text-[11px] font-medium uppercase mb-2" style={{ letterSpacing: '0.1em', color: '#5C5C5C' }}>{typeLabel}</p>
                      <h3 className="text-[18px] font-semibold mb-1" style={{ letterSpacing: '0.02em', color: '#141414' }}>{name}</h3>
                      <p className="text-[12px] uppercase mb-3" style={{ letterSpacing: '0.08em', color: '#5C5C5C' }}>{features.join(' \u00b7 ')}</p>
                      <div className="flex items-baseline justify-between mb-1">
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-[22px] font-bold" style={{ color: '#141414' }}>${price.perNight}</span>
                          <span className="text-[13px] font-normal" style={{ color: '#5C5C5C' }}>{price.isMonthly ? t.rooms.perMonth : t.rooms.perNight}</span>
                        </div>
                      </div>
                      <p className="text-[12px] mb-5" style={{ color: '#5C5C5C' }}>{totalText}</p>
                    </div>
                    <div className="text-[13px] font-semibold uppercase py-3.5 text-center transition-colors duration-300 mt-auto"
                      style={{ background: '#141414', color: '#F7F5F2', letterSpacing: '0.1em' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#C8965A'}
                      onMouseLeave={e => e.currentTarget.style.background = '#141414'}
                    >
                      {t.booking.viewDetails}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* ==================== MODAL ==================== */}
      {modalRoom && (() => {
        const price = getPrice(modalRoom, modalNights)
        const name = lang === 'ru' ? modalRoom.nameRu : modalRoom.name
        const floor = lang === 'ru' ? modalRoom.floorRu : modalRoom.floor
        const view = lang === 'ru' ? modalRoom.viewRu : modalRoom.view
        const kitchenText = modalRoom.kitchen ? t.rooms.kitchenYes : t.rooms.kitchenNo
        const mNightsLabel = modalNights === 1 ? t.rooms.night : t.rooms.nights
        const fmtOpts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }
        const ciFmt = searchParams?.checkIn?.toLocaleDateString('en-GB', fmtOpts) ?? ''
        const coFmt = searchParams?.checkOut?.toLocaleDateString('en-GB', fmtOpts) ?? ''

        return (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.7)', opacity: 1 }}
            onClick={e => { if (e.target === e.currentTarget) { setModalRoom(null); document.body.style.overflow = '' } }}
          >
            <div className="bg-white max-w-[1100px] w-full max-h-[90vh] overflow-y-auto relative"
              style={{ transform: 'translateY(0)', transition: 'transform 0.4s cubic-bezier(0.4,0,0.2,1)' }}
            >
              <button onClick={() => { setModalRoom(null); document.body.style.overflow = '' }}
                className="absolute top-4 right-4 md:top-6 md:right-6 z-10 w-10 h-10 flex items-center justify-center cursor-pointer transition-colors duration-300"
                style={{ background: '#141414', color: '#F7F5F2' }}
                onMouseEnter={e => e.currentTarget.style.background = '#C8965A'}
                onMouseLeave={e => e.currentTarget.style.background = '#141414'}
                aria-label="Close"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
              <div className="flex flex-col md:flex-row">
                {/* Gallery */}
                <div className="md:w-[55%]">
                  <div className="overflow-hidden" style={{ aspectRatio: '4/3' }}>
                    <img src={modalRoom.photos[activePhoto]} alt={name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex gap-2 p-4 overflow-x-auto">
                    {modalRoom.photos.map((photo, i) => (
                      <img key={i} src={photo} alt={`${name} ${i+1}`}
                        className="w-20 h-14 object-cover shrink-0 cursor-pointer transition-opacity duration-200"
                        style={{ opacity: i === activePhoto ? 1 : 0.5 }}
                        onClick={() => setActivePhoto(i)} />
                    ))}
                  </div>
                </div>
                {/* Details */}
                <div className="md:w-[45%] p-6 md:p-8 flex flex-col">
                  <h3 className="text-xl md:text-2xl font-bold uppercase" style={{ letterSpacing: '0.04em' }}>{name}</h3>
                  <div className="w-10 h-[2px] mt-3 mb-6" style={{ background: '#141414' }} />
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    {[
                      [t.rooms.area, modalRoom.area],
                      [t.rooms.floor, floor],
                      [t.rooms.view, view],
                      [t.rooms.kitchen, kitchenText],
                    ].map(([label, val]) => (
                      <div key={label}>
                        <p className="text-[11px] font-medium uppercase mb-1" style={{ letterSpacing: '0.1em', color: '#5C5C5C' }}>{label}</p>
                        <p className="font-medium">{val}</p>
                      </div>
                    ))}
                  </div>
                  <div className="p-5 mb-6" style={{ background: '#EDEAE6' }}>
                    <div className="flex items-baseline justify-between">
                      <div><span className="text-2xl font-bold">${price.perNight}</span><span className="text-sm" style={{ color: '#5C5C5C' }}> {price.isMonthly ? t.rooms.perMonth : t.rooms.perNight}</span></div>
                      <div className="text-right"><span className="text-sm" style={{ color: '#5C5C5C' }}>{t.rooms.total} </span><span className="font-bold">${price.total.toLocaleString()}</span></div>
                    </div>
                    <div className="text-sm mt-2" style={{ color: '#5C5C5C' }}>{ciFmt} &rarr; {coFmt} &middot; {modalNights} {mNightsLabel}</div>
                  </div>
                  <div className="mb-6 text-sm space-y-1" style={{ color: '#5C5C5C' }}>
                    <p className="font-medium text-[11px] uppercase mb-2" style={{ letterSpacing: '0.1em', color: '#141414' }}>{t.rooms.priceTiers}</p>
                    {modalRoom.prices.map((tier, i) => {
                      const priceText = tier.perMonth ? `$${tier.perMonth.toLocaleString()} ${t.rooms.perMonth}` : `$${tier.perNight} ${t.rooms.perNight}`
                      const isActive = modalNights >= tier.min && modalNights <= tier.max
                      return (
                        <div key={i} className="flex justify-between" style={isActive ? { color: '#141414', fontWeight: 500 } : undefined}>
                          <span>{t.rooms.tierLabels[i]}</span><span>{priceText}{isActive ? ' \u2190' : ''}</span>
                        </div>
                      )
                    })}
                  </div>
                  <div className="flex-1" />
                  <p className="text-[11px] font-medium uppercase mb-3" style={{ letterSpacing: '0.1em', color: '#5C5C5C' }}>{t.rooms.bookVia}</p>
                  <div className="flex flex-col gap-3">
                    {(['telegram', 'whatsapp', 'instagram'] as const).map(platform => (
                      <button key={platform} onClick={() => handleBook(platform)}
                        className="w-full text-[13px] font-semibold uppercase py-4 flex items-center justify-center gap-3 cursor-pointer transition-colors duration-300"
                        style={{ border: '1px solid #141414', color: '#141414', letterSpacing: '0.08em', background: 'transparent' }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#C8965A'; e.currentTarget.style.color = '#F7F5F2'; e.currentTarget.style.borderColor = '#C8965A' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#141414'; e.currentTarget.style.borderColor = '#141414' }}
                      >
                        {platform === 'telegram' && <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161c-.18 1.897-.962 6.502-1.359 8.627-.168.9-.5 1.201-.82 1.23-.697.064-1.226-.461-1.901-.903-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.492-1.302.48-.429-.013-1.252-.242-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.831-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635.099-.002.321.023.465.141.12.098.153.229.168.332.016.103.036.327.02.504z"/></svg>}
                        {platform === 'whatsapp' && <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.274.072.376-.043c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.045.072.045.419-.1.824zm-3.423-11.416c-5.523 0-10 4.477-10 10 0 1.76.46 3.478 1.335 4.992l-1.42 5.184 5.32-1.394c1.44.788 3.09 1.218 4.765 1.218 5.523 0 10-4.477 10-10s-4.477-10-10-10z"/></svg>}
                        {platform === 'instagram' && <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>}
                        {platform.charAt(0).toUpperCase() + platform.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      })()}
    </>
  )
}

// Flatpickr type augmentation
declare global {
  interface HTMLInputElement {
    _flatpickr?: {
      selectedDates: Date[]
      setDate: (date: Date, triggerChange?: boolean) => void
      set: (key: string, value: unknown) => void
    }
  }
}
