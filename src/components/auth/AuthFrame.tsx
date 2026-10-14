import Logo from "@/components/Logo";
import { ILock } from "@/components/Icons";

export default function AuthFrame({ children }: { children: React.ReactNode }) {
  return (
    <main className="auth-page">
      <section className="auth-brand" aria-label="LTB Law">
        <div className="auth-wordmark"><Logo size={42} /><span>LTB <strong>Law</strong></span></div>
        <div className="auth-brand-copy">
          <p className="auth-kicker">Privatni pravni radni prostor</p>
          <h1>Jasnoća u svakom<br />pravnom koraku.</h1>
          <p>Dokumenti, pravno istraživanje i znanje vašeg ureda. Povezani u jednom, pažljivo organiziranom radnom prostoru.</p>
        </div>
        <div className="auth-brand-footer"><ILock size={16} /><span>Pristup isključivo ovlaštenim korisnicima</span></div>
      </section>
      <section className="auth-panel">{children}</section>
    </main>
  );
}
