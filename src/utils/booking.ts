interface BookingParams {
  roomName: string
  checkIn: string
  checkOut: string
  guests: number
  children: number
  messageTemplate: string
}

export function getBookingMessage(params: BookingParams): string {
  const childText = params.children > 0 ? `, ${params.children} child(ren)` : ''
  return params.messageTemplate
    .replace('{room}', params.roomName)
    .replace('{dates}', `${params.checkIn} — ${params.checkOut}`)
    .replace('{guests}', String(params.guests))
    .replace('{children}', childText)
}

export function bookVia(platform: 'telegram' | 'whatsapp' | 'instagram', message: string): void {
  const encoded = encodeURIComponent(message)

  const urls: Record<string, string> = {
    telegram: `https://t.me/borntobe_complex?text=${encoded}`,
    whatsapp: `https://wa.me/6281234567890?text=${encoded}`,
    instagram: 'https://ig.me/m/borntobe.complex',
  }

  window.open(urls[platform], '_blank')
}
