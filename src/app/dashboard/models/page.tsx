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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Trash2 } from 'lucide-react'; // Import Edit if needed

// Zod schema for model form validation
const modelSchema = z.object({
  id: z.string().optional(), // Optional for creation
  name: z.string().min(1, { message: 'Model name is required' }).max(50, { message: 'Model name too long' }),
  brandId: z.string({ required_error: 'Please select a brand.' }),
});

type ModelFormData = z.infer<typeof modelSchema>;

// Define the structure of a Model and Brand (for dropdown)
interface Model {
  id: string;
  name: string;
  brandId: string;
  brandName?: string; // Optional: Include brand name for display
}
interface Brand {
  id: string;
  name: string;
}

// Mock data and functions - replace with actual Firebase calls
let mockModels: Model[] = [
  { id: 'model1', name: 'Camry', brandId: 'brand1', brandName: 'Toyota' },
  { id: 'model2', name: 'Civic', brandId: 'brand2', brandName: 'Honda' },
  { id: 'model3', name: 'F-150', brandId: 'brand3', brandName: 'Ford' },
  { id: 'model4', name: 'Accord', brandId: 'brand2', brandName: 'Honda'},
];
let mockBrands: Brand[] = [
  { id: 'brand1', name: 'Toyota' },
  { id: 'brand2', name: 'Honda' },
  { id: 'brand3', name: 'Ford' },
];

async function fetchModels(): Promise<Model[]> {
  await new Promise(resolve => setTimeout(resolve, 600)); // Simulate delay
   // In a real app, you might fetch models and then lookup brand names or join data
   const modelsWithBrandNames = mockModels.map(model => {
      const brand = mockBrands.find(b => b.id === model.brandId);
      return { ...model, brandName: brand?.name || 'Unknown Brand' };
    });
  return [...modelsWithBrandNames]; // Return a copy
}

async function fetchBrandsForSelect(): Promise<Brand[]> {
    await new Promise(resolve => setTimeout(resolve, 200)); // Simulate delay
    return [...mockBrands]; // Return a copy
}

async function addModel(newModelData: Omit<Model, 'id' | 'brandName'>): Promise<Model> {
  await new Promise(resolve => setTimeout(resolve, 350)); // Simulate delay
  const newModel: Model = { ...newModelData, id: `model${mockModels.length + 1}` };
  mockModels.push(newModel);
  const brand = mockBrands.find(b => b.id === newModel.brandId);
  return { ...newModel, brandName: brand?.name || 'Unknown Brand' }; // Return with brand name
}

async function deleteModel(modelId: string): Promise<void> {
   await new Promise(resolve => setTimeout(resolve, 300)); // Simulate delay
   mockModels = mockModels.filter(m => m.id !== modelId);
}


export default function ModelsPage() {
  const [models, setModels] = React.useState<Model[]>([]);
  const [brands, setBrands] = React.useState<Brand[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isBrandsLoading, setIsBrandsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const { toast } = useToast();

  const form = useForm<ModelFormData>({
    resolver: zodResolver(modelSchema),
    defaultValues: {
      name: '',
      brandId: '',
    },
  });

  const loadModels = React.useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await fetchModels();
      setModels(data);
    } catch (err) {
      console.error('Failed to fetch models:', err);
      setError('Failed to load models.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadBrandsForSelect = React.useCallback(async () => {
    try {
        setIsBrandsLoading(true);
        const brandsData = await fetchBrandsForSelect();
        setBrands(brandsData);
    } catch (err) {
        console.error('Failed to fetch brands for select:', err);
        // Handle error loading brands for the form, maybe disable the form
        toast({ variant: "destructive", title: "Error", description: "Could not load brands for the form." });
    } finally {
        setIsBrandsLoading(false);
    }
  }, [toast]);


  React.useEffect(() => {
    loadModels();
    loadBrandsForSelect();
  }, [loadModels, loadBrandsForSelect]);

  const onSubmit = async (data: ModelFormData) => {
    if (!data.brandId) {
        toast({ variant: "destructive", title: "Validation Error", description: "Please select a brand." });
        return;
    }
    try {
      const newModel = await addModel({ name: data.name, brandId: data.brandId });
      toast({
        title: 'Model Added',
        description: `Model "${newModel.name}" for brand "${newModel.brandName}" has been successfully added.`,
      });
      form.reset(); // Reset form fields
      await loadModels(); // Reload the list
    } catch (err) {
      console.error('Failed to add model:', err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to add model. Please try again.',
      });
    }
  };

 const handleDelete = async (modelId: string, modelName: string) => {
    if (confirm(`Are you sure you want to delete the model "${modelName}"? This action cannot be undone.`)) {
        try {
            await deleteModel(modelId);
            toast({
                title: "Model Deleted",
                description: `Model "${modelName}" has been deleted.`,
            });
            await loadModels(); // Refresh the list
        } catch (err) {
            console.error("Failed to delete model:", err);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to delete model. It might be associated with vehicles.",
            });
        }
    }
};

  return (
    <div className="grid gap-6 md:grid-cols-3">
      {/* Add Model Form */}
      <div className="md:col-span-1">
        <Card>
          <CardHeader>
            <CardTitle>Add New Model</CardTitle>
            <CardDescription>Create a new vehicle model and link it to a brand.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="brandId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Brand</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isBrandsLoading}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={isBrandsLoading ? "Loading brands..." : "Select a brand"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {brands.map((brand) => (
                            <SelectItem key={brand.id} value={brand.id}>
                              {brand.name}
                            </SelectItem>
                          ))}
                          {!isBrandsLoading && brands.length === 0 && (
                              <SelectItem value="no-brands" disabled>No brands available</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Model Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Camry" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={form.formState.isSubmitting || isBrandsLoading}>
                   <PlusCircle className="mr-2 h-4 w-4" />
                  {form.formState.isSubmitting ? 'Adding...' : 'Add Model'}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>

      {/* Models List */}
      <div className="md:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Existing Models</CardTitle>
            <CardDescription>List of managed vehicle models.</CardDescription>
          </CardHeader>
          <CardContent>
             {error && <p className="text-destructive mb-4">{error}</p>}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Model Name</TableHead>
                  <TableHead>Brand</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                 {isLoading ? (
                   Array.from({ length: 4 }).map((_, index) => (
                     <TableRow key={`skel-model-${index}`}>
                       <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                       <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                       <TableCell className="text-right">
                         <Skeleton className="h-8 w-8 inline-block ml-2 rounded"/>
                         <Skeleton className="h-8 w-8 inline-block ml-2 rounded"/>
                       </TableCell>
                     </TableRow>
                   ))
                 ) : models.length > 0 ? (
                   models.map((model) => (
                     <TableRow key={model.id}>
                       <TableCell className="font-medium">{model.name}</TableCell>
                       <TableCell>{model.brandName}</TableCell>
                       <TableCell className="text-right">
                          {/* Add Edit button if needed */}
                          {/* <Button variant="ghost" size="icon" onClick={() => handleEdit(model)}>
                            <Edit className="h-4 w-4" />
                          </Button> */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => handleDelete(model.id, model.name)}
                             aria-label={`Delete ${model.name}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                       </TableCell>
                     </TableRow>
                   ))
                 ) : (
                   <TableRow>
                     <TableCell colSpan={3} className="h-24 text-center">
                       No models found. Add one using the form.
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
