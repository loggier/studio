// src/app/dashboard/vehicles/page.tsx
'use client';

import * as React from 'react';
import { ColumnDef, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, useReactTable } from '@tanstack/react-table';


import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table'; 
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { VehicleTableViewOptions } from '@/components/ui/vehicle-table-view-options';
import { VehicleEditDialog } from '@/components/vehicle-edit-dialog';
import { fetchVehicles, deleteVehicle, updateVehicle, Vehicle, UpdateVehicleData } from '@/lib/firebase/firestore/vehicles';
import { fetchBrandsForSelect } from '@/lib/firebase/firestore/models';
import type { Brand } from '@/lib/firebase/firestore/brands';

export default function VehiclesPage() {
  const [vehicles, setVehicles] = React.useState<Vehicle[]>([]);
    const [brands, setBrands] = React.useState<Pick<Brand, 'id' | 'name'>[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [vehicleToDelete, setVehicleToDelete] = React.useState<Vehicle | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const [vehicleToEdit, setVehicleToEdit] = React.useState<Vehicle | null>(null);
  const { toast } = useToast();

  const loadData = React.useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [vehiclesData, brandsData] = await Promise.all([
        fetchVehicles(),
        fetchBrandsForSelect(),
      ]);
        setVehicles(vehiclesData);      
        setBrands(brandsData);   
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError('No se pudieron cargar los datos. Inténtalo de nuevo más tarde.');
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudieron cargar los vehículos o marcas.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const handleEditClick = (vehicle: Vehicle) => {
    setVehicleToEdit(vehicle);
    setIsEditDialogOpen(true);
  };

  const handleDeleteClick = (vehicle: Vehicle) => {
    setVehicleToDelete(vehicle);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = React.useCallback(async () => {
    if (!vehicleToDelete) return;

      try {
        await deleteVehicle(vehicleToDelete.id);
        toast({
          title: 'Vehículo Eliminado',
          description: `El vehículo ${vehicleToDelete.brand} ${vehicleToDelete.model} (${vehicleToDelete.modelId}) ha sido eliminado.`,
        });
        await loadData();
      } catch (err) {
        console.error('Error al eliminar vehículo:', err);
        toast({
        variant: 'destructive',
        title: 'Error al Eliminar',
        description: err instanceof Error ? err.message : 'No se pudo eliminar el vehículo.',
      });
    } finally {
      setIsDeleteDialogOpen(false);
      setVehicleToDelete(null);
    }
  }, [vehicleToDelete, toast, loadData]);

  const handleUpdateVehicle = React.useCallback(
    async (vehicleId: string, data: UpdateVehicleData): Promise<void> => {
      await updateVehicle(vehicleId, data);
      await loadData();
    },
    [loadData]
  );

    const columns: ColumnDef<Vehicle>[] = [
        {
            accessorKey: 'brand',
            header: 'Marca',
        },
        {
            accessorKey: 'model',
            header: 'Modelo',
        },
        {
            accessorKey: 'year',
            header: 'Año',
        },
        {
            accessorKey: 'colors',
            header: 'Color(es)',
        },
        {
            accessorKey: 'corte',
            header: 'Corte Corriente',
        },
        {
            accessorKey: 'ubicacion',
            header: 'Ubicación Corte',
        },
        {
            accessorKey: 'observation',
            header: 'Observaciones',
            cell: ({ row }) => {
                const observation = row.getValue('observation') as string;
                return (
                    <div className="text-xs max-w-xs truncate">
                        {observation ?? 'N/A'}
                    </div>
                );
            }
        },
        {
            id: 'actions',
            header: 'Acciones',
            cell: ({ row }) => {
                const vehicle = row.original;
                return (
                    <div className="flex justify-end gap-2">                        
                        <Button variant="ghost" size="icon" onClick={() => handleEditClick(vehicle)} aria-label={`Editar ${vehicle.brand} ${vehicle.model}`}>
                            <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive-foreground hover:bg-destructive/90" onClick={() => handleDeleteClick(vehicle)} aria-label={`Eliminar ${vehicle.brand} ${vehicle.model}`}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                );
            },
        },
    ];

    const table = useReactTable<Vehicle>({
        data: vehicles,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        globalFilterFn: (row, id, filterValue) => {
            if (!filterValue) {
                return true;
            }
            const model = String(row.getValue("model")).toLowerCase();
            const brand = String(row.getValue("brand")).toLowerCase();
            return model.includes(filterValue.toLowerCase()) || brand.includes(filterValue.toLowerCase());
        },
    });

  return (
    <>
        <Card>
        <CardHeader>
          <CardTitle>Registro de Vehículos</CardTitle>
          <CardDescription>Lista de todos los vehículos en el sistema.</CardDescription>
        </CardHeader>
        <CardContent>
          {error && !isLoading && (
            <p className="text-destructive mb-4">{error}</p>
            )}
            <div className='flex flex-col gap-4'>
                {!isLoading && <VehicleTableViewOptions table={table} />}
                {isLoading ? <Skeleton className="h-[200px] w-full" /> : <DataTable columns={columns} data={vehicles} table={table} />}
            </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás absolutamente seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente el vehículo{' '}
              <strong>
                {vehicleToDelete?.brand} {vehicleToDelete?.model} ({vehicleToDelete?.modelId})
              </strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setVehicleToDelete(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>
              Continuar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Vehicle Dialog */}
      <VehicleEditDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        vehicle={vehicleToEdit}
        brands={brands}
        onUpdate={handleUpdateVehicle}
      />
    </>
  );
};

