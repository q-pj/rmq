import { useEffect } from 'react'

export function usePushNotifications() {
  useEffect(() => {
    async function registerPush() {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) return

      const registration = await navigator.serviceWorker.register('/sw.js')

      const permission = await Notification.requestPermission()
      if (permission !== 'granted') return

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      })

      const { endpoint, keys } = subscription.toJSON() as {
        endpoint: string
        keys: { p256dh: string; auth: string }
      }

      await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint, keys }),
      })
    }

    registerPush()
  }, [])
}