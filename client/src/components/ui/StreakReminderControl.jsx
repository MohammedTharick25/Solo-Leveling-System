import { useEffect, useState } from "react";
import { BellRing, Check, LoaderCircle, Smartphone, Unplug } from "lucide-react";
import api from "../../lib/api.js";

const decodeKey = (value) => {
  const padded = `${value}${"=".repeat((4 - (value.length % 4)) % 4)}`;
  const binary = atob(padded.replaceAll("-", "+").replaceAll("_", "/"));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
};

const sameKey = (currentKey, expectedKey) => {
  if (!currentKey || currentKey.byteLength !== expectedKey.byteLength) return false;
  return new Uint8Array(currentKey).every((byte, index) => byte === expectedKey[index]);
};

export default function StreakReminderControl({ enabled, time, onPreferenceChange }) {
  const [reminderTime, setReminderTime] = useState(time || "19:00");
  const [connected, setConnected] = useState(false);
  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState("");
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

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
      const applicationServerKey = decodeKey(publicKey);
      let subscription = await registration.pushManager.getSubscription();
      if (subscription && !sameKey(subscription.options?.applicationServerKey, applicationServerKey)) {
        await api.delete("/notifications/push/subscribe", { data: { endpoint: subscription.endpoint } });
        await subscription.unsubscribe();
        subscription = null;
      }
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey,
        });
      }
      await api.post("/notifications/push/subscribe", {
        subscription: subscription.toJSON(),
        timeZone,
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
    setBusy(true);
    try {
      const reminderEnabled = Boolean(enabled && connected);
      await api.patch("/notifications/push/reminder", { enabled: reminderEnabled, time: reminderTime });
      onPreferenceChange?.(reminderEnabled, reminderTime);
      setMessage("Reminder time saved.");
    } catch (error) {
      setMessage(error.response?.data?.message || "Could not save reminder time.");
    } finally {
      setBusy(false);
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

  const sendTest = async () => {
    setTesting(true);
    setMessage("");
    try {
      if (!("Notification" in window)) {
        throw new Error("This browser does not support device notifications.");
      }
      if (Notification.permission !== "granted") {
        throw new Error("Browser notifications are blocked. Allow them in this site's browser settings, then test again.");
      }
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        setConnected(false);
        throw new Error("This browser subscription is missing. Connect this device again.");
      }
      await api.post("/notifications/push/test", { endpoint: subscription.endpoint });
      setMessage("Test sent. Check this device's notification tray.");
    } catch (error) {
      setMessage(error.response?.data?.message || error.message || "Could not send the test notification.");
    } finally {
      setTesting(false);
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
          <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950/60 px-2.5 py-2">
            <span className="text-[10px] uppercase tracking-wider text-slate-500">Local time</span>
            <input type="time" value={reminderTime} onChange={(event) => setReminderTime(event.target.value)} aria-label="Daily reminder time" className="w-24 bg-transparent text-sm font-semibold text-slate-100 outline-none [color-scheme:dark]" />
            <button type="button" disabled={busy} onClick={saveTime} className="grid h-7 w-7 place-items-center rounded-md text-cyan-200 transition hover:bg-cyan-300/10 disabled:opacity-50" title="Save reminder time" aria-label="Save reminder time"><Check size={15} /></button>
          </div>
          <button type="button" role="switch" aria-checked={Boolean(enabled)} aria-label="Toggle daily streak reminder" disabled={busy} onClick={toggleReminder} className={`relative grid h-7 w-12 shrink-0 place-items-center rounded-full border transition-colors disabled:opacity-50 ${enabled ? "border-cyan-300/50 bg-cyan-300/30" : "border-slate-700 bg-slate-800"}`}>
            <span className={`absolute left-[3px] top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-white shadow transition-transform duration-200 ${enabled ? "translate-x-[26px]" : "translate-x-0"}`} />
          </button>
          {!connected ? (
            <button type="button" disabled={busy} onClick={connectDevice} className="inline-flex items-center gap-2 rounded-lg border border-cyan-300/25 bg-cyan-300/[0.08] px-3 py-2 text-xs font-semibold text-cyan-100 transition hover:border-cyan-200/50 hover:bg-cyan-300/[0.13] disabled:opacity-50">
              <Smartphone size={13} /> {busy ? "Connecting..." : "Connect device"}
            </button>
          ) : (
            <button type="button" title="Disconnect this device" aria-label="Disconnect this device" disabled={busy} onClick={disconnectDevice} className="grid h-8 w-8 place-items-center rounded-md border border-slate-800 text-slate-500 transition hover:border-red-300/30 hover:text-red-200 disabled:opacity-50"><Unplug size={14} /></button>
          )}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[10px]">
        <span className="text-slate-500">Timezone: <span className="font-semibold text-slate-300">{timeZone}</span></span>
        <span className={connected ? "text-emerald-300" : "text-slate-600"}>{connected ? "This device is connected" : "Connect this device to receive reminders"}</span>
      </div>
      {connected && (
        <button type="button" onClick={sendTest} disabled={testing || busy} className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-semibold text-cyan-200 transition hover:text-cyan-100 disabled:cursor-wait disabled:opacity-50">
          {testing ? <LoaderCircle size={12} className="animate-spin" /> : <BellRing size={12} />}
          {testing ? "Sending test..." : "Send test notification"}
        </button>
      )}
      {message && <p role="status" className="mt-2 text-[11px] text-cyan-100/80">{message}</p>}
    </div>
  );
}