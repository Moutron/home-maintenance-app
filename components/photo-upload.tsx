"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload, X, Image as ImageIcon, FileText, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface PhotoUploadProps {
  onUploadComplete: (urls: string[]) => void;
  existingUrls?: string[];
  maxFiles?: number;
  accept?: string;
  label?: string;
}

interface UploadProgress {
  fileIndex: number;
  fileName: string;
  progress: number;
  status: "pending" | "uploading" | "success" | "error";
  error?: string;
}

export function PhotoUpload({
  onUploadComplete,
  existingUrls = [],
  maxFiles = 10,
  accept = "image/*,application/pdf",
  label = "Upload Photos or Receipts",
}: PhotoUploadProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>(existingUrls);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const [compressing, setCompressing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const compressImage = async (file: File): Promise<File> => {
    // Only compress images, not PDFs
    if (!file.type.startsWith("image/") || file.type === "image/gif") {
      return file;
    }

    try {
      // Try to use browser-image-compression if available
      const imageCompression = await import("browser-image-compression").catch(() => null);
      if (imageCompression) {
        const options = {
          maxSizeMB: 2, // Max 2MB
          maxWidthOrHeight: 1920,
          useWebWorker: true,
          fileType: file.type,
        };
        
        const compressedFile = await imageCompression.default(file, options);
        console.log(`Compressed ${file.name}: ${(file.size / 1024 / 1024).toFixed(2)}MB → ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`);
        return compressedFile;
      }
    } catch (error) {
      console.warn("Client-side compression failed, using original:", error);
    }
    
    return file;
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    
    if (files.length + selectedFiles.length > maxFiles) {
      alert(`You can only upload up to ${maxFiles} files.`);
      return;
    }

    setCompressing(true);
    
    // Compress images before adding to files
    const processedFiles: File[] = [];
    for (const file of selectedFiles) {
      if (file.type.startsWith("image/")) {
        const compressed = await compressImage(file);
        processedFiles.push(compressed);
      } else {
        processedFiles.push(file);
      }
    }
    
    const newFiles = [...files, ...processedFiles].slice(0, maxFiles);
    setFiles(newFiles);
    setCompressing(false);

    // Create previews
    const newPreviews: string[] = [];
    newFiles.forEach((file) => {
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (e) => {
          newPreviews.push(e.target?.result as string);
          if (newPreviews.length === newFiles.length) {
            setPreviews([...existingUrls, ...newPreviews]);
          }
        };
        reader.readAsDataURL(file);
      } else {
        newPreviews.push(""); // Placeholder for PDFs
        if (newPreviews.length === newFiles.length) {
          setPreviews([...existingUrls, ...newPreviews]);
        }
      }
    });
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      onUploadComplete(existingUrls);
      return;
    }

    setUploading(true);
    
    // Initialize progress tracking
    const progress: UploadProgress[] = files.map((file, index) => ({
      fileIndex: index,
      fileName: file.name,
      progress: 0,
      status: "pending" as const,
    }));
    setUploadProgress(progress);

    try {
      const uploadPromises = files.map(async (file, index) => {
        // Update status to uploading
        setUploadProgress((prev) => {
          const updated = [...prev];
          updated[index] = { ...updated[index], status: "uploading", progress: 0 };
          return updated;
        });

        try {
          const formData = new FormData();
          formData.append("file", file);
          formData.append("type", file.type.startsWith("image/") ? "photo" : "receipt");

          // Simulate progress (since fetch doesn't support progress events easily)
          setUploadProgress((prev) => {
            const updated = [...prev];
            updated[index] = { ...updated[index], progress: 50 };
            return updated;
          });

          const response = await fetch("/api/upload", {
            method: "POST",
            body: formData,
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Failed to upload ${file.name}`);
          }

          const data = await response.json();
          
          // Update status to success
          setUploadProgress((prev) => {
            const updated = [...prev];
            updated[index] = { 
              ...updated[index], 
              status: "success", 
              progress: 100 
            };
            return updated;
          });

          return data.url;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Upload failed";
          
          // Update status to error
          setUploadProgress((prev) => {
            const updated = [...prev];
            updated[index] = { 
              ...updated[index], 
              status: "error", 
              error: errorMessage 
            };
            return updated;
          });
          
          throw error;
        }
      });

      const urls = await Promise.all(uploadPromises);
      const allUrls = [...existingUrls, ...urls];
      onUploadComplete(allUrls);
      
      // Clear files after successful upload
      setTimeout(() => {
        setFiles([]);
        setPreviews(allUrls);
        setUploadProgress([]);
      }, 1000);
    } catch (error) {
      console.error("Error uploading files:", error);
      const failedUploads = uploadProgress.filter(p => p.status === "error");
      if (failedUploads.length > 0) {
        alert(`Failed to upload ${failedUploads.length} file(s). Please try again.`);
      } else {
        alert("Failed to upload files. Please try again.");
      }
    } finally {
      setUploading(false);
    }
  };

  const removeFile = (index: number) => {
    // Check if it's an existing URL or a new file
    if (index < existingUrls.length) {
      // Remove existing URL
      const newPreviews = previews.filter((_, i) => i !== index);
      setPreviews(newPreviews);
      onUploadComplete(newPreviews.filter((_, i) => i >= existingUrls.length - 1));
    } else {
      // Remove new file
      const fileIndex = index - existingUrls.length;
      const newFiles = files.filter((_, i) => i !== fileIndex);
      const newPreviews = previews.filter((_, i) => i !== index);
      setFiles(newFiles);
      setPreviews(newPreviews);
      onUploadComplete(existingUrls);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium">{label}</label>
        <div
          className={cn(
            "mt-2 flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-6 transition-colors hover:border-gray-400",
            uploading && "opacity-50 cursor-not-allowed"
          )}
          onClick={() => !uploading && fileInputRef.current?.click()}
        >
          <Upload className="h-8 w-8 text-gray-400" />
          <p className="mt-2 text-sm text-gray-600">
            Click to upload or drag and drop
          </p>
          <p className="text-xs text-gray-500">
            Images or PDFs (max {maxFiles} files, 10MB each)
          </p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={accept}
          onChange={handleFileSelect}
          className="hidden"
          disabled={uploading}
        />
      </div>

      {previews.length > 0 && (
        <div className="grid grid-cols-4 gap-4">
          {previews.map((preview, index) => (
            <div key={index} className="relative group">
              {preview.startsWith("data:image") || preview.startsWith("http") ? (
                <img
                  src={preview}
                  alt={`Preview ${index + 1}`}
                  className="h-24 w-full rounded-lg object-cover"
                />
              ) : preview ? (
                <div className="h-24 w-full rounded-lg bg-gray-100 flex items-center justify-center">
                  <FileText className="h-8 w-8 text-gray-400" />
                </div>
              ) : (
                <div className="h-24 w-full rounded-lg bg-gray-100 flex items-center justify-center">
                  <ImageIcon className="h-8 w-8 text-gray-400" />
                </div>
              )}
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => removeFile(index)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Upload Progress */}
      {uploadProgress.length > 0 && (
        <div className="space-y-2">
          {uploadProgress.map((progress, index) => (
            <div key={index} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="truncate flex-1">{progress.fileName}</span>
                {progress.status === "success" && (
                  <CheckCircle2 className="h-4 w-4 text-green-600 ml-2" />
                )}
                {progress.status === "error" && (
                  <AlertCircle className="h-4 w-4 text-red-600 ml-2" />
                )}
              </div>
              {progress.status === "uploading" && (
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress.progress}%` }}
                  />
                </div>
              )}
              {progress.status === "error" && progress.error && (
                <p className="text-xs text-red-600">{progress.error}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {files.length > 0 && (
        <Button
          onClick={handleUpload}
          disabled={uploading || compressing}
          className="w-full"
        >
          {compressing
            ? "Compressing images..."
            : uploading
            ? "Uploading..."
            : `Upload ${files.length} file(s)`}
        </Button>
      )}
    </div>
  );
}

