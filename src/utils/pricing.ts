import type { Room } from '@data/rooms'

export interface PriceResult {
  perNight: number
  total: number
  isMonthly?: boolean
  perMonth?: number
}

export function getNights(checkIn: Date, checkOut: Date): number {
  return Math.max(1, Math.round((checkOut.getTime() - checkIn.getTime()) / 864e5))
}

export function getPrice(room: Room, nights: number): PriceResult {
  const tier = room.prices.find(p => nights >= p.min && nights <= p.max)

  if (!tier) {
    return {
      perNight: room.prices[0].perNight ?? 0,
      total: room.prices[0].perNight ?? 0,
    }
  }

  if (tier.perMonth) {
    return {
      perNight: Math.round(tier.perMonth / 30),
      total: tier.perMonth * Math.ceil(nights / 30),
      isMonthly: true,
      perMonth: tier.perMonth,
    }
  }

  return {
    perNight: tier.perNight ?? 0,
    total: (tier.perNight ?? 0) * nights,
  }
}
