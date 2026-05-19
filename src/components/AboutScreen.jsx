import { version as APP_VERSION } from '../../package.json'
import { GRAIN_LIST } from '../data/grainList'

export default function AboutScreen({ onClose }) {
  // Clic sur le backdrop (zone hors .about-content) ferme l'overlay.
  // Le stopPropagation sur le contenu evite la fermeture quand on clique
  // dans la carte elle-meme.
  const stopPropagation = (e) => e.stopPropagation()

  return (
    <div
      className="about-screen"
      role="dialog"
      aria-modal="true"
      aria-label="A propos de GrainTrack3D"
      onClick={onClose}
    >
      <div className="about-content" onClick={stopPropagation}>
        {/* Barre mobile : visible uniquement < 600px via CSS. */}
        <button
          type="button"
          className="about-back-bar"
          onClick={onClose}
          aria-label="Retour"
        >
          ← Retour
        </button>
        {/* Bouton desktop : croix top-right, masquee sur mobile via CSS. */}
        <button
          type="button"
          className="about-close"
          onClick={onClose}
          aria-label="Fermer"
        >
          ×
        </button>

        <header className="about-header">
          <h1 className="about-title">
            GrainTrack3D{' '}
            <span className="about-version">v{APP_VERSION}</span>
          </h1>
          <p className="about-lede">
            Suivi en temps reel des vraquiers cerealiers sur un globe 3D interactif.
          </p>
        </header>

        <section className="about-section">
          <h2>Comment ca marche</h2>
          <p>
            Les positions sont recues en direct via le WebSocket AISStream.io.
            Seuls les navires dont le code AIS appartient a la categorie bulk
            carriers (codes 70 a 79) sont affiches sur le globe.
          </p>
        </section>

        <section className="about-section">
          <h2>A propos du filtrage cereales</h2>
          <p>
            Le filtrage par cereale est approximatif, base sur les destinations
            AIS declarees par les navires. Ces destinations sont du texte libre
            saisi par les equipages — les correspondances peuvent etre imprecises
            ou incompletes.
          </p>
        </section>

        <section className="about-section">
          <h2>Cereales suivies</h2>
          <ul className="about-grains">
            {GRAIN_LIST.map((g) => (
              <li key={g.key}>
                <span aria-hidden="true">{g.emoji}</span> {g.labelFr}
              </li>
            ))}
          </ul>
        </section>

        <section className="about-section">
          <h2>Credits</h2>
          <ul className="about-credits">
            <li>Texture du globe : NASA Blue Marble Next Generation</li>
            <li>
              Donnees AIS :{' '}
              <a
                href="https://aisstream.io"
                target="_blank"
                rel="noreferrer noopener"
              >
                AISStream.io
              </a>
            </li>
            <li>Projet open source CargoSphere — licence MIT</li>
          </ul>
        </section>
      </div>
    </div>
  )
}
