import { EditDocumentIcon } from './icons/icons'

// Kwadratowa miniaturka okładki programu, kadrowana od góry (object-position: top) -
// tak żeby przy niekwadratowych źródłach zawsze było widać górną część ilustracji.
export function ProgramThumb({ src, alt }) {
  return (
    <div className="program-thumb">
      {src ? <img src={src} alt={alt} loading="lazy" /> : <EditDocumentIcon size={22} className="text-secondary" />}
    </div>
  )
}
