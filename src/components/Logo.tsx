/**
 * LTBLaw znak — geometrijska vaga pravde u zlatnom gradijentu
 * na tamnoplavoj staklenoj pločici. Koristi se u brandu i favicon-u.
 */
export default function Logo({ size = 36 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="LTBLaw"
    >
      <defs>
        <linearGradient id="lg-badge" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop stopColor="#24395e" />
          <stop offset="1" stopColor="#0d1930" />
        </linearGradient>
        <linearGradient id="lg-gold" x1="10" y1="10" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#eed494" />
          <stop offset="0.55" stopColor="#cda44e" />
          <stop offset="1" stopColor="#a67c24" />
        </linearGradient>
      </defs>

      {/* staklena pločica */}
      <rect x="1" y="1" width="46" height="46" rx="14" fill="url(#lg-badge)" />
      <rect
        x="1.5"
        y="1.5"
        width="45"
        height="45"
        rx="13.5"
        stroke="#eed494"
        strokeOpacity="0.35"
      />
      {/* odsjaj stakla */}
      <path
        d="M15 2h18c7 0 13 6 13 13v3C38 12 30.5 9.5 24 9.5S10 12 2 18v-3C2 8 8 2 15 2Z"
        fill="#ffffff"
        opacity="0.09"
      />

      {/* vaga pravde */}
      <g stroke="url(#lg-gold)" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
        {/* stup i greda */}
        <path d="M24 14v19" />
        <path d="M13 17.5h22" />
        {/* postolje */}
        <path d="M18.5 35.5h11" />
        {/* lijeva zdjelica */}
        <path d="M13 17.5 8.5 23.5" />
        <path d="M13 17.5 17.5 23.5" />
        <path d="M8 23.5a5 5 0 0 0 10 0" />
        {/* desna zdjelica */}
        <path d="M35 17.5 30.5 23.5" />
        <path d="M35 17.5 39.5 23.5" />
        <path d="M30 23.5a5 5 0 0 0 10 0" />
      </g>
      {/* kapitel */}
      <circle cx="24" cy="10.6" r="2" fill="url(#lg-gold)" />
    </svg>
  );
}
