import * as ftp from 'basic-ftp';
import { resolve } from 'path';

async function upload() {
    const client = new ftp.Client();
    client.ftp.verbose = true;
    try {
        await client.access({
            host: "cortexa99.com.tr",
            user: "cortexac",
            password: "46e38U+qIFMh!t",
            secure: false
        });
        
        await client.ensureDir("public_html/aethernodevpn.com/updates");
        
        console.log('latest.yml yükleniyor...');
        await client.uploadFrom(resolve('release/latest.yml'), 'latest.yml');
        console.log('latest.yml başarıyla yüklendi.');
    }
    catch(err) {
        console.error(err);
    }
    client.close();
}

upload();
