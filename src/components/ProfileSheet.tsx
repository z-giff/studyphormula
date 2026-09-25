import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { usePremium } from "@/hooks/usePremium";
import { supabase } from "@/integrations/supabase/client";
import { describePremiumStatus, openBillingPortal, PREMIUM_FEATURE_NAMES, TRIAL_LIMITED_FEATURES } from "@/lib/premium";
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
  Crown,
  Loader2,
} from "lucide-react";
import { NotificationsSettings } from "@/components/settings/NotificationsSettings";
import { PrivacySecuritySettings } from "@/components/settings/PrivacySecuritySettings";
import { PreferencesSettings } from "@/components/settings/PreferencesSettings";
import { HelpSupportSettings } from "@/components/settings/HelpSupportSettings";

interface ProfileSheetProps {
  children: React.ReactNode;
}

export const ProfileSheet = ({ children }: ProfileSheetProps) => {
  const { user, signOut } = useAuth();
  const {
    isPremium,
    isTrial,
    loading: premiumLoading,
    status: premiumStatus,
    openUpgrade,
    trialUsage,
  } = usePremium();
  const [isOpeningBilling, setIsOpeningBilling] = useState(false);
  const [fullName, setFullName] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

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

  const handleManageBilling = async () => {
    setIsOpeningBilling(true);
    try {
      await openBillingPortal(`${window.location.pathname}${window.location.search}`);
    } catch (error) {
      setIsOpeningBilling(false);
      toast.error(error instanceof Error ? error.message : "Couldn't open billing");
    }
  };

  const planLine = premiumStatus ? describePremiumStatus(premiumStatus) : "";

  const menuItems = [
    { icon: Bell, label: "Notifications", onClick: () => setNotificationsOpen(true) },
    { icon: Shield, label: "Privacy & Security", onClick: () => setPrivacyOpen(true) },
    { icon: Settings, label: "Preferences", onClick: () => setPreferencesOpen(true) },
    { icon: HelpCircle, label: "Help & Support", onClick: () => setHelpOpen(true) },
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

        {/* Plan */}
        <div className="py-6 space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Plan
          </h4>

          {premiumLoading ? (
            <div className="h-5 w-24 rounded bg-muted animate-pulse" />
          ) : isPremium ? (
            <>
              <p className="flex items-center gap-2 text-sm font-medium">
                <Crown className="h-4 w-4 text-primary" />
                Phormula Premium
              </p>
              {planLine && (
                <p
                  className={`text-sm ${
                    premiumStatus?.status === "past_due" ? "text-destructive" : "text-muted-foreground"
                  }`}
                >
                  {planLine}
                </p>
              )}
              {isTrial && trialUsage && (
                <div className="space-y-1.5 rounded-lg border border-border px-3 py-2.5">
                  <p className="text-xs font-medium text-muted-foreground">Left in your free trial</p>
                  <ul className="space-y-1 text-sm">
                    {TRIAL_LIMITED_FEATURES.map((feature) => {
                      const usage = trialUsage[feature];
                      if (!usage) return null;
                      return (
                        <li key={feature} className="flex justify-between gap-3">
                          <span>{PREMIUM_FEATURE_NAMES[feature]}</span>
                          <span className="text-muted-foreground">
                            {Math.max(usage.limit - usage.uses, 0)} of {usage.limit}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                  <p className="text-xs text-muted-foreground">Everything else is unlimited, and a paid plan has no limits.</p>
                </div>
              )}
              {isTrial && (
                <Button variant="brand" size="sm" className="rounded-lg font-bold" onClick={() => openUpgrade()}>
                  <Crown className="h-4 w-4" />
                  Start my plan now
                </Button>
              )}
            </>
          ) : (
            <>
              <p className="text-sm font-medium">Free</p>
              <p className="text-sm text-muted-foreground">
                {planLine ? `${planLine} ` : ""}Upgrade for Auto-Flashcard, interactive, flowchart and drawing cards, and the MC Quiz.
              </p>
              <Button variant="brand" size="sm" className="rounded-lg font-bold" onClick={() => openUpgrade()}>
                <Crown className="h-4 w-4" />
                Upgrade to Premium
              </Button>
            </>
          )}

          {/* Anyone who has ever had a subscription can reach their invoices */}
          {!premiumLoading && premiumStatus?.has_billing_account && (isPremium || premiumStatus.status) && (
            <Button
              variant="outline"
              size="sm"
              className="flex"
              onClick={handleManageBilling}
              disabled={isOpeningBilling}
            >
              {isOpeningBilling && <Loader2 className="h-4 w-4 animate-spin" />}
              {!isPremium
                ? "Billing history"
                : premiumStatus.status === "trialing" && !premiumStatus.has_payment_method
                  ? "Add a card"
                  : "Manage billing"}
            </Button>
          )}
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

        {/* Settings Dialogs */}
        <NotificationsSettings
          open={notificationsOpen}
          onOpenChange={setNotificationsOpen}
        />
        <PrivacySecuritySettings
          open={privacyOpen}
          onOpenChange={setPrivacyOpen}
        />
        <PreferencesSettings
          open={preferencesOpen}
          onOpenChange={setPreferencesOpen}
        />
        <HelpSupportSettings
          open={helpOpen}
          onOpenChange={setHelpOpen}
        />
      </SheetContent>
    </Sheet>
  );
};
