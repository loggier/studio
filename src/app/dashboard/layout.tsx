'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Car, Factory, Tag, Users, LogOut, Menu } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [user, setUser] = React.useState<{ username: string } | null>(null);
  const { isMobile } = useSidebar();

   React.useEffect(() => {
    // Check if user is logged in (simple check, improve in production)
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error("Failed to parse user from localStorage", e);
        handleLogout(); // Log out if user data is invalid
      }
    } else {
      toast({
        variant: 'destructive',
        title: 'Unauthorized',
        description: 'Please login to access the dashboard.',
      });
      router.push('/login');
    }
  }, [router, toast]);


  const handleLogout = () => {
    localStorage.removeItem('user');
    setUser(null);
    toast({
      title: 'Logged Out',
      description: 'You have been successfully logged out.',
    });
    router.push('/login');
  };

  if (!user) {
    // Optional: Show a loading state or null while checking auth
    return null;
  }

  const getInitials = (name: string = '') => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  return (
    <div className="flex min-h-screen">
       <Sidebar side="left" variant="sidebar" collapsible="icon">
        <SidebarHeader className="items-center justify-between p-4">
           <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-lg text-primary">
             <Car className="h-6 w-6" />
             <span className="group-data-[collapsible=icon]:hidden">VehicleVault</span>
           </Link>
           {!isMobile && <SidebarTrigger />}
         </SidebarHeader>
        <SidebarContent className="flex-1 p-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={router.pathname === '/dashboard/vehicles'}>
                <Link href="/dashboard/vehicles">
                  <Car />
                  <span>Vehicles</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={router.pathname === '/dashboard/brands'}>
                <Link href="/dashboard/brands">
                  <Factory />
                  <span>Brands</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={router.pathname === '/dashboard/models'}>
                <Link href="/dashboard/models">
                  <Tag />
                  <span>Models</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={router.pathname === '/dashboard/users'}>
                <Link href="/dashboard/users">
                  <Users />
                  <span>Users</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter className="p-4 border-t border-sidebar-border">
           <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9">
                {/* Add placeholder image if needed */}
                <AvatarFallback>{getInitials(user?.username)}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col group-data-[collapsible=icon]:hidden">
                <span className="text-sm font-medium">{user?.username}</span>
                {/* <span className="text-xs text-muted-foreground">Admin Role</span> */}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="ml-auto group-data-[collapsible=icon]:hidden"
                onClick={handleLogout}
                aria-label="Logout"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
         </SidebarFooter>
      </Sidebar>
      <main className="flex-1 flex flex-col">
         <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
          {isMobile && <SidebarTrigger className="sm:hidden" />}
           {/* Header content like search or notifications can go here */}
         </header>
         <div className="flex-1 overflow-auto p-4 sm:px-6 sm:py-0">
           {children}
         </div>
       </main>
    </div>
  );
}
