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
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Trash2 } from 'lucide-react'; // Import Edit if needed

// Zod schema for brand form validation
const brandSchema = z.object({
  id: z.string().optional(), // Optional for creation, needed for identification
  name: z.string().min(1, { message: 'Brand name is required' }).max(50, { message: 'Brand name too long' }),
});

type BrandFormData = z.infer<typeof brandSchema>;

// Define the structure of a Brand
interface Brand {
  id: string;
  name: string; // Corresponds to 'brand' field in proposal? Using 'name' for consistency.
}

// Mock data and functions - replace with actual Firebase calls
let mockBrands: Brand[] = [
  { id: 'brand1', name: 'Toyota' },
  { id: 'brand2', name: 'Honda' },
  { id: 'brand3', name: 'Ford' },
];

async function fetchBrands(): Promise<Brand[]> {
  await new Promise(resolve => setTimeout(resolve, 500)); // Simulate delay
  return [...mockBrands]; // Return a copy
}

async function addBrand(newBrandData: Omit<Brand, 'id'>): Promise<Brand> {
  await new Promise(resolve => setTimeout(resolve, 300)); // Simulate delay
  const newBrand: Brand = { ...newBrandData, id: `brand${mockBrands.length + 1}` };
  mockBrands.push(newBrand);
  return newBrand;
}

async function deleteBrand(brandId: string): Promise<void> {
   await new Promise(resolve => setTimeout(resolve, 300)); // Simulate delay
   mockBrands = mockBrands.filter(b => b.id !== brandId);
}


export default function BrandsPage() {
  const [brands, setBrands] = React.useState<Brand[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const { toast } = useToast();

  const form = useForm<BrandFormData>({
    resolver: zodResolver(brandSchema),
    defaultValues: {
      name: '',
    },
  });

  const loadBrands = React.useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await fetchBrands();
      setBrands(data);
    } catch (err) {
      console.error('Failed to fetch brands:', err);
      setError('Failed to load brands.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadBrands();
  }, [loadBrands]);

  const onSubmit = async (data: BrandFormData) => {
    try {
      const newBrand = await addBrand({ name: data.name });
      toast({
        title: 'Brand Added',
        description: `Brand "${newBrand.name}" has been successfully added.`,
      });
      form.reset(); // Reset form fields
      await loadBrands(); // Reload the list
    } catch (err) {
      console.error('Failed to add brand:', err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to add brand. Please try again.',
      });
    }
  };

  const handleDelete = async (brandId: string, brandName: string) => {
    if (confirm(`Are you sure you want to delete the brand "${brandName}"? This action cannot be undone.`)) {
        try {
            await deleteBrand(brandId);
            toast({
                title: "Brand Deleted",
                description: `Brand "${brandName}" has been deleted.`,
            });
            await loadBrands(); // Refresh the list
        } catch (err) {
            console.error("Failed to delete brand:", err);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to delete brand. It might be in use.",
            });
        }
    }
};


  return (
    <div className="grid gap-6 md:grid-cols-3">
      {/* Add Brand Form */}
      <div className="md:col-span-1">
        <Card>
          <CardHeader>
            <CardTitle>Add New Brand</CardTitle>
            <CardDescription>Create a new vehicle brand.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Brand Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Toyota" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  {form.formState.isSubmitting ? 'Adding...' : 'Add Brand'}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>

      {/* Brands List */}
      <div className="md:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Existing Brands</CardTitle>
            <CardDescription>List of managed vehicle brands.</CardDescription>
          </CardHeader>
          <CardContent>
            {error && <p className="text-destructive mb-4">{error}</p>}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Brand Name</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, index) => (
                    <TableRow key={`skel-brand-${index}`}>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell className="text-right">
                        <Skeleton className="h-8 w-8 inline-block ml-2 rounded"/>
                        <Skeleton className="h-8 w-8 inline-block ml-2 rounded"/>
                      </TableCell>
                    </TableRow>
                  ))
                ) : brands.length > 0 ? (
                  brands.map((brand) => (
                    <TableRow key={brand.id}>
                      <TableCell className="font-medium">{brand.name}</TableCell>
                       <TableCell className="text-right">
                         {/* Add Edit button if needed */}
                         {/* <Button variant="ghost" size="icon" onClick={() => handleEdit(brand)}>
                            <Edit className="h-4 w-4" />
                         </Button> */}
                         <Button
                           variant="ghost"
                           size="icon"
                           className="text-destructive hover:text-destructive-foreground hover:bg-destructive/90"
                           onClick={() => handleDelete(brand.id, brand.name)}
                           aria-label={`Delete ${brand.name}`}
                         >
                           <Trash2 className="h-4 w-4" />
                         </Button>
                       </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={2} className="h-24 text-center">
                      No brands found. Add one using the form.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
