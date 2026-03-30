import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link, Upload, Clipboard, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ImageUploaderProps {
  imageUrl: string;
  onImageChange: (url: string) => void;
  disabled?: boolean;
  required?: boolean;
  label?: string;
}

export const ImageUploader = ({ 
  imageUrl, 
  onImageChange, 
  disabled, 
  required = true,
  label = "Image"
}: ImageUploaderProps) => {
  const { toast } = useToast();
  const [urlInput, setUrlInput] = useState(imageUrl);
  const [activeTab, setActiveTab] = useState<"url" | "upload" | "paste">("url");
  const [isPasteListening, setIsPasteListening] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pasteAreaRef = useRef<HTMLDivElement>(null);

  // Sync URL input when imageUrl prop changes externally
  useEffect(() => {
    if (!imageUrl.startsWith("data:")) {
      setUrlInput(imageUrl);
    }
  }, [imageUrl]);

  const handleUrlSubmit = () => {
    if (urlInput.trim()) {
      onImageChange(urlInput.trim());
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file",
        description: "Please select an image file",
        variant: "destructive",
      });
      return;
    }

    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        onImageChange(dataUrl);
        toast({
          title: "Image uploaded",
          description: "Your image has been loaded successfully",
        });
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Error uploading file:", error);
      toast({
        title: "Upload failed",
        description: "Failed to upload image",
        variant: "destructive",
      });
    }
  };

  const handlePaste = useCallback(async (e: ClipboardEvent) => {
    if (!isPasteListening) return;
    
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (!file) continue;

        try {
          const reader = new FileReader();
          reader.onloadend = () => {
            const dataUrl = reader.result as string;
            onImageChange(dataUrl);
            setIsPasteListening(false);
            toast({
              title: "Image pasted",
              description: "Your image has been loaded from clipboard",
            });
          };
          reader.readAsDataURL(file);
        } catch (error) {
          console.error("Error pasting image:", error);
          toast({
            title: "Paste failed",
            description: "Failed to paste image from clipboard",
            variant: "destructive",
          });
        }
        break;
      }
    }
  }, [isPasteListening, onImageChange, toast]);

  useEffect(() => {
    if (isPasteListening) {
      document.addEventListener("paste", handlePaste);
      return () => document.removeEventListener("paste", handlePaste);
    }
  }, [isPasteListening, handlePaste]);

  const handlePasteFromClipboard = async () => {
    try {
      const clipboardItems = await navigator.clipboard.read();
      for (const item of clipboardItems) {
        const imageTypes = item.types.filter(type => type.startsWith("image/"));
        if (imageTypes.length > 0) {
          const blob = await item.getType(imageTypes[0]);
          const reader = new FileReader();
          reader.onloadend = () => {
            const dataUrl = reader.result as string;
            onImageChange(dataUrl);
            toast({
              title: "Image pasted",
              description: "Your image has been loaded from clipboard",
            });
          };
          reader.readAsDataURL(blob);
          return;
        }
      }
      toast({
        title: "No image found",
        description: "No image was found in your clipboard",
        variant: "destructive",
      });
    } catch (error) {
      // Fallback to listening mode if clipboard API fails
      setIsPasteListening(true);
      toast({
        title: "Ready to paste",
        description: "Press Ctrl+V (or Cmd+V) to paste your image",
      });
    }
  };

  const clearImage = () => {
    onImageChange("");
    setUrlInput("");
  };

  return (
    <div className="space-y-3">
      <Label>{label} {required && "*"}{!required && "(Optional)"}</Label>
      
      {imageUrl ? (
        <div className="relative">
          <div className="relative border rounded-lg overflow-hidden bg-muted/50">
            <img
              src={imageUrl}
              alt="Preview"
              className="w-full h-auto max-h-48 object-contain"
            />
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2 h-8 w-8"
              onClick={clearImage}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Click × to remove and upload a different image
          </p>
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "url" | "upload" | "paste")}>
          <TabsList className="grid w-full grid-cols-3 h-auto">
            <TabsTrigger value="url" className="text-xs px-2 py-1.5 gap-1">
              <Link className="h-3 w-3" />
              URL
            </TabsTrigger>
            <TabsTrigger value="upload" className="text-xs px-2 py-1.5 gap-1">
              <Upload className="h-3 w-3" />
              Upload
            </TabsTrigger>
            <TabsTrigger value="paste" className="text-xs px-2 py-1.5 gap-1">
              <Clipboard className="h-3 w-3" />
              Paste
            </TabsTrigger>
          </TabsList>

          <TabsContent value="url" className="mt-3 space-y-2">
            <div className="flex gap-2">
              <Input
                type="url"
                placeholder=""
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleUrlSubmit();
                  }
                }}
                disabled={disabled}
              />
              <Button 
                type="button" 
                variant="secondary" 
                onClick={handleUrlSubmit}
                disabled={disabled || !urlInput.trim()}
              >
                Load
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Enter a direct URL to an image
            </p>
          </TabsContent>

          <TabsContent value="upload" className="mt-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
              disabled={disabled}
            />
            <Button
              type="button"
              variant="outline"
              className="w-full h-24 border-dashed flex flex-col gap-2"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
            >
              <Upload className="h-6 w-6 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Click to select an image
              </span>
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              Supports JPG, PNG, GIF, WebP
            </p>
          </TabsContent>

          <TabsContent value="paste" className="mt-3">
            <div
              ref={pasteAreaRef}
              className={`w-full h-24 border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-2 transition-colors ${
                isPasteListening 
                  ? "border-primary bg-primary/5" 
                  : "border-border hover:border-muted-foreground"
              }`}
            >
              <Clipboard className={`h-6 w-6 ${isPasteListening ? "text-primary" : "text-muted-foreground"}`} />
              {isPasteListening ? (
                <span className="text-sm text-primary font-medium">
                  Press Ctrl+V to paste...
                </span>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handlePasteFromClipboard}
                  disabled={disabled}
                >
                  Click to paste from clipboard
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Copy an image to your clipboard, then paste it here
            </p>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};
