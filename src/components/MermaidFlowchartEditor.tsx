import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import mermaid from "mermaid";

interface MermaidFlowchartEditorProps {
  mermaidCode: string;
  onChange: (code: string) => void;
  fontSize?: number;
  fontFamily?: string;
  onFontSizeChange?: (size: number) => void;
  onFontFamilyChange?: (family: string) => void;
}

const FLOWCHART_TEMPLATES = {
  blank: "",
  basic: `graph TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Action 1]
    B -->|No| D[Action 2]
    C --> E[End]
    D --> E`,
  process: `graph LR
    A[Input] --> B[Process 1]
    B --> C[Process 2]
    C --> D[Output]`,
  sequence: `sequenceDiagram
    participant A as User
    participant B as System
    A->>B: Request
    B->>A: Response`,
  mindmap: `graph TD
    Root[Main Topic]
    Root --> A[Subtopic 1]
    Root --> B[Subtopic 2]
    Root --> C[Subtopic 3]
    A --> A1[Detail 1]
    A --> A2[Detail 2]
    B --> B1[Detail 3]`,
  cycle: `graph TD
    A[Step 1] --> B[Step 2]
    B --> C[Step 3]
    C --> D[Step 4]
    D --> A`,
};

export const MermaidFlowchartEditor = ({
  mermaidCode,
  onChange,
  fontSize = 16,
  fontFamily = "arial",
  onFontSizeChange,
  onFontFamilyChange,
}: MermaidFlowchartEditorProps) => {
  const { toast } = useToast();
  const [previewKey, setPreviewKey] = useState(0);

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: true,
      theme: "default",
      fontSize: fontSize,
      fontFamily: fontFamily,
    });
  }, [fontSize, fontFamily]);

  const handleTemplateChange = (template: string) => {
    onChange(FLOWCHART_TEMPLATES[template as keyof typeof FLOWCHART_TEMPLATES]);
    setPreviewKey((prev) => prev + 1);
  };

  const handlePreview = () => {
    setPreviewKey((prev) => prev + 1);
    toast({
      title: "Preview updated",
      description: "Your flowchart has been rendered",
    });
  };

  useEffect(() => {
    const renderMermaid = async () => {
      if (!mermaidCode) return;
      
      try {
        const element = document.getElementById("mermaid-preview");
        if (element) {
          element.removeAttribute("data-processed");
          element.innerHTML = mermaidCode;
          await mermaid.run({ nodes: [element] });
        }
      } catch (error) {
        console.error("Mermaid render error:", error);
      }
    };

    const timer = setTimeout(renderMermaid, 500);
    return () => clearTimeout(timer);
  }, [mermaidCode, previewKey, fontSize, fontFamily]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="template">Flowchart Template</Label>
          <Select onValueChange={handleTemplateChange}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a template" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="blank">Blank</SelectItem>
              <SelectItem value="basic">Basic Flowchart</SelectItem>
              <SelectItem value="process">Process Flow</SelectItem>
              <SelectItem value="sequence">Sequence Diagram</SelectItem>
              <SelectItem value="mindmap">Mind Map</SelectItem>
              <SelectItem value="cycle">Cycle Diagram</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label htmlFor="fontSize">Font Size</Label>
            <Input
              id="fontSize"
              type="number"
              min="10"
              max="32"
              value={fontSize}
              onChange={(e) => onFontSizeChange?.(parseInt(e.target.value) || 16)}
            />
          </div>
          <div>
            <Label htmlFor="fontFamily">Font</Label>
            <Select value={fontFamily} onValueChange={onFontFamilyChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="arial">Arial</SelectItem>
                <SelectItem value="times">Times New Roman</SelectItem>
                <SelectItem value="courier">Courier</SelectItem>
                <SelectItem value="georgia">Georgia</SelectItem>
                <SelectItem value="verdana">Verdana</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div>
        <Label htmlFor="mermaid-code">Mermaid Code</Label>
        <Textarea
          id="mermaid-code"
          value={mermaidCode}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Enter Mermaid diagram syntax..."
          rows={10}
          className="font-mono text-sm"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Learn Mermaid syntax at{" "}
          <a
            href="https://mermaid.js.org/intro/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            mermaid.js.org
          </a>
        </p>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <Label>Preview</Label>
          <Button type="button" variant="outline" size="sm" onClick={handlePreview}>
            Refresh Preview
          </Button>
        </div>
        <div className="border rounded-lg p-4 bg-background min-h-[200px] flex items-center justify-center overflow-auto">
          {mermaidCode ? (
            <div key={previewKey} id="mermaid-preview" className="mermaid">
              {mermaidCode}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              Enter Mermaid code or select a template to see preview
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
