import Image from "next/image";

/** Logo NEVIAD (public/neviad-logo-round.png, chữ ký "Nevial" nền kem). Cao 1,6em nên tự co theo cỡ chữ của chỗ đặt; ảnh có màu riêng, không đổi theo `color`. */
export default function NeviadMark() {
  return <Image src="/neviad-logo-round.png" alt="" aria-hidden="true" width={1254} height={1254} loading="eager" style={{ width: "1.6em", height: "1.6em", flex: "none", borderRadius: "25%" }} />;
}
