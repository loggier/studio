// src/components/vehicle-edit-dialog.tsx
'use client';

import React, { useState, useEffect } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import type {
  Vehicle,
  UpdateVehicleData,
} from '@/lib/firebase/firestore/vehicles';
import type { Brand } from '@/lib/firebase/firestore/brands';
import type { Model } from '@/lib/firebase/firestore/models';
 
// Zod schema for validation
const vehicleEditSchema = z.object({
  modelId: z.string().min(1, 'Modelo es obligatorio'),
  year: z.coerce
    .number()
    .int()
    .min(1900, 'Año inválido')
    .max(new Date().getFullYear() + 1, 'Año inválido'),
  colors: z.string().min(1, 'Color(es) es obligatorio').max(50, 'Color(es) demasiado largo'),
  corte: z.string().max(100, 'Corte demasiado largo').optional().nullable(),
  ubicacion: z.string().max(100, 'Ubicación demasiado larga').optional().nullable(),
  observation: z.string().max(500, 'Observación demasiado larga').optional().nullable(),
});

type VehicleEditFormData = z.infer<typeof vehicleEditSchema>;

interface VehicleEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicle: Vehicle | null;
  brands: Pick<Brand, 'id' | 'name'>[];
  onUpdate: (vehicleId: string, data: UpdateVehicleData) => Promise<void>;
}

export function VehicleEditDialog({
  open,
  onOpenChange,
  vehicle,
  brands,
  onUpdate,
}: VehicleEditDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [models, setModels] = useState<Pick<Model, 'id' | 'name'>[]>([]);

  const form = useForm<VehicleEditFormData>({
    resolver: zodResolver(vehicleEditSchema),
    defaultValues: {
      year: vehicle?.year || new Date().getFullYear(),
      colors: vehicle?.colors || '',
      corte: vehicle?.corte || '',
      ubicacion: vehicle?.ubicacion || '',
      observation: vehicle?.observation || '',
    },
  });

  // Fetch models when dialog opens or vehicle changes
  useEffect(() => {
  }, [open, vehicle]);

  // Reset form when vehicle or models change
  useEffect(() => {
    if (open && vehicle) {
      form.reset({
        modelId: vehicle.modelId || '',
        year: vehicle.year || new Date().getFullYear(),
        colors: vehicle.colors || '',
        corte: vehicle.corte || '',
        ubicacion: vehicle.ubicacion || '',
        observation: vehicle.observation || '',
      });
    }
  }, [open, vehicle, models, form]);

  const onSubmit = async (data: VehicleEditFormData) => {
    if (!vehicle) return;
    setIsSubmitting(true);
    const updateData: UpdateVehicleData = {
      modelId: data.modelId,
      year: data.year,
      colors: data.colors,
      corte: data.corte || '',
      ubicacion: data.ubicacion || '',
      observation: data.observation || '',
    };
    try {
      await onUpdate(vehicle.id, updateData);
      toast({ title: 'Vehículo Actualizado', description: 'Los datos se actualizaron correctamente.' });
      onOpenChange(false);
    } catch (err) {
      console.error('Error updating vehicle:', err);
      toast({ variant: 'destructive', title: 'Error al Actualizar', description: err instanceof Error ? err.message : 'No se pudo actualizar.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Vehículo</DialogTitle>
          <DialogDescription>
            Modifica los datos del vehículo seleccionado. Las imágenes no se modifican aquí.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Read-only Brand */}
            <FormItem>
              <FormLabel>Marca</FormLabel>
              <FormControl>
                <Input readOnly value={vehicle?.brand || ''} />
              </FormControl>
            </FormItem>

            {/* Read-only Model */}
            <FormItem>
              <FormLabel>Modelo</FormLabel>
              <FormControl>
                <Input readOnly value={vehicle?.model || ''} />
              </FormControl>
            </FormItem>

            {/* Editable fields */}
            <FormField control={form.control} name="year"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Año</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} disabled={isSubmitting} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField control={form.control} name="colors"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Color(es)</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={isSubmitting} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField control={form.control} name="corte"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Corte Corriente</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={isSubmitting} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField control={form.control} name="ubicacion"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ubicación Corte</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={isSubmitting} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField control={form.control} name="observation"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Observaciones</FormLabel>
                  <FormControl>
                    <Textarea {...field} disabled={isSubmitting} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="sm:col-span-2 flex justify-end space-x-2">
              <DialogClose asChild>
                <Button variant="outline" disabled={isSubmitting}>Cancelar</Button>
              </DialogClose>
              <Button type="submit" disabled={isSubmitting || !form.formState.isValid}>
                {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
