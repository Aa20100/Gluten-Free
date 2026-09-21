import mongoose from "mongoose";

const { Schema } = mongoose;

const addressSchema = new Schema(
  {
    street: { type: String },
    city: { type: String },
    state: { type: String },
    zip: { type: String },
    country: { type: String },
  },
  { _id: false }
);

const locationSchema = new Schema(
  {
    type: {
      type: String,
      enum: ["Point"],
      default: "Point",
    },
    // GeoJSON: [longitude, latitude]
    coordinates: {
      type: [Number],
      default: undefined,
    },
  },
  { _id: false }
);

const dietarySchema = new Schema(
  {
    glutenFree: { type: Boolean, default: false },
    dairyFree: { type: Boolean, default: false },
    eggFree: { type: Boolean, default: false },
    nutFree: { type: Boolean, default: false },
    peanutFree: { type: Boolean, default: false },
    treeNutFree: { type: Boolean, default: false },
    soyFree: { type: Boolean, default: false },
    vegetarian: { type: Boolean, default: false },
    vegan: { type: Boolean, default: false },
    halal: { type: Boolean, default: false },
    kosher: { type: Boolean, default: false },
    shellfishFree: { type: Boolean, default: false },
    sesameFree: { type: Boolean, default: false },
  },
  { _id: false }
);

const featuresSchema = new Schema(
  {
    dedicatedGfKitchen: { type: Boolean, default: false },
    separateFryer: { type: Boolean, default: false },
    gfMenu: { type: Boolean, default: false },
    gfDesserts: { type: Boolean, default: false },
    certifiedGlutenFree: { type: Boolean, default: false },
    staffTrainedForCeliac: { type: Boolean, default: false },
    crossContaminationPrecautions: { type: Boolean, default: false },
  },
  { _id: false }
);

export const RESTAURANT_TYPES = [
  "breakfast",
  "lunch",
  "dinner",
  "bakery",
  "coffee_shop",
  "fast_food",
  "dessert",
  "fine_dining",
];

const restaurantSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String },
    address: { type: addressSchema, default: () => ({}) },
    location: { type: locationSchema, default: undefined },
    phone: { type: String },
    website: { type: String },
    // Cloudinary secure_urls. The first image is treated as the hero on
    // detail pages; the rest render as a thumbnail row. Validators cap
    // this at 5 items per doc.
    imageUrls: { type: [String], default: [] },
    cuisine: { type: [String], default: [] },
    restaurantType: {
      type: [String],
      enum: RESTAURANT_TYPES,
      default: [],
    },
    dietary: { type: dietarySchema, default: () => ({}) },
    features: { type: featuresSchema, default: () => ({}) },
    averageRating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },

    // Moderation workflow for user-submitted restaurants.
    // "approved" is the default so seed inserts and moderator-created rows
    // show up publicly with no extra plumbing; user suggestions override
    // to "pending" in the controller.
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "approved",
      index: true,
    },
    submittedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    // Provenance — where the row came from. "osm" is reserved for a
    // later OpenStreetMap import; this class only uses "manual" and
    // "user_suggested".
    source: {
      type: String,
      enum: ["manual", "user_suggested", "osm"],
      default: "manual",
    },
  },
  { timestamps: true }
);

// 2dsphere index enables geospatial queries against `location`.
restaurantSchema.index({ location: "2dsphere" });

const Restaurant = mongoose.model("Restaurant", restaurantSchema);

export default Restaurant;
