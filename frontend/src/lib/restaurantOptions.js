/**
 * Single source of truth for the checkbox / select option lists that
 * mirror the Restaurant model's enums and boolean subdocs. Used by the
 * listing filter panel and the suggest-a-restaurant form.
 *
 * Keeping them here means the labels only need to change in one place
 * when we add a new dietary flag or restaurant type.
 */

export const RESTAURANT_TYPE_OPTIONS = [
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Dinner" },
  { value: "bakery", label: "Bakery" },
  { value: "coffee_shop", label: "Coffee Shop" },
  { value: "fast_food", label: "Fast Food" },
  { value: "dessert", label: "Dessert" },
  { value: "fine_dining", label: "Fine Dining" },
];

export const DIETARY_OPTIONS = [
  { value: "glutenFree", label: "Gluten Free" },
  { value: "dairyFree", label: "Dairy Free" },
  { value: "eggFree", label: "Egg Free" },
  { value: "nutFree", label: "Nut Free" },
  { value: "peanutFree", label: "Peanut Free" },
  { value: "treeNutFree", label: "Tree Nut Free" },
  { value: "soyFree", label: "Soy Free" },
  { value: "vegetarian", label: "Vegetarian" },
  { value: "vegan", label: "Vegan" },
  { value: "halal", label: "Halal" },
  { value: "kosher", label: "Kosher" },
  { value: "shellfishFree", label: "Shellfish Free" },
  { value: "sesameFree", label: "Sesame Free" },
];

export const FEATURE_OPTIONS = [
  { value: "dedicatedGfKitchen", label: "Dedicated GF Kitchen" },
  { value: "separateFryer", label: "Separate Fryer" },
  { value: "gfMenu", label: "GF Menu" },
  { value: "gfDesserts", label: "GF Desserts" },
  { value: "certifiedGlutenFree", label: "Certified Gluten Free" },
  { value: "staffTrainedForCeliac", label: "Staff Trained for Celiac" },
  {
    value: "crossContaminationPrecautions",
    label: "Cross-Contamination Precautions",
  },
];
