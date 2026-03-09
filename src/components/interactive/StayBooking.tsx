import { useState, useCallback, useRef, useEffect } from 'react'
import type { Room } from '@data/rooms'
import type { Lang } from '@utils/i18n'
import { en } from '@data/translations/en'
import { ru } from '@data/translations/ru'
import { getPrice, getNights } from '@utils/pricing'
import type { SearchParams } from './stay-booking/types'
import RoomCard from './stay-booking/RoomCard'
import RoomModal from './stay-booking/RoomModal'

interface Props {
  lang: Lang
  rooms: Room[]
}

const translations = { en, ru }

export default function StayBooking({ lang, rooms }: Props) {
  const t = translations[lang]
  const [searchParams, setSearchParams] = useState<SearchParams | null>(null)
  const [modalRoom, setModalRoom] = useState<Room | null>(null)
  const [isSticky, setIsSticky] = useState(false)
  const [mobileExpanded, setMobileExpanded] = useState(false)
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

  // Init Flatpickr — single calendar per viewport with range mode (Airbnb pattern)
  useEffect(() => {
    const loadFlatpickr = async () => {
      const flatpickr = (await import('flatpickr')).default
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const weekLater = new Date()
      weekLater.setDate(weekLater.getDate() + 8)

      const fixInputValues = (
        fp: any,
        ciRef: React.RefObject<HTMLInputElement | null>,
        coRef: React.RefObject<HTMLInputElement | null>,
        ciRefSync: React.RefObject<HTMLInputElement | null>,
        coRefSync: React.RefObject<HTMLInputElement | null>
      ) => {
        const dates = fp.selectedDates
        if (dates.length >= 1) {
          const ciFmt = fp.formatDate(dates[0], 'd M')
          if (ciRef.current) ciRef.current.value = ciFmt
          if (ciRefSync.current) ciRefSync.current.value = ciFmt
        }
        if (dates.length === 2) {
          const coFmt = fp.formatDate(dates[1], 'd M')
          if (coRef.current) coRef.current.value = coFmt
          if (coRefSync.current) coRefSync.current.value = coFmt
        } else {
          if (coRef.current) coRef.current.value = ''
          if (coRefSync.current) coRefSync.current.value = ''
        }
      }

      const nightsWord = (n: number) => n === 1 ? t.rooms.night : t.rooms.nights
      const calcNights = (start: Date, end: Date) => Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000))

      const updateNightsCounter = (fp: any, endDate?: Date) => {
        const counter = fp.calendarContainer.querySelector('.calendar-nights-counter') as HTMLElement | null
        if (!counter) return
        const ci = fp.selectedDates[0]
        const co = endDate ?? fp.selectedDates[1]
        if (ci && co && co > ci) {
          const n = calcNights(ci, co)
          counter.textContent = `${n} ${nightsWord(n)}`
          counter.classList.add('visible')
        } else {
          counter.classList.remove('visible')
        }
      }

      const createRangeOpts = (
        ciRef: React.RefObject<HTMLInputElement | null>,
        coRef: React.RefObject<HTMLInputElement | null>,
        ciRefSync: React.RefObject<HTMLInputElement | null>,
        coRefSync: React.RefObject<HTMLInputElement | null>
      ) => ({
        mode: 'range' as const,
        dateFormat: 'd M',
        minDate: tomorrow,
        defaultDate: [tomorrow, weekLater] as Date[],
        monthSelectorType: 'static' as const,
        disableMobile: true,
        onReady(_dObj: any, _dStr: any, fp: any) {
          const header = document.createElement('div')
          header.className = 'calendar-header-custom'
          header.innerHTML = '<div class="calendar-phase-indicator">' + t.booking.checkIn + '</div><div class="calendar-nights-counter"></div>'
          fp.calendarContainer.insertBefore(header, fp.calendarContainer.firstChild)
          setTimeout(() => fixInputValues(fp, ciRef, coRef, ciRefSync, coRefSync), 0)
          fp.calendarContainer.addEventListener('mouseover', (e: MouseEvent) => {
            if (fp.selectedDates.length !== 1) return
            const dayEl = (e.target as HTMLElement).closest('.flatpickr-day') as any
            if (dayEl?.dateObj && dayEl.dateObj > fp.selectedDates[0]) updateNightsCounter(fp, dayEl.dateObj)
          })
          fp.calendarContainer.addEventListener('mouseleave', () => {
            if (fp.selectedDates.length === 1) {
              const counter = fp.calendarContainer.querySelector('.calendar-nights-counter') as HTMLElement | null
              if (counter) counter.classList.remove('visible')
            }
          })
        },
        onChange(selectedDates: Date[], _: string, fp: any) {
          const indicator = fp.calendarContainer.querySelector('.calendar-phase-indicator')
          if (selectedDates.length === 1 && indicator) {
            indicator.textContent = t.booking.checkOut
            indicator.classList.add('phase-checkout')
          } else if (selectedDates.length === 2) {
            if (indicator) {
              indicator.textContent = t.booking.checkIn
              indicator.classList.remove('phase-checkout')
            }
            const syncFp = (ciRefSync.current as any)?._flatpickr
            if (syncFp && syncFp !== fp) {
              syncFp.setDate([selectedDates[0], selectedDates[1]], false)
              setTimeout(() => fixInputValues(syncFp, ciRefSync, coRefSync, ciRef, coRef), 0)
            }
          }
          updateNightsCounter(fp)
          setTimeout(() => fixInputValues(fp, ciRef, coRef, ciRefSync, coRefSync), 0)
        },
        onOpen(_: any, __: any, fp: any) {
          const indicator = fp.calendarContainer.querySelector('.calendar-phase-indicator')
          if (indicator) {
            const isCheckout = fp.selectedDates.length === 1
            indicator.textContent = isCheckout ? t.booking.checkOut : t.booking.checkIn
            indicator.classList.toggle('phase-checkout', isCheckout)
          }
          updateNightsCounter(fp)
        },
        onMonthChange(_: any, __: any, fp: any) {
          setTimeout(() => fixInputValues(fp, ciRef, coRef, ciRefSync, coRefSync), 0)
        },
      })

      if (checkInRef.current) {
        flatpickr(checkInRef.current, createRangeOpts(checkInRef, checkOutRef, checkInMobileRef, checkOutMobileRef))
      }
      if (checkInMobileRef.current) {
        flatpickr(checkInMobileRef.current, createRangeOpts(checkInMobileRef, checkOutMobileRef, checkInRef, checkOutRef))
      }

      checkOutRef.current?.addEventListener('click', () => {
        (checkInRef.current as any)?._flatpickr?.open()
      })
      checkOutMobileRef.current?.addEventListener('click', () => {
        (checkInMobileRef.current as any)?._flatpickr?.open()
      })
    }
    loadFlatpickr()
  }, [])

  // Sticky scroll — hide navbar
  useEffect(() => {
    const navbar = document.getElementById('navbar')
    const handleScroll = () => {
      if (!searchParams) { setIsSticky(false); if (navbar) navbar.style.transform = ''; return }
      const shouldStick = window.scrollY > window.innerHeight - 200
      setIsSticky(shouldStick)
      if (navbar) navbar.style.transform = shouldStick ? 'translateY(-100%)' : ''
    }
    window.addEventListener('scroll', handleScroll)
    return () => { window.removeEventListener('scroll', handleScroll); if (navbar) navbar.style.transform = '' }
  }, [searchParams])

  // Search — pick the flatpickr that actually has 2 dates selected
  const handleSearch = useCallback(() => {
    const desktopFp = (checkInRef.current as any)?._flatpickr
    const mobileFp = (checkInMobileRef.current as any)?._flatpickr
    const fp = mobileFp?.selectedDates?.length === 2 ? mobileFp
             : desktopFp?.selectedDates?.length === 2 ? desktopFp
             : null
    if (!fp) return
    const ci = fp.selectedDates[0]
    const co = fp.selectedDates[1]
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
            className="text-white font-extrabold text-[56px] md:text-[88px] lg:text-[110px] uppercase"
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
            ? 'fixed top-0 left-0 right-0 z-50 w-full'
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
              : { background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', overflow: 'hidden' }
            }
          >
            {/* Desktop */}
            <div className="hidden md:flex items-center" style={isSticky ? { height: '56px', padding: '0 24px' } : undefined}>
              {isSticky && (
                <a href={lang === 'ru' ? '/ru/' : '/'} className="text-white font-bold text-sm shrink-0" style={{ letterSpacing: '0.12em' }}>BORN TO BE</a>
              )}
              <div className={isSticky ? 'flex-1 flex justify-center' : 'flex-1 flex items-center'}>
                <div
                  className="flex items-center"
                  style={isSticky
                    ? { border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', overflow: 'hidden' }
                    : { width: '100%' }
                  }
                >
                  {/* Check-in */}
                  <div className={isSticky ? 'px-4 py-1.5' : 'flex-1 px-5 py-4'}>
                    {!isSticky && <label className="block text-[10px] mb-0.5 text-white/50 font-semibold tracking-[1.5px] uppercase">{t.booking.checkIn}</label>}
                    <input ref={checkInRef} type="text"
                      className={`bg-transparent text-white font-normal focus:outline-none cursor-pointer ${isSticky ? 'text-[13px] w-[75px]' : 'w-full text-[14px]'}`}
                      placeholder={isSticky ? 'Check-in' : 'Select'} readOnly />
                  </div>
                  <div className={isSticky ? 'w-px h-5 bg-white/[0.15]' : 'w-px shrink-0 h-8 bg-white/[0.12]'} />

                  {/* Check-out */}
                  <div className={isSticky ? 'px-4 py-1.5' : 'flex-1 px-5 py-4'}>
                    {!isSticky && <label className="block text-[10px] mb-0.5 text-white/50 font-semibold tracking-[1.5px] uppercase">{t.booking.checkOut}</label>}
                    <input ref={checkOutRef} type="text"
                      className={`bg-transparent text-white font-normal focus:outline-none cursor-pointer ${isSticky ? 'text-[13px] w-[75px]' : 'w-full text-[14px]'}`}
                      placeholder={isSticky ? 'Check-out' : 'Select'} readOnly />
                  </div>
                  <div className={isSticky ? 'w-px h-5 bg-white/[0.15]' : 'w-px shrink-0 h-8 bg-white/[0.12]'} />

                  {/* Guests */}
                  <div className={isSticky ? 'px-3 py-1.5' : 'flex-1 px-5 py-4'}>
                    {!isSticky && <label className="block text-[10px] mb-0.5 text-white/50 font-semibold tracking-[1.5px] uppercase">{t.booking.guests}</label>}
                    <select value={guests} onChange={e => setGuests(Number(e.target.value))}
                      className={`bg-transparent text-white font-normal focus:outline-none cursor-pointer appearance-none ${isSticky ? 'text-[13px] pr-4' : 'w-full text-[14px] pr-5'}`}
                      style={{ backgroundImage: selectArrow, backgroundRepeat: 'no-repeat', backgroundPosition: isSticky ? 'right 0 center' : 'right 4px center' }}>
                      {t.booking.guestOptions.map((label, i) => <option key={i} value={i+1} style={{ background: '#141414', color: 'white' }}>{label}</option>)}
                    </select>
                  </div>
                  <div className={isSticky ? 'w-px h-5 bg-white/[0.15]' : 'w-px shrink-0 h-8 bg-white/[0.12]'} />

                  {/* Children */}
                  <div className={isSticky ? 'px-3 py-1.5' : 'flex-[0.6] px-4 py-4'}>
                    {!isSticky && <label className="block text-[10px] mb-0.5 text-white/50 font-semibold tracking-[1.5px] uppercase">{t.booking.children}</label>}
                    <select value={children} onChange={e => setChildren(Number(e.target.value))}
                      className={`bg-transparent text-white font-normal focus:outline-none cursor-pointer appearance-none ${isSticky ? 'text-[13px] pr-4' : 'w-full text-[14px] pr-5'}`}
                      style={{ backgroundImage: selectArrow, backgroundRepeat: 'no-repeat', backgroundPosition: isSticky ? 'right 0 center' : 'right 4px center' }}>
                      {[0,1,2].map(v => <option key={v} value={v} style={{ background: '#141414', color: 'white' }}>{v}</option>)}
                    </select>
                  </div>
                  <div className={isSticky ? 'w-px h-5 bg-white/[0.15]' : 'w-px shrink-0 h-8 bg-white/[0.12]'} />

                  {/* Type */}
                  <div className={isSticky ? 'px-3 py-1.5' : 'flex-1 px-4 py-4'}>
                    {!isSticky && <label className="block text-[10px] mb-0.5 text-white/50 font-semibold tracking-[1.5px] uppercase">{t.booking.type}</label>}
                    <select value={propertyType} onChange={e => setPropertyType(e.target.value)}
                      className={`bg-transparent text-white font-normal focus:outline-none cursor-pointer appearance-none ${isSticky ? 'text-[13px] pr-4' : 'w-full text-[14px] pr-5'}`}
                      style={{ backgroundImage: selectArrow, backgroundRepeat: 'no-repeat', backgroundPosition: isSticky ? 'right 0 center' : 'right 4px center' }}>
                      {t.booking.typeOptions.map((label, i) => <option key={i} value={typeValues[i]} style={{ background: '#141414', color: 'white' }}>{label}</option>)}
                    </select>
                  </div>

                  {/* Search button */}
                  <button onClick={handleSearch}
                    className={`shrink-0 cursor-pointer flex items-center justify-center font-semibold transition-all duration-300 uppercase self-stretch ${
                      isSticky ? 'gap-1.5 px-5 text-[11px] tracking-[1.5px]' : 'gap-2 px-7 text-[12px] tracking-[1.5px]'
                    }`}
                    style={isSticky
                      ? { background: '#C8965A', color: '#F7F5F2' }
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
                    <svg width={isSticky ? 12 : 14} height={isSticky ? 12 : 14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                    {t.booking.search}
                  </button>
                </div>
              </div>
            </div>

            {/* Mobile — compact sticky / full hero */}
            <div className="md:hidden flex flex-col">
              {/* Compact sticky summary — one line */}
              {isSticky && !mobileExpanded && (
                <div className="flex items-center px-4 py-3 gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-[13px] font-medium truncate">
                      {checkInMobileRef.current?.value || '—'} → {checkOutMobileRef.current?.value || '—'} · {t.booking.guestOptions[guests - 1]}
                    </p>
                  </div>
                  <button onClick={() => setMobileExpanded(true)}
                    className="shrink-0 text-[11px] font-semibold uppercase px-4 py-2 cursor-pointer transition-colors duration-300"
                    style={{ border: '1px solid rgba(255,255,255,0.25)', color: 'white', letterSpacing: '0.08em' }}>
                    {t.booking.edit}
                  </button>
                </div>
              )}

              {/* Full form — hero (always) or sticky expanded */}
              <div style={{ display: (!isSticky || mobileExpanded) ? 'flex' : 'none', flexDirection: 'column', overflow: !isSticky ? 'hidden' : undefined }}>
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
                <button onClick={() => { handleSearch(); setMobileExpanded(false) }}
                  className="uppercase w-full py-3.5 cursor-pointer text-[12px] tracking-[1.5px] font-semibold transition-all duration-300"
                  style={{ background: isSticky ? '#C8965A' : 'rgba(255,255,255,0.1)', color: isSticky ? '#F7F5F2' : 'white' }}
                  onMouseEnter={e => {
                    if (isSticky) { e.currentTarget.style.background = '#F7F5F2'; e.currentTarget.style.color = '#141414' }
                    else { e.currentTarget.style.background = 'rgba(255,255,255,0.2)' }
                  }}
                  onMouseLeave={e => {
                    if (isSticky) { e.currentTarget.style.background = '#C8965A'; e.currentTarget.style.color = '#F7F5F2' }
                    else { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'white' }
                  }}
                >
                  {t.booking.search}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== RESULTS ==================== */}
      {searchParams && (
        <section id="results" ref={resultsRef} style={{ background: '#EDEAE6' }}>
          <div className="max-w-[1440px] mx-auto px-6 md:px-10 lg:px-20 pt-32 md:pt-40 pb-16">
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
              {filtered.map((room, i) => (
                <RoomCard key={room.id} room={room} nights={nights} lang={lang} t={t} index={i}
                  onSelect={() => setModalRoom(room)} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ==================== MODAL ==================== */}
      {modalRoom && (
        <RoomModal
          room={modalRoom}
          lang={lang}
          t={t}
          searchParams={searchParams}
          onClose={() => setModalRoom(null)}
        />
      )}
    </>
  )
}
