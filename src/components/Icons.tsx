import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { size?: number };
const base = (size = 18): SVGProps<SVGSVGElement> => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
});

export const IDashboard = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></svg>
);
export const IDocs = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /><path d="M9 13h6M9 17h6" /></svg>
);
export const IShield = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z" /><path d="M9.5 12l1.8 1.8L15 10" /></svg>
);
export const IChat = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M21 12a8 8 0 0 1-11.5 7.2L4 21l1.8-5.5A8 8 0 1 1 21 12z" /><path d="M9 11h6M9 14h4" /></svg>
);
export const IClock = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
);
export const IUpload = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M12 16V4" /><path d="M7 9l5-5 5 5" /><path d="M5 20h14" /></svg>
);
export const ICheck = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M5 12l4.5 4.5L19 7" /></svg>
);
export const IX = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M6 6l12 12M18 6L6 18" /></svg>
);
export const IAlert = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M12 3l9 16H3z" /><path d="M12 10v4M12 17h.01" /></svg>
);
export const IScale = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M12 3v18M5 21h14" /><path d="M7 7l-3 6h6zM17 7l-3 6h6z" /><path d="M7 7h10" /><path d="M12 7l-5 0M12 7l5 0" /></svg>
);
export const IReset = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M4 4v6h6" /><path d="M20 20v-6h-6" /><path d="M5 13a7 7 0 0 0 12 4l3-3M19 11A7 7 0 0 0 7 7L4 10" /></svg>
);
export const ISearch = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>
);
export const ISpark = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M12 3l1.8 4.7L18 9.5l-4.2 1.8L12 16l-1.8-4.7L6 9.5l4.2-1.8z" /><path d="M19 14l.7 1.8L21.5 16.5l-1.8.7L19 19l-.7-1.8L16.5 16.5l1.8-.7z" /></svg>
);
export const ILock = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
);
export const IUsers = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><circle cx="9" cy="8" r="3.2" /><path d="M3.5 20a5.5 5.5 0 0 1 11 0" /><path d="M16 5.2a3.2 3.2 0 0 1 0 6" /><path d="M17.5 14.6A5.5 5.5 0 0 1 20.5 20" /></svg>
);
export const ICoins = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><circle cx="12" cy="12" r="9" /><path d="M15 8.6a4 4 0 1 0 0 6.8" /><path d="M8 11h5M8 13.2h5" /></svg>
);
export const ICalendar = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><rect x="3" y="4.5" width="18" height="16" rx="2" /><path d="M3 9.5h18M8 3v3M16 3v3" /></svg>
);
export const IList = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M8 6h12M8 12h12M8 18h12" /><circle cx="3.6" cy="6" r="1.1" /><circle cx="3.6" cy="12" r="1.1" /><circle cx="3.6" cy="18" r="1.1" /></svg>
);
export const IBook = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5z" /><path d="M5 19.5A1.5 1.5 0 0 1 6.5 18H19v3H6.5A1.5 1.5 0 0 1 5 19.5z" /></svg>
);
export const IFlag = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M5 21V4" /><path d="M5 4.5h11l-1.6 3.5L16 11.5H5" /></svg>
);
export const IDatabase = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><ellipse cx="12" cy="5.5" rx="7.5" ry="3" /><path d="M4.5 5.5v6c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3v-6" /><path d="M4.5 11.5v6c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3v-6" /></svg>
);
export const IPaperclip = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M21 11.5l-8.5 8.5a5 5 0 0 1-7-7L13.5 4.9a3.3 3.3 0 0 1 4.7 4.7l-9 9a1.6 1.6 0 0 1-2.3-2.3l8-8" /></svg>
);
export const IImage = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><rect x="3" y="4.5" width="18" height="15" rx="2.5" /><circle cx="8.5" cy="9.5" r="1.6" /><path d="M5 17l4.5-4.5 3 3L16 12l3 3.5" /></svg>
);
export const ISend = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M4 11.5 20 4l-6.5 16-2.7-6.5z" /><path d="M11 13l9-9" /></svg>
);
export const ISummary = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M5 5h14M5 9.5h14M5 14h9M5 18.5h6" /></svg>
);
