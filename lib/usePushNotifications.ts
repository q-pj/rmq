import { useEffect } from 'react'

export function usePushNotifications() {
  useEffect(() => {
    async function registerPush() {
      console.log('Service worker supported:', 'serviceWorker' in navigator)
      console.log('PushManager supported:', 'PushManager' in window)

      if (!('serviceWorker' in navigator) || !('PushManager' in window)) return

      const registration = await navigator.serviceWorker.register('/sw.js')
      console.log('Service worker registered:', registration)

      const permission = await Notification.requestPermission()
      console.log('Notification permission:', permission)
      if (permission !== 'granted') return

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      })
      console.log('Push subscription:', subscription)

      const { endpoint, keys } = subscription.toJSON() as {
        endpoint: string
        keys: { p256dh: string; auth: string }
      }

      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint, keys }),
      })
    console.log('Subscribe response:', await response.json())
    }
    
    registerPush()
  }, [])
}