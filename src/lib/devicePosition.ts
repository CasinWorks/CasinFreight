export type DevicePosition = {
  lat: number;
  lng: number;
  accuracyM?: number;
};

/** One GPS fix from the phone. Used when the driver taps arrived at pickup or destination. */
export function readDevicePosition(): Promise<DevicePosition> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return Promise.reject(new Error('This phone cannot read GPS. Turn location on, then tap again.'));
  }
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracyM: Number.isFinite(pos.coords.accuracy) ? pos.coords.accuracy : undefined,
        });
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          reject(new Error('Allow location for CasinFreight, then tap again.'));
          return;
        }
        if (err.code === err.TIMEOUT) {
          reject(new Error('GPS took too long. Step into open sky or turn location on, then tap again.'));
          return;
        }
        reject(new Error('Could not read GPS. Turn location on, then tap again.'));
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 10000 }
    );
  });
}
