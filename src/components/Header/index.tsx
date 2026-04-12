import { Link, useLocation } from 'react-router-dom';
import { useMemo } from 'react';
import useSiteMetadata from '@/hooks/useSiteMetadata';
import runningQuotes from '@/static/running-quotes';

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

  return (
    <header
      className="fixed top-0 z-50 w-full border-b border-white/5 backdrop-blur-xl"
      style={{
        backgroundColor: 'color-mix(in srgb, var(--color-background) 80%, transparent)',
        boxShadow: '0 0 30px rgba(142, 255, 113, 0.06)',
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

        <div
          className="hidden max-w-md text-right text-xs leading-relaxed opacity-60 lg:block"
          style={{
            fontFamily:
              "'LXGW WenKai', 'Playfair Display', Georgia, serif",
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
          title={`"${randomQuote.text}" —— ${randomQuote.source}`}
        >
          <span className="italic">"{randomQuote.text}"</span>
          <span className="ml-2 opacity-70">— {randomQuote.source}</span>
        </div>
      </nav>
    </header>
  );
};

export default Header;
