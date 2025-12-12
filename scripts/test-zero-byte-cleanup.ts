import fs from 'fs';
import path from 'path';
import os from 'os';
import { settingsManager } from '../settings.js';
import { DocumentSessionManager } from '../document-session.js';
import { ScanSessionManager } from '../scan-session.js';

function log(msg: string) { console.log(msg); }

async function runTest() {
  // Create a temporary test directory
  const tmpDir = path.join(os.tmpdir(), 'paperless-scanner-test');
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

  // Save original settings and override scan directory
  const originalSettings = settingsManager.get();
  settingsManager.update({ scanOutputDir: tmpDir });

  try {
    // Create a zero-byte file and a valid file
    const zeroFile = path.join(tmpDir, 'scan-0001.pdf');
    fs.writeFileSync(zeroFile, Buffer.alloc(0));
    const validFile = path.join(tmpDir, 'scan-0002.pdf');
    fs.writeFileSync(validFile, Buffer.from('test')); // minimal non-zero content

    log('Before loading sessions - files in dir: ' + fs.readdirSync(tmpDir).join(', '));

    const docManager = new DocumentSessionManager(log);
    const sessions = docManager.getSessions();
    const pages = sessions.flatMap(s => s.pages);
    log('DocumentSessionManager found pages: ' + pages.map(p => p.filename).join(', '));

    const scanManager = new ScanSessionManager(log);
    const scanned = scanManager.getScannedPages();
    log('ScanSessionManager found pages: ' + scanned.map(p => p.filename).join(', '));

    // Assert zero-byte files are removed and not listed
    const zeroStillExists = fs.existsSync(zeroFile);
    const zeroInDoc = pages.some(p => p.filename === path.basename(zeroFile));
    const zeroInScan = scanned.some(p => p.filename === path.basename(zeroFile));

    if (zeroStillExists || zeroInDoc || zeroInScan) {
      console.error('TEST FAILED: Zero-byte file was not cleaned up or not filtered from lists');
      process.exit(1);
    }

    log('TEST PASSED: Zero-byte files were removed and not listed');
    process.exit(0);
  } finally {
    // Cleanup
    const files = fs.readdirSync(tmpDir);
    for (const f of files) {
      try { fs.unlinkSync(path.join(tmpDir, f)); } catch (_) {}
    }
    try { fs.rmdirSync(tmpDir); } catch (_) {}
    // Restore settings
    settingsManager.update(originalSettings as any);
  }
}

runTest().catch(e => { console.error('Test error:', e); process.exit(2); });
