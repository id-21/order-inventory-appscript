'use client'

import { useState, useEffect } from 'react'

/**
 * Component that prompts users to install the PWA to their home screen
 * Shows different instructions for iOS vs Android/Desktop
 */
export function InstallPrompt() {
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showPrompt, setShowPrompt] = useState(false)

  useEffect(() => {
    // Detect iOS devices
    const userAgent = window.navigator.userAgent.toLowerCase()
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent) && !(window as any).MSStream

    setIsIOS(isIOSDevice)

    // Check if app is already installed (running in standalone mode)
    const isInstalled = window.matchMedia('(display-mode: standalone)').matches

    setIsStandalone(isInstalled)

    // Listen for beforeinstallprompt event (Chrome/Edge)
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowPrompt(true) // Show install button when prompt is available
    }

    window.addEventListener('beforeinstallprompt', handler)

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  /**
   * Handle install button click for Chrome/Edge
   */
  async function handleInstallClick() {
    if (!deferredPrompt) return

    // Show the browser's install prompt
    deferredPrompt.prompt()

    // Wait for the user's response
    const { outcome } = await deferredPrompt.userChoice

    console.log('[InstallPrompt] User response:', outcome)

    if (outcome === 'accepted') {
      console.log('[InstallPrompt] User accepted the install prompt')
    } else {
      console.log('[InstallPrompt] User dismissed the install prompt')
    }

    // Clear the deferred prompt
    setDeferredPrompt(null)
    setShowPrompt(false)
  }

  // Don't show anything if app is already installed
  if (isStandalone) {
    return null
  }

  return (
    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <div className="flex items-start gap-3">
        <span className="text-2xl">📱</span>
        <div className="flex-1">
          <h3 className="font-semibold text-blue-900 mb-1">Install App</h3>

          {/* Chrome/Edge install button */}
          {deferredPrompt && showPrompt && (
            <div className="mb-3">
              <button
                onClick={handleInstallClick}
                className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
              >
                Add to Home Screen
              </button>
            </div>
          )}

          {/* iOS-specific instructions */}
          {isIOS && !deferredPrompt && (
            <div className="text-sm text-blue-800 space-y-2">
              <p className="font-medium">To install this app on your iOS device:</p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>
                  Tap the Share button{' '}
                  <span role="img" aria-label="share icon" className="inline-block">
                    ⎋
                  </span>
                </li>
                <li>
                  Scroll down and tap "Add to Home Screen"{' '}
                  <span role="img" aria-label="plus icon" className="inline-block">
                    ➕
                  </span>
                </li>
                <li>Tap "Add" to confirm</li>
              </ol>
            </div>
          )}

          {/* Generic message when install prompt not available */}
          {!isIOS && !deferredPrompt && (
            <p className="text-sm text-blue-800">
              Install this app for quick access and offline support. Look for the install option in your browser menu.
            </p>
          )}

          {/* Benefits of installing */}
          <div className="mt-3 text-xs text-blue-700 space-y-1">
            <p className="font-medium">Benefits:</p>
            <ul className="list-disc list-inside ml-2 space-y-0.5">
              <li>Access from home screen</li>
              <li>Receive push notifications</li>
              <li>Faster loading times</li>
              <li>Works offline</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
