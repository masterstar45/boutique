// Stub file for Railway deployment
// This replaces the workspace dependency with a simple mock

export const useListProducts = () => ({ 
  data: { 
    products: [],
    total: 0,
    page: 1,
    limit: 20
  }, 
  isLoading: false,
  error: null,
  refetch: () => {}
});

export const useListCategories = () => ({ 
  data: { 
    categories: [],
    total: 0
  }, 
  isLoading: false,
  error: null,
  refetch: () => {}
});

export const useCreateOrder = () => ({ 
  mutateAsync: async () => ({ 
    id: 1,
    status: 'pending',
    items: [],
    total: 0
  }),
  isLoading: false,
  error: null
});

export const useValidatePromo = () => ({ 
  mutateAsync: async () => ({ 
    valid: false,
    discount: 0
  }),
  isLoading: false,
  error: null
});

export const useGetMyOrders = () => ({ 
  data: [], 
  isLoading: false,
  error: null,
  refetch: () => {}
});

export const useCreatePayment = () => ({ 
  mutateAsync: async () => ({ 
    id: 'payment_123',
    status: 'pending',
    amount: 0
  }),
  isLoading: false,
  error: null
});

export const useGetPaymentStatus = () => ({ 
  data: { 
    status: 'pending',
    paymentUrl: null
  }, 
  isLoading: false,
  error: null,
  refetch: () => {}
});

export const useGetOrder = () => ({ 
  data: null, 
  isLoading: false,
  error: null,
  refetch: () => {}
});

export const useGetProduct = () => ({ 
  data: null, 
  isLoading: false,
  error: null,
  refetch: () => {}
});

export const useGetAffiliateStats = () => ({ 
  data: { 
    stats: {
      totalEarnings: 0,
      totalOrders: 0,
      clickCount: 0
    }
  }, 
  isLoading: false,
  error: null,
  refetch: () => {}
});

export const setBaseUrl = () => {};
export const setAuthTokenGetter = () => {};

export const useTelegramAuth = () => ({
  mutateAsync: async (_data: unknown) => ({
    token: '',
    user: {
      id: 0,
      telegramId: '',
      username: null,
      firstName: 'User',
      lastName: null,
      photoUrl: null,
      balance: '0',
      affiliateCode: '',
      isAdmin: false,
      createdAt: new Date().toISOString(),
    },
  }),
  isPending: false,
  isLoading: false,
  error: null,
});

export const useAdminListOrders = () => ({
  data: { orders: [], total: 0 },
  isLoading: false,
  error: null,
  refetch: () => {},
});

export const useGetAdminStats = () => ({
  data: {
    totalRevenue: '0',
    totalOrders: 0,
    totalUsers: 0,
    totalProducts: 0,
  },
  isLoading: false,
  error: null,
  refetch: () => {},
});

export const useAdminListPromoCodes = () => ({
  data: { promoCodes: [], total: 0 },
  isLoading: false,
  error: null,
  refetch: () => {},
});

export const useAdminCreatePromoCode = () => ({
  mutateAsync: async (_data: unknown) => ({ id: 1 }),
  isPending: false,
  isLoading: false,
  error: null,
});

export const useAdminListUsers = () => ({
  data: { users: [], total: 0 },
  isLoading: false,
  error: null,
  refetch: () => {},
});

export const useAdminListProducts = () => ({
  data: { products: [], total: 0 },
  isLoading: false,
  error: null,
  refetch: () => {},
});

export const useAdminCreateProduct = () => ({
  mutateAsync: async (_data: unknown) => ({ id: 1 }),
  isPending: false,
  isLoading: false,
  error: null,
});

export const useAdminUpdateProduct = () => ({
  mutateAsync: async (_data: unknown) => ({ id: 1 }),
  isPending: false,
  isLoading: false,
  error: null,
});

export const useAdminDeleteProduct = () => ({
  mutateAsync: async (_id: unknown) => ({}),
  isPending: false,
  isLoading: false,
  error: null,
});

// Type exports
export type UserProfile = {
  id: number;
  telegramId: string;
  username: string | null;
  firstName: string;
  lastName: string | null;
  photoUrl: string | null;
  balance: string;
  affiliateCode: string;
  isAdmin: boolean;
  createdAt: string;
};

export type ProductSummary = {
  id: number;
  name: string;
  description: string | null;
  price: string;
  imageUrl: string | null;
  stock: number;
  stockUsed: number;
  categoryId: number | null;
  isActive: boolean;
};

export type ProductListResponse = {
  products: ProductSummary[];
  total: number;
  page: number;
  limit: number;
};
