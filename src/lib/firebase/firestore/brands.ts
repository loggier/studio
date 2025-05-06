// src/lib/firebase/firestore/brands.ts
import {
  collection,
  addDoc,
  getDocs,
  doc,
  deleteDoc,
  updateDoc, // Import updateDoc
  query,
  orderBy,
  Timestamp,
  serverTimestamp,
  where, // Import where for checking models
  limit, // Import limit for efficiency
  setDoc,
  FieldValue,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config'; // Adjust path as needed
import { checkModelsExistForBrand } from './models'; // Import the check function

// Define the structure of a Brand in Firestore
// Add any other fields you might need, like createdAt, updatedAt
export interface Brand {
  id: string; // Firestore document ID
  name: string;
  createdAt?: Timestamp; // Optional: Timestamp for creation date
  updatedAt?: Timestamp; // Optional: Timestamp for last update
}


const brandsCollectionRef = collection(db, 'brands');

/**
 * Fetches all brands from Firestore, ordered by name.
 * @returns A promise that resolves to an array of Brand objects.
 */
export async function fetchBrands(): Promise<Brand[]> {
  try {
    const q = query(brandsCollectionRef, orderBy('name')); // Order by name alphabetically
    const querySnapshot = await getDocs(q);
    const brands = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as Brand));
    // Convert Timestamps to Dates if needed for display, or handle in component
    return brands;
  } catch (error) {
    console.error('Error fetching brands: ', error);
    throw new Error('Failed to fetch brands from Firestore.');
  }
}

/**
 * Adds a new brand to the Firestore 'brands' collection.
 * @param newBrandData - An object containing the brand name.
 * @returns A promise that resolves to the newly created Brand object (with ID).
 */
export async function addBrand(newBrandData: { name: string }): Promise<Brand> {
  try {
    const { name } = newBrandData;
    if (!name || name.trim() === "") {
      throw new Error("El nombre de la marca no puede estar vacío.");
    }
    const trimmedName = name.trim();
    const newBrandRef = doc(brandsCollectionRef);
    const id = newBrandRef.id
    const createdAt = Timestamp.now();
    const updatedAt = Timestamp.now();
    const brandData = {
      name: trimmedName,
      createdAt,
      updatedAt
    };
  
    const batch = writeBatch(db);
    batch.set(newBrandRef, brandData);
    batch.set(
      doc(db, "brands", id),
      {
        name: trimmedName,
        createdAt,
        updatedAt,
      }
    );
    await batch.commit();
    return {
      id: newBrandRef.id,
      name: trimmedName,
      createdAt,
      updatedAt,
    };

  } catch (error) {
    console.error('Error adding brand: ', error);
    throw new Error(`Failed to add brand: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Updates an existing brand in the Firestore 'brands' collection.
 * @param brandId - The ID of the brand document to update.
 * @param newName - The new name for the brand.
 * @returns A promise that resolves when the update is complete.
 */
export async function updateBrand(brandId: string, newName: string): Promise<void> {
  try {
    const name = newName?.trim();
    if (!name) throw new Error('Brand name cannot be empty.');

    const brandDocRef = doc(db, 'brands', brandId);
    await updateDoc(brandDocRef, {
      name: name,
      updatedAt: serverTimestamp(), // Update the timestamp on modification
    });
  } catch (error) {
    console.error('Error updating brand: ', error);
    throw new Error(`Failed to update brand: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Deletes a brand from the Firestore 'brands' collection after checking for associated models.
 * @param brandId - The ID of the brand document to delete.
 * @returns A promise that resolves when the deletion is complete.
 * @throws Error if the brand is associated with existing models.
 */
export async function deleteBrand(brandId: string): Promise<void> {
  try {
    // Check if any models are using this brand
    const modelsExist = await checkModelsExistForBrand(brandId);
    if (modelsExist) {
      throw new Error(`No se puede eliminar la marca porque está asociada a uno o más modelos.`);
    }

    const brandDocRef = doc(db, 'brands', brandId);
    await deleteDoc(brandDocRef);
  } catch (error) {
    console.error('Error deleting brand: ', error);
    // Re-throw the specific error or a generic one
    if (error instanceof Error && error.message.startsWith('No se puede eliminar la marca')) {
        throw error;
    }
    throw new Error('Failed to delete brand from Firestore.');
  }
}