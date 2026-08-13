import * as ftp from 'basic-ftp';
import { resolve } from 'path';
import { existsSync } from 'fs';

async function upload() {
    const client = new ftp.Client(30000); // 30s timeout
    client.ftp.verbose = true;
    try {
        await client.access({
            host: "cortexa99.com.tr",
            user: "cortexac",
            password: "46e38U+qIFMh!t",
            secure: false
        });
        
        // Track progress to prevent timeout issues
        client.trackProgress(info => {
            console.log(`File: ${info.name}, transferred: ${info.bytes}`);
        });

        console.log('FTP Bağlantısı başarılı, public_html/aethernodevpn.com/updates dizinine gidiliyor...');
        await client.ensureDir("public_html/aethernodevpn.com/updates");
        
        const portablePath = resolve('release/AetherNode POF-v1.0.3-portable.exe');
        if (existsSync(portablePath)) {
            console.log('Portable yükleniyor...');
            await client.uploadFrom(portablePath, 'AetherNode POF-v1.0.3-portable.exe');
            console.log('Portable yüklendi.');
        }
        
        const ymlPath = resolve('release/latest.yml');
        if (existsSync(ymlPath)) {
            console.log('latest.yml yükleniyor...');
            await client.uploadFrom(ymlPath, 'latest.yml');
            console.log('latest.yml yüklendi.');
        }
    }
    catch(err) {
        console.error(err);
    }
    client.close();
}

upload();
