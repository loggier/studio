'use client';

import * as React from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Trash2 } from 'lucide-react'; // Import Edit if needed

// Zod schema for user form validation
const userSchema = z.object({
  id: z.string().optional(), // Optional for creation
  username: z.string().min(3, { message: 'Username must be at least 3 characters' }).max(30, { message: 'Username too long' }),
  // IMPORTANT: In a real app, handle password hashing securely on the server-side.
  // This is simplified for the frontend prototype. Never store plain passwords.
  password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
});

type UserFormData = z.infer<typeof userSchema>;

// Define the structure of a User (excluding password for listing)
interface User {
  id: string;
  username: string;
  // Password should NOT be stored or fetched for listing
}

// Mock data and functions - replace with actual secure backend calls
let mockUsers: User[] = [
  { id: 'user1', username: 'admin' },
  { id: 'user2', username: 'editor' },
];

// NOTE: These functions simulate interaction but LACK SECURITY.
// Real implementation requires a backend to handle password hashing and storage.

async function fetchUsers(): Promise<User[]> {
  await new Promise(resolve => setTimeout(resolve, 400)); // Simulate delay
  // Never return passwords from the backend
  return [...mockUsers].map(({ id, username }) => ({ id, username }));
}

async function addUser(newUserData: UserFormData): Promise<User> {
  await new Promise(resolve => setTimeout(resolve, 300)); // Simulate delay
  // --- SECURITY WARNING ---
  // Hashing MUST happen server-side before saving to DB.
  // This mock function skips hashing for simplicity.
  console.warn('--- MOCK FUNCTION ---: Password is not hashed. Implement server-side hashing.');
  const newUser: User = { id: `user${mockUsers.length + 1}`, username: newUserData.username };
  mockUsers.push(newUser); // In reality, you'd save the hashed password too.
  // --- END SECURITY WARNING ---
  return newUser; // Return only non-sensitive data
}

async function deleteUser(userId: string): Promise<void> {
   await new Promise(resolve => setTimeout(resolve, 300)); // Simulate delay
   // Add checks: Cannot delete the currently logged-in user, etc.
   if (userId === 'user1') { // Simple check to prevent deleting 'admin' in mock
       throw new Error("Cannot delete the primary admin user.");
   }
   mockUsers = mockUsers.filter(u => u.id !== userId);
}


export default function UsersPage() {
  const [users, setUsers] = React.useState<User[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const { toast } = useToast();

  const form = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  });

  const loadUsers = React.useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await fetchUsers();
      setUsers(data);
    } catch (err) {
      console.error('Failed to fetch users:', err);
      setError('Failed to load users.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const onSubmit = async (data: UserFormData) => {
    try {
      const newUser = await addUser(data);
      toast({
        title: 'User Added',
        description: `User "${newUser.username}" has been successfully created.`,
      });
      form.reset(); // Reset form fields
      await loadUsers(); // Reload the list
    } catch (err) {
      console.error('Failed to add user:', err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to add user. Username might already exist.',
      });
    }
  };

 const handleDelete = async (userId: string, username: string) => {
    // Add checks here: e.g., don't allow deleting the current user
    const currentUserData = localStorage.getItem('user');
    const currentUser = currentUserData ? JSON.parse(currentUserData) : null;
    if (currentUser && currentUser.username === username) {
         toast({
             variant: "destructive",
             title: "Action Denied",
             description: "You cannot delete your own user account.",
         });
         return;
    }


    if (confirm(`Are you sure you want to delete the user "${username}"? This action cannot be undone.`)) {
        try {
            await deleteUser(userId);
            toast({
                title: "User Deleted",
                description: `User "${username}" has been deleted.`,
            });
            await loadUsers(); // Refresh the list
        } catch (err: any) {
            console.error("Failed to delete user:", err);
            toast({
                variant: "destructive",
                title: "Error",
                description: err.message || "Failed to delete user.",
            });
        }
    }
};

  return (
    <div className="grid gap-6 md:grid-cols-3">
      {/* Add User Form */}
      <div className="md:col-span-1">
        <Card>
          <CardHeader>
            <CardTitle>Add New User</CardTitle>
            <CardDescription>Create a new user account for dashboard access.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., john.doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Enter a strong password" {...field} />
                      </FormControl>
                       <p className="text-xs text-muted-foreground">Min. 6 characters.</p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  {form.formState.isSubmitting ? 'Adding...' : 'Add User'}
                </Button>
                 <p className="text-xs text-destructive mt-2">Note: Password handling is simplified. Implement secure hashing on the server.</p>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>

      {/* Users List */}
      <div className="md:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Existing Users</CardTitle>
            <CardDescription>List of users with access to the dashboard.</CardDescription>
          </CardHeader>
          <CardContent>
             {error && <p className="text-destructive mb-4">{error}</p>}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Username</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 2 }).map((_, index) => (
                    <TableRow key={`skel-user-${index}`}>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                       <TableCell className="text-right">
                         <Skeleton className="h-8 w-8 inline-block ml-2 rounded"/>
                         {/* <Skeleton className="h-8 w-8 inline-block ml-2 rounded"/> */}
                       </TableCell>
                    </TableRow>
                  ))
                ) : users.length > 0 ? (
                  users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.username}</TableCell>
                       <TableCell className="text-right">
                         {/* Add Edit button if needed (e.g., for password reset) */}
                         {/* <Button variant="ghost" size="icon" onClick={() => handleEdit(user)}>
                            <Edit className="h-4 w-4" />
                         </Button> */}
                         <Button
                           variant="ghost"
                           size="icon"
                           className="text-destructive hover:text-destructive-foreground hover:bg-destructive/90"
                           onClick={() => handleDelete(user.id, user.username)}
                           disabled={user.username === 'admin'} // Disable delete for admin in mock
                           aria-label={`Delete ${user.username}`}
                         >
                           <Trash2 className="h-4 w-4" />
                         </Button>
                       </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={2} className="h-24 text-center">
                      No users found. Add one using the form.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
