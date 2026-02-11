const sharp = require('sharp');
const path = require('path');

const sizes = [16, 32, 48, 128];
const inputPath = path.join(__dirname, 'public', 'RedIcon512.png');

async function resizeIcon(size) {
    const outputPath = path.join(__dirname, 'public', `icon${size}.png`);

    await sharp(inputPath)
        .resize(size, size)
        .png()
        .toFile(outputPath);

    console.log(`✓ Created ${outputPath}`);
}

async function resizeIcons() {
    console.log('Resizing red icon to extension sizes...');

    for (const size of sizes) {
        await resizeIcon(size);
    }

    console.log('✓ All icons resized successfully!');
}

resizeIcons().catch(console.error);
