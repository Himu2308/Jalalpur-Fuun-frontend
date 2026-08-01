"use client";

import { useEffect, useId, useRef, useState } from "react";

const CameraIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <path
      d="M4 8a2 2 0 0 1 2-2h2l1.2-1.6A2 2 0 0 1 10.8 3h2.4a2 2 0 0 1 1.6.8L16 5h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8Z"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
    <circle cx="12" cy="13" r="3.2" stroke="currentColor" strokeWidth="1.6" />
  </svg>
);

const ImageIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <rect x="3.5" y="4.5" width="17" height="15" rx="2" stroke="currentColor" strokeWidth="1.6" />
    <circle cx="8.5" cy="9.5" r="1.5" stroke="currentColor" strokeWidth="1.6" />
    <path
      d="M4 16l4.5-4.5a2 2 0 0 1 2.8 0L15 15l1.2-1.2a2 2 0 0 1 2.8 0L20 15"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
  </svg>
);

// Wraps html5-qrcode's low-level Html5Qrcode API instead of its Html5QrcodeScanner
// auto-UI (which renders unstyled default buttons/links) so we can offer two clearly
// designed entry points: live camera, or picking an image file of a QR code.
export default function QrScanner({ onScan }) {
  const readerId = `qr-reader-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const html5QrRef = useRef(null);
  const fileInputRef = useRef(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    return () => {
      if (html5QrRef.current && cameraActive) {
        html5QrRef.current.stop().catch(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function getScanner() {
    if (!html5QrRef.current) {
      const { Html5Qrcode } = await import("html5-qrcode");
      html5QrRef.current = new Html5Qrcode(readerId);
    }
    return html5QrRef.current;
  }

  async function startCamera() {
    setError("");
    setStarting(true);
    setCameraActive(true); // show the container first so html5-qrcode can size the video into it
    try {
      const scanner = await getScanner();
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: 240 },
        (decodedText) => onScan(decodedText),
        () => {}
      );
    } catch (err) {
      setCameraActive(false);
      setError("Could not access the camera. Try uploading an image instead.");
    } finally {
      setStarting(false);
    }
  }

  async function stopCamera() {
    try {
      await html5QrRef.current?.stop();
    } catch (err) {
      // ignore
    }
    setCameraActive(false);
  }

  async function handleFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError("");
    try {
      if (cameraActive) await stopCamera();
      const scanner = await getScanner();
      const decoded = await scanner.scanFile(file, false);
      onScan(decoded);
    } catch (err) {
      setError("Could not find a QR code in that image.");
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div id={readerId} className={cameraActive ? "overflow-hidden rounded-2xl" : "hidden"} />

      {!cameraActive && (
        <div className="grid grid-cols-1 gap-3">
          <button type="button" className="btn" onClick={startCamera} disabled={starting}>
            <CameraIcon />
            {starting ? "Starting..." : "Start Camera"}
          </button>
          {/* <button type="button" className="btn btn-secondary" onClick={() => fileInputRef.current?.click()}>
            <ImageIcon />
            Upload Image
          </button> */}
        </div>
      )}

      {cameraActive && (
        <button type="button" className="btn btn-secondary" onClick={stopCamera}>
          Stop Camera
        </button>
      )}

      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />

      {error && <p className="error-text text-center">{error}</p>}
    </div>
  );
}
