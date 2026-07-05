import type { ReactNode } from "react";

const AdminLayout = ({ children }: { children: ReactNode }) => {
  return (
    <div className="fixed inset-0 overflow-auto bg-slate-50 px-8 py-10">
      <div className="mx-auto w-full max-w-[1400px] min-h-screen">
        {children}
      </div>
    </div>
  );
};

export default AdminLayout;
