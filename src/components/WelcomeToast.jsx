import { useEffect, useState } from 'react'

const WELCOME_STORAGE_KEY = 'graintrack3d-welcomed'

// Lecture défensive (localStorage peut throw en mode privé). En cas d'échec,
// on considère l'utilisateur comme déjà accueilli pour ne pas spammer le toast
// à chaque navigation.
function alreadyWelcomed() {
  try {
    return localStorage.getItem(WELCOME_STORAGE_KEY) === '1'
  } catch {
    return true
  }
}

export default function WelcomeToast() {
  // Évaluation lazy : évite un flash du toast si l'utilisateur l'a déjà vu.
  const [visible, setVisible] = useState(() => !alreadyWelcomed())

  useEffect(() => {
    if (!visible) return
    // Re-vérification au montage : si un autre onglet a déjà validé l'accueil
    // entre le rendu initial et l'hydratation, on évite d'afficher le toast.
    if (alreadyWelcomed()) setVisible(false)
  }, [visible])

  if (!visible) return null

  const handleDismiss = () => {
    try {
      localStorage.setItem(WELCOME_STORAGE_KEY, '1')
    } catch {
      /* stockage indisponible — l'utilisateur reverra le toast au prochain chargement */
    }
    setVisible(false)
  }

  return (
    <div
      className="welcome-toast-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-toast-title"
    >
      <div className="welcome-toast">
        <h2 id="welcome-toast-title" className="welcome-toast-title">
          Bienvenue sur GrainTrack3D
        </h2>
        <p className="welcome-toast-text">
          L'application suit en temps réel les vraquiers céréaliers. Par défaut,
          la zone <strong>Atlantique Nord</strong> est active. Vous pouvez
          modifier vos zones via le menu <strong>⋮</strong> en bas à droite.
        </p>
        <button
          type="button"
          className="welcome-toast-btn"
          onClick={handleDismiss}
        >
          OK, compris
        </button>
      </div>
    </div>
  )
}
