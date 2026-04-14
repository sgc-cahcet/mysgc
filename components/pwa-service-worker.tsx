"use client"

import { useEffect } from "react"

export function PwaServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator) || window.location.protocol !== "https:") {
      if (window.location.hostname !== "localhost") return
    }

    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.warn("Service worker registration failed:", error)
    })
  }, [])

  return null
}
