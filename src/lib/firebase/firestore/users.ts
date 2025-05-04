// src/lib/firebase/firestore/users.ts
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
  where,
  limit,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

// NOTE: Password handling is NOT secure in this client-side example.
// In a real application, use Firebase Authentication and handle password hashing server-side.

export type UserProfile = 'admin' | 'tecnico';
export type UserStatus = 'activo' | 'inactivo';

// Structure matching Firestore document (excluding password for reads)
export interface User {
  id: string; // Firestore document ID
  nombre: string;
  correo: string;
  empresa?: string; // Optional
  perfil: UserProfile;
  telefono?: string; // Optional
  status: UserStatus;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  // Password should NEVER be fetched or stored in client state
}

// Structure for adding a new user (includes password initially)
export interface NewUserData {
  nombre: string;
  correo: string;
  password?: string; // Password included for creation, but MUST be hashed server-side
  empresa?: string;
  perfil: UserProfile;
  telefono?: string;
  status: UserStatus;
}

// Structure for updating a user (password changes should be handled separately/securely)
export interface UpdateUserData {
  nombre?: string;
  correo?: string;
  empresa?: string;
  perfil?: UserProfile;
  telefono?: string;
  status?: UserStatus;
  // Password updates are omitted here for security reasons in this client-side example
}

const usersCollectionRef = collection(db, 'users');

/**
 * Fetches all users from Firestore, ordered by name.
 * Excludes password field.
 * @returns A promise that resolves to an array of User objects.
 */
export async function fetchUsers(): Promise<User[]> {
  try {
    // Note: Firestore security rules should prevent unauthorized access
    const q = query(usersCollectionRef, orderBy('nombre'));
    const querySnapshot = await getDocs(q);
    const users = querySnapshot.docs.map(doc => {
      const data = doc.data();
      // Explicitly exclude password if it somehow exists in the doc
      const { password, ...userData } = data;
      return {
        id: doc.id,
        ...userData,
      } as User; // Assert type after excluding password
    });
    return users;
  } catch (error) {
    console.error('Error fetching users: ', error);
    // Consider more specific error handling based on Firestore errors
    throw new Error('Failed to fetch users from Firestore.');
  }
}

/**
 * Adds a new user to the Firestore 'users' collection.
 * WARNING: Stores password in plain text. Requires server-side hashing.
 * @param newUserData - An object containing the new user's details.
 * @returns A promise that resolves to the newly created User object (excluding password).
 */
export async function addUser(newUserData: NewUserData): Promise<User> {
  try {
    // Basic validation
    const nombre = newUserData.nombre.trim();
    const correo = newUserData.correo.trim().toLowerCase();
    if (!nombre || !correo || !newUserData.password) {
      throw new Error("Nombre, correo y contraseña son obligatorios.");
    }

    // --- SECURITY WARNING ---
    // In a real app, NEVER store plain text passwords.
    // 1. Use Firebase Authentication's createUserWithEmailAndPassword.
    // 2. Store additional user profile data (name, role, etc.) in Firestore,
    //    linking it by the Firebase Auth UID.
    // 3. If not using Firebase Auth, hash the password securely server-side
    //    (e.g., using bcrypt in a Cloud Function) BEFORE saving to Firestore.
    console.warn("SECURITY RISK: Storing plain text password. Implement server-side hashing.");
    // --- END SECURITY WARNING ---

    // Check if email already exists
    const checkQuery = query(usersCollectionRef, where("correo", "==", correo), limit(1));
    const checkSnapshot = await getDocs(checkQuery);
    if (!checkSnapshot.empty) {
      throw new Error(`El correo "${correo}" ya está registrado.`);
    }


    const docData = {
      nombre: nombre,
      correo: correo,
      password: newUserData.password, // Storing plain text - BAD PRACTICE
      empresa: newUserData.empresa?.trim() || null,
      perfil: newUserData.perfil,
      telefono: newUserData.telefono?.trim() || null,
      status: newUserData.status,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(usersCollectionRef, docData);

    // Return user data *without* the password
    const { password, ...addedUserData } = newUserData;
    return {
        id: docRef.id,
        ...addedUserData,
        nombre, // Use trimmed name
        correo, // Use trimmed/lowercase email
        empresa: docData.empresa, // Use potentially updated optional fields
        telefono: docData.telefono,
    } as User;

  } catch (error) {
    console.error('Error adding user: ', error);
    throw new Error(`Failed to add user: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Updates an existing user in the Firestore 'users' collection.
 * Does not handle password updates.
 * @param userId - The ID of the user document to update.
 * @param updateData - An object containing the fields to update.
 * @returns A promise that resolves when the update is complete.
 */
export async function updateUser(userId: string, updateData: UpdateUserData): Promise<void> {
    try {
        const userDocRef = doc(db, 'users', userId);
        const dataToUpdate: any = { updatedAt: serverTimestamp() }; // Always update the timestamp

        // Validate and add fields to update object
        if (updateData.nombre !== undefined) {
            const nombre = updateData.nombre.trim();
            if (!nombre) throw new Error("El nombre no puede estar vacío.");
            dataToUpdate.nombre = nombre;
        }
        if (updateData.correo !== undefined) {
            const correo = updateData.correo.trim().toLowerCase();
            if (!correo) throw new Error("El correo no puede estar vacío.");
             // Check if email already exists for another user
            const checkQuery = query(usersCollectionRef, where("correo", "==", correo), limit(1));
            const checkSnapshot = await getDocs(checkQuery);
            if (!checkSnapshot.empty && checkSnapshot.docs[0].id !== userId) {
              throw new Error(`El correo "${correo}" ya está registrado para otro usuario.`);
            }
            dataToUpdate.correo = correo;
        }
        if (updateData.empresa !== undefined) dataToUpdate.empresa = updateData.empresa.trim() || null;
        if (updateData.perfil !== undefined) dataToUpdate.perfil = updateData.perfil;
        if (updateData.telefono !== undefined) dataToUpdate.telefono = updateData.telefono.trim() || null;
        if (updateData.status !== undefined) dataToUpdate.status = updateData.status;

        // Remove the updatedAt field if no other fields are being updated
        if (Object.keys(dataToUpdate).length <= 1) {
            console.log("No fields to update for user:", userId);
            return; // Nothing to update besides timestamp
        }

        await updateDoc(userDocRef, dataToUpdate);
    } catch (error) {
        console.error('Error updating user: ', error);
        throw new Error(`Failed to update user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}


/**
 * Deletes a user from the Firestore 'users' collection.
 * @param userId - The ID of the user document to delete.
 * @returns A promise that resolves when the deletion is complete.
 */
export async function deleteUser(userId: string): Promise<void> {
  try {
    // IMPORTANT: Add checks here if needed.
    // E.g., Prevent deleting the last admin user.
    // E.g., Check if the user owns critical data that needs reassigning.
    // Fetch the user data first if such checks are necessary.
    // const userDoc = await getDoc(doc(db, 'users', userId));
    // if (userDoc.exists() && userDoc.data()?.perfil === 'admin') {
    //    // Add logic to check if it's the only admin
    // }

    const userDocRef = doc(db, 'users', userId);
    await deleteDoc(userDocRef);
  } catch (error) {
    console.error('Error deleting user: ', error);
    throw new Error('Failed to delete user from Firestore.');
  }
}
