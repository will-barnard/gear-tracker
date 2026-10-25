// File bytes live in brew-bucket (the `uploads` bucket by default); this module
// is the only thing that talks to it. Everything streams — an upload is piped
// from the incoming multipart request straight into brew-bucket, and a
// download is piped back out — so nothing large ever sits in memory here.
//
// Config:
//   BREW_BUCKET_URL     https://bucket.example        (required for uploads)
//   BREW_BUCKET_KEY     bb_…  scoped read+write+delete, restricted to the bucket below
//   BREW_BUCKET_BUCKET  uploads                       (optional)
//   BREW_BUCKET_PREFIX  gear-tracker                  (optional; keys are <prefix>/<userId>/<attachmentId>/…)
//
// With no URL/key the app still runs; upload routes answer 501 with a message
// saying what to set, and existing rows render as missing images.
const { Readable } = require('node:stream');
const path = require('node:path');
const { httpError } = require('./http-error');

const BUCKET = process.env.BREW_BUCKET_BUCKET || 'uploads';
const PREFIX = (process.env.BREW_BUCKET_PREFIX || 'gear-tracker').replace(/\/+$/, '');

let clientPromise = null;
const clients = new Map();

function isConfigured() {
  return !!(process.env.BREW_BUCKET_URL && process.env.BREW_BUCKET_KEY);
}

// The brew-bucket client is an ES module; load it once, lazily.
function loadClass() {
  if (!clientPromise) clientPromise = import(path.join(__dirname, '../lib/brew-bucket.mjs')).then((m) => m.BrewBucket);
  return clientPromise;
}

async function client(apiKey = process.env.BREW_BUCKET_KEY) {
  if (!process.env.BREW_BUCKET_URL || !apiKey) {
    throw httpError(501, 'File storage is not configured. Set BREW_BUCKET_URL and BREW_BUCKET_KEY on the backend.');
  }
  if (!clients.has(apiKey)) {
    const BrewBucket = await loadClass();
    clients.set(apiKey, new BrewBucket({ baseUrl: process.env.BREW_BUCKET_URL, apiKey }));
  }
  return clients.get(apiKey);
}

// Map brew-bucket failures onto what the person using gear-tracker should see.
// 503 is the common one: the NAS is asleep or rebooting, which resolves itself.
function translate(err) {
  if (err.status === 501) return err;
  const status = err.status;
  if (status === 503 || err.cause?.code === 'ECONNREFUSED' || err.cause?.code === 'ENOTFOUND' || err.name === 'TypeError') {
    return httpError(503, 'File storage is offline right now (the NAS may be asleep). Try again in a minute.', { retryable: true });
  }
  if (status === 507) return httpError(507, 'File storage is full — the brew-bucket quota for this bucket is used up.');
  if (status === 413) return httpError(413, 'That file is larger than the storage bucket allows.');
  if (status === 401 || status === 403) {
    console.error(`[storage] brew-bucket rejected the API key (${status}): ${err.message}. Check BREW_BUCKET_KEY scope and bucket restriction.`);
    return httpError(500, 'File storage rejected the server credentials. Check BREW_BUCKET_KEY.');
  }
  if (status === 404) return httpError(404, 'File not found in storage');
  console.error('[storage]', err);
  return httpError(502, `File storage error: ${err.message}`);
}

function keyFor(userId, attachmentId, name) {
  return `${PREFIX}/${userId}/${attachmentId}/${name}`;
}

// Turns a client-supplied filename into something safe as the last segment of
// an object key, keeping the extension.
function safeName(filename, fallback = 'file') {
  const base = String(filename || fallback).split(/[\\/]/).pop();
  const cleaned = base.normalize('NFKD').replace(/[^\w.\-]+/g, '-').replace(/-+/g, '-').replace(/^[-.]+/, '').slice(-120);
  return cleaned || fallback;
}

// stream: a Node Readable. Resolves { key, size, hash }.
async function put(key, stream, { contentType = 'application/octet-stream', bucket = BUCKET, apiKey } = {}) {
  const bb = await client(apiKey);
  try {
    const res = await bb.put(bucket, key, stream, { contentType });
    return { key, size: Number(res.size), hash: res.hash };
  } catch (err) {
    throw translate(err);
  }
}

// Resolves { stream, contentType, contentLength, etag }.
async function get(key, { bucket = BUCKET, apiKey } = {}) {
  const bb = await client(apiKey);
  let res;
  try {
    res = await bb.get(bucket, key);
  } catch (err) {
    throw translate(err);
  }
  return {
    stream: Readable.fromWeb(res.body),
    contentType: res.headers.get('content-type'),
    contentLength: res.headers.get('content-length'),
    etag: res.headers.get('etag')
  };
}

// A missing object counts as deleted.
async function remove(key, { bucket = BUCKET, apiKey } = {}) {
  const bb = await client(apiKey);
  try {
    await bb.delete(bucket, key, { allVersions: true });
  } catch (err) {
    if (err.status === 404) return;
    throw translate(err);
  }
}

async function list(prefix, { bucket = BUCKET, apiKey, limit = 200 } = {}) {
  const bb = await client(apiKey);
  try {
    return await bb.list(bucket, { prefix, limit });
  } catch (err) {
    throw translate(err);
  }
}

module.exports = { BUCKET, PREFIX, isConfigured, keyFor, safeName, put, get, remove, list, translate };
