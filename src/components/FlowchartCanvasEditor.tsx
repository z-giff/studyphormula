import { useCallback, useState } from "react";
import {
  ReactFlow,
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  MiniMap,
  Panel,
  Handle,
  Position,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface FlowchartCanvasEditorProps {
  flowchartData: { nodes: Node[]; edges: Edge[] };
  onChange: (data: { nodes: Node[]; edges: Edge[] }) => void;
}

const TEMPLATES = {
  blank: { nodes: [], edges: [] },
  basic: {
    nodes: [
      { id: "1", type: "input", data: { label: "Start", color: "#22c55e" }, position: { x: 250, y: 0 } },
      { id: "2", data: { label: "Process", color: "#3b82f6" }, position: { x: 250, y: 100 } },
      { id: "3", type: "output", data: { label: "End", color: "#ef4444" }, position: { x: 250, y: 200 } },
    ],
    edges: [
      { id: "e1-2", source: "1", target: "2", animated: true },
      { id: "e2-3", source: "2", target: "3", animated: true },
    ],
  },
  decision: {
    nodes: [
      { id: "1", type: "input", data: { label: "Start", color: "#22c55e" }, position: { x: 250, y: 0 } },
      { id: "2", data: { label: "Decision?", color: "#f59e0b", shape: "diamond" }, position: { x: 250, y: 100 } },
      { id: "3", data: { label: "Yes Path", color: "#3b82f6" }, position: { x: 100, y: 200 } },
      { id: "4", data: { label: "No Path", color: "#3b82f6" }, position: { x: 400, y: 200 } },
      { id: "5", type: "output", data: { label: "End", color: "#ef4444" }, position: { x: 250, y: 300 } },
    ],
    edges: [
      { id: "e1-2", source: "1", target: "2", animated: true },
      { id: "e2-3", source: "2", target: "3", label: "Yes" },
      { id: "e2-4", source: "2", target: "4", label: "No" },
      { id: "e3-5", source: "3", target: "5" },
      { id: "e4-5", source: "4", target: "5" },
    ],
  },
};

const createNodeTypes = (onHandleDoubleClick: (nodeId: string, handleType: 'source' | 'target') => void) => ({
  default: ({ id, data }: { id: string; data: any }) => (
    <>
      <Handle 
        type="target" 
        position={Position.Top} 
        style={{ background: "#555", cursor: "pointer" }} 
        onDoubleClick={(e) => { e.stopPropagation(); onHandleDoubleClick(id, 'target'); }}
        title="Double-click to disconnect"
      />
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
      <Handle 
        type="source" 
        position={Position.Bottom} 
        style={{ background: "#555", cursor: "pointer" }} 
        onDoubleClick={(e) => { e.stopPropagation(); onHandleDoubleClick(id, 'source'); }}
        title="Double-click to disconnect"
      />
    </>
  ),
  circle: ({ id, data }: { id: string; data: any }) => (
    <>
      <Handle 
        type="target" 
        position={Position.Top} 
        style={{ background: "#555", cursor: "pointer" }} 
        onDoubleClick={(e) => { e.stopPropagation(); onHandleDoubleClick(id, 'target'); }}
        title="Double-click to disconnect"
      />
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
      <Handle 
        type="source" 
        position={Position.Bottom} 
        style={{ background: "#555", cursor: "pointer" }} 
        onDoubleClick={(e) => { e.stopPropagation(); onHandleDoubleClick(id, 'source'); }}
        title="Double-click to disconnect"
      />
    </>
  ),
  diamond: ({ id, data }: { id: string; data: any }) => (
    <>
      <Handle 
        type="target" 
        position={Position.Top} 
        style={{ background: "#555", top: "-5px", cursor: "pointer" }} 
        onDoubleClick={(e) => { e.stopPropagation(); onHandleDoubleClick(id, 'target'); }}
        title="Double-click to disconnect"
      />
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
      <Handle 
        type="source" 
        position={Position.Bottom} 
        style={{ background: "#555", bottom: "-5px", cursor: "pointer" }} 
        onDoubleClick={(e) => { e.stopPropagation(); onHandleDoubleClick(id, 'source'); }}
        title="Double-click to disconnect"
      />
    </>
  ),
});

export const FlowchartCanvasEditor = ({ flowchartData, onChange }: FlowchartCanvasEditorProps) => {
  const { toast } = useToast();
  const [nodes, setNodes, onNodesChange] = useNodesState(flowchartData.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(flowchartData.edges);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [nodeLabel, setNodeLabel] = useState("");
  const [nodeColor, setNodeColor] = useState("#3b82f6");
  const [nodeImage, setNodeImage] = useState("");
  const [lastNodeId, setLastNodeId] = useState<string | null>(
    flowchartData.nodes.length > 0 ? flowchartData.nodes[flowchartData.nodes.length - 1].id : null
  );

  const handleDisconnect = useCallback(
    (nodeId: string, handleType: 'source' | 'target') => {
      const newEdges = edges.filter((edge) => {
        if (handleType === 'source') {
          return edge.source !== nodeId;
        } else {
          return edge.target !== nodeId;
        }
      });
      setEdges(newEdges);
      onChange({ nodes, edges: newEdges });
      toast({ title: "Connection removed" });
    },
    [edges, nodes, onChange, setEdges, toast]
  );

  const nodeTypes = createNodeTypes(handleDisconnect);

  const onConnect = useCallback(
    (params: Connection) => {
      const newEdges = addEdge({ ...params, animated: true }, edges);
      setEdges(newEdges);
      onChange({ nodes, edges: newEdges });
    },
    [edges, nodes, onChange, setEdges]
  );

  const handleNodesChange = useCallback(
    (changes: any) => {
      onNodesChange(changes);
      setTimeout(() => {
        setNodes((nds) => {
          onChange({ nodes: nds, edges });
          return nds;
        });
      }, 0);
    },
    [onNodesChange, setNodes, edges, onChange]
  );

  const addNode = (shape: string = "default") => {
    const newId = `${Date.now()}`;
    const lastNode = nodes.length > 0 ? nodes[nodes.length - 1] : null;
    
    const newNode: Node = {
      id: newId,
      type: shape,
      data: { label: "New Node", color: shape === "diamond" ? "#f59e0b" : "#3b82f6" },
      position: { 
        x: lastNode ? lastNode.position.x : 150, 
        y: lastNode ? lastNode.position.y + 150 : 50 
      },
    };
    
    const newNodes = [...nodes, newNode];
    let newEdges = edges;
    
    // Auto-connect to the last node if one exists
    if (lastNodeId && nodes.length > 0) {
      const autoEdge: Edge = {
        id: `e${lastNodeId}-${newId}`,
        source: lastNodeId,
        target: newId,
        animated: true,
      };
      newEdges = [...edges, autoEdge];
      setEdges(newEdges);
    }
    
    setNodes(newNodes);
    setLastNodeId(newId);
    onChange({ nodes: newNodes, edges: newEdges });
    toast({ title: "Node added & connected", description: "Double-click handles to disconnect" });
  };

  const updateSelectedNode = () => {
    if (!selectedNode) return;
    const newNodes = nodes.map((node) =>
      node.id === selectedNode
        ? { ...node, data: { ...node.data, label: nodeLabel, color: nodeColor, image: nodeImage } }
        : node
    );
    setNodes(newNodes);
    onChange({ nodes: newNodes, edges });
    toast({ title: "Node updated" });
  };

  const deleteSelectedNode = () => {
    if (!selectedNode) return;
    const newNodes = nodes.filter((node) => node.id !== selectedNode);
    const newEdges = edges.filter((edge) => edge.source !== selectedNode && edge.target !== selectedNode);
    setNodes(newNodes);
    setEdges(newEdges);
    onChange({ nodes: newNodes, edges: newEdges });
    setSelectedNode(null);
    toast({ title: "Node deleted" });
  };

  const loadTemplate = (template: keyof typeof TEMPLATES) => {
    const templateData = TEMPLATES[template];
    setNodes(templateData.nodes);
    setEdges(templateData.edges);
    onChange(templateData);
    toast({ title: "Template loaded" });
  };

  const onNodeClick = useCallback((_: any, node: Node) => {
    setSelectedNode(node.id);
    setNodeLabel(String(node.data.label || ""));
    setNodeColor(String(node.data.color || "#3b82f6"));
    setNodeImage(String(node.data.image || ""));
  }, []);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Template</Label>
          <Select onValueChange={(value) => loadTemplate(value as keyof typeof TEMPLATES)}>
            <SelectTrigger>
              <SelectValue placeholder="Choose template" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="blank">Blank Canvas</SelectItem>
              <SelectItem value="basic">Basic Flow</SelectItem>
              <SelectItem value="decision">Decision Tree</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Add Shape</Label>
          <div className="grid grid-cols-3 gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => addNode("default")}>
              <Plus className="w-4 h-4 mr-1" /> Box
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => addNode("circle")}>
              <Plus className="w-4 h-4 mr-1" /> Circle
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => addNode("diamond")}>
              <Plus className="w-4 h-4 mr-1" /> Diamond
            </Button>
          </div>
        </div>
      </div>

      {selectedNode && (
        <div className="border rounded-lg p-4 space-y-3 bg-muted/50">
          <div className="flex items-center justify-between">
            <Label className="text-base font-semibold">Edit Selected Node</Label>
            <Button type="button" variant="destructive" size="sm" onClick={deleteSelectedNode}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
          <div>
            <Label htmlFor="node-label">Text</Label>
            <Textarea
              id="node-label"
              value={nodeLabel}
              onChange={(e) => setNodeLabel(e.target.value)}
              placeholder="Enter text"
              rows={2}
            />
          </div>
          <div>
            <Label htmlFor="node-color">Color</Label>
            <Input
              id="node-color"
              type="color"
              value={nodeColor}
              onChange={(e) => setNodeColor(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="node-image">Image URL (optional)</Label>
            <Input
              id="node-image"
              type="text"
              value={nodeImage}
              onChange={(e) => setNodeImage(e.target.value)}
              placeholder="https://example.com/image.jpg"
            />
          </div>
          <Button type="button" onClick={updateSelectedNode} className="w-full">
            Update Node
          </Button>
        </div>
      )}

      <div className="border rounded-lg bg-background" style={{ height: "500px" }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={handleNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          fitView
        >
          <Background />
          <Controls />
          <MiniMap />
          <Panel position="top-left">
            <div className="bg-background/90 backdrop-blur-sm p-2 rounded-lg text-xs text-muted-foreground">
              Click nodes to edit • Drag from handles to connect • Scroll to zoom
            </div>
          </Panel>
        </ReactFlow>
      </div>
    </div>
  );
};
