export type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
  unit: string;
  rating: number;
  reviews: number;
  seller: string;
  location: string;
  stock: string;
  image: string;
  tag?: string;
};

const photos = {
  eggs: "https://images.unsplash.com/photo-1506976785307-8732e854ad03?auto=format&fit=crop&w=900&q=85",
  hens: "https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?auto=format&fit=crop&w=900&q=85",
  chicks: "https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?auto=format&fit=crop&w=900&q=85",
  meat: "https://images.unsplash.com/photo-1587593810167-a84920ea0781?auto=format&fit=crop&w=900&q=85",
  feed: "https://images.unsplash.com/photo-1595855759920-86582396756a?auto=format&fit=crop&w=900&q=85",
  farm: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1500&q=90",
};

export const products: Product[] = [
  { id: "eggs-01", name: "Free-range brown eggs", category: "Table eggs", price: 5200, unit: "tray of 30", rating: 4.9, reviews: 48, seller: "Green Valley Farm", location: "Rulindo", stock: "Fresh today", image: photos.eggs, tag: "Bestseller" },
  { id: "hens-01", name: "Free-range laying hens", category: "Live chickens", price: 18500, unit: "per bird", rating: 4.8, reviews: 32, seller: "Imanzi Poultry", location: "Musanze", stock: "42 available", image: photos.hens },
  { id: "chicks-01", name: "Day-old broiler chicks", category: "Day-old chicks", price: 950, unit: "per chick", rating: 4.9, reviews: 76, seller: "Umurage Hatchery", location: "Kigali", stock: "620 available", image: photos.chicks, tag: "Verified" },
  { id: "meat-01", name: "Farm-raised whole chicken", category: "Chicken meat", price: 7800, unit: "per kg", rating: 4.7, reviews: 29, seller: "Isaro Fresh Foods", location: "Huye", stock: "Chilled · same day", image: photos.meat },
  { id: "eggs-02", name: "Premium fertilized eggs", category: "Fertilized eggs", price: 12000, unit: "tray of 30", rating: 4.8, reviews: 21, seller: "Sunrise Layers", location: "Nyagatare", stock: "Hatching quality", image: photos.eggs },
  { id: "feed-01", name: "Layer grower feed · 50kg", category: "Poultry feed", price: 28500, unit: "per bag", rating: 4.6, reviews: 18, seller: "AgriChoice Rwanda", location: "Kigali", stock: "In stock", image: photos.feed },
  { id: "hens-02", name: "Healthy Sasso dual-purpose", category: "Live chickens", price: 14500, unit: "per bird", rating: 4.8, reviews: 35, seller: "Green Valley Farm", location: "Rulindo", stock: "28 available", image: photos.hens, tag: "Popular" },
  { id: "gear-01", name: "Reusable egg trays · 30 cells", category: "Farm equipment", price: 900, unit: "each", rating: 4.5, reviews: 14, seller: "FarmKit Rwanda", location: "Kigali", stock: "In stock", image: photos.eggs },
];

export const categories = [
  { name: "All products", icon: "✳", count: 248, color: "sage" },
  { name: "Table eggs", icon: "◉", count: 64, color: "gold" },
  { name: "Day-old chicks", icon: "♧", count: 38, color: "peach" },
  { name: "Live chickens", icon: "♧", count: 52, color: "mint" },
  { name: "Chicken meat", icon: "◇", count: 31, color: "rose" },
  { name: "Poultry feed", icon: "▤", count: 28, color: "blue" },
  { name: "Farm equipment", icon: "⚙", count: 35, color: "lilac" },
];

export const orders = [
  { id: "PC-2048", product: "Free-range brown eggs", buyer: "Jean Claude", date: "Today, 9:42 AM", status: "Preparing", total: 26000, quantity: "5 trays", image: products[0].image },
  { id: "PC-2047", product: "Day-old broiler chicks", buyer: "Agnès Mukamana", date: "Today, 8:16 AM", status: "In transit", total: 47500, quantity: "50 chicks", image: products[2].image },
  { id: "PC-2046", product: "Free-range brown eggs", buyer: "Eric Nshimiyimana", date: "Yesterday", status: "Delivered", total: 15600, quantity: "3 trays", image: products[0].image },
  { id: "PC-2045", product: "Healthy Sasso dual-purpose", buyer: "Chantal Uwase", date: "Nov 9, 2026", status: "Delivered", total: 58000, quantity: "4 birds", image: products[6].image },
];

export const monthlyRevenue = [
  { month: "Jun", revenue: 1850000, orders: 36 },
  { month: "Jul", revenue: 2240000, orders: 42 },
  { month: "Aug", revenue: 1980000, orders: 38 },
  { month: "Sep", revenue: 2760000, orders: 51 },
  { month: "Oct", revenue: 2480000, orders: 47 },
  { month: "Nov", revenue: 3240000, orders: 63 },
];

export const farmCover = photos.farm;
export const farmStats = [
  { label: "Active farms", value: "1,284", change: "+12.8%", icon: "Sprout", color: "mint" },
  { label: "Marketplace orders", value: "8,492", change: "+8.2%", icon: "ShoppingBag", color: "gold" },
  { label: "Registered buyers", value: "12,640", change: "+18.4%", icon: "Users", color: "blue" },
  { label: "Gross marketplace value", value: "RWF 284M", change: "+14.6%", icon: "Banknote", color: "lilac" },
];
