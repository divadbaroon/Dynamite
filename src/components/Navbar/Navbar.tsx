"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Menu, User as UserIcon } from "lucide-react";
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
  { label: 'Sessions', href: '/session/list' },
] as const;

interface NavLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
}

interface NavbarProps {
  user: User | null;
}

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
  return (
    <Card className="sticky top-0 z-50 w-full bg-card py-3 px-4 border-0 border-b border-gray-200 flex items-center justify-between gap-6 rounded-2xl mt-5">
      <div className="flex items-center gap-4">
        <Link 
          href="/"
          className="inline-block transition-transform duration-300 hover:scale-105"
        >
          <EthicConvoLogo className="text-primary w-48 h-8 -mt-2" />
        </Link>
      </div>

      <nav className="hidden md:block">
        <ul className="flex items-center gap-8">
          {NAV_ITEMS.map(({ label, href }) => (
            <li key={href}>
              <NavLink href={href}>{label}</NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="flex items-center gap-4">
        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src="/api/placeholder/32/32" />
                  <AvatarFallback>
                    <UserIcon className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem className="flex items-center gap-2">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user.email}</p>
                  <p className="text-xs text-muted-foreground">Guest Account</p>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <form action="/" method="POST" className="w-full">
                  <button 
                    className="w-full text-left" 
                    formAction={signOut}
                  >
                    Sign Out
                  </button>
                </form>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className="hidden md:flex items-center gap-2">
            <Button variant="ghost" asChild>
              <Link href="/login">Login</Link>
            </Button>
            <Button asChild>
              <Link href="/signup">Get Started</Link>
            </Button>
          </div>
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
              {!user && (
                <>
                  <DropdownMenuItem asChild>
                    <Link href="/login">Login</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/signup">Get Started</Link>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </Card>
  );
};

export default Navbar;