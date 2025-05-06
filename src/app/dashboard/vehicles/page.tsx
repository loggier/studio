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
          <DialogContent className="max-w-4xl sm:max-w-[625px]">
            <DialogHeader>
              <DialogTitleAlt>Detalles del Vehículo</DialogTitleAlt>
              <DialogDescription>
                <span className="text-lg font-semibold">
                  {vehicleDetails.brand} {vehicleDetails.model}
                </span>
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {vehicleDetails.imageUrls.slice(0, 5).map((url, i) => (
                <div
                  key={i}
                  className="relative w-full h-40 sm:h-32 md:h-40 lg:h-48"
                >
                  <ImageViewer imageUrl={url}>
                    {({ openImageViewer }) => (
                      <Image
                        src={url}
                        alt={`Imagen ${i + 1}`}
                        fill
                        className="object-cover cursor-pointer rounded-md"
                        onClick={openImageViewer}
                        sizes="(max-width: 768px) 100vw, 50vw"
                        unoptimized
                      />
                    )}
                  </ImageViewer>
                </div>
              ))}
            </div>
            {vehicleDetails.imageUrls.length > 5 && (
              <p className="mt-2 text-sm text-muted-foreground">
                +{vehicleDetails.imageUrls.length - 5} imágenes adicionales
              </p>
            )}
            <Separator className="my-4" />
            <div className="grid grid-cols-2 gap-4">
              <p>
                <span className="font-semibold">Año:</span> {vehicleDetails.year}
              </p>
              <p>
                <span className="font-semibold">Color(es):</span>{' '}
                {vehicleDetails.colors}
              </p>
              <p>
                <span className="font-semibold">Corte:</span> {vehicleDetails.corte}
              </p>
              <p>
                <span className="font-semibold">Ubicación Corte:</span>{' '}
                {vehicleDetails.ubicacion}
              </p>
            </div>
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
