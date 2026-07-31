import { requireUser } from "@/lib/auth/dal";

// 會員區:所有頁面先驗證登入(單一裝置 session 也在此被強制執行)。
export default async function MemberLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireUser();
  return <>{children}</>;
}
