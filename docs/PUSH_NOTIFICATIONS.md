# Device streak reminders

Device reminders use Web Push and require HTTPS (localhost is also supported). Generate one VAPID key pair in the server package:

```sh
node --input-type=module -e "import webPush from 'web-push'; console.log(webPush.generateVAPIDKeys())"
```

Set the returned `publicKey` and `privateKey` as `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` in `server/.env` and in the server hosting provider's secrets. Set `VAPID_SUBJECT` to a `mailto:` address you control. Keep the private key secret and stable; changing it invalidates existing device subscriptions.

Members connect each browser or installed PWA separately from Settings -> Notifications. The server checks every minute and sends one gentle reminder at the selected local time only when that account has not already been active that day. Browser permission, the master notification setting, and the progression category must all be enabled. Reminders are opt-in and can be paused or disconnected per device. Missing a day pauses a streak without removing XP; completing the next full day starts a new streak and grants a return XP bonus.
