 import { useState, useRef } from "react";
 import { useNavigate } from "react-router-dom";
 import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
 import { Button } from "@/components/ui/button";
 import { Input } from "@/components/ui/input";
 import { Label } from "@/components/ui/label";
 import { Textarea } from "@/components/ui/textarea";
 import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
 import { supabase } from "@/integrations/supabase/client";
 import { toast } from "sonner";
 import { useAuth } from "@/hooks/useAuth";
 import { Plus, Upload, FileText, Loader2, Sparkles } from "lucide-react";
 
 const PRESET_COLORS = [
   "#000000", // Black
   "#a6a6a6", // Grey
   "#ffffff", // White
   "#e2a9f1", // Lavender
   "#38b6ff", // Sky Blue
   "#ea3d57", // Coral Red
   "#6db2a0", // Sage Green
   "#ffde59", // Sunshine Yellow
 ];
 
 interface AutoFlashcardDialogProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   onSuccess: () => void;
   // For appending to existing set
   existingSetId?: string;
   existingSetTitle?: string;
 }
 
 export const AutoFlashcardDialog = ({ 
   open, 
   onOpenChange, 
   onSuccess,
   existingSetId,
   existingSetTitle 
 }: AutoFlashcardDialogProps) => {
   const { user } = useAuth();
   const navigate = useNavigate();
   const fileInputRef = useRef<HTMLInputElement>(null);
   
   const [isLoading, setIsLoading] = useState(false);
   const [formData, setFormData] = useState({
     title: "",
     color: PRESET_COLORS[0],
     flashcardType: "definition" as "definition" | "question",
     content: "",
   });
   const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
 
   const isAppendMode = !!existingSetId;
 
   const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
     const file = e.target.files?.[0];
     if (!file) return;
 
     // Check file size (max 5MB)
     if (file.size > 5 * 1024 * 1024) {
       toast.error("File too large. Maximum size is 5MB.");
       return;
     }
 
     // Support text and common document formats
     const supportedTypes = [
       'text/plain',
       'text/markdown',
       'application/pdf',
       'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
       'application/vnd.openxmlformats-officedocument.presentationml.presentation',
       'application/msword',
       'application/vnd.ms-powerpoint',
     ];
 
     try {
       setUploadedFileName(file.name);
       
       if (file.type === 'text/plain' || file.type === 'text/markdown' || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
         const text = await file.text();
         setFormData(prev => ({ ...prev, content: text }));
       } else {
         // For other formats, read as text (basic support)
         const text = await file.text();
         setFormData(prev => ({ ...prev, content: text }));
         toast.info("Document uploaded. For best results with complex formats, consider pasting the text directly.");
       }
     } catch (error) {
       console.error("Error reading file:", error);
       toast.error("Failed to read file. Please try pasting the content instead.");
       setUploadedFileName(null);
     }
   };
 
   const handleSubmit = async (e: React.FormEvent) => {
     e.preventDefault();
 
     if (!user) {
       toast.error("You must be logged in");
       return;
     }
 
     if (!isAppendMode && !formData.title.trim()) {
       toast.error("Please enter a title for your flashcard set");
       return;
     }
 
     if (!formData.content.trim()) {
       toast.error("Please paste or upload content to generate flashcards from");
       return;
     }
 
     if (formData.content.trim().length < 50) {
       toast.error("Please provide more content for better flashcard generation (at least 50 characters)");
       return;
     }
 
     setIsLoading(true);
 
     try {
       // Call AI to generate flashcards
       toast.info("Generating flashcards with AI...");
       
       const { data: aiData, error: aiError } = await supabase.functions.invoke('generate-flashcards', {
         body: { 
           content: formData.content.trim(),
           flashcardType: formData.flashcardType
         }
       });
 
       if (aiError) {
         console.error("AI generation error:", aiError);
         throw new Error(aiError.message || "Failed to generate flashcards");
       }
 
       if (!aiData?.flashcards || aiData.flashcards.length === 0) {
         throw new Error("No flashcards could be generated from this content");
       }
 
       const generatedFlashcards = aiData.flashcards as Array<{ term: string; definition: string }>;
       
       let targetSetId = existingSetId;
       let startPosition = 0;
 
       if (!isAppendMode) {
         // Create new set
         const { data: setData, error: setError } = await supabase.from("flashcard_sets").insert({
           user_id: user.id,
           title: formData.title.trim(),
           color: formData.color,
         }).select().single();
 
         if (setError) throw setError;
         targetSetId = setData.id;
       } else {
         // Get highest position in existing set
         const { data: existingCards } = await supabase
           .from("flashcards")
           .select("position")
           .eq("set_id", existingSetId)
           .order("position", { ascending: false })
           .limit(1);
         
         startPosition = (existingCards?.[0]?.position ?? -1) + 1;
       }
 
       // Insert generated flashcards
       const flashcardsToInsert = generatedFlashcards.map((card, index) => ({
         set_id: targetSetId!,
         term: card.term,
         definition: card.definition,
         position: startPosition + index,
         flashcard_type: "standard",
       }));
 
       const { error: insertError } = await supabase
         .from("flashcards")
         .insert(flashcardsToInsert);
 
       if (insertError) throw insertError;
 
       toast.success(`Generated ${generatedFlashcards.length} flashcards!`);
       
       // Reset form
       setFormData({ title: "", color: PRESET_COLORS[0], flashcardType: "definition", content: "" });
       setUploadedFileName(null);
       onOpenChange(false);
       onSuccess();
 
       // Navigate to bulk editor (for new sets, navigate; for append, the caller will handle refresh)
       if (!isAppendMode && targetSetId) {
         navigate(`/set/${targetSetId}?bulkEdit=true`);
       }
 
     } catch (error: any) {
       console.error("Auto-flashcard error:", error);
       toast.error(error.message || "Failed to generate flashcards");
     } finally {
       setIsLoading(false);
     }
   };
 
   const handleClose = () => {
     if (!isLoading) {
       setFormData({ title: "", color: PRESET_COLORS[0], flashcardType: "definition", content: "" });
       setUploadedFileName(null);
       onOpenChange(false);
     }
   };
 
   return (
     <Dialog open={open} onOpenChange={handleClose}>
       <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
         <DialogHeader>
           <DialogTitle className="flex items-center gap-2">
             <Sparkles className="h-5 w-5 text-primary" />
             {isAppendMode ? `Add AI Flashcards to "${existingSetTitle}"` : "Auto-Flashcard"}
           </DialogTitle>
           <DialogDescription>
             {isAppendMode 
               ? "Upload or paste content to generate flashcards and add them to this set."
               : "Upload or paste content to automatically generate flashcards using AI."
             }
           </DialogDescription>
         </DialogHeader>
         
         <form onSubmit={handleSubmit} className="space-y-6">
           {/* Set Title - only for new sets */}
           {!isAppendMode && (
             <div className="space-y-2">
               <Label htmlFor="title">Set Title *</Label>
               <Input
                 id="title"
                 placeholder="e.g., Biology Chapter 5"
                 value={formData.title}
                 onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                 disabled={isLoading}
                 required
               />
             </div>
           )}
 
           {/* Color Selector - only for new sets */}
           {!isAppendMode && (
             <div className="space-y-2">
               <Label>Color Theme</Label>
               <div className="flex flex-wrap gap-2">
                 {PRESET_COLORS.map((color) => (
                   <button
                     key={color}
                     type="button"
                     className="w-10 h-10 rounded-full border-2 transition-all hover:scale-110"
                     style={{
                       backgroundColor: color,
                       borderColor: formData.color === color ? "#000" : color === "#ffffff" ? "#d1d5db" : "transparent",
                       boxShadow: formData.color === color ? `0 0 0 2px ${color}` : "none",
                     }}
                     onClick={() => setFormData({ ...formData, color })}
                     disabled={isLoading}
                   />
                 ))}
                 <label
                   className="w-10 h-10 rounded-full border-2 border-dashed border-muted-foreground/50 transition-all hover:scale-110 hover:border-muted-foreground cursor-pointer flex items-center justify-center"
                   style={{
                     backgroundColor: formData.color && !PRESET_COLORS.includes(formData.color) ? formData.color : "transparent",
                     borderStyle: formData.color && !PRESET_COLORS.includes(formData.color) ? "solid" : "dashed",
                     borderColor: formData.color && !PRESET_COLORS.includes(formData.color) ? "#000" : undefined,
                   }}
                 >
                   <Plus className="h-5 w-5 text-muted-foreground" style={{ display: formData.color && !PRESET_COLORS.includes(formData.color) ? "none" : "block" }} />
                   <input
                     type="color"
                     className="sr-only"
                     value={formData.color || "#000000"}
                     onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                     disabled={isLoading}
                   />
                 </label>
               </div>
             </div>
           )}
 
           {/* Flashcard Type Selector */}
           <div className="space-y-3">
             <Label>Flashcard Type</Label>
             <RadioGroup
               value={formData.flashcardType}
               onValueChange={(value) => setFormData({ ...formData, flashcardType: value as "definition" | "question" })}
               className="flex gap-4"
               disabled={isLoading}
             >
               <div className="flex items-center space-x-2">
                 <RadioGroupItem value="definition" id="definition" />
                 <Label htmlFor="definition" className="cursor-pointer font-normal">
                   Definition (Term → Definition)
                 </Label>
               </div>
               <div className="flex items-center space-x-2">
                 <RadioGroupItem value="question" id="question" />
                 <Label htmlFor="question" className="cursor-pointer font-normal">
                   Question (Question → Answer)
                 </Label>
               </div>
             </RadioGroup>
           </div>
 
           {/* Content Input */}
           <div className="space-y-3">
             <Label>Content *</Label>
             
             {/* File Upload Button */}
             <div className="flex items-center gap-3">
               <Button
                 type="button"
                 variant="outline"
                 onClick={() => fileInputRef.current?.click()}
                 disabled={isLoading}
                 className="flex items-center gap-2"
               >
                 <Upload className="h-4 w-4" />
                 Upload Document
               </Button>
               {uploadedFileName && (
                 <span className="text-sm text-muted-foreground flex items-center gap-1">
                   <FileText className="h-4 w-4" />
                   {uploadedFileName}
                 </span>
               )}
               <input
                 ref={fileInputRef}
                 type="file"
                 accept=".txt,.md,.doc,.docx,.ppt,.pptx,.pdf"
                 onChange={handleFileUpload}
                 className="hidden"
               />
             </div>
 
             {/* Text Area */}
             <Textarea
               placeholder="Paste your content here (lecture notes, textbook excerpts, transcripts, etc.)..."
               value={formData.content}
               onChange={(e) => setFormData({ ...formData, content: e.target.value })}
               disabled={isLoading}
               rows={8}
               className="resize-none"
             />
             <p className="text-xs text-muted-foreground">
               Tip: The more context you provide, the better the flashcards will be.
             </p>
           </div>
 
           {/* Actions */}
           <div className="flex gap-3 justify-end">
             <Button
               type="button"
               variant="outline"
               onClick={handleClose}
               disabled={isLoading}
             >
               Cancel
             </Button>
             <Button type="submit" disabled={isLoading} className="min-w-[140px]">
               {isLoading ? (
                 <>
                   <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                   Generating...
                 </>
               ) : (
                 <>
                   <Sparkles className="h-4 w-4 mr-2" />
                   Generate Flashcards
                 </>
               )}
             </Button>
           </div>
         </form>
       </DialogContent>
     </Dialog>
   );
 };