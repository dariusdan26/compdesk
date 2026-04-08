'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'

type State =
  | 'unsupported'
  | 'ios-needs-install'
  | 'denied'
  | 'idle'           // permission default, not subscribed
  | 'subscribing'    // in-flight
  | 'subscribed'     // permission granted + active subscription
  | 'unsubscribing'

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; ++i) out[i] = raw.charCodeAt(i)
  return out
}

function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !('MSStream' in window)
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  // iOS uses navigator.standalone; modern browsers use display-mode media query
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

export function PushNotificationManager() {
  const { status } = useSession()
  const [state, setState] = useState<State>('idle')
  const [error, setError] = useState<string | null>(null)
  const [dismissed, setDismissed] = useState(false)

  // Initialize state once we know the user is authenticated
  useEffect(() => {
    if (status !== 'authenticated') return
    if (typeof window === 'undefined') return

    const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
    if (!supported) {
      if (isIOS() && !isStandalone()) setState('ios-needs-install')
      else setState('unsupported')
      return
    }

    if (Notification.permission === 'denied') {
      setState('denied')
      return
    }

    // Check if already subscribed
    navigator.serviceWorker.getRegistration('/sw.js').then(async (reg) => {
      if (!reg) {
        setState(Notification.permission === 'granted' ? 'idle' : 'idle')
        return
      }
      const sub = await reg.pushManager.getSubscription()
      setState(sub ? 'subscribed' : 'idle')
    })
  }, [status])

  const enable = async () => {
    setError(null)
    setState('subscribing')
    try {
      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!publicKey) {
        throw new Error('Push notifications are not configured (missing VAPID public key).')
      }

      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setState(permission === 'denied' ? 'denied' : 'idle')
        return
      }

      const reg = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready

      let sub = await reg.pushManager.getSubscription()
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
        })
      }

      const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } }
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
      })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(`Server rejected subscription: ${text}`)
      }
      setState('subscribed')
    } catch (e) {
      console.error('[push] enable failed:', e)
      setError(e instanceof Error ? e.message : 'Failed to enable notifications')
      setState('idle')
    }
  }

  const disable = async () => {
    setError(null)
    setState('unsubscribing')
    try {
      const reg = await navigator.serviceWorker.getRegistration('/sw.js')
      const sub = await reg?.pushManager.getSubscription()
      if (sub) {
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        }).catch(() => {})
        await sub.unsubscribe()
      }
      setState('idle')
    } catch (e) {
      console.error('[push] disable failed:', e)
      setError(e instanceof Error ? e.message : 'Failed to disable notifications')
      setState('subscribed')
    }
  }

  if (status !== 'authenticated' || dismissed) return null
  if (state === 'unsupported') return null

  // Shared styles
  const containerStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: 16,
    right: 16,
    zIndex: 9999,
    background: '#FFFFFF',
    border: '1px solid #D0DCE8',
    borderRadius: 12,
    padding: '10px 14px',
    boxShadow: '0 8px 24px rgba(27, 58, 92, 0.12)',
    fontSize: 13,
    color: '#1B3A5C',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    maxWidth: 320,
  }
  const buttonStyle: React.CSSProperties = {
    background: '#1B3A5C',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: 8,
    padding: '6px 12px',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
  }
  const linkButtonStyle: React.CSSProperties = {
    background: 'transparent',
    color: '#6B7A8D',
    border: 'none',
    fontSize: 12,
    cursor: 'pointer',
    padding: '4px 6px',
  }

  if (state === 'ios-needs-install') {
    return (
      <div style={containerStyle}>
        <span>📱 To enable notifications: tap Share → Add to Home Screen</span>
        <button style={linkButtonStyle} onClick={() => setDismissed(true)}>×</button>
      </div>
    )
  }

  if (state === 'denied') {
    return (
      <div style={containerStyle}>
        <span>🔕 Notifications blocked — enable in your browser settings</span>
        <button style={linkButtonStyle} onClick={() => setDismissed(true)}>×</button>
      </div>
    )
  }

  if (state === 'subscribed') {
    return (
      <div style={containerStyle}>
        <span>🔔 Notifications on</span>
        <button style={linkButtonStyle} onClick={disable}>Turn off</button>
      </div>
    )
  }

  if (state === 'subscribing' || state === 'unsubscribing') {
    return (
      <div style={containerStyle}>
        <span>{state === 'subscribing' ? 'Enabling…' : 'Disabling…'}</span>
      </div>
    )
  }

  // idle
  return (
    <div style={containerStyle}>
      <span>🔔 Get notified instantly</span>
      <button style={buttonStyle} onClick={enable}>Enable</button>
      <button style={linkButtonStyle} onClick={() => setDismissed(true)}>Later</button>
      {error && <div style={{ color: '#DC2626', fontSize: 11, width: '100%' }}>{error}</div>}
    </div>
  )
}
