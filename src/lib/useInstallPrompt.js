import { useSyncExternalStore } from 'react'

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

// "beforeinstallprompt" wywołuje się raz na wczytanie strony - często zanim zdąży się
// zamontować komponent, który akurat go potrzebuje (np. zakładka Pomoc, otwierana dopiero po
// kliknięciu, długo po tym jak baner instalacji już go złapał). Dlatego nasłuch i złapane
// zdarzenie trzymamy na poziomie modułu, wspólnie dla wszystkich komponentów używających tego
// hooka, zamiast każdy z nich rejestrował własny, osobny listener.
let deferredPrompt = null
let installed = isStandalone()
let snapshot = { deferredPrompt, installed }
const listeners = new Set()

function publish() {
  snapshot = { deferredPrompt, installed }
  listeners.forEach((listener) => listener())
}

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  deferredPrompt = e
  publish()
})
window.addEventListener('appinstalled', () => {
  installed = true
  deferredPrompt = null
  publish()
})

function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot() {
  return snapshot
}

export function useInstallPrompt() {
  const state = useSyncExternalStore(subscribe, getSnapshot)

  const promptInstall = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    await deferredPrompt.userChoice
    deferredPrompt = null
    publish()
  }

  return {
    installed: state.installed,
    canInstall: !!state.deferredPrompt,
    showManualIOSInstructions: !state.installed && isIOSSafari(),
    promptInstall,
  }
}
