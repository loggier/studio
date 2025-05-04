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

// --- SECURITY WARNING ---
// Storing and comparing passwords using simple hashing like MD5 (or the pseudo-hash below)
// is NOT secure against modern attacks. Rainbow tables and brute-force attacks can easily break it.
// Use Firebase Authentication or a strong, salted hashing algorithm (like Argon2 or bcrypt)
// implemented server-side (e.g., in Firebase Functions) for production applications.
// This pseudo-hash implementation is purely for demonstrating the *concept* based on the user request
// and carries significant security risks.
// --- END SECURITY WARNING ---

// Basic pseudo-hashing function (NOT CRYPTOGRAPHICALLY SECURE - FOR DEMO ONLY)
// This is NOT MD5. A real MD5 implementation would require a library or server-side execution.
const pseudoHash = (password: string): string => {
  if (!password) return '';
  // Simple transformation - replace with a real hashing function server-side
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32bit integer
  }
  // Add a simple "salt" prefix for demonstration (real salt should be unique per user)
  return `pseudoSalt_${hash.toString(16)}`;
};


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
  // Password HASH should never be fetched or stored in client state unless absolutely necessary
  // and with extreme caution. Usually, authentication handles this.
}

// Structure for adding a new user (includes password initially)
export interface NewUserData {
  nombre: string;
  correo: string;
  password?: string; // Password included for creation, will be hashed
  empresa?: string;
  perfil: UserProfile;
  telefono?: string;
  status: UserStatus;
}

// Structure for updating a user (includes optional password update)
export interface UpdateUserData {
  nombre?: string;
  correo?: string;
  empresa?: string;
  perfil?: UserProfile;
  telefono?: string;
  status?: UserStatus;
  password?: string; // Optional: For password updates (will be hashed)
}

const usersCollectionRef = collection(db, 'users');

/**
 * Fetches all users from Firestore, ordered by name.
 * Explicitly excludes password field even if present in the document.
 * @returns A promise that resolves to an array of User objects.
 */
export async function fetchUsers(): Promise<User[]> {
  try {
    // Note: Firestore security rules should prevent unauthorized access
    const q = query(usersCollectionRef, orderBy('nombre'));
    const querySnapshot = await getDocs(q);
    const users = querySnapshot.docs.map(doc => {
      const data = doc.data();
      // Explicitly exclude password hash if it somehow exists in the doc fetched to client
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
 * Hashes the password using a pseudo-hash function (INSECURE FOR PRODUCTION).
 * @param newUserData - An object containing the new user's details.
 * @returns A promise that resolves to the newly created User object (excluding password).
 */
export async function addUser(newUserData: NewUserData): Promise<User> {
  try {
    // Basic validation
    const nombre = newUserData.nombre.trim();
    const correo = newUserData.correo.trim().toLowerCase();
    if (!nombre || !correo || !newUserData.password || newUserData.password.length < 6) {
      throw new Error("Nombre, correo y contraseña (mínimo 6 caracteres) son obligatorios.");
    }

    // Check if email already exists
    const checkQuery = query(usersCollectionRef, where("correo", "==", correo), limit(1));
    const checkSnapshot = await getDocs(checkQuery);
    if (!checkSnapshot.empty) {
      throw new Error(`El correo "${correo}" ya está registrado.`);
    }

    // --- HASH THE PASSWORD (Using insecure pseudo-hash) ---
    const hashedPassword = pseudoHash(newUserData.password);
    console.warn("SECURITY RISK: Storing pseudo-hashed password in addUser. Use strong, salted server-side hashing (e.g., bcrypt, Argon2) or Firebase Authentication.");
    // ---

    const docData = {
      nombre: nombre,
      correo: correo,
      password: hashedPassword, // Store the hashed password
      empresa: newUserData.empresa?.trim() || null,
      perfil: newUserData.perfil,
      telefono: newUserData.telefono?.trim() || null,
      status: newUserData.status,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(usersCollectionRef, docData);

    // Return user data *without* the password hash
    const { password, ...addedUserData } = docData; // Exclude password hash from returned data
    return {
        id: docRef.id,
        nombre: addedUserData.nombre,
        correo: addedUserData.correo,
        empresa: addedUserData.empresa,
        perfil: addedUserData.perfil,
        telefono: addedUserData.telefono,
        status: addedUserData.status,
        createdAt: addedUserData.createdAt as Timestamp,
        updatedAt: addedUserData.updatedAt as Timestamp,
    } as User;

  } catch (error) {
    console.error('Error adding user: ', error);
    throw new Error(`Failed to add user: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Updates an existing user in the Firestore 'users' collection.
 * Hashes the password if provided using a pseudo-hash function (INSECURE FOR PRODUCTION).
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

        // --- Handle Optional Password Update ---
        if (updateData.password !== undefined) {
            if (typeof updateData.password === 'string' && updateData.password.length >= 6) {
                 // --- HASH THE NEW PASSWORD (Using insecure pseudo-hash) ---
                 const hashedPassword = pseudoHash(updateData.password);
                 console.warn("SECURITY RISK: Updating with pseudo-hashed password in updateUser. Use strong, salted server-side hashing or Firebase Authentication.");
                 dataToUpdate.password = hashedPassword; // Store the new hash
                 // ---
            } else if (typeof updateData.password === 'string' && updateData.password.length > 0) {
                 // If password is provided but doesn't meet criteria (e.g., length)
                 throw new Error("La nueva contraseña debe tener al menos 6 caracteres.");
            }
            // If updateData.password is an empty string or undefined/null, it won't be added to dataToUpdate
        }


        // Check if there are actual fields to update besides the timestamp
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


// Moved authentication logic here to keep it with user data operations
/**
 * Authenticates a user by comparing a pseudo-hashed password.
 * WARNING: Uses an insecure pseudo-hashing method. Not suitable for production.
 * @param correo - User's email.
 * @param contrasena - User's plain text password.
 * @returns Promise resolving to an object with success status, message, and user data (if successful).
 */
export async function authenticateUserWithPseudoHash(correo: string, contrasena: string) {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('correo', '==', correo.trim().toLowerCase()), limit(1));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return { success: false, message: 'Usuario o contraseña inválidos.' };
    }

    const userDoc = querySnapshot.docs[0];
    const userData = userDoc.data();

    // --- INSECURE COMPARISON USING PSEUDO-HASH ---
    const storedHash = userData.password; // Assume this field stores the pseudo-hash
    const providedPasswordHash = pseudoHash(contrasena); // Hash the login attempt

    console.warn("SECURITY RISK: Performing login comparison using insecure pseudo-hash. Use Firebase Authentication or proper server-side verification.");

    if (storedHash && storedHash === providedPasswordHash) {
       if (userData.status !== 'activo') {
         return { success: false, message: 'La cuenta de usuario está inactiva.' };
       }
      // Pseudo-hash matches
      return {
        success: true,
        user: {
          id: userDoc.id,
          nombre: userData.nombre,
          correo: userData.correo,
          perfil: userData.perfil,
          // Never return password or hash
        }
      };
    } else {
      // Hash doesn't match or stored hash is missing
      return { success: false, message: 'Usuario o contraseña inválidos.' };
    }
    // --- END INSECURE COMPARISON ---

  } catch (error) {
    console.error("Error during authentication:", error);
    return { success: false, message: 'Error al intentar autenticar. Inténtalo de nuevo.' };
  }
}
