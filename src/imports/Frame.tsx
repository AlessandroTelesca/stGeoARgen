function Frame1() {
  return (
    <div className="absolute bg-[#f5f1e9] h-[1011px] left-[calc(15.625%+10px)] rounded-[15px] top-[calc(58.333%-74.5px)] translate-x-[-50%] translate-y-[-50%] w-[582px]">
      <div className="h-[1011px] overflow-clip relative rounded-[inherit] w-[582px]">
        <p className="absolute font-['Plus_Jakarta_Sans:Regular',sans-serif] font-normal leading-[1.1] left-[21px] text-[70px] text-black top-[332px] tracking-[-1.54px] w-[470px]">Hauptziele</p>
        <div className="absolute flex items-center justify-center left-[94px] size-[300px] top-[596px]">
          <div className="flex-none scale-y-[-100%]">
            <div className="size-[300px]" data-name="4d898fab-efb2-5c5c-8682-ce4a836aeec6 1" />
          </div>
        </div>
      </div>
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none rounded-[15px]" />
    </div>
  );
}

function NumberSubtitleBody() {
  return <div className="absolute left-[104px] size-[40px] top-[660px]" data-name="Number+Subtitle+Body" />;
}

function NumberBulletOrEmoji() {
  return (
    <div className="overflow-clip relative shrink-0 size-[40px]" data-name="# / # Number, • Bullet or 🚀 Emoji">
      <div className="absolute bg-black left-0 rounded-[100px] size-[40px] top-0" />
    </div>
  );
}

function TextBlock() {
  return (
    <div className="content-stretch flex flex-col gap-[8px] items-start overflow-clip relative shrink-0 text-black" data-name="Text block">
      <p className="font-['Plus_Jakarta_Sans:Bold',sans-serif] font-bold leading-[1.5] relative shrink-0 text-[40px] tracking-[2.8px] w-[514px]">Tourismus Förderung</p>
      <ul className="block font-['Plus_Jakarta_Sans:Regular',sans-serif] font-normal leading-[0] min-w-full relative shrink-0 text-[22px] tracking-[-0.484px] w-[min-content]">
        <li className="mb-0 ms-[33px]">
          <span className="leading-[1.5]">Erweiterung des Touristischen Angebots durch interaktive und gameifizierte AR-Erlebnisse</span>
        </li>
        <li className="mb-0 ms-[33px]">
          <span className="leading-[1.5]">Aufenthalt soll spanneneder und informativer gestalltet werden</span>
        </li>
        <li className="mb-0 ms-[33px]">
          <span className="leading-[1.5]">Unterstüzung der Besucher bei der Orientierung durch digitale Wegweiser, Infopunkte und das Maskottchen</span>
        </li>
        <li className="ms-[33px]">
          <span className="leading-[1.5]">Nachhaltigen Tourismus unterstützen (Weniger beschilderung)</span>
        </li>
      </ul>
    </div>
  );
}

function NumberSubtitleBody1() {
  return (
    <div className="absolute content-stretch flex gap-[56px] items-start left-[104px] overflow-clip top-[56px]" data-name="Number+Subtitle+Body">
      <NumberBulletOrEmoji />
      <TextBlock />
    </div>
  );
}

function NumberBulletOrEmoji1() {
  return (
    <div className="overflow-clip relative shrink-0 size-[40px]" data-name="# / # Number, • Bullet or 🚀 Emoji">
      <div className="absolute bg-black left-0 rounded-[100px] size-[40px] top-0" />
    </div>
  );
}

function TextBlock1() {
  return (
    <div className="content-stretch flex flex-col gap-[8px] items-start overflow-clip relative shrink-0 text-black" data-name="Text block">
      <p className="font-['Plus_Jakarta_Sans:Bold',sans-serif] font-bold leading-[1.5] relative shrink-0 text-[40px] tracking-[2.8px] w-[514px]">Stärkung der lokalen Gemeinschaft</p>
      <ul className="block font-['Plus_Jakarta_Sans:Regular',sans-serif] font-normal leading-[0] min-w-full relative shrink-0 text-[22px] tracking-[-0.484px] w-[min-content]">
        <li className="mb-0 ms-[33px]">
          <span className="leading-[1.5]">Einbindung lokaler Akteure: Museen, Vereine, etc</span>
        </li>
        <li className="ms-[33px]">
          <span className="leading-[1.5]">moderner und technologieoffener Ort, der Tradition und Zukunft intelligent verbindet</span>
        </li>
      </ul>
    </div>
  );
}

function NumberSubtitleBody2() {
  return (
    <div className="absolute content-stretch flex gap-[56px] items-start left-[104px] overflow-clip top-[579px]" data-name="Number+Subtitle+Body">
      <NumberBulletOrEmoji1 />
      <TextBlock1 />
    </div>
  );
}

function Frame2() {
  return (
    <div className="absolute bg-[#f5f1e9] h-[1011px] left-[calc(65.625%+20px)] rounded-[15px] top-[calc(58.333%-74.5px)] translate-x-[-50%] translate-y-[-50%] w-[1280px]">
      <div className="h-[1011px] overflow-clip relative rounded-[inherit] w-[1280px]">
        <NumberSubtitleBody />
        <NumberSubtitleBody1 />
        <NumberSubtitleBody2 />
      </div>
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none rounded-[15px]" />
    </div>
  );
}

export default function Frame() {
  return (
    <div className="bg-[#f5f1e9] relative size-full" data-name="Frame">
      <Frame1 />
      <p className="absolute font-['Plus_Jakarta_Sans:SemiBold',sans-serif] font-semibold leading-[1.1] left-[19px] text-[22px] text-black text-nowrap top-[16px] tracking-[1.54px] uppercase whitespace-pre">St.GeoARgen</p>
      <p className="absolute font-['Plus_Jakarta_Sans:SemiBold',sans-serif] font-semibold leading-[1.1] left-[calc(93.75%+53px)] text-[22px] text-black text-nowrap top-[16px] tracking-[1.54px] uppercase whitespace-pre">HFU</p>
      <Frame2 />
    </div>
  );
}