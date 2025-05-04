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

// Zod schema for vehicle edit form validation
const vehicleEditSchema = z.object({
  vin: z.string().min(1, 'VIN es obligatorio').max(17, 'VIN inválido'),
  plate: z.string().min(1, 'Placa es obligatoria').max(10, 'Placa inválida'),
  modelId: z.string().min(1, 'Modelo es obligatorio'),
  year: z.coerce.number().min(1900, 'Año inválido').max(new Date().getFullYear() + 1, 'Año inválido'), // Coerce to number
  colors: z.string().min(1, 'Color es obligatorio').max(50, 'Color demasiado largo'),
  status: z.enum(['Active', 'Inactive', 'Maintenance'], { required_error: 'Estado es obligatorio' }),
  corte: z.string().max(100, 'Corte demasiado largo').optional(),
  observation: z.string().max(500, 'Observación demasiado larga').optional(),
  ubicacion: z.string().max(100, 'Ubicación demasiado larga').optional(),
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
  const [selectedBrandId, setSelectedBrandId] = React.useState<string | null>(null);

  const form = useForm<VehicleEditFormData>({
    resolver: zodResolver(vehicleEditSchema),
    defaultValues: { // Initialize with empty or default values
      vin: '',
      plate: '',
      modelId: '',
      year: new Date().getFullYear(), // Default to current year
      colors: '',
      status: 'Active',
      corte: '',
      observation: '',
      ubicacion: '',
    },
  });

  // Effect to reset form when vehicle data changes or dialog closes
  React.useEffect(() => {
    if (open && vehicle) {
      // Find the brand ID associated with the vehicle's model
       const initialBrandId = brands.find(b => b.name === vehicle.brand)?.id || null;
       setSelectedBrandId(initialBrandId);

      form.reset({
        vin: vehicle.vin || '',
        plate: vehicle.plate || '',
        modelId: vehicle.modelId || '',
        year: vehicle.year || new Date().getFullYear(),
        colors: vehicle.colors || '',
        status: vehicle.status || 'Active',
        corte: vehicle.corte || '',
        observation: vehicle.observation || '',
        ubicacion: vehicle.ubicacion || '',
      });
    } else if (!open) {
      form.reset(); // Reset form when dialog closes
      setSelectedBrandId(null);
      setModelsForSelectedBrand([]);
    }
  }, [open, vehicle, form, brands]);

   // Effect to fetch models when selectedBrandId changes
   React.useEffect(() => {
    const fetchModels = async () => {
      if (selectedBrandId) {
        try {
          const models = await fetchModelsForSelectByBrand(selectedBrandId);
          setModelsForSelectedBrand(models);
          // Optionally reset modelId field if the current vehicle's modelId
          // doesn't belong to the newly selected brand (or handle this logic differently)
          // if (vehicle && vehicle.modelId && !models.some(m => m.id === vehicle.modelId)) {
          //     form.setValue('modelId', ''); // Reset if model doesn't match brand
          // }
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
  }, [selectedBrandId, form, toast]);

  const onSubmit = async (data: VehicleEditFormData) => {
    if (!vehicle) return;
    setIsSubmitting(true);
    try {
        const updateData: UpdateVehicleData = {
            ...data,
            // Brand and model names are derived from modelId selection in the updateVehicle function
        };
      await onUpdate(vehicle.id, updateData);
      toast({
        title: 'Vehículo Actualizado',
        description: `El vehículo con placa ${data.plate} ha sido actualizado.`,
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

  // Function to find the brand ID based on the currently selected model ID in the form
   const findBrandIdForModel = (modelId: string): string | null => {
        // This requires knowing the brand associated with each model, which we don't have directly here.
        // We need to fetch the selected model's details or rely on the initial vehicle data.
        // Let's use the initially determined selectedBrandId for simplicity,
        // assuming the user selects a brand first, then a model.
       return selectedBrandId;
   };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Vehículo</DialogTitle>
          <DialogDescription>
            Modifica los detalles del vehículo con placa {vehicle?.plate}. Los cambios en las imágenes no son permitidos aquí.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="vin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>VIN</FormLabel>
                    <FormControl>
                      <Input placeholder="VIN del vehículo" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="plate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Placa</FormLabel>
                    <FormControl>
                      <Input placeholder="Placa del vehículo" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               {/* Brand Selector */}
              <FormItem>
                 <FormLabel>Marca</FormLabel>
                 <Select
                    value={selectedBrandId ?? ''}
                    onValueChange={(brandId) => {
                        setSelectedBrandId(brandId);
                        form.setValue('modelId', ''); // Reset model when brand changes
                    }}
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
                  {/* No FormMessage needed here as it's not directly a form field */}
               </FormItem>

              {/* Model Selector (Dynamic) */}
              <FormField
                control={form.control}
                name="modelId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Modelo</FormLabel>
                    <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={!selectedBrandId || modelsForSelectedBrand.length === 0} // Disable if no brand or models
                    >
                      <FormControl>
                        <SelectTrigger>
                           <SelectValue placeholder={!selectedBrandId ? "Selecciona una marca primero" : "Selecciona un modelo"} />
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
                      <Input type="number" placeholder="Año del modelo" {...field} />
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
                      <Input placeholder="Color(es) del vehículo" {...field} />
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
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un estado" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Active">Activo</SelectItem>
                        <SelectItem value="Inactive">Inactivo</SelectItem>
                        <SelectItem value="Maintenance">Mantenimiento</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="corte"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Corte Corriente</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: Bomba de gasolina" {...field} value={field.value ?? ''} />
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
                       <Input placeholder="Ej: Bajo asiento trasero" {...field} value={field.value ?? ''} />
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
                       <Textarea placeholder="Añade observaciones relevantes..." {...field} value={field.value ?? ''} />
                     </FormControl>
                     <FormMessage />
                   </FormItem>
                 )}
               />
            </div>

            <DialogFooter>
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