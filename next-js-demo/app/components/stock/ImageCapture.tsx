"use client";

import { useState, useRef, useEffect } from "react";

interface ImageCaptureProps {
  onImageCapture: (base64Image: string) => void;
  capturedImage: string | null;
}

export default function ImageCapture({
  onImageCapture,
  capturedImage,
}: ImageCaptureProps) {
  const [useCamera, setUseCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  // FIX: This waits for the video element to exist, then connects the stream
  useEffect(() => {
    if (useCamera && videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [useCamera, stream]);

  const startCamera = async (retryCount = 0) => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      
      // Removed the broken code here. The useEffect handles the connection now.
      
      setStream(mediaStream);
      setUseCamera(true);
    } catch (err) {
      console.error("Error accessing camera:", err);

      // Retry once after 500ms if first attempt fails (camera might still be releasing)
      if (retryCount === 0) {
        console.log("Retrying camera access in 500ms...");
        await new Promise(resolve => setTimeout(resolve, 500));
        return startCamera(1);
      }

      alert("Failed to access camera. Please check permissions.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setUseCamera(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");

      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0);

        const base64Image = canvas.toDataURL("image/jpeg", 0.8);
        onImageCapture(base64Image);
        stopCamera();
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64Image = event.target?.result as string;
        onImageCapture(base64Image);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    onImageCapture("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-3xl font-bold text-gray-900">
          Shipment Photo
        </h3>
        <p className="text-lg font-medium text-red-600 mt-1">Required</p>
      </div>

      {capturedImage ? (
        <div className="space-y-3">
          <div className="relative">
            <img
              src={capturedImage}
              alt="Captured"
              className="w-full rounded-lg border-2 border-gray-300"
            />
            <button
              onClick={handleRemoveImage}
              className="absolute top-2 right-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-base font-medium"
            >
              Remove
            </button>
          </div>
          <p className="text-lg text-green-600 font-medium">
            Image captured successfully
          </p>
        </div>
      ) : (
        <>
          {useCamera ? (
            <div className="space-y-4">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full rounded-lg border-2 border-green-500"
                style={{ minHeight: "50vh" }}
              />
              <div className="flex gap-3">
                <button
                  onClick={capturePhoto}
                  className="flex-1 px-8 py-5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium text-2xl"
                >
                  Capture Photo
                </button>
                <button
                  onClick={stopCamera}
                  className="px-6 py-5 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium text-xl"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              <button
                onClick={() => startCamera()}
                className="py-8 bg-blue-50 border-2 border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <div className="font-medium text-blue-900 text-xl">Take Photo</div>
              </button>

              <label className="py-8 bg-green-50 border-2 border-green-200 rounded-lg hover:bg-green-100 transition-colors cursor-pointer">
                <div className="font-medium text-green-900 text-xl">Upload from Gallery</div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          )}

          <canvas ref={canvasRef} className="hidden" />
        </>
      )}
    </div>
  );
}