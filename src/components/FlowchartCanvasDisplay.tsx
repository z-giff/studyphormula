import { ReactFlow, Node, Edge, Background, Controls, Handle, Position } from "@xyflow/react";
import "@xyflow/react/dist/style.css";

interface FlowchartCanvasDisplayProps {
  flowchartData: { nodes: Node[]; edges: Edge[] };
}

const nodeTypes = {
  default: ({ data }: { data: any }) => (
    <div
      style={{
        padding: "10px 20px",
        borderRadius: "8px",
        background: data.color || "#3b82f6",
        color: "white",
        border: "2px solid #1e293b",
        minWidth: "120px",
        textAlign: "center",
      }}
    >
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
        border: "2px solid #1e293b",
        width: "120px",
        height: "120px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
      }}
    >
      {data.image && (
        <img src={data.image} alt="" style={{ width: "60px", height: "60px", objectFit: "cover", marginBottom: "4px", borderRadius: "50%" }} />
      )}
      <div style={{ fontWeight: 500, fontSize: "12px", wordBreak: "break-word" }}>{data.label}</div>
    </div>
  ),
  diamond: ({ data }: { data: any }) => (
    <div
      style={{
        width: "120px",
        height: "120px",
        background: data.color || "#f59e0b",
        border: "2px solid #1e293b",
        transform: "rotate(45deg)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
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
    </div>
  ),
};

export const FlowchartCanvasDisplay = ({ flowchartData }: FlowchartCanvasDisplayProps) => {
  return (
    <div className="border rounded-lg bg-background" style={{ height: "500px" }}>
      <ReactFlow
        nodes={flowchartData.nodes}
        edges={flowchartData.edges}
        nodeTypes={nodeTypes}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        fitView
      >
        <Background />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
};
