import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import {
  User,
  Mail,
  Calendar,
  Shield,
  LogOut,
  Settings,
  Bell,
  HelpCircle,
  ChevronRight,
} from "lucide-react";

interface ProfileSheetProps {
  children: React.ReactNode;
}

export const ProfileSheet = ({ children }: ProfileSheetProps) => {
  const { user, signOut } = useAuth();
  const [fullName, setFullName] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle();

    if (data?.full_name) {
      setFullName(data.full_name);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    
    setIsSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName })
      .eq("id", user.id);

    setIsSaving(false);
    
    if (error) {
      toast.error("Failed to update profile");
    } else {
      toast.success("Profile updated successfully");
      setIsEditing(false);
    }
  };

  const getInitials = () => {
    if (fullName) {
      return fullName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return user?.email?.charAt(0).toUpperCase() || "U";
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const menuItems = [
    { icon: Bell, label: "Notifications", onClick: () => toast.info("Coming soon") },
    { icon: Shield, label: "Privacy & Security", onClick: () => toast.info("Coming soon") },
    { icon: Settings, label: "Preferences", onClick: () => toast.info("Coming soon") },
    { icon: HelpCircle, label: "Help & Support", onClick: () => toast.info("Coming soon") },
  ];

  return (
    <Sheet>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="text-left pb-4">
          <SheetTitle>Profile</SheetTitle>
          <SheetDescription>Manage your account settings</SheetDescription>
        </SheetHeader>

        {/* Avatar and Basic Info */}
        <div className="flex items-center gap-4 py-6">
          <Avatar className="h-20 w-20 border-2 border-primary/20">
            <AvatarFallback className="bg-primary/10 text-primary text-2xl font-semibold">
              {getInitials()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-semibold truncate">
              {fullName || "User"}
            </h3>
            <p className="text-sm text-muted-foreground truncate">
              {user?.email}
            </p>
          </div>
        </div>

        <Separator />

        {/* Account Details Section */}
        <div className="py-6 space-y-4">
          <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Account Details
          </h4>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Full Name
              </Label>
              {isEditing ? (
                <div className="flex gap-2">
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                  />
                  <Button size="sm" onClick={handleSaveProfile} disabled={isSaving}>
                    {isSaving ? "..." : "Save"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsEditing(false)}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-sm">{fullName || "Not set"}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsEditing(true)}
                  >
                    Edit
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email
              </Label>
              <p className="text-sm">{user?.email}</p>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Member Since
              </Label>
              <p className="text-sm">{formatDate(user?.created_at)}</p>
            </div>
          </div>
        </div>

        <Separator />

        {/* Settings Menu */}
        <div className="py-6 space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-4">
            Settings
          </h4>

          {menuItems.map((item) => (
            <button
              key={item.label}
              onClick={item.onClick}
              className="w-full flex items-center justify-between py-3 px-2 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <item.icon className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium">{item.label}</span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          ))}
        </div>

        <Separator />

        {/* Sign Out */}
        <div className="py-6">
          <Button
            variant="destructive"
            className="w-full"
            onClick={signOut}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
