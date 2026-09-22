import { useEffect, useMemo, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE || '';

const SOURCE_LIST = ['Adzuna', 'Jooble', 'JSearch'];

const SORTS = [
  { id: 'recent', label: 'Most recent' },
  { id: 'company', label: 'Company A–Z' },
  { id: 'salary', label: 'Salary (high first)' },
];

const EMPTY_JOB = {
  id: null,
  title: '',
  company: '',
  location: '',
  salary: '',
  description: '',
  url: '',
  source: '',
  postedAt: null,
};

function getInitialTheme() {
  const saved = localStorage.getItem('roundup-theme');
  if (saved === 'dark' || saved === 'light') return saved;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function timeAgo(dateStr) {
  if (!dateStr) return 'Recently';
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  if (Number.isNaN(days)) return 'Recently';
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function monogram(company = '') {
  const words = company
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2);
  return words.length ? words.map((w) => w[0].toUpperCase()).join('') : '?';
}

function monogramClass(company = '') {
  const classes = ['mc-a', 'mc-b', 'mc-c', 'mc-d', 'mc-e', 'mc-f', 'mc-g', 'mc-h'];
  let hash = 0;
  for (let i = 0; i < company.length; i++) hash = (hash * 31 + company.charCodeAt(i)) >>> 0;
  return classes[hash % classes.length];
}

function sortLabel(id) {
  return SORTS.find((s) => s.id === id)?.label || '';
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

function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

function ExternalIcon() {
  return (
    <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
      <path d="M14 4h6v6M20 4L10 14" />
      <path d="M18 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7v5l3.2 2" />
    </svg>
  );
}

function Spinner() {
  return <span className="spinner" aria-hidden="true" />;
}

function JobRow({ job, active, onSelect }) {
  return (
    <button
      type="button"
      className={`jobrow${active ? ' is-active' : ''}`}
      onClick={() => onSelect(job)}
    >
      <span className={`jobrow__logo ${monogramClass(job.company)}`}>{monogram(job.company)}</span>
      <span className="jobrow__body">
        <span className="jobrow__top">
          <span className="jobrow__title">{job.title}</span>
        </span>
        <span className="jobrow__company">{job.company}</span>
        <span className="jobrow__meta">
          {job.location && (
            <span className="jobrow__loc">
              <PinIcon />
              {job.location}
            </span>
          )}
          {job.salary && <span className="jobrow__salary">{job.salary}</span>}
        </span>
        {job.description && <span className="jobrow__snippet">{job.description}</span>}
        <span className="jobrow__foot">
          <span className="jobrow__source">
            via <strong>{job.source}</strong>
          </span>
          <span className="jobrow__date">{timeAgo(job.postedAt)}</span>
        </span>
      </span>
      <span className="jobrow__chevron">
        <ChevronIcon />
      </span>
    </button>
  );
}

function SkeletonRow() {
  return (
    <div className="jobrow skeleton" aria-hidden="true">
      <span className="skeleton__logo" />
      <span className="jobrow__body">
        <span className="skeleton__bar skeleton__bar--title" />
        <span className="skeleton__bar skeleton__bar--company" />
        <span className="skeleton__bar skeleton__bar--snippet" />
      </span>
    </div>
  );
}

function DetailPane({ job }) {
  const hasJob = Boolean(job.id);
  return (
    <aside className="detail">
      <div className="detail__accent" />
      {!hasJob && (
        <div className="detail__empty">
          <p className="detail__empty-title">Select a job to see details</p>
          <p className="detail__empty-text">
            Results are shown on the left. Click any listing to read the description and apply.
          </p>
        </div>
      )}
      {hasJob && (
        <>
          <div className="detail__head">
            <span className="detail__source">
              {job.source} listing
            </span>
            <h2 className="detail__title">{job.title}</h2>
            <p className="detail__company">{job.company}</p>
            <div className="detail__facts">
              {job.location && (
                <div className="fact">
                  <span className="fact__ico">
                    <PinIcon />
                  </span>
                  <span>
                    <span className="fact__label">Location</span>
                    <span className="fact__value">{job.location}</span>
                  </span>
                </div>
              )}
              {job.salary && (
                <div className="fact">
                  <span className="fact__ico">
                    <span className="fact__salary-symbol">₹</span>
                  </span>
                  <span>
                    <span className="fact__label">Est. salary</span>
                    <span className="fact__value fact__value--salary">{job.salary}</span>
                  </span>
                </div>
              )}
              <div className="fact">
                <span className="fact__ico">
                  <ClockIcon />
                </span>
                <span>
                  <span className="fact__label">Posted</span>
                  <span className="fact__value">{timeAgo(job.postedAt)}</span>
                </span>
              </div>
            </div>
            <div className="detail__actions">
              <a className="btn-apply" href={job.url} target="_blank" rel="noreferrer">
                Apply on {job.source}
                <ExternalIcon />
              </a>
            </div>
          </div>
          <div className="detail__body">
            <h3 className="detail__body-title">Job description</h3>
            <p className="detail__desc">{job.description}</p>
            {!job.description && (
              <p className="detail__desc">No description was provided for this listing.</p>
            )}
          </div>
          <div className="detail__foot">
            <p className="detail__source-note">
              Found via {job.source}. Apply link opens the original posting.
            </p>
          </div>
        </>
      )}
    </aside>
  );
}

export default function App() {
  const [theme, setTheme] = useState(getInitialTheme);
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('');
  const [jobs, setJobs] = useState([]);
  const [status, setStatus] = useState('idle'); // idle | loading | done | error
  const [selectedJob, setSelectedJob] = useState(EMPTY_JOB);
  const [hasSearched, setHasSearched] = useState(false);
  const [filter, setFilter] = useState('All');
  const [sortBy, setSortBy] = useState('recent');

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('roundup-theme', theme);
  }, [theme]);

  async function handleSearch(e) {
    e.preventDefault();
    if (!query.trim()) return;

    setStatus('loading');
    setHasSearched(true);
    setSelectedJob(EMPTY_JOB);
    setFilter('All');
    setSortBy('recent');

    try {
      const params = new URLSearchParams({ query });
      if (location.trim()) params.set('location', location.trim());

      const res = await fetch(`${API_BASE}/api/jobs/search?${params.toString()}`);
      if (!res.ok) throw new Error(`Server responded ${res.status}`);
      const data = await res.json();

      setJobs(data.jobs || []);
      setSelectedJob(data.jobs?.[0] ? { ...data.jobs[0] } : EMPTY_JOB);
      setStatus('done');
    } catch (err) {
      console.error(err);
      setStatus('error');
    }
  }

  const sourceOptions = useMemo(() => {
    return [...new Set(jobs.map((j) => j.source))];
  }, [jobs]);

  const visibleJobs = useMemo(() => {
    let out = jobs;
    if (filter !== 'All') out = out.filter((j) => j.source === filter);
    const sorted = [...out];
    if (sortBy === 'company') {
      sorted.sort((a, b) => (a.company || '').localeCompare(b.company || ''));
    } else if (sortBy === 'salary') {
      sorted.sort((a, b) => (toSalaryNumber(b.salary) || 0) - (toSalaryNumber(a.salary) || 0));
    } else {
      sorted.sort(
        (a, b) =>
          (b.postedAt ? Date.parse(b.postedAt) : 0) - (a.postedAt ? Date.parse(a.postedAt) : 0)
      );
    }
    return sorted;
  }, [jobs, filter, sortBy]);

  return (
    <div className="page">
      <header className="topbar">
        <a className="topbar__brand" href="#top" aria-label="Roundup home">
          <span className="topbar__logo">
            <LogoMark />
          </span>
          Roundup
        </a>
        <nav className="topbar__nav">
          <a className="topbar__link is-active" href="#top">
            Find jobs
          </a>
          <span className="topbar__link is-disabled">Saved</span>
          <span className="topbar__link is-disabled">Alerts</span>
        </nav>
        <button
          className="theme-toggle"
          type="button"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
        >
          {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
        </button>
      </header>

      <form className="searchbar" onSubmit={handleSearch}>
        <div className="searchbar__group searchbar__group--what">
          <label className="searchbar__label" htmlFor="field-query">
            What
          </label>
          <input
            id="field-query"
            className="searchbar__field"
            type="text"
            placeholder="Job title, keywords, or company"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="searchbar__group">
          <label className="searchbar__label" htmlFor="field-location">
            Where
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
              <Spinner />
              Searching
            </>
          ) : (
            <>
              <SearchIcon />
              Search
            </>
          )}
        </button>
      </form>
      <p className="searchbar__hint">
        Aggregating {SOURCE_LIST.join(' · ')} · worldwide coverage
      </p>

      {status === 'error' && (
        <div className="state state--error" role="alert">
          <p className="state__title">Couldn't reach the backend</p>
          <p className="state__text">
            Make sure the API server is running on port 5000 (<code>npm run dev</code> in{' '}
            <code>backend/</code>), then search again.
          </p>
        </div>
      )}

      {status === 'loading' && (
        <div className="layout">
          <section className="results">
            <div className="results__head">
              <p className="results__count">Searching…</p>
            </div>
            <div className="results__list">
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
            </div>
          </section>
          <DetailPane job={EMPTY_JOB} />
        </div>
      )}

      {status === 'idle' && !hasSearched && (
        <div className="state">
          <p className="state__title">Kick off with a search</p>
          <p className="state__text">
            Type a role above and we'll pull matching jobs from Adzuna, Jooble and JSearch — across
            dozens of boards like LinkedIn, Indeed and Glassdoor — into one list.
          </p>
        </div>
      )}

      {status === 'done' && jobs.length === 0 && (
        <div className="state">
          <p className="state__title">No jobs found</p>
          <p className="state__text">
            Try a broader title (like “developer”), remove the location, or check your spelling.
          </p>
        </div>
      )}

      {status === 'done' && jobs.length > 0 && (
        <div className="layout">
          <section className="results">
            <div className="results__head">
              <p className="results__count">
                <strong>{visibleJobs.length}</strong> {visibleJobs.length === 1 ? 'job' : 'jobs'}
                {filter !== 'All' && ` from ${filter}`}
                {location && ` near ${location}`}
                {!location && filter === 'All' && ' worldwide'}
                <span className="results__sub">· sorted by {sortLabel(sortBy).toLowerCase()}</span>
              </p>
              {sourceOptions.length > 1 && (
                <div className="filters">
                  <button
                    type="button"
                    className={`filter-chip${filter === 'All' ? ' is-active' : ''}`}
                    onClick={() => setFilter('All')}
                  >
                    All
                  </button>
                  {sourceOptions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      className={`filter-chip${filter === s ? ' is-active' : ''}`}
                      onClick={() => setFilter(s)}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
              <label className="sort">
                <span className="sort__label">Sort</span>
                <select
                  className="sort__select"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  {SORTS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {visibleJobs.length === 0 ? (
              <div className="state state--compact">
                <p className="state__title">No results for this filter</p>
                <p className="state__text">
                  Try “All” or another source to see more listings.
                </p>
              </div>
            ) : (
              <div className="results__list">
                {visibleJobs.map((job) => (
                  <JobRow key={job.id} job={job} active={selectedJob.id === job.id} onSelect={setSelectedJob} />
                ))}
              </div>
            )}
          </section>
          <DetailPane job={selectedJob} />
        </div>
      )}

      <footer className="foot">
        <p>© 2026 Roundup · Jobs aggregated from Adzuna, Jooble and JSearch.</p>
      </footer>
    </div>
  );
}

function toSalaryNumber(raw) {
  if (!raw) return 0;
  const nums = raw.match(/[\d.]+/g);
  if (!nums) return 0;
  return parseFloat(nums[nums.length - 1] || 0) || 0;
}