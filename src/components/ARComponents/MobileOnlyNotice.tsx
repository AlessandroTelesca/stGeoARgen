import { Smartphone } from 'lucide-react';

type MobileOnlyNoticeProps = {
  title?: string;
  description?: string;
};

export const MobileOnlyNotice = ({
  title = 'We only support mobile devices.',
  description = 'Please access this AR experience on a mobile device (Android or iOS).',
}: MobileOnlyNoticeProps) => {
  return (
    <div className="min-h-[100dvh] brand-gradient relative flex items-center justify-center p-6 text-white overflow-hidden">
      <div className="topo-texture absolute inset-0" aria-hidden="true" />
      <div className="relative max-w-sm text-center">
        <span className="mx-auto mb-6 flex w-20 h-20 items-center justify-center rounded-full bg-white text-primary shadow-lg">
          <Smartphone className="w-9 h-9" />
        </span>
        <h2 className="text-2xl font-extrabold tracking-tight mb-3">{title}</h2>
        <p className="text-white/85 leading-relaxed">{description}</p>
      </div>
    </div>
  );
};

export default MobileOnlyNotice;
