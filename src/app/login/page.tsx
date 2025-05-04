'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase/config'; // Import db instance

// --- SECURITY WARNING ---
// This function performs an INSECURE password check by comparing plain text passwords.
// Passwords should ALWAYS be hashed server-side (e.g., using Firebase Authentication or a backend function)
// and compared using secure methods. This implementation is only for demonstration
// based on the current insecure data storage.
async function authenticateUser(correo: string, contrasena: string) {
  try {
    // Query Firestore for a user with the matching email
    const usersRef = collection(db, 'users');
    // Assuming 'correo' field stores the email/username
    const q = query(usersRef, where('correo', '==', correo.trim().toLowerCase()), limit(1));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      // User not found
      return { success: false, message: 'Usuario o contraseña inválidos.' };
    }

    const userDoc = querySnapshot.docs[0];
    const userData = userDoc.data();

    // --- INSECURE COMPARISON ---
    // Comparing the provided plain text password with the stored plain text password.
    if (userData.password === contrasena) {
       // --- Check user status ---
       if (userData.status !== 'activo') {
         return { success: false, message: 'La cuenta de usuario está inactiva.' };
       }
      // Password matches (insecurely)
      // Return essential user data (excluding password)
      return {
        success: true,
        user: {
          id: userDoc.id,
          nombre: userData.nombre, // Get the user's name
          correo: userData.correo,
          perfil: userData.perfil,
          // Add other necessary fields here, BUT NEVER THE PASSWORD
        }
      };
    } else {
      // Password doesn't match
      return { success: false, message: 'Usuario o contraseña inválidos.' };
    }
  } catch (error) {
    console.error("Error during authentication:", error);
    return { success: false, message: 'Error al intentar autenticar. Inténtalo de nuevo.' };
  }
}
// --- END SECURITY WARNING ---

export default function LoginPage() {
  const [correo, setCorreo] = useState(''); // Changed from username to correo
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Use the Firestore authentication function
      const result = await authenticateUser(correo, password);

      if (result.success && result.user) {
        // Store essential, non-sensitive user data in localStorage
        // DO NOT store passwords or sensitive tokens here unless properly managed
        const userToStore = {
            id: result.user.id,
            nombre: result.user.nombre, // Store user's name
            correo: result.user.correo,
            perfil: result.user.perfil,
        };
        localStorage.setItem('user', JSON.stringify(userToStore));

        toast({
          title: 'Inicio de Sesión Exitoso',
          description: `¡Bienvenido, ${result.user.nombre}!`, // Use user's name
        });
        router.push('/dashboard'); // Redirect to dashboard
      } else {
        toast({
          variant: 'destructive',
          title: 'Inicio de Sesión Fallido',
          description: result.message || 'Correo o contraseña incorrectos.',
        });
      }
    } catch (error) {
      console.error('Login error:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Ocurrió un error inesperado durante el inicio de sesión.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary">
      <Card className="w-full max-w-sm shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Admin Cortes</CardTitle> {/* Updated Title */}
          <CardDescription>Ingresa tus credenciales para acceder al panel.</CardDescription> {/* Updated Description */}
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="correo">Correo Electrónico</Label> {/* Changed label */}
              <Input
                id="correo"
                type="email" // Use email type for better validation/input modes
                placeholder="tucorreo@ejemplo.com" // Updated placeholder
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                placeholder="Ingresa tu contraseña" // Updated placeholder
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
              {/* Optional: Add forgot password link here */}
            </div>
             <p className="text-xs text-destructive mt-2">
                **Importante:** Este login usa comparación de contraseñas en texto plano (inseguro). En producción, implementa Firebase Authentication o hashing seguro en servidor.
             </p>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'} {/* Updated Button Text */}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
