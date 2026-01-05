import { useState, useEffect } from "react";
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
import { toast } from "sonner";
import { Bell, Mail, Smartphone, Clock } from "lucide-react";

interface NotificationsSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface NotificationPrefs {
  emailNotifications: boolean;
  studyReminders: boolean;
  weeklyProgress: boolean;
  newFeatures: boolean;
  pushEnabled: boolean;
}

const defaultPrefs: NotificationPrefs = {
  emailNotifications: true,
  studyReminders: true,
  weeklyProgress: false,
  newFeatures: true,
  pushEnabled: false,
};

export const NotificationsSettings = ({
  open,
  onOpenChange,
}: NotificationsSettingsProps) => {
  const [prefs, setPrefs] = useState<NotificationPrefs>(defaultPrefs);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    // Load saved preferences from localStorage
    const saved = localStorage.getItem("notificationPrefs");
    if (saved) {
      setPrefs(JSON.parse(saved));
    }
  }, [open]);

  const handleToggle = (key: keyof NotificationPrefs) => {
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
    setHasChanges(true);
  };

  const handleSave = () => {
    localStorage.setItem("notificationPrefs", JSON.stringify(prefs));
    setHasChanges(false);
    toast.success("Notification preferences saved");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
          </DialogTitle>
          <DialogDescription>
            Manage how you receive notifications and updates
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Email Notifications */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Mail className="h-4 w-4" />
              Email Notifications
            </div>

            <div className="space-y-3 pl-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="emailNotifications">All email notifications</Label>
                  <p className="text-xs text-muted-foreground">
                    Receive important updates via email
                  </p>
                </div>
                <Switch
                  id="emailNotifications"
                  checked={prefs.emailNotifications}
                  onCheckedChange={() => handleToggle("emailNotifications")}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="weeklyProgress">Weekly progress report</Label>
                  <p className="text-xs text-muted-foreground">
                    Get a summary of your study progress
                  </p>
                </div>
                <Switch
                  id="weeklyProgress"
                  checked={prefs.weeklyProgress}
                  onCheckedChange={() => handleToggle("weeklyProgress")}
                  disabled={!prefs.emailNotifications}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="newFeatures">New features & updates</Label>
                  <p className="text-xs text-muted-foreground">
                    Learn about new Phormula features
                  </p>
                </div>
                <Switch
                  id="newFeatures"
                  checked={prefs.newFeatures}
                  onCheckedChange={() => handleToggle("newFeatures")}
                  disabled={!prefs.emailNotifications}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Study Reminders */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Clock className="h-4 w-4" />
              Study Reminders
            </div>

            <div className="space-y-3 pl-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="studyReminders">Daily study reminders</Label>
                  <p className="text-xs text-muted-foreground">
                    Get reminded to review your flashcards
                  </p>
                </div>
                <Switch
                  id="studyReminders"
                  checked={prefs.studyReminders}
                  onCheckedChange={() => handleToggle("studyReminders")}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Push Notifications */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Smartphone className="h-4 w-4" />
              Push Notifications
            </div>

            <div className="space-y-3 pl-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="pushEnabled">Enable push notifications</Label>
                  <p className="text-xs text-muted-foreground">
                    Receive notifications in your browser
                  </p>
                </div>
                <Switch
                  id="pushEnabled"
                  checked={prefs.pushEnabled}
                  onCheckedChange={() => handleToggle("pushEnabled")}
                />
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
