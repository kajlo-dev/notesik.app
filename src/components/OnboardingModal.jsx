import { useState } from 'react'
import { CloseIcon } from './icons/icons'

export function OnboardingModal({ onClose }) {
  const [dontShowAgain, setDontShowAgain] = useState(false)

  return (
    <div className="rich-note-fullscreen" role="dialog" aria-modal="true" aria-label="Jak używać aplikacji">
      <div className="rich-note-fullscreen-header">
        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => onClose(dontShowAgain)} aria-label="Zamknij">
          <CloseIcon size={20} />
        </button>
      </div>
      <div className="rich-note-fullscreen-body">
        <h1 className="h5 mb-3">Jak używać Notesik.app</h1>

        <h2 className="h6 text-primary">📝 Program</h2>
        <p className="text-secondary">
          Strona główna. Pokazuje aktualnie otwarty program, podzielony na dni i sesje. Przy
          każdym punkcie programu jest pole na notatkę - nie ma go tylko przy pieśniach, muzyce i
          modlitwach.
        </p>

        <h2 className="h6 text-primary">✍️ Formatowanie notatek</h2>
        <p className="text-secondary">
          Nad każdym polem notatki jest pasek: trzy rozmiary tekstu, pogrubienie/kursywa/
          podkreślenie i pięć kolorów. Lupka w rogu pola otwiera notatkę na cały ekran - wygodniej
          pisać dłuższe notatki.
        </p>

        <h2 className="h6 text-primary">📋 Lista</h2>
        <p className="text-secondary">
          Wszystkie zapisane programy. Możesz wrócić do dowolnego z nich, usunąć go albo
          wyeksportować notatki do jednego pliku PDF - gotowego do wydrukowania jako kartki do
          skoroszytu.
        </p>

        <h2 className="h6 text-primary">⚙️ Ustawienia</h2>
        <p className="text-secondary">
          Stąd pobierasz program z aktualnej listy (albo wgrywasz własny plik PDF) i ustawiasz co
          ile minut notatki mają się zapisywać automatycznie.
        </p>

        <h2 className="h6 text-primary">🔒 Prywatność</h2>
        <p className="text-secondary">
          Nie ma logowania ani konta. Programy i notatki zostają wyłącznie na Twoim urządzeniu.
        </p>

        <div className="form-check mt-4 mb-3">
          <input
            className="form-check-input"
            type="checkbox"
            id="onboarding-dont-show"
            checked={dontShowAgain}
            onChange={(e) => setDontShowAgain(e.target.checked)}
          />
          <label className="form-check-label" htmlFor="onboarding-dont-show">
            Nie pokazuj więcej
          </label>
        </div>

        <button type="button" className="btn btn-primary w-100 mb-3" onClick={() => onClose(dontShowAgain)}>
          Rozumiem
        </button>
      </div>
    </div>
  )
}
