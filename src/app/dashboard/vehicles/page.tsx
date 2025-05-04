'use client';

import * as React from 'react';
import Image from 'next/image'; // Import next/image
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button'; // Import Button
import { Skeleton } from '@/components/ui/skeleton';
import { Edit, Trash2 } from 'lucide-react'; // Import icons
import { useToast } from '@/hooks/use-toast'; // Import useToast
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"; // Import AlertDialog components
import { VehicleEditDialog } from '@/components/vehicle-edit-dialog'; // Import the edit dialog
import {
    fetchVehicles,
    deleteVehicle,
    updateVehicle,
    Vehicle,
    UpdateVehicleData
} from '@/lib/firebase/firestore/vehicles'; // Import Firestore functions
import { fetchBrandsForSelect } from '@/lib/firebase/firestore/models'; // Import function to fetch brands
import type { Brand } from '@/lib/firebase/firestore/brands';

export default function VehiclesPage() {
  const [vehicles, setVehicles] = React.useState<Vehicle[]>([]);
  const [brands, setBrands] = React.useState<Pick<Brand, 'id' | 'name'>[]>([]); // State for brands
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
        fetchBrandsForSelect() // Fetch brands for the edit dialog
      ]);
      setVehicles(vehiclesData);
      setBrands(brandsData);
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError('No se pudieron cargar los datos. Inténtalo de nuevo más tarde.');
       toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los vehículos o marcas." });
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
        title: "Vehículo Eliminado",
        description: `El vehículo con placa "${vehicleToDelete.plate}" ha sido eliminado.`,
      });
      await loadData(); // Refresh the list
    } catch (err) {
      console.error("Error al eliminar vehículo:", err);
      toast({
        variant: "destructive",
        title: "Error al Eliminar",
        description: err instanceof Error ? err.message : "No se pudo eliminar el vehículo.",
      });
    } finally {
      setIsDeleteDialogOpen(false);
      setVehicleToDelete(null);
    }
  }, [vehicleToDelete, toast, loadData]);

  const handleUpdateVehicle = React.useCallback(async (vehicleId: string, data: UpdateVehicleData): Promise<void> => {
      // The updateVehicle function from firestore/vehicles.ts handles the actual Firestore update
      await updateVehicle(vehicleId, data);
      await loadData(); // Refresh data after successful update
      // Toast is handled within the dialog upon successful submission
  }, [loadData]);


  const getStatusBadgeVariant = (status: Vehicle['status']) => {
    switch (status) {
      case 'Active':
        return 'default';
      case 'Inactive':
        return 'secondary';
      case 'Maintenance':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Registro de Vehículos</CardTitle>
          <CardDescription>Lista de todos los vehículos en el sistema.</CardDescription>
          {/* Add Button Removed as per requirement */}
        </CardHeader>
        <CardContent>
          {error && !isLoading && <p className="text-destructive mb-4">{error}</p>}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>VIN</TableHead>
                <TableHead>Placa</TableHead>
                <TableHead>Marca</TableHead>
                <TableHead>Modelo</TableHead>
                <TableHead>Año</TableHead>
                <TableHead>Color</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Imágenes</TableHead> {/* Added Images column */}
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={`skel-${index}`}>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-24 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-10 w-16 rounded" /></TableCell> {/* Skeleton for image */}
                    <TableCell className="text-right space-x-1">
                       <Skeleton className="h-8 w-8 inline-block rounded"/>
                       <Skeleton className="h-8 w-8 inline-block rounded"/>
                    </TableCell>
                  </TableRow>
                ))
              ) : vehicles.length > 0 ? (
                vehicles.map((vehicle) => (
                  <TableRow key={vehicle.id}>
                    <TableCell className="font-medium font-mono text-xs">{vehicle.vin}</TableCell>
                    <TableCell className="font-semibold">{vehicle.plate}</TableCell>
                    <TableCell>{vehicle.brand}</TableCell>
                    <TableCell>{vehicle.model}</TableCell>
                    <TableCell>{vehicle.year}</TableCell>
                    <TableCell>{vehicle.colors}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(vehicle.status)}>
                        {vehicle.status === 'Active' ? 'Activo' : vehicle.status === 'Inactive' ? 'Inactivo' : 'Mantenimiento'}
                      </Badge>
                    </TableCell>
                     <TableCell>
                        {vehicle.imageUrls && vehicle.imageUrls.length > 0 ? (
                         <div className="flex space-x-1">
                            {/* Display only the first image as a thumbnail */}
                           <Image
                             src={vehicle.imageUrls[0]}
                             alt={`Imagen de ${vehicle.plate}`}
                             width={40} // Smaller size for thumbnail
                             height={30}
                             className="rounded object-cover"
                             unoptimized // Add if domain is not configured in next.config.js
                             onError={(e) => e.currentTarget.style.display = 'none'} // Hide on error
                           />
                           {/* Indicate if more images exist */}
                           {vehicle.imageUrls.length > 1 && (
                             <span className="text-xs text-muted-foreground self-center">
                               +{vehicle.imageUrls.length - 1}
                             </span>
                           )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">N/A</span>
                        )}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEditClick(vehicle)} aria-label={`Editar ${vehicle.plate}`}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive-foreground hover:bg-destructive/90"
                        onClick={() => handleDeleteClick(vehicle)}
                        aria-label={`Eliminar ${vehicle.plate}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={9} className="h-24 text-center">
                    No se encontraron vehículos.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás absolutamente seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente el vehículo con placa
              <strong> "{vehicleToDelete?.plate}"</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setVehicleToDelete(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Continuar</AlertDialogAction>
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
