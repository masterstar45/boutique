// Stub file for Railway deployment
// This replaces the workspace dependency with a simple mock

export const useListProducts = () => ({ data: [], isLoading: false });
export const useListCategories = () => ({ data: [], isLoading: false });
export const useCreateOrder = () => ({ mutateAsync: async () => ({}) });
export const useValidatePromo = () => ({ mutateAsync: async () => ({ valid: false }) });
export const useGetMyOrders = () => ({ data: [], isLoading: false });
export const useCreatePayment = () => ({ mutateAsync: async () => ({}) });
export const useGetPaymentStatus = () => ({ data: { status: 'pending' }, isLoading: false });
export const useGetOrder = () => ({ data: null, isLoading: false });
export const useGetProduct = () => ({ data: null, isLoading: false });
export const useGetAffiliateStats = () => ({ data: { stats: {} }, isLoading: false });

export const setBaseUrl = () => {};
export const setAuthTokenGetter = () => {};
