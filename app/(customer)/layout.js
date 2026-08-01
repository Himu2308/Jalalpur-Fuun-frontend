import BottomNav from "@/components/BottomNav";

export default function CustomerLayout({ children }) {
  return (
    <>
      <div style={{ paddingBottom: 76 }}>{children}</div>
      <BottomNav />
    </>
  );
}
