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
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

// Define the structure of a Vehicle
interface Vehicle {
  id: string;
  vin: string;
  plate: string;
  brand: string; // Simplified: Assuming brand name is directly available
  model: string; // Simplified: Assuming model name is directly available
  year: number;
  color: string;
  status: 'Active' | 'Inactive' | 'Maintenance';
}

// Mock data fetching function - replace with actual Firebase call
async function fetchVehicles(): Promise<Vehicle[]> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  // In a real app, fetch from Firebase Firestore
  return [
    { id: 'v1', vin: 'VIN12345ABCDEF', plate: 'XYZ 123', brand: 'Toyota', model: 'Camry', year: 2021, color: 'Silver', status: 'Active' },
    { id: 'v2', vin: 'VIN67890GHIJKL', plate: 'ABC 456', brand: 'Honda', model: 'Civic', year: 2020, color: 'Black', status: 'Active' },
    { id: 'v3', vin: 'VINMNOPQRS12345', plate: 'DEF 789', brand: 'Ford', model: 'F-150', year: 2022, color: 'Red', status: 'Maintenance' },
    { id: 'v4', vin: 'VINUVWXYZ67890', plate: 'GHI 012', brand: 'Chevrolet', model: 'Malibu', year: 2019, color: 'Blue', status: 'Inactive' },
  ];
}

export default function VehiclesPage() {
  const [vehicles, setVehicles] = React.useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function loadVehicles() {
      try {
        setIsLoading(true);
        setError(null);
        const data = await fetchVehicles();
        setVehicles(data);
      } catch (err) {
        console.error('Failed to fetch vehicles:', err);
        setError('Failed to load vehicles. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    }
    loadVehicles();
  }, []);

  const getStatusBadgeVariant = (status: Vehicle['status']) => {
    switch (status) {
      case 'Active':
        return 'default'; // Use primary color (or adjust theme if needed)
      case 'Inactive':
        return 'secondary';
      case 'Maintenance':
        return 'destructive'; // Or use 'warning' if you add a custom variant
      default:
        return 'outline';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vehicle Records</CardTitle>
        <CardDescription>List of all vehicles in the system.</CardDescription>
      </CardHeader>
      <CardContent>
        {error && <p className="text-destructive">{error}</p>}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>VIN</TableHead>
              <TableHead>Plate</TableHead>
              <TableHead>Brand</TableHead>
              <TableHead>Model</TableHead>
              <TableHead>Year</TableHead>
              <TableHead>Color</TableHead>
              <TableHead>Status</TableHead>
              {/* Add <TableHead>Actions</TableHead> if needed later */}
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
                </TableRow>
              ))
            ) : vehicles.length > 0 ? (
              vehicles.map((vehicle) => (
                <TableRow key={vehicle.id}>
                  <TableCell className="font-medium">{vehicle.vin}</TableCell>
                  <TableCell>{vehicle.plate}</TableCell>
                  <TableCell>{vehicle.brand}</TableCell>
                  <TableCell>{vehicle.model}</TableCell>
                  <TableCell>{vehicle.year}</TableCell>
                  <TableCell>{vehicle.color}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(vehicle.status)}>
                      {vehicle.status}
                    </Badge>
                  </TableCell>
                   {/* Add actions cell if needed */}
                   {/* <TableCell>
                     <Button variant="ghost" size="icon"><Edit className="h-4 w-4" /></Button>
                     <Button variant="ghost" size="icon" className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                   </TableCell> */}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  No vehicles found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
