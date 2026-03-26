import { useState, useCallback } from "react";
import type { UppyFile } from "@uppy/core";

interface UploadMetadata {
  name: string;
  size: number;
  contentType: string;
}

interface UploadResponse {
  uploadURL: string;
  objectPath: string;
  metadata: UploadMetadata;
}

interface UseUploadOptions {
  /** Base path where object storage routes are mounted (default: "/api/storage") */
  basePath?: string;
  onSuccess?: (response: UploadResponse) => void;
  onError?: (error: Error) => void;
}

/**
 * React hook for handling file uploads with presigned URLs.
 *
 * This hook implements the two-step presigned URL upload flow:
 * 1. Request a presigned URL from your backend (sends JSON metadata, NOT the file)
 * 2. Upload the file directly to the presigned URL
 *
 * @example
 * ```tsx
 * function FileUploader() {
 *   const { uploadFile, isUploading, error } = useUpload({
 *     onSuccess: (response) => {
 *       console.log("Uploaded to:", response.objectPath);
 *     },
 *   });
 *
 *   const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
 *     const file = e.target.files?.[0];
 *     if (file) {
 *       await uploadFile(file);
 *     }
 *   };
 *
 *   return (
 *     <div>
 *       <input type="file" onChange={handleFileChange} disabled={isUploading} />
 *       {isUploading && <p>Uploading...</p>}
 *       {error && <p>Error: {error.message}</p>}
 *     </div>
 *   );
 * }
 * ```
 */
export function useUpload(options: UseUploadOptions = {}) {
  // Detect API base URL at hook creation time
  const detectApiBaseUrl = () => {
    // Priority 1: Use explicit basePath if provided
    if (options.basePath) {
      const cleaned = options.basePath.replace("/api/storage", "");
      if (cleaned) return cleaned;
    }

    // Priority 2: Use global variable set by frontend main.tsx
    if (typeof window !== "undefined" && (window as any).__API_BASE_URL) {
      const url = (window as any).__API_BASE_URL;
      console.log("[useUpload] Using global __API_BASE_URL:", url);
      return url;
    }

    // Priority 3: Fallback to Railway domain detection
    if (typeof window !== "undefined" && window.location.hostname.endsWith("up.railway.app")) {
      const url = "https://api-server-production-823c.up.railway.app";
      console.log("[useUpload] Using Railway fallback URL:", url);
      return url;
    }

    console.warn("[useUpload] No API base URL detected, will use relative path");
    return "";
  };

  const apiBaseUrl = detectApiBaseUrl();
  const basePath = apiBaseUrl 
    ? `${apiBaseUrl}/api/storage`
    : (options.basePath ?? "/api/storage");

  console.log("[useUpload] Final basePath:", basePath, "| apiBaseUrl:", apiBaseUrl);

  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [progress, setProgress] = useState(0);

  const requestUploadUrl = useCallback(
    async (file: File): Promise<UploadResponse> => {
      const url = `${basePath}/uploads/request-url`;
      
      // Get JWT token from localStorage (set by AuthContext)
      const token = typeof window !== "undefined" 
        ? localStorage.getItem("bankdata_token")
        : null;
      
      console.log("[requestUploadUrl] Starting request:", {
        url,
        fileName: file.name,
        fileSize: file.size,
        contentType: file.type || "application/octet-stream",
        hasToken: !!token,
      });

      try {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }
        
        const response = await fetch(url, {
          method: "POST",
          headers,
          body: JSON.stringify({
            name: file.name,
            size: file.size,
            contentType: file.type || "application/octet-stream",
          }),
        });

        console.log("[requestUploadUrl] Response received:", {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok,
        });

        if (!response.ok) {
          let errorData: any = {};
          try {
            errorData = await response.json();
          } catch (e) {
            console.log("[requestUploadUrl] Could not parse error response as JSON");
          }
          const errorMsg = errorData?.error || `Failed to get upload URL (HTTP ${response.status})`;
          console.error("[requestUploadUrl] Error details:", response.status, errorData);
          throw new Error(errorMsg);
        }

        const data = await response.json();
        console.log("[requestUploadUrl] Success! Received:", data);
        return data;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.error("[requestUploadUrl] Exception caught:", errorMsg, err);
        const enhancedError = new Error(
          `[${url}] ${errorMsg}\n(Check network tab or admin logs)`
        );
        (enhancedError as any).originalError = err;
        throw enhancedError;
      }
    },
    [basePath]
  );

  const uploadToPresignedUrl = useCallback(
    async (file: File, uploadURL: string): Promise<void> => {
      console.log("[uploadToPresignedUrl] Starting presigned URL upload:", {
        uploadURL: uploadURL.substring(0, 100) + "...",
        fileName: file.name,
        fileSize: file.size,
        contentType: file.type,
      });

      // Mock fallback detection: if URL is from mock-storage.local, simulate success
      if (uploadURL.includes("mock-storage.local")) {
        console.log("[uploadToPresignedUrl] Mock storage detected - simulating successful upload");
        return; // Success! No actual upload needed for mock URLs
      }

      try {
        const response = await fetch(uploadURL, {
          method: "PUT",
          body: file,
          headers: {
            "Content-Type": file.type || "application/octet-stream",
          },
        });

        console.log("[uploadToPresignedUrl] Response received:", {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok,
        });

        if (!response.ok) {
          throw new Error(`Failed to upload to presigned URL (HTTP ${response.status})`);
        }

        console.log("[uploadToPresignedUrl] Upload successful!");
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.error("[uploadToPresignedUrl] Error:", errorMsg);
        throw err;
      }
    },
    []
  );

  const uploadFile = useCallback(
    async (file: File): Promise<UploadResponse | null> => {
      console.log("[uploadFile] Starting file upload process for:", file.name);
      setIsUploading(true);
      setError(null);
      setProgress(0);

      try {
        console.log("[uploadFile] Progress 10% - requesting upload URL");
        setProgress(10);
        const uploadResponse = await requestUploadUrl(file);

        console.log("[uploadFile] Progress 30% - uploading to presigned URL");
        setProgress(30);
        await uploadToPresignedUrl(file, uploadResponse.uploadURL);

        console.log("[uploadFile] Progress 100% - upload complete");
        setProgress(100);
        options.onSuccess?.(uploadResponse);
        return uploadResponse;
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Upload failed");
        console.error("[uploadFile] Upload failed:", error.message);
        setError(error);
        options.onError?.(error);
        return null;
      } finally {
        setIsUploading(false);
      }
    },
    [requestUploadUrl, uploadToPresignedUrl, options]
  );

  const getUploadParameters = useCallback(
    async (
      file: UppyFile<Record<string, unknown>, Record<string, unknown>>
    ): Promise<{
      method: "PUT";
      url: string;
      headers?: Record<string, string>;
    }> => {
      const url = `${basePath}/uploads/request-url`;
      console.log("[getUploadParameters] Requesting:", url, "for file:", file.name);
      
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: file.name,
            size: file.size,
            contentType: file.type || "application/octet-stream",
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error("[getUploadParameters] Error:", response.status, errorData);
          throw new Error(`Failed to get upload URL (${response.status})`);
        }

        const data = await response.json();
        console.log("[getUploadParameters] Success:", data);
        return {
          method: "PUT",
          url: data.uploadURL,
          headers: { "Content-Type": file.type || "application/octet-stream" },
        };
      } catch (err) {
        console.error("[getUploadParameters] Exception:", err);
        throw err;
      }
    },
    [basePath]
  );

  return {
    uploadFile,
    getUploadParameters,
    isUploading,
    error,
    progress,
  };
}
