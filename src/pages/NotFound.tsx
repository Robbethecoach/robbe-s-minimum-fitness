import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="font-serif italic text-5xl mb-6">404</h1>
        <p className="text-sm text-muted-foreground mb-6">Page not found</p>
        <a href="/" className="text-[12px] font-medium tracking-[0.08em] uppercase bg-primary text-primary-foreground px-6 py-3 rounded-lg hover:bg-foreground/90 transition-colors">
          Return home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
