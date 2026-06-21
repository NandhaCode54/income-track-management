import { Outlet } from 'react-router-dom';

const AuthLayout = () => (
  <div className="grid min-h-screen lg:grid-cols-2">
    {/* Left branding panel */}
    <div className="hidden flex-col justify-between bg-sidebar p-10 lg:flex">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <span className="text-sm font-bold text-white">FF</span>
        </div>
        <span className="text-lg font-semibold text-sidebar-foreground">Family Finance</span>
      </div>
      <div>
        <blockquote className="space-y-2">
          <p className="text-lg text-sidebar-foreground/90">
            "Manage your family's finances together — income, expenses, EMIs, and savings in one
            place."
          </p>
        </blockquote>
      </div>
    </div>

    {/* Right form panel */}
    <div className="flex items-center justify-center p-8">
      <div className="w-full max-w-sm">
        <Outlet />
      </div>
    </div>
  </div>
);

export default AuthLayout;
