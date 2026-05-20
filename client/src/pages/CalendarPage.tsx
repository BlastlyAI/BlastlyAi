import AppLayout from "@/components/AppLayout";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Calendar, ChevronLeft, ChevronRight, Clock, Plus, Sparkles, Trash2 } from "lucide-react";
import { useState } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths, startOfWeek, endOfWeek } from "date-fns";
import { Link } from "wouter";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  scheduled: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  published: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  failed: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  cancelled: "bg-muted text-muted-foreground",
};

const PLATFORM_COLORS: Record<string, string> = {
  twitter: "bg-black",
  linkedin: "bg-blue-600",
  facebook: "bg-blue-500",
  instagram: "bg-gradient-to-br from-purple-500 to-pink-500",
};

export default function CalendarPage() {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id ?? 0;
  const utils = trpc.useUtils();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const { data: posts = [], isLoading } = trpc.posts.list.useQuery({ workspaceId: wsId }, { enabled: !!wsId });
  const deleteMutation = trpc.posts.delete.useMutation({
    onSuccess: () => { utils.posts.list.invalidate(); toast.success("Post deleted"); },
    onError: (e) => toast.error(e.message),
  });

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calDays = eachDayOfInterval({ start: calStart, end: calEnd });

  const filteredPosts = (posts as any[]).filter((p: any) => filterStatus === "all" || p.status === filterStatus);

  const getPostsForDay = (day: Date) =>
    filteredPosts.filter((p: any) => p.scheduledAt && isSameDay(new Date(p.scheduledAt), day));

  const selectedDayPosts = selectedDay ? getPostsForDay(selectedDay) : [];
  const allScheduledPosts = filteredPosts.filter((p: any) => p.scheduledAt).sort((a: any, b: any) =>
    new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
  );

  return (
    <AppLayout title="Calendar">
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>Content Calendar</h2>
            <p className="text-muted-foreground text-sm mt-0.5">Visualize and manage your scheduled posts.</p>
          </div>
          <div className="flex gap-2">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-36 h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All posts</SelectItem>
                <SelectItem value="draft">Drafts</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="published">Published</SelectItem>
              </SelectContent>
            </Select>
            <Link href="/dashboard/compose">
              <Button className="gap-2 shadow-sm shadow-primary/20 h-9">
                <Plus className="w-4 h-4" />New post
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <div className="lg:col-span-2">
            <Card className="border-border/60 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold">
                    {format(currentDate, "MMMM yyyy")}
                  </CardTitle>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setCurrentDate(new Date())}>
                      Today
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0 pb-4">
                {/* Day headers */}
                <div className="grid grid-cols-7 border-b border-border/50">
                  {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                    <div key={d} className="text-center text-[10px] font-semibold text-muted-foreground py-2">{d}</div>
                  ))}
                </div>
                {/* Calendar grid */}
                <div className="grid grid-cols-7">
                  {calDays.map((day) => {
                    const dayPosts = getPostsForDay(day);
                    const isToday = isSameDay(day, new Date());
                    const isSelected = selectedDay && isSameDay(day, selectedDay);
                    const isCurrentMonth = isSameMonth(day, currentDate);
                    return (
                      <div
                        key={day.toISOString()}
                        onClick={() => setSelectedDay(isSameDay(day, selectedDay ?? new Date(-1)) ? null : day)}
                        className={`min-h-[80px] p-1.5 border-b border-r border-border/30 cursor-pointer transition-colors ${
                          isSelected ? "bg-primary/5" : "hover:bg-muted/30"
                        } ${!isCurrentMonth ? "opacity-40" : ""}`}
                      >
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium mb-1 ${
                          isToday ? "bg-primary text-primary-foreground" : isSelected ? "bg-primary/20 text-primary" : "text-foreground"
                        }`}>
                          {format(day, "d")}
                        </div>
                        <div className="space-y-0.5">
                          {dayPosts.slice(0, 2).map((post: any) => (
                            <div key={post.id} className={`text-[9px] px-1 py-0.5 rounded truncate font-medium ${STATUS_COLORS[post.status]}`}>
                              {post.title ?? post.bodyText?.substring(0, 20) ?? "Post"}
                            </div>
                          ))}
                          {dayPosts.length > 2 && (
                            <div className="text-[9px] text-muted-foreground px-1">+{dayPosts.length - 2} more</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar: selected day or upcoming */}
          <div className="space-y-4">
            {selectedDay ? (
              <Card className="border-border/60 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-primary" />
                    {format(selectedDay, "EEEE, MMMM d")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedDayPosts.length === 0 ? (
                    <div className="text-center py-6">
                      <p className="text-sm text-muted-foreground mb-3">No posts scheduled</p>
                      <Link href="/dashboard/compose">
                        <Button size="sm" variant="outline" className="gap-1.5 text-xs"><Plus className="w-3 h-3" />Add post</Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {selectedDayPosts.map((post: any) => (
                        <div key={post.id} className="border border-border/60 rounded-lg p-3">
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <p className="text-xs font-medium line-clamp-2">{post.title ?? post.bodyText?.substring(0, 60) ?? "Post"}</p>
                            <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
                              onClick={() => deleteMutation.mutate({ id: post.id, workspaceId: wsId })}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={`${STATUS_COLORS[post.status]} border-0 text-[10px]`}>{post.status}</Badge>
                            {post.scheduledAt && (
                              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                <Clock className="w-2.5 h-2.5" />
                                {format(new Date(post.scheduledAt), "h:mm a")}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : null}

            {/* Upcoming scheduled */}
            <Card className="border-border/60 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />Upcoming Posts
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-12 bg-muted rounded animate-pulse" />)}</div>
                ) : allScheduledPosts.length === 0 ? (
                  <div className="text-center py-6">
                    <Sparkles className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">No upcoming posts</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {allScheduledPosts.slice(0, 8).map((post: any) => (
                      <div key={post.id} className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-muted/30 transition-colors">
                        <div className="shrink-0 text-center">
                          <p className="text-[10px] font-bold text-primary">{format(new Date(post.scheduledAt), "MMM")}</p>
                          <p className="text-sm font-bold leading-none">{format(new Date(post.scheduledAt), "d")}</p>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{post.title ?? post.bodyText?.substring(0, 40) ?? "Post"}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Badge className={`${STATUS_COLORS[post.status]} border-0 text-[9px]`}>{post.status}</Badge>
                            <span className="text-[10px] text-muted-foreground">{format(new Date(post.scheduledAt), "h:mm a")}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
