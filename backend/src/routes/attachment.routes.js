// Photos and documents on items and bundles.
//
//   POST   /api/items/:id/attachments     multipart: kind, caption?, width?, height?, file, thumb?
//   POST   /api/bundles/:id/attachments   same
//   PATCH  /api/attachments/:id           { caption }
//   POST   /api/attachments/reorder       { ids: [...] }  — all on the same item/bundle
//   DELETE /api/attachments/:id
//   GET    /api/files/:id/:variant        signed; variant = original | thumb | download
//
// Uploads are parsed with busboy and each file part is piped straight into
// brew-bucket as it arrives; no temp files, no buffering. Photos are resized in
// the browser before upload (which also strips EXIF/GPS) and arrive with a
// small JPEG `thumb` part, so the server needs no image library.
const express = require('express');
const busboy = require('busboy');
const crypto = require('node:crypto');
const authMiddleware = require('../middleware/auth.middleware');
const { Attachment, Item, Bundle, sequelize } = require('../models');
const storage = require('../services/storage');
const att = require('../services/attachments');
const { httpError } = require('../services/http-error');

const MAX_BYTES = Number(process.env.ATTACHMENT_MAX_MB || 25) * 1024 * 1024;
const PHOTO_TYPES = /^image\/(jpeg|png|webp|gif|avif|heic|heif)$/;

const router = express.Router();

async function findOwner(type, id, userId) {
  const Model = type === 'item' ? Item : Bundle;
  const owner = await Model.findOne({ where: { id, userId } });
  if (!owner) throw httpError(404, `${type === 'item' ? 'Item' : 'Bundle'} not found`);
  return owner;
}

function upload(ownerType) {
  return async (req, res, next) => {
    try {
      if (!storage.isConfigured()) {
        throw httpError(501, 'File storage is not configured. Set BREW_BUCKET_URL and BREW_BUCKET_KEY on the backend.');
      }
      if (!/^multipart\/form-data/i.test(req.headers['content-type'] || '')) {
        throw httpError(400, 'Send the file as multipart/form-data');
      }
      const owner = await findOwner(ownerType, req.params.id, req.user.id);
      const id = crypto.randomUUID();
      const result = await receive(req, { userId: req.user.id, attachmentId: id });

      if (!result.file) throw httpError(400, 'No file in the upload (expected a part named "file")');

      let kind = result.fields.kind === 'photo' ? 'photo' : 'document';
      if (kind === 'photo' && !PHOTO_TYPES.test(result.file.contentType)) kind = 'document';

      const [{ max }] = await sequelize.query(
        `SELECT COALESCE(MAX(position), -1) AS max FROM attachments WHERE ${ownerType}_id = :id AND kind = :kind`,
        { replacements: { id: owner.id, kind }, type: sequelize.QueryTypes.SELECT }
      );

      const row = await Attachment.create({
        id,
        userId: req.user.id,
        itemId: ownerType === 'item' ? owner.id : null,
        bundleId: ownerType === 'bundle' ? owner.id : null,
        kind,
        filename: result.file.filename,
        contentType: result.file.contentType,
        size: result.file.size,
        width: toInt(result.fields.width),
        height: toInt(result.fields.height),
        storageKey: result.file.key,
        storageHash: result.file.hash,
        thumbKey: kind === 'photo' && result.thumb ? result.thumb.key : null,
        thumbHash: kind === 'photo' && result.thumb ? result.thumb.hash : null,
        position: Number(max) + 1,
        caption: (result.fields.caption || '').trim() || null
      });

      // A thumb sent with a document is just discarded.
      if (kind !== 'photo' && result.thumb) await att.deleteKeys([result.thumb.key]);

      res.status(201).json(att.present(row));
    } catch (err) {
      next(err);
    }
  };
}

// Pipes each file part into brew-bucket as busboy yields it. Resolves once the
// whole request is consumed; on failure, anything already stored is removed.
function receive(req, { userId, attachmentId }) {
  return new Promise((resolve, reject) => {
    let bb;
    try {
      bb = busboy({ headers: req.headers, limits: { files: 2, fields: 10, fileSize: MAX_BYTES } });
    } catch (err) {
      return reject(httpError(400, 'Malformed upload'));
    }

    const fields = {};
    const stored = {};
    const pending = [];
    let failed = null;

    const fail = (err) => {
      if (!failed) failed = err;
    };

    bb.on('field', (name, value) => { fields[name] = value; });

    bb.on('file', (name, stream, info) => {
      if ((name !== 'file' && name !== 'thumb') || failed) {
        stream.resume();
        return;
      }
      const filename = (info.filename || (name === 'thumb' ? 'thumb.jpg' : 'upload')).slice(0, 255);
      const contentType = (info.mimeType || 'application/octet-stream').toLowerCase();
      const key = storage.keyFor(userId, attachmentId, name === 'thumb' ? 'thumb.jpg' : storage.safeName(filename));

      stream.on('limit', () => fail(httpError(413, `File is larger than the ${Math.round(MAX_BYTES / 1048576)} MB limit`)));

      pending.push(
        storage.put(key, stream, { contentType })
          .then((r) => {
            stored[name] = { key, size: r.size, hash: r.hash, filename, contentType };
          })
          .catch((err) => {
            stream.resume();
            fail(err);
          })
      );
    });

    bb.on('error', (err) => fail(httpError(400, `Upload failed: ${err.message}`)));

    bb.on('close', async () => {
      await Promise.allSettled(pending);
      if (failed) {
        const keys = Object.values(stored).map((s) => s.key);
        if (keys.length) await att.deleteKeys(keys);
        return reject(failed);
      }
      resolve({ fields, file: stored.file || null, thumb: stored.thumb || null });
    });

    req.on('aborted', () => fail(httpError(400, 'Upload was interrupted')));
    req.pipe(bb);
  });
}

function toInt(v) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

router.post('/items/:id/attachments', authMiddleware, upload('item'));
router.post('/bundles/:id/attachments', authMiddleware, upload('bundle'));

router.patch('/attachments/:id', authMiddleware, express.json(), async (req, res, next) => {
  try {
    const row = await Attachment.findOne({ where: { id: req.params.id, userId: req.user.id } });
    if (!row) throw httpError(404, 'Attachment not found');
    if ('caption' in (req.body || {})) {
      row.caption = String(req.body.caption || '').trim() || null;
    }
    await row.save();
    res.json(att.present(row));
  } catch (err) {
    next(err);
  }
});

router.post('/attachments/reorder', authMiddleware, express.json(), async (req, res, next) => {
  try {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids : null;
    if (!ids || !ids.length) throw httpError(400, 'ids must be a non-empty array');
    const rows = await Attachment.findAll({ where: { id: ids, userId: req.user.id } });
    if (rows.length !== ids.length) throw httpError(404, 'One or more attachments not found');
    const owners = new Set(rows.map((r) => `${r.itemId || ''}:${r.bundleId || ''}:${r.kind}`));
    if (owners.size !== 1) throw httpError(400, 'Can only reorder attachments of one kind on one item or bundle');
    await sequelize.transaction(async (transaction) => {
      for (let i = 0; i < ids.length; i++) {
        await Attachment.update({ position: i }, { where: { id: ids[i] }, transaction });
      }
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.delete('/attachments/:id', authMiddleware, async (req, res, next) => {
  try {
    const row = await Attachment.findOne({ where: { id: req.params.id, userId: req.user.id } });
    if (!row) throw httpError(404, 'Attachment not found');
    await att.destroyAttachments([row]);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// No auth middleware: the signature in the query string is the credential.
router.get('/files/:id/:variant', async (req, res, next) => {
  try {
    const { id, variant } = req.params;
    if (!['original', 'thumb', 'download'].includes(variant)) throw httpError(404, 'Not found');
    if (!att.verify(id, variant, req.query.e, req.query.s)) throw httpError(403, 'This file link has expired. Reload the page.');

    const row = await Attachment.findByPk(id);
    if (!row) throw httpError(404, 'File not found');

    const useThumb = variant === 'thumb' && row.thumbKey;
    const key = useThumb ? row.thumbKey : row.storageKey;
    const hash = useThumb ? row.thumbHash : row.storageHash;
    const etag = hash ? `"${hash}"` : null;

    // Objects never change under a key, so a matching ETag can be answered
    // without waking the NAS.
    if (etag && req.headers['if-none-match'] === etag) {
      res.set('Cache-Control', 'private, max-age=43200').set('ETag', etag);
      return res.status(304).end();
    }

    const obj = await storage.get(key);
    const type = useThumb ? 'image/jpeg' : row.contentType;
    const inline = variant !== 'download' && att.INLINE_TYPES.has(type);

    res.removeHeader('Content-Security-Policy'); // helmet's API CSP breaks the browser PDF viewer
    res.set('Content-Type', inline ? type : (variant === 'download' ? type : 'application/octet-stream'));
    if (obj.contentLength) res.set('Content-Length', obj.contentLength);
    if (etag) res.set('ETag', etag);
    res.set('Cache-Control', 'private, max-age=43200');
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('Content-Disposition', `${inline ? 'inline' : 'attachment'}; ${dispositionName(row.filename)}`);

    obj.stream.on('error', (e) => {
      console.error('[files] stream error:', e.message);
      res.destroy(e);
    });
    obj.stream.pipe(res);
  } catch (err) {
    next(err);
  }
});

function dispositionName(name) {
  const ascii = String(name).replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_');
  return `filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`;
}

module.exports = router;
