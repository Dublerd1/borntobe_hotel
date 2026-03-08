import { useState, useCallback, useRef, useEffect } from 'react'
import type { Room } from '@data/rooms'
import type { Lang } from '@utils/i18n'
import { en } from '@data/translations/en'
import { ru } from '@data/translations/ru'
import { getPrice, getNights } from '@utils/pricing'
import { getBookingMessage, bookVia, generateBookingId } from '@utils/booking'

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
  const [modalCheckIn, setModalCheckIn] = useState<Date | null>(null)
  const [modalCheckOut, setModalCheckOut] = useState<Date | null>(null)
  const [isSticky, setIsSticky] = useState(false)
  const [activePhoto, setActivePhoto] = useState(0)
  const [bookingStep, setBookingStep] = useState<'details' | 'form' | 'send'>('details')
  const [bookingName, setBookingName] = useState('')
  const [bookingContact, setBookingContact] = useState('')
  const [bookingId, setBookingId] = useState('')
  const resultsRef = useRef<HTMLDivElement>(null)
  const modalCheckInRef = useRef<HTMLInputElement>(null)
  const modalCheckOutRef = useRef<HTMLInputElement>(null)

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

      // Fix input values: range mode shows "date1 to date2" in one input,
      // we split it into separate check-in / check-out inputs
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

      // Night counter helper
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
          // Phase indicator + nights counter
          const header = document.createElement('div')
          header.className = 'calendar-header-custom'
          header.innerHTML = '<div class="calendar-phase-indicator">' + t.booking.checkIn + '</div><div class="calendar-nights-counter"></div>'
          fp.calendarContainer.insertBefore(header, fp.calendarContainer.firstChild)
          setTimeout(() => fixInputValues(fp, ciRef, coRef, ciRefSync, coRefSync), 0)
          // Hover listener for live night counter
          fp.calendarContainer.addEventListener('mouseover', (e: MouseEvent) => {
            if (fp.selectedDates.length !== 1) return
            const dayEl = (e.target as HTMLElement).closest('.flatpickr-day') as any
            if (dayEl?.dateObj && dayEl.dateObj > fp.selectedDates[0]) {
              updateNightsCounter(fp, dayEl.dateObj)
            }
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
            // Sync to other viewport's flatpickr
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

      // Check-out inputs: open the check-in calendar on click
      checkOutRef.current?.addEventListener('click', () => {
        (checkInRef.current as any)?._flatpickr?.open()
      })
      checkOutMobileRef.current?.addEventListener('click', () => {
        (checkInMobileRef.current as any)?._flatpickr?.open()
      })
    }
    loadFlatpickr()
  }, [])

  // Init Flatpickr in modal — single range calendar (same pattern as hero)
  useEffect(() => {
    if (!modalRoom) return
    const initModalPicker = async () => {
      const flatpickr = (await import('flatpickr')).default
      // Destroy old instances
      const existingCI = (modalCheckInRef.current as any)?._flatpickr
      if (existingCI) existingCI.destroy()
      const existingCO = (modalCheckOutRef.current as any)?._flatpickr
      if (existingCO) existingCO.destroy()

      if (!modalCheckInRef.current) return
      const defaults: Date[] = []
      if (modalCheckIn) defaults.push(modalCheckIn)
      if (modalCheckIn && modalCheckOut) defaults.push(modalCheckOut)

      // Night counter helper (modal)
      const nightsWord = (n: number) => n === 1 ? t.rooms.night : t.rooms.nights
      const calcNights = (start: Date, end: Date) => Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000))
      const updateModalNightsCounter = (fp: any, endDate?: Date) => {
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

      flatpickr(modalCheckInRef.current, {
        mode: 'range' as any,
        dateFormat: 'd M',
        defaultDate: defaults.length ? defaults : undefined,
        minDate: new Date(),
        disableMobile: true,
        onReady(_: any, __: any, fp: any) {
          fp.calendarContainer?.classList.add('flatpickr-light')
          // Phase indicator + nights counter
          const header = document.createElement('div')
          header.className = 'calendar-header-custom'
          header.innerHTML = '<div class="calendar-phase-indicator">' + t.booking.checkIn + '</div><div class="calendar-nights-counter"></div>'
          fp.calendarContainer.insertBefore(header, fp.calendarContainer.firstChild)
          // Fix input values
          setTimeout(() => {
            if (fp.selectedDates.length >= 1 && modalCheckInRef.current) {
              modalCheckInRef.current.value = fp.formatDate(fp.selectedDates[0], 'd M')
            }
            if (fp.selectedDates.length === 2 && modalCheckOutRef.current) {
              modalCheckOutRef.current.value = fp.formatDate(fp.selectedDates[1], 'd M')
            }
          }, 0)
          // Hover listener for live night counter
          fp.calendarContainer.addEventListener('mouseover', (e: MouseEvent) => {
            if (fp.selectedDates.length !== 1) return
            const dayEl = (e.target as HTMLElement).closest('.flatpickr-day') as any
            if (dayEl?.dateObj && dayEl.dateObj > fp.selectedDates[0]) {
              updateModalNightsCounter(fp, dayEl.dateObj)
            }
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
          if (selectedDates.length === 1) {
            setModalCheckIn(selectedDates[0])
            if (indicator) {
              indicator.textContent = t.booking.checkOut
              indicator.classList.add('phase-checkout')
            }
            if (modalCheckOutRef.current) modalCheckOutRef.current.value = ''
          } else if (selectedDates.length === 2) {
            setModalCheckIn(selectedDates[0])
            setModalCheckOut(selectedDates[1])
            if (indicator) {
              indicator.textContent = t.booking.checkIn
              indicator.classList.remove('phase-checkout')
            }
          }
          updateModalNightsCounter(fp)
          // Fix check-in input value (override range "date1 to date2")
          setTimeout(() => {
            if (selectedDates.length >= 1 && modalCheckInRef.current) {
              modalCheckInRef.current.value = fp.formatDate(selectedDates[0], 'd M')
            }
            if (selectedDates.length === 2 && modalCheckOutRef.current) {
              modalCheckOutRef.current.value = fp.formatDate(selectedDates[1], 'd M')
            }
          }, 0)
        },
        onOpen(_: any, __: any, fp: any) {
          const indicator = fp.calendarContainer.querySelector('.calendar-phase-indicator')
          if (indicator) {
            const isCheckout = fp.selectedDates.length === 1
            indicator.textContent = isCheckout ? t.booking.checkOut : t.booking.checkIn
            indicator.classList.toggle('phase-checkout', isCheckout)
          }
          updateModalNightsCounter(fp)
        },
      })

      // Check-out input: open the same range calendar on click
      modalCheckOutRef.current?.addEventListener('click', () => {
        (modalCheckInRef.current as any)?._flatpickr?.open()
      })
    }
    const timer = setTimeout(initModalPicker, 50)
    return () => clearTimeout(timer)
  }, [modalRoom])

  // Sticky scroll — hide navbar when booking bar is sticky
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

  // Search
  const handleSearch = useCallback(() => {
    const fp = (checkInRef.current as any)?._flatpickr ?? (checkInMobileRef.current as any)?._flatpickr
    const ci = fp?.selectedDates?.[0]
    const co = fp?.selectedDates?.[1]
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
    if (!modalRoom || !modalCheckIn || !modalCheckOut) return
    const roomName = lang === 'ru' ? modalRoom.nameRu : modalRoom.name
    const fmtOpts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }
    const msg = getBookingMessage({
      roomName,
      checkIn: modalCheckIn.toLocaleDateString('en-GB', fmtOpts),
      checkOut: modalCheckOut.toLocaleDateString('en-GB', fmtOpts),
      guests: searchParams?.guests ?? 2,
      children: searchParams?.children ?? 0,
      messageTemplate: t.rooms.bookMsg,
      id: bookingId,
      name: bookingName,
      contact: bookingContact,
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
            {/* Desktop — inputs always in DOM, styling changes based on isSticky */}
            <div className="hidden md:flex items-center" style={isSticky ? { height: '56px', padding: '0 24px' } : undefined}>
              {/* Logo — only in sticky */}
              {isSticky && (
                <a href={lang === 'ru' ? '/ru/' : '/'} className="text-white font-bold text-sm shrink-0" style={{ letterSpacing: '0.12em' }}>BORN TO BE</a>
              )}

              {/* Wrapper: capsule in sticky, full-width in hero */}
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
                const hasSecondPhoto = room.photos.length > 1

                return (
                  <div key={room.id}
                    className="fade-up cursor-pointer flex flex-col group relative"
                    style={{ background: '#FFFFFF', border: '2px solid #141414', boxShadow: '4px 4px 0 #141414', transitionDelay: `${i*0.08}s`, transition: 'box-shadow 0.4s ease, transform 0.4s ease' }}
                    onClick={() => { setModalRoom(room); setModalNights(nights); setActivePhoto(0); setBookingStep('details'); setBookingName(''); setBookingContact(''); setModalCheckIn(searchParams?.checkIn ?? null); setModalCheckOut(searchParams?.checkOut ?? null); document.body.style.overflow = 'hidden' }}
                    onMouseEnter={e => { e.currentTarget.style.boxShadow = '6px 6px 0 #C8965A'; e.currentTarget.style.transform = 'translate(-2px, -2px)' }}
                    onMouseLeave={e => { e.currentTarget.style.boxShadow = '4px 4px 0 #141414'; e.currentTarget.style.transform = 'none' }}
                  >
                    {/* Gold top line — appears on hover */}
                    <div className="absolute top-[-2px] left-[-2px] right-[-2px] h-[3px] z-10 transition-transform duration-500 origin-left scale-x-0 group-hover:scale-x-100" style={{ background: '#C8965A' }} />

                    {/* Photo with hover crossfade to second image */}
                    <div className="overflow-hidden relative">
                      <div className="relative w-full h-full card-photo-tall">
                        <img src={room.photos[0]} alt={name} loading="lazy"
                          className="absolute inset-0 w-full h-full object-cover transition-[transform,opacity] duration-700 ease-out group-hover:scale-105 group-hover:opacity-0" />
                        {hasSecondPhoto && (
                          <img src={room.photos[1]} alt={`${name} 2`} loading="lazy"
                            className="absolute inset-0 w-full h-full object-cover transition-[transform,opacity] duration-700 ease-out scale-105 opacity-0 group-hover:scale-100 group-hover:opacity-100" />
                        )}
                      </div>
                      {/* Photo count badge */}
                      <div className="absolute bottom-3 right-3 flex items-center gap-1.5 px-2.5 py-1" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="0"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
                        <span className="text-white text-[11px] font-medium">{room.photos.length}</span>
                      </div>
                      {/* Price badge on photo */}
                      <div className="absolute top-0 left-0 px-3 py-1.5" style={{ background: '#C8965A' }}>
                        <span className="text-[12px] font-bold text-white tracking-wide">${price.perNight}<span className="font-normal text-white/70 text-[10px] ml-0.5">{price.isMonthly ? '/mo' : '/night'}</span></span>
                      </div>
                    </div>

                    <div className="p-6 flex-1 flex flex-col justify-between">
                      <div>
                        <p className="text-[11px] font-semibold uppercase mb-3" style={{ letterSpacing: '0.12em', color: '#C8965A' }}>{typeLabel}</p>
                        <h3 className="text-[20px] font-bold uppercase mb-2" style={{ letterSpacing: '0.04em', color: '#141414' }}>{name}</h3>
                        <p className="text-[12px] uppercase mb-4" style={{ letterSpacing: '0.08em', color: '#5C5C5C' }}>{features.join(' \u00b7 ')}</p>
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
                          <div className="flex items-center gap-2 transition-colors duration-300 group-hover:text-[#C8965A]"
                            style={{ color: '#141414' }}>
                            <span className="text-[12px] font-semibold uppercase" style={{ letterSpacing: '0.1em' }}>{t.booking.viewDetails}</span>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="transition-transform duration-300 group-hover:translate-x-1"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                          </div>
                          {/* Guest capacity */}
                          <div className="flex items-center gap-1">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5C5C5C" strokeWidth="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                            <span className="text-[11px]" style={{ color: '#5C5C5C' }}>{room.maxGuests}</span>
                          </div>
                        </div>
                      </div>
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
        const mNights = modalCheckIn && modalCheckOut ? getNights(modalCheckIn, modalCheckOut) : modalNights
        const price = getPrice(modalRoom, mNights)
        const name = lang === 'ru' ? modalRoom.nameRu : modalRoom.name
        const floor = lang === 'ru' ? modalRoom.floorRu : modalRoom.floor
        const view = lang === 'ru' ? modalRoom.viewRu : modalRoom.view
        const kitchenText = modalRoom.kitchen ? t.rooms.kitchenYes : t.rooms.kitchenNo
        const mNightsLabel = mNights === 1 ? t.rooms.night : t.rooms.nights
        const fmtOpts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }
        const ciFmt = modalCheckIn?.toLocaleDateString('en-GB', fmtOpts) ?? ''
        const coFmt = modalCheckOut?.toLocaleDateString('en-GB', fmtOpts) ?? ''
        const closeModal = () => { setModalRoom(null); setBookingStep('details'); document.body.style.overflow = '' }

        return (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.7)' }}
            onClick={e => { if (e.target === e.currentTarget) closeModal() }}
          >
            <div className="bg-white max-w-[1100px] w-full max-h-[90vh] overflow-y-auto relative">
              <button onClick={closeModal}
                className="absolute top-4 right-4 md:top-6 md:right-6 z-10 w-10 h-10 flex items-center justify-center cursor-pointer transition-colors duration-300"
                style={{ background: '#141414', color: '#F7F5F2' }}
                onMouseEnter={e => e.currentTarget.style.background = '#C8965A'}
                onMouseLeave={e => e.currentTarget.style.background = '#141414'}
                aria-label="Close"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
              <div className="flex flex-col md:flex-row">
                {/* Gallery with arrows */}
                <div className="md:w-[55%] relative">
                  <div className="overflow-hidden relative" style={{ aspectRatio: '4/3' }}>
                    <img src={modalRoom.photos[activePhoto]} alt={name} className="w-full h-full object-cover" />
                    {/* Prev/Next arrows */}
                    {modalRoom.photos.length > 1 && (
                      <>
                        <button onClick={e => { e.stopPropagation(); setActivePhoto(p => p === 0 ? modalRoom.photos.length - 1 : p - 1) }}
                          className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center cursor-pointer transition-colors duration-200"
                          style={{ background: 'rgba(0,0,0,0.5)', color: 'white' }}
                          onMouseEnter={e => e.currentTarget.style.background = '#C8965A'}
                          onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.5)'}
                          aria-label="Previous photo"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
                        </button>
                        <button onClick={e => { e.stopPropagation(); setActivePhoto(p => p === modalRoom.photos.length - 1 ? 0 : p + 1) }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center cursor-pointer transition-colors duration-200"
                          style={{ background: 'rgba(0,0,0,0.5)', color: 'white' }}
                          onMouseEnter={e => e.currentTarget.style.background = '#C8965A'}
                          onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.5)'}
                          aria-label="Next photo"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
                        </button>
                        {/* Counter */}
                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 text-[12px] font-medium text-white" style={{ background: 'rgba(0,0,0,0.5)' }}>
                          {activePhoto + 1} / {modalRoom.photos.length}
                        </div>
                      </>
                    )}
                  </div>
                  <div className="flex gap-2 p-4 overflow-x-auto">
                    {modalRoom.photos.map((photo, i) => (
                      <img key={i} src={photo} alt={`${name} ${i+1}`}
                        className="w-20 h-14 object-cover shrink-0 cursor-pointer transition-opacity duration-200"
                        style={{ opacity: i === activePhoto ? 1 : 0.5, border: i === activePhoto ? '2px solid #C8965A' : '2px solid transparent' }}
                        onClick={() => setActivePhoto(i)} />
                    ))}
                  </div>
                </div>

                {/* Right panel — steps */}
                <div className="md:w-[45%] p-6 md:p-8 flex flex-col">
                  <h3 className="text-xl md:text-2xl font-bold uppercase" style={{ letterSpacing: '0.04em' }}>{name}</h3>
                  <div className="w-10 h-[2px] mt-3 mb-6" style={{ background: '#141414' }} />

                  {/* Step: Details */}
                  {bookingStep === 'details' && (
                    <>
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

                      {/* Dynamic pricing with date adjustment */}
                      <div className="p-5 mb-6" style={{ background: '#EDEAE6' }}>
                        <div className="flex items-baseline justify-between mb-2">
                          <div><span className="text-2xl font-bold">${price.perNight}</span><span className="text-sm" style={{ color: '#5C5C5C' }}> {price.isMonthly ? t.rooms.perMonth : t.rooms.perNight}</span></div>
                          <div className="text-right"><span className="text-sm" style={{ color: '#5C5C5C' }}>{t.rooms.total} </span><span className="font-bold">${price.total.toLocaleString()}</span></div>
                        </div>
                        <div className="text-sm" style={{ color: '#5C5C5C' }}>{ciFmt} &rarr; {coFmt} &middot; {mNights} {mNightsLabel}</div>
                        {/* Mini date inputs — Flatpickr */}
                        <div className="flex gap-3 mt-3 pt-3" style={{ borderTop: '1px solid #D9D5D0' }}>
                          <div className="flex-1">
                            <label className="block text-[10px] font-semibold uppercase mb-1" style={{ letterSpacing: '0.1em', color: '#5C5C5C' }}>{t.booking.checkIn}</label>
                            <input ref={modalCheckInRef} type="text"
                              className="w-full bg-white text-[13px] px-2 py-1.5 cursor-pointer focus:outline-none modal-flatpickr"
                              style={{ border: '1px solid #D9D5D0', color: '#141414' }}
                              placeholder="Select" readOnly />
                          </div>
                          <div className="flex-1">
                            <label className="block text-[10px] font-semibold uppercase mb-1" style={{ letterSpacing: '0.1em', color: '#5C5C5C' }}>{t.booking.checkOut}</label>
                            <input ref={modalCheckOutRef} type="text"
                              className="w-full bg-white text-[13px] px-2 py-1.5 cursor-pointer focus:outline-none modal-flatpickr"
                              style={{ border: '1px solid #D9D5D0', color: '#141414' }}
                              placeholder="Select" readOnly />
                          </div>
                        </div>
                      </div>

                      <div className="flex-1" />
                      <button
                        onClick={() => { setBookingStep('form'); setBookingId(generateBookingId()) }}
                        className="w-full text-[13px] font-semibold uppercase py-4 cursor-pointer transition-colors duration-300 text-center"
                        style={{ background: '#C8965A', color: '#F7F5F2', letterSpacing: '0.1em' }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#141414' }}
                        onMouseLeave={e => { e.currentTarget.style.background = '#C8965A' }}
                      >
                        {t.rooms.bookNow}
                      </button>
                    </>
                  )}

                  {/* Step: Booking form */}
                  {bookingStep === 'form' && (
                    <>
                      <div className="p-4 mb-6 text-[13px]" style={{ background: '#EDEAE6' }}>
                        <span className="font-semibold">${price.perNight}</span> {price.isMonthly ? t.rooms.perMonth : t.rooms.perNight} &middot; {ciFmt} &rarr; {coFmt} &middot; <span className="font-semibold">${price.total.toLocaleString()}</span> {t.rooms.totalLabel}
                      </div>

                      <div className="space-y-4 mb-6">
                        <div>
                          <label className="block text-[11px] font-semibold uppercase mb-2" style={{ letterSpacing: '0.1em', color: '#5C5C5C' }}>{t.rooms.yourName}</label>
                          <input type="text" value={bookingName} onChange={e => setBookingName(e.target.value)}
                            className="w-full text-[14px] px-4 py-3 focus:outline-none"
                            style={{ border: '2px solid #141414', background: 'white' }}
                            placeholder={t.rooms.yourName} />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold uppercase mb-2" style={{ letterSpacing: '0.1em', color: '#5C5C5C' }}>{t.rooms.yourContact}</label>
                          <input type="text" value={bookingContact} onChange={e => setBookingContact(e.target.value)}
                            className="w-full text-[14px] px-4 py-3 focus:outline-none"
                            style={{ border: '2px solid #141414', background: 'white' }}
                            placeholder={t.rooms.yourContact} />
                        </div>
                      </div>

                      <div className="p-3 mb-6 text-center text-[12px] font-medium" style={{ background: '#141414', color: '#C8965A' }}>
                        {t.rooms.bookingId}: {bookingId}
                      </div>

                      <div className="flex-1" />

                      <button
                        onClick={() => { if (bookingName.trim() && bookingContact.trim()) setBookingStep('send') }}
                        className="w-full text-[13px] font-semibold uppercase py-4 cursor-pointer transition-colors duration-300 text-center mb-3"
                        style={{ background: bookingName.trim() && bookingContact.trim() ? '#C8965A' : '#D9D5D0', color: '#F7F5F2', letterSpacing: '0.1em' }}
                        onMouseEnter={e => { if (bookingName.trim() && bookingContact.trim()) e.currentTarget.style.background = '#141414' }}
                        onMouseLeave={e => { if (bookingName.trim() && bookingContact.trim()) e.currentTarget.style.background = '#C8965A' }}
                      >
                        {lang === 'ru' ? 'ДАЛЕЕ' : 'CONTINUE'}
                      </button>
                      <button onClick={() => setBookingStep('details')}
                        className="w-full text-[12px] font-medium uppercase py-2 cursor-pointer text-center"
                        style={{ color: '#5C5C5C', letterSpacing: '0.08em' }}>
                        {t.rooms.back}
                      </button>
                    </>
                  )}

                  {/* Step: Choose messenger */}
                  {bookingStep === 'send' && (
                    <>
                      <div className="p-4 mb-4 text-[13px]" style={{ background: '#EDEAE6' }}>
                        <div className="font-semibold mb-1">{name}</div>
                        <div>{ciFmt} &rarr; {coFmt} &middot; {mNights} {mNightsLabel} &middot; ${price.total.toLocaleString()}</div>
                      </div>

                      <div className="p-3 mb-4 text-[12px]" style={{ background: '#141414', color: '#C8965A' }}>
                        <div className="font-semibold text-center">{t.rooms.bookingId}: {bookingId}</div>
                      </div>

                      <div className="mb-4 text-[13px]" style={{ color: '#5C5C5C' }}>
                        <div>{bookingName} &middot; {bookingContact}</div>
                      </div>

                      <p className="text-[11px] font-semibold uppercase mb-3" style={{ letterSpacing: '0.1em', color: '#5C5C5C' }}>{t.rooms.sendVia}</p>
                      <div className="flex flex-col gap-3">
                        {(['telegram', 'whatsapp', 'instagram'] as const).map(platform => (
                          <button key={platform} onClick={() => handleBook(platform)}
                            className="w-full text-[13px] font-semibold uppercase py-4 flex items-center justify-center gap-3 cursor-pointer transition-colors duration-300"
                            style={{ border: '2px solid #141414', color: '#141414', letterSpacing: '0.08em', background: 'transparent' }}
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

                      <button onClick={() => setBookingStep('form')}
                        className="w-full text-[12px] font-medium uppercase py-2 mt-3 cursor-pointer text-center"
                        style={{ color: '#5C5C5C', letterSpacing: '0.08em' }}>
                        {t.rooms.back}
                      </button>
                    </>
                  )}
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
      setDate: (date: Date | Date[], triggerChange?: boolean) => void
      set: (key: string, value: unknown) => void
      open: () => void
      close: () => void
      formatDate: (date: Date, format: string) => string
      calendarContainer: HTMLElement
      destroy: () => void
    }
  }
}
