import { boot, listen } from './harness.mjs';
const h = boot({ fixedClock: false });
const { port } = await listen(h);
process.send({ ready: true, port });
let cpuBase = process.cpuUsage();
process.on('message', (m) => {
  if (m.cmd === 'seed') {
    for (let i = 0; i < m.n; i++) h.db.catalog.push({ id: `SKU-S${i}`, orgId: m.orgId, name: 'seed ' + i, category: 'General', price: 1, stock: 10, minThreshold: 5, sku: `SEED-${i}`, status: 'IN_STOCK' });
    const t = process.hrtime.bigint(); h.store.save(); process.send({ seeded: m.n, saveMs: Number(process.hrtime.bigint() - t) / 1e6, dbBytes: require_size() });
  }
  if (m.cmd === 'stats') { const mu = process.memoryUsage(); const cpu = process.cpuUsage(cpuBase); cpuBase = process.cpuUsage(); process.send({ stats: { rssMB: +(mu.rss / 1048576).toFixed(1), heapMB: +(mu.heapUsed / 1048576).toFixed(1), cpuUserMs: +(cpu.user / 1000).toFixed(0), cpuSysMs: +(cpu.system / 1000).toFixed(0), auditLogs: h.db.auditLogs.length } }); }
  if (m.cmd === 'exit') process.exit(0);
});
import fs from 'node:fs';
function require_size() { try { return fs.statSync(h.store.dbFile).size; } catch { return 0; } }
