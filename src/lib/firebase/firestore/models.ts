// src/lib/firebase/firestore/models.ts
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  query,
  orderBy,
  where, // Import where for querying by brandId
  serverTimestamp,
  Timestamp, // Use Timestamp for type definitions
  getDoc, // Import getDoc to fetch a single document
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import type { Brand } from './brands'; // Import Brand type for linking

// Define the structure of a Model in Firestore
export interface Model {
  id: string; // Firestore document ID
  name: string;
  brandId: string; // Reference to the Brand document ID
  brandName?: string; // Optional: To store/display brand name directly
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

// Define the structure for adding a new model
export interface NewModelData {
  name: string;
  brandId: string;
}

// Define the structure for updating a model
export interface UpdateModelData {
  name?: string;
  brandId?: string;
}


const modelsCollectionRef = collection(db, 'models');
const brandsCollectionRef = collection(db, 'brands'); // Reference brands collection

/**
 * Fetches all models from Firestore, ordered by name, and includes the brand name.
 * @returns A promise that resolves to an array of Model objects including brandName.
 */
export async function fetchModels(): Promise<Model[]> {
  try {
    const q = query(modelsCollectionRef, orderBy('name')); // Order models by name
    const querySnapshot = await getDocs(q);

    const modelsPromises = querySnapshot.docs.map(async (modelDoc) => {
      const modelData = modelDoc.data();
      let brandName = 'Marca Desconocida'; // Default brand name

      // Fetch the corresponding brand document to get the name
      if (modelData.brandId) {
        const brandDocRef = doc(db, 'brands', modelData.brandId);
        const brandSnap = await getDoc(brandDocRef);
        if (brandSnap.exists()) {
          brandName = brandSnap.data()?.name || brandName;
        }
      }

      return {
        id: modelDoc.id,
        ...modelData,
        brandName: brandName,
      } as Model;
    });

    const models = await Promise.all(modelsPromises);
    return models;
  } catch (error) {
    console.error('Error fetching models: ', error);
    throw new Error('Failed to fetch models from Firestore.');
  }
}


/**
 * Fetches all brands specifically for populating a select dropdown.
 * @returns A promise that resolves to an array of minimal Brand objects (id, name).
 */
export async function fetchBrandsForSelect(): Promise<Pick<Brand, 'id' | 'name'>[]> {
  try {
    const q = query(brandsCollectionRef, orderBy('name')); // Order by name
    const querySnapshot = await getDocs(q);
    const brands = querySnapshot.docs.map(doc => ({
      id: doc.id,
      name: doc.data().name as string, // Ensure name is treated as string
    }));
    return brands;
  } catch (error) {
    console.error('Error fetching brands for select: ', error);
    throw new Error('Failed to fetch brands for select dropdown.');
  }
}


/**
 * Adds a new model to the Firestore 'models' collection.
 * @param newModelData - An object containing the model name and brandId.
 * @returns A promise that resolves to the newly created Model object (with ID).
 */
export async function addModel(newModelData: NewModelData): Promise<Model> {
  try {
    const name = newModelData.name.trim();
    if (!name) throw new Error("Model name cannot be empty.");
    if (!newModelData.brandId) throw new Error("Brand must be selected.");

    // Optional: Check if brandId exists before adding
    const brandDocRef = doc(db, 'brands', newModelData.brandId);
    const brandSnap = await getDoc(brandDocRef);
    if (!brandSnap.exists()) {
        throw new Error("Selected brand does not exist.");
    }

    const docData = {
      name: name,
      brandId: newModelData.brandId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(modelsCollectionRef, docData);

    // Construct the return object, including the brand name for immediate UI update
    return {
        id: docRef.id,
        name: name,
        brandId: newModelData.brandId,
        brandName: brandSnap.data()?.name || 'Marca Desconocida',
        // Timestamps will be server-generated, exclude them here or fetch again
    };
  } catch (error) {
    console.error('Error adding model: ', error);
    throw new Error(`Failed to add model: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Updates an existing model in the Firestore 'models' collection.
 * @param modelId - The ID of the model document to update.
 * @param updateData - An object containing the fields to update (name, brandId).
 * @returns A promise that resolves when the update is complete.
 */
export async function updateModel(modelId: string, updateData: UpdateModelData): Promise<void> {
    try {
        const modelDocRef = doc(db, 'models', modelId);
        const dataToUpdate: any = { ...updateData, updatedAt: serverTimestamp() };

        // Trim name if provided
        if (dataToUpdate.name) {
            dataToUpdate.name = dataToUpdate.name.trim();
            if (!dataToUpdate.name) throw new Error("Model name cannot be empty.");
        }

        // Validate brandId if provided
        if (dataToUpdate.brandId) {
            const brandDocRef = doc(db, 'brands', dataToUpdate.brandId);
            const brandSnap = await getDoc(brandDocRef);
            if (!brandSnap.exists()) {
                throw new Error("Selected brand does not exist.");
            }
        }


        await updateDoc(modelDocRef, dataToUpdate);
    } catch (error) {
        console.error('Error updating model: ', error);
         throw new Error(`Failed to update model: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Deletes a model from the Firestore 'models' collection.
 * NOTE: Consider adding checks if the model is associated with vehicles before deletion.
 * @param modelId - The ID of the model document to delete.
 * @returns A promise that resolves when the deletion is complete.
 */
export async function deleteModel(modelId: string): Promise<void> {
  try {
    // TODO: Add logic here to check if the model is used by any vehicles.
    // If it is, prevent deletion or ask for confirmation.
    // Example:
    // const vehiclesUsingModel = await checkVehiclesForModel(modelId);
    // if (vehiclesUsingModel.length > 0) {
    //   throw new Error(`Cannot delete model. It is used by ${vehiclesUsingModel.length} vehicle(s).`);
    // }

    const modelDocRef = doc(db, 'models', modelId);
    await deleteDoc(modelDocRef);
  } catch (error) {
    console.error('Error deleting model: ', error);
     // Provide more specific error message if possible
    if (error instanceof Error && error.message.startsWith('Cannot delete model')) {
        throw error;
    }
    throw new Error('Failed to delete model from Firestore.');
  }
}

/**
 * Checks if any models are associated with a specific brand.
 * Useful before deleting a brand.
 * @param brandId - The ID of the brand to check.
 * @returns A promise that resolves to true if models exist for the brand, false otherwise.
 */
export async function checkModelsExistForBrand(brandId: string): Promise<boolean> {
  try {
    const q = query(modelsCollectionRef, where('brandId', '==', brandId), orderBy('name')); // Limit to 1 for efficiency
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty; // Return true if the snapshot is not empty
  } catch (error) {
    console.error('Error checking models for brand:', error);
    // Decide how to handle check errors, maybe allow deletion with warning?
    // For now, let's throw to indicate a problem.
    throw new Error('Failed to check if models exist for the brand.');
  }
}