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
import { PlusCircle, Trash2 } from 'lucide-react';
import { fetchBrands, addBrand, deleteBrand, Brand } from '@/lib/firebase/firestore/brands';

// Zod schema for brand form validation remains the same
const brandSchema = z.object({
  name: z.string().min(1, { message: 'El nombre de la marca es obligatorio' }).max(50, { message: 'El nombre de la marca es demasiado largo' }),
});

type BrandFormData = z.infer<typeof brandSchema>;

export default function BrandsPage() {
  const [brands, setBrands] = React.useState<Brand[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const { toast } = useToast();

  const form = useForm<BrandFormData>({
    resolver: zodResolver(brandSchema),
    defaultValues: {
      name: '',
    },
  });

  const loadBrands = React.useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await fetchBrands(); // Use Firestore fetch
      setBrands(data);
    } catch (err) {
      console.error('Error al obtener marcas:', err);
      setError('Error al cargar las marcas.');
      toast({
        variant: "destructive",
        title: "Error al Cargar Marcas",
        description: "No se pudieron obtener las marcas de la base de datos. Por favor, inténtalo de nuevo más tarde.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    loadBrands();
  }, [loadBrands]);

  const onSubmit = async (data: BrandFormData) => {
    try {
      const newBrand = await addBrand({ name: data.name }); // Use Firestore add
      toast({
        title: 'Marca Agregada',
        description: `La marca "${newBrand.name}" ha sido agregada exitosamente.`,
      });
      form.reset(); // Reset form fields
      await loadBrands(); // Reload the list
    } catch (err) {
      console.error('Error al agregar marca:', err);
      toast({
        variant: 'destructive',
        title: 'Error al Agregar Marca',
        description: err instanceof Error ? err.message : 'Error al agregar la marca. Por favor, inténtalo de nuevo.',
      });
    }
  };

  const handleDelete = async (brandId: string, brandName: string) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar la marca "${brandName}"? Esta acción no se puede deshacer.`)) {
      return;
    }
    try {
      await deleteBrand(brandId); // Use Firestore delete
      toast({
        title: "Marca Eliminada",
        description: `La marca "${brandName}" ha sido eliminada.`,
      });
      await loadBrands(); // Refresh the list
    } catch (err) {
      console.error("Error al eliminar marca:", err);
      toast({
        variant: "destructive",
        title: "Error al Eliminar Marca",
        description: err instanceof Error ? err.message : "Error al eliminar la marca. Podría estar en uso u ocurrió otro error.",
      });
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-3">
      {/* Add Brand Form */}
      <div className="md:col-span-1">
        <Card>
          <CardHeader>
            <CardTitle>Agregar Nueva Marca</CardTitle>
            <CardDescription>Crea una nueva marca de vehículo.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre de la Marca</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: Toyota" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  {form.formState.isSubmitting ? 'Agregando...' : 'Agregar Marca'}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>

      {/* Brands List */}
      <div className="md:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Marcas Existentes</CardTitle>
            <CardDescription>Lista de marcas de vehículos gestionadas.</CardDescription>
          </CardHeader>
          <CardContent>
            {error && !isLoading && <p className="text-destructive mb-4">{error}</p>} {/* Show error only if not loading */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre de la Marca</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, index) => (
                    <TableRow key={`skel-brand-${index}`}>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell className="text-right">
                         {/* Adjust skeleton for single delete button */}
                        <Skeleton className="h-8 w-8 inline-block ml-2 rounded"/>
                      </TableCell>
                    </TableRow>
                  ))
                ) : brands.length > 0 ? (
                  brands.map((brand) => (
                    <TableRow key={brand.id}>
                      <TableCell className="font-medium">{brand.name}</TableCell>
                       <TableCell className="text-right">
                         {/* Add Edit button if needed */}
                         {/* <Button variant="ghost" size="icon" onClick={() => handleEdit(brand)}>
                            <Edit className="h-4 w-4" />
                         </Button> */}
                         <Button
                           variant="ghost"
                           size="icon"
                           className="text-destructive hover:text-destructive-foreground hover:bg-destructive/90"
                           onClick={() => handleDelete(brand.id, brand.name)}
                           aria-label={`Eliminar ${brand.name}`}
                         >
                           <Trash2 className="h-4 w-4" />
                         </Button>
                       </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={2} className="h-24 text-center">
                      No se encontraron marcas. Agrega una usando el formulario.
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
