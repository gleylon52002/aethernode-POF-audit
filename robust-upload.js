const ftp = require('basic-ftp');
const fs = require('fs');

async function uploadFiles() {
    const filesToUpload = [
        { local: 'website-src/index.html', remote: 'aethernodevpn.com/POF/index.html' },
        { local: 'website-src/indir.html', remote: 'aethernodevpn.com/POF/indir.html' },
        { local: 'website-src/ozellikler.html', remote: 'aethernodevpn.com/POF/ozellikler.html' },
        { local: 'website-src/gizlilik.html', remote: 'aethernodevpn.com/POF/gizlilik.html' },
        { local: 'website-src/en/index.html', remote: 'aethernodevpn.com/POF/en/index.html' },
        { local: 'website-src/en/indir.html', remote: 'aethernodevpn.com/POF/en/indir.html' },
        { local: 'website-src/en/ozellikler.html', remote: 'aethernodevpn.com/POF/en/ozellikler.html' },
        { local: 'website-src/en/gizlilik.html', remote: 'aethernodevpn.com/POF/en/gizlilik.html' }
    ];

    for (const file of filesToUpload) {
        let success = false;
        while (!success) {
            const client = new ftp.Client();
            try {
                await client.access({ host: 'cortexa99.com.tr', user: 'cortexac', password: '46e38U+qIFMh!t' });
                await client.uploadFrom(file.local, file.remote);
                console.log('Uploaded: ' + file.local);
                success = true;
            } catch (err) {
                console.log('Failed to upload ' + file.local + ', retrying...');
            } finally {
                client.close();
            }
        }
    }
    console.log('All files uploaded successfully.');
}
uploadFiles();
