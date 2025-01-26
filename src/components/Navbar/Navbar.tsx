"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { UserIcon } from "lucide-react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
  } from "@/components/ui/dropdown-menu";
  import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
  import { Button } from "@/components/ui/button";

import { signOut } from "@/app/(auth)/login/actions";

import { NavbarProps } from "@/types"

import EthicConvoLogo from "../../../public/assets/logo/EthicConvoLogo";

const Navbar = ({ user }: NavbarProps) => {
  const pathname = usePathname();
  
  // Check if current path is a discussion page that should hide menu items
  const isDiscussionPage = /^\/discussion\/(join|\d+)/.test(pathname);

  return (
    <nav className="bg-white shadow-md w-full sticky top-0 z-50">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center gap-4">
            <Link 
            href="/"
            className="inline-block transition-transform duration-300 hover:scale-105 mt-2"
            >
                <EthicConvoLogo className="text-primary w-48 h-8 -mt-2" />
            </Link>
          </div>

          {/* Navigation Links */}
          {!isDiscussionPage && (
            <div className="hidden sm:flex flex-grow justify-center">
              <div className="flex space-x-8">
                <Link
                  href="/home/about"
                  className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-700 hover:text-gray-900"
                >
                  About Us
                </Link>
                <Link
                  href="/home/researchers"
                  className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-700 hover:text-gray-900"
                >
                  For Researchers
                </Link>
                <Link
                  href="/discussion/list"
                  className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-700 hover:text-gray-900"
                >
                  Discussions
                </Link>
              </div>
            </div>
          )}

          {/* User Profile Icon or Login/Get Started */}
          <div className="hidden sm:flex sm:items-center space-x-4">
            {user ? (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="rounded-full focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0">
                        <Avatar className="h-8 w-8">
                        <AvatarImage src="/api/placeholder/32/32" />
                        <AvatarFallback>
                            <UserIcon className="h-4 w-4 text-black" />
                        </AvatarFallback>
                        </Avatar>
                    </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem className="flex items-center gap-2">
                        <div className="flex flex-col">
                        <p className="text-sm font-medium leading-none">
                            {user.email ? user.email : 'Guest Account'}
                        </p>
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
            !isDiscussionPage && (
              <div className="hidden md:flex items-center gap-2">
                  <Button variant="ghost" asChild>
                  <Link href="/login">Login</Link>
                  </Button>
                  <Button asChild>
                  <Link href="/signup">Get Started</Link>
                  </Button>
              </div>
            )
            )}
          </div>

          {/* Mobile menu button */}
          {!isDiscussionPage && (
            <div className="flex items-center sm:hidden">
              <button
                type="button"
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
                aria-controls="mobile-menu"
                aria-expanded="false"
              >
                <span className="sr-only">Open main menu</span>
                <svg
                  className="block h-6 w-6"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile menu, show/hide based on menu state */}
      {!isDiscussionPage && (
        <div className="sm:hidden" id="mobile-menu">
          <div className="pt-2 pb-3 space-y-1">
            <Link
              href="/home/about"
              className="block pl-3 pr-4 py-2 text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
            >
              About Us
            </Link>
            <Link
              href="/home/researchers"
              className="block pl-3 pr-4 py-2 text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
            >
              For Researchers
            </Link>
            <Link
              href="/discussion/list"
              className="block pl-3 pr-4 py-2 text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
            >
              Discussions
            </Link>
          </div>
          <div className="pt-4 pb-3 border-t border-gray-200">
            {user ? (
              <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0">
                      <Avatar className="h-8 w-8">
                      <AvatarImage src="/api/placeholder/32/32" />
                      <AvatarFallback>
                          <UserIcon className="h-4 w-4 text-black" />
                      </AvatarFallback>
                      </Avatar>
                  </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuItem className="flex items-center gap-2">
                          <div className="flex flex-col">
                          <p className="text-sm font-medium leading-none">
                              {user.email ? user.email : 'Guest Account'}
                          </p>
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
          </div>
        </div>
      )}
    </nav>
  )
}

export default Navbar