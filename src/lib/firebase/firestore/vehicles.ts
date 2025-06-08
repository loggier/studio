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
} from 'firebase/firestore'; // Import where for model fetching by brand
import { db } from '@/lib/firebase/config';
import type { Brand } from './brands';
import type { Model } from './models';

// Define the structure of a Vehicle in Firestore based on requested structure
export interface Vehicle {
  id: string; // Firestore document ID
  brand: string; // Store brand name directly
  model: string; // Store model name directly
  year: number; // Stored as number
  colors: string; // Field name as requested
  corte?: string; // Optional field
  imageUrls?: string[]; // Optional array of strings
  observation?: string; // Optional field
  ubicacion?: string; // Optional field
  modelId: string;
  userEmail?: string;
}

// Define the structure for adding a new vehicle (Not used based on requirements, but good practice)
// export interface NewVehicleData { ... }

// Define the structure for updating a vehicle (matching the editable fields)
// IMPORTANT: Update this interface to match exactly the fields being edited in the dialog
export interface UpdateVehicleData {
  modelId?: string;
  year?: number; // Keep as number
  colors?: string;
  corte?: string | null; // Allow null to clear optional fields
  observation?: string | null; // Allow null
  ubicacion?: string | null; // Allow null
  // Removed vin, plate, status updates
  // Brand and model names are derived from modelId in the update function
}


const vehiclesCollectionRef = collection(db, 'vehicles');

/**
 * Fetches all vehicles from Firestore, ordered by creation date (or another field).
 * Maps Firestore document fields to the Vehicle interface based on the user's specified fields.
 * @returns A promise that resolves to an array of Vehicle objects.
 */
export async function fetchVehicles(): Promise<Vehicle[]> {
  try {
    const q = query(vehiclesCollectionRef);
    const querySnapshot = await getDocs(q);

    const vehicles = querySnapshot.docs.map(doc => {
      const data = doc.data();

      // --- Field Mapping ---
      // Ensure correct types and handle missing/null values gracefully

      // Year: Expect number, provide default or handle error if invalid
      let year = 0; // Default year
      if (typeof data.year === 'number' && !isNaN(data.year)) {
        year = data.year;
      } else if (typeof data.year === 'string') {
        // Attempt to parse if it's a string, though Firestore should store it as number
        const parsedYear = parseInt(data.year, 10);
        if (!isNaN(parsedYear)) {
          year = parsedYear;
        } else {
          console.warn(`Invalid year format for vehicle ${doc.id}:`, data.year);
        }
      } else if (data.year != null) { // Check for non-null but invalid types
         console.warn(`Invalid year type for vehicle ${doc.id}:`, typeof data.year);
       }


      // ImageUrls: Expect array of strings, default to empty array
      const imageUrls = Array.isArray(data.imageUrls)
        ? data.imageUrls.filter(url => typeof url === 'string') // Ensure all elements are strings
        : [];

      return {
        id: doc.id,
        brand: typeof data.brand === 'string' ? data.brand : 'Desconocida',
        model: typeof data.model === 'string' ? data.model : 'Desconocido',
        modelId: typeof data.modelId === 'string' ? data.modelId : '', // Important: Ensure modelId exists
        year: year, // Use validated year (number)
        colors: typeof data.colors === 'string' ? data.colors : '',
        corte: typeof data.corte === 'string' ? data.corte : undefined, // Use undefined for optional missing fields
        imageUrls: imageUrls, // Use validated array
        observation: typeof data.observation === 'string' ? data.observation : undefined,
        userEmail: typeof data.userEmail === 'string' ? data.userEmail : undefined,
        ubicacion: typeof data.ubicacion === 'string' ? data.ubicacion : undefined,
        modelId: typeof data.modelId === 'string' ? data.modelId : '',
      } satisfies Vehicle; // Use 'satisfies' for type checking without casting
    });

    // console.log("Fetched Vehicles:", vehicles); // Temporary log for debugging
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
 * @param updateData - An object containing the fields to update (matching UpdateVehicleData).
 * @returns A promise that resolves when the update is complete.
 */
export async function updateVehicle(vehicleId: string, updateData: UpdateVehicleData): Promise<void> {
    try {
        const vehicleDocRef = doc(db, 'vehicles', vehicleId);
        const dataToUpdate: any = {};

        // Map provided updateData fields to the Firestore document structure
        // Ensure correct types and handle nulls for clearing fields

        if (updateData.year !== undefined) {
            const yearNum = Number(updateData.year);
            if (!isNaN(yearNum) && yearNum > 1886 && yearNum < 2100) { // Basic year validation
                dataToUpdate.year = yearNum;
            } else {
                throw new Error("Invalid year provided.");
            }
        }
        if (updateData.colors !== undefined) {
           if (typeof updateData.colors !== 'string' || updateData.colors.trim() === '') throw new Error("Colors cannot be empty.");
            dataToUpdate.colors = updateData.colors;
        }
         if (updateData.corte !== undefined) { // Handles null or string
             dataToUpdate.corte = updateData.corte === null ? null : (typeof updateData.corte === 'string' ? updateData.corte : null);
         }
         if (updateData.observation !== undefined) { // Handles null or string
             dataToUpdate.observation = updateData.observation === null ? null : (typeof updateData.observation === 'string' ? updateData.observation : null);
         }
          if (updateData.ubicacion !== undefined) { // Handles null or string
             dataToUpdate.ubicacion = updateData.ubicacion === null ? null : (typeof updateData.ubicacion === 'string' ? updateData.ubicacion : null);
         }

        // If modelId is changing, fetch the new brand and model names
        if (updateData.modelId && typeof updateData.modelId === 'string' && updateData.modelId.trim() !== '') {
             dataToUpdate.modelId = updateData.modelId; // Add modelId to update object
            const modelDocRef = doc(db, 'models', updateData.modelId);
            const modelSnap = await getDoc(modelDocRef);
            if (modelSnap.exists()) {
                const modelData = modelSnap.data();
                dataToUpdate.model = modelData.name; // Update model name from fetched data
                // Also update brand name based on the new model's brandId
                if (modelData.brandId) {
                     const brandDocRef = doc(db, 'brands', modelData.brandId);
                     const brandSnap = await getDoc(brandDocRef);
                     if (brandSnap.exists()) {
                         dataToUpdate.brand = brandSnap.data()?.name; // Update brand name
                     } else {
                         console.warn(`Brand document ${modelData.brandId} not found for model ${updateData.modelId}`);
                         dataToUpdate.brand = 'Marca Desconocida'; // Fallback if brand is somehow missing
                     }
                } else {
                     console.warn(`brandId missing in model document ${updateData.modelId}`);
                     dataToUpdate.brand = 'Marca Desconocida';
                }

            } else {
                // Handle case where the new modelId doesn't exist
                console.error(`Model with ID ${updateData.modelId} not found during update.`);
                throw new Error(`El modelo seleccionado (ID: ${updateData.modelId}) no existe.`);
            }
        } else if (updateData.modelId !== undefined) { // Handle case where modelId is explicitly set to empty/invalid
             throw new Error("Model ID cannot be empty or invalid during update.");
        }

        // Check if there are actual fields to update besides the timestamp
        if (Object.keys(dataToUpdate).length <= 1) {
            console.log("No fields to update for vehicle:", vehicleId);
            return; // Nothing to update
        }


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
