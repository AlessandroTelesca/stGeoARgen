import React from 'react';

type MobileOnlyNoticeProps = {
  title?: string;
  description?: string;
};

export const MobileOnlyNotice = ({
  title = 'We only support mobile devices.',
  description = 'Please access this AR experience on a mobile device (Android or iOS).',
}: MobileOnlyNoticeProps) => {
  return (
    <div className="flex items-center justify-center h-screen p-4">
      <div className="text-center">
        <h2 className="text-xl font-bold mb-4">{title}</h2>
        <p>{description}</p>
      </div>
    </div>
  );
};

export default MobileOnlyNotice;