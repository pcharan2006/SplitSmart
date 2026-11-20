import { Utensils, House, ShoppingBasket, Car, Zap, Film, ShoppingBag, Plane, Wrench, Receipt } from 'lucide-react';

// Must match the categories the backend accepts.
export const CATEGORIES = [
  'Food', 'Rent', 'Groceries', 'Transportation', 'Electricity',
  'Entertainment', 'Shopping', 'Travel', 'Utilities', 'Others',
];

const styles = {
  Food: { icon: Utensils, color: 'bg-linear-to-br from-orange-100 to-amber-50 text-orange-600' },
  Rent: { icon: House, color: 'bg-linear-to-br from-indigo-100 to-violet-50 text-indigo-600' },
  Groceries: { icon: ShoppingBasket, color: 'bg-linear-to-br from-lime-100 to-green-50 text-lime-700' },
  Transportation: { icon: Car, color: 'bg-linear-to-br from-cyan-100 to-orange-50 text-cyan-600' },
  Electricity: { icon: Zap, color: 'bg-linear-to-br from-yellow-100 to-amber-50 text-yellow-600' },
  Entertainment: { icon: Film, color: 'bg-linear-to-br from-pink-100 to-rose-50 text-pink-600' },
  Shopping: { icon: ShoppingBag, color: 'bg-linear-to-br from-rose-100 to-orange-50 text-rose-600' },
  Travel: { icon: Plane, color: 'bg-linear-to-br from-teal-100 to-emerald-50 text-teal-600' },
  Utilities: { icon: Wrench, color: 'bg-linear-to-br from-sky-100 to-lime-50 text-sky-600' },
  Others: { icon: Receipt, color: 'bg-linear-to-br from-slate-200 to-slate-100 text-slate-600' },
};

export const categoryStyle = (category) => styles[category] || styles.Others;

// One fixed colour per category so a category looks the same in every chart.
const colors = {
  Food: '#e8731a', Rent: '#1f7f5a', Groceries: '#8fb324', Transportation: '#b8621f', Electricity: '#eab308',
  Entertainment: '#c93a66', Shopping: '#dd6c4f', Travel: '#1f8389', Utilities: '#7d9024', Others: '#8a8570',
};
export const categoryColor = (category) => colors[category] || colors.Others;
