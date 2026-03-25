import React, { createContext, useContext, useEffect, useState } from 'react';
import type { ProductSummary } from '@workspace/api-client-react';

export interface SelectedOption {
  label: string;
  price: string;
  quantity: string;
}

export interface CartItem {
  product: ProductSummary;
  quantity: number;
  selectedOption?: SelectedOption;
}

interface CartContextType {
  items: CartItem[];
  addToCart: (product: ProductSummary, option?: SelectedOption) => void;
  removeFromCart: (productId: number, optionLabel?: string) => void;
  updateQuantity: (productId: number, quantity: number, optionLabel?: string) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextType>({
  items: [],
  addToCart: () => {},
  removeFromCart: () => {},
  updateQuantity: () => {},
  clearCart: () => {},
  totalItems: 0,
  totalPrice: 0,
});

function itemKey(productId: number, optionLabel?: string) {
  return optionLabel ? `${productId}::${optionLabel}` : `${productId}`;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('bankdata_cart');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('bankdata_cart', JSON.stringify(items));
  }, [items]);

  const addToCart = (product: ProductSummary, option?: SelectedOption) => {
    const key = itemKey(product.id, option?.label);
    setItems(prev => {
      const existing = prev.find(item => itemKey(item.product.id, item.selectedOption?.label) === key);
      if (existing) {
        return prev.map(item =>
          itemKey(item.product.id, item.selectedOption?.label) === key
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1, selectedOption: option }];
    });
  };

  const removeFromCart = (productId: number, optionLabel?: string) => {
    const key = itemKey(productId, optionLabel);
    setItems(prev => prev.filter(item => itemKey(item.product.id, item.selectedOption?.label) !== key));
  };

  const updateQuantity = (productId: number, quantity: number, optionLabel?: string) => {
    const key = itemKey(productId, optionLabel);
    if (quantity < 1) {
      removeFromCart(productId, optionLabel);
      return;
    }
    setItems(prev => prev.map(item =>
      itemKey(item.product.id, item.selectedOption?.label) === key ? { ...item, quantity } : item
    ));
  };

  const clearCart = () => setItems([]);

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce((sum, item) => {
    const price = item.selectedOption ? parseFloat(item.selectedOption.price) : parseFloat(item.product.price);
    return sum + price * item.quantity;
  }, 0);

  return (
    <CartContext.Provider value={{
      items,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      totalItems,
      totalPrice
    }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
