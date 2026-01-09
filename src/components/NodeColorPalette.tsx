import { useState } from "react";
import { Plus, Pipette } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface NodeColorPaletteProps {
  currentColor: string;
  onColorChange: (color: string) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

// Full color palette matching the reference design - 10 columns x 7 rows
const PRESET_COLORS = [
  // Row 1: Grayscale
  ["#000000", "#434343", "#666666", "#999999", "#b7b7b7", "#cccccc", "#d9d9d9", "#efefef", "#f3f3f3", "#ffffff"],
  // Row 2: Vivid colors
  ["#4a1c00", "#ff0000", "#ff9900", "#ffff00", "#00ff00", "#00ffff", "#4a86e8", "#0000ff", "#9900ff", "#ff00ff"],
  // Row 3: Light pastels
  ["#e6b8af", "#f4cccc", "#fce5cd", "#fff2cc", "#d9ead3", "#d0e0e3", "#c9daf8", "#cfe2f3", "#d9d2e9", "#ead1dc"],
  // Row 4: Soft pastels
  ["#dd7e6b", "#ea9999", "#f9cb9c", "#ffe599", "#b6d7a8", "#a2c4c9", "#a4c2f4", "#9fc5e8", "#b4a7d6", "#d5a6bd"],
  // Row 5: Medium tones
  ["#cc4125", "#e06666", "#f6b26b", "#ffd966", "#93c47d", "#76a5af", "#6d9eeb", "#6fa8dc", "#8e7cc3", "#c27ba0"],
  // Row 6: Rich colors
  ["#a61c00", "#cc0000", "#e69138", "#f1c232", "#6aa84f", "#45818e", "#3c78d8", "#3d85c6", "#674ea7", "#a64d79"],
  // Row 7: Dark colors
  ["#85200c", "#990000", "#b45f06", "#bf9000", "#38761d", "#134f5c", "#1155cc", "#0b5394", "#351c75", "#741b47"],
];

export const NodeColorPalette = ({
  currentColor,
  onColorChange,
  open,
  onOpenChange,
  children,
}: NodeColorPaletteProps) => {
  const [customColors, setCustomColors] = useState<string[]>([]);
  const [showColorWheel, setShowColorWheel] = useState(false);
  const [tempColor, setTempColor] = useState(currentColor);

  const handleColorSelect = (color: string) => {
    onColorChange(color);
  };

  const handleAddCustomColor = () => {
    setShowColorWheel(true);
  };

  const handleColorWheelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const color = e.target.value;
    setTempColor(color);
    onColorChange(color);
    
    // Add to custom colors if not already there
    if (!customColors.includes(color)) {
      setCustomColors(prev => {
        const updated = [color, ...prev];
        // Keep only the last 10 custom colors for this session
        return updated.slice(0, 10);
      });
    }
  };

  const handleColorWheelComplete = () => {
    setShowColorWheel(false);
  };

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent 
        className="w-auto p-3" 
        side="right" 
        align="start"
        sideOffset={8}
      >
        <div className="space-y-3">
          {/* Preset colors grid */}
          <div className="flex flex-col gap-1">
            {PRESET_COLORS.map((row, rowIndex) => (
              <div key={rowIndex} className="flex gap-1">
                {row.map((color) => (
                  <button
                    key={color}
                    onClick={() => handleColorSelect(color)}
                    className={`w-5 h-5 rounded-full border transition-transform hover:scale-110 flex-shrink-0 ${
                      currentColor.toLowerCase() === color.toLowerCase()
                        ? "ring-2 ring-foreground ring-offset-1 ring-offset-background"
                        : "border-border/50"
                    }`}
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
            ))}
          </div>

          {/* Custom section */}
          <div className="pt-2 border-t border-border">
            <p className="text-xs font-medium text-muted-foreground mb-2">CUSTOM</p>
            <div className="flex items-center gap-2">
              {/* Add custom color button */}
              <button
                onClick={handleAddCustomColor}
                className="w-6 h-6 rounded-full border border-dashed border-muted-foreground/50 flex items-center justify-center hover:border-foreground hover:bg-muted/50 transition-all"
                title="Add custom color"
              >
                <Plus className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
              
              {/* Eyedropper / color wheel trigger */}
              <div className="relative">
                <input
                  type="color"
                  value={tempColor}
                  onChange={handleColorWheelChange}
                  onBlur={handleColorWheelComplete}
                  className="absolute inset-0 w-6 h-6 opacity-0 cursor-pointer"
                  title="Open color picker"
                />
                <div className="w-6 h-6 rounded-full border border-muted-foreground/50 flex items-center justify-center hover:border-foreground hover:bg-muted/50 transition-all pointer-events-none">
                  <Pipette className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
              </div>

              {/* Recently used custom colors */}
              {customColors.slice(0, 6).map((color, index) => (
                <button
                  key={`${color}-${index}`}
                  onClick={() => handleColorSelect(color)}
                  className={`w-5 h-5 rounded-full border transition-transform hover:scale-110 flex-shrink-0 ${
                    currentColor.toLowerCase() === color.toLowerCase()
                      ? "ring-2 ring-foreground ring-offset-1 ring-offset-background"
                      : "border-border/50"
                  }`}
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
          </div>

          {/* Color wheel popover when adding custom color */}
          {showColorWheel && (
            <div className="pt-2 border-t border-border">
              <p className="text-xs text-muted-foreground mb-2">Select custom color</p>
              <input
                type="color"
                value={tempColor}
                onChange={handleColorWheelChange}
                onBlur={handleColorWheelComplete}
                className="w-full h-10 rounded cursor-pointer border-0"
                autoFocus
              />
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
