// src/app/dashboard/models/page.tsx
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
    fetchModels,
    addModel,
    deleteModel,
    updateModel, // Import updateModel
    fetchBrandsForSelect,
    Model,
    NewModelData,
    UpdateModelData
} from '@/lib/firebase/firestore/models'; // Import Firestore functions
import type { Brand } from '@/lib/firebase/firestore/brands'; // Import Brand type

// Zod schema for model form validation
const modelSchema = z.object({
  name: z.string().min(1, { message: 'El nombre del modelo es obligatorio' }).max(50, { message: 'El nombre del modelo es demasiado largo' }),
  brandId: z.string({ required_error: 'Por favor selecciona una marca.' }).min(1, { message: 'La marca es obligatoria' }),
});

type ModelFormData = z.infer<typeof modelSchema>;

export default function ModelsPage() {
  const [models, setModels] = React.useState<Model[]>([]);
  const [brands, setBrands] = React.useState<Pick<Brand, 'id' | 'name'>[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isBrandsLoading, setIsBrandsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [editingModel, setEditingModel] = React.useState<Model | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [modelToDelete, setModelToDelete] = React.useState<{ id: string; name: string; brandName?: string } | null>(null);
  const { toast } = useToast();

  const form = useForm<ModelFormData>({
    resolver: zodResolver(modelSchema),
    defaultValues: {
      name: '',
      brandId: '',
    },
    mode: 'onChange',
  });

  const loadModels = React.useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await fetchModels(); // Use Firestore fetch
      setModels(data);
    } catch (err) {
      console.error('Error al obtener modelos:', err);
      setError('Error al cargar los modelos.');
       toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los modelos." });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const loadBrands = React.useCallback(async () => {
    try {
        setIsBrandsLoading(true);
        const brandsData = await fetchBrandsForSelect(); // Use Firestore fetch
        setBrands(brandsData);
    } catch (err) {
        console.error('Error al obtener marcas para el select:', err);
        toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar las marcas para el formulario." });
    } finally {
        setIsBrandsLoading(false);
    }
  }, [toast]);


  React.useEffect(() => {
    loadModels();
    loadBrands();
  }, [loadModels, loadBrands]);

  const handleCancelEdit = React.useCallback(() => {
    setEditingModel(null); // Clear editing state
    form.reset(); // Clear the form
  }, [form]);

  const handleEdit = (model: Model) => {
    setEditingModel(model);
    form.setValue('name', model.name);
    form.setValue('brandId', model.brandId); // Populate form
  };

  // Opens the confirmation dialog
  const handleDeleteClick = (modelId: string, modelName: string, brandName?: string) => {
    if (!modelId || !modelName) {
        console.error("Error: modelId or modelName is missing for delete click.");
        return;
    }
    setModelToDelete({ id: modelId, name: modelName, brandName });
    setIsDeleteDialogOpen(true);
  };

  // Performs the actual deletion after confirmation
  const confirmDelete = React.useCallback(async () => {
    if (!modelToDelete) return;

    try {
      await deleteModel(modelToDelete.id); // Use Firestore delete
      toast({
        title: "Modelo Eliminado",
        description: `El modelo "${modelToDelete.name}" (${modelToDelete.brandName || ''}) ha sido eliminado.`,
      });
      await loadModels(); // Refresh the list
      if (editingModel && editingModel.id === modelToDelete.id) {
        handleCancelEdit(); // Cancel edit if the deleted model was being edited
      }
    } catch (err) {
      console.error("Error al eliminar modelo:", err);
      toast({
        variant: "destructive",
        title: "Error al Eliminar Modelo",
        description: err instanceof Error ? err.message : "Error al eliminar el modelo. Podría estar en uso u ocurrió otro error.",
      });
    } finally {
      setIsDeleteDialogOpen(false);
      setModelToDelete(null);
    }
  }, [modelToDelete, toast, loadModels, editingModel, handleCancelEdit]);


  const onSubmit = async (data: ModelFormData) => {
    setIsSubmitting(true);
    try {
      if (editingModel) {
        // Update existing model
        const updateData: UpdateModelData = {
          name: data.name,
          brandId: data.brandId,
        };
        await updateModel(editingModel.id, updateData);
        const updatedBrand = brands.find(b => b.id === data.brandId);
        toast({
          title: 'Modelo Actualizado',
          description: `El modelo "${data.name}" (${updatedBrand?.name || ''}) ha sido actualizado.`,
        });
      } else {
        // Add new model
        const newModelData: NewModelData = { name: data.name, brandId: data.brandId };
        const newModel = await addModel(newModelData); // Use Firestore add
        toast({
          title: 'Modelo Agregado',
          description: `El modelo "${newModel.name}" (${newModel.brandName || ''}) ha sido agregado.`,
        });
      }
      form.reset(); // Reset form fields
      await loadModels(); // Reload the list
      setEditingModel(null); // Exit editing mode
    } catch (err) {
      console.error('Error al agregar/actualizar modelo:', err);
      toast({
        variant: 'destructive',
        title: editingModel ? 'Error al Actualizar' : 'Error al Agregar',
        description: err instanceof Error ? err.message : `Error al ${editingModel ? 'actualizar' : 'agregar'} el modelo.`,
      });
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <>
      <div className="grid gap-6 md:grid-cols-3">
        {/* Add/Edit Model Form */}
        <div className="md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>{editingModel ? 'Editar Modelo' : 'Agregar Nuevo Modelo'}</CardTitle>
              <CardDescription>
                {editingModel ? `Modifica los datos del modelo "${editingModel.name}".` : 'Crea un nuevo modelo de vehículo y vincúlalo a una marca.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="brandId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Marca</FormLabel>
                        <Select
                            onValueChange={field.onChange}
                            value={field.value} // Controlled component
                            disabled={isBrandsLoading || isSubmitting}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={isBrandsLoading ? "Cargando marcas..." : "Selecciona una marca"} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {brands.map((brand) => (
                              <SelectItem key={brand.id} value={brand.id}>
                                {brand.name}
                              </SelectItem>
                            ))}
                            {!isBrandsLoading && brands.length === 0 && (
                                <SelectItem value="no-brands" disabled>No hay marcas disponibles</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                   <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre del Modelo</FormLabel>
                        <FormControl>
                          <Input placeholder="Ej: Corolla" {...field} disabled={isSubmitting}/>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                   <div className="flex flex-col gap-2"> {/* Stack buttons vertically */}
                        <Button type="submit" disabled={isSubmitting || isBrandsLoading || !form.formState.isValid}>
                          {editingModel ? (
                              <>
                               {/* Edit icon optional */}
                               {isSubmitting ? 'Actualizando...' : 'Actualizar Modelo'}
                              </>
                          ) : (
                              <>
                               <PlusCircle className="mr-2 h-4 w-4" />
                               {isSubmitting ? 'Agregando...' : 'Agregar Modelo'}
                              </>
                          )}
                        </Button>
                        {editingModel && (
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

        {/* Models List */}
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Modelos Existentes</CardTitle>
              <CardDescription>Lista de modelos de vehículos gestionados.</CardDescription>
            </CardHeader>
            <CardContent>
               {error && !isLoading && <p className="text-destructive mb-4">{error}</p>}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre Modelo</TableHead>
                    <TableHead>Marca</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                   {isLoading ? (
                     Array.from({ length: 4 }).map((_, index) => (
                       <TableRow key={`skel-model-${index}`}>
                         <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                         <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                         <TableCell className="text-right space-x-1">
                           <Skeleton className="h-8 w-8 inline-block rounded"/>
                           <Skeleton className="h-8 w-8 inline-block rounded"/>
                         </TableCell>
                       </TableRow>
                     ))
                   ) : models.length > 0 ? (
                     models.map((model) => (
                       <TableRow key={model.id} className={editingModel?.id === model.id ? 'bg-muted/50' : ''}>
                         <TableCell className="font-medium">{model.name}</TableCell>
                         <TableCell>{model.brandName}</TableCell>
                         <TableCell className="text-right space-x-1">
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(model)} aria-label={`Editar ${model.name}`}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive-foreground hover:bg-destructive/90"
                              onClick={() => handleDeleteClick(model.id, model.name, model.brandName)}
                               aria-label={`Eliminar ${model.name}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                         </TableCell>
                       </TableRow>
                     ))
                   ) : (
                     <TableRow>
                       <TableCell colSpan={3} className="h-24 text-center">
                         No se encontraron modelos. Agrega uno usando el formulario.
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
              Esta acción no se puede deshacer. Esto eliminará permanentemente el modelo
              <strong> "{modelToDelete?.name}"</strong> ({modelToDelete?.brandName || ''}).
              {/* Consider adding implications */}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setModelToDelete(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Continuar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
