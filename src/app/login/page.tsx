// src/app/login/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { authenticateUserWithPseudoHash } from '@/lib/firebase/firestore/users'; // Import the specific auth function

// --- SECURITY WARNING ---
// The authentication function `authenticateUserWithPseudoHash` uses an INSECURE pseudo-hashing mechanism.
// Passwords should ALWAYS be securely hashed server-side (e.g., using Firebase Authentication or bcrypt/Argon2
// in a backend function) and verified without exposing the hash to the client.
// This implementation is only for demonstrating the concept based on the request and has significant security flaws.
// --- END SECURITY WARNING ---

export default function LoginPage() {
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Use the specific Firestore authentication function with pseudo-hashing
      const result = await authenticateUserWithPseudoHash(correo, password);

      if (result.success && result.user) {
        // Store essential, non-sensitive user data in localStorage
        // DO NOT store passwords or sensitive tokens here
        const userToStore = {
            id: result.user.id,
            nombre: result.user.nombre,
            correo: result.user.correo,
            perfil: result.user.perfil,
        };
        localStorage.setItem('user', JSON.stringify(userToStore));

        toast({
          title: 'Inicio de Sesión Exitoso',
          description: `¡Bienvenido, ${result.user.nombre}!`,
        });
        router.push('/dashboard');
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
          <CardTitle className="text-2xl font-bold">Admin Cortes</CardTitle>
          <CardDescription>Ingresa tus credenciales para acceder al panel.</CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="correo">Correo Electrónico</Label>
              <Input
                id="correo"
                type="email"
                placeholder="tucorreo@ejemplo.com"
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
                placeholder="Ingresa tu contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
             <p className="text-xs text-destructive mt-2">
                **Importante:** Este login usa un método de "hashing" simulado (inseguro). En producción, implementa Firebase Authentication o hashing seguro y salado en servidor (bcrypt/Argon2).
             </p>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
