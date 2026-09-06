/**
 * Seed script: wipes the `restaurants` collection and inserts a set of
 * realistic sample restaurants across a handful of US cities.
 *
 * Run with:
 *   node utils/seed.js
 */
import "dotenv/config";
import mongoose from "mongoose";

import { connectDB } from "../config/db.js";
import Restaurant from "../models/restaurant.model.js";

const SAMPLE_RESTAURANTS = [
  // ── Austin, TX ─────────────────────────────────────────────────────────
  {
    name: "Wildwood Bakehouse",
    description:
      "Dedicated gluten-free bakery and breakfast spot serving sourdough boules, kolaches, and breakfast tacos on GF flour tortillas.",
    address: { street: "3016 Guadalupe St", city: "Austin", state: "TX", zip: "78705", country: "USA" },
    location: { type: "Point", coordinates: [-97.7419, 30.2969] },
    phone: "(512) 555-0148",
    website: "https://example.com/wildwood-bakehouse",
    imageUrl: "https://images.example.com/wildwood.jpg",
    cuisine: ["American", "Bakery"],
    restaurantType: ["breakfast", "bakery"],
    dietary: { glutenFree: true, dairyFree: true, vegetarian: true, nutFree: true },
    features: {
      dedicatedGfKitchen: true,
      gfMenu: true,
      gfDesserts: true,
      certifiedGlutenFree: true,
      staffTrainedForCeliac: true,
      crossContaminationPrecautions: true,
    },
    averageRating: 4.8,
    reviewCount: 312,
  },
  {
    name: "Torchy's on Barton Springs",
    description:
      "Beloved local taco chain with a labeled GF menu and separate prep procedures for corn tortilla orders.",
    address: { street: "1311 S Congress Ave", city: "Austin", state: "TX", zip: "78704", country: "USA" },
    location: { type: "Point", coordinates: [-97.7501, 30.2510] },
    phone: "(512) 555-0192",
    website: "https://example.com/torchys",
    cuisine: ["Mexican", "Tex-Mex"],
    restaurantType: ["lunch", "dinner", "fast_food"],
    dietary: { glutenFree: true, vegetarian: true },
    features: { gfMenu: true, staffTrainedForCeliac: true, crossContaminationPrecautions: true },
    averageRating: 4.3,
    reviewCount: 587,
  },
  {
    name: "Verde Vine Wine Bar",
    description:
      "Wine-forward small plates spot with a chef who trained in celiac-safe kitchens; most menu is GF by design.",
    address: { street: "2400 E Cesar Chavez St", city: "Austin", state: "TX", zip: "78702", country: "USA" },
    location: { type: "Point", coordinates: [-97.7192, 30.2559] },
    phone: "(512) 555-0234",
    cuisine: ["Mediterranean", "Small Plates"],
    restaurantType: ["dinner", "fine_dining"],
    dietary: { glutenFree: true, vegetarian: true, vegan: true, dairyFree: true },
    features: {
      dedicatedGfKitchen: false,
      gfMenu: true,
      staffTrainedForCeliac: true,
      crossContaminationPrecautions: true,
    },
    averageRating: 4.6,
    reviewCount: 189,
  },
  {
    name: "Bouldin Creek Cafe",
    description:
      "Vegetarian/vegan cafe with clearly marked GF options and separate fryer for GF items.",
    address: { street: "1900 S 1st St", city: "Austin", state: "TX", zip: "78704", country: "USA" },
    location: { type: "Point", coordinates: [-97.7566, 30.2489] },
    phone: "(512) 555-0165",
    cuisine: ["Vegetarian", "Vegan"],
    restaurantType: ["breakfast", "lunch"],
    dietary: { glutenFree: true, vegetarian: true, vegan: true, dairyFree: true, eggFree: false },
    features: { separateFryer: true, gfMenu: true, crossContaminationPrecautions: true },
    averageRating: 4.5,
    reviewCount: 421,
  },

  // ── Portland, OR ───────────────────────────────────────────────────────
  {
    name: "Petunia's Pies & Pastries",
    description:
      "100% gluten-free and vegan bakery; every cake, cupcake, and pie is celiac-safe.",
    address: { street: "610 SW 12th Ave", city: "Portland", state: "OR", zip: "97205", country: "USA" },
    location: { type: "Point", coordinates: [-122.6841, 45.5215] },
    phone: "(503) 555-0117",
    website: "https://example.com/petunias",
    cuisine: ["Bakery", "Dessert"],
    restaurantType: ["bakery", "dessert", "coffee_shop"],
    dietary: { glutenFree: true, dairyFree: true, eggFree: true, vegan: true, vegetarian: true },
    features: {
      dedicatedGfKitchen: true,
      gfMenu: true,
      gfDesserts: true,
      certifiedGlutenFree: true,
      staffTrainedForCeliac: true,
      crossContaminationPrecautions: true,
    },
    averageRating: 4.9,
    reviewCount: 512,
  },
  {
    name: "Ground Breaker Brewing",
    description:
      "Dedicated gluten-free brewery and pub with a fully GF kitchen; famous for their IPA and GF pretzels.",
    address: { street: "2030 SE 7th Ave", city: "Portland", state: "OR", zip: "97214", country: "USA" },
    location: { type: "Point", coordinates: [-122.6608, 45.5039] },
    phone: "(503) 555-0143",
    cuisine: ["American", "Brewery"],
    restaurantType: ["lunch", "dinner"],
    dietary: { glutenFree: true, vegetarian: true },
    features: {
      dedicatedGfKitchen: true,
      separateFryer: true,
      gfMenu: true,
      gfDesserts: true,
      certifiedGlutenFree: true,
      staffTrainedForCeliac: true,
      crossContaminationPrecautions: true,
    },
    averageRating: 4.7,
    reviewCount: 298,
  },
  {
    name: "Kure Juice Bar",
    description:
      "Cold-pressed juices, smoothie bowls, and grain-free bites — everything on the menu is GF.",
    address: { street: "408 SW 12th Ave", city: "Portland", state: "OR", zip: "97205", country: "USA" },
    location: { type: "Point", coordinates: [-122.6837, 45.5205] },
    phone: "(503) 555-0181",
    cuisine: ["Juice", "Healthy"],
    restaurantType: ["breakfast", "lunch"],
    dietary: {
      glutenFree: true,
      dairyFree: true,
      eggFree: true,
      soyFree: true,
      vegan: true,
      vegetarian: true,
      nutFree: false,
    },
    features: { gfMenu: true, crossContaminationPrecautions: true },
    averageRating: 4.4,
    reviewCount: 176,
  },

  // ── Denver, CO ─────────────────────────────────────────────────────────
  {
    name: "Just Be Kitchen",
    description:
      "100% gluten-free, grain-free, and refined-sugar-free comfort food — even the cinnamon rolls are safe.",
    address: { street: "2364 15th St", city: "Denver", state: "CO", zip: "80202", country: "USA" },
    location: { type: "Point", coordinates: [-105.0069, 39.7566] },
    phone: "(303) 555-0129",
    website: "https://example.com/justbe",
    cuisine: ["American", "Comfort"],
    restaurantType: ["breakfast", "lunch", "dinner"],
    dietary: {
      glutenFree: true,
      dairyFree: true,
      soyFree: true,
      vegetarian: true,
    },
    features: {
      dedicatedGfKitchen: true,
      gfMenu: true,
      gfDesserts: true,
      certifiedGlutenFree: true,
      staffTrainedForCeliac: true,
      crossContaminationPrecautions: true,
    },
    averageRating: 4.8,
    reviewCount: 402,
  },
  {
    name: "Beau Jo's Pizza",
    description:
      "Colorado mountain-style pie shop with a dedicated GF crust program and separate prep area.",
    address: { street: "2710 S Colorado Blvd", city: "Denver", state: "CO", zip: "80222", country: "USA" },
    location: { type: "Point", coordinates: [-104.9403, 39.6689] },
    phone: "(303) 555-0176",
    cuisine: ["Pizza", "Italian"],
    restaurantType: ["lunch", "dinner"],
    dietary: { glutenFree: true, vegetarian: true },
    features: {
      gfMenu: true,
      staffTrainedForCeliac: true,
      crossContaminationPrecautions: true,
    },
    averageRating: 4.2,
    reviewCount: 634,
  },
  {
    name: "Watercourse Foods",
    description:
      "Long-running plant-based restaurant with clear GF labeling and a dedicated GF menu.",
    address: { street: "837 E 17th Ave", city: "Denver", state: "CO", zip: "80218", country: "USA" },
    location: { type: "Point", coordinates: [-104.9762, 39.7439] },
    phone: "(303) 555-0198",
    cuisine: ["Vegan", "Vegetarian"],
    restaurantType: ["breakfast", "lunch", "dinner"],
    dietary: { glutenFree: true, dairyFree: true, eggFree: true, vegan: true, vegetarian: true },
    features: { gfMenu: true, crossContaminationPrecautions: true },
    averageRating: 4.5,
    reviewCount: 355,
  },

  // ── Chicago, IL ────────────────────────────────────────────────────────
  {
    name: "Wheat's End Cafe",
    description:
      "Dedicated GF cafe and bakery in Lincoln Park — sandwiches, cinnamon buns, and cakes.",
    address: { street: "2873 N Broadway St", city: "Chicago", state: "IL", zip: "60657", country: "USA" },
    location: { type: "Point", coordinates: [-87.6448, 41.9349] },
    phone: "(773) 555-0113",
    website: "https://example.com/wheatsend",
    cuisine: ["American", "Bakery"],
    restaurantType: ["breakfast", "lunch", "bakery", "coffee_shop"],
    dietary: { glutenFree: true, vegetarian: true, nutFree: true },
    features: {
      dedicatedGfKitchen: true,
      gfMenu: true,
      gfDesserts: true,
      certifiedGlutenFree: true,
      staffTrainedForCeliac: true,
      crossContaminationPrecautions: true,
    },
    averageRating: 4.7,
    reviewCount: 268,
  },
  {
    name: "Da Luciano",
    description:
      "Italian-American spot with a dedicated GF pizza oven and pasta line — a local celiac institution.",
    address: { street: "22 S Riverside Plaza", city: "Chicago", state: "IL", zip: "60606", country: "USA" },
    location: { type: "Point", coordinates: [-87.6395, 41.8792] },
    phone: "(312) 555-0138",
    cuisine: ["Italian", "Pizza"],
    restaurantType: ["lunch", "dinner"],
    dietary: { glutenFree: true, vegetarian: true },
    features: {
      dedicatedGfKitchen: true,
      separateFryer: true,
      gfMenu: true,
      gfDesserts: true,
      staffTrainedForCeliac: true,
      crossContaminationPrecautions: true,
    },
    averageRating: 4.6,
    reviewCount: 511,
  },
  {
    name: "Defloured Bakery",
    description:
      "100% gluten-free, dairy-free, soy-free bakery selling cakes, pies, and rotating dessert flights.",
    address: { street: "1477 W Balmoral Ave", city: "Chicago", state: "IL", zip: "60640", country: "USA" },
    location: { type: "Point", coordinates: [-87.6673, 41.9782] },
    phone: "(773) 555-0159",
    cuisine: ["Bakery", "Dessert"],
    restaurantType: ["bakery", "dessert"],
    dietary: { glutenFree: true, dairyFree: true, soyFree: true, vegan: true, vegetarian: true, eggFree: true },
    features: {
      dedicatedGfKitchen: true,
      gfMenu: true,
      gfDesserts: true,
      certifiedGlutenFree: true,
      crossContaminationPrecautions: true,
    },
    averageRating: 4.8,
    reviewCount: 213,
  },

  // ── New York, NY ───────────────────────────────────────────────────────
  {
    name: "Senza Gluten",
    description:
      "West Village Italian restaurant with an entirely gluten-free menu — pastas, pizzas, and desserts.",
    address: { street: "206 Sullivan St", city: "New York", state: "NY", zip: "10012", country: "USA" },
    location: { type: "Point", coordinates: [-74.0002, 40.7286] },
    phone: "(212) 555-0154",
    website: "https://example.com/senza-gluten",
    cuisine: ["Italian"],
    restaurantType: ["dinner", "fine_dining"],
    dietary: { glutenFree: true, dairyFree: true, vegetarian: true },
    features: {
      dedicatedGfKitchen: true,
      separateFryer: true,
      gfMenu: true,
      gfDesserts: true,
      certifiedGlutenFree: true,
      staffTrainedForCeliac: true,
      crossContaminationPrecautions: true,
    },
    averageRating: 4.9,
    reviewCount: 741,
  },
  {
    name: "Modern Bread and Bagel",
    description:
      "100% GF bakery cranking out bagels, challah, and pastries indistinguishable from the real thing.",
    address: { street: "472 Columbus Ave", city: "New York", state: "NY", zip: "10024", country: "USA" },
    location: { type: "Point", coordinates: [-73.9744, 40.7841] },
    phone: "(212) 555-0121",
    cuisine: ["Bakery", "Jewish Deli"],
    restaurantType: ["breakfast", "bakery"],
    dietary: { glutenFree: true, vegetarian: true, kosher: false },
    features: {
      dedicatedGfKitchen: true,
      gfMenu: true,
      gfDesserts: true,
      certifiedGlutenFree: true,
      crossContaminationPrecautions: true,
    },
    averageRating: 4.7,
    reviewCount: 623,
  },
  {
    name: "Friedman's Chelsea Market",
    description:
      "Casual American with clear GF labeling and a separate fryer — great for a safe brunch.",
    address: { street: "75 9th Ave", city: "New York", state: "NY", zip: "10011", country: "USA" },
    location: { type: "Point", coordinates: [-74.0057, 40.7420] },
    phone: "(212) 555-0187",
    cuisine: ["American"],
    restaurantType: ["breakfast", "lunch", "dinner"],
    dietary: { glutenFree: true, vegetarian: true },
    features: {
      separateFryer: true,
      gfMenu: true,
      staffTrainedForCeliac: true,
      crossContaminationPrecautions: true,
    },
    averageRating: 4.5,
    reviewCount: 892,
  },

  // ── San Francisco, CA ──────────────────────────────────────────────────
  {
    name: "Mariposa Baking Co.",
    description:
      "Certified gluten-free bakery in the Ferry Building; breads, sandwiches, and cakes.",
    address: { street: "1 Ferry Building, Shop 25", city: "San Francisco", state: "CA", zip: "94111", country: "USA" },
    location: { type: "Point", coordinates: [-122.3937, 37.7955] },
    phone: "(415) 555-0139",
    website: "https://example.com/mariposa",
    cuisine: ["Bakery"],
    restaurantType: ["bakery", "breakfast", "coffee_shop"],
    dietary: { glutenFree: true, vegan: true, vegetarian: true, dairyFree: true },
    features: {
      dedicatedGfKitchen: true,
      gfMenu: true,
      gfDesserts: true,
      certifiedGlutenFree: true,
      crossContaminationPrecautions: true,
    },
    averageRating: 4.6,
    reviewCount: 348,
  },
  {
    name: "Nourish Cafe",
    description:
      "All-vegan, mostly-GF cafe with grain bowls and smoothies; clearly labeled cross-contact protocols.",
    address: { street: "189 6th Ave", city: "San Francisco", state: "CA", zip: "94118", country: "USA" },
    location: { type: "Point", coordinates: [-122.4645, 37.7842] },
    phone: "(415) 555-0166",
    cuisine: ["Vegan", "Healthy"],
    restaurantType: ["breakfast", "lunch"],
    dietary: { glutenFree: true, dairyFree: true, eggFree: true, vegan: true, vegetarian: true, soyFree: false },
    features: {
      gfMenu: true,
      staffTrainedForCeliac: true,
      crossContaminationPrecautions: true,
    },
    averageRating: 4.4,
    reviewCount: 227,
  },
  {
    name: "Little Gem",
    description:
      "Whole-foods-driven cafe where every dish is GF, dairy-free, and refined-sugar-free by default.",
    address: { street: "400 Grove St", city: "San Francisco", state: "CA", zip: "94102", country: "USA" },
    location: { type: "Point", coordinates: [-122.4237, 37.7776] },
    phone: "(415) 555-0175",
    cuisine: ["California", "Healthy"],
    restaurantType: ["breakfast", "lunch", "dinner"],
    dietary: {
      glutenFree: true,
      dairyFree: true,
      soyFree: true,
      vegetarian: true,
    },
    features: {
      dedicatedGfKitchen: true,
      gfMenu: true,
      gfDesserts: true,
      staffTrainedForCeliac: true,
      crossContaminationPrecautions: true,
    },
    averageRating: 4.5,
    reviewCount: 401,
  },

  // ── Plainsboro / Princeton, NJ ─────────────────────────────────────────
  {
    name: "Millstone Bakery",
    description:
      "Dedicated gluten-free bakery in Plainsboro Village Center — challah, bagels, and layered cakes, plus a small brunch menu on weekends.",
    address: {
      street: "10 Schalks Crossing Rd",
      city: "Plainsboro",
      state: "NJ",
      zip: "08536",
      country: "USA",
    },
    location: { type: "Point", coordinates: [-74.5871, 40.3323] },
    phone: "(609) 555-0142",
    website: "https://example.com/millstone-bakery",
    cuisine: ["Bakery", "American"],
    restaurantType: ["breakfast", "bakery", "coffee_shop"],
    dietary: { glutenFree: true, dairyFree: true, vegetarian: true, nutFree: true },
    features: {
      dedicatedGfKitchen: true,
      gfMenu: true,
      gfDesserts: true,
      certifiedGlutenFree: true,
      staffTrainedForCeliac: true,
      crossContaminationPrecautions: true,
    },
    averageRating: 4.7,
    reviewCount: 184,
  },
  {
    name: "Nassau Street Kitchen",
    description:
      "Modern American restaurant a few blocks off the Princeton campus with a clearly marked GF menu and a dedicated fryer.",
    address: {
      street: "182 Nassau St",
      city: "Princeton",
      state: "NJ",
      zip: "08542",
      country: "USA",
    },
    location: { type: "Point", coordinates: [-74.6672, 40.3573] },
    phone: "(609) 555-0163",
    cuisine: ["American", "Farm-to-Table"],
    restaurantType: ["lunch", "dinner", "fine_dining"],
    dietary: { glutenFree: true, dairyFree: true, vegetarian: true, vegan: true },
    features: {
      separateFryer: true,
      gfMenu: true,
      gfDesserts: true,
      staffTrainedForCeliac: true,
      crossContaminationPrecautions: true,
    },
    averageRating: 4.6,
    reviewCount: 267,
  },
  {
    name: "Ridge Road Cafe",
    description:
      "West Windsor breakfast and brunch spot with an all-day GF pancake, waffle, and eggs-benedict menu. Kid-friendly, right by Princeton Junction station.",
    address: {
      street: "451 Ridge Rd",
      city: "West Windsor",
      state: "NJ",
      zip: "08550",
      country: "USA",
    },
    location: { type: "Point", coordinates: [-74.6207, 40.3168] },
    phone: "(609) 555-0189",
    cuisine: ["American", "Breakfast"],
    restaurantType: ["breakfast", "lunch"],
    dietary: {
      glutenFree: true,
      dairyFree: true,
      eggFree: false,
      nutFree: true,
      vegetarian: true,
    },
    features: {
      separateFryer: true,
      gfMenu: true,
      staffTrainedForCeliac: true,
      crossContaminationPrecautions: true,
    },
    averageRating: 4.5,
    reviewCount: 221,
  },
];

async function main() {
  await connectDB();

  console.log("[seed] Wiping restaurants collection...");
  await Restaurant.deleteMany({});

  console.log(`[seed] Inserting ${SAMPLE_RESTAURANTS.length} sample restaurants...`);
  const inserted = await Restaurant.insertMany(SAMPLE_RESTAURANTS);
  console.log(`[seed] Inserted ${inserted.length} restaurants.`);
}

main()
  .catch((err) => {
    console.error("[seed] Failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
    console.log("[seed] Disconnected. Done.");
  });
