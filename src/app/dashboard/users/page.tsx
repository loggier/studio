// src/app/dashboard/users/page.tsx
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Trash2, Edit, XCircle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  fetchUsers,
  addUser,
  updateUser,
  deleteUser,
  User,
  NewUserData,
  UpdateUserData,
  UserProfile,
  UserStatus,
} from '@/lib/firebase/firestore/users'; // Import Firestore functions and types

// Zod schema for user form validation
// Password validation is only strictly required for adding users
// When editing, password field is not shown/required in this form
const userSchema = z.object({
  id: z.string().optional(), // ID is present when editing
  nombre: z.string().min(3, { message: 'Nombre debe tener al menos 3 caracteres' }).max(50, { message: 'Nombre demasiado largo' }),
  correo: z.string().email({ message: 'Correo electrónico inválido' }),
  // Password required only when NOT editing (i.e., adding a new user)
  password: z.string().optional(),
  empresa: z.string().max(50, { message: 'Empresa demasiado largo' }).optional().nullable(),
  perfil: z.enum(['admin', 'tecnico'], { required_error: 'Perfil es obligatorio' }),
  telefono: z.string().max(20, { message: 'Teléfono demasiado largo' }).optional().nullable(),
  status: z.enum(['activo', 'inactivo'], { required_error: 'Estado es obligatorio' }),
}).refine(data => data.id || data.password, { // Password is required if id is not present (i.e., adding)
  message: "Contraseña es obligatoria al crear usuario",
  path: ["password"], // Show error on password field
}).refine(data => !data.id || !data.password || data.password.length >= 6, { // If password is provided (optional on edit for validation trigger), check length
    message: "Contraseña debe tener al menos 6 caracteres",
    path: ["password"],
});


type UserFormData = z.infer<typeof userSchema>;

export default function UsersPage() {
  const [users, setUsers] = React.useState<User[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [editingUser, setEditingUser] = React.useState<User | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [userToDelete, setUserToDelete] = React.useState<{ id: string; nombre: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false); // Track submission state
  const { toast } = useToast();

  const form = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      nombre: '',
      correo: '',
      password: '',
      empresa: '',
      perfil: 'tecnico', // Default profile
      telefono: '',
      status: 'activo', // Default status
    },
    mode: 'onChange', // Validate on change
  });

  const loadUsers = React.useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await fetchUsers(); // Use Firestore fetch
      setUsers(data);
    } catch (err) {
      console.error('Failed to fetch users:', err);
      setError('Error al cargar los usuarios.');
       toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los usuarios." });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleCancelEdit = React.useCallback(() => {
    setEditingUser(null); // Clear editing state
    form.reset(); // Clear the form
    form.clearErrors(); // Clear any validation errors
  }, [form]);

  const handleEdit = (user: User) => {
    setEditingUser(user);
    form.reset({ // Use reset to populate all fields and clear previous state
      id: user.id,
      nombre: user.nombre,
      correo: user.correo,
      password: '', // Clear password field when editing
      empresa: user.empresa || '',
      perfil: user.perfil,
      telefono: user.telefono || '',
      status: user.status,
    });
  };

  // Opens the confirmation dialog
  const handleDeleteClick = (userId: string, userName: string) => {
    if (!userId || !userName) {
        console.error("Error: userId or userName is missing for delete click.");
        return;
    }
    // Basic check: prevent deleting the 'admin' user if it's hardcoded or identified some other way
    // In a real app, this logic might be more complex (e.g., checking if it's the last admin)
     // Also check against currently logged-in user (if implemented)
    // const currentUserData = localStorage.getItem('user'); // Assuming user info is stored
    // const currentUser = currentUserData ? JSON.parse(currentUserData) : null;
    // if (currentUser && currentUser.username === userName) { // Replace 'username' with actual field if different
    //      toast({
    //          variant: "destructive",
    //          title: "Acción Denegada",
    //          description: "No puedes eliminar tu propia cuenta de usuario.",
    //      });
    //      return;
    // }
    // Example: Prevent deleting a user named 'admin' (adjust if needed)
     if (userName.toLowerCase() === 'admin') {
        toast({
             variant: "warning",
             title: "Acción Restringida",
             description: "No se puede eliminar al usuario administrador principal.",
         });
         return;
     }


    setUserToDelete({ id: userId, nombre: userName });
    setIsDeleteDialogOpen(true);
  };

  // Performs the actual deletion after confirmation
  const confirmDelete = React.useCallback(async () => {
    if (!userToDelete) return;

    try {
      setIsSubmitting(true); // Indicate loading state during deletion
      await deleteUser(userToDelete.id); // Use Firestore delete
      toast({
        title: "Usuario Eliminado",
        description: `El usuario "${userToDelete.nombre}" ha sido eliminado.`,
      });
      await loadUsers(); // Refresh the list
      if (editingUser && editingUser.id === userToDelete.id) {
        handleCancelEdit(); // Cancel edit if the deleted user was being edited
      }
    } catch (err) {
      console.error("Error al eliminar usuario:", err);
      toast({
        variant: "destructive",
        title: "Error al Eliminar Usuario",
        description: err instanceof Error ? err.message : "Error al eliminar el usuario.",
      });
    } finally {
      setIsDeleteDialogOpen(false);
      setUserToDelete(null);
       setIsSubmitting(false); // Reset loading state
    }
  }, [userToDelete, toast, loadUsers, editingUser, handleCancelEdit]);


  const onSubmit = async (data: UserFormData) => {
    setIsSubmitting(true);
    try {
      if (editingUser) {
        // Update existing user
        const updateData: UpdateUserData = {
          nombre: data.nombre,
          correo: data.correo,
          empresa: data.empresa || undefined, // Send undefined if empty
          perfil: data.perfil as UserProfile,
          telefono: data.telefono || undefined, // Send undefined if empty
          status: data.status as UserStatus,
          // Password updates are handled separately for security
        };
        await updateUser(editingUser.id, updateData);
        toast({
          title: 'Usuario Actualizado',
          description: `El usuario "${data.nombre}" ha sido actualizado.`,
        });
      } else {
        // Add new user
        // WARNING: Storing plain text password - see note in firestore/users.ts
        const newUserData: NewUserData = {
          nombre: data.nombre,
          correo: data.correo,
          password: data.password!, // Password is required by schema here
          empresa: data.empresa || undefined,
          perfil: data.perfil as UserProfile,
          telefono: data.telefono || undefined,
          status: data.status as UserStatus,
        };
        const newUser = await addUser(newUserData); // Use Firestore add
        toast({
          title: 'Usuario Agregado',
          description: `El usuario "${newUser.nombre}" ha sido agregado.`,
        });
      }
      form.reset(); // Reset form fields
      await loadUsers(); // Reload the list
      setEditingUser(null); // Exit editing mode
    } catch (err) {
      console.error('Error al agregar/actualizar usuario:', err);
      toast({
        variant: 'destructive',
        title: editingUser ? 'Error al Actualizar' : 'Error al Agregar',
        description: err instanceof Error ? err.message : `Error al ${editingUser ? 'actualizar' : 'agregar'} el usuario.`,
      });
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <>
      <div className="grid gap-6 md:grid-cols-3">
        {/* Add/Edit User Form */}
        <div className="md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>{editingUser ? 'Editar Usuario' : 'Agregar Nuevo Usuario'}</CardTitle>
              <CardDescription>
                {editingUser ? `Modifica los datos del usuario "${editingUser.nombre}".` : 'Crea una nueva cuenta de usuario.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="nombre"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre Completo</FormLabel>
                        <FormControl>
                          <Input placeholder="Ej: Juan Pérez" {...field} disabled={isSubmitting}/>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="correo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Correo Electrónico</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="Ej: juan.perez@email.com" {...field} disabled={isSubmitting}/>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {/* Password field only shown when adding */}
                  {!editingUser && (
                      <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Contraseña</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="Introduce una contraseña segura" {...field} disabled={isSubmitting} autoComplete="new-password" />
                            </FormControl>
                             <p className="text-xs text-muted-foreground">Mínimo 6 caracteres.</p>
                             <p className="text-xs text-destructive mt-1">¡Importante! La contraseña se guarda sin encriptar en este ejemplo. Implementar hashing seguro en el servidor.</p>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                  )}

                  <FormField
                    control={form.control}
                    name="empresa"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Empresa (Opcional)</FormLabel>
                        <FormControl>
                          <Input placeholder="Ej: Mi Empresa S.A." {...field} value={field.value ?? ''} disabled={isSubmitting}/>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                   <FormField
                      control={form.control}
                      name="perfil"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Perfil</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecciona un perfil" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="tecnico">Técnico</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                   <FormField
                    control={form.control}
                    name="telefono"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Teléfono (Opcional)</FormLabel>
                        <FormControl>
                          <Input placeholder="Ej: +52 55 1234 5678" {...field} value={field.value ?? ''} disabled={isSubmitting}/>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Estado</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecciona un estado" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="activo">Activo</SelectItem>
                              <SelectItem value="inactivo">Inactivo</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                   <div className="flex flex-col gap-2"> {/* Stack buttons vertically */}
                        <Button type="submit" disabled={isSubmitting || !form.formState.isValid}>
                          {editingUser ? (
                              <>
                               <Edit className="mr-2 h-4 w-4" />
                               {isSubmitting ? 'Actualizando...' : 'Actualizar Usuario'}
                              </>
                          ) : (
                              <>
                               <PlusCircle className="mr-2 h-4 w-4" />
                               {isSubmitting ? 'Agregando...' : 'Agregar Usuario'}
                              </>
                          )}
                        </Button>
                        {editingUser && (
                            <Button
                              type="button"
                              variant="secondary"
                              onClick={handleCancelEdit}
                              disabled={isSubmitting}
                            >
                              <XCircle className="mr-2 h-4 w-4" />
                              Cancelar
                            </Button>
                        )}
                     </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        {/* Users List */}
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Usuarios Existentes</CardTitle>
              <CardDescription>Lista de usuarios con acceso.</CardDescription>
            </CardHeader>
            <CardContent>
               {error && !isLoading && <p className="text-destructive mb-4">{error}</p>}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Correo</TableHead>
                    <TableHead>Perfil</TableHead>
                     <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                   {isLoading ? (
                     Array.from({ length: 3 }).map((_, index) => (
                       <TableRow key={`skel-user-${index}`}>
                         <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                         <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                         <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                         <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                         <TableCell className="text-right space-x-1">
                           <Skeleton className="h-8 w-8 inline-block rounded"/>
                           <Skeleton className="h-8 w-8 inline-block rounded"/>
                         </TableCell>
                       </TableRow>
                     ))
                   ) : users.length > 0 ? (
                     users.map((user) => (
                       <TableRow key={user.id} className={editingUser?.id === user.id ? 'bg-muted/50' : ''}>
                         <TableCell className="font-medium">{user.nombre}</TableCell>
                         <TableCell>{user.correo}</TableCell>
                         <TableCell>{user.perfil}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${user.status === 'activo' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                {user.status}
                            </span>
                          </TableCell>
                         <TableCell className="text-right space-x-1">
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(user)} aria-label={`Editar ${user.nombre}`}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive-foreground hover:bg-destructive/90"
                              onClick={() => handleDeleteClick(user.id, user.nombre)}
                               aria-label={`Eliminar ${user.nombre}`}
                               disabled={isSubmitting} // Disable delete while another operation is in progress
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                         </TableCell>
                       </TableRow>
                     ))
                   ) : (
                     <TableRow>
                       <TableCell colSpan={5} className="h-24 text-center">
                         No se encontraron usuarios. Agrega uno usando el formulario.
                       </TableCell>
                     </TableRow>
                   )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>

       {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás absolutamente seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente al usuario
              <strong> "{userToDelete?.nombre}"</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setUserToDelete(null)} disabled={isSubmitting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={isSubmitting}>
                 {isSubmitting ? 'Eliminando...' : 'Continuar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
