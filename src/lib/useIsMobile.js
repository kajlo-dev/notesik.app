import { useEffect, useState } from 'react'

function computeIsMobile() {
  const narrow = window.innerWidth < 900
  const touch = window.matchMedia('(pointer: coarse)').matches
  return narrow && touch
}

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => computeIsMobile())

  useEffect(() => {
    const handler = () => setIsMobile(computeIsMobile())
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  return isMobile
}
