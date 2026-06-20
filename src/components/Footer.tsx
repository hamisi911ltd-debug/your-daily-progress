import { Link } from "@tanstack/react-router";

export function Footer() {
  return (
    <footer className="mt-24 border-t border-border/60 bg-secondary text-secondary-foreground">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-2">
          <img
            src="/logo.png"
            alt="Fanmeeet"
            className="h-14 w-auto rounded-xl object-contain"
          />
          <p className="mt-3 max-w-sm text-sm text-secondary-foreground/70">
            Kenya's marketplace for booking private live video sessions with the creators you love.
            Powered by M-Pesa.
          </p>
        </div>
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-secondary-foreground/60">
            Marketplace
          </p>
          <ul className="space-y-2 text-sm">
            <li>
              <Link to="/browse" className="hover:text-accent">
                Browse creators
              </Link>
            </li>
            <li>
              <Link to="/become-creator" className="hover:text-accent">
                Become a creator
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-secondary-foreground/60">
            Company
          </p>
          <ul className="space-y-2 text-sm">
            <li>Nairobi, Kenya</li>
            <li>hello@fanmeeet.com</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-secondary-foreground/10 py-4 text-center text-xs text-secondary-foreground/50">
        © 2026 Fanmeeet. All rights reserved.
      </div>
    </footer>
  );
}
