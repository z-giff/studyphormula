import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Settings, Sun, Moon, Monitor, BookOpen, Shuffle } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface PreferencesSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface StudyPrefs {
  autoFlip: boolean;
  flipTime: string;
  shuffleCards: boolean;
  showProgress: boolean;
  cardAnimation: string;
}

const defaultStudyPrefs: StudyPrefs = {
  autoFlip: false,
  flipTime: "5",
  shuffleCards: false,
  showProgress: true,
  cardAnimation: "flip",
};

export const PreferencesSettings = ({
  open,
  onOpenChange,
}: PreferencesSettingsProps) => {
  const { theme, setTheme } = useTheme();
  const [studyPrefs, setStudyPrefs] = useState<StudyPrefs>(defaultStudyPrefs);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("studyPrefs");
    if (saved) {
      setStudyPrefs(JSON.parse(saved));
    }
  }, [open]);

  const handleStudyPrefChange = (key: keyof StudyPrefs, value: any) => {
    setStudyPrefs((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    localStorage.setItem("studyPrefs", JSON.stringify(studyPrefs));
    setHasChanges(false);
    toast.success("Preferences saved");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Preferences
          </DialogTitle>
          <DialogDescription>
            Customize your Phormula experience
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Appearance */}
          <div className="space-y-4">
            <Label className="text-sm font-medium text-muted-foreground">
              Appearance
            </Label>

            <RadioGroup
              value={theme}
              onValueChange={setTheme}
              className="grid grid-cols-3 gap-2"
            >
              <div>
                <RadioGroupItem
                  value="light"
                  id="theme-light"
                  className="peer sr-only"
                />
                <Label
                  htmlFor="theme-light"
                  className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                >
                  <Sun className="mb-2 h-5 w-5" />
                  <span className="text-xs">Light</span>
                </Label>
              </div>
              <div>
                <RadioGroupItem
                  value="dark"
                  id="theme-dark"
                  className="peer sr-only"
                />
                <Label
                  htmlFor="theme-dark"
                  className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                >
                  <Moon className="mb-2 h-5 w-5" />
                  <span className="text-xs">Dark</span>
                </Label>
              </div>
              <div>
                <RadioGroupItem
                  value="system"
                  id="theme-system"
                  className="peer sr-only"
                />
                <Label
                  htmlFor="theme-system"
                  className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                >
                  <Monitor className="mb-2 h-5 w-5" />
                  <span className="text-xs">System</span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          <Separator />

          {/* Study Settings */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <BookOpen className="h-4 w-4" />
              Study Settings
            </div>

            <div className="space-y-4 pl-2">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="autoFlip">Auto-flip cards</Label>
                  <p className="text-xs text-muted-foreground">
                    Automatically flip cards after a set time
                  </p>
                </div>
                <Switch
                  id="autoFlip"
                  checked={studyPrefs.autoFlip}
                  onCheckedChange={(checked) =>
                    handleStudyPrefChange("autoFlip", checked)
                  }
                />
              </div>

              {studyPrefs.autoFlip && (
                <div className="flex items-center justify-between pl-4">
                  <Label>Flip after</Label>
                  <Select
                    value={studyPrefs.flipTime}
                    onValueChange={(value) =>
                      handleStudyPrefChange("flipTime", value)
                    }
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3 sec</SelectItem>
                      <SelectItem value="5">5 sec</SelectItem>
                      <SelectItem value="10">10 sec</SelectItem>
                      <SelectItem value="15">15 sec</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="shuffleCards" className="flex items-center gap-2">
                    <Shuffle className="h-4 w-4" />
                    Shuffle cards by default
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Randomize card order when studying
                  </p>
                </div>
                <Switch
                  id="shuffleCards"
                  checked={studyPrefs.shuffleCards}
                  onCheckedChange={(checked) =>
                    handleStudyPrefChange("shuffleCards", checked)
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="showProgress">Show progress bar</Label>
                  <p className="text-xs text-muted-foreground">
                    Display progress during study sessions
                  </p>
                </div>
                <Switch
                  id="showProgress"
                  checked={studyPrefs.showProgress}
                  onCheckedChange={(checked) =>
                    handleStudyPrefChange("showProgress", checked)
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Card animation</Label>
                <Select
                  value={studyPrefs.cardAnimation}
                  onValueChange={(value) =>
                    handleStudyPrefChange("cardAnimation", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="flip">Flip</SelectItem>
                    <SelectItem value="fade">Fade</SelectItem>
                    <SelectItem value="slide">Slide</SelectItem>
                    <SelectItem value="none">None</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!hasChanges}>
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
