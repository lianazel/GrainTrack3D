import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, AlignmentType, HeadingLevel, PageBreak, Header, Footer,
  PageNumber, NumberFormat, TableOfContents, BorderStyle, ShadingType,
  VerticalAlign, Tab, TabStopPosition, TabStopType, ImageRun,
  convertInchesToTwip, LevelFormat, UnderlineType
} from "docx";
import fs from "fs";

const NAVY = "1B3A5C";
const BLUE_ACCENT = "2E75B6";
const BORDER_COLOR = "CCCCCC";
const HEADER_BG = "D5E8F0";

const FONT = "Arial";
const PT = 2; // half-points

function heading1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 240, after: 120 },
    children: [new TextRun({ text, bold: true, size: 28 * PT, color: NAVY, font: FONT })],
  });
}

function heading2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 200, after: 100 },
    children: [new TextRun({ text, bold: true, size: 24 * PT, color: NAVY, font: FONT })],
  });
}

function heading3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 160, after: 80 },
    children: [new TextRun({ text, bold: true, size: 20 * PT, color: BLUE_ACCENT, font: FONT })],
  });
}

function para(text, opts = {}) {
  const runs = [];
  if (typeof text === "string") {
    runs.push(new TextRun({ text, size: 12 * PT, font: FONT, ...opts }));
  } else {
    // array of TextRun configs
    for (const r of text) {
      runs.push(new TextRun({ size: 12 * PT, font: FONT, ...r }));
    }
  }
  return new Paragraph({ spacing: { after: 120 }, children: runs });
}

function emptyPara() {
  return new Paragraph({ spacing: { after: 120 }, children: [] });
}

const thinBorder = { style: BorderStyle.SINGLE, size: 1, color: BORDER_COLOR };
const borders = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder };

function tableCell(text, isHeader = false, width = undefined) {
  const shadingOpts = isHeader ? { type: ShadingType.SOLID, color: HEADER_BG, fill: HEADER_BG } : {};
  const cellOpts = {
    borders,
    shading: shadingOpts,
    children: [new Paragraph({
      spacing: { before: 40, after: 40 },
      children: [new TextRun({ text, size: 11 * PT, font: FONT, bold: isHeader })],
    })],
  };
  if (width) cellOpts.width = { size: width, type: WidthType.DXA };
  return new TableCell(cellOpts);
}

function makeTable(headers, rows, colWidths) {
  const headerRow = new TableRow({
    tableHeader: true,
    children: headers.map((h, i) => tableCell(h, true, colWidths?.[i])),
  });
  const dataRows = rows.map(row => new TableRow({
    children: row.map((cell, i) => tableCell(cell, false, colWidths?.[i])),
  }));
  return new Table({
    rows: [headerRow, ...dataRows],
    width: { size: 100, type: WidthType.PERCENTAGE },
  });
}

function pageBreakPara() {
  return new Paragraph({ children: [new PageBreak()] });
}

// ============== BUILD DOCUMENT ==============

const doc = new Document({
  styles: {
    default: {
      document: {
        run: { font: FONT, size: 12 * PT },
      },
    },
  },
  numbering: {
    config: [],
  },
  sections: [
    // ===== SECTION 1: TITLE PAGE =====
    {
      properties: {
        page: {
          size: { width: 12240, height: 15840 },
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
        },
      },
      headers: {
        default: new Header({
          children: [new Paragraph({
            children: [new TextRun({ text: "GrainTrack3D — Document d'étape v1.3.0", size: 9 * PT, font: FONT, color: "888888" })],
          })],
        }),
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ children: [PageNumber.CURRENT], size: 9 * PT, font: FONT, color: "888888" }),
              new TextRun({ text: " / ", size: 9 * PT, font: FONT, color: "888888" }),
              new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 9 * PT, font: FONT, color: "888888" }),
            ],
          })],
        }),
      },
      children: [
        // vertical centering via spacing
        emptyPara(), emptyPara(), emptyPara(), emptyPara(), emptyPara(),
        emptyPara(), emptyPara(), emptyPara(), emptyPara(), emptyPara(),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
          children: [new TextRun({ text: "GrainTrack3D", bold: true, size: 36 * PT, color: NAVY, font: FONT })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 },
          children: [new TextRun({ text: "Document d'étape — v1.3.0", italics: true, size: 16 * PT, color: NAVY, font: FONT })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 300 },
          children: [new TextRun({ text: "19 mai 2026", italics: true, size: 14 * PT, color: "666666", font: FONT })],
        }),
        emptyPara(),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 },
          children: [new TextRun({ text: "Tracking maritime 3D en temps réel des vraquiers céréaliers", size: 14 * PT, font: FONT })],
        }),
        emptyPara(),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 60 },
          children: [new TextRun({ text: "Projet CargoSphere — Licence MIT", size: 12 * PT, font: FONT, color: "666666" })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "https://grain-track3-d.vercel.app", size: 12 * PT, font: FONT, color: BLUE_ACCENT })],
        }),

        // ===== PAGE 2: TOC =====
        pageBreakPara(),
        new Paragraph({
          spacing: { after: 200 },
          children: [new TextRun({ text: "Sommaire", bold: true, size: 28 * PT, color: NAVY, font: FONT })],
        }),
        new TableOfContents("Sommaire", {
          hyperlink: true,
          headingStyleRange: "1-3",
        }),

        // ===== SECTION 1: Présentation =====
        pageBreakPara(),
        heading1("1. Présentation du projet"),
        para("GrainTrack3D est une application web de tracking maritime en temps réel. Elle affiche les vraquiers céréaliers (codes AIS 70-79) sur un globe 3D interactif, avec des données provenant de l'API AISStream.io en WebSocket."),
        para("L'application fait partie de l'écosystème CargoSphere (licence MIT), aux côtés de GrainWatch (suivi des prix agricoles, déployé sur GitHub Pages). À terme, GrainTrack3D sera intégré comme composant dans GrainWatch."),
        para([
          { text: "URL de production : ", bold: true },
          { text: "https://grain-track3-d.vercel.app", color: BLUE_ACCENT },
        ]),
        emptyPara(),
        heading2("1.1 Stack technique"),
        makeTable(
          ["Couche", "Technologie"],
          [
            ["Framework", "React 19 + Vite 8"],
            ["Rendu 3D", "Three.js + React Three Fiber + Drei"],
            ["State management", "Zustand (avec subscribeWithSelector)"],
            ["Données AIS", "AISStream.io (WebSocket temps réel)"],
            ["Géo-projection", "Trigonométrie directe (lat/lon vers sphère 3D)"],
            ["Déploiement", "Vercel (SPA + Serverless Function)"],
            ["Persistence locale", "localStorage (zones, préférences)"],
          ],
          [3000, 6360]
        ),
        emptyPara(),
        heading2("1.2 Dépendances (zéro bloat)"),
        para("7 dépendances de production uniquement : react, react-dom, three, @react-three/fiber, @react-three/drei, zustand, d3-geo. Aucune librairie CSS, aucun framework UI, aucun bundler additionnel. Le CSS est écrit à la main dans un seul fichier index.css."),

        // ===== SECTION 2: Historique =====
        pageBreakPara(),
        heading1("2. Historique des versions"),
        makeTable(
          ["Version", "Date", "Étape", "Description"],
          [
            ["1.0.0", "13 mai 2026", "Étapes 1-5", "Première release publique. Globe 3D, flux AIS temps réel, marqueurs, panneau de détails, HUD, déploiement Vercel."],
            ["1.1.0", "15 mai 2026", "Étape 6", "Filtre céréales par port de destination. 12 céréales, ~130 ports mondiaux, matching bidirectionnel tolérant."],
            ["1.1.1", "18 mai 2026", "Audit sécurité", "Hardening défensif : validation coordonnées, plafond Map/Set, limite reconnexion, headers CSP Vercel."],
            ["1.2.0", "18 mai 2026", "Étape 7", "Améliorations UX : badges confiance, auto-rotation, bandeau synthèse, toolbar export, correctif Google Translate."],
            ["1.3.0", "19 mai 2026", "Étape 8", "Sélecteur multi-zones géographiques, welcome toast, persistence localStorage."],
          ],
          [1200, 1600, 1600, 4960]
        ),

        // ===== SECTION 3: Étape 7 =====
        pageBreakPara(),
        heading1("3. Travail réalisé — Session du 18 mai (Étape 7, v1.2.0)"),
        heading2("3.1 Badges céréales à opacité variable"),
        para("L'InfoPanel affiche désormais les céréales probables associées à la destination d'un navire avec une opacité proportionnelle à la fiabilité du matching. Un port spécialisé (1-2 céréales) affiche les badges à pleine opacité. Un port mixte (3-5 céréales) les affiche à 70%. Un port généraliste (6+ céréales) ou un alias court (3 caractères ou moins) les affiche à 40%."),
        para("La fonction getMatchingGrains() retourne désormais un objet { grainKey, confidence }. Un index lazy getPortGrainCount() dans portMatcher.js compte le nombre de céréales par port pour calculer la confiance."),
        emptyPara(),
        heading2("3.2 Auto-rotation du globe"),
        para("Le globe tourne lentement au chargement (vitesse 0.5). La rotation s'arrête définitivement au premier clic ou scroll de l'utilisateur (comportement one-shot)."),
        emptyPara(),
        heading2("3.3 Bandeau de synthèse (SummaryBanner)"),
        para("Un bandeau centré en haut de l'écran affiche en temps réel le nombre de vraquiers visibles et la céréale filtrée le cas échéant. Exemple : \"● 158 vraquiers 🌾 Blé en transit — Atlantique Nord\". Le bandeau est transparent aux clics (pointer-events: none) pour ne pas bloquer l'interaction avec le globe."),
        emptyPara(),
        heading2("3.4 Toolbar extensible"),
        para("Un menu \"⋮\" en bas à droite regroupe les actions : Capture PNG (screenshot du globe avec fond noir pour compatibilité iOS), Export Markdown (tableau des navires au format .md), Zones maritimes, et À propos. Le menu se décale quand le panneau de détails est ouvert."),
        emptyPara(),
        heading2("3.5 Écran \"À propos\""),
        para("Un overlay plein écran accessible depuis le menu, contenant : explication du fonctionnement, disclaimer sur le filtrage approximatif, grille des 12 céréales suivies, crédits, et numéro de version. Sur mobile, l'overlay passe en plein écran avec une barre \"← Retour\"."),
        emptyPara(),
        heading2("3.6 Correctif Google Translate"),
        para("L'attribut translate=\"no\" sur la balise html et une balise meta empêchent les extensions de traduction de muter le DOM React, ce qui provoquait un crash (erreur insertBefore NotFoundError) sur Chrome."),

        // ===== SECTION 4: Étape 8 =====
        pageBreakPara(),
        heading1("4. Travail réalisé — Session du 19 mai (Étape 8, v1.3.0)"),
        heading2("4.1 Sélecteur multi-zones géographiques"),
        para("Fonctionnalité majeure de cette session. L'utilisateur peut désormais choisir jusqu'à 3 zones maritimes à surveiller simultanément, parmi 8 zones prédéfinies."),
        emptyPara(),
        makeTable(
          ["Zone", "Emoji", "Couverture"],
          [
            ["Atlantique Nord", "🌊", "Côtes est US, Canada, Europe de l'Ouest"],
            ["Méditerranée", "🏛️", "Bassin méditerranéen complet"],
            ["Mer Noire", "⚓", "Détroit du Bosphore à la Géorgie"],
            ["Mer du Nord & Baltique", "🌬️", "Pays nordiques, Allemagne, Pologne"],
            ["Golfe du Mexique & Caraïbes", "🌴", "US Gulf, Mexique, Amérique centrale"],
            ["Golfe Persique & Mer d'Arabie", "🛢️", "Détroit d'Ormuz, côte est-africaine"],
            ["Asie du Sud-Est", "🐉", "Malaisie, Indonésie, Philippines, Vietnam"],
            ["Océan Indien Ouest", "🌅", "Madagascar, Mozambique, Tanzanie"],
          ],
          [3500, 1000, 4860]
        ),
        emptyPara(),
        heading3("Architecture technique"),
        para("Le fichier maritimeZones.js exporte les 8 zones avec leurs bounding boxes au format AISStream. Le store Zustand gère selectedZones avec lecture/écriture défensive dans localStorage (try/catch pour le mode privé). Le hook useAISStream souscrit aux changements de zones via un subscriber Zustand et ferme intentionnellement le WebSocket avant de se reconnecter avec les nouvelles BoundingBoxes (pattern intentionalCloseRef pour distinguer un changement de zone d'une déconnexion réseau)."),
        emptyPara(),
        heading3("Garde-fous"),
        para("Minimum 1 zone active (impossible de tout décocher). Maximum 3 zones simultanées (au-delà, le flux AIS devient trop lent). Les zones au-delà de la limite sont grisées avec le message \"3 zones maximum — décochez-en une pour en activer une autre\"."),
        emptyPara(),
        heading2("4.2 Welcome Toast"),
        para("Au tout premier lancement de l'application, un toast modal s'affiche pour expliquer le fonctionnement : \"L'application suit en temps réel les vraquiers céréaliers. Par défaut, la zone Atlantique Nord est active. Vous pouvez modifier vos zones via le menu ⋮ en bas à droite.\""),
        para("La dismissal est persistée dans localStorage (clé graintrack3d-welcomed). Lecture défensive : si localStorage est indisponible (mode privé), l'utilisateur est considéré comme déjà accueilli pour ne pas spammer le toast."),
        emptyPara(),
        heading2("4.3 Affichage des zones dans le bandeau"),
        para("Le SummaryBanner affiche désormais le nom de la zone active après \"en transit\". Avec une seule zone : \"158 vraquiers en transit — Atlantique Nord\". Avec plusieurs zones : \"21 vraquiers en transit — 3 zones\" (avec un tooltip au survol listant les zones actives)."),

        // ===== SECTION 5: Architecture =====
        pageBreakPara(),
        heading1("5. Architecture des fichiers (état v1.3.0)"),
        para([{ text: "src/", bold: true }]),
        para("    App.jsx — Layout principal : Globe + UI overlay"),
        para("    main.jsx — Point d'entrée React"),
        para("    index.css — Styles globaux, dark theme, tous les composants"),
        para([{ text: "    components/", bold: true }]),
        para("        Globe.jsx — Sphère Three.js + texture NASA Blue Marble"),
        para("        ShipMarkers.jsx — Instanced meshes pour les navires"),
        para("        InfoPanel.jsx — Panneau latéral détails navire"),
        para("        GrainSelector.jsx — Dropdown filtre céréales"),
        para("        HUD.jsx — Badge connexion + statut"),
        para("        SummaryBanner.jsx — Bandeau compteur + zone active"),
        para("        Toolbar.jsx — Menu ⋮ avec actions (PNG, Markdown, Zones, À propos)"),
        para("        ZonePicker.jsx — Overlay sélection multi-zones"),
        para("        WelcomeToast.jsx — Toast premier lancement"),
        para("        AboutScreen.jsx — Écran À propos"),
        para([{ text: "    data/", bold: true }]),
        para("        grainPorts.json — Base ports/céréales (~130 ports)"),
        para("        grainList.js — 12 céréales (clés, labels, emojis)"),
        para("        maritimeZones.js — 8 zones maritimes avec bboxes"),
        para([{ text: "    stores/", bold: true }]),
        para("        useShipStore.js — Zustand store global"),
        para([{ text: "    hooks/", bold: true }]),
        para("        useAISStream.js — Hook WebSocket AIS"),
        para([{ text: "    utils/", bold: true }]),
        para("        geoUtils.js — Conversion lat/lon vers Vector3"),
        para("        aisParser.js — Parsing messages AIS"),
        para("        portMatcher.js — Matching destination/port/céréale"),
        para([{ text: "api/", bold: true }]),
        para("    ais-config.js — Serverless function Vercel"),
        para([{ text: "scripts/", bold: true }]),
        para("    ais-probe.mjs — Diagnostic flux AIS"),
        para("    analyze-destinations.mjs — Analyse destinations non couvertes"),

        // ===== SECTION 6: Sécurité =====
        pageBreakPara(),
        heading1("6. Sécurité"),
        para("L'audit de sécurité (v1.1.1) a couvert 4 couches :"),
        emptyPara(),
        makeTable(
          ["Couche", "Statut", "Mesures"],
          [
            ["Clé API", "Conforme", "Jamais dans le bundle client, servie via serverless function Vercel"],
            ["WebSocket", "Renforcé", "Validation coordonnées, plafond Map 5000 navires, Set blacklist 10000, limite 50 reconnexions"],
            ["Frontend React", "Renforcé", "Pas de dangerouslySetInnerHTML, pas d'injection, données AIS traitées comme non fiables"],
            ["Déploiement Vercel", "Renforcé", "Headers CSP (connect-src restreint), X-Content-Type-Options, X-Frame-Options SAMEORIGIN, Referrer-Policy"],
          ],
          [1800, 1400, 6160]
        ),

        // ===== SECTION 7: Méthodologie =====
        pageBreakPara(),
        heading1("7. Méthodologie de développement"),
        heading2("7.1 Workflow Cowork + Claude Code"),
        para("Le projet est développé avec un workflow innovant en deux niveaux :"),
        emptyPara(),
        para([
          { text: "Niveau 1 — Cowork (Claude Desktop) : ", bold: true },
          { text: "JC décrit ses idées et besoins en langage naturel. Cowork traduit ces idées en prompts techniques précis et détaillés pour Claude Code, incluant les fichiers à modifier, le code exact à produire, et les garde-fous à respecter." },
        ]),
        emptyPara(),
        para([
          { text: "Niveau 2 — Claude Code (terminal) : ", bold: true },
          { text: "Reçoit les prompts techniques, génère les diffs, propose chaque modification une par une. JC valide chaque diff avec \"option 1\" (accepter). Claude Code ne fait jamais de commit automatiquement — les commits sont toujours validés par le développeur." },
        ]),
        emptyPara(),
        para("Ce workflow permet à une seule personne de développer une application complète sans écrire de code manuellement, tout en gardant un contrôle total sur chaque modification."),
        emptyPara(),
        heading2("7.2 Conventions"),
        para("Commits : feat:, fix:, chore:, docs:. Aucune dépendance npm ajoutée sans validation explicite. Le fichier CLAUDE.md sert de documentation technique vivante pour Claude Code. Le fichier CHANGELOG.md suit le format Keep a Changelog."),

        // ===== SECTION 8: Roadmap =====
        pageBreakPara(),
        heading1("8. Prochaines étapes (roadmap)"),
        makeTable(
          ["Priorité", "Fonctionnalité", "Complexité"],
          [
            ["Haute", "Cluster de marqueurs au dézoom", "Moyen"],
            ["Haute", "Icône de source sur chaque badge céréale", "Rapide"],
            ["Moyenne", "Score de confiance explicite dans l'InfoPanel", "Moyen"],
            ["Moyenne", "Zone de trafic intense / heatmap", "Moyen"],
            ["Moyenne", "Filtre par route maritime", "Moyen"],
            ["Moyenne", "Alerte de congestion portuaire", "Moyen"],
            ["Basse", "Lien bidirectionnel céréale vers cours GrainWatch", "Moyen"],
            ["Basse", "Mini-prix inline dans le panneau cargo", "Ambitieux"],
            ["Basse", "Trails de trajectoire", "Ambitieux"],
            ["Basse", "Compteur historique J-7", "Ambitieux"],
          ],
          [1500, 5360, 1500]
        ),
        emptyPara(), emptyPara(),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 400 },
          children: [new TextRun({ text: "— Fin du document —", italics: true, size: 12 * PT, font: FONT, color: "888888" })],
        }),
      ],
    },
  ],
});

const outputPath = "/sessions/confident-gracious-euler/mnt/GrainTrack3D/GrainTrack3D_Doc_Etape_v1.3.0.docx";
const buffer = await Packer.toBuffer(doc);
fs.writeFileSync(outputPath, buffer);
const stats = fs.statSync(outputPath);
console.log(`Document generated: ${outputPath} (${stats.size} bytes)`);
