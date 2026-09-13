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
// { id, title, company, location, salary, description, url, source, postedAt }

async function searchAdzuna({ query, location, page = 1 }) {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  const country = process.env.ADZUNA_COUNTRY || 'in';

  if (!appId || !appKey) return []; // skip silently if not configured

  const url = `https://api.adzuna.com/v1/api/jobs/${country}/search/${page}`;

  const { data } = await axios.get(url, {
    params: {
      app_id: appId,
      app_key: appKey,
      what: query,
      where: location || undefined,
      results_per_page: 20,
    },
    timeout: 8000,
  });

  return (data.results || []).map((job) => ({
    id: `adzuna-${job.id}`,
    title: job.title?.replace(/<[^>]+>/g, '') || 'Untitled role',
    company: job.company?.display_name || 'Unknown company',
    location: job.location?.display_name || location || 'Not specified',
    salary:
      job.salary_min && job.salary_max
        ? `${Math.round(job.salary_min)} - ${Math.round(job.salary_max)}`
        : null,
    description: job.description?.replace(/<[^>]+>/g, '').slice(0, 280) || '',
    url: job.redirect_url,
    source: 'Adzuna',
    postedAt: job.created,
  }));
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
    description: (job.snippet || '').replace(/<[^>]+>/g, '').slice(0, 280),
    url: job.link,
    source: 'Jooble',
    postedAt: job.updated,
  }));
}

async function searchJSearch({ query, location, page = 1 }) {
  const apiKey = process.env.RAPIDAPI_KEY;
  if (!apiKey) return []; // skip silently if not configured

  const url = 'https://jsearch.p.rapidapi.com/search-v2';

  const { data } = await axios.get(url, {
    params: {
      query: location ? `${query} in ${location}` : query,
      num_pages: '1',
      country: process.env.ADZUNA_COUNTRY || 'in',
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

    return {
      id: `jsearch-${job.job_id || page}-${i}`,
      title: job.job_title || 'Untitled role',
      company: job.employer_name || 'Unknown company',
      location: job.job_location || location || 'Not specified',
      salary,
      description: (job.job_description || '').replace(/<[^>]+>/g, '').slice(0, 280),
      url: job.job_apply_link || job.job_google_link || '',
      source: job.job_publisher || 'JSearch',
      postedAt: job.job_posted_at_datetime_utc || null,
    };
  });
}

const SOURCES = [searchAdzuna, searchJooble, searchJSearch];

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

  return Array.from(seen.values());
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

  res.json({
    query,
    location: location || null,
    count: merged.length,
    jobs: merged,
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
