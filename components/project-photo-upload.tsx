"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, X, Image as ImageIcon, Camera } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ProjectPhotoUploadProps = {
  projectId: string;
  stepId?: string;
  onUploadComplete: () => void;
};

export function ProjectPhotoUpload({
  projectId,
  stepId,
  onUploadComplete,
}: ProjectPhotoUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [isBefore, setIsBefore] = useState(false);
  const [isAfter, setIsAfter] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      if (caption) formData.append("caption", caption);
      if (stepId) formData.append("stepId", stepId);
      formData.append("isBefore", isBefore.toString());
      formData.append("isAfter", isAfter.toString());

      const response = await fetch(`/api/diy-projects/${projectId}/photos`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload photo");
      }

      // Reset form
      setFile(null);
      setPreview(null);
      setCaption("");
      setIsBefore(false);
      setIsAfter(false);
      if (fileInputRef.current) fileInputRef.current.value = "";

      onUploadComplete();
    } catch (error) {
      console.error("Error uploading photo:", error);
      alert("Failed to upload photo. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload Photo</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {preview && (
          <div className="relative w-full h-48 bg-gray-100 rounded-md overflow-hidden flex items-center justify-center">
            <img
              src={preview}
              alt="Preview"
              className="object-contain max-h-full max-w-full"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2"
              onClick={() => {
                setFile(null);
                setPreview(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        <div className="flex gap-2">
          <Input
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            ref={fileInputRef}
            className="hidden"
          />
          <Input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileSelect}
            ref={cameraInputRef}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            className="flex-1"
          >
            <Upload className="mr-2 h-4 w-4" />
            Upload Photo
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => cameraInputRef.current?.click()}
            className="flex-1"
          >
            <Camera className="mr-2 h-4 w-4" />
            Take Photo
          </Button>
        </div>

        <div>
          <Label htmlFor="caption">Caption (Optional)</Label>
          <Input
            id="caption"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Add a caption..."
          />
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isBefore"
              checked={isBefore}
              onChange={(e) => {
                setIsBefore(e.target.checked);
                if (e.target.checked) setIsAfter(false);
              }}
              className="h-4 w-4 rounded border-gray-300"
            />
            <Label htmlFor="isBefore" className="cursor-pointer">
              Before Photo
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isAfter"
              checked={isAfter}
              onChange={(e) => {
                setIsAfter(e.target.checked);
                if (e.target.checked) setIsBefore(false);
              }}
              className="h-4 w-4 rounded border-gray-300"
            />
            <Label htmlFor="isAfter" className="cursor-pointer">
              After Photo
            </Label>
          </div>
        </div>

        <Button
          type="button"
          onClick={handleUpload}
          disabled={!file || uploading}
          className="w-full"
        >
          {uploading ? "Uploading..." : "Upload Photo"}
        </Button>
      </CardContent>
    </Card>
  );
}

