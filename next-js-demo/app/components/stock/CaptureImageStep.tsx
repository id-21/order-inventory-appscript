"use client";

import ImageCapture from "@/app/components/stock/ImageCapture";
import DownloadLogsButton from "@/app/components/stock/DownloadLogsButton";

interface CaptureImageStepProps {
  capturedImage: string;
  setCapturedImage: (image: string) => void;
  onDownloadLogs: () => void;
  onProceedToSubmit: () => void;
  onBack: () => void;
}

export default function CaptureImageStep({
  capturedImage,
  setCapturedImage,
  onDownloadLogs,
  onProceedToSubmit,
  onBack,
}: CaptureImageStepProps) {
  return (
    <div className="space-y-6">
      <ImageCapture
        onImageCapture={setCapturedImage}
        capturedImage={capturedImage}
      />

      <div className="flex flex-col gap-3">
        <DownloadLogsButton onClick={onDownloadLogs} />
        <button
          onClick={onProceedToSubmit}
          disabled={!capturedImage}
          className="w-full px-8 py-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-xl"
        >
          Continue
        </button>
        {!capturedImage && (
          <p className="text-center text-base text-red-600 font-medium">
            Photo is required. Please capture or upload an image.
          </p>
        )}
        <button
          onClick={onBack}
          className="text-center text-base text-gray-600 hover:text-gray-800"
        >
          ← Back
        </button>
      </div>
    </div>
  );
}