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
let idCounter = 1;

for (const [mainCategory, subCategories] of Object.entries(CATEGORIES)) {
  for (const sub of subCategories) {
    for (let i = 1; i <= 10; i++) {
      const isSealed = Math.random() > 0.5;
      
      products.push({
        id: `prod_${idCounter++}`,
        name: `${sub} - Item ${i} ${isSealed ? 'Box' : 'Single Card'}`,
        description: `Premium ${sub} item perfect for any collection. Guaranteed authenticity and high quality.`,
        price: parseFloat((Math.random() * 200 + 10).toFixed(2)),
        image: IMAGE_PLACEHOLDERS[mainCategory],
        category: mainCategory,
        subCategory: sub,
        isSealed: mainCategory === 'services' ? false : isSealed,
        
        // Flags
        isSale: Math.random() > 0.8,
        isFeatured: Math.random() > 0.9,
        isNewRelease: Math.random() > 0.85,
        isOutOfStock: Math.random() > 0.95,
        isLimited: Math.random() > 0.8,
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
