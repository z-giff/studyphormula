import { useEffect, useMemo, useRef, useState } from "react";
import Moveable from "react-moveable";
import { ArrowDown, ArrowUp, Clipboard, Copy, Link, RotateCw, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { resolveStandardImageSource, uploadStandardCardImage, type StandardCardImage, type StandardCardLayout, type StandardCardSide } from "@/lib/standardCardLayout";

interface Props { term: string; definition: string; color: string; layout: StandardCardLayout; onChange: (layout: StandardCardLayout) => void; disabled?: boolean }
const makeImage = (src: string, index: number): StandardCardImage => ({ id: crypto.randomUUID(), src, x: 25 + (index % 4) * 3, y: 22 + (index % 4) * 3, width: 42, height: 42, rotation: 0, fit: "contain", textFlow: "overlap", zIndex: index });

export const StandardCardImageEditor = ({ term, definition, color, layout, onChange, disabled }: Props) => {
  const [side, setSide] = useState<StandardCardSide>("front");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [resolved, setResolved] = useState<Record<string, string>>({});
  const [url, setUrl] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const images = layout[side];
  const selected = images.find((image) => image.id === selectedId) || null;
  const target = selectedId ? document.querySelector(`[data-standard-image="${selectedId}"]`) as HTMLElement | null : null;

  useEffect(() => {
    let active = true;
    Promise.all([...layout.front, ...layout.back].map(async (image) => [image.id, await resolveStandardImageSource(image.src)] as const))
      .then((entries) => active && setResolved(Object.fromEntries(entries))).catch(() => undefined);
    return () => { active = false; };
  }, [layout]);

  const updateSide = (next: StandardCardImage[]) => onChange({ ...layout, [side]: next });
  const updateSelected = (patch: Partial<StandardCardImage>) => selected && updateSide(images.map((image) => image.id === selected.id ? { ...image, ...patch } : image));
  const addSources = (sources: string[]) => updateSide([...images, ...sources.map((src, index) => makeImage(src, images.length + index))]);
  const addUrl = async () => {
    const candidate = url.trim();
    try {
      await new Promise<void>((resolve, reject) => { const image = new Image(); image.onload = () => resolve(); image.onerror = reject; image.src = candidate; });
      addSources([candidate]); setUrl("");
    } catch { toast.error("That URL does not point to a loadable image"); }
  };
  const addFiles = async (files: File[]) => {
    if (!files.length || disabled) return;
    setIsAdding(true);
    try { addSources(await Promise.all(files.map(uploadStandardCardImage))); toast.success(`${files.length} picture${files.length === 1 ? "" : "s"} added`); }
    catch (error: any) { toast.error(error.message || "Could not add picture"); }
    finally { setIsAdding(false); }
  };
  const text = side === "front" ? term : definition;
  const avoid = images.filter((image) => image.textFlow === "avoid");
  const textStyle = avoid.length ? (() => {
    const top = Math.min(...avoid.map((image) => image.y));
    const bottom = 100 - Math.max(...avoid.map((image) => image.y + image.height));
    return top >= bottom ? { left:"6%", right:"6%", top:"5%", height:`${Math.max(18,top-8)}%` } : { left:"6%", right:"6%", bottom:"5%", height:`${Math.max(18,bottom-8)}%` };
  })() : { inset:"8%" };
  const textColor = useMemo(() => {
    const hex = color.replace("#", ""); const r = parseInt(hex.slice(0,2),16), g = parseInt(hex.slice(2,4),16), b = parseInt(hex.slice(4,6),16);
    return (r*299+g*587+b*114)/1000 > 145 ? "#111827" : "#ffffff";
  }, [color]);

  return <div className="space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <Tabs value={side} onValueChange={(value) => { setSide(value as StandardCardSide); setSelectedId(null); }}><TabsList><TabsTrigger value="front">Front</TabsTrigger><TabsTrigger value="back">Back</TabsTrigger></TabsList></Tabs>
      <div className="flex gap-2">
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(event) => void addFiles(Array.from(event.target.files || []))} />
        <Button type="button" size="sm" variant="outline" onClick={() => fileRef.current?.click()} disabled={disabled || isAdding}><Upload className="mr-2 h-4 w-4" />Add pictures</Button>
        <Button type="button" size="icon" variant="outline" aria-label="Paste picture" onClick={async () => { try { const items = await navigator.clipboard.read(); const files: File[] = []; for (const item of items) { const type = item.types.find((value) => value.startsWith("image/")); if (type) files.push(new File([await item.getType(type)], `pasted.${type.split("/")[1]}`, { type })); } await addFiles(files); } catch { toast.error("Copy an image, then try Paste again"); } }}><Clipboard className="h-4 w-4" /></Button>
      </div>
    </div>
    <div className="flex gap-2"><Input type="url" value={url} onChange={(event) => setUrl(event.target.value)} maxLength={4096} aria-label="Picture URL" placeholder="https://example.com/image.jpg" /><Button type="button" variant="secondary" disabled={!/^https?:\/\//i.test(url)} onClick={() => void addUrl()}><Link className="mr-2 h-4 w-4" />Add URL</Button></div>
    <div ref={canvasRef} className="relative aspect-[1.75] w-full overflow-hidden rounded-lg border-2 border-border" style={{ backgroundColor: color }} onPointerDown={(event) => { if (event.target === event.currentTarget) setSelectedId(null); }} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); void addFiles(Array.from(event.dataTransfer.files)); }}>
      <div className="pointer-events-none absolute z-[500] flex items-center justify-center overflow-hidden p-4 text-center text-2xl font-bold" style={{ ...textStyle, color: textColor }}>{text}</div>
      {images.map((image) => <img key={image.id} data-standard-image={image.id} src={resolved[image.id] || ""} alt="" draggable={false} tabIndex={0} onClick={(event) => { event.stopPropagation(); setSelectedId(image.id); }} onKeyDown={(event) => { const step=event.shiftKey?5:1; if(event.key.startsWith("Arrow")){event.preventDefault(); updateSelected({x:image.x+(event.key==="ArrowRight"?step:event.key==="ArrowLeft"?-step:0),y:image.y+(event.key==="ArrowDown"?step:event.key==="ArrowUp"?-step:0)});}}} className={cn("absolute cursor-move outline-none", selectedId === image.id && "ring-2 ring-primary ring-offset-2")} style={{ left:`${image.x}%`,top:`${image.y}%`,width:`${image.width}%`,height:`${image.height}%`,objectFit:image.fit,transform:`rotate(${image.rotation}deg)`,zIndex:(image.textFlow === "overlap" ? 1000 : 1)+image.zIndex }} />)}
      {selected && <div className="absolute left-2 top-2 z-[100] flex flex-wrap gap-1 rounded-md border bg-popover p-1 shadow-lg">
        <Button type="button" size="sm" variant={selected.textFlow === "overlap" ? "secondary" : "ghost"} onClick={() => updateSelected({ textFlow:"overlap" })}>Overlap</Button><Button type="button" size="sm" variant={selected.textFlow === "avoid" ? "secondary" : "ghost"} onClick={() => updateSelected({ textFlow:"avoid" })}>Avoid text</Button>
        <Button type="button" size="icon" variant="ghost" aria-label="Toggle crop" onClick={() => updateSelected({ fit:selected.fit === "contain" ? "cover" : "contain" })}><RotateCw className="h-4 w-4" /></Button>
        <Button type="button" size="icon" variant="ghost" aria-label="Duplicate picture" onClick={() => { const copy={...selected,id:crypto.randomUUID(),x:Math.min(95,selected.x+3),y:Math.min(95,selected.y+3),zIndex:selected.zIndex+1}; updateSide([...images,copy]); setSelectedId(copy.id); }}><Copy className="h-4 w-4" /></Button>
        <Button type="button" size="icon" variant="ghost" aria-label="Move backward" onClick={() => updateSelected({ zIndex:Math.max(0,selected.zIndex-1) })}><ArrowDown className="h-4 w-4" /></Button><Button type="button" size="icon" variant="ghost" aria-label="Move forward" onClick={() => updateSelected({ zIndex:selected.zIndex+1 })}><ArrowUp className="h-4 w-4" /></Button><Button type="button" size="icon" variant="ghost" aria-label="Remove picture" onClick={() => {updateSide(images.filter((image)=>image.id!==selected.id));setSelectedId(null);}}><Trash2 className="h-4 w-4" /></Button>
      </div>}
      {selected && target && canvasRef.current && <Moveable target={target} container={canvasRef.current} draggable resizable rotatable keepRatio={false} bounds={{left:0,top:0,right:canvasRef.current.clientWidth,bottom:canvasRef.current.clientHeight}} onDrag={({left,top})=>{const canvas=canvasRef.current;if(canvas)updateSelected({x:left/canvas.clientWidth*100,y:top/canvas.clientHeight*100});}} onResize={({width,height,drag})=>{const canvas=canvasRef.current;if(canvas)updateSelected({width:width/canvas.clientWidth*100,height:height/canvas.clientHeight*100,x:drag.left/canvas.clientWidth*100,y:drag.top/canvas.clientHeight*100});}} onRotate={({rotation})=>updateSelected({rotation})} />}
    </div>
  </div>;
};
