import { ArrowLeft, Smartphone, Monitor, Tablet, MapPin, Clock, LogOut, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

interface Session {
  id: string;
  device: string;
  deviceType: "mobile" | "desktop" | "tablet";
  location: string;
  lastActive: string;
  isCurrent: boolean;
  browser: string;
}

const DevicesSettings = () => {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<Session[]>([
    {
      id: "1",
      device: "iPhone 15 Pro",
      deviceType: "mobile",
      location: "Miami, FL",
      lastActive: "Now",
      isCurrent: true,
      browser: "Safari",
    },
    {
      id: "2",
      device: "MacBook Pro",
      deviceType: "desktop",
      location: "Miami, FL",
      lastActive: "2 hours ago",
      isCurrent: false,
      browser: "Chrome",
    },
    {
      id: "3",
      device: "iPad Pro",
      deviceType: "tablet",
      location: "New York, NY",
      lastActive: "3 days ago",
      isCurrent: false,
      browser: "Safari",
    },
  ]);
  
  const [sessionToRevoke, setSessionToRevoke] = useState<Session | null>(null);
  const [showRevokeAllDialog, setShowRevokeAllDialog] = useState(false);

  const getDeviceIcon = (type: Session["deviceType"]) => {
    switch (type) {
      case "mobile":
        return Smartphone;
      case "desktop":
        return Monitor;
      case "tablet":
        return Tablet;
    }
  };

  const handleRevokeSession = (session: Session) => {
    setSessions(prev => prev.filter(s => s.id !== session.id));
    setSessionToRevoke(null);
    toast.success(`Signed out from ${session.device}`);
  };

  const handleRevokeAllSessions = () => {
    setSessions(prev => prev.filter(s => s.isCurrent));
    setShowRevokeAllDialog(false);
    toast.success("Signed out from all other devices");
  };

  const otherSessions = sessions.filter(s => !s.isCurrent);

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center gap-3 p-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/settings")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold">Devices & Sessions</h1>
            <p className="text-sm text-muted-foreground">Manage your active sessions</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4 max-w-2xl mx-auto">
        {/* Current Session */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Current Session
            </CardTitle>
            <CardDescription>
              This device is currently active
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sessions.filter(s => s.isCurrent).map(session => {
              const DeviceIcon = getDeviceIcon(session.deviceType);
              return (
                <div key={session.id} className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-primary/10">
                    <DeviceIcon className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{session.device}</h3>
                      <Badge variant="default" className="text-xs">Current</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{session.browser}</p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {session.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {session.lastActive}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Other Sessions */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Other Sessions</CardTitle>
                <CardDescription>
                  {otherSessions.length > 0 
                    ? `${otherSessions.length} other device${otherSessions.length > 1 ? 's' : ''} signed in`
                    : "No other devices are signed in"}
                </CardDescription>
              </div>
              {otherSessions.length > 0 && (
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => setShowRevokeAllDialog(true)}
                >
                  Sign out all
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {otherSessions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Smartphone className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>You're only signed in on this device</p>
              </div>
            ) : (
              otherSessions.map(session => {
                const DeviceIcon = getDeviceIcon(session.deviceType);
                return (
                  <div 
                    key={session.id} 
                    className="flex items-start gap-4 p-4 rounded-lg border border-border"
                  >
                    <div className="p-2 rounded-lg bg-muted">
                      <DeviceIcon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium">{session.device}</h3>
                      <p className="text-sm text-muted-foreground">{session.browser}</p>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {session.location}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {session.lastActive}
                        </span>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setSessionToRevoke(session)}
                    >
                      <LogOut className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Security Tip */}
        <Card className="bg-muted/30">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <Shield className="h-5 w-5 text-muted-foreground shrink-0" />
              <div>
                <p className="font-medium text-sm">Security Tip</p>
                <p className="text-sm text-muted-foreground mt-1">
                  If you see a device you don't recognize, sign out of that session and change your password immediately.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revoke Single Session Dialog */}
      <AlertDialog open={!!sessionToRevoke} onOpenChange={() => setSessionToRevoke(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out from device?</AlertDialogTitle>
            <AlertDialogDescription>
              This will sign out the session on {sessionToRevoke?.device}. 
              They'll need to sign in again to access their account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => sessionToRevoke && handleRevokeSession(sessionToRevoke)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Sign out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Revoke All Sessions Dialog */}
      <AlertDialog open={showRevokeAllDialog} onOpenChange={setShowRevokeAllDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out from all devices?</AlertDialogTitle>
            <AlertDialogDescription>
              This will sign out all sessions except your current one. 
              You'll stay signed in on this device.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleRevokeAllSessions}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Sign out all
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DevicesSettings;
