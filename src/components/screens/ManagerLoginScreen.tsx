import React, { useState } from 'react';
import { KITCHEN_HERO_IMAGE } from '../../data/initialData';
import { authService, DEMO_STAFF_ACCOUNTS } from '../../services/authService';
import { AuthenticatedUser } from '../../types/dining';

interface Props {
  onLoginSuccess: (user: AuthenticatedUser) => void;
  onSelectScreen?: (screenId: string) => void;
}

export const ManagerLoginScreen: React.FC<Props> = ({ onLoginSuccess, onSelectScreen }) => {
  const [email, setEmail] = useState('manager@frankfoods.ug');
  const [password, setPassword] = useState('frank2026');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const user = await authService.login(email, password);
      onLoginSuccess(user);
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickSelectAccount = (acc: typeof DEMO_STAFF_ACCOUNTS[0]) => {
    setEmail(acc.email);
    setPassword(acc.password);
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#FAFAFA] text-[#171717] antialiased font-sans">
      {/* Header */}
      <header className="w-full bg-white border-b border-[#E5E5E5] sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-50 border border-orange-200 flex items-center justify-center">
              <span className="material-symbols-outlined text-[#F97316] text-2xl">restaurant</span>
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-lg leading-tight text-[#171717]">Frank Foods</span>
              <span className="text-xs font-semibold text-[#F97316] uppercase tracking-wider">
                Staff &amp; Management Portal
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm text-[#525252]">
            <button
              onClick={() => onSelectScreen && onSelectScreen('menu-feed')}
              className="hover:text-[#171717] transition-colors font-medium cursor-pointer"
            >
              Customer Menu
            </button>
            <span className="text-neutral-300">|</span>
            <button
              onClick={() => alert('Support helpline: +256 700 123 456 (Acacia Mall Operations desk)')}
              className="hover:text-[#171717] transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">help_outline</span>
              <span>Support</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 flex items-center justify-center">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
          {/* Left: Companion / Highlights Panel */}
          <div className="lg:col-span-5 bg-white border border-[#E5E5E5] rounded-2xl p-6 sm:p-8 flex flex-col justify-between shadow-xs">
            <div>
              {/* Hospitality Image */}
              <div className="w-full rounded-xl overflow-hidden aspect-[16/10] bg-neutral-100 relative mb-6">
                <img
                  alt="Frank Foods kitchen and dining operations"
                  className="w-full h-full object-cover"
                  src={KITCHEN_HERO_IMAGE}
                  onError={(e) => {
                    e.currentTarget.src =
                      'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80';
                  }}
                />
                <div className="absolute bottom-2.5 left-2.5 bg-black/60 backdrop-blur-sm text-white px-3 py-1 rounded text-xs font-medium flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  <span>Multi-Restaurant Platform</span>
                </div>
              </div>

              <h2 className="text-xl font-bold text-[#171717] tracking-tight mb-2">
                Multi-Restaurant Operations
              </h2>
              <p className="text-sm text-[#525252] mb-6 leading-relaxed">
                Empower your restaurant team with dedicated kitchen KDS, menu management, and instant table QR generation.
              </p>

              {/* Core Feature List */}
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-md bg-orange-50 text-[#F97316] flex items-center justify-center shrink-0 mt-0.5">
                    <span className="material-symbols-outlined text-[18px]">soup_kitchen</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-[#171717]">Kitchen Display System (/kitchen)</h3>
                    <p className="text-xs text-[#525252] leading-relaxed">
                      Accept orders, track prep elapsed timers, and alert floor staff when meals are plated.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-md bg-orange-50 text-[#F97316] flex items-center justify-center shrink-0 mt-0.5">
                    <span className="material-symbols-outlined text-[18px]">menu_book</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-[#171717]">Menu &amp; Catalog Control</h3>
                    <p className="text-xs text-[#525252] leading-relaxed">
                      Create categories, add dishes with UGX pricing, and toggle 86-ed sold out items live.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-md bg-orange-50 text-[#F97316] flex items-center justify-center shrink-0 mt-0.5">
                    <span className="material-symbols-outlined text-[18px]">qr_code_2</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-[#171717]">Table QR Stands &amp; Printing</h3>
                    <p className="text-xs text-[#525252] leading-relaxed">
                      Generate individual QR tent cards or print bulk restaurant table sheets with 1 click.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-[#E5E5E5] text-xs text-[#737373] flex items-center justify-between">
              <span>Frank Foods Platform</span>
              <span>Acacia Mall &amp; Kololo Heights</span>
            </div>
          </div>

          {/* Right: Clean Login Card */}
          <div className="lg:col-span-7 bg-white border border-[#E5E5E5] rounded-2xl p-6 sm:p-10 shadow-xs flex flex-col justify-center">
            <div className="max-w-md w-full mx-auto">
              <div className="mb-6">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#171717] tracking-tight mb-2">
                  Staff &amp; Manager Login
                </h1>
                <p className="text-sm text-[#525252] leading-relaxed">
                  Sign in with your restaurant account to access your kitchen KDS or management hub.
                </p>
              </div>

              {/* Quick Select Demo Accounts */}
              <div className="mb-6 bg-orange-50/70 border border-orange-200/80 rounded-xl p-3.5">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#EA580C] block mb-2">
                  Quick Select Demo Profile:
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {DEMO_STAFF_ACCOUNTS.map((acc) => {
                    const isSelected = email === acc.email;
                    return (
                      <button
                        key={acc.id}
                        type="button"
                        onClick={() => handleQuickSelectAccount(acc)}
                        className={`text-left p-2 rounded-lg text-xs transition-all cursor-pointer border ${
                          isSelected
                            ? 'bg-white border-[#F97316] text-[#EA580C] shadow-xs font-bold'
                            : 'bg-white/60 border-neutral-200 text-neutral-700 hover:bg-white'
                        }`}
                      >
                        <div className="font-bold truncate">{acc.fullName.split('(')[0]}</div>
                        <div className="text-[10px] text-neutral-500 font-medium">
                          {acc.restaurantName} • <span className="capitalize">{acc.role}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {errorMessage && (
                <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">error</span>
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Login Form */}
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#171717] mb-1" htmlFor="staffEmail">
                    Staff Email Address
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#737373] text-[20px] pointer-events-none">
                      mail
                    </span>
                    <input
                      className="w-full h-11 pl-11 pr-4 rounded-xl border border-[#E5E5E5] bg-white text-[#171717] text-sm focus:border-[#F97316] outline-none"
                      id="staffEmail"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. manager@frankfoods.ug"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#171717] mb-1" htmlFor="staffPassword">
                    Password
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#737373] text-[20px] pointer-events-none">
                      lock
                    </span>
                    <input
                      className="w-full h-11 pl-11 pr-11 rounded-xl border border-[#E5E5E5] bg-white text-[#171717] text-sm focus:border-[#F97316] outline-none font-mono"
                      id="staffPassword"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password"
                      required
                    />
                    <button
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#737373] hover:text-[#171717] cursor-pointer"
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      <span className="material-symbols-outlined text-[20px]">
                        {showPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                </div>

                <button
                  className="w-full h-11 bg-[#F97316] hover:bg-[#EA580C] text-white font-bold rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer mt-4"
                  type="submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                      <span>Signing in...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In to Restaurant Station</span>
                      <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full bg-white border-t border-[#E5E5E5] py-4 text-center text-xs text-[#737373]">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>&copy; {new Date().getFullYear()} Frank Foods Technologies Uganda Ltd. Multi-Restaurant Hospitality Platform.</span>
          <div className="flex items-center gap-3">
            <span>Kampala • Uganda</span>
            <span>•</span>
            <span className="text-[#EA580C] font-semibold">Acacia Mall &amp; Kololo Heights</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
