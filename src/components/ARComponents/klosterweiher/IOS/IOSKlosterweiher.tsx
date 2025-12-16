// TODO implement IOS fallback AR using mindar for image-tracking
import React from 'react';

interface ARViewProps {
  onNavigateHome?: () => void;
}

export const IOSKlosterweiherView: React.FC<ARViewProps> = ({ onNavigateHome }) => {
  return (
    <div className="flex h-full flex-col items-center justify-center p-6 text-center">
      <h2 className="mb-2 text-2xl font-semibold">AR on iOS</h2>
      <p className="mb-4 text-gray-600">
        Image-tracking fallback for iOS is not ready yet. We’ll add MindAR-based tracking here.
      </p>
      {onNavigateHome && (
        <button
          className="rounded bg-blue-600 px-4 py-2 text-white"
          onClick={onNavigateHome}
        >
          Back
        </button>
      )}
    </div>
  );
};

export default IOSKlosterweiherView;