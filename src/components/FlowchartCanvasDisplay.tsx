import { ReactFlow, Node, Edge, Background, Controls } from "@xyflow/react";
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
