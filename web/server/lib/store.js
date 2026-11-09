/**
 * JSON-file persistence with safety properties the previous implementation lacked:
 *  - FAIL CLOSED: an unreadable/corrupt database file stops startup; it is never overwritten with seed data.
 *  - ATOMIC writes: temp file + fsync + rename, so a crash cannot leave a half-written database.
 *  - Rolling previous copy (at most once a minute) next to the database file.
 *  - No re-seeding of intentionally empty collections.
 *
 * This is still a single-process file store. For multi-instance or high-volume use, move to a real database
 * (the rest of the server only touches `store.data` and `store.save()`).
 */
import fs from 'node:fs';
import path from 'node:path';

export class StoreCorruptError extends Error {
  constructor(file, cause) {
    super(
      `Database file ${file} exists but could not be parsed (${cause}). ` +
        'Refusing to start so data is not overwritten. Restore from database.prev.json or a backup, then restart.'
    );
    this.name = 'StoreCorruptError';
  }
}

export const SCHEMA_VERSION = 6;
const COLLECTIONS = [
  'organisations', 'users', 'websites', 'orders', 'catalog', 'webhooks', 'backups',
  'auditLogs', 'transactions', 'supportTickets', 'notifications', 'emailOutbox', 'uploads', 'webhookDeliveries', 'inboundEvents'
];

export function createStore({ dataDir, now = () => Date.now() }) {
  fs.mkdirSync(dataDir, { recursive: true });
  const backupDir = path.join(dataDir, 'backups');
  fs.mkdirSync(backupDir, { recursive: true });
  const dbFile = path.join(dataDir, 'database.json');
  const prevFile = path.join(dataDir, 'database.prev.json');
  let lastPrevCopy = 0;

  function emptyDb() {
    const db = { schemaVersion: SCHEMA_VERSION, counters: { invoice: 0 } };
    for (const c of COLLECTIONS) db[c] = [];
    return db;
  }

  function migrate(db) {
    for (const c of COLLECTIONS) if (!Array.isArray(db[c])) db[c] = [];
    if (!db.counters || typeof db.counters !== 'object') db.counters = { invoice: 0 };
    if (typeof db.counters.invoice !== 'number') db.counters.invoice = db.transactions.length;
    // Legacy (pre-v6) records had no tenant: attach them to the first organisation if there is one.
    const defaultOrg = db.organisations[0]?.id || null;
    if (defaultOrg) {
      for (const c of ['users', 'websites', 'orders', 'catalog', 'webhooks', 'auditLogs', 'transactions', 'supportTickets', 'notifications', 'emailOutbox', 'uploads', 'webhookDeliveries']) {
        for (const rec of db[c]) if (!rec.orgId) rec.orgId = defaultOrg;
      }
    }
    delete db.diagnosticLogs; // replaced by in-memory request telemetry
    db.schemaVersion = SCHEMA_VERSION;
    return db;
  }

  function load() {
    let db;
    if (fs.existsSync(dbFile)) {
      let raw;
      try {
        raw = JSON.parse(fs.readFileSync(dbFile, 'utf8'));
      } catch (err) {
        throw new StoreCorruptError(dbFile, err.message);
      }
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new StoreCorruptError(dbFile, 'root is not an object');
      db = migrate(raw);
    } else {
      db = migrate(emptyDb());
    }
    return db;
  }

  const data = load();

  function save() {
    const tmp = `${dbFile}.tmp-${process.pid}`;
    const json = JSON.stringify(data, null, 2);
    const fd = fs.openSync(tmp, 'w', 0o600);
    try {
      fs.writeSync(fd, json);
      fs.fsyncSync(fd);
    } finally {
      fs.closeSync(fd);
    }
    if (fs.existsSync(dbFile) && now() - lastPrevCopy > 60_000) {
      try {
        fs.copyFileSync(dbFile, prevFile);
        lastPrevCopy = now();
      } catch {
        /* best effort */
      }
    }
    fs.renameSync(tmp, dbFile);
  }

  /**
   * Discard in-memory state and re-read the last successfully persisted database, in place (same object, so
   * every reference stays valid). Used when a save fails so a request that was answered with an error cannot
   * leave a half-applied change live (and later be persisted by an unrelated save).
   */
  function reload() {
    const fresh = load();
    for (const k of Object.keys(data)) delete data[k];
    Object.assign(data, fresh);
  }

  // Persist immediately so a brand-new database exists on disk.
  if (!fs.existsSync(dbFile)) save();

  return { data, save, reload, dbFile, backupDir, prevFile };
}
