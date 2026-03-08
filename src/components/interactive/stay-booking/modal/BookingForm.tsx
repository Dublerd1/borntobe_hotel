import type { Translations } from '@data/translations/en'
import type { Lang } from '@utils/i18n'
import type { BookingStep } from '../types'

interface Props {
  lang: Lang
  t: Translations
  priceSummary: string
  bookingId: string
  bookingName: string
  bookingContact: string
  onNameChange: (v: string) => void
  onContactChange: (v: string) => void
  onStepChange: (step: BookingStep) => void
}

export default function BookingForm({ lang, t, priceSummary, bookingId, bookingName, bookingContact, onNameChange, onContactChange, onStepChange }: Props) {
  const canContinue = bookingName.trim() && bookingContact.trim()

  return (
    <>
      <div className="p-4 mb-6 text-[13px]" style={{ background: '#EDEAE6' }}>
        {priceSummary}
      </div>

      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-[11px] font-semibold uppercase mb-2" style={{ letterSpacing: '0.1em', color: '#5C5C5C' }}>{t.rooms.yourName}</label>
          <input type="text" value={bookingName} onChange={e => onNameChange(e.target.value)}
            className="w-full text-[14px] px-4 py-3 focus:outline-none"
            style={{ border: '2px solid #141414', background: 'white' }}
            placeholder={t.rooms.yourName} />
        </div>
        <div>
          <label className="block text-[11px] font-semibold uppercase mb-2" style={{ letterSpacing: '0.1em', color: '#5C5C5C' }}>{t.rooms.yourContact}</label>
          <input type="text" value={bookingContact} onChange={e => onContactChange(e.target.value)}
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
        onClick={() => { if (canContinue) onStepChange('send') }}
        className="w-full text-[13px] font-semibold uppercase py-4 cursor-pointer transition-colors duration-300 text-center mb-3"
        style={{ background: canContinue ? '#141414' : '#D9D5D0', color: '#F7F5F2', letterSpacing: '0.1em' }}
        onMouseEnter={e => { if (canContinue) e.currentTarget.style.background = '#C8965A' }}
        onMouseLeave={e => { if (canContinue) e.currentTarget.style.background = '#141414' }}
      >
        {lang === 'ru' ? 'ДАЛЕЕ' : 'CONTINUE'}
      </button>
      <button onClick={() => onStepChange('details')}
        className="w-full text-[12px] font-medium uppercase py-2 cursor-pointer text-center"
        style={{ color: '#5C5C5C', letterSpacing: '0.08em' }}>
        {t.rooms.back}
      </button>
    </>
  )
}
