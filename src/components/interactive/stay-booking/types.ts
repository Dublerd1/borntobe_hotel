import type { Room } from '@data/rooms'
import type { Lang } from '@utils/i18n'
import type { Translations } from '@data/translations/en'

export interface SearchParams {
  checkIn: Date
  checkOut: Date
  guests: number
  children: number
  propertyType: string
}

export interface BookingProps {
  lang: Lang
  t: Translations
  rooms: Room[]
}

export type BookingStep = 'details' | 'form' | 'send'

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
