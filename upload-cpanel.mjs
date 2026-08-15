import * as ftp from 'basic-ftp';
import { resolve } from 'path';
import { existsSync } from 'fs';

async function upload() {
    const client = new ftp.Client(60000); // 60s timeout
    client.ftp.verbose = true;
    try {
        await client.access({
            host: "cortexa99.com.tr",
            user: "cortexac",
            password: "46e38U+qIFMh!t",
            secure: false
        });
        
        client.trackProgress(info => {
            console.log(`File: ${info.name}, transferred: ${info.bytes}`);
        });

        console.log('aethernodevpn.com/updates dizinine gidiliyor...');
        await client.ensureDir("aethernodevpn.com/updates");
        
        const portablePath = resolve('release/AetherNode POF-v1.0.5-portable.exe');
        if (existsSync(portablePath)) {
            console.log('Portable v1.0.5 yükleniyor...');
            await client.uploadFrom(portablePath, 'AetherNode POF-v1.0.5-portable.exe');
            console.log('Portable yüklendi.');
        }

        const installerPath = resolve('release/AetherNode POF-v1.0.5-x64.exe');
        if (existsSync(installerPath)) {
            console.log('Installer v1.0.5 yükleniyor...');
            await client.uploadFrom(installerPath, 'AetherNode POF-v1.0.5-x64.exe');
            console.log('Installer yüklendi.');
        }
        
        const ymlPath = resolve('release/latest.yml');
        if (existsSync(ymlPath)) {
            console.log('latest.yml yükleniyor...');
            await client.uploadFrom(ymlPath, 'latest.yml');
            console.log('latest.yml yüklendi.');
        }

        console.log('POF/updates dizinine gidiliyor...');
        await client.ensureDir("../POF/updates");
        if (existsSync(ymlPath)) {
            await client.uploadFrom(ymlPath, 'latest.yml');
            console.log('POF/updates/latest.yml yüklendi.');
        }

        console.log('Web sayfaları güncelleniyor...');
        await client.ensureDir("../../");
        await client.uploadFrom(resolve('website-src/indir.html'), 'indir.html');
        await client.uploadFrom(resolve('website-src/en/indir.html'), 'en/indir.html');
        await client.uploadFrom(resolve('website-src/indir.html'), 'POF/indir.html');
        await client.uploadFrom(resolve('website-src/en/indir.html'), 'POF/en/indir.html');
        console.log('Tüm web sayfaları güncellendi.');
    }
    catch(err) {
        console.error('FTP Hatası:', err);
    }
    client.close();
}

upload();
