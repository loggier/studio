'use server';
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
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10; // Standard salt rounds for bcrypt

export type UserProfile = 'admin' | 'tecnico';
export type UserStatus = 'activo' | 'inactivo';

// Structure matching Firestore document (excluding password for reads)
// Timestamps are converted to strings for client component compatibility
export interface User {
  id: string; // Firestore document ID
  nombre: string;
  correo: string;
  empresa?: string; // Optional
  perfil: UserProfile;
  telefono?: string; // Optional
  status: UserStatus;
  createdAt?: string; // Changed to string
  updatedAt?: string; // Changed to string
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
 * Converts Firestore Timestamp to ISO string or returns undefined.
 * @param timestamp - The Firestore Timestamp or undefined.
 * @returns ISO date string or undefined.
 */
const formatTimestamp = (timestamp: Timestamp | undefined): string | undefined => {
    return timestamp ? timestamp.toDate().toISOString() : undefined;
};


/**
 * Fetches all users from Firestore, ordered by name.
 * Explicitly excludes password field and converts Timestamps to strings.
 * @returns A promise that resolves to an array of User objects.
 */
export async function fetchUsers(): Promise<User[]> {
  try {
    // Note: Firestore security rules should prevent unauthorized access
    const q = query(usersCollectionRef, orderBy('nombre'));
    const querySnapshot = await getDocs(q);
    const users = querySnapshot.docs.map(doc => {
      const data = doc.data();
      // Explicitly exclude password hash
      const { password, createdAt, updatedAt, ...userData } = data;
      return {
        id: doc.id,
        ...userData,
        createdAt: formatTimestamp(createdAt as Timestamp | undefined), // Convert Timestamp
        updatedAt: formatTimestamp(updatedAt as Timestamp | undefined), // Convert Timestamp
      } as User; // Assert type after conversion
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
 * Hashes the password using bcrypt.
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

    // --- HASH THE PASSWORD with bcrypt ---
    const hashedPassword = await bcrypt.hash(newUserData.password, SALT_ROUNDS);
    // ---

    const docData = {
      nombre: nombre,
      correo: correo,
      password: hashedPassword, // Store the bcrypt hash
      empresa: newUserData.empresa?.trim() || null,
      perfil: newUserData.perfil,
      telefono: newUserData.telefono?.trim() || null,
      status: newUserData.status,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(usersCollectionRef, docData);

    // Fetch the newly added document to get the generated timestamps and ID accurately
    const newUserSnap = await getDoc(docRef);
    if (!newUserSnap.exists()) {
        throw new Error("Failed to retrieve newly added user.");
    }
    const addedData = newUserSnap.data();
    const { password, createdAt, updatedAt, ...rest } = addedData;


    // Return user data *without* the password hash and with formatted timestamps
    return {
        id: docRef.id,
        ...rest,
        createdAt: formatTimestamp(createdAt as Timestamp | undefined),
        updatedAt: formatTimestamp(updatedAt as Timestamp | undefined),
    } as User;

  } catch (error) {
    console.error('Error adding user: ', error);
    throw new Error(`Failed to add user: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Updates an existing user in the Firestore 'users' collection.
 * Hashes the password using bcrypt if provided.
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

        // --- Handle Optional Password Update with bcrypt ---
        if (updateData.password !== undefined) {
            if (typeof updateData.password === 'string' && updateData.password.length >= 6) {
                 // --- HASH THE NEW PASSWORD with bcrypt ---
                 const hashedPassword = await bcrypt.hash(updateData.password, SALT_ROUNDS);
                 dataToUpdate.password = hashedPassword; // Store the new bcrypt hash
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
 * Authenticates a user by comparing a password against a stored bcrypt hash.
 * @param correo - User's email.
 * @param contrasena - User's plain text password.
 * @returns Promise resolving to an object with success status, message, and user data (if successful).
 */
export async function authenticateUserWithBcrypt(correo: string, contrasena: string) {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('correo', '==', correo.trim().toLowerCase()), limit(1));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return { success: false, message: 'Usuario o contraseña inválidos.' };
    }

    const userDoc = querySnapshot.docs[0];
    const userData = userDoc.data();

    // --- Secure bcrypt comparison ---
    const storedHash = userData.password; // Assume this field stores the bcrypt hash

    if (!storedHash || typeof storedHash !== 'string') {
         console.error(`Stored password hash is missing or invalid for user ${correo}`);
         return { success: false, message: 'Error de autenticación. Contacte al administrador.' }; // Generic error for security
    }

    const passwordMatches = await bcrypt.compare(contrasena, storedHash);

    if (passwordMatches) {
       if (userData.status !== 'activo') {
         return { success: false, message: 'La cuenta de usuario está inactiva.' };
       }
      // Password matches
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
      // Password doesn't match
      return { success: false, message: 'Usuario o contraseña inválidos.' };
    }
    // --- End Secure bcrypt comparison ---

  } catch (error) {
    console.error("Error during authentication:", error);
    return { success: false, message: 'Error al intentar autenticar. Inténtalo de nuevo.' };
  }
}

// Keep the pseudo-hash function temporarily if needed elsewhere, but mark as deprecated/insecure
/**
 * @deprecated This function uses insecure pseudo-hashing. Use bcrypt instead.
 */
const pseudoHash = (password: string): string => {
  if (!password) return '';
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32bit integer
  }
  return `pseudoSalt_${hash.toString(16)}`;
};


// Rename the exported authentication function to reflect the change
export { authenticateUserWithBcrypt as authenticateUserWithPseudoHash };
