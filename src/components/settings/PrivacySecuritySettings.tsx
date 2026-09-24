import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { usePremium } from "@/hooks/usePremium";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Shield,
  Key,
  Trash2,
  AlertTriangle,
  Eye,
  EyeOff,
  LogOut,
  Loader2,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface PrivacySecuritySettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const PrivacySecuritySettings = ({
  open,
  onOpenChange,
}: PrivacySecuritySettingsProps) => {
  const { user } = useAuth();
  const { isPremium } = usePremium();
  const navigate = useNavigate();
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [deleteStage, setDeleteStage] = useState<0 | 1 | 2>(0);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setIsLoading(true);
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    setIsLoading(false);

    if (error) {
      toast.error("Failed to update password: " + error.message);
    } else {
      toast.success("Password updated successfully");
      setIsChangingPassword(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  const handleSignOutAllDevices = async () => {
    const { error } = await supabase.auth.signOut({ scope: "global" });
    if (error) {
      toast.error("Failed to sign out from all devices");
    } else {
      toast.success("Signed out from all devices");
    }
  };

  // The delete-account edge function cancels any Premium subscription in
  // Stripe, then deletes the account and everything in it
  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    const { error } = await supabase.functions.invoke("delete-account", {
      body: { confirm: "DELETE" },
    });

    if (error) {
      const response = (error as { context?: unknown }).context;
      const payload = response instanceof Response ? await response.json().catch(() => null) : null;
      toast.error(typeof payload?.error === "string" ? payload.error : "We couldn't delete your account. Please try again.");
      setIsDeleting(false);
      return;
    }

    // The account no longer exists, so there's no server session to end
    await supabase.auth.signOut({ scope: "local" });
    onOpenChange(false);
    navigate("/");
    toast.success("Your account has been deleted");
  };

  const resetDeleteFlow = () => {
    setDeleteStage(0);
    setDeleteConfirmText("");
  };

  const handleExportData = async () => {
    // Fetch user's flashcard sets
    const { data: sets } = await supabase
      .from("flashcard_sets")
      .select("*, flashcards(*)")
      .eq("user_id", user?.id);

    if (sets) {
      const dataStr = JSON.stringify(sets, null, 2);
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "phormula-data-export.json";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Data exported successfully");
    } else {
      toast.error("Failed to export data");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Privacy & Security
          </DialogTitle>
          <DialogDescription>
            Manage your account security and privacy settings
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Change Password */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Key className="h-4 w-4" />
              Password
            </div>

            {!isChangingPassword ? (
              <Button
                variant="outline"
                onClick={() => setIsChangingPassword(true)}
                className="w-full"
              >
                Change Password
              </Button>
            ) : (
              <div className="space-y-3 pl-2">
                <div className="relative">
                  <Input
                    type={showCurrentPassword ? "text" : "password"}
                    placeholder="Current password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  >
                    {showCurrentPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>

                <div className="relative">
                  <Input
                    type={showNewPassword ? "text" : "password"}
                    placeholder="New password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>

                <Input
                  type="password"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleChangePassword}
                    disabled={isLoading}
                  >
                    {isLoading ? "Updating..." : "Update Password"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setIsChangingPassword(false);
                      setCurrentPassword("");
                      setNewPassword("");
                      setConfirmPassword("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Session Management */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <LogOut className="h-4 w-4" />
              Sessions
            </div>

            <Button
              variant="outline"
              onClick={handleSignOutAllDevices}
              className="w-full"
            >
              Sign Out All Devices
            </Button>
            <p className="text-xs text-muted-foreground pl-2">
              This will sign you out from all devices including this one
            </p>
          </div>

          <Separator />

          {/* Data & Privacy */}
          <div className="space-y-4">
            <Label className="text-sm font-medium text-muted-foreground">
              Your Data
            </Label>

            <div className="space-y-2">
              <Button
                variant="outline"
                onClick={handleExportData}
                className="w-full"
              >
                Export My Data
              </Button>
              <p className="text-xs text-muted-foreground pl-2">
                Download all your flashcards and study data
              </p>
            </div>
          </div>

          <Separator />

          {/* Danger Zone */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-destructive">
              <AlertTriangle className="h-4 w-4" />
              Danger Zone
            </div>

            {deleteStage === 0 && (
              <Button
                variant="destructive"
                className="w-full"
                onClick={() => setDeleteStage(1)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Account
              </Button>
            )}

            {deleteStage === 1 && (
              <div className="space-y-3 p-4 border border-destructive/50 rounded-lg bg-destructive/5">
                <p className="text-sm font-medium text-destructive">
                  Are you sure you want to delete your account?
                </p>
                <p className="text-xs text-muted-foreground">
                  This permanently deletes your account, your flashcard sets and files, your study
                  progress, and anything you've shared. It can't be undone, so export your data first
                  if you want a copy.
                </p>
                {isPremium && (
                  <p className="text-xs text-muted-foreground">
                    Your Premium subscription is cancelled straight away, so you won't be charged again.
                    The rest of the current billing period isn't refunded.
                  </p>
                )}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resetDeleteFlow}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setDeleteStage(2)}
                  >
                    Yes, I want to delete
                  </Button>
                </div>
              </div>
            )}

            {deleteStage === 2 && (
              <div className="space-y-3 p-4 border border-destructive rounded-lg bg-destructive/10">
                <p className="text-sm font-medium text-destructive">
                  Final confirmation required
                </p>
                <p className="text-xs text-muted-foreground">
                  Type <span className="font-mono font-bold text-foreground">DELETE</span> to confirm account deletion.
                </p>
                <Input
                  placeholder="Type DELETE to confirm"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  className="border-destructive/50"
                />
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resetDeleteFlow}
                    disabled={isDeleting}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDeleteAccount}
                    disabled={deleteConfirmText !== "DELETE" || isDeleting}
                  >
                    {isDeleting ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4 mr-2" />
                    )}
                    {isDeleting ? "Deleting…" : "Permanently Delete"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
