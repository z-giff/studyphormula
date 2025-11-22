import { useEffect, useState } from "react";
import mermaid from "mermaid";

interface MermaidFlowchartDisplayProps {
  mermaidCode: string;
  fontSize?: number;
  fontFamily?: string;
}

export const MermaidFlowchartDisplay = ({
  mermaidCode,
  fontSize = 16,
  fontFamily = "arial",
}: MermaidFlowchartDisplayProps) => {
  const [renderKey, setRenderKey] = useState(0);

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: true,
      theme: "default",
      fontSize: fontSize,
      fontFamily: fontFamily,
    });
  }, [fontSize, fontFamily]);

  useEffect(() => {
    const renderMermaid = async () => {
      if (!mermaidCode) return;
      
      try {
        const element = document.getElementById(`mermaid-display-${renderKey}`);
        if (element) {
          element.removeAttribute("data-processed");
          element.innerHTML = mermaidCode;
          await mermaid.run({ nodes: [element] });
        }
      } catch (error) {
        console.error("Mermaid render error:", error);
      }
    };

    renderMermaid();
  }, [mermaidCode, renderKey, fontSize, fontFamily]);

  return (
    <div className="border rounded-lg p-6 bg-background flex items-center justify-center overflow-auto">
      <div key={renderKey} id={`mermaid-display-${renderKey}`} className="mermaid">
        {mermaidCode}
      </div>
    </div>
  );
};
