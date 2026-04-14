"use client"

import { useEffect } from "react"

export function RemoveServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return

    navigator.serviceWorker
      .getRegistrations()
      .then((registrations) => {
        registrations.forEach((registration) => {
          registration.unregister()
        })
      })
      .catch(() => {
        // Ignore cleanup failures; the app should keep loading normally.
      })
  }, [])

  return null
}
