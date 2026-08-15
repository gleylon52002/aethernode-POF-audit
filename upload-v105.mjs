import * as ftp from 'basic-ftp';
import { resolve } from 'path';
import { existsSync } from 'fs';

async function uploadAll() {
  const client = new ftp.Client(60000);
  client.ftp.verbose = true;
  try {
    console.log('Connecting to cPanel FTP...');
    await client.access({
      host: "cortexa99.com.tr",
      user: "cortexac",
      password: "46e38U+qIFMh!t",
      secure: false
    });

    client.trackProgress(info => {
      console.log(`[Progress] ${info.name}: ${(info.bytes / (1024 * 1024)).toFixed(2)} MB transferred`);
    });

    // 1. latest.yml -> updates & POF/updates
    console.log('\n--- Uploading latest.yml ---');
    await client.ensureDir("public_html/aethernodevpn.com/updates");
    await client.uploadFrom(resolve('release/latest.yml'), 'latest.yml');

    await client.ensureDir("../POF/updates");
    await client.uploadFrom(resolve('release/latest.yml'), 'latest.yml');

    // 2. Web pages -> public_html/aethernodevpn.com & POF
    console.log('\n--- Uploading Web Pages ---');
    await client.ensureDir("../../");
    await client.uploadFrom(resolve('website-src/indir.html'), 'indir.html');
    await client.uploadFrom(resolve('website-src/en/indir.html'), 'en/indir.html');
    await client.uploadFrom(resolve('website-src/indir.html'), 'POF/indir.html');
    await client.uploadFrom(resolve('website-src/en/indir.html'), 'POF/en/indir.html');

    // 3. Executables -> public_html/aethernodevpn.com/updates
    console.log('\n--- Uploading Executables ---');
    await client.ensureDir("updates");

    const installerPath = resolve('release/AetherNode POF-v1.0.5-x64.exe');
    if (existsSync(installerPath)) {
      console.log('Uploading Installer v1.0.5...');
      await client.uploadFrom(installerPath, 'AetherNode POF-v1.0.5-x64.exe');
    }

    const portablePath = resolve('release/AetherNode POF-v1.0.5-portable.exe');
    if (existsSync(portablePath)) {
      console.log('Uploading Portable v1.0.5...');
      await client.uploadFrom(portablePath, 'AetherNode POF-v1.0.5-portable.exe');
    }

    console.log('\n=== ALL v1.0.5 FILES SUCCESSFULLY UPLOADED TO CPANEL! ===');
  } catch (err) {
    console.error('FTP Upload Error:', err);
  } finally {
    client.close();
  }
}

uploadAll();
