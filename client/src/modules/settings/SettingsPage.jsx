import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Bell,
  Check,
  Download,
  FileText,
  Lock,
  LogOut,
  Monitor,
  Smartphone,
  Laptop,
  Tablet,
  Globe,
  Clock,
  MoreHorizontal,
  Palette,
  Shield,
  Trash2,
  User,
  X,
  Zap,
} from "lucide-react";
import api from "../../lib/api.js";
import { pageVariants, staggerContainer, staggerItem } from "../../lib/animations.js";
import { SectionHeader, Button, Card, Input } from "../../components/ui/PageLoader.jsx";
import { useHunterStore } from "../../stores/hunterStore.js";

const DEFAULT_SETTINGS = {
  notifications: {
    enabled: true,
    inApp: true,
    desktop: false,
    email: false,
    securityAlerts: true,
    questUpdates: true,
    progression: true,
    social: true,
    weeklyReports: true,
  },
  preferences: { soundEffects: true, compactMode: false },
  privacy: { publicProfile: true, showPublicStats: true, showPublicAchievements: true },
};

const mergeSettings = (settings = {}) => ({
  notifications: { ...DEFAULT_SETTINGS.notifications, ...(settings.notifications || {}) },
  preferences: { ...DEFAULT_SETTINGS.preferences, ...(settings.preferences || {}) },
  privacy: { ...DEFAULT_SETTINGS.privacy, ...(settings.privacy || {}) },
});

const TABS = [
  ["profile", "Profile", User],
  ["security", "Security", Lock],
  ["notifications", "Notifications", Bell],
  ["privacy", "Privacy", Shield],
  ["preferences", "Preferences", Palette],
  ["report", "Reports", FileText],
  ["system", "System", Zap],
  ["other", "Other", MoreHorizontal],
];

export default function SettingsPage() {
  const [tab, setTab] = useState("profile");
  const { user, setUser, settings, setSettings, clearAuth } = useHunterStore();
  const queryClient = useQueryClient();
  const [profile, setProfile] = useState({
    hunterName: user?.hunterName || "",
    bio: user?.bio || "",
    country: user?.country || "",
    timezone: user?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  });
  const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [dangerPassword, setDangerPassword] = useState("");
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [message, setMessage] = useState(null);
  const [localSettings, setLocalSettings] = useState(() => mergeSettings(settings || user?.settings));

  const { data: settingsData, isLoading: settingsLoading } = useQuery({
    queryKey: ["user-settings"],
    queryFn: async () => {
      const { data } = await api.get("/users/me/settings");
      return data.data;
    },
    staleTime: 0,
  });

  const { data: sessionsData, isLoading: sessionsLoading, refetch: refetchSessions } = useQuery({
    queryKey: ["user-sessions"],
    queryFn: async () => {
      const { data } = await api.get("/users/me/sessions");
      return data.data.sessions || [];
    },
    enabled: tab === "security",
    staleTime: 30_000,
  });

  const revokeSessionMutation = useMutation({
    mutationFn: (sessionId) => api.delete(`/users/me/sessions/${encodeURIComponent(sessionId)}`),
    onSuccess: ({ data }) => {
      if (data.data.current) {
        clearAuth();
        window.location.href = "/login";
        return;
      }
      refetchSessions();
      setMessage({ type: "success", text: "Session signed out." });
    },
    onError: (error) => setMessage({ type: "error", text: error.response?.data?.message || "Could not sign out session." }),
  });

  const effectiveSettings = localSettings;

  useEffect(() => {
    if (settingsData?.settings) {
      const normalized = mergeSettings(settingsData.settings);
      setSettings(normalized);
      setLocalSettings(normalized);
    }
  }, [settingsData?.settings, setSettings]);

  useEffect(() => {
    if (user) {
      setProfile({
        hunterName: user.hunterName || "",
        bio: user.bio || "",
        country: user.country || "",
        timezone: user.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
      });
    }
  }, [user?._id]);

  useEffect(() => {
    document.documentElement.classList.toggle(
      "compact-mode",
      Boolean(effectiveSettings.preferences.compactMode),
    );
  }, [effectiveSettings.preferences.compactMode]);

  const profileMutation = useMutation({
    mutationFn: (body) => api.patch("/users/me", body),
    onSuccess: ({ data }) => {
      setUser(data.data.user);
      queryClient.invalidateQueries({ queryKey: ["hunter"] });
      queryClient.invalidateQueries({ queryKey: ["public-hunter"] });
      setMessage({ type: "success", text: "Profile updated successfully." });
    },
    onError: (error) => setMessage({ type: "error", text: error.response?.data?.message || "Profile update failed." }),
  });

  const settingsMutation = useMutation({
    mutationFn: ({ body }) => api.patch("/users/me/settings", body),
    onSuccess: ({ data }) => {
      const normalized = mergeSettings(data.data.settings);
      setSettings(normalized);
      setUser({ ...useHunterStore.getState().user, settings: normalized });
    },
    onError: (error, variables) => {
      if (variables?.previous) {
        setLocalSettings(variables.previous);
        setSettings(variables.previous);
      }
      setMessage({ type: "error", text: error.response?.data?.message || "Could not save setting." });
    },
  });

  const passwordMutation = useMutation({
    mutationFn: (body) => api.patch("/users/me/password", body),
    onSuccess: () => {
      setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setMessage({ type: "success", text: "Password changed. Other sessions were signed out." });
    },
    onError: (error) => setMessage({ type: "error", text: error.response?.data?.message || "Password change failed." }),
  });

  const logoutAllMutation = useMutation({
    mutationFn: () => api.post("/users/me/logout-all"),
    onSuccess: () => setMessage({ type: "success", text: "All other sessions have been signed out." }),
  });

  const deactivateMutation = useMutation({
    mutationFn: (password) => api.post("/users/me/deactivate", { password }),
    onSuccess: () => {
      clearAuth();
      window.location.href = "/login";
    },
    onError: (error) => setMessage({ type: "error", text: error.response?.data?.message || "Could not deactivate account." }),
  });

  const deleteMutation = useMutation({
    mutationFn: (password) => api.delete("/users/me", { data: { password } }),
    onSuccess: () => {
      clearAuth();
      window.location.href = "/register";
    },
    onError: (error) => setMessage({ type: "error", text: error.response?.data?.message || "Could not delete account." }),
  });

  const clearNotificationsMutation = useMutation({
    mutationFn: () => api.delete("/notifications"),
    onSuccess: () => {
      useHunterStore.getState().setNotifications([], 0);
      setMessage({ type: "success", text: "Notification history cleared." });
      queryClient.invalidateQueries({ queryKey: ["notifications-badge"] });
    },
  });

  const updateSetting = (section, key, value) => {
    const previous = mergeSettings(effectiveSettings);
    const next = mergeSettings(effectiveSettings);
    next[section][key] = value;
    setLocalSettings(next);
    setSettings(next);
    setUser({ ...useHunterStore.getState().user, settings: next });
    settingsMutation.mutate({ body: { [section]: { [key]: value } }, previous });
  };

  const requestDesktopPermission = async () => {
    if (!("Notification" in window)) {
      setMessage({ type: "error", text: "This browser does not support desktop notifications." });
      return;
    }
    if (!window.isSecureContext) {
      setMessage({ type: "error", text: "Desktop notifications require HTTPS in production." });
      return;
    }
    const permission = Notification.permission === "granted"
      ? "granted"
      : await Notification.requestPermission();
    if (permission === "granted") {
      updateSetting("notifications", "desktop", true);
      try {
        const registration = await navigator.serviceWorker?.getRegistration();
        if (registration) {
          await registration.showNotification("The System is online", {
            body: "Desktop notifications are enabled.",
            icon: "/icon-192.png",
            tag: "settings-test",
          });
        }
      } catch {}
    } else {
      updateSetting("notifications", "desktop", false);
      setMessage({ type: "error", text: "Browser permission was not granted. Enable it from the browser site settings." });
    }
  };

  const handleAvatarUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setMessage({ type: "error", text: "Please choose an image file." });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: "error", text: "Avatar must be 5 MB or smaller." });
      return;
    }

    setAvatarUploading(true);
    const formData = new FormData();
    formData.append("avatar", file);
    try {
      const { data } = await api.patch("/users/me/avatar", formData);
      setUser({ ...useHunterStore.getState().user, avatar: data.data.avatar });
      setMessage({ type: "success", text: "Avatar updated." });
    } catch (error) {
      setMessage({ type: "error", text: error.response?.data?.message || "Avatar upload failed." });
    } finally {
      setAvatarUploading(false);
      event.target.value = "";
    }
  };

  const removeAvatar = async () => {
    try {
      const { data } = await api.delete("/users/me/avatar");
      setUser({ ...useHunterStore.getState().user, avatar: data.data.avatar });
      setMessage({ type: "success", text: "Avatar removed." });
    } catch (error) {
      setMessage({ type: "error", text: error.response?.data?.message || "Could not remove avatar." });
    }
  };

  const saveProfile = (event) => {
    event.preventDefault();
    profileMutation.mutate(profile);
  };

  const changePassword = (event) => {
    event.preventDefault();
    if (passwords.newPassword.length < 8) {
      setMessage({ type: "error", text: "New password must be at least 8 characters." });
      return;
    }
    if (passwords.newPassword !== passwords.confirmPassword) {
      setMessage({ type: "error", text: "New password and confirmation do not match." });
      return;
    }
    passwordMutation.mutate({ currentPassword: passwords.currentPassword, newPassword: passwords.newPassword });
  };

  const downloadExport = async (format) => {
    try {
      const response = await api.get(`/users/me/export?format=${format}`, { responseType: "blob" });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url;
      const extension = format === "excel" ? "xls" : format;
      link.download = `solo-leveling-account-export-${new Date().toISOString().slice(0, 10)}.${extension}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setMessage({ type: "success", text: `${format.toUpperCase()} export downloaded.` });
    } catch (error) {
      setMessage({ type: "error", text: error.response?.data?.message || "Export failed." });
    }
  };

  const publicLink = user?._id ? `${window.location.origin}/h/${user._id}` : "";

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
      <div className="mb-8">
        <p className="text-system mb-1">Configuration</p>
        <h1 className="font-heading font-bold text-2xl text-slate-100">Settings</h1>
        <p className="font-body text-sm text-slate-500 mt-1">Control your account, privacy, notifications and System behavior.</p>
      </div>

      {message && (
        <div className={`mb-5 rounded-xl border px-4 py-3 text-sm flex items-center justify-between ${message.type === "success" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-red-500/30 bg-red-500/10 text-red-300"}`}>
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)}><X size={15} /></button>
        </div>
      )}

      <div className="flex gap-2 flex-wrap mb-6">
        {TABS.map(([id, label, Icon]) => (
          <button key={id} onClick={() => setTab(id)} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-heading text-sm font-semibold border transition-all ${tab === id ? "bg-cyan-500/10 border-cyan-500/40 text-cyan-400" : "border-slate-800 text-slate-500 hover:text-slate-300"}`}>
            <Icon size={14} />{label}
          </button>
        ))}
      </div>

      <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-4">
        {tab === "profile" && (
          <motion.div variants={staggerItem} className="space-y-4">
            <Card>
              <SectionHeader label="Identity" title="Profile Settings" />
              <div className="flex flex-col sm:flex-row items-start gap-5 mb-7">
                <div className="w-24 h-24 rounded-2xl overflow-hidden border border-cyan-500/30 bg-slate-900 flex items-center justify-center shrink-0">
                  {user?.avatar?.url ? <img src={user.avatar.url} alt="Profile avatar" className="w-full h-full object-cover" /> : <span className="font-display text-4xl text-cyan-500/30">{user?.hunterName?.[0]?.toUpperCase()}</span>}
                </div>
                <div>
                  <div className="flex flex-wrap gap-2">
                    <label className="btn-primary cursor-pointer inline-flex items-center gap-2">
                      {avatarUploading ? "Uploading..." : "Upload Avatar"}
                      <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleAvatarUpload} disabled={avatarUploading} />
                    </label>
                    {user?.avatar?.url && <Button type="button" variant="secondary" size="sm" onClick={removeAvatar}>Remove</Button>}
                  </div>
                  <p className="text-xs text-slate-600 mt-2">JPG, PNG or WebP. Maximum 5 MB.</p>
                </div>
              </div>

              <form onSubmit={saveProfile} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="input-label">Email</label>
                  <input className="input opacity-50 cursor-not-allowed" value={user?.email || ""} disabled />
                  <p className="text-[11px] text-slate-600 mt-1">Email changes require verification and are intentionally protected from direct edits.</p>
                </div>
                <Input label="Hunter Name" value={profile.hunterName} onChange={(e) => setProfile({ ...profile, hunterName: e.target.value })} />
                <div className="md:col-span-2">
                  <label className="input-label">Bio</label>
                  <textarea className="input min-h-24 resize-y" maxLength={240} value={profile.bio} onChange={(e) => setProfile({ ...profile, bio: e.target.value })} placeholder="A short description for your public Hunter profile" />
                  <p className="text-[11px] text-slate-600 mt-1 text-right">{profile.bio.length}/240</p>
                </div>
                <Input label="Country" value={profile.country} onChange={(e) => setProfile({ ...profile, country: e.target.value })} placeholder="India" />
                <Input label="Timezone" value={profile.timezone} onChange={(e) => setProfile({ ...profile, timezone: e.target.value })} placeholder="Asia/Kolkata" />
                <div className="md:col-span-2 flex justify-end">
                  <Button type="submit" variant="primary" loading={profileMutation.isPending}>Save Profile</Button>
                </div>
              </form>
            </Card>

            <Card>
              <SectionHeader label="Public Link" title="Share Your Hunter Profile" />
              <div className="flex flex-col sm:flex-row gap-2">
                <input className="input flex-1" value={publicLink} readOnly />
                <Button type="button" variant="secondary" onClick={() => navigator.clipboard?.writeText(publicLink)}>Copy Link</Button>
                <Button type="button" variant="secondary" onClick={() => window.open(publicLink, "_blank", "noopener,noreferrer")}>Open</Button>
              </div>
            </Card>
          </motion.div>
        )}

        {tab === "security" && (
          <motion.div variants={staggerItem} className="space-y-4">
            <Card>
              <SectionHeader label="Authentication" title="Change Password" />
              <form onSubmit={changePassword} className="space-y-4 max-w-xl">
                <Input label="Current Password" type="password" value={passwords.currentPassword} onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })} />
                <Input label="New Password" type="password" minLength={8} value={passwords.newPassword} onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })} />
                <Input label="Confirm New Password" type="password" minLength={8} value={passwords.confirmPassword} onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })} />
                <Button type="submit" variant="primary" loading={passwordMutation.isPending}>Update Password</Button>
              </form>
            </Card>
            <Card>
              <SectionHeader label="Sessions" title="Your Active Sessions" />
              <p className="text-sm text-slate-500 mb-4">See where your account is signed in, including device/model, browser, operating system, IP address and last activity.</p>
              {sessionsLoading ? (
                <p className="text-sm text-slate-500 py-5">Loading active sessions…</p>
              ) : sessionsData?.length ? (
                <div className="space-y-3">
                  {sessionsData.map((session) => <SessionRow key={session.id} session={session} loading={revokeSessionMutation.isPending} onRevoke={() => revokeSessionMutation.mutate(session.id)} />)}
                </div>
              ) : (
                <p className="text-sm text-slate-500 py-5">No active sessions were found.</p>
              )}
              <div className="mt-5 pt-4 border-t border-slate-800">
                <Button variant="secondary" loading={logoutAllMutation.isPending} onClick={() => logoutAllMutation.mutate()}><LogOut size={14} /> Sign Out All Sessions</Button>
              </div>
            </Card>
          </motion.div>
        )}

        {tab === "notifications" && (
          <motion.div variants={staggerItem} className="space-y-4">
            <Card>
              <SectionHeader label="Delivery" title="Notification Controls" />
              <ToggleRow label="Master notifications" description="Turn every notification channel off without losing your individual preferences." checked={effectiveSettings.notifications.enabled} onChange={(v) => updateSetting("notifications", "enabled", v)} />
              <ToggleRow label="In-app notification center" description="Store notifications in the bell panel and show real-time System events." checked={effectiveSettings.notifications.inApp} disabled={!effectiveSettings.notifications.enabled} onChange={(v) => updateSetting("notifications", "inApp", v)} />
              <ToggleRow label="Desktop notifications" description="Show browser/OS notifications for live System events. Browser permission is required." checked={effectiveSettings.notifications.desktop} disabled={!effectiveSettings.notifications.enabled} onChange={(v) => v ? requestDesktopPermission() : updateSetting("notifications", "desktop", false)} />
              {effectiveSettings.notifications.desktop && (
                <div className="mt-3 p-3 rounded-xl bg-slate-800/40 border border-slate-700/50 text-xs text-slate-400">
                  Browser permission: <span className="text-slate-200">{"Notification" in window ? Notification.permission : "unsupported"}</span>
                  <button className="ml-2 text-cyan-400" onClick={() => updateSetting("notifications", "desktop", false)}>Turn off</button>
                </div>
              )}
              <ToggleRow label="Email notifications" description="Allow non-password-reset notification emails from The System." checked={effectiveSettings.notifications.email} disabled={!effectiveSettings.notifications.enabled} onChange={(v) => updateSetting("notifications", "email", v)} />
            </Card>

            <Card>
              <SectionHeader label="Categories" title="What Should The System Notify You About?" />
              <ToggleRow label="Security alerts" description="New login and password/security events." checked={effectiveSettings.notifications.securityAlerts} disabled={!effectiveSettings.notifications.enabled} onChange={(v) => updateSetting("notifications", "securityAlerts", v)} />
              <ToggleRow label="Quest updates" description="Quest assignments, completions and daily quest completion." checked={effectiveSettings.notifications.questUpdates} disabled={!effectiveSettings.notifications.enabled} onChange={(v) => updateSetting("notifications", "questUpdates", v)} />
              <ToggleRow label="Progression" description="Level-ups, rank-ups, bosses, shadows, achievements and streak events." checked={effectiveSettings.notifications.progression} disabled={!effectiveSettings.notifications.enabled} onChange={(v) => updateSetting("notifications", "progression", v)} />
              <ToggleRow label="Social" description="Friend and guild events." checked={effectiveSettings.notifications.social} disabled={!effectiveSettings.notifications.enabled} onChange={(v) => updateSetting("notifications", "social", v)} />
              <ToggleRow label="Weekly reports" description="Weekly performance report notifications." checked={effectiveSettings.notifications.weeklyReports} disabled={!effectiveSettings.notifications.enabled} onChange={(v) => updateSetting("notifications", "weeklyReports", v)} />
            </Card>

            <Card>
              <SectionHeader label="History" title="Notification Data" />
              <p className="text-sm text-slate-500 mb-4">Delete your stored notification history. This does not affect future notification settings.</p>
              <Button variant="secondary" loading={clearNotificationsMutation.isPending} onClick={() => clearNotificationsMutation.mutate()}><Trash2 size={14} /> Clear Notification History</Button>
            </Card>
          </motion.div>
        )}

        {tab === "privacy" && (
          <motion.div variants={staggerItem}>
            <Card>
              <SectionHeader label="Visibility" title="Public Hunter Profile" />
              <ToggleRow label="Public profile" description="Allow anyone with your Hunter link to view your public profile." checked={effectiveSettings.privacy.publicProfile} onChange={(v) => updateSetting("privacy", "publicProfile", v)} />
              <ToggleRow label="Show public stats" description="Show power score, XP, streak and attribute information on the public card." checked={effectiveSettings.privacy.showPublicStats} disabled={!effectiveSettings.privacy.publicProfile} onChange={(v) => updateSetting("privacy", "showPublicStats", v)} />
              <ToggleRow label="Show public achievements" description="Show your top achievements on the public Hunter page." checked={effectiveSettings.privacy.showPublicAchievements} disabled={!effectiveSettings.privacy.publicProfile} onChange={(v) => updateSetting("privacy", "showPublicAchievements", v)} />
            </Card>
          </motion.div>
        )}

        {tab === "preferences" && (
          <motion.div variants={staggerItem}>
            <Card>
              <SectionHeader label="Experience" title="System Preferences" />
              <ToggleRow label="Sound effects" description="Enable quest, rank, level-up and System interaction sounds." checked={effectiveSettings.preferences.soundEffects} onChange={(v) => updateSetting("preferences", "soundEffects", v)} />
              <ToggleRow label="Compact mode" description="Reduce spacing in supported System panels for a denser workspace." checked={effectiveSettings.preferences.compactMode} onChange={(v) => updateSetting("preferences", "compactMode", v)} />
              <div className="mt-5 p-4 rounded-xl border border-slate-800 bg-slate-900/50">
                <div className="flex items-center gap-3"><Monitor size={16} className="text-cyan-400" /><div><p className="text-sm font-semibold text-slate-200">Timezone</p><p className="text-xs text-slate-500">{profile.timezone || "UTC"}</p></div></div>
              </div>
            </Card>
          </motion.div>
        )}

        {tab === "report" && <WeeklyReportSettings />}

        {tab === "system" && (
          <motion.div variants={staggerItem} className="space-y-4">
            <SystemControl title="Recompute Stats" description="Force-recalculate productivity scores from recent activity." endpoint="/stats/recompute" />
            <Card>
              <SectionHeader label="Client" title="Application Status" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <StatusBox label="Browser notifications" value={"Notification" in window ? Notification.permission : "Unsupported"} />
                <StatusBox label="Service worker" value={"serviceWorker" in navigator ? "Available" : "Unavailable"} />
                <StatusBox label="Timezone" value={profile.timezone || "UTC"} />
              </div>
            </Card>
          </motion.div>
        )}

        {tab === "other" && (
          <motion.div variants={staggerItem} className="space-y-4">
            <Card>
              <SectionHeader label="Your Data" title="Export Account Data" />
              <p className="text-sm text-slate-500 mb-5">Download your account data in a format that works for backup, analysis or personal records.</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <ExportButton label="JSON" description="Complete structured data" icon="{}" onClick={() => downloadExport("json")} />
                <ExportButton label="Excel" description="Spreadsheet-compatible export" icon="XLS" onClick={() => downloadExport("excel")} />
                <ExportButton label="PDF" description="Readable account report" icon="PDF" onClick={() => downloadExport("pdf")} />
              </div>
            </Card>

            <Card>
              <SectionHeader label="Account" title="Danger Zone" />
              <div className="space-y-4">
                <div className="p-4 rounded-xl border border-yellow-500/20 bg-yellow-500/5">
                  <p className="font-semibold text-sm text-yellow-300">Deactivate account</p>
                  <p className="text-xs text-slate-500 mt-1 mb-3">Temporarily disables access. Your data remains stored and the account can be restored by an administrator.</p>
                  <input className="input max-w-sm mb-2" type="password" placeholder="Password" value={dangerPassword} onChange={(e) => setDangerPassword(e.target.value)} />
                  <br />
                  <Button variant="secondary" loading={deactivateMutation.isPending} onClick={() => { if (dangerPassword) deactivateMutation.mutate(dangerPassword); }}><Shield size={14} /> Deactivate</Button>
                </div>
                <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/5">
                  <p className="font-semibold text-sm text-red-300">Permanently delete account</p>
                  <p className="text-xs text-slate-500 mt-1 mb-3">This permanently deletes your profile, progression, quests, journals, reports, notifications and other personal records. This cannot be undone.</p>
                  <Button variant="danger" loading={deleteMutation.isPending} onClick={() => { if (dangerPassword && window.confirm("Permanently delete your account and personal data? This cannot be undone.")) deleteMutation.mutate(dangerPassword); }}><Trash2 size={14} /> Delete Account</Button>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}

function SessionRow({ session, loading, onRevoke }) {
  const Icon = session.device === "Mobile" ? Smartphone : session.device === "Tablet" ? Tablet : session.os === "macOS" ? Laptop : Monitor;
  const lastUsed = session.lastUsedAt ? new Date(session.lastUsedAt).toLocaleString() : "Unknown";
  const created = session.createdAt ? new Date(session.createdAt).toLocaleDateString() : "Unknown";
  return (
    <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0"><Icon size={18} className="text-cyan-400" /></div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-heading font-semibold text-sm text-slate-200">{session.deviceName || session.device}</p>
              {session.current && <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Current session</span>}
            </div>
            <p className="text-xs text-slate-500 mt-1">{session.browser} · {session.os}</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[11px] text-slate-600">
              <span className="flex items-center gap-1"><Globe size={11} /> {session.ipAddress}</span>
              <span className="flex items-center gap-1"><Clock size={11} /> Last active {lastUsed}</span>
              <span>Signed in {created}</span>
            </div>
          </div>
        </div>
        <Button size="sm" variant="secondary" disabled={loading} onClick={onRevoke}>{session.current ? "Sign Out" : "Revoke"}</Button>
      </div>
    </div>
  );
}

function ExportButton({ label, description, icon, onClick }) {
  return (
    <button type="button" onClick={onClick} className="text-left p-4 rounded-xl border border-slate-800 bg-slate-900/40 hover:border-cyan-500/30 hover:bg-cyan-500/5 transition-all">
      <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center font-heading font-bold text-xs">{icon}</div>
      <p className="font-heading font-semibold text-sm text-slate-200 mt-3">Download {label}</p>
      <p className="text-xs text-slate-500 mt-1">{description}</p>
    </button>
  );
}

function ToggleRow({ label, description, checked, onChange, disabled = false }) {
  return (
    <div className={`flex items-center justify-between gap-4 py-4 border-b border-slate-800/70 last:border-b-0 ${disabled ? "opacity-45" : ""}`}>
      <div className="min-w-0">
        <p className="font-heading font-semibold text-sm text-slate-200">{label}</p>
        <p className="font-body text-xs text-slate-500 mt-1 max-w-2xl">{description}</p>
      </div>
      <button type="button" disabled={disabled} onClick={() => onChange(!checked)} aria-pressed={checked} className={`relative w-11 h-6 rounded-full shrink-0 transition-all border ${checked ? "bg-cyan-500/30 border-cyan-400/50" : "bg-slate-800 border-slate-700"}`}>
        <span className={`absolute top-0.5 w-5 h-5 rounded-full transition-all flex items-center justify-center ${checked ? "left-[22px] bg-cyan-400 text-slate-950" : "left-0.5 bg-slate-500 text-transparent"}`}><Check size={11} /></span>
      </button>
    </div>
  );
}

function StatusBox({ label, value }) {
  return <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-800"><p className="text-[10px] uppercase tracking-widest text-slate-600">{label}</p><p className="font-heading text-sm text-slate-200 mt-1">{value}</p></div>;
}

function SystemControl({ title, description, endpoint }) {
  const mutation = useMutation({ mutationFn: () => api.post(endpoint) });
  return (
    <Card>
      <SectionHeader label="Data Engine" title="System Controls" />
      <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-slate-800/40 border border-slate-700/50">
        <div><p className="font-heading font-semibold text-sm text-slate-200">{title}</p><p className="font-body text-xs text-slate-500 mt-1">{description}</p></div>
        <Button size="sm" variant="secondary" loading={mutation.isPending} onClick={() => mutation.mutate()}>Run</Button>
      </div>
      {mutation.isSuccess && <p className="text-sm text-emerald-400 mt-3">✓ Completed successfully.</p>}
      {mutation.isError && <p className="text-sm text-red-400 mt-3">{mutation.error?.response?.data?.message || "Operation failed."}</p>}
    </Card>
  );
}

function WeeklyReportSettings() {
  const [generating, setGenerating] = useState(false);
  const { data, refetch } = useQuery({
    queryKey: ["weekly-report"],
    queryFn: async () => {
      try {
        const response = await api.get("/reports/weekly");
        return response.data.data;
      } catch {
        return null;
      }
    },
  });

  const generate = async () => {
    setGenerating(true);
    try { await api.post("/reports/generate"); await refetch(); } finally { setGenerating(false); }
  };

  return (
    <motion.div variants={staggerItem} className="space-y-4">
      <div className="flex justify-end"><Button variant="secondary" loading={generating} onClick={generate}><FileText size={14} /> Generate This Week's Report</Button></div>
      {data?.report ? <WeeklyReportCard report={data.report} /> : <Card><p className="font-body text-sm text-slate-500 text-center py-8">No report generated yet. Reports are auto-generated every Sunday, or you can generate one now.</p></Card>}
    </motion.div>
  );
}

function WeeklyReportCard({ report }) {
  const trendColor = report.productivityTrend === "rising" ? "text-emerald-400" : report.productivityTrend === "declining" ? "text-red-400" : "text-yellow-400";
  return (
    <Card>
      <div className="flex justify-between items-start mb-6">
        <div><h2 className="font-display text-2xl font-black text-gradient-hero print:text-black">HUNTER PROGRESS REPORT</h2><p className="font-heading text-slate-500 uppercase tracking-widest text-xs">Sector: Performance Intelligence</p></div>
        <Button variant="secondary" size="sm" onClick={() => window.print()} className="print:hidden">Download PDF</Button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Metric label="Quest Completion" value={`${Math.round((report.questCompletionRate || 0) * 100)}%`} />
        <Metric label="Total XP" value={(report.totalXPEarned || 0).toLocaleString()} />
        <Metric label="Focus Minutes" value={`${report.totalFocusMinutes || 0}m`} />
        <Metric label="Streak" value={`${report.streakPerformance || 0}d`} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-800"><p className="text-xs text-slate-500">Productivity Trend</p><p className={`font-display text-xl mt-1 uppercase ${trendColor}`}>{report.productivityTrend}</p></div>
        <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-800"><p className="text-xs text-slate-500">Most Improved</p><p className="font-heading text-sm text-slate-200 mt-1">{report.mostImprovedStat || "N/A"} · +{report.mostImprovedStatDelta || 0}</p></div>
      </div>
      {report.personalizedRecommendations?.length > 0 && <div className="mt-5"><p className="text-xs uppercase tracking-widest text-slate-600 mb-2">System Recommendations</p><ul className="space-y-2">{report.personalizedRecommendations.map((item, index) => <li key={index} className="text-sm text-slate-400">• {item}</li>)}</ul></div>}
    </Card>
  );
}

function Metric({ label, value }) {
  return <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-800"><p className="text-xs text-slate-500">{label}</p><p className="font-display text-xl text-slate-100 mt-1">{value}</p></div>;
}
