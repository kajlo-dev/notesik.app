import { useEffect, useRef } from 'react'

// Co `intervalMinutes` woła onSave(getSnapshot()) - przez refy zawsze z aktualnym stanem,
// bez restartowania interwału przy każdej zmianie notatki.
export function useAutosave(getSnapshot, onSave, intervalMinutes) {
  const getSnapshotRef = useRef(getSnapshot)
  getSnapshotRef.current = getSnapshot
  const onSaveRef = useRef(onSave)
  onSaveRef.current = onSave

  useEffect(() => {
    if (!intervalMinutes) return undefined
    const ms = intervalMinutes * 60 * 1000
    const id = setInterval(() => {
      onSaveRef.current(getSnapshotRef.current())
    }, ms)
    return () => clearInterval(id)
  }, [intervalMinutes])
}
