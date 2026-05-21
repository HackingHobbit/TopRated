const fs = require('fs');
const path = require('path');

const CATEGORIES = {
  sports: ['NFL', 'NBA', 'MLB', 'NHL', 'WNBA', 'Soccer', 'Combat'],
  tcg: ['Pokémon', 'Marvel', 'Disney', 'My Little Pony', 'One Piece'],
  other: ['Accessories', 'Memorabilia', 'Store Merch'],
  services: ['PSA Submission']
};

const IMAGE_PLACEHOLDERS = {
  sports: 'https://placehold.co/600x800/1a1a1a/ed1c2e?text=Sports+Card',
  tcg: 'https://placehold.co/600x800/1a1a1a/ed1c2e?text=TCG+Card',
  other: 'https://placehold.co/600x800/1a1a1a/ed1c2e?text=Store+Item',
  services: 'https://placehold.co/600x800/1a1a1a/ed1c2e?text=PSA+Submission'
};

const products = [];

const KEYWORDS = {
  'NFL': 'football',
  'NBA': 'basketball',
  'MLB': 'baseball',
  'NHL': 'hockey',
  'WNBA': 'wnba,basketball',
  'Soccer': 'soccer',
  'Combat': 'ufc,boxing',
  'Pokémon': 'pokemon',
  'Marvel': 'marvel',
  'Disney': 'disney',
  'My Little Pony': 'pony',
  'One Piece': 'anime,onepiece',
  'Accessories': 'box',
  'Memorabilia': 'autograph',
  'Store Merch': 'merchandise',
  'PSA Submission': 'psa'
};

let counter = 0;

for (const [cat, subCategories] of Object.entries(CATEGORIES)) {
  for (const subCat of subCategories) {
    for (let j = 1; j <= 10; j++) {
      counter++;
      const isSealed = Math.random() > 0.5;
      const keyword = KEYWORDS[subCat] || 'collection';

      products.push({
        id: crypto.randomUUID(),
        name: `${subCat} - Item ${j} ${isSealed ? 'Box' : 'Single Card'}`,
        description: `Premium ${isSealed ? 'sealed box' : 'single card'} for ${subCat} collectors.`,
        price: parseFloat((Math.random() * (isSealed ? 200 : 50) + 10).toFixed(2)),
        image: `https://loremflickr.com/600/800/${keyword}?lock=${counter}`,
        category: cat,
        subCategory: subCat,
        isSealed,
        isSale: Math.random() > 0.8,
        isFeatured: Math.random() > 0.8,
        isNewRelease: Math.random() > 0.85,
        isOutOfStock: Math.random() > 0.9,
        isLimited: Math.random() > 0.9,
        isPreOrder: Math.random() > 0.9
      });
    }
  }
}

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}

fs.writeFileSync(path.join(dataDir, 'db.json'), JSON.stringify({ products }, null, 2));
console.log(`Generated ${products.length} products in data/db.json`);
