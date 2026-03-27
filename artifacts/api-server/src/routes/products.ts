import { Router, type IRouter } from "express";
import { db, productsTable, categoriesTable } from "@workspace/db";
import { eq, and, ilike, sql } from "drizzle-orm";
import { getRubriqueCountries, isValidRubrique } from "../lib/rubriqueCountries";

const router: IRouter = Router();

router.get("/rubriques/:rubrique/countries", async (req, res): Promise<void> => {
  const rubriqueRaw = String(req.params.rubrique || "").trim().toLowerCase();

  if (!isValidRubrique(rubriqueRaw)) {
    res.status(400).json({ error: "Rubrique invalide" });
    return;
  }

  const countries = await getRubriqueCountries(rubriqueRaw);
  res.setHeader("Cache-Control", "public, max-age=300");
  res.json({ rubrique: rubriqueRaw, countries });
});

router.get("/products", async (req, res): Promise<void> => {
  const { categoryId, search, featured, tags } = req.query;

  const conditions = [eq(productsTable.isActive, true)];

  if (categoryId) {
    conditions.push(eq(productsTable.categoryId, Number(categoryId)));
  }

  const products = await db.select().from(productsTable)
    .where(and(...conditions))
    .orderBy(productsTable.createdAt);

  let filtered = products;

  if (search) {
    const s = String(search).toLowerCase();
    filtered = filtered.filter(p =>
      p.name.toLowerCase().includes(s) || p.description.toLowerCase().includes(s)
    );
  }
  if (featured === "true") {
    filtered = filtered.filter(p => p.isFeatured);
  }

  if (tags) {
    const tagList = String(tags).toLowerCase().split(",").map(t => t.trim()).filter(Boolean);
    if (tagList.length > 0) {
      filtered = filtered.filter(p => {
        const productTags = (p.tags as string[] ?? []).map(t => t.toLowerCase());
        return tagList.every(t => productTags.includes(t));
      });
    }
  }

  res.setHeader("Cache-Control", "public, max-age=30");
  res.json({
    products: filtered.map(p => ({
      id: p.id,
      name: p.name,
      description: p.description,
      price: p.price,
      imageUrl: p.imageUrl,
      categoryId: p.categoryId,
      tags: p.tags ?? [],
      isActive: p.isActive,
      isFeatured: p.isFeatured,
      isBestSeller: p.isBestSeller,
      isNew: p.isNew,
      totalSales: p.totalSales,
      stock: p.stock,
      stockUsed: p.stockUsed,
      stockAvailable: Math.max(0, (p.stock ?? 0) - (p.stockUsed ?? 0)),
      priceOptions: p.priceOptions ?? [],
      createdAt: p.createdAt,
    })),
  });
});

router.get("/products/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const product = await db.select().from(productsTable)
    .where(and(eq(productsTable.id, id), eq(productsTable.isActive, true)))
    .then(r => r[0]);

  if (!product) {
    res.status(404).json({ error: "Produit introuvable" });
    return;
  }

  res.setHeader("Cache-Control", "public, max-age=30");
  res.json({
    id: product.id,
    name: product.name,
    description: product.description,
    price: product.price,
    imageUrl: product.imageUrl,
    categoryId: product.categoryId,
    tags: product.tags ?? [],
    isActive: product.isActive,
    isFeatured: product.isFeatured,
    isBestSeller: product.isBestSeller,
    isNew: product.isNew,
    fileName: product.fileName,
    fileType: product.fileType,
    fileSize: product.fileSize,
    downloadLimit: product.downloadLimit,
    totalSales: product.totalSales,
    stock: product.stock,
    stockUsed: product.stockUsed,
    stockAvailable: Math.max(0, (product.stock ?? 0) - (product.stockUsed ?? 0)),
    priceOptions: product.priceOptions ?? [],
    createdAt: product.createdAt,
  });
});

router.get("/categories", async (_req, res): Promise<void> => {
  const categories = await db.select().from(categoriesTable);
  res.setHeader("Cache-Control", "public, max-age=300");
  res.json({ categories });
});

export default router;
