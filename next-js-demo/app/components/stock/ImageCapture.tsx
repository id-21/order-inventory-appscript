"use client";

import { useState, useRef } from "react";

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

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setStream(mediaStream);
      setUseCamera(true);
    } catch (err) {
      console.error("Error accessing camera:", err);
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
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Capture Proof of Shipment
        </h3>
        <p className="text-sm text-gray-600">
          Take a photo or upload an image of the shipment
        </p>
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
              className="absolute top-2 right-2 px-3 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium"
            >
              Remove
            </button>
          </div>
          <p className="text-sm text-green-600 font-medium">
            ✓ Image captured successfully
          </p>
        </div>
      ) : (
        <>
          {useCamera ? (
            <div className="space-y-3">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full rounded-lg border-2 border-green-500"
              />
              <div className="flex gap-3">
                <button
                  onClick={capturePhoto}
                  className="flex-1 px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium"
                >
                  📸 Capture Photo
                </button>
                <button
                  onClick={stopCamera}
                  className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={startCamera}
                className="p-6 bg-blue-50 border-2 border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <div className="text-4xl mb-2">📷</div>
                <div className="font-medium text-blue-900">Use Camera</div>
                <div className="text-sm text-blue-700 mt-1">
                  Take a photo now
                </div>
              </button>

              <label className="p-6 bg-green-50 border-2 border-green-200 rounded-lg hover:bg-green-100 transition-colors cursor-pointer">
                <div className="text-4xl mb-2">📁</div>
                <div className="font-medium text-green-900">Upload File</div>
                <div className="text-sm text-green-700 mt-1">
                  Choose from gallery
                </div>
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

      {!capturedImage && !useCamera && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            ⚠️ Image is optional but recommended for proof of shipment
          </p>
        </div>
      )}
    </div>
  );
}
