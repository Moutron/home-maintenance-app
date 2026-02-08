"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Camera, Upload, X, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface PhotoUploadProps {
  onAnalysisComplete: (analysis: {
    systemType: string | null;
    brand: string | null;
    model: string | null;
    installDate: string | null;
    estimatedAge: number | null;
    condition: string | null;
    material: string | null;
    capacity: string | null;
    additionalDetails: string | null;
  }) => void;
  systemTypeHint?: string;
  disabled?: boolean;
}

export function SystemPhotoUpload({
  onAnalysisComplete,
  systemTypeHint,
  disabled = false,
}: PhotoUploadProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      // 10MB limit
      setError("Image must be less than 10MB");
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Convert to base64
    const base64 = await fileToBase64(file);
    await analyzePhoto(base64);
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64 = (reader.result as string).split(",")[1];
        resolve(base64);
      };
      reader.onerror = reject;
    });
  };

  const analyzePhoto = async (base64: string) => {
    setIsAnalyzing(true);
    setError(null);

    try {
      const response = await fetch("/api/systems/analyze-photo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageBase64: base64,
          systemTypeHint: systemTypeHint,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to analyze photo");
      }

      const data = await response.json();
      onAnalysisComplete(data.analysis);
    } catch (err: any) {
      setError(err.message || "Failed to analyze photo");
      console.error("Photo analysis error:", err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleRemove = () => {
    setPreview(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileInputChange}
          className="hidden"
          disabled={disabled || isAnalyzing}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileInputChange}
          className="hidden"
          disabled={disabled || isAnalyzing}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isAnalyzing}
          className="flex-1"
        >
          <Upload className="mr-2 h-4 w-4" />
          Upload Photo
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => cameraInputRef.current?.click()}
          disabled={disabled || isAnalyzing}
          className="flex-1"
        >
          <Camera className="mr-2 h-4 w-4" />
          Take Photo
        </Button>
      </div>

      {preview && (
        <div className="relative">
          <img
            src={preview}
            alt="Preview"
            className="w-full h-48 object-cover rounded-md border"
          />
          {!isAnalyzing && (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleRemove}
              className="absolute top-2 right-2"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}

      {isAnalyzing && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Analyzing photo with AI...
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}

