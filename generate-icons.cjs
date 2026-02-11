const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sizes = [16, 32, 48, 128];
const color = '#e64533'; // Red-orange color

async function createIcon(size) {
    // Create SVG with chameleon design
    const svg = `
        <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
            <rect width="${size}" height="${size}" fill="${color}" rx="${size > 64 ? 16 : 0}"/>
            <g transform="translate(${size * 0.15}, ${size * 0.25})">
                <path d="M ${size * 0.1} ${size * 0.3} Q ${size * 0.15} ${size * 0.15}, ${size * 0.3} ${size * 0.2} L ${size * 0.45} ${size * 0.25} Q ${size * 0.55} ${size * 0.27}, ${size * 0.5} ${size * 0.35} Q ${size * 0.45} ${size * 0.42}, ${size * 0.35} ${size * 0.4} L ${size * 0.2} ${size * 0.38} Q ${size * 0.08} ${size * 0.36}, ${size * 0.1} ${size * 0.3} Z" fill="white" opacity="0.9"/>
                <circle cx="${size * 0.25}" cy="${size * 0.27}" r="${size * 0.04}" fill="${color}"/>
            </g>
        </svg>
    `;

    const outputPath = path.join(__dirname, 'public', `icon${size}.png`);

    await sharp(Buffer.from(svg))
        .resize(size, size)
        .png()
        .toFile(outputPath);

    console.log(`✓ Created ${outputPath}`);
}

async function generateIcons() {
    console.log('Generating icons...');

    for (const size of sizes) {
        await createIcon(size);
    }

    console.log('✓ All icons generated successfully!');
}

generateIcons().catch(console.error);
