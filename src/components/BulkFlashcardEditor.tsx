import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2, GripVertical, Image, Layers, GitBranch, FileText, X, Signature, Bookmark, Check, Loader2 } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import LogoOrb from "@/components/LogoOrb";
import { InteractiveFlashcardEditor } from "@/components/InteractiveFlashcardEditor";
import { FlowchartCanvasEditor } from "@/components/FlowchartCanvasEditor";
import { DrawingCanvasEditor } from "@/components/DrawingCanvasEditor";
import { ImageUploader } from "@/components/ImageUploader";
import { cn } from "@/lib/utils";

type FlashcardType = "standard" | "interactive" | "flowchart" | "drawing";

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

interface DrawingData {
  strokes: Array<{
    points: Array<{ x: number; y: number }>;
    color: string;
    width: number;
  }>;
  width: number;
  height: number;
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
  drawingData: DrawingData;
  isNew: boolean;
  isDeleted: boolean;
  isBookmarked: boolean;
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
    is_bookmarked?: boolean;
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
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [draggedRowId, setDraggedRowId] = useState<string | null>(null);
  const [dragOverRowId, setDragOverRowId] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const inputRefs = useRef<Map<string, HTMLInputElement | HTMLTextAreaElement>>(new Map());
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedRowsRef = useRef<string>("");

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, rowId: string) => {
    setDraggedRowId(rowId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", rowId);
    // Add a slight delay to allow the drag image to be set
    setTimeout(() => {
      const element = document.querySelector(`[data-row-id="${rowId}"]`);
      if (element) {
        element.classList.add("opacity-50");
      }
    }, 0);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    const element = document.querySelector(`[data-row-id="${draggedRowId}"]`);
    if (element) {
      element.classList.remove("opacity-50");
    }
    setDraggedRowId(null);
    setDragOverRowId(null);
  };

  const handleDragOver = (e: React.DragEvent, rowId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (rowId !== draggedRowId) {
      setDragOverRowId(rowId);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    setDragOverRowId(null);
  };

  const handleDrop = (e: React.DragEvent, targetRowId: string) => {
    e.preventDefault();
    if (!draggedRowId || draggedRowId === targetRowId) {
      setDragOverRowId(null);
      return;
    }

    setRows((prev) => {
      const newRows = [...prev];
      const draggedIndex = newRows.findIndex((r) => r.id === draggedRowId);
      const targetIndex = newRows.findIndex((r) => r.id === targetRowId);

      if (draggedIndex === -1 || targetIndex === -1) return prev;

      // Remove dragged item and insert at target position
      const [draggedItem] = newRows.splice(draggedIndex, 1);
      newRows.splice(targetIndex, 0, draggedItem);

      return newRows;
    });

    setDragOverRowId(null);
  };

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
      drawingData: card.flashcard_type === "drawing" && card.interactive_data
        ? card.interactive_data
        : { strokes: [], width: 0, height: 0 },
      isNew: false,
      isDeleted: false,
      isBookmarked: card.is_bookmarked || false,
    }));

    // Always have at least one empty row
    if (initialRows.length === 0) {
      initialRows.push(createEmptyRow());
    }

    setRows(initialRows);
    lastSavedRowsRef.current = JSON.stringify(initialRows);
    // Mark as initialized after a short delay to prevent immediate auto-save
    setTimeout(() => setIsInitialized(true), 100);
  }, [initialFlashcards]);

  // Auto-save function (doesn't close or show success toast)
  const performAutoSave = useCallback(async (rowsToSave: BulkCardRow[]) => {
    // Skip if nothing changed
    const currentRowsJson = JSON.stringify(rowsToSave);
    if (currentRowsJson === lastSavedRowsRef.current) {
      return;
    }

    // Check if there are any valid rows to save
    const hasValidContent = rowsToSave.some(
      (r) => !r.isDeleted && (r.term.trim() || r.definition.trim() || r.drawingData?.strokes?.length > 0)
    );
    
    if (!hasValidContent && !rowsToSave.some(r => r.isDeleted && r.dbId)) {
      return;
    }

    setIsAutoSaving(true);
    setAutoSaveStatus("saving");
    
    try {
      // 1. Delete marked rows
      const deletedRows = rowsToSave.filter((r) => r.isDeleted && r.dbId);
      if (deletedRows.length > 0) {
        const { error: deleteError } = await supabase
          .from("flashcards")
          .delete()
          .in("id", deletedRows.map((r) => r.dbId!));
        if (deleteError) throw deleteError;
      }

      // 2. Update existing rows with new positions
      const existingRows = rowsToSave.filter((r) => !r.isDeleted && r.dbId);
      const visibleRowsForPosition = rowsToSave.filter((r) => !r.isDeleted);
      
      for (const row of existingRows) {
        const newPosition = visibleRowsForPosition.findIndex((r) => r.id === row.id);
        const updateData: any = {
          term: row.term.trim(),
          flashcard_type: row.type,
          is_bookmarked: row.isBookmarked,
          position: newPosition,
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
        } else if (row.type === "drawing") {
          updateData.definition = "Drawing";
          updateData.image_url = null;
          updateData.interactive_data = row.drawingData;
        }

        const { error } = await supabase
          .from("flashcards")
          .update(updateData)
          .eq("id", row.dbId!);
        if (error) throw error;
      }

      // 3. Insert new rows that have content
      const newRows = rowsToSave.filter(
        (r) => r.isNew && !r.isDeleted && (r.term.trim() || r.definition.trim() || r.drawingData?.strokes?.length > 0)
      );
      
      if (newRows.length > 0) {
        for (const row of newRows) {
          const newPosition = visibleRowsForPosition.findIndex((r) => r.id === row.id);
          const insertData: any = {
            set_id: setId,
            position: newPosition,
            term: row.term.trim() || "Untitled",
            flashcard_type: row.type,
            is_bookmarked: row.isBookmarked,
          };

          if (row.type === "standard") {
            insertData.definition = row.definition.trim() || "";
            insertData.image_url = row.imageUrl || null;
          } else if (row.type === "interactive") {
            insertData.definition = "Fill in the blanks";
            insertData.image_url = row.imageUrl;
            insertData.interactive_data = row.interactiveData;
          } else if (row.type === "flowchart") {
            insertData.definition = "Flowchart diagram";
            insertData.interactive_data = row.flowchartData;
          } else if (row.type === "drawing") {
            insertData.definition = "Drawing";
            insertData.interactive_data = row.drawingData;
          }

          const { data, error } = await supabase.from("flashcards").insert(insertData).select().single();
          if (error) throw error;
          
          // Update the row to mark it as no longer new and store the dbId
          if (data) {
            setRows(prev => prev.map(r => 
              r.id === row.id ? { ...r, isNew: false, dbId: data.id } : r
            ));
          }
        }
      }

      lastSavedRowsRef.current = currentRowsJson;
      setAutoSaveStatus("saved");
      
      // Reset status after a delay
      setTimeout(() => setAutoSaveStatus("idle"), 2000);
    } catch (error: any) {
      console.error("Auto-save failed:", error);
      setAutoSaveStatus("idle");
    } finally {
      setIsAutoSaving(false);
    }
  }, [setId]);

  // Debounced auto-save effect
  useEffect(() => {
    if (!isInitialized) return;

    // Clear existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    // Set new timeout for auto-save (1.5 seconds after last change)
    autoSaveTimeoutRef.current = setTimeout(() => {
      performAutoSave(rows);
    }, 1500);

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [rows, isInitialized, performAutoSave]);

  const createEmptyRow = (): BulkCardRow => ({
    id: `new-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type: "standard",
    term: "",
    definition: "",
    imageUrl: "",
    interactiveData: { textBoxes: [] },
    flowchartData: { nodes: [], edges: [] },
    drawingData: { strokes: [], width: 0, height: 0 },
    isNew: true,
    isDeleted: false,
    isBookmarked: false,
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
    const activeRows = rows.filter((r) => !r.isDeleted && (r.term.trim() || r.definition.trim() || r.imageUrl || r.drawingData.strokes.length > 0));
    
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
      } else if (row.type === "drawing") {
        if (!row.term.trim()) {
          toast.error("Drawing cards require a term/question");
          return false;
        }
        if (!row.drawingData.strokes || row.drawingData.strokes.length === 0) {
          toast.error("Drawing cards require at least one stroke");
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

      // 2. Update existing rows with new positions
      const existingRows = rows.filter((r) => !r.isDeleted && r.dbId);
      const visibleRowsForPosition = rows.filter((r) => !r.isDeleted);
      
      for (const row of existingRows) {
        const newPosition = visibleRowsForPosition.findIndex((r) => r.id === row.id);
        const updateData: any = {
          term: row.term.trim(),
          flashcard_type: row.type,
          is_bookmarked: row.isBookmarked,
          position: newPosition,
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
        } else if (row.type === "drawing") {
          updateData.definition = "Drawing";
          updateData.image_url = null;
          updateData.interactive_data = row.drawingData;
        }

        const { error } = await supabase
          .from("flashcards")
          .update(updateData)
          .eq("id", row.dbId!);
        if (error) throw error;
      }

      // 3. Insert new rows
      const newRows = rows.filter(
        (r) => r.isNew && !r.isDeleted && (r.term.trim() || r.definition.trim() || r.drawingData.strokes.length > 0)
      );
      
      if (newRows.length > 0) {
        for (const row of newRows) {
          const newPosition = visibleRowsForPosition.findIndex((r) => r.id === row.id);
          const insertData: any = {
            set_id: setId,
            position: newPosition,
            term: row.term.trim(),
            flashcard_type: row.type,
            is_bookmarked: row.isBookmarked,
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
          } else if (row.type === "drawing") {
            insertData.definition = "Drawing";
            insertData.interactive_data = row.drawingData;
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
            {/* Auto-save status indicator */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {autoSaveStatus === "saving" && (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Saving...</span>
                </>
              )}
              {autoSaveStatus === "saved" && (
                <>
                  <Check className="h-4 w-4 text-green-500" />
                  <span className="text-green-500">Saved</span>
                </>
              )}
            </div>
            <ThemeToggle />
            <Button onClick={handleSave} disabled={isSaving || isAutoSaving}>
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
                data-row-id={row.id}
                draggable={false}
                onDragOver={(e) => handleDragOver(e, row.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, row.id)}
                className={cn(
                  "bg-card border rounded-xl overflow-hidden transition-all duration-200",
                  dragOverRowId === row.id && draggedRowId !== row.id && "border-primary border-2 scale-[1.01]",
                  draggedRowId === row.id && "opacity-50"
                )}
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
                    <button
                      type="button"
                      onClick={() => handleTypeChange(row.id, "drawing")}
                      className={cn(
                        "p-1.5 transition-colors",
                        row.type === "drawing"
                          ? "text-primary"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                      title="Drawing"
                    >
                      <Signature className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "h-8 w-8",
                        row.isBookmarked
                          ? "text-yellow-500 hover:text-yellow-600"
                          : "text-muted-foreground hover:text-yellow-500"
                      )}
                      onClick={() => handleRowChange(row.id, "isBookmarked", !row.isBookmarked)}
                      title={row.isBookmarked ? "Remove bookmark" : "Add bookmark"}
                    >
                      <Bookmark className={cn("h-4 w-4", row.isBookmarked && "fill-current")} />
                    </Button>
                    <div
                      draggable
                      onDragStart={(e) => handleDragStart(e, row.id)}
                      onDragEnd={handleDragEnd}
                      className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded transition-colors"
                      title="Drag to reorder"
                    >
                      <GripVertical className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
                    </div>
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

                  {/* Drawing Card Layout */}
                  {row.type === "drawing" && (
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
                          <Signature className="h-4 w-4 mr-2" />
                          {row.drawingData.strokes?.length > 0
                            ? `Edit Drawing (${row.drawingData.strokes.length} strokes)`
                            : "Create Drawing"}
                        </Button>
                      ) : (
                        <div className="border rounded-lg p-4 space-y-4">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">Drawing Editor</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setExpandedRow(null)}
                            >
                              Collapse
                            </Button>
                          </div>
                          <DrawingCanvasEditor
                            drawingData={row.drawingData}
                            onChange={(data) => handleRowChange(row.id, "drawingData", data)}
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
