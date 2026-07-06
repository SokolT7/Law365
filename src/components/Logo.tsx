/**
 * LTBLaw znak — „LTB” u linijskom stilu (krajevi prečke slova T
 * oblikovani su kao zdjelice vage pravde) u zlatnom gradijentu na
 * tamnoplavoj staklenoj pločici. Koristi se u brandu i favicon-u.
 */
export default function Logo({ size = 38 }: { size?: number }) {
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
        <linearGradient id="ltb-badge" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop stopColor="#24395e" />
          <stop offset="1" stopColor="#0d1930" />
        </linearGradient>
        <linearGradient id="ltb-gold" x1="10" y1="10" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#eed494" />
          <stop offset="0.55" stopColor="#cda44e" />
          <stop offset="1" stopColor="#a67c24" />
        </linearGradient>
      </defs>

      {/* staklena pločica */}
      <rect x="1" y="1" width="46" height="46" rx="14" fill="url(#ltb-badge)" />
      <rect x="1.5" y="1.5" width="45" height="45" rx="13.5" fill="none" stroke="#eed494" strokeOpacity="0.35" />
      {/* odsjaj stakla */}
      <path
        d="M15 2h18c7 0 13 6 13 13v3C38 12 30.5 9.5 24 9.5S10 12 2 18v-3C2 8 8 2 15 2Z"
        fill="#ffffff"
        opacity="0.09"
      />

      {/* LTB linijski znak — smanjen na 75% radi zračnijeg razmaka u pločici */}
      <g
        fill="none"
        stroke="url(#ltb-gold)"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
        transform="translate(25.5 24) scale(0.75) translate(-25.5 -24)"
      >
        {/* L */}
        <path d="M7 15 V33 H13" />
        {/* T — prečka, stup, podnožje */}
        <path d="M17.5 15 H30.5" />
        <path d="M24 15 V33" />
        <path d="M21 33 H27" />
        {/* T — zdjelice vage na krajevima prečke */}
        <path d="M17.5 15 L15.6 19.5" />
        <path d="M17.5 15 L19.4 19.5" />
        <path d="M14.9 19.5 a2.6 2.6 0 0 0 5.2 0" />
        <path d="M30.5 15 L28.6 19.5" />
        <path d="M30.5 15 L32.4 19.5" />
        <path d="M27.9 19.5 a2.6 2.6 0 0 0 5.2 0" />
        {/* B */}
        <path d="M36 15 V33" />
        <path d="M36 15 H38.6 a4.3 4.3 0 0 1 0 8.6 H36" />
        <path d="M36 23.6 H39.4 a4.7 4.7 0 0 1 0 9.4 H36" />
      </g>
    </svg>
  );
}
