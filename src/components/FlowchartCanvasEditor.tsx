import { useCallback, useState, useEffect, useRef } from "react";
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
  Panel,
  Handle,
  Position,
  useReactFlow,
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Pipette } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface FlowchartCanvasEditorProps {
  flowchartData: { nodes: Node[]; edges: Edge[] };
  onChange: (data: { nodes: Node[]; edges: Edge[] }) => void;
}

const DEFAULT_COLORS = ["#3b82f6", "#22c55e", "#ef4444"];

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

interface FloatingColorPickerProps {
  nodes: Node[];
  nodeId: string;
  currentColor: string;
  onColorChange: (color: string) => void;
  onDelete: () => void;
}

const FloatingColorPicker = ({ nodes, nodeId, currentColor, onColorChange, onDelete }: FloatingColorPickerProps) => {
  const { getViewport } = useReactFlow();
  const node = nodes.find(n => n.id === nodeId);
  const [customColor, setCustomColor] = useState(currentColor);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const viewport = getViewport();

  useEffect(() => {
    setCustomColor(currentColor);
  }, [currentColor]);

  if (!node) return null;

  // Calculate the node width based on type
  const nodeWidth = node.type === "circle" ? 120 : node.type === "diamond" ? 120 : 140;
  const nodeHeight = node.type === "circle" ? 120 : node.type === "diamond" ? 80 : 60;
  
  // Transform node position to screen position accounting for viewport
  // Position picker to the right of the node, outside the shape
  const screenX = (node.position.x + nodeWidth) * viewport.zoom + viewport.x + 12;
  const screenY = node.position.y * viewport.zoom + viewport.y + (nodeHeight * viewport.zoom) / 2 - (60 * viewport.zoom);

  // Scale the picker proportionally with zoom (clamped for usability)
  const pickerScale = Math.max(0.5, Math.min(1.2, viewport.zoom));

  return (
    <div
      className="absolute z-50 flex flex-col items-center gap-1 bg-background/95 backdrop-blur-sm rounded-lg p-1.5 shadow-lg border animate-scale-in origin-left"
      style={{
        left: screenX,
        top: screenY,
        transform: `scale(${pickerScale})`,
        pointerEvents: "auto",
      }}
    >
      {DEFAULT_COLORS.map((color) => (
        <button
          key={color}
          onClick={() => onColorChange(color)}
          className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 ${
            currentColor === color ? "border-foreground ring-2 ring-foreground/20" : "border-transparent"
          }`}
          style={{ backgroundColor: color }}
          title={`Select ${color}`}
        />
      ))}
      <Popover open={isPickerOpen} onOpenChange={setIsPickerOpen}>
        <PopoverTrigger asChild>
          <button
            className="w-7 h-7 rounded-full border-2 border-dashed border-muted-foreground/50 flex items-center justify-center hover:border-foreground hover:bg-muted/50 transition-all"
            title="Custom color"
          >
            <Plus className="w-4 h-4 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-3" side="right">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Pipette className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Custom Color</span>
            </div>
            <input
              type="color"
              value={customColor}
              onChange={(e) => {
                setCustomColor(e.target.value);
                onColorChange(e.target.value);
              }}
              className="w-full h-10 rounded cursor-pointer border-0"
              style={{ WebkitAppearance: "none" }}
            />
            <p className="text-xs text-muted-foreground">Click to open color picker</p>
          </div>
        </PopoverContent>
      </Popover>
      <div className="w-px h-5 bg-border mx-1" />
      <button
        onClick={onDelete}
        className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-destructive/10 text-destructive transition-colors"
        title="Delete node"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
};

interface EditableNodeProps {
  id: string;
  data: any;
  isEditing: boolean;
  onStartEdit: () => void;
  onFinishEdit: (newLabel: string) => void;
  onHandleDoubleClick: (nodeId: string, handleType: 'source' | 'target') => void;
}

const EditableBoxNode = ({ id, data, isEditing, onStartEdit, onFinishEdit, onHandleDoubleClick }: EditableNodeProps) => {
  const [editValue, setEditValue] = useState(data.label);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    setEditValue(data.label);
  }, [data.label]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      onFinishEdit(editValue);
    } else if (e.key === "Escape") {
      setEditValue(data.label);
      onFinishEdit(data.label);
    }
  };

  return (
    <div className="group" style={{ background: "transparent" }}>
      <Handle 
        type="target" 
        position={Position.Top} 
        style={{ background: "#555", cursor: "pointer" }} 
        onDoubleClick={(e) => { e.stopPropagation(); onHandleDoubleClick(id, 'target'); }}
        title="Double-click to disconnect"
      />
      <div
        className="transition-all duration-200 ease-out group-hover:scale-105 group-hover:-translate-y-1"
        style={{
          padding: "12px 24px",
          borderRadius: "12px",
          background: data.color || "#3b82f6",
          color: "white",
          minWidth: "120px",
          textAlign: "center",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
        }}
        onDoubleClick={(e) => { e.stopPropagation(); onStartEdit(); }}
      >
        {isEditing ? (
          <input
            ref={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={() => onFinishEdit(editValue)}
            onKeyDown={handleKeyDown}
            style={{
              background: "transparent",
              border: "none",
              outline: "none",
              color: "white",
              fontWeight: 500,
              textAlign: "center",
              width: "100%",
              minWidth: "80px",
            }}
          />
        ) : (
          <div style={{ fontWeight: 500, cursor: "text" }}>{data.label}</div>
        )}
      </div>
      <Handle 
        type="source" 
        position={Position.Bottom} 
        style={{ background: "#555", cursor: "pointer" }} 
        onDoubleClick={(e) => { e.stopPropagation(); onHandleDoubleClick(id, 'source'); }}
        title="Double-click to disconnect"
      />
    </div>
  );
};

const EditableCircleNode = ({ id, data, isEditing, onStartEdit, onFinishEdit, onHandleDoubleClick }: EditableNodeProps) => {
  const [editValue, setEditValue] = useState(data.label);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    setEditValue(data.label);
  }, [data.label]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      onFinishEdit(editValue);
    } else if (e.key === "Escape") {
      setEditValue(data.label);
      onFinishEdit(data.label);
    }
  };

  return (
    <div className="group" style={{ background: "transparent" }}>
      <Handle 
        type="target" 
        position={Position.Top} 
        style={{ background: "#555", cursor: "pointer" }} 
        onDoubleClick={(e) => { e.stopPropagation(); onHandleDoubleClick(id, 'target'); }}
        title="Double-click to disconnect"
      />
      <div
        className="transition-all duration-200 ease-out group-hover:scale-105 group-hover:-translate-y-1"
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
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
        }}
        onDoubleClick={(e) => { e.stopPropagation(); onStartEdit(); }}
      >
        {isEditing ? (
          <input
            ref={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={() => onFinishEdit(editValue)}
            onKeyDown={handleKeyDown}
            style={{
              background: "transparent",
              border: "none",
              outline: "none",
              color: "white",
              fontWeight: 500,
              fontSize: "12px",
              textAlign: "center",
              width: "80px",
            }}
          />
        ) : (
          <div style={{ fontWeight: 500, fontSize: "12px", wordBreak: "break-word", cursor: "text" }}>{data.label}</div>
        )}
      </div>
      <Handle 
        type="source" 
        position={Position.Bottom} 
        style={{ background: "#555", cursor: "pointer" }} 
        onDoubleClick={(e) => { e.stopPropagation(); onHandleDoubleClick(id, 'source'); }}
        title="Double-click to disconnect"
      />
    </div>
  );
};

const EditableDiamondNode = ({ id, data, isEditing, onStartEdit, onFinishEdit, onHandleDoubleClick }: EditableNodeProps) => {
  const [editValue, setEditValue] = useState(data.label);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    setEditValue(data.label);
  }, [data.label]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      onFinishEdit(editValue);
    } else if (e.key === "Escape") {
      setEditValue(data.label);
      onFinishEdit(data.label);
    }
  };

  return (
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
        onDoubleClick={(e) => { e.stopPropagation(); onStartEdit(); }}
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
          {isEditing ? (
            <input
              ref={inputRef}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={() => onFinishEdit(editValue)}
              onKeyDown={handleKeyDown}
              style={{
                background: "transparent",
                border: "none",
                outline: "none",
                color: "white",
                fontWeight: 500,
                fontSize: "12px",
                textAlign: "center",
                width: "60px",
              }}
            />
          ) : (
            <span style={{ cursor: "text" }}>{data.label}</span>
          )}
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
  );
};

const createNodeTypes = (
  onHandleDoubleClick: (nodeId: string, handleType: 'source' | 'target') => void,
  editingNodeId: string | null,
  onStartEdit: (nodeId: string) => void,
  onFinishEdit: (nodeId: string, newLabel: string) => void
) => ({
  default: ({ id, data }: { id: string; data: any }) => (
    <EditableBoxNode
      id={id}
      data={data}
      isEditing={editingNodeId === id}
      onStartEdit={() => onStartEdit(id)}
      onFinishEdit={(newLabel) => onFinishEdit(id, newLabel)}
      onHandleDoubleClick={onHandleDoubleClick}
    />
  ),
  circle: ({ id, data }: { id: string; data: any }) => (
    <EditableCircleNode
      id={id}
      data={data}
      isEditing={editingNodeId === id}
      onStartEdit={() => onStartEdit(id)}
      onFinishEdit={(newLabel) => onFinishEdit(id, newLabel)}
      onHandleDoubleClick={onHandleDoubleClick}
    />
  ),
  diamond: ({ id, data }: { id: string; data: any }) => (
    <EditableDiamondNode
      id={id}
      data={data}
      isEditing={editingNodeId === id}
      onStartEdit={() => onStartEdit(id)}
      onFinishEdit={(newLabel) => onFinishEdit(id, newLabel)}
      onHandleDoubleClick={onHandleDoubleClick}
    />
  ),
});

const FlowchartCanvasEditorInner = ({ flowchartData, onChange }: FlowchartCanvasEditorProps) => {
  const { toast } = useToast();
  const [nodes, setNodes, onNodesChange] = useNodesState(flowchartData.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(flowchartData.edges);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [nodeColor, setNodeColor] = useState("#3b82f6");
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  
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

  const handleStartEdit = useCallback((nodeId: string) => {
    setEditingNodeId(nodeId);
  }, []);

  const handleFinishEdit = useCallback((nodeId: string, newLabel: string) => {
    setEditingNodeId(null);
    const newNodes = nodes.map((node) =>
      node.id === nodeId
        ? { ...node, data: { ...node.data, label: newLabel } }
        : node
    );
    setNodes(newNodes);
    onChange({ nodes: newNodes, edges });
  }, [nodes, edges, setNodes, onChange]);

  const nodeTypes = createNodeTypes(handleDisconnect, editingNodeId, handleStartEdit, handleFinishEdit);

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

  const updateSelectedNodeColor = useCallback((color: string) => {
    if (!selectedNode) return;
    setNodeColor(color);
    const newNodes = nodes.map((node) =>
      node.id === selectedNode
        ? { ...node, data: { ...node.data, color } }
        : node
    );
    setNodes(newNodes);
    onChange({ nodes: newNodes, edges });
  }, [selectedNode, nodes, edges, setNodes, onChange]);

  const deleteSelectedNode = useCallback(() => {
    if (!selectedNode) return;
    const newNodes = nodes.filter((node) => node.id !== selectedNode);
    const newEdges = edges.filter((edge) => edge.source !== selectedNode && edge.target !== selectedNode);
    setNodes(newNodes);
    setEdges(newEdges);
    onChange({ nodes: newNodes, edges: newEdges });
    setSelectedNode(null);
    toast({ title: "Node deleted" });
  }, [selectedNode, nodes, edges, setNodes, setEdges, onChange, toast]);

  const loadTemplate = (template: keyof typeof TEMPLATES) => {
    const templateData = TEMPLATES[template];
    setNodes(templateData.nodes);
    setEdges(templateData.edges);
    onChange(templateData);
    toast({ title: "Template loaded" });
  };

  const onNodeClick = useCallback((_: any, node: Node) => {
    setSelectedNode(node.id);
    setNodeColor(String(node.data.color || "#3b82f6"));
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  return (
    <div className="space-y-4">
      <div className="sticky top-0 z-10 bg-background pb-2">
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
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => addNode("default")}>
                <Plus className="w-4 h-4 mr-1" /> Box
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => addNode("circle")}>
                <Plus className="w-4 h-4 mr-1" /> Circle
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="border rounded-lg bg-background relative flowchart-editor" style={{ height: "500px" }}>
        <style>{`
          .flowchart-editor .react-flow__node {
            padding: 0 !important;
          }
          .flowchart-editor .react-flow__node.selected {
            outline: none !important;
            box-shadow: none !important;
          }
          .flowchart-editor .react-flow__node:focus {
            outline: none !important;
          }
        `}</style>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={handleNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          nodeTypes={nodeTypes}
          fitView
          nodesDraggable
          selectNodesOnDrag={false}
        >
          <Background />
          <Controls />
          <Panel position="top-left">
            <div className="bg-background/90 backdrop-blur-sm p-2 rounded-lg text-xs text-muted-foreground">
              Double-click text to edit • Drag handles to connect • Scroll to zoom
            </div>
          </Panel>
          {selectedNode && (
            <FloatingColorPicker
              nodes={nodes}
              nodeId={selectedNode}
              currentColor={nodeColor}
              onColorChange={updateSelectedNodeColor}
              onDelete={deleteSelectedNode}
            />
          )}
        </ReactFlow>
      </div>
    </div>
  );
};

export const FlowchartCanvasEditor = (props: FlowchartCanvasEditorProps) => {
  return (
    <ReactFlowProvider>
      <FlowchartCanvasEditorInner {...props} />
    </ReactFlowProvider>
  );
};