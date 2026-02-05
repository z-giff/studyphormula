import { ReactFlow, Node, Edge, Background, Controls, Handle, Position } from "@xyflow/react";
import "@xyflow/react/dist/style.css";

interface FlowchartCanvasDisplayProps {
  flowchartData: { nodes: Node[]; edges: Edge[] };
  className?: string;
  showControls?: boolean;
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
        <img src={data.image} alt="" style={{ width: "100%", maxHeight: "60px", objectFit: "cover", marginBottom: "8px", borderRadius: "4px" }} />
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
        <img src={data.image} alt="" style={{ width: "100%", maxHeight: "60px", objectFit: "cover", marginBottom: "8px", borderRadius: "4px" }} />
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
        <img src={data.image} alt="" style={{ width: "100%", maxHeight: "60px", objectFit: "cover", marginBottom: "8px", borderRadius: "4px" }} />
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
        <img src={data.image} alt="" style={{ width: "60px", height: "60px", objectFit: "cover", marginBottom: "4px", borderRadius: "50%" }} />
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

export const FlowchartCanvasDisplay = ({ flowchartData, className, showControls = true }: FlowchartCanvasDisplayProps) => {
  // Convert edges to solid static lines and normalize legacy handle ids (null can prevent rendering)
  const solidEdges = flowchartData.edges.map((edge) => {
    const normalized: any = {
      ...edge,
      animated: false,
      sourceHandle: edge.sourceHandle == null || edge.sourceHandle === "null" ? undefined : edge.sourceHandle,
      targetHandle: edge.targetHandle == null || edge.targetHandle === "null" ? undefined : edge.targetHandle,
      style: {
        ...(edge.style || {}),
        stroke: "hsl(var(--foreground) / 0.65)",
        strokeWidth: 2,
      },
    };

    return normalized as Edge;
  });

  return (
    <div className={`border rounded-lg bg-white flowchart-display h-full ${className || ""}`}>
      <style>{`
        .flowchart-display .react-flow__node {
          padding: 0 !important;
        }
        .flowchart-display .react-flow__node.selected,
        .flowchart-display .react-flow__node:focus {
          outline: none !important;
          box-shadow: none !important;
        }
      `}</style>
      <ReactFlow
        nodes={flowchartData.nodes}
        edges={solidEdges}
        nodeTypes={nodeTypes}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnDrag={true}
        zoomOnScroll={true}
        fitView
      >
        <Background />
        {showControls && <Controls showInteractive={false} />}
      </ReactFlow>
    </div>
  );
};
