const RadarLogo = ({ size = 40 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true">
    <circle cx="20" cy="20" r="17" stroke="#035487" strokeWidth="2.4" />
    <circle cx="20" cy="20" r="10.5" stroke="#035487" strokeWidth="2" opacity=".55" />
    <path d="M20 20 L32 8" stroke="#035487" strokeWidth="2.6" strokeLinecap="round" />
    <circle cx="20" cy="20" r="3" fill="#035487" />
    <circle cx="27.5" cy="14" r="3" fill="#7ab929" />
  </svg>
);

export default RadarLogo;
