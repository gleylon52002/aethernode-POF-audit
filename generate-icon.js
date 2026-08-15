const fs = require('fs');
const sharp = require('sharp');
const pngToIco = require('png-to-ico');

async function generateIcons() {
  try {
    const svgBuffer = fs.readFileSync('src/renderer/src/assets/logo.svg');
    
    // Create a 256x256 PNG
    const pngBuffer = await sharp(svgBuffer)
      .resize(256, 256)
      .png()
      .toBuffer();
    
    // Write the png temporarily
    fs.writeFileSync('resources/icons/temp.png', pngBuffer);
    
    // Convert to ico
    const icoBuffer = await pngToIco.default('resources/icons/temp.png');
    
    fs.writeFileSync('resources/icons/icon.ico', icoBuffer);
    fs.writeFileSync('resources/icons/pof.ico', icoBuffer);
    
    // Clean up
    fs.unlinkSync('resources/icons/temp.png');
    
    console.log('Icons generated successfully!');
  } catch (err) {
    console.error('Failed to generate icons:', err);
  }
}

generateIcons();
