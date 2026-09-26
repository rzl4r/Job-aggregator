require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

// ---------- Helpers ----------

// Turn a string into a loose key so we can spot the "same" job
// posted on more than one source (e.g. "Software Engineer" @ "Acme Inc.")
function normalizeKey(title = '', company = '') {
  return `${title}::${company}`
    .toLowerCase()
    .replace(/[^a-z0-9:]/g, '')
    .trim();
}

// ---------- Source adapters ----------
// Each adapter takes the same search params and returns an array of
// jobs already reshaped into one common format:
// { id, title, company, location, country, salary, description, url, source, postedAt, workMode, jobType, experience }

// Heuristic: figure out remote/hybrid/on-site from a text blob when the
// source API doesn't tell us directly.
function inferWorkMode(...texts) {
  const hay = texts.join(' ').toLowerCase();
  if (/\bremote\b|work from home|wfh|\(remote\)/.test(hay)) return 'remote';
  if (/\bhybrid\b|flexible\/hybrid/.test(hay)) return 'hybrid';
  return 'on-site';
}

const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
const NON_COUNTRIES = new Set([
  'remote',
  'hybrid',
  'worldwide',
  'global',
  'international',
  'anywhere',
  'multiple',
  'any',
  'elsewhere',
  'not specified',
  'various',
]);

function countryFromCode(code) {
  const c = String(code || '').trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(c)) return null;
  try {
    return regionNames.of(c);
  } catch {
    return null;
  }
}

function extractCountry(locString) {
  if (!locString) return null;
  const parts = String(locString)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const last = parts[parts.length - 1];
  if (!last || last.length < 3 || !/^[A-Za-z .'-]+$/.test(last)) return null;
  if (NON_COUNTRIES.has(last.toLowerCase())) return null;
  return last;
}

// Map of common country/city names → the country name JSearch/Workable/Adzuna
// use in their `country` field. Used to hard-filter results when the user
// types a location ("india" → only India jobs).
const LOCATION_COUNTRY = {
  india: 'India', indian: 'India', bangalore: 'India', bengaluru: 'India', mumbai: 'India',
  delhi: 'India', hyderabad: 'India', pune: 'India', chennai: 'India', kolkata: 'India',
  gurgaon: 'India', gurugram: 'India', noida: 'India', ahmedabad: 'India', kochi: 'India',
  indore: 'India', jaipur: 'India', nagpur: 'India', bhopal: 'India', chandigarh: 'India',
  'united states': 'United States', usa: 'United States', america: 'United States',
  'new york': 'United States', nyc: 'United States', 'new york city': 'United States',
  'san francisco': 'United States', 'bay area': 'United States', 'los angeles': 'United States',
  seattle: 'United States', austin: 'United States', chicago: 'United States',
  boston: 'United States', atlanta: 'United States', dallas: 'United States',
  houston: 'United States', denver: 'United States', phoenix: 'United States',
  miami: 'United States', 'washington dc': 'United States', washington: 'United States',
  'united kingdom': 'United Kingdom', uk: 'United Kingdom', britain: 'United Kingdom',
  london: 'United Kingdom', manchester: 'United Kingdom', birmingham: 'United Kingdom',
  leeds: 'United Kingdom', edinburgh: 'United Kingdom', glasgow: 'United Kingdom',
  bristol: 'United Kingdom', liverpool: 'United Kingdom', 'new castle': 'United Kingdom',
  canada: 'Canada', toronto: 'Canada', vancouver: 'Canada', montreal: 'Canada',
  ottawa: 'Canada', calgary: 'Canada', 'nova scotia': 'Canada',
  germany: 'Germany', berlin: 'Germany', munich: 'Germany', frankfurt: 'Germany',
  hamburg: 'Germany', cologne: 'Germany', stuttgart: 'Germany', dusseldorf: 'Germany',
  france: 'France', paris: 'France', lyon: 'France', marseille: 'France',
  spain: 'Spain', madrid: 'Spain', barcelona: 'Spain', valencia: 'Spain', seville: 'Spain',
  italy: 'Italy', milan: 'Italy', rome: 'Italy', turin: 'Italy', naples: 'Italy',
  netherlands: 'Netherlands', amsterdam: 'Netherlands', rotterdam: 'Netherlands',
  thehague: 'Netherlands', 'the hague': 'Netherlands', utrecht: 'Netherlands',
  poland: 'Poland', warsaw: 'Poland', krakow: 'Poland', wroclaw: 'Poland', gdansk: 'Poland',
  russia: 'Russia', moscow: 'Russia', 'st petersburg': 'Russia',
  singapore: 'Singapore',
  australia: 'Australia', sydney: 'Australia', melbourne: 'Australia', brisbane: 'Australia',
  perth: 'Australia', adelaide: 'Australia', canberra: 'Australia',
  'new zealand': 'New Zealand', 'newzealand': 'New Zealand', auckland: 'New Zealand',
  wellington: 'New Zealand', christchurch: 'New Zealand',
  mexico: 'Mexico', 'mexico city': 'Mexico', 'mexico city': 'Mexico',
  brazil: 'Brazil', 'sao paulo': 'Brazil', rio: 'Brazil', 'rio de janeiro': 'Brazil',
  'south africa': 'South Africa', 'southafrica': 'South Africa', 'cape town': 'South Africa',
  johannesburg: 'South Africa', durban: 'South Africa',
  switzerland: 'Switzerland', zurich: 'Switzerland', geneva: 'Switzerland', basel: 'Switzerland',
  ireland: 'Ireland', dublin: 'Ireland', cork: 'Ireland',
  japan: 'Japan', tokyo: 'Japan', osaka: 'Japan',
  china: 'China', beijing: 'China', shanghai: 'China', shenzhen: 'China',
  'united arab emirates': 'United Arab Emirates', 'unitedarabemirates': 'United Arab Emirates',
  uae: 'United Arab Emirates', dubai: 'United Arab Emirates', 'abu dhabi': 'United Arab Emirates',
  'saudi arabia': 'Saudi Arabia', 'saudiarabia': 'Saudi Arabia', riyadh: 'Saudi Arabia',
  'hong kong': 'Hong Kong', hongkong: 'Hong Kong',
  'south korea': 'South Korea', 'southkorea': 'South Korea', seoul: 'South Korea',
  indonesia: 'Indonesia', jakarta: 'Indonesia',
  malaysia: 'Malaysia', 'kuala lumpur': 'Malaysia',
  philippines: 'Philippines', manila: 'Philippines',
  thailand: 'Thailand', bangkok: 'Thailand',
  vietnam: 'Vietnam', 'ho chi minh': 'Vietnam', hanoi: 'Vietnam',
  turkey: 'Turkey', istanbul: 'Turkey',
  qatar: 'Qatar', doha: 'Qatar',
  kuwait: 'Kuwait',
  egypt: 'Egypt', cairo: 'Egypt',
  kenya: 'Kenya', nairobi: 'Kenya',
  nigeria: 'Nigeria', lagos: 'Nigeria',
  argentina: 'Argentina', 'buenos aires': 'Argentina',
  chile: 'Chile', santiago: 'Chile',
  colombia: 'Colombia', bogota: 'Colombia',
  peru: 'Peru', lima: 'Peru',
  portugal: 'Portugal', lisbon: 'Portugal', porto: 'Portugal',
  belgium: 'Belgium', brussels: 'Belgium', 'brussels airport': 'Belgium',
  austria: 'Austria', vienna: 'Austria',
  sweden: 'Sweden', stockholm: 'Sweden',
  norway: 'Norway', oslo: 'Norway',
  denmark: 'Denmark', copenhagen: 'Denmark',
  finland: 'Finland', helsinki: 'Finland',
  greece: 'Greece', athens: 'Greece',
  czechia: 'Czechia', 'czech republic': 'Czechia', prague: 'Czechia',
  romania: 'Romania', bucharest: 'Romania',
  ukraine: 'Ukraine', kyiv: 'Ukraine', kiev: 'Ukraine',
  'israel': 'Israel', telaviv: 'Israel', 'tel aviv': 'Israel',
};

function resolveCountry(term) {
  const key = String(term || '').trim().toLowerCase().replace(/\s+/g, ' ');
  return LOCATION_COUNTRY[key] || null;
}

function filterByLocation(jobs, location) {
  const term = String(location || '').trim().toLowerCase();
  if (!term) return jobs;
  if (NON_COUNTRIES.has(term)) return jobs; // "remote", "anywhere" → don't filter
  const resolved = resolveCountry(term);
  const resolvedLower = resolved ? resolved.toLowerCase() : null;

  return jobs.filter((j) => {
    const hay = String(j.location || '').toLowerCase();
    const country = String(j.country || '').toLowerCase();
    if (resolvedLower) {
      // Known place: require the job's country to match. Only fall back to
      // text matching when the source gave us no country at all.
      if (country.length > 0) return country === resolvedLower;
      return hay.includes(term) || hay.includes(resolvedLower);
    }
    return hay.includes(term);
  });
}

const JOB_TYPE_LABELS = {
  FULL_TIME: 'full-time',
  FULLTIME: 'full-time',
  PART_TIME: 'part-time',
  PARTTIME: 'part-time',
  CONTRACT: 'contract',
  CONTRACTOR: 'contract',
  TEMPORARY: 'contract',
  INTERNSHIP: 'internship',
  INTERN: 'internship',
};

function mapJobType(raw) {
  const normalized = String(raw || '').trim().toUpperCase().replace(/[\s_-]+/g, '');
  return JOB_TYPE_LABELS[normalized] || null;
}

function inferAdzunaJobType(job) {
  const ct = String(job.contract_type || '').toLowerCase();
  if (ct === 'contract') return 'contract';
  if (job.full_time === false) return 'part-time';
  if (job.full_time === true) return 'full-time';
  return 'full-time'; // most listings are full-time even when the board omits the flag
}

function inferExperienceLevel(text) {
  const hay = String(text || '').toLowerCase();
  if (/entry|associate|junior|graduate|intern/.test(hay)) return 'entry';
  if (/senior|executive|director|principal|lead|staff/.test(hay)) return 'senior';
  if (/mid|intermediate|experienced/.test(hay)) return 'mid';
  return null;
}

function inferExperienceFromMonths(months) {
  const m = Number(months);
  if (!Number.isFinite(m) || m <= 0) return null;
  if (m < 12) return 'entry';
  if (m <= 48) return 'mid';
  return 'senior';
}

// Adzuna exposes one API per country, so "worldwide" means hitting a
// list of country endpoints in parallel and merging the results.
const ADZUNA_COUNTRIES = (
  process.env.ADZUNA_COUNTRIES ||
  'au,br,ca,de,es,fr,gb,in,it,mx,nl,nz,pl,ru,sg,us,za'
)
  .split(',')
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

async function searchAdzuna({ query, location, page = 1 }) {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;

  if (!appId || !appKey) return []; // skip silently if not configured

  const tasks = ADZUNA_COUNTRIES.map((country) =>
    axios
      .get(`https://api.adzuna.com/v1/api/jobs/${country}/search/${page}`, {
        params: {
          app_id: appId,
          app_key: appKey,
          what: query,
          where: location || undefined,
          results_per_page: 10,
        },
        timeout: 8000,
      })
      .then(({ data }) => data)
      .catch(() => null) // a country without results should not fail the search
  );

  const responses = await Promise.all(tasks);

  return responses.flatMap((data, i) =>
    (data?.results || []).map((job) => ({
      id: `adzuna-${ADZUNA_COUNTRIES[i]}-${job.id}`,
      title: job.title?.replace(/<[^>]+>/g, '') || 'Untitled role',
      company: job.company?.display_name || 'Unknown company',
      location: job.location?.display_name || location || 'Not specified',
      salary:
        job.salary_min && job.salary_max
          ? `${Math.round(job.salary_min)} - ${Math.round(job.salary_max)}`
          : null,
      description: job.description?.replace(/<[^>]+>/g, '') || '',
      url: job.redirect_url,
      source: 'Adzuna',
      postedAt: job.created,
      country: countryFromCode(ADZUNA_COUNTRIES[i]) || ADZUNA_COUNTRIES[i].toUpperCase(),
      jobType: inferAdzunaJobType(job),
      experience: null,
      workMode: inferWorkMode(job.title, job.location?.display_name),
    }))
  );
}

async function searchJooble({ query, location, page = 1 }) {
  const apiKey = process.env.JOOBLE_API_KEY;
  if (!apiKey) return []; // skip silently if not configured

  const url = `https://jooble.org/api/${apiKey}`;

  const { data } = await axios.post(
    url,
    { keywords: query, location: location || '', page },
    { timeout: 8000, headers: { 'Content-Type': 'application/json' } }
  );

  return (data.jobs || []).map((job, i) => ({
    id: `jooble-${page}-${i}-${job.id || i}`,
    title: job.title || 'Untitled role',
    company: job.company || 'Unknown company',
    location: job.location || location || 'Not specified',
    salary: job.salary || null,
    description: (job.snippet || '').replace(/<[^>]+>/g, ''),
    url: job.link,
    source: 'Jooble',
    postedAt: job.updated,
    country: extractCountry(job.location) || null,
    jobType: null,
    experience: null,
  }));
}

async function searchJSearch({ query, location, page = 1 }) {
  const apiKey = process.env.RAPIDAPI_KEY;
  if (!apiKey) return []; // skip silently if not configured

  const url = 'https://jsearch.p.rapidapi.com/search-v2';

  const { data } = await axios.get(url, {
    params: {
      query: location ? `${query} in ${location}` : query,
      // "num_pages" = how many result pages to return in one go. Asking for
      // more pages on a "load more" request surfaces extra listings.
      num_pages: String(Math.min(page, 3)),
    },
    headers: {
      'X-RapidAPI-Key': apiKey,
      'X-RapidAPI-Host': 'jsearch.p.rapidapi.com',
    },
    timeout: 8000,
  });

  return (data.data?.jobs || []).map((job, i) => {
    const salary =
      job.job_min_salary && job.job_max_salary
        ? `${Math.round(job.job_min_salary)} - ${Math.round(job.job_max_salary)}`
        : job.job_salary || job.job_salary_string || null;
    const reqExp = job.job_required_experience || {};

    return {
      id: `jsearch-${job.job_id || page}-${i}`,
      title: job.job_title || 'Untitled role',
      company: job.employer_name || 'Unknown company',
      location: job.job_location || location || 'Not specified',
      salary,
      description: (job.job_description || '').replace(/<[^>]+>/g, ''),
      url: job.job_apply_link || job.job_google_link || '',
      source: job.job_publisher || 'JSearch',
      postedAt: job.job_posted_at_datetime_utc || null,
      country: extractCountry(job.job_location) || countryFromCode(job.job_country) || null,
      jobType: mapJobType(job.job_employment_type),
      experience: inferExperienceFromMonths(reqExp.no_of_months) || null,
      workMode: job.job_is_remote
        ? 'remote'
        : inferWorkMode(job.job_title, job.job_location, job.job_description),
    };
  });
}

// Workable paginates with an opaque token (not a page number). The token for
// a query is only returned by the previous response, so we cache it here to
// make "load more" work per (query, location).
const workableTokens = new Map();

async function searchWorkable({ query, location, page = 1 }) {
  const url = 'https://jobs.workable.com/api/v1/jobs';
  const key = `${query}|${location || ''}`;
  const pageToken = page > 1 ? workableTokens.get(key) : null;

  const { data } = await axios.get(url, {
    params: {
      query,
      location: location || undefined,
      pageToken: pageToken || undefined,
    },
    timeout: 8000,
  });

  if (data.nextPageToken) workableTokens.set(key, data.nextPageToken);

  return (data.jobs || []).map((job) => {
    const loc = job.location || {};
    const extraLoc = (job.locations || [])
      .map((s) => (typeof s === 'string' ? s : ''))
      .filter(Boolean)
      .join(', ');

    return {
      id: `workable-${job.id || page}`,
      title: job.title || 'Untitled role',
      company: job.company?.title || job.company || 'Unknown company',
      location:
        [loc.city, loc.subregion, loc.countryName].filter(Boolean).join(', ') ||
        extraLoc ||
        location ||
        'Not specified',
      salary: null,
      description: (job.description || job.socialSharingDescription || '').replace(/<[^>]+>/g, ''),
      url: job.url,
      source: 'Workable',
      postedAt: job.created || null,
      country: loc.countryName || null,
      jobType: mapJobType(job.employment_type),
      experience: inferExperienceLevel(job.experienceLevel) || null,
      workMode:
        job.workplace === 'on_site'
          ? 'on-site'
          : typeof job.workplace === 'string'
            ? job.workplace
            : inferWorkMode(job.title, [loc.city, loc.subregion, loc.countryName].join(' ')),
    };
  });
}

const SOURCES = [searchAdzuna, searchWorkable, searchJSearch];

// ---------- Merge + dedupe ----------

function mergeResults(resultsBySource) {
  const seen = new Map();

  for (const jobs of resultsBySource) {
    for (const job of jobs) {
      const key = normalizeKey(job.title, job.company);
      if (!seen.has(key)) {
        seen.set(key, job);
      }
      // If the same title+company shows up from a second source,
      // we just keep the first one we saw — good enough for a starter.
    }
  }

  // Newest first. Jobs without a usable date sort to the bottom.
  return Array.from(seen.values()).sort((a, b) => {
    const at = Date.parse(a.postedAt) || 0;
    const bt = Date.parse(b.postedAt) || 0;
    return bt - at;
  });
}

// ---------- Routes ----------

app.get('/api/jobs/search', async (req, res) => {
  const { query, location, page } = req.query;

  if (!query) {
    return res.status(400).json({ error: 'query parameter is required, e.g. ?query=frontend developer' });
  }

  const params = { query, location, page: Number(page) || 1 };

  // Run every configured source in parallel. If one fails or isn't
  // configured, it just contributes an empty array instead of
  // breaking the whole search.
  const settled = await Promise.allSettled(SOURCES.map((fn) => fn(params)));

  const resultsBySource = settled.map((r) => (r.status === 'fulfilled' ? r.value : []));
  const errors = settled
    .map((r, i) => (r.status === 'rejected' ? { source: SOURCES[i].name, message: r.reason?.message } : null))
    .filter(Boolean);

  const merged = mergeResults(resultsBySource);
  const filtered = filterByLocation(merged, location);

  res.json({
    query,
    location: location || null,
    count: filtered.length,
    jobs: filtered,
    sourceErrors: errors, // surfaced so you can see if an API key is missing/invalid
  });
});

app.get('/api/health', (_req, res) => res.json({ ok: true }));

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Job aggregator backend running on http://localhost:${PORT}`);
    console.log(`Try: http://localhost:${PORT}/api/jobs/search?query=developer&location=bangalore`);
  });
}

module.exports = app;
