// lib/useDevice.ts
import { useEffect, useState } from "react";

export type Device = "mobile" | "tablet" | "laptop" | "desktop" | "ultrawide";

export function useDevice(): Device {
  const [device, setDevice] = useState<Device>("desktop");

  useEffect(() => {
    function update() {
      const w = window.innerWidth;
      if (w < 640) {
        setDevice("mobile");
      } else if (w < 1024) {
        setDevice("tablet");
      } else if (w < 1280) {
        setDevice("laptop");
      } else if (w < 1920) {
        setDevice("desktop");
      } else {
        setDevice("ultrawide");
      }
    }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return device;
}
