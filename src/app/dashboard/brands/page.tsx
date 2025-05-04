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
import { Edit, PlusCircle, Trash2, XCircle } from 'lucide-react';
import { fetchBrands, addBrand, deleteBrand, updateBrand, Brand } from '@/lib/firebase/firestore/brands';

// Zod schema for brand form validation remains the same
const brandSchema = z.object({
  name: z.string().min(1, { message: 'El nombre de la marca es obligatorio' }).max(50, { message: 'El nombre de la marca es demasiado largo' }),
});

type BrandFormData = z.infer<typeof brandSchema>;

export default function BrandsPage() {
  const [editingBrand, setEditingBrand] = React.useState<Brand | null>(null); // State to hold the brand being edited
  const [brands, setBrands] = React.useState<Brand[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const { toast } = useToast();

  const form = useForm<BrandFormData>({
    resolver: zodResolver(brandSchema),
    defaultValues: {
      name: '',
    },
    mode: 'onChange', // Add validation on change for better UX
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
      if (editingBrand) {
        // Update existing brand
        await updateBrand(editingBrand.id, data.name);
        toast({
          title: 'Marca Actualizada',
          description: `La marca "${data.name}" ha sido actualizada exitosamente.`,
        });
      } else {
        // Add new brand
        await addBrand({ name: data.name }); // Use Firestore add
        toast({
          title: 'Marca Agregada',
          description: `La marca "${data.name}" ha sido agregada exitosamente.`,
        });
      }
      form.reset(); // Reset form fields
      await loadBrands(); // Reload the list
      setEditingBrand(null); // Clear editing brand state
    } catch (err) {
      console.error('Error al agregar/actualizar marca:', err);
      toast({
        variant: 'destructive',
        title: editingBrand ? 'Error al Actualizar Marca' : 'Error al Agregar Marca',
        description: err instanceof Error ? err.message : `Error al ${editingBrand ? 'actualizar' : 'agregar'} la marca. Por favor, inténtalo de nuevo.`,
      });
    }
  };

  const handleEdit = (brand: Brand) => {
    setEditingBrand(brand);
    form.setValue('name', brand.name); // Populate form with brand name
  };

  const handleCancelEdit = () => {
    setEditingBrand(null); // Clear editing state
    form.reset(); // Clear the form
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
       // If the deleted brand was being edited, cancel edit mode
       if (editingBrand && editingBrand.id === brandId) {
        handleCancelEdit();
      }
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
      {/* Add/Edit Brand Form */}
      <div className="md:col-span-1">
        <Card>
          <CardHeader>
            <CardTitle>{editingBrand ? 'Editar Marca' : 'Agregar Nueva Marca'}</CardTitle>
            <CardDescription>
              {editingBrand ? `Modifica los datos de la marca "${editingBrand.name}".` : 'Crea una nueva marca de vehículo.'}
            </CardDescription>
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
                 <div className="flex flex-col gap-2"> {/* Stack buttons vertically */}
                    <Button type="submit" disabled={form.formState.isSubmitting || !form.formState.isValid}>
                      {editingBrand ? (
                          <>
                           {/* Edit icon can be added here if desired */}
                           {form.formState.isSubmitting ? 'Actualizando...' : 'Actualizar Marca'}
                          </>
                      ) : (
                          <>
                           <PlusCircle className="mr-2 h-4 w-4" />
                           {form.formState.isSubmitting ? 'Agregando...' : 'Agregar Marca'}
                          </>
                      )}
                    </Button>
                    {editingBrand && (
                        <Button
                          type="button"
                          variant="secondary" // Use secondary variant for cancel
                          onClick={handleCancelEdit}
                          disabled={form.formState.isSubmitting}
                        >
                          <XCircle className="mr-2 h-4 w-4" /> {/* Added Cancel icon */}
                          Cancelar
                        </Button>
                    )}
                 </div>
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
                      <TableCell className="text-right space-x-1"> {/* Add space for multiple icons */}
                         <Skeleton className="h-8 w-8 inline-block rounded"/>
                         <Skeleton className="h-8 w-8 inline-block rounded"/>
                      </TableCell>
                    </TableRow>
                  ))
                ) : brands.length > 0 ? (
                  brands.map((brand) => (
                    <TableRow key={brand.id} className={editingBrand?.id === brand.id ? 'bg-muted/50' : ''}>
                      <TableCell className="font-medium">{brand.name}</TableCell>
                      <TableCell className="text-right space-x-1"> {/* Space between buttons */}
                         <Button variant="ghost" size="icon" onClick={() => handleEdit(brand)} aria-label={`Editar ${brand.name}`}>
                            <Edit className="h-4 w-4" />
                         </Button>
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
