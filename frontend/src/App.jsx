import { useEffect, useState } from 'react';

const API_BASE =
  import.meta.env.VITE_API_BASE ||
  (window.location.hostname === 'localhost' ? 'http://localhost:5000' : '');

function getInitialTheme() {
  const saved = localStorage.getItem('roundup-theme');
  if (saved === 'dark' || saved === 'light') return saved;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function timeAgo(dateStr) {
  if (!dateStr) return null;
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  if (Number.isNaN(days)) return null;
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  return `${days}d ago`;
}

function SkillMark() {
  return (
    <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
      <circle cx="12" cy="12" r="3.4" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9L17 7M7 17l-2.1 2.1" />
    </svg>
  );
}

function Arrow() {
  return (
    <svg className="arrow__ico" viewBox="0 0 16 16" role="img" aria-hidden="true">
      <path d="M5 3l5 5-5 5" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="M16.5 16.5L21 21" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
      <path d="M12 21s-7-5.1-7-11a7 7 0 0 1 14 0c0 5.9-7 11-7 11z" />
      <circle cx="12" cy="10" r="2.6" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
      <path d="M12 3.5l2.4 5 5.6.6-4.2 3.8 1.2 5.5-5-2.8-5 2.8 1.2-5.5L4 9.1l5.6-.6z" />
    </svg>
  );
}

export default function App() {
  const [theme, setTheme] = useState(getInitialTheme);
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('');
  const [jobs, setJobs] = useState([]);
  const [status, setStatus] = useState('idle'); // idle | loading | done | error
  const [sourceErrors, setSourceErrors] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);

  async function handleSearch(e) {
    e.preventDefault();
    if (!query.trim()) return;

    setStatus('loading');
    setHasSearched(true);

    try {
      const params = new URLSearchParams({ query });
      if (location.trim()) params.set('location', location.trim());

      const res = await fetch(`${API_BASE}/api/jobs/search?${params.toString()}`);
      if (!res.ok) throw new Error(`Server responded ${res.status}`);
      const data = await res.json();

      setJobs(data.jobs || []);
      setSourceErrors(data.sourceErrors || []);
      setStatus('done');
    } catch (err) {
      console.error(err);
      setStatus('error');
    }
  }

  const sources = [...new Set(jobs.map((j) => j.source))];

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('roundup-theme', theme);
  }, [theme]);

  return (
    <div className="page">
      <nav className="appbar">
        <span className="appbar__mark">
          <SkillMark />
          Roundup
        </span>
        <div className="appbar__side">
          <button
            className="theme-toggle"
            type="button"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            <span className={`theme-toggle__icon ${theme === 'light' ? 'is-visible' : ''}`}>
              <StarIcon />
            </span>
            <span className={`theme-toggle__icon ${theme === 'dark' ? 'is-visible' : ''}`}>
              <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
                <path d="M20 15A8.5 8.5 0 0 1 9 4a8.5 8.5 0 1 0 11 11z" />
              </svg>
            </span>
          </button>
          <span className="appbar__edition">No. 01</span>
        </div>
      </nav>

      <header className="masthead">
        <p className="masthead__kicker">
          The Roundup · No. 01 ·{' '}
          {new Intl.DateTimeFormat('en-GB', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          }).format(new Date())}
        </p>
        <h1 className="masthead__title">
          Every listing,<br />
          <em>one search.</em>
        </h1>
        <p className="masthead__tagline">
          A single pass across Adzuna and Jooble, deduped into one list. Click a
          result to open the original posting where it lives.
        </p>
      </header>

      <form className="searchbar" onSubmit={handleSearch}>
        <div className="searchbar__group">
          <label className="field-label" htmlFor="field-query">
            <SearchIcon />
            Role, skill or title
          </label>
          <input
            id="field-query"
            className="searchbar__field searchbar__field--main"
            type="text"
            placeholder="e.g. frontend developer"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="searchbar__group searchbar__group--pin">
          <label className="field-label" htmlFor="field-location">
            <PinIcon />
            Location
          </label>
          <input
            id="field-location"
            className="searchbar__field"
            type="text"
            placeholder="City or region (optional)"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </div>
        <button className="searchbar__submit" type="submit" disabled={status === 'loading'}>
          {status === 'loading' ? (
            <>
              <span className="spinner" aria-hidden="true" />
              Searching
            </>
          ) : (
            <>
              Search
              <Arrow />
            </>
          )}
        </button>
      </form>

      {sourceErrors.length > 0 && (
        <p className="notice">
          {sourceErrors.map((e) => e.source.replace('search', '')).join(' and ')} was unreachable —
          check its API key in <code>.env</code>. Showing everything else.
        </p>
      )}

      <main className="listings">
        {status === 'idle' && !hasSearched && (
          <div className="empty hero">
            <p>
              Query any board from one box. Results from every configured source
              line up newest first — best for chasing a role before the crowd does.
            </p>
          </div>
        )}

        {status === 'loading' && (
          <>
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </>
        )}

        {status === 'error' && (
          <div className="empty empty--error">
            Couldn't reach the backend. Is it running on port 5000? Start it with{' '}
            <code>npm run dev</code> in <code>backend/</code>.
          </div>
        )}

        {status === 'done' && jobs.length === 0 && (
          <div className="empty">
            No listings matched that search. Try a broader title or drop the location.
          </div>
        )}

        {status === 'done' && jobs.length > 0 && (
          <>
            <div className="resultsbar">
              <span className="resultsbar__count">
                <strong>{jobs.length}</strong> roles found
              </span>
              <span className="resultsbar__sources">via {sources.join(' · ') || '—'}</span>
            </div>

            {jobs.map((job, i) => (
              <a className="listing" key={job.id} href={job.url} target="_blank" rel="noreferrer">
                <span className="listing__index">{String(i + 1).padStart(2, '0')}</span>
                <div className="listing__body">
                  <div className="listing__headline">
                    <h2 className="listing__title">{job.title}</h2>
                    <div className="listing__aside">
                      <span className="listing__source">{job.source}</span>
                      <span className="listing__open">
                        Open
                        <Arrow />
                      </span>
                    </div>
                  </div>
                  <p className="listing__meta">
                    <span className="listing__company">{job.company}</span>
                    <span className="dot" aria-hidden="true" />
                    {job.location}
                    {job.salary && (
                      <>
                        <span className="dot" aria-hidden="true" />
                        <span className="meta-highlight">{job.salary}</span>
                      </>
                    )}
                    {timeAgo(job.postedAt) && (
                      <>
                        <span className="dot" aria-hidden="true" />
                        {timeAgo(job.postedAt)}
                      </>
                    )}
                  </p>
                  {job.description && <p className="listing__desc">{job.description}…</p>}
                </div>
              </a>
            ))}
          </>
        )}
      </main>

      <footer className="foot">
        <p className="foot__brand">Roundup</p>
      </footer>
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="listing skeleton" aria-hidden="true">
      <span className="skeleton__bar skeleton__bar--index" />
      <div className="listing__body">
        <span className="skeleton__bar skeleton__bar--title" />
        <span className="skeleton__bar skeleton__bar--meta" />
        <span className="skeleton__bar skeleton__bar--desc" />
      </div>
    </div>
  );
}