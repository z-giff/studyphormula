import { useMemo } from "react";
import { ReactFlow, Node, Edge, Background, Controls, Handle, Position } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { cn } from "@/lib/utils";

export type FlowchartData = { nodes: Node[]; edges: Edge[] };

interface FlowchartCanvasDisplayProps {
  flowchartData: FlowchartData;
  className?: string;
  showControls?: boolean;
  /** The editor's dotted grid behind the chart. */
  showGrid?: boolean;
  /** Pan and zoom with the pointer. Off, the chart is a still picture and taps
      pass straight through to whatever holds it, such as a card to flip. */
  interactive?: boolean;
}

const nodeTypes = {
  default: ({ data }: { data: any }) => (
    <div
      style={{
        padding: "10px 20px",
        borderRadius: "8px",
        background: data.color || "#3b82f6",
        color: "white",
        minWidth: "120px",
        textAlign: "center",
        position: "relative",
      }}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      {data.image && (
        <img src={data.image} alt="" loading="lazy" decoding="async" style={{ width: "100%", maxHeight: "60px", objectFit: "cover", marginBottom: "8px", borderRadius: "4px" }} />
      )}
      <div style={{ fontWeight: 500 }}>{data.label}</div>
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </div>
  ),
  input: ({ data }: { data: any }) => (
    <div
      style={{
        padding: "10px 20px",
        borderRadius: "8px",
        background: data.color || "#22c55e",
        color: "white",
        minWidth: "120px",
        textAlign: "center",
        position: "relative",
      }}
    >
      {data.image && (
        <img src={data.image} alt="" loading="lazy" decoding="async" style={{ width: "100%", maxHeight: "60px", objectFit: "cover", marginBottom: "8px", borderRadius: "4px" }} />
      )}
      <div style={{ fontWeight: 500 }}>{data.label}</div>
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </div>
  ),
  output: ({ data }: { data: any }) => (
    <div
      style={{
        padding: "10px 20px",
        borderRadius: "8px",
        background: data.color || "#ef4444",
        color: "white",
        minWidth: "120px",
        textAlign: "center",
        position: "relative",
      }}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      {data.image && (
        <img src={data.image} alt="" loading="lazy" decoding="async" style={{ width: "100%", maxHeight: "60px", objectFit: "cover", marginBottom: "8px", borderRadius: "4px" }} />
      )}
      <div style={{ fontWeight: 500 }}>{data.label}</div>
    </div>
  ),
  circle: ({ data }: { data: any }) => (
    <div
      style={{
        padding: "20px",
        borderRadius: "50%",
        background: data.color || "#3b82f6",
        color: "white",
        width: "120px",
        height: "120px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        position: "relative",
      }}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      {data.image && (
        <img src={data.image} alt="" loading="lazy" decoding="async" style={{ width: "60px", height: "60px", objectFit: "cover", marginBottom: "4px", borderRadius: "50%" }} />
      )}
      <div style={{ fontWeight: 500, fontSize: "12px", wordBreak: "break-word" }}>{data.label}</div>
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </div>
  ),
  diamond: ({ data }: { data: any }) => (
    <div
      style={{
        width: "120px",
        height: "120px",
        background: data.color || "#f59e0b",
        transform: "rotate(45deg)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
      }}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0, transform: "rotate(-45deg)" }} />
      <div
        style={{
          transform: "rotate(-45deg)",
          color: "white",
          fontWeight: 500,
          fontSize: "12px",
          textAlign: "center",
          padding: "10px",
          wordBreak: "break-word",
        }}
      >
        {data.label}
      </div>
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0, transform: "rotate(-45deg)" }} />
    </div>
  ),
};

export const FlowchartCanvasDisplay = ({
  flowchartData,
  className,
  showControls = true,
  showGrid = true,
  interactive = true,
}: FlowchartCanvasDisplayProps) => {
  // Convert edges to solid static lines and normalize legacy handle ids (null can prevent rendering)
  const solidEdges = useMemo(
    () =>
      flowchartData.edges.map((edge) => {
        const normalized: any = {
          ...edge,
          animated: false,
          sourceHandle:
            edge.sourceHandle == null || edge.sourceHandle === "null" ? undefined : edge.sourceHandle,
          targetHandle:
            edge.targetHandle == null || edge.targetHandle === "null" ? undefined : edge.targetHandle,
          // The chart always sits on white, so the lines keep one dark ink
          // rather than the theme's text colour, which is pale in dark mode.
          style: {
            ...(edge.style || {}),
            stroke: "hsl(222 24% 12% / 0.65)",
            strokeWidth: 2,
          },
        };
        return normalized as Edge;
      }),
    [flowchartData.edges]
  );

  return (
    <div
      className={cn(
        "border rounded-lg bg-white flowchart-display h-full",
        !interactive && "flowchart-static",
        className
      )}
    >
      <style>{`
        .flowchart-display .react-flow__node {
          padding: 0 !important;
        }
        .flowchart-display .react-flow__node.selected,
        .flowchart-display .react-flow__node:focus {
          outline: none !important;
          box-shadow: none !important;
        }
        /* React Flow turns pointer events back on for nodes and panels, so a
           still chart has to switch them off all the way down. */
        .flowchart-display.flowchart-static,
        .flowchart-display.flowchart-static * {
          pointer-events: none !important;
        }
      `}</style>
      <ReactFlow
        nodes={flowchartData.nodes}
        edges={solidEdges}
        nodeTypes={nodeTypes}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnDrag={interactive}
        zoomOnScroll={interactive}
        fitView
      >
        {showGrid && <Background />}
        {showControls && <Controls showInteractive={false} />}
      </ReactFlow>
    </div>
  );
};
