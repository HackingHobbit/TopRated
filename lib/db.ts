"use server";

import fs from 'fs/promises';
import path from 'path';

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  subCategory: string;
  isSealed: boolean;
  isSale: boolean;
  isFeatured: boolean;
  isNewRelease: boolean;
  isOutOfStock: boolean;
  isLimited: boolean;
  isPreOrder: boolean;
}

const DB_PATH = path.join(process.cwd(), 'data', 'db.json');

async function readDB(): Promise<{ products: Product[] }> {
  const data = await fs.readFile(DB_PATH, 'utf-8');
  return JSON.parse(data);
}

async function writeDB(data: { products: Product[] }) {
  await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2));
}

// Mimics a Supabase SELECT
export async function getProducts(filters?: Partial<Product>) {
  const db = await readDB();
  let results = db.products;
  
  if (filters) {
    results = results.filter(p => {
      for (const [key, value] of Object.entries(filters)) {
        if (p[key as keyof Product] !== value) return false;
      }
      return true;
    });
  }
  return results;
}

// Mimics a Supabase UPDATE
export async function updateProduct(id: string, updates: Partial<Product>) {
  const db = await readDB();
  const index = db.products.findIndex(p => p.id === id);
  if (index === -1) throw new Error('Product not found');
  
  db.products[index] = { ...db.products[index], ...updates };
  await writeDB(db);
  return db.products[index];
}

// Mimics a Supabase DELETE
export async function deleteProduct(id: string) {
  const db = await readDB();
  db.products = db.products.filter(p => p.id !== id);
  await writeDB(db);
}
