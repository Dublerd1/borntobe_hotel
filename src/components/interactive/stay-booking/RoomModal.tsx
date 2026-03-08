import { useState, useEffect, useRef } from 'react'
import type { Room } from '@data/rooms'
import type { Translations } from '@data/translations/en'
import type { Lang } from '@utils/i18n'
import { getPrice, getNights } from '@utils/pricing'
import { getBookingMessage, bookVia } from '@utils/booking'
import type { SearchParams, BookingStep } from './types'
import PhotoGallery from './modal/PhotoGallery'
import RoomDetails from './modal/RoomDetails'
import BookingForm from './modal/BookingForm'
import MessengerPicker from './modal/MessengerPicker'

interface Props {
  room: Room
  lang: Lang
  t: Translations
  searchParams: SearchParams | null
  onClose: () => void
}

export default function RoomModal({ room, lang, t, searchParams, onClose }: Props) {
  const [activePhoto, setActivePhoto] = useState(0)
  const [bookingStep, setBookingStep] = useState<BookingStep>('details')
  const [bookingName, setBookingName] = useState('')
  const [bookingContact, setBookingContact] = useState('')
  const [bookingId, setBookingId] = useState('')
  const [modalCheckIn, setModalCheckIn] = useState<Date | null>(searchParams?.checkIn ?? null)
  const [modalCheckOut, setModalCheckOut] = useState<Date | null>(searchParams?.checkOut ?? null)
  const modalCheckInRef = useRef<HTMLInputElement>(null)
  const modalCheckOutRef = useRef<HTMLInputElement>(null)

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  // Init Flatpickr — single range calendar
  useEffect(() => {
    const init = async () => {
      const flatpickr = (await import('flatpickr')).default
      const existingCI = (modalCheckInRef.current as any)?._flatpickr
      if (existingCI) existingCI.destroy()
      const existingCO = (modalCheckOutRef.current as any)?._flatpickr
      if (existingCO) existingCO.destroy()

      if (!modalCheckInRef.current) return
      const defaults: Date[] = []
      if (modalCheckIn) defaults.push(modalCheckIn)
      if (modalCheckIn && modalCheckOut) defaults.push(modalCheckOut)

      const nightsWord = (n: number) => n === 1 ? t.rooms.night : t.rooms.nights
      const calcNights = (start: Date, end: Date) => Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000))
      const updateCounter = (fp: any, endDate?: Date) => {
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
          const header = document.createElement('div')
          header.className = 'calendar-header-custom'
          header.innerHTML = '<div class="calendar-phase-indicator">' + t.booking.checkIn + '</div><div class="calendar-nights-counter"></div>'
          fp.calendarContainer.insertBefore(header, fp.calendarContainer.firstChild)
          setTimeout(() => {
            if (fp.selectedDates.length >= 1 && modalCheckInRef.current) modalCheckInRef.current.value = fp.formatDate(fp.selectedDates[0], 'd M')
            if (fp.selectedDates.length === 2 && modalCheckOutRef.current) modalCheckOutRef.current.value = fp.formatDate(fp.selectedDates[1], 'd M')
          }, 0)
          fp.calendarContainer.addEventListener('mouseover', (e: MouseEvent) => {
            if (fp.selectedDates.length !== 1) return
            const dayEl = (e.target as HTMLElement).closest('.flatpickr-day') as any
            if (dayEl?.dateObj && dayEl.dateObj > fp.selectedDates[0]) updateCounter(fp, dayEl.dateObj)
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
            if (indicator) { indicator.textContent = t.booking.checkOut; indicator.classList.add('phase-checkout') }
            if (modalCheckOutRef.current) modalCheckOutRef.current.value = ''
          } else if (selectedDates.length === 2) {
            setModalCheckIn(selectedDates[0])
            setModalCheckOut(selectedDates[1])
            if (indicator) { indicator.textContent = t.booking.checkIn; indicator.classList.remove('phase-checkout') }
          }
          updateCounter(fp)
          setTimeout(() => {
            if (selectedDates.length >= 1 && modalCheckInRef.current) modalCheckInRef.current.value = fp.formatDate(selectedDates[0], 'd M')
            if (selectedDates.length === 2 && modalCheckOutRef.current) modalCheckOutRef.current.value = fp.formatDate(selectedDates[1], 'd M')
          }, 0)
        },
        onOpen(_: any, __: any, fp: any) {
          const indicator = fp.calendarContainer.querySelector('.calendar-phase-indicator')
          if (indicator) {
            const isCheckout = fp.selectedDates.length === 1
            indicator.textContent = isCheckout ? t.booking.checkOut : t.booking.checkIn
            indicator.classList.toggle('phase-checkout', isCheckout)
          }
          updateCounter(fp)
        },
      })

      modalCheckOutRef.current?.addEventListener('click', () => {
        (modalCheckInRef.current as any)?._flatpickr?.open()
      })
    }
    const timer = setTimeout(init, 50)
    return () => clearTimeout(timer)
  }, [])

  const mNights = modalCheckIn && modalCheckOut ? getNights(modalCheckIn, modalCheckOut) : 1
  const price = getPrice(room, mNights)
  const name = lang === 'ru' ? room.nameRu : room.name
  const nightsLabel = mNights === 1 ? t.rooms.night : t.rooms.nights
  const fmtOpts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }
  const ciFmt = modalCheckIn?.toLocaleDateString('en-GB', fmtOpts) ?? ''
  const coFmt = modalCheckOut?.toLocaleDateString('en-GB', fmtOpts) ?? ''

  const handleBook = (platform: 'telegram' | 'whatsapp' | 'instagram') => {
    if (!modalCheckIn || !modalCheckOut) return
    const fmtFull: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }
    const msg = getBookingMessage({
      roomName: name,
      checkIn: modalCheckIn.toLocaleDateString('en-GB', fmtFull),
      checkOut: modalCheckOut.toLocaleDateString('en-GB', fmtFull),
      guests: searchParams?.guests ?? 2,
      children: searchParams?.children ?? 0,
      messageTemplate: t.rooms.bookMsg,
      id: bookingId,
      name: bookingName,
      contact: bookingContact,
    })
    bookVia(platform, msg)
  }

  const priceSummary = `$${price.perNight} ${price.isMonthly ? t.rooms.perMonth : t.rooms.perNight} \u00b7 ${ciFmt} \u2192 ${coFmt} \u00b7 $${price.total.toLocaleString()} ${t.rooms.totalLabel}`
  const roomSummary = `${name}\n${ciFmt} \u2192 ${coFmt} \u00b7 ${mNights} ${nightsLabel} \u00b7 $${price.total.toLocaleString()}`

  return (
    <div className="fixed inset-0 z-[70] flex items-end md:items-center justify-center md:p-4"
      style={{ background: 'rgba(0,0,0,0.7)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white w-full md:max-w-[1100px] max-h-[95vh] md:max-h-[90vh] overflow-y-auto relative">
        <button onClick={onClose}
          className="absolute top-3 right-3 md:top-6 md:right-6 z-10 w-10 h-10 flex items-center justify-center cursor-pointer transition-colors duration-300"
          style={{ background: '#141414', color: '#F7F5F2' }}
          onMouseEnter={e => e.currentTarget.style.background = '#C8965A'}
          onMouseLeave={e => e.currentTarget.style.background = '#141414'}
          aria-label="Close"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
        </button>
        <div className="flex flex-col md:flex-row">
          <PhotoGallery room={room} name={name} activePhoto={activePhoto} setActivePhoto={setActivePhoto} />

          <div className="md:w-[45%] p-5 md:p-8 flex flex-col">
            <h3 className="text-lg md:text-2xl font-bold uppercase" style={{ letterSpacing: '0.04em' }}>{name}</h3>
            <div className="w-10 h-[2px] mt-3 mb-5 md:mb-6" style={{ background: '#141414' }} />

            {bookingStep === 'details' && (
              <RoomDetails room={room} lang={lang} t={t} checkIn={modalCheckIn} checkOut={modalCheckOut}
                modalCheckInRef={modalCheckInRef} modalCheckOutRef={modalCheckOutRef}
                onStepChange={setBookingStep} onBookingIdSet={setBookingId} />
            )}
            {bookingStep === 'form' && (
              <BookingForm lang={lang} t={t} priceSummary={priceSummary} bookingId={bookingId}
                bookingName={bookingName} bookingContact={bookingContact}
                onNameChange={setBookingName} onContactChange={setBookingContact}
                onStepChange={setBookingStep} />
            )}
            {bookingStep === 'send' && (
              <MessengerPicker t={t} roomSummary={roomSummary} bookingId={bookingId}
                contactInfo={`${bookingName} \u00b7 ${bookingContact}`}
                onBook={handleBook} onStepChange={setBookingStep} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
