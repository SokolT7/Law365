/** Geometric LTB mark, drawn as vectors for crisp rendering at every size. */
export default function Logo({ size = 38 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="LTB Law">
    <rect width="48" height="48" rx="11" fill="#3D5FE5" />
    <path d="M13 12v24h23" stroke="white" strokeWidth="4" strokeLinejoin="round" />
    <path d="M21 13h15M28.5 13v15" stroke="white" strokeWidth="4" strokeLinejoin="round" />
  </svg>;
}
