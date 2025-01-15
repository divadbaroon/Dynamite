"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Menu, ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import EthicConvoLogo from "../../../public/assets/logo/EthicConvoLogo";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { login, signup, signOut } from "@/app/(auth)/login/actions";
import { User } from '@supabase/supabase-js';

// Navigation items
export const NAV_ITEMS = [
  { label: 'About Us', href: '/home/about' },
  { label: 'For Researchers', href: '/home/researchers' },
  { label: 'Sessions', href: '/sessions' },
] as const;

interface NavLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
}

interface NavbarProps {
  user: User | null;
}

// Reusable NavLink component with active state
const NavLink = ({ href, children, className }: NavLinkProps) => {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link 
      href={href} 
      className={cn(
        "transition-colors hover:text-primary",
        isActive && "text-primary font-medium",
        className
      )}
    >
      {children}
    </Link>
  );
};

const Navbar = ({ user }: NavbarProps) => {
  const pathname = usePathname();
  
  const logoHref = pathname.startsWith('/join/') ? '/sessions' : '/';
  const isRootPath = ['/home', '/home/about', '/home/researchers', '/sessions'].includes(pathname);
  const isSessionPathWithId = pathname.match(/^\/sessions\/[\w-]+/) || 
                             pathname.startsWith("/session-dashboard/");
  const isJoinPath = pathname.startsWith('/join/');

  return (
    <Card className="sticky top-0 z-50 w-full bg-card py-3 px-4 border-0 border-b border-gray-200 flex items-center justify-between gap-6 rounded-2xl mt-5">
      <div className="flex items-center gap-4">
        <Link 
          href={logoHref}
          className="inline-block transition-transform duration-300 hover:scale-105"
        >
          <EthicConvoLogo className="text-primary w-48 h-8 -mt-2" />
        </Link>

        {isSessionPathWithId && (
          <Button 
            variant="ghost" 
            size="sm" 
            asChild 
            className="hidden md:flex items-center gap-2"
          >
            <Link href="/sessions">
              <ArrowLeft className="h-4 w-4" />
              <span>Sessions</span>
            </Link>
          </Button>
        )}
      </div>

      {isRootPath && (
        <nav className="hidden md:block">
          <ul className="flex items-center gap-8">
            {NAV_ITEMS.map(({ label, href }) => (
              <li key={href}>
                <NavLink href={href}>{label}</NavLink>
              </li>
            ))}
          </ul>
        </nav>
      )}

      <div className="flex items-center gap-4">
        {!isJoinPath && (
          <>
            {user ? (
              <div className="flex items-center gap-2">
                <form action="/" method="POST">
                  <Button variant="ghost" formAction={signOut}>
                    Sign Out
                  </Button>
                </form>
              </div>
            ) : (
              <>
              <div className="hidden md:flex items-center gap-2">
                <Button variant="ghost" asChild>
                  <Link href="/login">Login</Link>
                </Button>
                <Button asChild>
                  <Link href="/signup">Get Started</Link>
                </Button>
              </div>
              </>
            )}
          </>
        )}

        {/* Mobile Menu */}
        <div className="md:hidden">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-48">
              {NAV_ITEMS.map(({ label, href }) => (
                <DropdownMenuItem key={href} asChild>
                  <Link href={href}>{label}</Link>
                </DropdownMenuItem>
              ))}
              {!isJoinPath && !user && (
                <form id="nav-mobile-form">
                  <DropdownMenuItem>
                    <button className="w-full text-left" formAction={login}>
                      Login
                    </button>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <button className="w-full text-left" formAction={signup}>
                      Get Started
                    </button>
                  </DropdownMenuItem>
                </form>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </Card>
  );
};

export default Navbar;