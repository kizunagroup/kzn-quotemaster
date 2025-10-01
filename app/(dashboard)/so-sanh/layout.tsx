import { Metadata } from "next";

export const metadata: Metadata = {
  title: "So sánh Báo giá | Kizuna",
  description: "So sánh, đàm phán và phê duyệt báo giá từ nhiều nhà cung cấp.",
};

export default function ComparisonLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
