import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { size?: number };
const base = (size = 18): SVGProps<SVGSVGElement> => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
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
export const IArrowRight = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M5 12h14M13 6l6 6-6 6" /></svg>
);
export const IArrowLeft = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M19 12H5M11 6l-6 6 6 6" /></svg>
);
export const IArrowUpRight = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M7 17 17 7M8 7h9v9" /></svg>
);
export const IArrowDown = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M12 5v14M6 13l6 6 6-6" /></svg>
);
export const IChevronDown = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="m6 9 6 6 6-6" /></svg>
);
export const IChevronRight = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="m9 6 6 6-6 6" /></svg>
);
export const IPlus = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M12 5v14M5 12h14" /></svg>
);
export const IMore = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></svg>
);
export const IEye = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M2.5 12S6 5 12 5s9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7z" /><circle cx="12" cy="12" r="3" /></svg>
);
export const IEyeOff = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M10.6 5.1A9.6 9.6 0 0 1 12 5c6 0 9.5 7 9.5 7a16 16 0 0 1-2.4 3.3M6.6 6.6C3.9 8.4 2.5 12 2.5 12s3.5 7 9.5 7a9.4 9.4 0 0 0 5.4-1.6" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2M3 3l18 18" /></svg>
);
export const ILogout = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M10 5H6a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h4M15 8l4 4-4 4M9 12h10" /></svg>
);
export const IUser = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><circle cx="12" cy="8" r="3.5" /><path d="M5 20a7 7 0 0 1 14 0" /></svg>
);
export const IKeyboard = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><rect x="2.5" y="6" width="19" height="12" rx="2" /><path d="M6.5 10h.01M10 10h.01M14 10h.01M17.5 10h.01M8 14h8" /></svg>
);
export const IPanelLeft = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M9 4v16" /></svg>
);
export const IMenu = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M4 7h16M4 12h16M4 17h16" /></svg>
);
export const IStop = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><rect x="7" y="7" width="10" height="10" rx="1.5" fill="currentColor" stroke="none" /></svg>
);
export const IInfo = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></svg>
);
export const ICheckCircle = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><circle cx="12" cy="12" r="9" /><path d="m8.5 12.5 2.3 2.3 4.7-5" /></svg>
);
export const IFile = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /></svg>
);
export const ICopy = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" /></svg>
);
export const ICornerDownLeft = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M20 5v7a3 3 0 0 1-3 3H5M9 11l-4 4 4 4" /></svg>
);
export const IBell = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>
);
export const IArrowUp = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M12 19V5M6 11l6-6 6 6" /></svg>
);
