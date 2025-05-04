// src/lib/firebase/firestore/vehicles.ts
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
  getDoc,
  writeBatch, // Import writeBatch if needed for complex operations
  where // Import where for model fetching by brand
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import type { Brand } from './brands';
import type { Model } from './models';

// Define the structure of a Vehicle in Firestore based on requested structure
export interface Vehicle {
  id: string; // Firestore document ID
  vin?: string; // Optional based on schema flexibility
  plate?: string; // Optional based on schema flexibility
  brand: string; // Store brand name directly
  model: string; // Store model name directly
  modelId: string; // Reference to the Model document ID
  year: number; // Stored as number
  colors: string; // Field name as requested
  corte?: string; // Optional field
  imageUrls?: string[]; // Optional array
  observation?: string; // Optional field
  ubicacion?: string; // Optional field
  status: 'Active' | 'Inactive' | 'Maintenance'; // Status field
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

// Define the structure for adding a new vehicle (Not used based on requirements, but good practice)
// export interface NewVehicleData { ... }

// Define the structure for updating a vehicle (matching the editable fields)
export interface UpdateVehicleData {
  vin?: string;
  plate?: string;
  // Brand and model names are derived from modelId, not directly updated here
  modelId?: string;
  year?: number; // Keep as number
  colors?: string;
  corte?: string | null; // Allow null to clear optional fields
  observation?: string | null; // Allow null
  ubicacion?: string | null; // Allow null
  status?: 'Active' | 'Inactive' | 'Maintenance';
}


const vehiclesCollectionRef = collection(db, 'vehicles');

/**
 * Fetches all vehicles from Firestore, ordered by creation date (or another field).
 * Includes brand and model names directly in the returned object.
 * @returns A promise that resolves to an array of Vehicle objects.
 */
export async function fetchVehicles(): Promise<Vehicle[]> {
  try {
    // Consider ordering by a more relevant field if needed, e.g., plate or vin
    const q = query(vehiclesCollectionRef, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);

    const vehicles = querySnapshot.docs.map(doc => {
      const data = doc.data();
      // Ensure numeric year, default if missing or invalid
      const year = typeof data.year === 'number' ? data.year : 0;
      return {
        id: doc.id,
        vin: data.vin || undefined, // Use undefined for missing optional fields
        plate: data.plate || undefined, // Use undefined
        brand: data.brand || 'Desconocida', // Use stored brand name
        model: data.model || 'Desconocido', // Use stored model name
        modelId: data.modelId || '', // Ensure modelId exists
        year: year,
        colors: data.colors || '', // Use 'colors' field
        corte: data.corte || undefined,
        imageUrls: data.imageUrls || [], // Default to empty array if missing
        observation: data.observation || undefined,
        ubicacion: data.ubicacion || undefined,
        status: data.status || 'Inactive', // Default status
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      } as Vehicle; // Cast to Vehicle, ensure defaults align with type
    });

    return vehicles;
  } catch (error) {
    console.error('Error fetching vehicles: ', error);
    throw new Error('Failed to fetch vehicles from Firestore.');
  }
}

/**
 * Updates an existing vehicle in the Firestore 'vehicles' collection.
 * Handles fetching brand/model names if modelId changes.
 * @param vehicleId - The ID of the vehicle document to update.
 * @param updateData - An object containing the fields to update.
 * @returns A promise that resolves when the update is complete.
 */
export async function updateVehicle(vehicleId: string, updateData: UpdateVehicleData): Promise<void> {
    try {
        const vehicleDocRef = doc(db, 'vehicles', vehicleId);
        const dataToUpdate: any = { ...updateData, updatedAt: serverTimestamp() };

        // Ensure year is a number if provided
        if (updateData.year !== undefined) {
            dataToUpdate.year = Number(updateData.year);
            if (isNaN(dataToUpdate.year)) {
                 throw new Error("Invalid year provided.");
            }
        }

        // If modelId is changing, fetch the new brand and model names
        if (updateData.modelId) {
            const modelDocRef = doc(db, 'models', updateData.modelId);
            const modelSnap = await getDoc(modelDocRef);
            if (modelSnap.exists()) {
                const modelData = modelSnap.data();
                dataToUpdate.model = modelData.name; // Update model name from fetched data
                // Also update brand name based on the new model's brandId
                const brandDocRef = doc(db, 'brands', modelData.brandId);
                const brandSnap = await getDoc(brandDocRef);
                if (brandSnap.exists()) {
                    dataToUpdate.brand = brandSnap.data()?.name; // Update brand name
                } else {
                    dataToUpdate.brand = 'Marca Desconocida'; // Fallback if brand is somehow missing
                }
            } else {
                // Handle case where the new modelId doesn't exist
                console.error(`Model with ID ${updateData.modelId} not found during update.`);
                throw new Error(`El modelo seleccionado (ID: ${updateData.modelId}) no existe.`);
                // Or set default names if that's preferred:
                // dataToUpdate.model = 'Modelo Desconocido';
                // dataToUpdate.brand = 'Marca Desconocida';
            }
        }

        // Remove fields explicitly set to undefined (optional fields being cleared)
        // Or handle null values appropriately if your schema uses null for absence
        Object.keys(dataToUpdate).forEach(key => {
            if (dataToUpdate[key] === undefined) {
                // If you want to remove the field entirely (Firestore doesn't store undefined)
                // delete dataToUpdate[key];
                // If you want to set it to null in Firestore:
                 dataToUpdate[key] = null;
            }
             // Ensure optional fields are set to null if empty string is passed and should be nullable
             if (['corte', 'observation', 'ubicacion'].includes(key) && dataToUpdate[key] === '') {
                 dataToUpdate[key] = null;
             }
        });

        // Ensure required fields are present before update (though Zod handles this in the form)
         if (dataToUpdate.modelId === '') throw new Error("Model ID cannot be empty during update.");
         if (dataToUpdate.colors === '') throw new Error("Colors cannot be empty during update.");
         // Add checks for other required fields if necessary


        await updateDoc(vehicleDocRef, dataToUpdate);
    } catch (error) {
        console.error('Error updating vehicle: ', error);
        throw new Error(`Failed to update vehicle: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Deletes a vehicle from the Firestore 'vehicles' collection.
 * @param vehicleId - The ID of the vehicle document to delete.
 * @returns A promise that resolves when the deletion is complete.
 */
export async function deleteVehicle(vehicleId: string): Promise<void> {
  try {
    const vehicleDocRef = doc(db, 'vehicles', vehicleId);
    await deleteDoc(vehicleDocRef);
  } catch (error) {
    console.error('Error deleting vehicle: ', error);
    throw new Error('Failed to delete vehicle from Firestore.');
  }
}

// Fetch models filtered by brand for the edit form
/**
 * Fetches models associated with a specific brand ID for select dropdowns.
 * @param brandId - The ID of the brand to filter models by.
 * @returns A promise that resolves to an array of minimal Model objects (id, name).
 */
export async function fetchModelsForSelectByBrand(brandId: string): Promise<Pick<Model, 'id' | 'name'>[]> {
    if (!brandId) return []; // Return empty if no brand is selected
    try {
        const q = query(
            collection(db, 'models'),
            where('brandId', '==', brandId),
            orderBy('name')
        );
        const querySnapshot = await getDocs(q);
        const models = querySnapshot.docs.map(doc => ({
            id: doc.id,
            name: doc.data().name as string,
        }));
        return models;
    } catch (error) {
        console.error(`Error fetching models for brand ${brandId}: `, error);
        throw new Error('Failed to fetch models for the selected brand.');
    }
}
