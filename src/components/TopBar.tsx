import { Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { t } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { LogOut, Languages, Eye } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function TopBar() {
  const { user, profile, lang, setLang, signOut } = useAuth();
  const nav = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    nav({ to: "/" });
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-terracotta shadow-warm">
            <Eye className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="font-serif text-xl text-foreground">{t(lang, "appName")}</span>
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
              {lang === "hi" ? "कारीगर सुरक्षा" : "Artisan Protection"}
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1.5">
                <Languages className="h-4 w-4" />
                <span className="text-xs font-medium">{lang === "hi" ? "हिंदी" : "EN"}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setLang("en")}>English</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLang("hi")}>हिंदी (Hindi)</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {user ? (
            <>
              <span className="hidden text-sm text-muted-foreground sm:inline">
                {profile?.name || user.email?.split("@")[0]}
              </span>
              <Button variant="outline" size="sm" onClick={handleSignOut} className="gap-1.5">
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t(lang, "signOut")}</span>
              </Button>
            </>
          ) : (
            <Button asChild size="sm">
              <Link to="/auth">{t(lang, "signIn")}</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
