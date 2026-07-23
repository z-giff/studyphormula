 import { useState } from "react";
 import { useNavigate } from "react-router-dom";
 import { useAuth } from "@/hooks/useAuth";
 import { supabase } from "@/integrations/supabase/client";
 import {
   Dialog,
   DialogContent,
   DialogHeader,
   DialogTitle,
   DialogDescription,
 } from "@/components/ui/dialog";
 import { Button } from "@/components/ui/button";
 import { Input } from "@/components/ui/input";
 import { Label } from "@/components/ui/label";
 import { toast } from "sonner";
 import { Save, Loader2 } from "lucide-react";
 
 const PRESET_COLORS = [
   "#000000",
   "#a6a6a6",
   "#ffffff",
   "#e2a9f1",
   "#38b6ff",
   "#ea3d57",
   "#6db2a0",
   "#ffde59",
 ];
 
 interface SaveNotLearnedDialogProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   flashcards: Array<{
     id: string;
     term: string;
     definition: string;
     image_url: string | null;
     color: string | null;
     flashcard_type?: string;
     interactive_data?: any;
   }>;
   onSuccess: () => void;
 }
 
 export const SaveNotLearnedDialog = ({
   open,
   onOpenChange,
   flashcards,
   onSuccess,
 }: SaveNotLearnedDialogProps) => {
   const { user } = useAuth();
   const navigate = useNavigate();
   const [title, setTitle] = useState("");
   const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[4]);
   const [isSaving, setIsSaving] = useState(false);
 
   const handleSave = async () => {
     if (!title.trim()) {
       toast.error("Please enter a title for the new set");
       return;
     }
 
     if (!user) {
       toast.error("You must be logged in");
       return;
     }
 
     setIsSaving(true);
 
     try {
       // Create new set
       const { data: newSet, error: setError } = await supabase
         .from("flashcard_sets")
         .insert({
           title: title.trim(),
           color: selectedColor,
           user_id: user.id,
         })
         .select()
         .single();
 
       if (setError) throw setError;
 
       // Create flashcards in new set
       const flashcardsToInsert = flashcards.map((card, index) => ({
         set_id: newSet.id,
         term: card.term,
         definition: card.definition,
         image_url: card.image_url,
         color: card.color,
         flashcard_type: card.flashcard_type || "standard",
         interactive_data: card.interactive_data,
         position: index,
       }));
 
       const { error: cardsError } = await supabase
         .from("flashcards")
         .insert(flashcardsToInsert);
 
       if (cardsError) throw cardsError;
 
       toast.success(`Created new set "${title}" with ${flashcards.length} cards`);
       onSuccess();
     } catch (error: any) {
       toast.error(error.message || "Failed to create new set");
     } finally {
       setIsSaving(false);
     }
   };
 
   return (
     <Dialog open={open} onOpenChange={onOpenChange}>
       <DialogContent className="sm:max-w-md">
         <DialogHeader>
           <DialogTitle>Save as New Flashcard Set</DialogTitle>
           <DialogDescription>
             Create a new set with the {flashcards.length} cards you're still learning.
           </DialogDescription>
         </DialogHeader>
 
         <div className="space-y-6 py-4">
           <div className="space-y-2">
             <Label htmlFor="title">Set Title</Label>
             <Input
               id="title"
               placeholder="e.g., Review Cards - Biology"
               value={title}
               onChange={(e) => setTitle(e.target.value)}
               autoFocus
             />
           </div>
 
           <div className="space-y-2">
             <Label>Set Color</Label>
             <div className="flex flex-wrap gap-2">
               {PRESET_COLORS.map((color) => (
                 <button
                   key={color}
                   type="button"
                   className="w-8 h-8 rounded-full border-2 transition-all hover:scale-110"
                   style={{
                     backgroundColor: color,
                     borderColor: selectedColor === color ? "hsl(11 85% 66%)" : color === "#ffffff" ? "#d1d5db" : "transparent",
                   }}
                   onClick={() => setSelectedColor(color)}
                 />
               ))}
             </div>
           </div>
         </div>
 
         <div className="flex gap-3">
           <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
             Cancel
           </Button>
           <Button onClick={handleSave} disabled={isSaving} className="flex-1">
             {isSaving ? (
               <Loader2 className="h-4 w-4 mr-2 animate-spin" />
             ) : (
               <Save className="h-4 w-4 mr-2" />
             )}
             Save Set
           </Button>
         </div>
       </DialogContent>
     </Dialog>
   );
 };