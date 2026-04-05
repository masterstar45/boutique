// Stub file for Railway deployment
// This replaces the workspace dependency with a simple mock

export const useUpload = () => ({
  mutateAsync: async () => ({ url: '', key: '' }),
  isLoading: false
});

export const uploadFile = async () => ({ url: '', key: '' });
