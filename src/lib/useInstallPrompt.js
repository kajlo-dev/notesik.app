import { useEffect, useState } from 'react'

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
}

// Safari na iOS nigdy nie wywołuje "beforeinstallprompt" i nie ma programowego API do
// instalacji - jedyna droga to ręczne "Udostępnij" -> "Dodaj do ekranu początkowego".
function isIOSSafari() {
  const ua = window.navigator.userAgent
  const isIOS = /iphone|ipad|ipod/i.test(ua)
  const isOtherIOSBrowser = /crios|fxios|edgios|opios/i.test(ua)
  return isIOS && !isOtherIOSBrowser
}

// Chrome/Edge/Android wywołują "beforeinstallprompt", gdy strona spełnia kryteria
// instalowalności (manifest, service worker, https) - niezależnie od tego, czy użytkownik
// wcześniej odinstalował appkę. Dzięki temu własny przycisk działa nawet wtedy, gdy
// przeglądarka akurat nie pokazuje własnego, automatycznego banera instalacji.
export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [installed, setInstalled] = useState(isStandalone())

  useEffect(() => {
    const onBeforeInstallPrompt = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }
    const onAppInstalled = () => {
      setInstalled(true)
      setDeferredPrompt(null)
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.addEventListener('appinstalled', onAppInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
      window.removeEventListener('appinstalled', onAppInstalled)
    }
  }, [])

  const promptInstall = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    await deferredPrompt.userChoice
    setDeferredPrompt(null)
  }

  return {
    installed,
    canInstall: !!deferredPrompt,
    showManualIOSInstructions: !installed && isIOSSafari(),
    promptInstall,
  }
}
