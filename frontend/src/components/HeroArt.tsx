const clip = (text: string, max = 36) => (text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text);

/** Grafika hero; podpisy kropek to tytuły prawdziwych kart z API (bez danych: same kropki) */
const HeroArt = ({ labels = [] }: { labels?: string[] }) => (
  <svg className="hero-art" viewBox="0 0 1440 560" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <defs>
      <linearGradient id="hg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#0d3d63" />
        <stop offset="1" stopColor="#03243f" />
      </linearGradient>
      <radialGradient id="glow" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stopColor="#2a86c2" stopOpacity=".45" />
        <stop offset="1" stopColor="#2a86c2" stopOpacity="0" />
      </radialGradient>
      <linearGradient id="sweep" x1="0" y1="1" x2="1" y2="0">
        <stop offset="0" stopColor="#7ab929" stopOpacity="0" />
        <stop offset="1" stopColor="#7ab929" stopOpacity=".38" />
      </linearGradient>
      <pattern id="dotgrid" width="26" height="26" patternUnits="userSpaceOnUse">
        <circle cx="2" cy="2" r="1.3" fill="#ffffff" opacity=".09" />
      </pattern>
    </defs>
    <rect width="1440" height="560" fill="url(#hg)" />
    <rect width="1440" height="560" fill="url(#dotgrid)" />
    <circle cx="1080" cy="250" r="380" fill="url(#glow)" />
    <g fill="none" stroke="#ffffff">
      <circle cx="1080" cy="250" r="330" opacity=".10" />
      <circle cx="1080" cy="250" r="250" opacity=".14" />
      <circle cx="1080" cy="250" r="170" opacity=".18" />
      <circle cx="1080" cy="250" r="90" opacity=".22" />
      <line x1="750" y1="250" x2="1410" y2="250" opacity=".10" />
      <line x1="1080" y1="-80" x2="1080" y2="580" opacity=".10" />
    </g>
    <path d="M1080 250 L1080 -80 A330 330 0 0 1 1393 148 Z" fill="url(#sweep)" />
    <line x1="1080" y1="250" x2="1393" y2="148" stroke="#7ab929" strokeWidth="2" opacity=".8" />
    <g>
      <circle cx="1200" cy="120" r="9" fill="#7ab929" />
      <circle cx="1200" cy="120" r="18" fill="#7ab929" opacity=".2" />
      <circle cx="960" cy="170" r="7" fill="#ffffff" opacity=".85" />
      <circle cx="1270" cy="300" r="6" fill="#ffffff" opacity=".7" />
      <circle cx="1010" cy="360" r="8" fill="#5fb3e8" />
      <circle cx="1010" cy="360" r="16" fill="#5fb3e8" opacity=".2" />
      <circle cx="1150" cy="410" r="5" fill="#ffffff" opacity=".6" />
      <circle cx="880" cy="290" r="5" fill="#5fb3e8" opacity=".8" />
      <circle cx="1330" cy="200" r="4" fill="#ffffff" opacity=".5" />
    </g>
    <g fontFamily="Lato,sans-serif" fontSize="13" fontWeight="700" fill="#ffffff" opacity=".8">
      {labels[0] && (
        <text x="1184" y="104" textAnchor="end">
          {clip(labels[0])}
        </text>
      )}
      {labels[1] && (
        <text x="1030" y="390">
          {clip(labels[1])}
        </text>
      )}
    </g>
  </svg>
);

export default HeroArt;
