import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bảng giá Bếp | Kizuna",
  description: "Xem bảng giá chi tiết đã được phê duyệt cho từng bếp.",
};

export default function PriceListLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
