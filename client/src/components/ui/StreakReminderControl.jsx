import { useEffect, useState } from "react";
import { BellRing, Smartphone, Unplug } from "lucide-react";
import api from "../../lib/api.js";

const decodeKey = (value) => {
  const padded = `${value}${"=".repeat((4 - (value.length % 4)) % 4)}`;
  const binary = atob(padded.replaceAll("-", "+").replaceAll("_", "/"));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
};

export default function StreakReminderControl({ enabled, time, onPreferenceChange }) {
  const [reminderTime, setReminderTime] = useState(time || "19:00");
  const [connected, setConnected] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setReminderTime(time || "19:00");
  }, [time]);

  useEffect(() => {
    let mounted = true;
    const readSubscription = async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (mounted) setConnected(Boolean(subscription));
      } catch {
        if (mounted) setConnected(false);
      }
    };
    readSubscription();
    return () => { mounted = false; };
  }, []);

  const connectDevice = async () => {
    setBusy(true);
    setMessage("");
    try {
      if (!window.isSecureContext || !("Notification" in window) || !("PushManager" in window)) {
        throw new Error("Device reminders need an installed/secure browser with push support.");
      }
      const { data: keyResponse } = await api.get("/notifications/push/public-key");
      const publicKey = keyResponse.data.publicKey;
      if (!publicKey) throw new Error("Device reminders are not configured on this server yet.");
      const permission = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
      if (permission !== "granted") throw new Error("Allow notifications in your browser settings to connect this device.");

      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: decodeKey(publicKey),
        });
      }
      await api.post("/notifications/push/subscribe", {
        subscription: subscription.toJSON(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
        time: reminderTime,
      });
      setConnected(true);
      onPreferenceChange?.(true, reminderTime);
      setMessage("This device is connected.");
    } catch (error) {
      setMessage(error.response?.data?.message || error.message || "Could not connect this device.");
    } finally {
      setBusy(false);
    }
  };

  const saveTime = async () => {
    try {
      await api.patch("/notifications/push/reminder", { enabled: Boolean(enabled), time: reminderTime });
      onPreferenceChange?.(Boolean(enabled), reminderTime);
      setMessage("Reminder time saved.");
    } catch (error) {
      setMessage(error.response?.data?.message || "Could not save reminder time.");
    }
  };

  const toggleReminder = async () => {
    if (!enabled) {
      await connectDevice();
      return;
    }
    setBusy(true);
    try {
      await api.patch("/notifications/push/reminder", { enabled: false, time: reminderTime });
      onPreferenceChange?.(false, reminderTime);
      setMessage("Your device reminder is paused.");
    } catch (error) {
      setMessage(error.response?.data?.message || "Could not pause the reminder.");
    } finally {
      setBusy(false);
    }
  };

  const disconnectDevice = async () => {
    setBusy(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await api.delete("/notifications/push/subscribe", { data: { endpoint: subscription.endpoint } });
        await subscription.unsubscribe();
      }
      setConnected(false);
      onPreferenceChange?.(false, reminderTime);
      setMessage("This device was disconnected.");
    } catch (error) {
      setMessage(error.response?.data?.message || "Could not disconnect this device.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-4 rounded-xl border border-cyan-300/15 bg-cyan-300/[0.035] p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-cyan-300/15 bg-cyan-300/[0.08] text-cyan-200"><BellRing size={16} /></div>
          <div>
            <p className="text-sm font-semibold text-slate-100">Daily streak reminder</p>
            <p className="mt-1 max-w-xl text-xs leading-relaxed text-slate-500">A gentle nudge on this device. It stays optional, and returning is always a win.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 sm:justify-end">
          <label className="flex items-center gap-2 text-xs text-slate-400">
            <span>Local time</span>
            <input type="time" value={reminderTime} onChange={(event) => setReminderTime(event.target.value)} onBlur={saveTime} className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-200 outline-none focus:border-cyan-300/50" />
          </label>
          {connected ? (
            <button type="button" role="switch" aria-checked={Boolean(enabled)} aria-label="Toggle daily streak reminder" disabled={busy} onClick={toggleReminder} className={`relative h-6 w-11 shrink-0 rounded-full border transition-colors disabled:opacity-50 ${enabled ? "border-cyan-300/50 bg-cyan-300/30" : "border-slate-700 bg-slate-800"}`}>
              <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${enabled ? "translate-x-5" : "translate-x-0.5"}`} />
            </button>
          ) : (
            <button type="button" disabled={busy} onClick={connectDevice} className="inline-flex items-center gap-2 rounded-lg border border-cyan-300/25 bg-cyan-300/[0.08] px-3 py-2 text-xs font-semibold text-cyan-100 transition hover:border-cyan-200/50 hover:bg-cyan-300/[0.13] disabled:opacity-50">
              <Smartphone size={13} /> {busy ? "Connecting..." : "Connect this device"}
            </button>
          )}
          {connected && (
            <button type="button" title="Disconnect this device" aria-label="Disconnect this device" disabled={busy} onClick={disconnectDevice} className="grid h-8 w-8 place-items-center rounded-md border border-slate-800 text-slate-500 transition hover:border-red-300/30 hover:text-red-200 disabled:opacity-50"><Unplug size={14} /></button>
          )}
        </div>
      </div>
      {message && <p role="status" className="mt-3 text-[11px] text-cyan-100/80">{message}</p>}
    </div>
  );
}