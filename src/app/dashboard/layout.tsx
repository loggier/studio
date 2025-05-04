'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation'; // Import usePathname
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

// Define a type for the user data stored in localStorage
interface StoredUser {
    id: string;
    nombre: string; // Changed from username to nombre
    correo: string;
    perfil: string;
}


export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname(); // Get current path
  const { toast } = useToast();
  const [user, setUser] = React.useState<StoredUser | null>(null); // Use StoredUser type
  const { isMobile } = useSidebar();

   React.useEffect(() => {
    // Check if user is logged in (simple check, improve in production)
    const storedUserString = localStorage.getItem('user');
    if (storedUserString) {
      try {
        const storedUser: StoredUser = JSON.parse(storedUserString);
         // Basic validation of stored data
         if (storedUser && storedUser.id && storedUser.nombre && storedUser.correo) {
            setUser(storedUser);
         } else {
            console.error("Invalid user data structure in localStorage");
            handleLogout(); // Log out if data structure is wrong
         }
      } catch (e) {
        console.error("Failed to parse user from localStorage", e);
        handleLogout(); // Log out if user data is invalid JSON
      }
    } else {
      toast({
        variant: 'destructive',
        title: 'No Autorizado',
        description: 'Por favor inicia sesión para acceder al panel.',
      });
      router.push('/login');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [router]); // Only run on initial mount and when router changes


  const handleLogout = () => {
    localStorage.removeItem('user');
    setUser(null);
    toast({
      title: 'Sesión Cerrada',
      description: 'Has cerrado sesión exitosamente.',
    });
    router.push('/login');
  };

  if (!user) {
    // Optional: Show a loading state or null while checking auth
    // Or a dedicated loading component
     return <div className="flex min-h-screen items-center justify-center">Cargando...</div>;
  }

  const getInitials = (name: string = '') => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase() || '?'; // Fallback if name is empty
  };

  return (
    <div className="flex min-h-screen">
       <Sidebar side="left" variant="sidebar" collapsible="icon">
        <SidebarHeader className="items-center justify-between p-4">
           {/* Updated title */}
           <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-lg text-primary group-data-[collapsible=icon]:justify-center">
             {/* Icon can remain, or adjust if needed */}
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
                   <path d="M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20Z"/><path d="M15 14c.83.83 2.17.83 3 0l-3-3"/><path d="M9.14 9.14a3 3 0 1 1-4.24-4.24 3 3 0 0 1 4.24 4.24Z"/>
              </svg>
             <span className="group-data-[collapsible=icon]:hidden">Admin Cortes</span>
           </Link>
           {!isMobile && <SidebarTrigger />}
         </SidebarHeader>
        <SidebarContent className="flex-1 p-2">
          <SidebarMenu>
            {/* Use pathname to determine active state */}
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname === '/dashboard/vehicles'} tooltip="Vehículos">
                <Link href="/dashboard/vehicles">
                  <Car />
                  <span>Vehículos</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname === '/dashboard/brands'} tooltip="Marcas">
                <Link href="/dashboard/brands">
                  <Factory />
                  <span>Marcas</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname === '/dashboard/models'} tooltip="Modelos">
                <Link href="/dashboard/models">
                  <Tag />
                  <span>Modelos</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
             {/* Only show Users link if the user is admin */}
            {user.perfil === 'admin' && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === '/dashboard/users'} tooltip="Usuarios">
                  <Link href="/dashboard/users">
                    <Users />
                    <span>Usuarios</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter className="p-4 border-t border-sidebar-border">
           {/* Use user.nombre */}
           <div className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center">
              <Avatar className="h-9 w-9">
                 {/* Optional: Add AvatarImage if you store image URLs */}
                {/* <AvatarImage src={user.imageUrl} alt={user.nombre} /> */}
                <AvatarFallback>{getInitials(user?.nombre)}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col group-data-[collapsible=icon]:hidden">
                <span className="text-sm font-medium">{user?.nombre}</span>
                 {/* Display user profile/role */}
                 <span className="text-xs text-muted-foreground capitalize">{user?.perfil}</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="ml-auto group-data-[collapsible=icon]:hidden"
                onClick={handleLogout}
                aria-label="Logout"
                title="Cerrar Sesión" // Add title for tooltip
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
         </SidebarFooter>
      </Sidebar>
      <main className="flex-1 flex flex-col">
         <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
          {isMobile && <SidebarTrigger className="sm:hidden" />}
           {/* You can add breadcrumbs or page titles here based on pathname */}
           {/* Example: <h1 className="text-xl font-semibold">...</h1> */}
         </header>
         <div className="flex-1 overflow-auto p-4 sm:px-6 sm:py-0">
           {children}
         </div>
       </main>
    </div>
  );
}
