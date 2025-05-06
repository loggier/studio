// src/app/dashboard/vehicles/page.tsx
'use client';

import React from 'react';
import Image from 'next/image';
import {
  ColumnDef,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Edit, Trash2, Eye } from 'lucide-react';
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
import { DataTable } from '@/components/ui/data-table';
import { VehicleTableViewOptions } from '@/components/ui/vehicle-table-view-options';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle as DialogTitleAlt,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { VehicleEditDialog } from '@/components/vehicle-edit-dialog';
import { ImageViewer } from '@/components/ui/image-viewer';

import {
  fetchVehicles,
  deleteVehicle,
  updateVehicle,
  Vehicle,
  UpdateVehicleData,
} from '@/lib/firebase/firestore/vehicles';
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
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = React.useState(false);
  const [vehicleDetails, setVehicleDetails] = React.useState<Vehicle | null>(null);
  const { toast } = useToast();

  const loadData = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [vehiclesData, brandsData] = await Promise.all([
        fetchVehicles(),
        fetchBrandsForSelect(),
      ]);
      setVehicles(vehiclesData);
      setBrands(brandsData);
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError('No se pudieron cargar los datos.');
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

  const handleEditClick = (v: Vehicle) => {
    setVehicleToEdit(v);
    setIsEditDialogOpen(true);
  };

  const handleDetailsClick = (v: Vehicle) => {
    setVehicleDetails(v);
    setIsDetailsDialogOpen(true);
  };

  const handleDeleteClick = (v: Vehicle) => {
    setVehicleToDelete(v);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = React.useCallback(async () => {
    if (!vehicleToDelete) return;
    try {
      await deleteVehicle(vehicleToDelete.id);
      toast({
        title: 'Vehículo Eliminado',
        description: `${vehicleToDelete.brand} ${vehicleToDelete.model} eliminado.`,
      });
      await loadData();
    } catch (err) {
      console.error('Error deleting:', err);
      toast({
        variant: 'destructive',
        title: 'Error al Eliminar',
        description: err instanceof Error ? err.message : 'No se pudo eliminar.',
      });
    } finally {
      setIsDeleteDialogOpen(false);
      setVehicleToDelete(null);
    }
  }, [vehicleToDelete, toast, loadData]);

  const handleUpdateVehicle = React.useCallback(
    async (id: string, data: UpdateVehicleData) => {
      await updateVehicle(id, data);
      await loadData();
    },
    [loadData]
  );

  const columns: ColumnDef<Vehicle>[] = [
    { accessorKey: 'brand', header: 'Marca' },
    { accessorKey: 'model', header: 'Modelo' },
    { accessorKey: 'year', header: 'Año' },
    { accessorKey: 'colors', header: 'Color(es)' },
    { accessorKey: 'corte', header: 'Corte Corriente' },
    { accessorKey: 'ubicacion', header: 'Ubicación Corte' },
    {
      accessorKey: 'observation',
      header: 'Observaciones',
      cell: ({ row }) => (
        <div className="text-xs max-w-xs truncate">
          {row.getValue('observation') || 'N/A'}
        </div>
      ),
    },
    {
      id: 'actions',
      header: 'Acciones',
      cell: ({ row }) => {
        const v = row.original;
        return (
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleDetailsClick(v)}
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleEditClick(v)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive hover:bg-destructive/10"
              onClick={() => handleDeleteClick(v)}
            >
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
    globalFilterFn: (row, _id, filter) => {
      const search = String(filter).toLowerCase();
      return [row.getValue('brand'), row.getValue('model')]
        .some((v) => String(v).toLowerCase().includes(search));
    },
  });

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Registro de Vehículos</CardTitle>
          <CardDescription>
            Lista de todos los vehículos en el sistema.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && !isLoading && (
            <p className="text-destructive mb-4">{error}</p>
          )}
          <div className="flex flex-col gap-4">
            {!isLoading && <VehicleTableViewOptions table={table} />}
            {isLoading ? (
              <Skeleton className="h-[200px] w-full" />
            ) : (
              <DataTable columns={columns} data={vehicles} table={table} />
            )}
          </div>
        </CardContent>
      </Card>

      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Eliminará permanentemente {vehicleToDelete?.brand}{' '}
              {vehicleToDelete?.model}.
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

      <VehicleEditDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        vehicle={vehicleToEdit}
        brands={brands}
        onUpdate={handleUpdateVehicle}
      />

      <Dialog
        open={isDetailsDialogOpen}
        onOpenChange={setIsDetailsDialogOpen}
      >
        {vehicleDetails && (
          <DialogContent className="max-w-4xl" >
            <DialogHeader>
              <DialogTitleAlt>
              {vehicleDetails.brand} {vehicleDetails.model} ({vehicleDetails.year})
              </DialogTitleAlt>
              <DialogDescription>{vehicleDetails.ubicacion}</DialogDescription>
            </DialogHeader>
              <div className="flex flex-col gap-2">
              <p>
                <span className="font-semibold">Detalles</span>
              </p>
              <div className='grid grid-cols-1 gap-2'>
                <p className='flex gap-2 items-center'>
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-car-front"><path d="M21.3 17H20V9a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8H2.7c-.4 0-.7.2-.9.5-.2.3-.2.8 0 1.1l1.5 2.2c.3.4.8.6 1.3.6h13.7c.5 0 1-.2 1.3-.6l1.5-2.2c.2-.3.2-.8 0-1.1-.1-.3-.4-.5-.8-.5z"/><path d="M16 17v4"/><path d="M8 17v4"/><circle cx="16" cy="5" r="1"/><circle cx="8" cy="5" r="1"/></svg> Tipo: Auto
                </p>
                {vehicleDetails.corte && (
                   <p><span className="font-semibold">Corte:</span> {vehicleDetails.corte}</p>
                )}
                {vehicleDetails.colors && (
                  <p><span className="font-semibold">Colores:</span> {vehicleDetails.colors}</p>
                )}
                {vehicleDetails.observation && (
                <p><span className="font-semibold">Observación:</span> {vehicleDetails.observation}</p>
                )}

              </div>
            </div>          
                <div className='grid grid-cols-1 gap-4 mt-4'>
                  <p><span className='font-semibold'>Imágenes:</span></p>
                  <div className="grid grid-cols-2 gap-4">
                      {vehicleDetails.imageUrls.map((image, index) => (
                        <ImageViewer key={index} imageUrl={image}>
                          {({ openImageViewer }) => (
                            <Image
                              src={image}
                              alt={`Imagen del vehículo ${index + 1}`}
                              width={100}
                              height={100}
                              
                              sizes="100vw" className="object-cover rounded-md hover:cursor-pointer" loading="lazy" />
                          )}
                        </ImageViewer>))}</div>
                </div>             
               
            <Separator className="my-4" />
            <DialogFooter>
              <Button onClick={() => setIsDetailsDialogOpen(false)}>
                Cerrar
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}
