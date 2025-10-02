import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bảng giá Bếp | QuoteMaster",
};

export default function PriceListLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
