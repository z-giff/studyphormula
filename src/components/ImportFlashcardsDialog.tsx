import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import * as XLSX from "xlsx";

interface ImportFlashcardsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  setId: string;
  onSuccess: () => void;
}

export const ImportFlashcardsDialog = ({ open, onOpenChange, setId, onSuccess }: ImportFlashcardsDialogProps) => {
  const [isImporting, setIsImporting] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [delimiter, setDelimiter] = useState(",");

  const handleTextImport = async () => {
    if (!textInput.trim()) {
      toast.error("Please enter flashcard data");
      return;
    }

    setIsImporting(true);

    try {
      const lines = textInput
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

      if (lines.length === 0) {
        toast.error("No data found");
        return;
      }

      const { data: existingCards, error: positionError } = await supabase
        .from("flashcards")
        .select("position")
        .eq("set_id", setId)
        .order("position", { ascending: false })
        .limit(1);

      if (positionError) throw positionError;

      let currentPosition =
        existingCards && existingCards.length > 0 ? existingCards[0].position + 1 : 0;

      const newCards = lines
        .map((line) => {
          const parts = line.split(delimiter).map((p) => p.trim());
          const [term, definition, image_url, color] = parts;

          if (!term || !definition) return null;

          return {
            set_id: setId,
            term,
            definition,
            image_url: image_url || null,
            color: color || null,
            position: currentPosition++,
          };
        })
        .filter((card) => card !== null);

      if (newCards.length === 0) {
        toast.error("No valid flashcards found");
        return;
      }

      const { error: insertError } = await supabase.from("flashcards").insert(newCards);
      if (insertError) throw insertError;

      toast.success(`Imported ${newCards.length} flashcards`);
      setTextInput("");
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Failed to import flashcards");
    } finally {
      setIsImporting(false);
    }
  };

  const handleFileImport = async (file: File) => {
    setIsImporting(true);

    try {
      const fileExt = file.name.split(".").pop()?.toLowerCase();

      let rows: string[][] = [];

      if (fileExt === "csv") {
        const text = await file.text();
        rows = text
          .split(/\r?\n/)
          .map((row) => row.split(",").map((col) => col.trim()))
          .filter((row) => row.length > 0 && row[0]);
      } else if (fileExt === "xlsx" || fileExt === "xls") {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
        rows = jsonData.filter((row) => row.length > 0 && row[0]);
      } else {
        toast.error("Unsupported file type. Use .csv, .xlsx, or .xls");
        return;
      }

      if (rows.length === 0) {
        toast.error("File is empty");
        return;
      }

      let dataRows = rows;
      const header = rows[0].map((h) => String(h).toLowerCase());
      if (header.includes("term") && header.includes("definition")) {
        dataRows = rows.slice(1);
      }

      if (dataRows.length === 0) {
        toast.error("No flashcards found");
        return;
      }

      const { data: existingCards, error: positionError } = await supabase
        .from("flashcards")
        .select("position")
        .eq("set_id", setId)
        .order("position", { ascending: false })
        .limit(1);

      if (positionError) throw positionError;

      let currentPosition =
        existingCards && existingCards.length > 0 ? existingCards[0].position + 1 : 0;

      const newCards = dataRows
        .map((row) => {
          const [term, definition, image_url, color] = row.map((col) => String(col || "").trim());

          if (!term || !definition) return null;

          return {
            set_id: setId,
            term,
            definition,
            image_url: image_url || null,
            color: color || null,
            position: currentPosition++,
          };
        })
        .filter((card) => card !== null);

      if (newCards.length === 0) {
        toast.error("No valid flashcards found");
        return;
      }

      const { error: insertError } = await supabase.from("flashcards").insert(newCards);
      if (insertError) throw insertError;

      toast.success(`Imported ${newCards.length} flashcards`);
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Failed to import file");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Import Flashcards</DialogTitle>
          <DialogDescription>
            Import flashcards from a file or paste text with a custom delimiter.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="text" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="text">Text Input</TabsTrigger>
            <TabsTrigger value="file">File Upload</TabsTrigger>
          </TabsList>

          <TabsContent value="text" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="delimiter">Delimiter</Label>
              <Input
                id="delimiter"
                value={delimiter}
                onChange={(e) => setDelimiter(e.target.value)}
                placeholder="e.g., , or | or tab"
                maxLength={5}
              />
              <p className="text-xs text-muted-foreground">
                Character that separates term from definition (e.g., comma, pipe, tab)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="textInput">Flashcard Data</Label>
              <Textarea
                id="textInput"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder={`Enter one flashcard per line:\nTerm${delimiter}Definition${delimiter}ImageURL${delimiter}Color\nExample${delimiter}This is an example${delimiter}${delimiter}#3B82F6`}
                rows={12}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Format: Term{delimiter}Definition{delimiter}ImageURL (optional){delimiter}Color (optional)
              </p>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleTextImport} disabled={isImporting}>
                {isImporting ? "Importing..." : "Import Flashcards"}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="file" className="space-y-4">
            <div className="space-y-2">
              <Label>Upload File</Label>
              <Input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileImport(file);
                }}
                disabled={isImporting}
              />
              <p className="text-xs text-muted-foreground">
                Supported formats: CSV, Excel (.xlsx, .xls)
              </p>
              <p className="text-xs text-muted-foreground">
                Expected columns: Term, Definition, ImageURL (optional), Color (optional)
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
