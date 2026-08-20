# CasinFreight Driver (Flutter)

Phone app for assigned drivers. Same Firebase project as the web console.

What it does:

- Live GPS of the truck while a trip is open (dispatch sees it on the trip in the web app)
- Pickup and delivery GPS stamps with time
- Camera photos of seal, container, and parcel
- Dispatch signature and warehouse / consignee proof-of-delivery signature
- If Location is turned off or mock GPS is used, the driver cannot photo or sign, and the web office gets a GPS-off / fake-GPS flag with the time

## What the phone cannot do

Android and iOS will not let an ordinary app **lock** the Location toggle. We do not silently fake a track if GPS is off. The app refuses work and the web board shows **GPS off**.

True kiosk lock (driver cannot open Settings) needs Android Enterprise / MDM. That is a later ops setup, not this app.

## Run

1. Invite the driver under **Company & Team** as role **Driver**.
2. On **Driver Roster**, save the **same email** on that driver.
3. Assign them on a trip.
4. From this folder:

```bash
cd mobile/casinfreight_driver
flutter pub get
flutter run
```

Firebase options default to the CasinFreight web project. In Firebase Console add an **Android** app with package `com.casinfreight.casinfreight_driver` (and an iOS bundle if you ship to iPhone).

## Web

Open the trip on the CasinFreight board. **Driver app · live GPS & field captures** shows the map ping, photos, signatures, and timestamps.
