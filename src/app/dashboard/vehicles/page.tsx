// src/app/dashboard/vehicles/page.tsx
'use client';

import * as React from 'react';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { VehicleEditDialog } from '@/components/vehicle-edit-dialog';
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
        console.log(vehiclesData)
        setBrands(brandsData);
        console.log(brandsData)
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
  console.log(vehicles)

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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Marca</TableHead>
                <TableHead>Modelo</TableHead>
                <TableHead>Año</TableHead>
                 <TableHead>Color(es)</TableHead>
                <TableHead>Corte Corriente</TableHead>
                <TableHead>Ubicación Corte</TableHead>
                <TableHead>Observaciones</TableHead>
                <TableHead>Imágenes</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vehicles.length > 0 ? (
                vehicles.map((vehicle) => (
                  <TableRow key={vehicle.id}>
                    <TableCell>{vehicle.brand ?? 'N/A'}</TableCell>
                    <TableCell>{vehicle.model ?? 'N/A'}</TableCell>
                    <TableCell>{vehicle.year ?? 'N/A'}</TableCell>
                    <TableCell>{vehicle.colors ?? 'N/A'}</TableCell>
                    <TableCell>{vehicle.corte ?? 'N/A'}</TableCell>
                    <TableCell>{vehicle.ubicacion ?? 'N/A'}</TableCell>
                    <TableCell className="text-xs max-w-xs truncate">
                      {vehicle.observation ?? 'N/A'}
                      {/* Display N/A if no observation */}
                    </TableCell>
                    <TableCell>
                      {vehicle.imageUrls && vehicle.imageUrls.length > 0 ? (
                        <div className="flex space-x-1 items-center">
                          <img
                            src={vehicle.imageUrls[0]}
                            alt={`Imagen de ${vehicle.brand} ${vehicle.model}`}
                            width={40}
                            height={30}
                            className="rounded object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                            }}
                          />
                          {vehicle.imageUrls.length > 1 && (
                            <span className="text-xs text-muted-foreground self-center ml-1">
                              +{vehicle.imageUrls.length - 1} más
                            </span>
                          )}
                        </div>
                      ) : (
                        <>
                          <span className="text-xs text-muted-foreground">N/A</span>
                          {/* Display N/A if no images */}
                        </>
                      )}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditClick(vehicle)}
                        aria-label={`Editar ${vehicle.brand} ${vehicle.model}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive-foreground hover:bg-destructive/90"
                        onClick={() => handleDeleteClick(vehicle)}
                        aria-label={`Eliminar ${vehicle.brand} ${vehicle.model}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center">
                    No se encontraron vehículos.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
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
}
