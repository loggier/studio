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
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import type { Brand } from './brands';
import type { Model } from './models';

// Define the structure of a Vehicle in Firestore based on provided structure and existing fields
export interface Vehicle {
  id: string; // Firestore document ID
  vin: string;
  plate: string;
  brand: string; // Store brand name directly (denormalized)
  model: string; // Store model name directly (denormalized)
  modelId: string; // Reference to the Model document ID
  year: number;
  colors: string; // Renamed from 'color' to 'colors' based on provided structure
  corte?: string; // Optional field from provided structure
  imageUrls?: string[]; // Optional array from provided structure
  observation?: string; // Optional field from provided structure
  ubicacion?: string; // Optional field from provided structure
  status: 'Active' | 'Inactive' | 'Maintenance'; // Keep status field
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

// Define the structure for adding a new vehicle (Not used based on requirements, but good practice)
// export interface NewVehicleData {
//   vin: string;
//   plate: string;
//   brand: string;
//   model: string;
//   modelId: string;
//   year: number;
//   colors: string;
//   status: 'Active' | 'Inactive' | 'Maintenance';
//   corte?: string;
//   imageUrls?: string[];
//   observation?: string;
//   ubicacion?: string;
// }

// Define the structure for updating a vehicle (excluding non-editable fields like id, imageUrls, createdAt)
export interface UpdateVehicleData {
  vin?: string;
  plate?: string;
  brand?: string; // Keep brand name here if it can change (though usually linked to modelId)
  model?: string; // Keep model name here if it can change (though usually linked to modelId)
  modelId?: string;
  year?: number;
  colors?: string;
  corte?: string;
  observation?: string;
  ubicacion?: string;
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
        vin: data.vin || '',
        plate: data.plate || '',
        brand: data.brand || 'Desconocida', // Use stored brand name
        model: data.model || 'Desconocido', // Use stored model name
        modelId: data.modelId || '',
        year: year,
        colors: data.colors || '', // Use 'colors' field
        corte: data.corte,
        imageUrls: data.imageUrls,
        observation: data.observation,
        ubicacion: data.ubicacion,
        status: data.status || 'Inactive',
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      } as Vehicle;
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

        // If modelId is changing, fetch the new brand and model names
        if (updateData.modelId) {
            const modelDocRef = doc(db, 'models', updateData.modelId);
            const modelSnap = await getDoc(modelDocRef);
            if (modelSnap.exists()) {
                const modelData = modelSnap.data();
                dataToUpdate.model = modelData.name; // Update model name
                // Also update brand name based on the new model's brand
                const brandDocRef = doc(db, 'brands', modelData.brandId);
                const brandSnap = await getDoc(brandDocRef);
                if (brandSnap.exists()) {
                    dataToUpdate.brand = brandSnap.data()?.name; // Update brand name
                } else {
                    dataToUpdate.brand = 'Marca Desconocida'; // Fallback
                }
            } else {
                // Handle case where the new modelId doesn't exist? Maybe throw error or set default names.
                console.warn(`Model with ID ${updateData.modelId} not found. Setting default names.`);
                dataToUpdate.model = 'Modelo Desconocido';
                dataToUpdate.brand = 'Marca Desconocida';
            }
        }

        // Remove undefined fields to avoid overwriting with null
        Object.keys(dataToUpdate).forEach(key => {
            if (dataToUpdate[key] === undefined) {
                delete dataToUpdate[key];
            }
        });


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

// It might be useful to fetch models filtered by brand for the edit form
/**
 * Fetches models associated with a specific brand ID.
 * @param brandId - The ID of the brand to filter models by.
 * @returns A promise that resolves to an array of Model objects (id, name).
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