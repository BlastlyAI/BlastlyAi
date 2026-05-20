import AppLayout from "@/components/AppLayout";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Users, UserPlus, Crown, Edit3, Eye, Trash2, Shield } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";

const ROLE_CONFIG = {
  admin: { label: "Admin", color: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400", icon: Crown, desc: "Full access — manage members, settings, and all content." },
  editor: { label: "Editor", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", icon: Edit3, desc: "Can create, edit, and schedule posts and campaigns." },
  viewer: { label: "Viewer", color: "bg-muted text-muted-foreground", icon: Eye, desc: "Read-only access to posts, analytics, and campaigns." },
};

export default function Team() {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const wsId = currentWorkspace?.id ?? 0;
  const utils = trpc.useUtils();

  const { data: members = [], isLoading } = trpc.workspace.members.useQuery({ workspaceId: wsId }, { enabled: !!wsId });
  const inviteMutation = trpc.workspace.inviteMember.useMutation({
    onSuccess: () => { utils.workspace.members.invalidate(); setShowInvite(false); toast.success("Invitation sent"); setInviteEmail(""); },
    onError: (e: { message: string }) => toast.error(e.message),
  });
  const updateRoleMutation = trpc.workspace.updateMemberRole.useMutation({
    onSuccess: () => { utils.workspace.members.invalidate(); toast.success("Role updated"); },
    onError: (e) => toast.error(e.message),
  });
  const removeMutation = trpc.workspace.removeMember.useMutation({
    onSuccess: () => { utils.workspace.members.invalidate(); toast.success("Member removed"); },
    onError: (e) => toast.error(e.message),
  });

  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "editor" | "viewer">("editor");

  const isOwner = currentWorkspace?.ownerId === user?.id;
  const myRole = (members as any[]).find((m: any) => m.userId === user?.id)?.role;
  const canManage = isOwner || myRole === "admin";

  return (
    <AppLayout title="Team">
      <div className="p-6 space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>Team</h2>
            <p className="text-muted-foreground text-sm mt-0.5">Manage workspace members and their permissions.</p>
          </div>
          {canManage && (
            <Button onClick={() => setShowInvite(true)} className="gap-2 shadow-sm shadow-primary/20">
              <UserPlus className="w-4 h-4" />Invite member
            </Button>
          )}
        </div>

        {/* Role legend */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {(Object.entries(ROLE_CONFIG) as [string, typeof ROLE_CONFIG.admin][]).map(([role, config]) => {
            const Icon = config.icon;
            return (
              <Card key={role} className="border-border/60 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${config.color}`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-semibold text-sm capitalize">{role}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{config.desc}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Members list */}
        <Card className="border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              Members ({(members as any[]).length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />)}</div>
            ) : (members as any[]).length === 0 ? (
              <div className="text-center py-10">
                <Users className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No team members yet. Invite your first collaborator.</p>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {/* Owner */}
                {currentWorkspace && (
                  <div className="flex items-center gap-4 py-4">
                    <Avatar className="w-9 h-9">
                      <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                        {currentWorkspace.name?.[0]?.toUpperCase() ?? "O"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{currentWorkspace.name ?? "Workspace Owner"}</p>
                        <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-0 text-[10px] gap-1">
                          <Crown className="w-2.5 h-2.5" />Owner
                        </Badge>
                        {currentWorkspace.ownerId === user?.id && (
                          <Badge variant="secondary" className="text-[10px]">You</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                {/* Members */}
                {(members as any[]).map((member: any) => {
                  const roleConf = ROLE_CONFIG[member.role as keyof typeof ROLE_CONFIG] ?? ROLE_CONFIG.viewer;
                  const RoleIcon = roleConf.icon;
                  const isMe = member.userId === user?.id;
                  return (
                    <div key={member.id} className="flex items-center gap-4 py-4">
                      <Avatar className="w-9 h-9">
                        <AvatarFallback className="bg-muted text-muted-foreground text-sm font-semibold">
                          {member.user?.name?.[0]?.toUpperCase() ?? member.userId?.toString()[0] ?? "M"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">{member.user?.name ?? `Member #${member.userId}`}</p>
                          <Badge className={`${roleConf.color} border-0 text-[10px] gap-1`}>
                            <RoleIcon className="w-2.5 h-2.5" />
                            {roleConf.label}
                          </Badge>
                          {isMe && <Badge variant="secondary" className="text-[10px]">You</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {member.user?.email ?? ""} · Joined {format(new Date(member.joinedAt ?? member.createdAt ?? Date.now()), "MMM d, yyyy")}
                        </p>
                      </div>
                      {canManage && !isMe && (
                        <div className="flex items-center gap-2">
                          <Select
                            value={member.role}
                            onValueChange={(v) => updateRoleMutation.mutate({ workspaceId: wsId, memberId: member.id, role: v as any })}
                          >
                            <SelectTrigger className="h-7 w-24 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="editor">Editor</SelectItem>
                              <SelectItem value="viewer">Viewer</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => removeMutation.mutate({ workspaceId: wsId, memberId: member.id })}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Workspace settings */}
        <Card className="border-border/60 shadow-sm bg-muted/20">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium mb-1">Workspace Permissions</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Admins can manage all workspace settings, members, and content. Editors can create and schedule posts. Viewers have read-only access to analytics and content. Only the workspace owner can delete the workspace.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invite Dialog */}
      <Dialog open={showInvite} onOpenChange={setShowInvite}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Email Address *</Label>
              <Input type="email" placeholder="colleague@company.com" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin — Full access</SelectItem>
                  <SelectItem value="editor">Editor — Create & schedule</SelectItem>
                  <SelectItem value="viewer">Viewer — Read only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">An invitation will be sent to this email address. They will need to sign in with Manus OAuth to join the workspace.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInvite(false)}>Cancel</Button>
            <Button onClick={() => {
              if (!inviteEmail) { toast.error("Email is required"); return; }
              inviteMutation.mutate({ workspaceId: wsId, email: inviteEmail, role: inviteRole });
            }} disabled={inviteMutation.isPending} className="gap-2">
              <UserPlus className="w-4 h-4" />Send Invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
