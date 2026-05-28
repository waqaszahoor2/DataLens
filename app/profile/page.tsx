"use client";

import { useState } from "react";
import Sidebar from "@/components/sidebar/Sidebar";
import Topbar from "@/components/topbar/Topbar";
import { useCanvasStore } from "@/store/useCanvasStore";
import { useDevice } from "@/lib/useDevice";
import { User, Mail, Shield, Save, Eye, EyeOff, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function ProfilePage() {
  const { isDarkMode } = useCanvasStore();
  const device = useDevice();

  // User mock state
  const [name, setName] = useState("Power Analyst");
  const [email, setEmail] = useState("analyst@datalens.ai");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPass, setShowPass] = useState(false);

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Profile details updated successfully!");
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword || !newPassword) {
      toast.error("Please fill in old and new password fields.");
      return;
    }
    toast.success("Security password changed successfully!");
    setOldPassword("");
    setNewPassword("");
  };

  const handleLogout = () => {
    localStorage.removeItem("datalens-user");
    toast.success("Log out successful!");
    window.location.href = "/auth/login";
  };

  const isMobile = device === "mobile";

  // Dynamic layout margins based on responsive sidebar collapse state
  const paddingLeftClass = isMobile
    ? "pl-0"
    : device === "tablet"
      ? "pl-14"
      : "pl-56 3xl:pl-64";

  return (
    <div className={cn("h-screen flex overflow-hidden", isDarkMode ? "bg-gray-950" : "bg-surface2")}>
      <Sidebar />

      <div className={cn("flex-grow flex flex-col min-w-0 transition-all duration-300", paddingLeftClass)}>
        <Topbar />

        <main className="flex-1 overflow-y-auto custom-scroll pt-[52px]">
          <div className="max-w-2xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-6 md:space-y-8 pb-20">
            <div>
              <h1 className="text-xl font-extrabold text-text-primary flex items-center gap-2">
                <User className="w-5 h-5 text-brand" />
                User Profile settings
              </h1>
              <p className="text-xs text-text-tertiary mt-1">
                Manage your credentials, professional profile data, and security preferences.
              </p>
            </div>

            {/* Profile Info Card */}
            <div className={cn("rounded-xl border p-5 space-y-4", isDarkMode ? "bg-gray-900 border-gray-800" : "bg-white border-border shadow-sm")}>
              <h2 className="text-xs font-bold text-brand uppercase tracking-wider">Account Specifications</h2>
              
              <form onSubmit={handleUpdateProfile} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1">Full Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1">Email Address</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="input"
                      disabled
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="py-2.5 px-4 bg-brand hover:bg-brand-600 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow"
                >
                  <Save className="w-4 h-4" />
                  Save Changes
                </button>
              </form>
            </div>

            {/* Change Password Security Card */}
            <div className={cn("rounded-xl border p-5 space-y-4", isDarkMode ? "bg-gray-900 border-gray-800" : "bg-white border-border shadow-sm")}>
              <h2 className="text-xs font-bold text-brand uppercase tracking-wider">Change Account Password</h2>
              
              <form onSubmit={handleChangePassword} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1">Old Password</label>
                    <input
                      type="password"
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      placeholder="••••••••"
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1">New Strong Password</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="input"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="py-2.5 px-4 bg-brand hover:bg-brand-600 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow"
                >
                  <Shield className="w-4 h-4" />
                  Update Credentials
                </button>
              </form>
            </div>

            {/* Logout panel */}
            <div className={cn("rounded-xl border p-4 flex items-center justify-between", isDarkMode ? "bg-gray-900 border-gray-800" : "bg-white border-border shadow-sm")}>
              <div>
                <p className="text-xs font-bold text-text-primary">Exit Analytics Shell</p>
                <p className="text-[10px] text-text-tertiary mt-0.5">Disconnect completely from this workstation.</p>
              </div>
              <button
                onClick={handleLogout}
                className="py-2 px-3 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold rounded-lg border border-red-200 flex items-center gap-1 transition-all"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
