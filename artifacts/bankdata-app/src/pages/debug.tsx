import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useUpload } from "@workspace/object-storage-web";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft } from "lucide-react";
import { Link } from "wouter";

export function DebugPage() {
  const { user, token, isAdmin, isLoading } = useAuth();
  const { uploadFile, isUploading, progress, error } = useUpload();
  const [uploadTestResult, setUploadTestResult] = useState<any>(null);

  const handleTestUpload = async () => {
    setUploadTestResult(null);

    // Create a test file
    const content =
      "Test\nLine 1\nLine 2\nhttps://github.com\ntest@email.com\n+33612345678";
    const blob = new Blob([content], { type: "text/plain" });
    const file = new File([blob], "test-upload.txt", { type: "text/plain" });

    console.log("[DEBUG] Starting test upload:", {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
    });

    const result = await uploadFile(file);

    if (result) {
      setUploadTestResult({
        status: "✅ SUCCESS",
        objectPath: result.objectPath,
        uploadURL: result.uploadURL?.substring(0, 100) + "...",
        metadata: result.metadata,
      });
      console.log("[DEBUG] Upload successful:", result);
    } else {
      setUploadTestResult({
        status: "❌ FAILED",
        error: error?.message || "Unknown error",
      });
      console.log("[DEBUG] Upload failed:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white p-4 flex items-center justify-center">
        <p>Chargement...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4">
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Header avec bouton retour */}
        <div className="flex items-center gap-2 mb-4">
          <Link href="/">
            <Button variant="ghost" size="sm" className="text-white/50 hover:text-white">
              <ChevronLeft className="w-4 h-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">🔧 Infos Compte</h1>
        </div>

        {/* User Info */}
        <Card className="bg-slate-900 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">👤 Tes Infos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <p className="text-xs text-white/50 uppercase">ID Telegram:</p>
              <p className="font-mono text-sm bg-black/30 p-2 rounded border border-white/10">
                {user?.telegramId || "❌ Non trouvé"}
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-xs text-white/50 uppercase">Username:</p>
              <p>{user?.username || user?.firstName || "—"}</p>
            </div>
            <div className="space-y-2">
              <p className="text-xs text-white/50 uppercase">Statut Admin:</p>
              <p className="text-base font-bold">
                {isAdmin ? "✅ OUI - Tu es Admin" : "❌ NON - Pas Admin"}
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-xs text-white/50 uppercase">Token JWT:</p>
              <p className="text-xs">
                {token ? "✅ Présent" : "❌ Absent"}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Test Upload */}
        <Card className="bg-slate-900 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">📤 Tester Upload Fichier</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-white/70">
              Clic sur le bouton pour tester l'upload d'un fichier TXT
            </p>
            <Button
              onClick={handleTestUpload}
              disabled={isUploading || !token}
              className="w-full"
            >
              {isUploading ? `Upload... ${progress}%` : "🚀 Tester Upload"}
            </Button>

            {uploadTestResult && (
              <div
                className={`border rounded p-3 bg-black/30 text-sm space-y-2 ${
                  uploadTestResult.status.includes("SUCCESS")
                    ? "border-emerald-500/50"
                    : "border-red-500/50"
                }`}
              >
                <p className="font-bold text-base">{uploadTestResult.status}</p>
                {uploadTestResult.objectPath && (
                  <div className="space-y-1">
                    <p className="text-white/70 text-xs">📂 Object Path:</p>
                    <code className="text-xs bg-black/50 px-2 py-1 rounded block break-all">
                      {uploadTestResult.objectPath}
                    </code>
                  </div>
                )}
                {uploadTestResult.error && (
                  <div className="space-y-1">
                    <p className="text-white/70 text-xs">❌ Erreur:</p>
                    <div className="text-red-300 text-xs bg-black/50 px-2 py-1 rounded block whitespace-pre-wrap break-words">
                      {uploadTestResult.error}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Console Instructions */}
        <Card className="bg-slate-900 border-white/10">
          <CardHeader>
            <CardTitle className="text-white text-sm">📋 Vérifier la Console</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <p>
              Appuie sur <kbd className="bg-black/50 px-1 py-0.5 rounded text-xs">F12</kbd> pour ouvrir la console du navigateur.
            </p>
            <p>
              Cherche les messages <code className="bg-black/50 px-1">[useUpload]</code> ou{" "}
              <code className="bg-black/50 px-1">[requestUploadUrl]</code>.
            </p>
            <p className="text-white/50">
              Cela aide à diagnostiquer les problèmes d'upload.
            </p>
          </CardContent>
        </Card>

        {/* Spacer */}
        <div className="h-8" />
      </div>
    </div>
  );
}
