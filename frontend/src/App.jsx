import { useEffect, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE || '';

const QUICK_PICKS = ['Frontend Developer', 'Data Analyst', 'Product Designer', 'DevOps Engineer', 'Backend Developer', 'Remote'];

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
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function logoInitials(company = '') {
  const words = company
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2);
  if (words.length === 0) return '?';
  return words.map((w) => w[0].toUpperCase()).join('');
}

function logoColor(company = '') {
  const classes = ['logo-a', 'logo-b', 'logo-c', 'logo-d', 'logo-e', 'logo-f'];
  let hash = 0;
  for (let i = 0; i < company.length; i++) hash = (hash * 31 + company.charCodeAt(i)) >>> 0;
  return classes[hash % classes.length];
}

function sourceClass(source = '') {
  const key = source.toLowerCase().replace(/[\s.'-]/g, '');
  const map = { adzuna: 'src-adzuna', jooble: 'src-jooble', linkedin: 'src-linkedin', indeed: 'src-indeed', glassdoor: 'src-glassdoor', ziprecruiter: 'src-ziprecruiter' };
  return map[key] || 'src-default';
}

function LogoMark() {
  return (
    <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" />
      <circle cx="12" cy="12" r="3.4" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg className="search-ico" viewBox="0 0 24 24" role="img" aria-hidden="true">
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

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 2.5v2.4M12 19.1v2.4M2.5 12h2.4M19.1 12h2.4M5 5l1.7 1.7M17.3 17.3L19 19M19 5l-1.7 1.7M6.7 17.3L5 19" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
      <path d="M20 15.4A8.8 8.8 0 0 1 9.2 4.6a8.8 8.8 0 1 0 10.8 10.8z" />
    </svg>
  );
}

function BriefcaseIcon() {
  return (
    <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
      <rect x="3.5" y="7.5" width="17" height="12" rx="2" />
      <path d="M9 7.5V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1.5M3.5 13h17" />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.6 3.8 5.7 3.8 9S14.5 18.4 12 21c-2.5-2.6-3.8-5.7-3.8-9S9.5 5.6 12 3z" />
    </svg>
  );
}

function LayersIcon() {
  return (
    <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
      <path d="M12 3.5l8.5 4.5L12 12.5 3.5 8z" />
      <path d="M3.5 12.5L12 17l8.5-4.5M3.5 16.5L12 21l8.5-4.5" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
      <path d="M12 4L2.5 20h19L12 4z" />
      <path d="M12 10v4.2M12 17.4v.1" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" />
    </svg>
  );
}

function JobCard({ job }) {
  return (
    <a className="jobcard" href={job.url} target="_blank" rel="noreferrer">
      <span className={`jobcard__logo ${logoColor(job.company)}`}>{logoInitials(job.company)}</span>
      <div className="jobcard__body">
        <div className="jobcard__top">
          <h3 className="jobcard__title">{job.title}</h3>
          <span className={`source-tag ${sourceClass(job.source)}`}>{job.source}</span>
        </div>
        <div className="jobcard__meta">
          <span className="meta-item meta-item--company">{job.company}</span>
          {job.location && (
            <span className="meta-item">
              <PinIcon />
              {job.location}
            </span>
          )}
          {job.salary && <span className="meta-item meta-item--salary">{job.salary}</span>}
          {timeAgo(job.postedAt) && <span className="meta-item meta-item--date">{timeAgo(job.postedAt)}</span>}
        </div>
        {job.description && <p className="jobcard__desc">{job.description}</p>}
      </div>
      <span className="jobcard__action">
        Apply
        <ArrowIcon />
      </span>
    </a>
  );
}

function SkeletonRow() {
  return (
    <div className="skeleton" aria-hidden="true">
      <span className="skeleton__logo" />
      <div>
        <span className="skeleton__bar skeleton__title" />
        <span className="skeleton__bar skeleton__meta" />
        <span className="skeleton__bar skeleton__desc" />
      </div>
    </div>
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

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('roundup-theme', theme);
  }, [theme]);

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

  return (
    <div className="page">
      <nav className="appbar">
        <a className="appbar__mark" href="#top" aria-label="Roundup home">
          <span className="appbar__logo">
            <LogoMark />
          </span>
          Roundup
        </a>
        <div className="appbar__nav">
          <a className="appbar__link is-active" href="#top">
            Find jobs
          </a>
          <a className="appbar__link is-disabled" href="#top" aria-disabled="true">
            Saved jobs
          </a>
          <a className="appbar__link is-disabled" href="#top" aria-disabled="true">
            Alerts
          </a>
        </div>
        <div className="appbar__actions">
          <button
            className="theme-toggle"
            type="button"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
          >
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          </button>
        </div>
      </nav>

      <header className="hero" id="top">
        <p className="hero__kicker">
          <GlobeIcon />
          Worldwide job search
        </p>
        <h1 className="hero__title">
          Find your next role, <span className="grad">anywhere on Earth.</span>
        </h1>
        <p className="hero__sub">
          One search across Adzuna, Jooble and live boards like LinkedIn and Indeed — merged,
          deduplicated, and sorted into a single list.
        </p>

        <form className="search-panel" onSubmit={handleSearch}>
          <div className="searchbar">
            <div className="searchbar__group">
              <label className="field-label" htmlFor="field-query">
                <BriefcaseIcon />
                Role, skill or title
              </label>
              <input
                id="field-query"
                className="searchbar__field"
                type="text"
                placeholder="e.g. frontend developer"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div className="searchbar__group">
              <label className="field-label" htmlFor="field-location">
                <PinIcon />
                Location
              </label>
              <input
                id="field-location"
                className="searchbar__field"
                type="text"
                placeholder="City or country (optional)"
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
                  <SearchIcon />
                  Search
                </>
              )}
            </button>
          </div>

          <div className="quicksearches">
            <span className="quicksearches__label">Popular:</span>
            {QUICK_PICKS.map((pic) => (
              <button
                key={pic}
                className="chip"
                type="button"
                onClick={() => {
                  setQuery(pic);
                  if (pic === 'Remote') setLocation('remote');
                }}
              >
                {pic}
              </button>
            ))}
          </div>
        </form>
      </header>

      {sourceErrors.length > 0 && (
        <p className="notice" role="alert">
          <AlertIcon />
          <span>
            {sourceErrors.map((e) => e.source.replace('search', '')).join(' and ')} was unreachable
            during this search. Results from other sources are shown below.
          </span>
        </p>
      )}

      {status === 'idle' && !hasSearched && (
        <section className="features" aria-label="What Roundup does">
          <div className="feature">
            <span className="feature__ico">
              <LayersIcon />
            </span>
            <h2 className="feature__title">Aggregated boards</h2>
            <p className="feature__text">
              Adzuna and JSearch pull listings from dozens of boards — LinkedIn, Indeed, Glassdoor,
              ZipRecruiter and more — into one result list.
            </p>
          </div>
          <div className="feature">
            <span className="feature__ico">
              <GlobeIcon />
            </span>
            <h2 className="feature__title">Worldwide reach</h2>
            <p className="feature__text">
              Results from 17+ countries at once. Type a role and see openings across the globe, or
              pin a city to zoom in.
            </p>
          </div>
          <div className="feature">
            <span className="feature__ico">
              <ListIcon />
            </span>
            <h2 className="feature__title">Deduplicated</h2>
            <p className="feature__text">
              The same posting on multiple boards shows up once, tagged with where it lives, so you
              only review each role one time.
            </p>
          </div>
        </section>
      )}

      <main className="section">
        {status === 'loading' && (
          <div className="listings">
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </div>
        )}

        {status === 'error' && (
          <div className="empty-state">
            <span className="empty-state__ico is-danger">
              <AlertIcon />
            </span>
            <h2 className="empty-state__title">Couldn't reach the backend</h2>
            <p className="empty-state__text">
              Make sure the API server is running on port 5000 ({' '}
              <code>npm run dev</code> in <code>backend/</code> ), then try again.
            </p>
          </div>
        )}

        {status === 'done' && jobs.length === 0 && (
          <div className="empty-state">
            <span className="empty-state__ico">
              <SearchIcon />
            </span>
            <h2 className="empty-state__title">No listings matched </h2>
            <p className="empty-state__text">
              Try a broader title like “developer”, drop the location, or search in English for the
              widest coverage.
            </p>
          </div>
        )}

        {status === 'done' && jobs.length > 0 && (
          <>
            <div className="results-head">
              <p className="results-head__query">
                <em>{jobs.length}</em> roles for “{query}”
                {location && ` in ${location}`}
              </p>
              <div className="results-head__meta">
                <span className="count-badge">{jobs.length}</span>
                <span className="sources-pills">
                  {sources.map((s) => (
                    <span key={s} className="pill">
                      {s}
                    </span>
                  ))}
                </span>
              </div>
            </div>

            <div className="listings">
              {jobs.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
          </>
        )}
      </main>

      <footer className="foot">
        <p className="foot__brand">
          <LogoMark />
          Roundup
        </p>
        <p>Every listing, one search. Built with Adzuna and JSearch.</p>
      </footer>
    </div>
  );
}