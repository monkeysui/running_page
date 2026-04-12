import { Link, useLocation } from 'react-router-dom';
import { useMemo } from 'react';
import useSiteMetadata from '@/hooks/useSiteMetadata';
import { useTheme } from '@/hooks/useTheme';
import runningQuotes from '@/static/running-quotes';
import styles from './style.module.css';

const randomQuote =
  runningQuotes[Math.floor(Math.random() * runningQuotes.length)];

const Header = () => {
  const { siteUrl, navLinks } = useSiteMetadata();
  const location = useLocation();
  const isSummaryPage = location.pathname.includes('summary');

  const displayNavLinks = useMemo(() => {
    if (isSummaryPage) {
      return [
        { name: 'Overview', url: '/' },
        ...navLinks.filter((n) => !n.url.includes('summary')),
      ];
    }
    return navLinks;
  }, [isSummaryPage, navLinks]);

  const { theme, setTheme } = useTheme();

  // Icon represents the CURRENT theme; clicking switches to the other.
  const currentIconSvg =
    theme === 'dark' ? (
      <svg
        width="20"
        height="20"
        viewBox="0 0 22 23"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M21.7519 15.0137C20.597 15.4956 19.3296 15.7617 18 15.7617C12.6152 15.7617 8.25 11.3965 8.25 6.01171C8.25 4.68211 8.51614 3.41468 8.99806 2.25977C5.47566 3.72957 3 7.20653 3 11.2617C3 16.6465 7.36522 21.0117 12.75 21.0117C16.8052 21.0117 20.2821 18.536 21.7519 15.0137Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ) : (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M12 3.00464V5.25464M18.364 5.64068L16.773 7.23167M21 12.0046H18.75M18.364 18.3686L16.773 16.7776M12 18.7546V21.0046M7.22703 16.7776L5.63604 18.3686M5.25 12.0046H3M7.22703 7.23167L5.63604 5.64068M15.75 12.0046C15.75 14.0757 14.0711 15.7546 12 15.7546C9.92893 15.7546 8.25 14.0757 8.25 12.0046C8.25 9.93357 9.92893 8.25464 12 8.25464C14.0711 8.25464 15.75 9.93357 15.75 12.0046Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );

  const handleToggle = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <header
      className="fixed top-0 z-50 w-full border-b border-white/5 backdrop-blur-xl"
      style={{
        backgroundColor: 'color-mix(in srgb, var(--color-background) 80%, transparent)',
        boxShadow: '0 0 30px rgba(24, 149, 199, 0.08)',
      }}
    >
      <nav className="mx-auto flex h-20 w-full max-w-[1600px] items-center justify-between px-4 md:px-8">
        <Link
          to={siteUrl}
          className="font-headline text-xl font-extrabold tracking-tight md:text-2xl"
          style={{ color: 'var(--color-brand)' }}
        >
          Running Page
        </Link>

        <div className="hidden items-center gap-2 md:flex">
          {displayNavLinks.map((n, i) => {
            const isExternal = /^https?:\/\//.test(n.url);
            const className =
              'rounded-full px-4 py-1.5 text-sm font-medium text-[var(--color-on-surface-variant)] transition-colors hover:text-[var(--color-text-primary)]';
            return isExternal ? (
              <a key={i} href={n.url} className={className}>
                {n.name}
              </a>
            ) : (
              <Link key={i} to={n.url} className={className}>
                {n.name}
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          <div
            className="hidden max-w-sm truncate text-right text-xs leading-tight opacity-60 lg:block"
            style={{
              fontFamily:
                "'LXGW WenKai', 'Playfair Display', Georgia, serif",
            }}
            title={`"${randomQuote.text}" —— ${randomQuote.source}`}
          >
            <span className="italic">"{randomQuote.text}"</span>
            <span className="ml-2 opacity-70">— {randomQuote.source}</span>
          </div>
          <button
            type="button"
            onClick={handleToggle}
            className={`${styles.themeButton} ${styles.themeButtonActive} !h-9 !w-9`}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
          >
            <div className={styles.iconWrapper}>{currentIconSvg}</div>
          </button>
        </div>
      </nav>
    </header>
  );
};

export default Header;
