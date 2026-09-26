import { useEffect, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE || '';

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

function Close() {
  return (
    <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  );
}

function initials(name) {
  const parts = String(name || '').trim().split(/\s+/);
  const first = (parts[0] || '')[0] || '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] || '' : '';
  return (first + last).toUpperCase() || '?';
}

const BADGE_COLORS = [
  '#2563eb',
  '#7c3aed',
  '#059669',
  '#d97706',
  '#db2777',
  '#0d9488',
  '#dc2626',
  '#4f46e5',
];

function badgeColor(key) {
  let h = 0;
  for (const ch of String(key || '')) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return BADGE_COLORS[h % BADGE_COLORS.length];
}

const SUGGESTIONS = [
  'Frontend Developer',
  'Backend Engineer',
  'Data Scientist',
  'Product Manager',
  'DevOps Engineer',
  'Graphic Designer',
];

export default function App() {
  const [theme, setTheme] = useState(getInitialTheme);
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('');
  const [jobs, setJobs] = useState([]);
  const [status, setStatus] = useState('idle'); // idle | loading | done | error
  const [sourceErrors, setSourceErrors] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [workModes, setWorkModes] = useState([]); // [] = all | ['remote' | 'hybrid' | 'on-site']
  const [country, setCountry] = useState(''); // '' = all countries
  const [view, setView] = useState('jobs'); // 'jobs' | 'about'
  const [savedIds, setSavedIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('roundup-saved') || '[]');
    } catch {
      return [];
    }
  });
  const [jobTypes, setJobTypes] = useState([]); // [] = all | 'full-time' | 'part-time' | 'contract' | 'internship'
  const [experiences, setExperiences] = useState([]); // [] = all | 'entry' | 'mid' | 'senior'
  const [savedOnly, setSavedOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  function toggleWorkMode(mode) {
    setWorkModes((prev) =>
      prev.includes(mode) ? prev.filter((m) => m !== mode) : [...prev, mode]
    );
  }

  function toggleJobType(t) {
    setJobTypes((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    );
  }

  function toggleExperience(x) {
    setExperiences((prev) =>
      prev.includes(x) ? prev.filter((y) => y !== x) : [...prev, x]
    );
  }

  function toggleSave(id) {
    setSavedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function closeModal() {
    setSelectedJob(null);
  }

  async function runSearch(q, loc) {
    const term = (q ?? query).trim();
    if (!term) return;

    setStatus('loading');
    setHasSearched(true);
    setSelectedJob(null);
    setCountry('');
    setPage(1);
    setLoadingMore(false);
    setExperiences([]);

    try {
      const params = new URLSearchParams({ query: term });
      const useLoc = (loc ?? location).trim();
      if (useLoc) params.set('location', useLoc);

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

  function handleSearch(e) {
    e.preventDefault();
    runSearch();
  }

  async function handleLoadMore() {
    if (loadingMore) return;
    setLoadingMore(true);
    try {
      const params = new URLSearchParams({ query: query.trim(), page: String(page + 1) });
      if (location.trim()) params.set('location', location.trim());

      const res = await fetch(`${API_BASE}/api/jobs/search?${params.toString()}`);
      if (!res.ok) throw new Error(`Server responded ${res.status}`);
      const data = await res.json();

      setJobs((prev) => {
        const seen = new Set(prev.map((j) => j.id));
        const fresh = (data.jobs || []).filter((j) => !seen.has(j.id));
        return [...prev, ...fresh];
      });
      setSourceErrors(data.sourceErrors || []);
      setPage((p) => p + 1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMore(false);
    }
  }

  const sources = [...new Set(jobs.map((j) => j.source))];

  const allCountries = [...new Set(jobs.map((j) => j.country).filter(Boolean))].sort();

  const modeFiltered =
    workModes.length === 0
      ? jobs
      : jobs.filter((j) => j.workMode && workModes.includes(j.workMode));

  const typeFiltered =
    jobTypes.length === 0
      ? modeFiltered
      : modeFiltered.filter((j) => j.jobType && jobTypes.includes(j.jobType));

  const levelFiltered =
    experiences.length === 0
      ? typeFiltered
      : typeFiltered.filter((j) => j.experience && experiences.includes(j.experience));

  const countryFiltered = country
    ? levelFiltered.filter((j) => j.country === country)
    : levelFiltered;

  const filteredJobs = savedOnly
    ? countryFiltered.filter((j) => savedIds.includes(j.id))
    : countryFiltered;

  const filtersActive =
    workModes.length > 0 ||
    jobTypes.length > 0 ||
    experiences.length > 0 ||
    Boolean(country) ||
    savedOnly;

  const savedInResults = jobs.filter((j) => savedIds.includes(j.id)).length;

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('roundup-theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('roundup-saved', JSON.stringify(savedIds));
  }, [savedIds]);

  useEffect(() => {
    if (!selectedJob) return;
    function onKey(e) {
      if (e.key === 'Escape') setSelectedJob(null);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedJob]);

  return (
    <div className="page">
      <nav className="appbar">
        <span className="appbar__mark" onClick={() => { setView('jobs'); setSelectedJob(null); }} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { setView('jobs'); setSelectedJob(null); } }}>
          <SkillMark />
          Roundup
        </span>
        <div className="appbar__side">
          <button
            className={`appbar__link ${view === 'about' ? 'is-active' : ''}`}
            type="button"
            onClick={() => { setView(view === 'about' ? 'jobs' : 'about'); setSelectedJob(null); }}
          >
            About
          </button>
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
          <span className="appbar__edition">Find Jobs · Worldwide</span>
        </div>
      </nav>

      {view === 'about' ? (
        <section className="about">
          <h1 className="about__title">About Roundup</h1>
          <p className="about__lede">
            Roundup is a lightweight job aggregator that searches several
            global job boards at once and folds the results into a single,
            newest-first list.
          </p>
          <div className="about__grid">
            <article className="about__card">
              <h2 className="about__card-title">How it works</h2>
              <p className="about__card-body">
                Type a role, skill or title (optionally a city or region) and hit
                Search. Roundup queries every configured source in parallel,
                merges the results into one list, removes near-duplicates and
                sorts by posting date.
              </p>
            </article>
            <article className="about__card">
              <h2 className="about__card-title">Sources</h2>
              <p className="about__card-body">
                Live results come from{' '}
                <strong>Adzuna</strong> (17 country boards),{' '}
                <strong>Workable</strong> (global) and{' '}
                <strong>JSearch</strong> (a RapidAPI index of many boards). Each
                listing links back to the original posting.
              </p>
            </article>
            <article className="about__card">
              <h2 className="about__card-title">Filters</h2>
              <p className="about__card-body">
                Narrow results with the work-mode chips (remote, hybrid,
                on-site) in the search bar, then slice by type, experience
                level or country. Star jobs you like and filter to just your
                saved list.
              </p>
            </article>
          </div>
        </section>
      ) : (
        <>
          <header className="masthead">
        <p className="masthead__kicker">
          Search jobs across Adzuna · Workable · JSearch
        </p>
        <h1 className="masthead__title">
          Find your next role,<br />
          <em>anywhere.</em>
        </h1>
        <p className="masthead__tagline">
          One search across global job boards — deduped and sorted by recency.
          Pick from millions of live openings worldwide.
        </p>
        <div className="masthead__brands">
          <span>Adzuna</span>
          <span>Workable</span>
          <span>JSearch</span>
        </div>
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
        <div className="searchbar__group searchbar__group--mode">
          <span className="field-label">Work mode</span>
          <div className="mode-select" role="group" aria-label="Work mode">
            {[
              { value: 'all', label: 'All' },
              { value: 'remote', label: 'Remote' },
              { value: 'hybrid', label: 'Hybrid' },
              { value: 'on-site', label: 'On-site' },
            ].map(({ value, label }) => (
              <button
                key={value}
                type="button"
                aria-pressed={value === 'all' ? workModes.length === 0 : workModes.includes(value)}
                className={`mode-select__chip ${value === 'all' && workModes.length === 0 ? 'is-on' : ''} ${value !== 'all' && workModes.includes(value) ? 'is-on' : ''}`}
                onClick={() => (value === 'all' ? setWorkModes([]) : toggleWorkMode(value))}
              >
                {label}
              </button>
            ))}
          </div>
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

      {!hasSearched && (
        <div className="suggestions">
          <span className="suggestions__label">Trending</span>
          {SUGGESTIONS.map((t) => (
            <button
              key={t}
              type="button"
              className="suggestions__chip"
              onClick={() => {
                setQuery(t);
                setLocation('');
                runSearch(t, '');
              }}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      <p className="tip">
        <svg className="tip__ico" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 11v5" />
          <path d="M12 8v0.01" />
        </svg>
        Searching the same role a few times turns up different listings — boards
        rotate their feed, so check back often.
      </p>

      {sourceErrors.length > 0 && (
        <p className="notice">
          {sourceErrors.map((e) => e.source.replace('search', '')).join(' and ')} was unreachable —
          check its API key in <code>.env</code>. Showing everything else.
        </p>
      )}

      <main className="listings">
        {status === 'idle' && !hasSearched && (
          <div className="empty hero">
            <span className="hero__icon">
              <SearchIcon />
            </span>
            <h2 className="hero__title">Your next role starts here</h2>
            <p>
              We pull live openings from Adzuna, Workable and JSearch, merge
              them into one list and sort newest first.
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

            <div className="filters-row">
              {!location.trim() && allCountries.length > 1 && (
                <div className="country-filter">
                  <span className="country-filter__label">Country</span>
                  <div className="country-filter__wrap">
                    <select
                      className="country-filter__select"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      aria-label="Filter by country"
                    >
                      <option value="">All countries</option>
                      {allCountries.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                    <svg className="country-filter__arrow" viewBox="0 0 16 16" aria-hidden="true">
                      <path d="M4 6l4 4 4-4" />
                    </svg>
                  </div>
                </div>
              )}
              <button
                type="button"
                className={`mode-select__chip filters-chip ${savedOnly ? 'is-on' : ''}`}
                aria-pressed={savedOnly}
                onClick={() => setSavedOnly((v) => !v)}
              >
                Saved{!savedOnly && savedInResults > 0 ? ` (${savedInResults})` : ''}
              </button>
            </div>

            <div className="filters-row">
              <span className="filters-label">Type</span>
              <div className="mode-select mode-select--tight">
                <button
                  type="button"
                  className={`mode-select__chip ${jobTypes.length === 0 ? 'is-on' : ''}`}
                  aria-pressed={jobTypes.length === 0}
                  onClick={() => setJobTypes([])}
                >
                  Any
                </button>
                {[
                  { value: 'full-time', label: 'Full-time' },
                  { value: 'part-time', label: 'Part-time' },
                  { value: 'contract', label: 'Contract' },
                  { value: 'internship', label: 'Internship' },
                ].map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    className={`mode-select__chip ${jobTypes.includes(value) ? 'is-on' : ''}`}
                    aria-pressed={jobTypes.includes(value)}
                    onClick={() => toggleJobType(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {jobs.some((j) => j.experience) && (
              <div className="filters-row">
                <span className="filters-label">Level</span>
                <div className="mode-select mode-select--tight">
                  <button
                    type="button"
                    className={`mode-select__chip ${experiences.length === 0 ? 'is-on' : ''}`}
                    aria-pressed={experiences.length === 0}
                    onClick={() => setExperiences([])}
                  >
                    Any
                  </button>
                  {[
                    { value: 'entry', label: 'Entry' },
                    { value: 'mid', label: 'Mid' },
                    { value: 'senior', label: 'Senior' },
                  ].map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      className={`mode-select__chip ${experiences.includes(value) ? 'is-on' : ''}`}
                      aria-pressed={experiences.includes(value)}
                      onClick={() => toggleExperience(value)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {filtersActive && (
              <div className="resultsbar__count workfilters__count">
                <strong>{filteredJobs.length}</strong> matching
              </div>
            )}

            {filteredJobs.length === 0 ? (
              <div className="empty">
                {savedOnly ? (
                  <>
                    No saved roles in these results. Tap the{' '}
                    <span className="star-hint">☆</span> star on a listing to save it.
                  </>
                ) : (
                  <>
                    No roles match this search
                    {filtersActive && ' and your filters'}. Try a broader title, another
                    country, or clear a filter.
                  </>
                )}
              </div>
            ) : (
              filteredJobs.map((job, i) => (
              <div
                role="button"
                tabIndex={0}
                className="listing"
                key={job.id}
                onClick={() => setSelectedJob(job)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedJob(job);
                  }
                }}
              >
                <span className="listing__index">{String(i + 1).padStart(2, '0')}</span>
                <span className="listing__badge" style={{ background: badgeColor(job.company) }}>
                  {initials(job.company)}
                </span>
                <div className="listing__body">
                  <div className="listing__headline">
                    <h2 className="listing__title">{job.title}</h2>
                    <div className="listing__aside">
                      <span className="listing__source">{job.source}</span>
                      <button
                        type="button"
                        className={`listing__save ${savedIds.includes(job.id) ? 'is-saved' : ''}`}
                        aria-label={savedIds.includes(job.id) ? 'Remove from saved' : 'Save job'}
                        aria-pressed={savedIds.includes(job.id)}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSave(job.id);
                        }}
                      >
                        <StarIcon />
                      </button>
                      <span className="listing__open">
                        Details
                        <Arrow />
                      </span>
                    </div>
                  </div>
                  <p className="listing__meta">
                    <span className="listing__company">{job.company}</span>
                    {job.workMode && (
                      <>
                        <span className="dot" aria-hidden="true" />
                        <span className={`mode-tag mode-tag--${job.workMode}`}>{job.workMode}</span>
                      </>
                    )}
                    <span className="dot" aria-hidden="true" />
                    {job.location || job.source}
                    {job.salary && (
                      <>
                        <span className="dot" aria-hidden="true" />
                        <span className="salary">{job.salary}</span>
                      </>
                    )}
                    {timeAgo(job.postedAt) && (
                      <>
                        <span className="dot" aria-hidden="true" />
                        <span className="meta-date">
                          <ClockIcon />
                          {timeAgo(job.postedAt)}
                        </span>
                      </>
                    )}
                  </p>
                  {job.description && <p className="listing__desc">{job.description}…</p>}
                </div>
              </div>
              ))
            )}

            <div className="loadmore">
              <button
                type="button"
                className="loadmore__btn"
                onClick={handleLoadMore}
                disabled={loadingMore}
              >
                {loadingMore ? (
                  <>
                    <span className="spinner spinner--accent" aria-hidden="true" />
                    Loading…
                  </>
                ) : (
                  <>
                    Load more
                    <Arrow />
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </main>
        </>
      )}

      <footer className="foot">
        <p className="foot__brand">Roundup</p>
      </footer>

      {selectedJob && (
        <div className="modal" role="dialog" aria-modal="true" aria-label="Job details" onClick={closeModal}>
          <div className="modal__panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal__head">
              <div className="modal__head-left">
                <span className="modal__source">{selectedJob.source}</span>
                <button
                  type="button"
                  className={`modal__bookmark ${savedIds.includes(selectedJob.id) ? 'is-saved' : ''}`}
                  aria-label={savedIds.includes(selectedJob.id) ? 'Remove from saved' : 'Save job'}
                  aria-pressed={savedIds.includes(selectedJob.id)}
                  onClick={() => toggleSave(selectedJob.id)}
                >
                  <StarIcon />
                  {savedIds.includes(selectedJob.id) ? 'Saved' : 'Save'}
                </button>
              </div>
              <button
                type="button"
                className="modal__close"
                onClick={closeModal}
                aria-label="Close job details"
              >
                <Close />
              </button>
            </div>
            <h2 className="modal__title">{selectedJob.title}</h2>
            <div className="modal__companyrow">
              <span
                className="listing__badge modal__badge"
                style={{ background: badgeColor(selectedJob.company) }}
              >
                {initials(selectedJob.company)}
              </span>
              <p className="modal__company">{selectedJob.company}</p>
            </div>
            <p className="modal__meta">
              <span className="meta-highlight">{selectedJob.location || selectedJob.source}</span>
              {selectedJob.workMode && (
                <>
                  <span className="modal__dot" aria-hidden="true" />
                  <span className={`mode-tag mode-tag--${selectedJob.workMode}`}>
                    {selectedJob.workMode}
                  </span>
                </>
              )}
              {selectedJob.salary && (
                <>
                  <span className="modal__dot" aria-hidden="true" />
                  <span className="salary">{selectedJob.salary}</span>
                </>
              )}
              {timeAgo(selectedJob.postedAt) && (
                <>
                  <span className="modal__dot" aria-hidden="true" />
                  <span className="meta-date">
                    <ClockIcon />
                    {timeAgo(selectedJob.postedAt)}
                  </span>
                </>
              )}
            </p>
            <div className="modal__body">
              <h3 className="modal__section">Description</h3>
              {selectedJob.description ? (
                <p className="modal__desc">{selectedJob.description}</p>
              ) : (
                <p className="modal__desc modal__desc--missing">
                  No description was provided by {selectedJob.source} for this listing.
                </p>
              )}
            </div>
            <div className="modal__foot">
              <a
                className="modal__cta"
                href={selectedJob.url}
                target="_blank"
                rel="noreferrer noopener"
              >
                Visit job posting
                <Arrow />
              </a>
            </div>
          </div>
        </div>
      )}
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