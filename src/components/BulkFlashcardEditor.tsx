import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2, GripVertical, Image, Layers, GitBranch, FileText, X } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import LogoOrb from "@/components/LogoOrb";
import { InteractiveFlashcardEditor } from "@/components/InteractiveFlashcardEditor";
import { FlowchartCanvasEditor } from "@/components/FlowchartCanvasEditor";
import { ImageUploader } from "@/components/ImageUploader";
import { cn } from "@/lib/utils";

type FlashcardType = "standard" | "interactive" | "flowchart";

interface TextBox {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  answer: string;
  fontSize?: number;
  fontWeight?: string;
  fontColor?: string;
}

interface BulkCardRow {
  id: string;
  dbId?: string; // ID from database if existing
  type: FlashcardType;
  term: string;
  definition: string;
  imageUrl: string;
  interactiveData: {
    textBoxes: TextBox[];
  };
  flowchartData: { nodes: any[]; edges: any[] };
  isNew: boolean;
  isDeleted: boolean;
}

interface BulkFlashcardEditorProps {
  setId: string;
  setTitle: string;
  initialFlashcards: Array<{
    id: string;
    term: string;
    definition: string;
    image_url: string | null;
    position: number;
    flashcard_type?: string;
    interactive_data?: any;
  }>;
  onClose: () => void;
  onSuccess: () => void;
}

export const BulkFlashcardEditor = ({
  setId,
  setTitle,
  initialFlashcards,
  onClose,
  onSuccess,
}: BulkFlashcardEditorProps) => {
  const [rows, setRows] = useState<BulkCardRow[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const inputRefs = useRef<Map<string, HTMLInputElement | HTMLTextAreaElement>>(new Map());

  // Initialize rows from existing flashcards
  useEffect(() => {
    const initialRows: BulkCardRow[] = initialFlashcards.map((card) => ({
      id: card.id,
      dbId: card.id,
      type: (card.flashcard_type as FlashcardType) || "standard",
      term: card.term,
      definition: card.definition,
      imageUrl: card.image_url || "",
      interactiveData: {
        textBoxes: card.interactive_data?.textBoxes || [],
      },
      flowchartData: card.flashcard_type === "flowchart" && card.interactive_data
        ? card.interactive_data
        : { nodes: [], edges: [] },
      isNew: false,
      isDeleted: false,
    }));

    // Always have at least one empty row
    if (initialRows.length === 0) {
      initialRows.push(createEmptyRow());
    }

    setRows(initialRows);
  }, [initialFlashcards]);

  const createEmptyRow = (): BulkCardRow => ({
    id: `new-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type: "standard",
    term: "",
    definition: "",
    imageUrl: "",
    interactiveData: { textBoxes: [] },
    flowchartData: { nodes: [], edges: [] },
    isNew: true,
    isDeleted: false,
  });

  const addNewRow = () => {
    const newRow = createEmptyRow();
    setRows((prev) => [...prev, newRow]);
    // Focus the term input of the new row after a short delay
    setTimeout(() => {
      const termInput = inputRefs.current.get(`term-${newRow.id}`);
      if (termInput) termInput.focus();
    }, 50);
  };

  const handleRowChange = (rowId: string, field: keyof BulkCardRow, value: any) => {
    setRows((prev) =>
      prev.map((row) =>
        row.id === rowId ? { ...row, [field]: value } : row
      )
    );
  };

  const handleTypeChange = (rowId: string, type: FlashcardType) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== rowId) return row;
        
        // When changing type, expand the row for interactive/flowchart
        if (type !== "standard") {
          setExpandedRow(rowId);
        } else if (expandedRow === rowId) {
          setExpandedRow(null);
        }

        return { ...row, type };
      })
    );
  };

  const handleDeleteRow = (rowId: string) => {
    setRows((prev) => {
      const row = prev.find((r) => r.id === rowId);
      if (!row) return prev;

      if (row.isNew) {
        // Remove new rows entirely
        const filtered = prev.filter((r) => r.id !== rowId);
        // Ensure at least one row exists
        return filtered.length > 0 ? filtered : [createEmptyRow()];
      } else {
        // Mark existing rows as deleted
        return prev.map((r) =>
          r.id === rowId ? { ...r, isDeleted: true } : r
        );
      }
    });
    
    if (expandedRow === rowId) {
      setExpandedRow(null);
    }
  };

  const handleKeyDown = (
    e: React.KeyboardEvent,
    rowId: string,
    field: "term" | "definition"
  ) => {
    const visibleRows = rows.filter((r) => !r.isDeleted);
    const currentIndex = visibleRows.findIndex((r) => r.id === rowId);

    if (e.key === "Tab" && !e.shiftKey) {
      if (field === "definition") {
        // Move to next row's term or create new row
        if (currentIndex === visibleRows.length - 1) {
          e.preventDefault();
          addNewRow();
        }
      }
    } else if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (field === "term") {
        // Move to definition
        const defInput = inputRefs.current.get(`definition-${rowId}`);
        if (defInput) defInput.focus();
      } else if (field === "definition") {
        // Create new row
        addNewRow();
      }
    }
  };

  const validateRows = (): boolean => {
    const activeRows = rows.filter((r) => !r.isDeleted && (r.term.trim() || r.definition.trim() || r.imageUrl));
    
    for (const row of activeRows) {
      if (row.type === "standard") {
        if (!row.term.trim() || !row.definition.trim()) {
          toast.error("Standard cards require both term and definition");
          return false;
        }
      } else if (row.type === "interactive") {
        if (!row.term.trim()) {
          toast.error("Interactive cards require a term/question");
          return false;
        }
        if (!row.imageUrl) {
          toast.error("Interactive cards require an image");
          return false;
        }
        if (row.interactiveData.textBoxes.length === 0) {
          toast.error("Interactive cards require at least one text box");
          return false;
        }
      } else if (row.type === "flowchart") {
        if (!row.term.trim()) {
          toast.error("Flowchart cards require a term/question");
          return false;
        }
        if (!row.flowchartData.nodes || row.flowchartData.nodes.length === 0) {
          toast.error("Flowchart cards require at least one node");
          return false;
        }
      }
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateRows()) return;

    setIsSaving(true);
    try {
      // 1. Delete marked rows
      const deletedRows = rows.filter((r) => r.isDeleted && r.dbId);
      if (deletedRows.length > 0) {
        const { error: deleteError } = await supabase
          .from("flashcards")
          .delete()
          .in("id", deletedRows.map((r) => r.dbId!));
        if (deleteError) throw deleteError;
      }

      // 2. Update existing rows
      const existingRows = rows.filter((r) => !r.isDeleted && r.dbId);
      for (const row of existingRows) {
        const updateData: any = {
          term: row.term.trim(),
          flashcard_type: row.type,
        };

        if (row.type === "standard") {
          updateData.definition = row.definition.trim();
          updateData.image_url = row.imageUrl || null;
          updateData.interactive_data = null;
        } else if (row.type === "interactive") {
          updateData.definition = "Fill in the blanks";
          updateData.image_url = row.imageUrl;
          updateData.interactive_data = row.interactiveData;
        } else if (row.type === "flowchart") {
          updateData.definition = "Flowchart diagram";
          updateData.image_url = null;
          updateData.interactive_data = row.flowchartData;
        }

        const { error } = await supabase
          .from("flashcards")
          .update(updateData)
          .eq("id", row.dbId!);
        if (error) throw error;
      }

      // 3. Insert new rows
      const newRows = rows.filter(
        (r) => r.isNew && !r.isDeleted && (r.term.trim() || r.definition.trim())
      );
      
      if (newRows.length > 0) {
        // Get max position
        const { data: maxPosData } = await supabase
          .from("flashcards")
          .select("position")
          .eq("set_id", setId)
          .order("position", { ascending: false })
          .limit(1);
        
        let nextPosition = (maxPosData?.[0]?.position ?? -1) + 1;

        for (const row of newRows) {
          const insertData: any = {
            set_id: setId,
            position: nextPosition++,
            term: row.term.trim(),
            flashcard_type: row.type,
          };

          if (row.type === "standard") {
            insertData.definition = row.definition.trim();
            insertData.image_url = row.imageUrl || null;
          } else if (row.type === "interactive") {
            insertData.definition = "Fill in the blanks";
            insertData.image_url = row.imageUrl;
            insertData.interactive_data = row.interactiveData;
          } else if (row.type === "flowchart") {
            insertData.definition = "Flowchart diagram";
            insertData.interactive_data = row.flowchartData;
          }

          const { error } = await supabase.from("flashcards").insert(insertData);
          if (error) throw error;
        }
      }

      toast.success("Flashcards saved successfully!");
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.message || "Failed to save flashcards");
    } finally {
      setIsSaving(false);
    }
  };

  const visibleRows = rows.filter((r) => !r.isDeleted);
  let rowNumber = 0;

  return (
    <div className="fixed inset-0 bg-background overflow-y-auto z-[100]">
      {/* Header */}
      <nav className="border-b sticky top-0 bg-background z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={onClose}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-xl font-semibold">Edit Set</h1>
              <p className="text-sm text-muted-foreground">{setTitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving..." : "Done"}
            </Button>
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-4">
          {visibleRows.map((row) => {
            rowNumber++;
            const isExpanded = expandedRow === row.id;
            
            return (
              <div
                key={row.id}
                className="bg-card border rounded-xl overflow-hidden"
              >
                {/* Row Header with Number and Actions */}
                <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-b">
                  <span className="font-medium text-foreground">{rowNumber}</span>
                  
                  {/* Type Selector Icons */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleTypeChange(row.id, "standard")}
                      className={cn(
                        "p-2 rounded-lg transition-colors",
                        row.type === "standard"
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted text-muted-foreground"
                      )}
                      title="Standard"
                    >
                      <FileText className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTypeChange(row.id, "interactive")}
                      className={cn(
                        "p-2 rounded-lg transition-colors",
                        row.type === "interactive"
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted text-muted-foreground"
                      )}
                      title="Interactive"
                    >
                      <Layers className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTypeChange(row.id, "flowchart")}
                      className={cn(
                        "p-2 rounded-lg transition-colors",
                        row.type === "flowchart"
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted text-muted-foreground"
                      )}
                      title="Flowchart"
                    >
                      <GitBranch className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <GripVertical className="h-4 w-4 text-muted-foreground/50" />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDeleteRow(row.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-4">
                  {/* Standard Card Layout */}
                  {row.type === "standard" && (
                    <div className="flex gap-4">
                      <div className="flex-1 space-y-1">
                        <Input
                          ref={(el) => {
                            if (el) inputRefs.current.set(`term-${row.id}`, el);
                          }}
                          placeholder="Enter term"
                          value={row.term}
                          onChange={(e) => handleRowChange(row.id, "term", e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, row.id, "term")}
                          className="bg-muted/50 border-0 focus-visible:ring-1"
                        />
                        <span className="text-xs text-muted-foreground uppercase tracking-wide">Term</span>
                      </div>
                      <div className="flex-1 space-y-1">
                        <Textarea
                          ref={(el) => {
                            if (el) inputRefs.current.set(`definition-${row.id}`, el);
                          }}
                          placeholder="Enter definition"
                          value={row.definition}
                          onChange={(e) => handleRowChange(row.id, "definition", e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, row.id, "definition")}
                          className="bg-muted/50 border-0 focus-visible:ring-1 min-h-[40px] resize-none"
                          rows={1}
                        />
                        <span className="text-xs text-muted-foreground uppercase tracking-wide">Definition</span>
                      </div>
                      {/* Image slot */}
                      <div className="w-24 flex-shrink-0">
                        {row.imageUrl ? (
                          <div className="relative w-full aspect-square border rounded-lg overflow-hidden bg-muted/50">
                            <img
                              src={row.imageUrl}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                            <Button
                              variant="destructive"
                              size="icon"
                              className="absolute top-1 right-1 h-6 w-6"
                              onClick={() => handleRowChange(row.id, "imageUrl", "")}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <label className="w-full aspect-square border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 transition-colors text-muted-foreground hover:text-foreground">
                            <Image className="h-5 w-5 mb-1" />
                            <span className="text-xs">Image</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onloadend = () => {
                                    handleRowChange(row.id, "imageUrl", reader.result as string);
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                          </label>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Interactive Card Layout */}
                  {row.type === "interactive" && (
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <Input
                          ref={(el) => {
                            if (el) inputRefs.current.set(`term-${row.id}`, el);
                          }}
                          placeholder="Enter term/question"
                          value={row.term}
                          onChange={(e) => handleRowChange(row.id, "term", e.target.value)}
                          className="bg-muted/50 border-0 focus-visible:ring-1"
                        />
                        <span className="text-xs text-muted-foreground uppercase tracking-wide">Term</span>
                      </div>
                      
                      {!isExpanded ? (
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => setExpandedRow(row.id)}
                        >
                          <Layers className="h-4 w-4 mr-2" />
                          {row.interactiveData.textBoxes.length > 0
                            ? `Edit Interactive (${row.interactiveData.textBoxes.length} boxes)`
                            : "Configure Interactive Card"}
                        </Button>
                      ) : (
                        <div className="border rounded-lg p-4 space-y-4">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">Interactive Editor</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setExpandedRow(null)}
                            >
                              Collapse
                            </Button>
                          </div>
                          <ImageUploader
                            imageUrl={row.imageUrl}
                            onImageChange={(url) => handleRowChange(row.id, "imageUrl", url)}
                          />
                          {row.imageUrl && (
                            <InteractiveFlashcardEditor
                              imageUrl={row.imageUrl}
                              textBoxes={row.interactiveData.textBoxes}
                              onChange={(textBoxes) =>
                                handleRowChange(row.id, "interactiveData", { textBoxes })
                              }
                              onImageChange={(url) => handleRowChange(row.id, "imageUrl", url)}
                            />
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Flowchart Card Layout */}
                  {row.type === "flowchart" && (
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <Input
                          ref={(el) => {
                            if (el) inputRefs.current.set(`term-${row.id}`, el);
                          }}
                          placeholder="Enter question/topic"
                          value={row.term}
                          onChange={(e) => handleRowChange(row.id, "term", e.target.value)}
                          className="bg-muted/50 border-0 focus-visible:ring-1"
                        />
                        <span className="text-xs text-muted-foreground uppercase tracking-wide">Term</span>
                      </div>
                      
                      {!isExpanded ? (
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => setExpandedRow(row.id)}
                        >
                          <GitBranch className="h-4 w-4 mr-2" />
                          {row.flowchartData.nodes?.length > 0
                            ? `Edit Flowchart (${row.flowchartData.nodes.length} nodes)`
                            : "Configure Flowchart"}
                        </Button>
                      ) : (
                        <div className="border rounded-lg p-4 space-y-4">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">Flowchart Editor</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setExpandedRow(null)}
                            >
                              Collapse
                            </Button>
                          </div>
                          <FlowchartCanvasEditor
                            flowchartData={row.flowchartData}
                            onChange={(data) => handleRowChange(row.id, "flowchartData", data)}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Add Card Button */}
        <div className="mt-6 flex justify-center">
          <Button
            variant="outline"
            size="lg"
            className="rounded-full px-8"
            onClick={addNewRow}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add a card
          </Button>
        </div>
      </main>
    </div>
  );
};
