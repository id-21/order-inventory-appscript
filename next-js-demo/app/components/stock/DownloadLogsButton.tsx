"use client";

interface DownloadLogsButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

export default function DownloadLogsButton({
  onClick,
  disabled = false,
}: DownloadLogsButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full px-6 py-3 bg-gray-100 text-gray-700 border-2 border-gray-300 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors font-medium text-lg flex items-center justify-center gap-2"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={2}
        stroke="currentColor"
        className="w-5 h-5"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
        />
      </svg>
      Download Session Logs
    </button>
  );
}