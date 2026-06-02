import { useState, useEffect } from 'react'

export const useStageSize = () => {
  const [size, setSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  })

  useEffect(() => {
    const handler = () =>
      setSize({ width: window.innerWidth, height: window.innerHeight })

    window.addEventListener('resize', handler)
    // موبایل: keyboard باز/بسته میشه
    window.addEventListener('orientationchange', handler)

    return () => {
      window.removeEventListener('resize', handler)
      window.removeEventListener('orientationchange', handler)
    }
  }, [])

  return size
}