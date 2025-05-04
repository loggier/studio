// src/components/vehicle-edit-dialog.tsx
'use client';

import * as React from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea'; // Import Textarea
import { useToast } from '@/hooks/use-toast';
import type { Vehicle, UpdateVehicleData } from '@/lib/firebase/firestore/vehicles';
import type { Brand } from '@/lib/firebase/firestore/brands';
import type { Model } from '@/lib/firebase/firestore/models';
import { fetchModelsForSelectByBrand } from '@/lib/firebase/firestore/vehicles'; // Import function to fetch models by brand

// Zod schema for vehicle edit form validation based on requested fields
// Removed vin, plate, and status
const vehicleEditSchema = z.object({
  modelId: z.string().min(1, 'Modelo es obligatorio'),
  year: z.coerce.number().int().min(1900, 'Año inválido').max(new Date().getFullYear() + 1, 'Año inválido'),
  colors: z.string().min(1, 'Color(es) es obligatorio').max(50, 'Color(es) demasiado largo'),
  corte: z.string().max(100, 'Corte demasiado largo').optional().nullable(),
  observation: z.string().max(500, 'Observación demasiado larga').optional().nullable(),
  ubicacion: z.string().max(100, 'Ubicación demasiado larga').optional().nullable(),
});

type VehicleEditFormData = z.infer<typeof vehicleEditSchema>;

interface VehicleEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicle: Vehicle | null;
  brands: Pick<Brand, 'id' | 'name'>[]; // Brands for the dropdown
  // Models are fetched dynamically based on brand selection
  onUpdate: (vehicleId: string, data: UpdateVehicleData) => Promise<void>; // Callback for update
}

export function VehicleEditDialog({
  open,
  onOpenChange,
  vehicle,
  brands,
  onUpdate,
}: VehicleEditDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [modelsForSelectedBrand, setModelsForSelectedBrand] = React.useState<Pick<Model, 'id' | 'name'>[]>([]);
  // Store the brand ID separately for dynamic model fetching
  const [selectedBrandId, setSelectedBrandId] = React.useState<string | null>(null);

  const form = useForm<VehicleEditFormData>({
    resolver: zodResolver(vehicleEditSchema),
    defaultValues: { // Initialize with empty or default values matching the updated schema
      modelId: '',
      year: new Date().getFullYear(),
      colors: '',
      corte: '',
      observation: '',
      ubicacion: '',
    },
  });

  // Effect to reset form when vehicle data changes or dialog closes
  React.useEffect(() => {
    if (open && vehicle) {
       // Find the brand ID associated with the vehicle's modelId
       const modelBrandId = vehicle.brand ? brands.find(b => b.name === vehicle.brand)?.id : null;
       setSelectedBrandId(modelBrandId); // Set the initial brand ID

      form.reset({
        // Removed vin, plate, status from reset
        modelId: vehicle.modelId || '',
        year: vehicle.year || new Date().getFullYear(),
        colors: vehicle.colors || '',
        corte: vehicle.corte || '',
        observation: vehicle.observation || '',
        ubicacion: vehicle.ubicacion || '',
      });
    } else if (!open) {
      form.reset(); // Reset form when dialog closes
      setSelectedBrandId(null); // Reset brand selection
      setModelsForSelectedBrand([]); // Clear models
    }
  }, [open, vehicle, form, brands]);

   // Effect to fetch models when selectedBrandId changes
   React.useEffect(() => {
    const fetchModels = async () => {
      if (selectedBrandId) {
        try {
          setModelsForSelectedBrand([]); // Clear previous models while loading
          const models = await fetchModelsForSelectByBrand(selectedBrandId);
          setModelsForSelectedBrand(models);

          // If the current form modelId doesn't belong to the new brand, reset it
          const currentModelId = form.getValues('modelId');
          if (currentModelId && !models.some(m => m.id === currentModelId)) {
              form.setValue('modelId', '', { shouldValidate: true }); // Reset modelId if it's not in the new list
          }

        } catch (error) {
          console.error("Error fetching models for brand:", error);
          setModelsForSelectedBrand([]); // Clear models on error
          toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los modelos para la marca seleccionada.' });
        }
      } else {
        setModelsForSelectedBrand([]); // Clear models if no brand is selected
      }
    };

    fetchModels();
   }, [selectedBrandId, form, toast]); // Rerun when selectedBrandId changes

  const onSubmit = async (data: VehicleEditFormData) => {
    if (!vehicle) return;
    setIsSubmitting(true);
    try {
        // Prepare data for Firestore, ensuring correct types and structure
        // Removed vin, plate, status from updateData
        const updateData: UpdateVehicleData = {
            ...data,
            year: Number(data.year), // Ensure year is a number
            // Brand and model names will be updated based on modelId in the updateVehicle function
        };
      await onUpdate(vehicle.id, updateData);
      toast({
        title: 'Vehículo Actualizado',
        description: `El vehículo ${vehicle.brand} ${vehicle.model} ha sido actualizado.`, // Adjusted toast message
      });
      onOpenChange(false); // Close dialog on success
    } catch (error) {
      console.error('Error updating vehicle:', error);
      toast({
        variant: 'destructive',
        title: 'Error al Actualizar',
        description: error instanceof Error ? error.message : 'No se pudo actualizar el vehículo.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Vehículo</DialogTitle>
          <DialogDescription>
            Modifica los detalles del vehículo <strong>{vehicle?.brand} {vehicle?.model} ({vehicle?.year})</strong>. Las imágenes no se pueden modificar aquí. {/* Updated description */}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4 sm:grid-cols-2 pt-4">
            {/* Removed VIN and Plate fields */}
              {/* Brand Selector - Controls selectedBrandId state */}
              <FormItem>
                 <FormLabel>Marca</FormLabel>
                 <Select
                    value={selectedBrandId ?? ''}
                    onValueChange={(brandId) => {
                        setSelectedBrandId(brandId); // Update state to trigger model fetch
                        form.setValue('modelId', ''); // Reset model selection when brand changes
                    }}
                    disabled={isSubmitting}
                 >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona una marca" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {brands.map((brand) => (
                        <SelectItem key={brand.id} value={brand.id}>
                          {brand.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {/* No FormMessage needed here directly */}
               </FormItem>

              {/* Model Selector (Dynamic based on selectedBrandId) */}
              <FormField
                control={form.control}
                name="modelId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Modelo</FormLabel>
                    <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={!selectedBrandId || modelsForSelectedBrand.length === 0 || isSubmitting}
                    >
                      <FormControl>
                        <SelectTrigger>
                           <SelectValue placeholder={!selectedBrandId ? "Selecciona marca primero" : "Selecciona un modelo"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {modelsForSelectedBrand.map((model) => (
                          <SelectItem key={model.id} value={model.id}>
                            {model.name}
                          </SelectItem>
                        ))}
                        {selectedBrandId && modelsForSelectedBrand.length === 0 && (
                            <SelectItem value="no-models" disabled>No hay modelos para esta marca</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="year"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Año</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="Año del modelo" {...field} disabled={isSubmitting} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="colors"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Color(es)</FormLabel>
                    <FormControl>
                      <Input placeholder="Color(es) del vehículo" {...field} disabled={isSubmitting}/>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {/* Status field removed */}
               <FormField
                control={form.control}
                name="corte"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Corte Corriente</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: Bomba de gasolina" {...field} value={field.value ?? ''} disabled={isSubmitting}/>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
                <FormField
                 control={form.control}
                 name="ubicacion"
                 render={({ field }) => (
                   <FormItem>
                     <FormLabel>Ubicación Corte</FormLabel>
                     <FormControl>
                       <Input placeholder="Ej: Bajo asiento trasero" {...field} value={field.value ?? ''} disabled={isSubmitting}/>
                     </FormControl>
                     <FormMessage />
                   </FormItem>
                 )}
               />
               <FormField
                 control={form.control}
                 name="observation"
                 render={({ field }) => (
                   <FormItem className="sm:col-span-2"> {/* Span across two columns */}
                     <FormLabel>Observaciones</FormLabel>
                     <FormControl>
                       <Textarea placeholder="Añade observaciones relevantes..." {...field} value={field.value ?? ''} disabled={isSubmitting}/>
                     </FormControl>
                     <FormMessage />
                   </FormItem>
                 )}
               />

            {/* Footer needs to be outside the form grid */}
            <DialogFooter className="sm:col-span-2 sm:flex sm:justify-end pt-4">
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isSubmitting}>
                  Cancelar
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isSubmitting || !form.formState.isValid}>
                {isSubmitting ? 'Actualizando...' : 'Guardar Cambios'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
