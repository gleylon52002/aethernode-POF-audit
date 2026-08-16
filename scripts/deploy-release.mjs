import * as ftp from 'basic-ftp';
import { readFileSync, statSync, openSync, readSync, closeSync, existsSync } from 'fs';
import { resolve, basename } from 'path';
import { createHash } from 'crypto';

const SECRET = "AetherSec2026_x89f_POF";
const BASE_HTTP_URL = "https://aethernodevpn.com/aether_uploader.php";
const CHUNK_SIZE = 4 * 1024 * 1024; // 4MB chunks

const FTP_CONFIG = {
  host: "cortexa99.com.tr",
  user: "cortexac",
  password: "46e38U+qIFMh!t",
  secure: false
};

const PHP_UPLOADER_CODE = `<?php
header('Content-Type: application/json');
$secret = "${SECRET}";
$providedSecret = isset($_SERVER['HTTP_X_SECRET']) ? $_SERVER['HTTP_X_SECRET'] : (isset($_GET['secret']) ? $_GET['secret'] : '');
if ($providedSecret !== $secret) {
    http_response_code(403);
    die(json_encode(["error" => "Forbidden"]));
}
$action = isset($_GET['action']) ? $_GET['action'] : 'upload';
$targetDir = isset($_GET['dir']) ? $_GET['dir'] : 'updates';
$fileName = isset($_GET['file']) ? basename($_GET['file']) : '';
if (empty($fileName)) {
    http_response_code(400);
    die(json_encode(["error" => "No filename provided"]));
}
$allowedDirs = ['updates', 'POF/updates', '.'];
if (!in_array($targetDir, $allowedDirs)) {
    http_response_code(400);
    die(json_encode(["error" => "Invalid target dir"]));
}
if (!file_exists($targetDir)) {
    mkdir($targetDir, 0755, true);
}
$filePath = rtrim($targetDir, '/') . '/' . $fileName;
if ($action === 'init') {
    file_put_contents($filePath, '');
    die(json_encode(["success" => true, "status" => "initialized", "file" => $filePath]));
}
if ($action === 'append') {
    $input = file_get_contents('php://input');
    if ($input === false) {
        http_response_code(500);
        die(json_encode(["error" => "Failed to read input"]));
    }
    file_put_contents($filePath, $input, FILE_APPEND);
    die(json_encode(["success" => true, "current_size" => filesize($filePath)]));
}
if ($action === 'finalize') {
    chmod($filePath, 0644);
    $size = filesize($filePath);
    $sha512 = base64_encode(hash_file('sha512', $filePath, true));
    die(json_encode([
        "success" => true,
        "file" => $fileName,
        "destination" => $filePath,
        "size" => $size,
        "sha512" => $sha512
    ]));
}
if ($action === 'delete_self') {
    @unlink(__FILE__);
    die(json_encode(["success" => true, "status" => "deleted"]));
}
http_response_code(400);
die(json_encode(["error" => "Unknown action"]));
`;

async function deployBridge() {
  console.log('📡 [1/5] Deploying temporary secure HTTPS chunk bridge via FTP...');
  const client = new ftp.Client(60000);
  try {
    await client.access(FTP_CONFIG);
    await client.cd("aethernodevpn.com");
    
    // Write buffer directly to ftp
    const stream = Buffer.from(PHP_UPLOADER_CODE);
    const { Readable } = await import('stream');
    const readable = Readable.from(stream);
    await client.uploadFrom(readable, "aether_uploader.php");
    console.log('✅ HTTPS Chunk Bridge deployed successfully.');
  } finally {
    client.close();
  }
}

async function uploadFileChunked(localPath, remoteDir, remoteName) {
  const fullPath = resolve(localPath);
  if (!existsSync(fullPath)) {
    throw new Error(`File not found: ${fullPath}`);
  }

  const totalSize = statSync(fullPath).size;
  const localBuf = readFileSync(fullPath);
  const localSha512 = createHash('sha512').update(localBuf).digest('base64');

  console.log(`\n📦 Uploading ${remoteName} (${(totalSize / (1024 * 1024)).toFixed(2)} MB) -> ${remoteDir}/`);

  // 1. Init
  const initUrl = `${BASE_HTTP_URL}?secret=${SECRET}&dir=${encodeURIComponent(remoteDir)}&file=${encodeURIComponent(remoteName)}&action=init`;
  const initRes = await fetch(initUrl);
  const initJson = await initRes.json();
  if (!initJson.success) {
    throw new Error(`Init failed: ${JSON.stringify(initJson)}`);
  }

  // 2. Append chunks
  const fd = openSync(fullPath, 'r');
  let offset = 0;
  const buffer = Buffer.alloc(CHUNK_SIZE);

  while (offset < totalSize) {
    const bytesToRead = Math.min(CHUNK_SIZE, totalSize - offset);
    readSync(fd, buffer, 0, bytesToRead, offset);
    const chunkSlice = buffer.subarray(0, bytesToRead);

    const appendUrl = `${BASE_HTTP_URL}?secret=${SECRET}&dir=${encodeURIComponent(remoteDir)}&file=${encodeURIComponent(remoteName)}&action=append`;
    const appendRes = await fetch(appendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'X-Secret': SECRET
      },
      body: chunkSlice
    });

    if (!appendRes.ok) {
      const txt = await appendRes.text();
      throw new Error(`Append failed at offset ${offset}: ${txt}`);
    }

    offset += bytesToRead;
    const pct = ((offset / totalSize) * 100).toFixed(1);
    process.stdout.write(`\r   Progress: ${(offset / (1024 * 1024)).toFixed(2)} MB / ${(totalSize / (1024 * 1024)).toFixed(2)} MB (${pct}%)`);
  }
  closeSync(fd);

  // 3. Finalize & Verify Checksum
  console.log('\n   Verifying checksum on server...');
  const finalizeUrl = `${BASE_HTTP_URL}?secret=${SECRET}&dir=${encodeURIComponent(remoteDir)}&file=${encodeURIComponent(remoteName)}&action=finalize`;
  const finalizeRes = await fetch(finalizeUrl);
  const finalizeJson = await finalizeRes.json();

  if (finalizeJson.size === totalSize && finalizeJson.sha512 === localSha512) {
    console.log(`   ✅ 100% BIT-PERFECT MATCH! (Size: ${totalSize} bytes, SHA-512: ${localSha512.slice(0, 16)}...)`);
  } else {
    throw new Error(`❌ CHECKSUM MISMATCH! Server size=${finalizeJson.size} (local=${totalSize}), server sha=${finalizeJson.sha512} (local=${localSha512})`);
  }
}

async function uploadWebPages() {
  console.log('\n🌐 [3/5] Updating Landing & Download HTML Web Pages...');
  const client = new ftp.Client(60000);
  try {
    await client.access(FTP_CONFIG);
    await client.ensureDir("aethernodevpn.com");
    await client.uploadFrom(resolve('website-src/indir.html'), 'indir.html');
    await client.uploadFrom(resolve('website-src/en/indir.html'), 'en/indir.html');
    
    await client.ensureDir("POF");
    await client.uploadFrom(resolve('website-src/indir.html'), 'indir.html');
    await client.uploadFrom(resolve('website-src/en/indir.html'), 'en/indir.html');
    console.log('   ✅ All web pages updated.');
  } finally {
    client.close();
  }
}

async function cleanupBridge() {
  console.log('\n🧹 [4/5] Removing temporary HTTPS chunk bridge...');
  try {
    await fetch(`${BASE_HTTP_URL}?secret=${SECRET}&file=dummy&action=delete_self`);
    console.log('   ✅ Server cleaned up.');
  } catch (e) {
    console.warn('   ⚠️ Could not delete bridge via HTTP, trying FTP cleanup...');
  }
}

async function main() {
  console.log('========================================================');
  console.log('🚀 AETHERNODE POF PRODUCTION DEPLOYMENT ENGINE');
  console.log('========================================================\n');

  const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
  const version = pkg.version;
  console.log(`Target Version: v${version}`);

  const installer = `AetherNode POF-v${version}-x64.exe`;
  const portable = `AetherNode POF-v${version}-portable.exe`;

  const installerPath = resolve(`release/${installer}`);
  const portablePath = resolve(`release/${portable}`);
  const ymlPath = resolve('release/latest.yml');

  if (!existsSync(installerPath) || !existsSync(portablePath) || !existsSync(ymlPath)) {
    console.error(`❌ Build artifacts not found in release/ directory for v${version}.`);
    console.error('Run "npm run dist:win" first!');
    process.exit(1);
  }

  // Step 1: Bridge
  await deployBridge();

  // Step 2: Binaries & Manifest via HTTPS Chunking
  console.log('\n🚀 [2/5] Deploying Binaries & Manifest with 100% Byte Verification...');
  await uploadFileChunked(installerPath, 'updates', installer);
  await uploadFileChunked(installerPath, 'POF/updates', installer);

  await uploadFileChunked(portablePath, 'updates', portable);
  await uploadFileChunked(portablePath, 'POF/updates', portable);

  await uploadFileChunked(ymlPath, 'updates', 'latest.yml');
  await uploadFileChunked(ymlPath, 'POF/updates', 'latest.yml');

  // Step 3: Web pages
  await uploadWebPages();

  // Step 4: Cleanup
  await cleanupBridge();

  console.log('\n========================================================');
  console.log(`🎉 RELEASE v${version} SUCCESSFULLY DEPLOYED TO PRODUCTION!`);
  console.log(`🌐 Setup URL: https://aethernodevpn.com/updates/${encodeURIComponent(installer)}`);
  console.log(`🌐 Portable URL: https://aethernodevpn.com/updates/${encodeURIComponent(portable)}`);
  console.log(`📄 Manifest: https://aethernodevpn.com/updates/latest.yml`);
  console.log('========================================================\n');
}

main().catch(err => {
  console.error('\n❌ DEPLOYMENT FAILED:', err);
  process.exit(1);
});
