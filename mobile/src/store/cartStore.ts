import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ICartItem, IProduct } from '../types';

const CART_STORAGE_KEY = '@quickmart_guest_cart';

interface CartState {
  items: ICartItem[];
  isLoaded: boolean;
  loadCart: () => Promise<void>;
  addItem: (product: IProduct) => Promise<void>;
  removeItem: (productId: string) => Promise<void>;
  updateQuantity: (productId: string, quantity: number) => Promise<void>;
  getItemQuantity: (productId: string) => number;
  clearCart: () => Promise<void>;
  getSubtotal: () => number;
  getTotalItems: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  isLoaded: false,

  loadCart: async () => {
    try {
      const data = await AsyncStorage.getItem(CART_STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data) as ICartItem[];
        set({ items: parsed, isLoaded: true });
      } else {
        set({ items: [], isLoaded: true });
      }
    } catch {
      set({ items: [], isLoaded: true });
    }
  },

  addItem: async (product: IProduct) => {
    const currentItems = [...get().items];
    const existingIndex = currentItems.findIndex(
      (item) => item.product._id === product._id
    );

    if (existingIndex > -1) {
      const maxStock = product.stockQuantity || 20;
      if (currentItems[existingIndex].quantity < maxStock) {
        currentItems[existingIndex].quantity += 1;
      }
    } else {
      currentItems.push({ product, quantity: 1 });
    }

    set({ items: currentItems });
    await AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(currentItems));
  },

  removeItem: async (productId: string) => {
    const updated = get().items.filter((item) => item.product._id !== productId);
    set({ items: updated });
    await AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(updated));
  },

  updateQuantity: async (productId: string, quantity: number) => {
    if (quantity <= 0) {
      await get().removeItem(productId);
      return;
    }

    const currentItems = [...get().items];
    const index = currentItems.findIndex((item) => item.product._id === productId);

    if (index > -1) {
      const maxStock = currentItems[index].product.stockQuantity || 20;
      currentItems[index].quantity = Math.min(quantity, maxStock, 20);
      set({ items: currentItems });
      await AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(currentItems));
    }
  },

  getItemQuantity: (productId: string) => {
    const item = get().items.find((i) => i.product._id === productId);
    return item ? item.quantity : 0;
  },

  clearCart: async () => {
    set({ items: [] });
    await AsyncStorage.removeItem(CART_STORAGE_KEY);
  },

  getSubtotal: () => {
    return get().items.reduce(
      (sum, item) => sum + item.product.discountedPrice * item.quantity,
      0
    );
  },

  getTotalItems: () => {
    return get().items.reduce((count, item) => count + item.quantity, 0);
  },
}));
