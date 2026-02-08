"use client";

import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Camera, Upload, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";

type ToolAnalysis = {
  name?: string;
  brand?: string | null;
  model?: string | null;
  category?: string | null;
  condition?: "excellent" | "good" | "fair" | "poor" | null;
  description?: string | null;
};

type ToolPhotoUploadProps = {
  onAnalysisComplete: (analysis: ToolAnalysis) => void;
};

export function ToolPhotoUpload({ onAnalysisComplete }: ToolPhotoUploadProps) {
  const [image, setImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<ToolAnalysis | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImage(file);
      setPreviewUrl(URL.createObjectURL(file));
      setError(null);
      setAnalysisResult(null);
    }
  };

  const handleAnalyze = async () => {
    if (!image) {
      setError("Please select an image first.");
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setAnalysisResult(null);

    const formData = new FormData();
    formData.append("image", image);

    try {
      const response = await fetch("/api/tools/analyze-photo", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to analyze image.");
      }

      const result = await response.json();
      setAnalysisResult(result.analysis);
      onAnalysisComplete(result.analysis);
    } catch (err: any) {
      setError(err.message || "An unknown error occurred during analysis.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <Card className="p-4">
      <CardContent className="p-0 space-y-4">
        <h5 className="font-semibold text-sm">AI Photo Analysis (Optional)</h5>
        <p className="text-xs text-muted-foreground">
          Upload a photo of your tool to auto-fill details using AI.
        </p>
        
        {previewUrl && (
          <div className="relative w-full h-48 bg-gray-100 rounded-md overflow-hidden flex items-center justify-center">
            <img src={previewUrl} alt="Tool preview" className="object-contain max-h-full max-w-full" />
          </div>
        )}

        <div className="flex gap-2">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            ref={fileInputRef}
            className="hidden"
          />
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            ref={cameraInputRef}
            className="hidden"
          />
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => fileInputRef.current?.click()} 
            className="flex-1"
          >
            <Upload className="mr-2 h-4 w-4" /> Upload Photo
          </Button>
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => cameraInputRef.current?.click()} 
            className="flex-1"
          >
            <Camera className="mr-2 h-4 w-4" /> Take Photo
          </Button>
        </div>

        <Button
          type="button"
          onClick={handleAnalyze}
          disabled={!image || isAnalyzing}
          className="w-full"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing...
            </>
          ) : (
            "Analyze Photo with AI"
          )}
        </Button>

        {error && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {analysisResult && (
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              AI Analysis Complete! Fields have been auto-filled.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

