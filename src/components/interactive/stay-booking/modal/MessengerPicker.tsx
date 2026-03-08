import type { Translations } from '@data/translations/en'
import type { BookingStep } from '../types'

interface Props {
  t: Translations
  roomSummary: string
  bookingId: string
  contactInfo: string
  onBook: (platform: 'telegram' | 'whatsapp' | 'instagram') => void
  onStepChange: (step: BookingStep) => void
}

const icons = {
  telegram: <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161c-.18 1.897-.962 6.502-1.359 8.627-.168.9-.5 1.201-.82 1.23-.697.064-1.226-.461-1.901-.903-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.492-1.302.48-.429-.013-1.252-.242-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.831-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635.099-.002.321.023.465.141.12.098.153.229.168.332.016.103.036.327.02.504z" /></svg>,
  whatsapp: <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.274.072.376-.043c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.045.072.045.419-.1.824zm-3.423-11.416c-5.523 0-10 4.477-10 10 0 1.76.46 3.478 1.335 4.992l-1.42 5.184 5.32-1.394c1.44.788 3.09 1.218 4.765 1.218 5.523 0 10-4.477 10-10s-4.477-10-10-10z" /></svg>,
  instagram: <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" /></svg>,
}

export default function MessengerPicker({ t, roomSummary, bookingId, contactInfo, onBook, onStepChange }: Props) {
  return (
    <>
      <div className="p-4 mb-4 text-[13px]" style={{ background: '#EDEAE6' }}>
        {roomSummary}
      </div>

      <div className="p-3 mb-4 text-[12px]" style={{ background: '#141414', color: '#C8965A' }}>
        <div className="font-semibold text-center">{t.rooms.bookingId}: {bookingId}</div>
      </div>

      <div className="mb-4 text-[13px]" style={{ color: '#5C5C5C' }}>
        <div>{contactInfo}</div>
      </div>

      <p className="text-[11px] font-semibold uppercase mb-3" style={{ letterSpacing: '0.1em', color: '#5C5C5C' }}>{t.rooms.sendVia}</p>
      <div className="flex flex-col gap-3">
        {(['telegram', 'whatsapp', 'instagram'] as const).map(platform => (
          <button key={platform} onClick={() => onBook(platform)}
            className="w-full text-[13px] font-semibold uppercase py-4 flex items-center justify-center gap-3 cursor-pointer transition-colors duration-300"
            style={{ border: '2px solid #141414', color: '#141414', letterSpacing: '0.08em', background: 'transparent' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#C8965A'; e.currentTarget.style.color = '#F7F5F2'; e.currentTarget.style.borderColor = '#C8965A' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#141414'; e.currentTarget.style.borderColor = '#141414' }}
          >
            {icons[platform]}
            {platform.charAt(0).toUpperCase() + platform.slice(1)}
          </button>
        ))}
      </div>

      <button onClick={() => onStepChange('form')}
        className="w-full text-[12px] font-medium uppercase py-2 mt-3 cursor-pointer text-center"
        style={{ color: '#5C5C5C', letterSpacing: '0.08em' }}>
        {t.rooms.back}
      </button>
    </>
  )
}
