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
