import Dexie, { type EntityTable } from 'dexie';
import { categories, subCategories,researcherIDs } from "./constants.js";
import "dexie-export-import";


type Category = keyof typeof categories;
type SubCategory = keyof typeof subCategories;
type ResearcherID = keyof typeof researcherIDs;

interface dbMainEntry {
  id: number; //real id
  fauxID: string;  // Fake ID seen by the player - sometimes multiple entries have the same will share because they have changing game states.
  hexHash: string; // Eventually used to pull from the other database
  title: string;
  description: string;
  thumbnail?: string;
  category: string;
  // Remove subItems array - we'll query subentries by parentId instead
  date?: Date;
  entryDate: Date;
  available: boolean; //  field to indicate availability
  availableOnStart: boolean; //  field to indicate if available on start
}

interface dbSubEntry {
  id: number; //real id
  fauxID: string;  // Fake ID seen by the player - sometimes multiple entries have the same will share because they have changing game states.
  hexHash: string; // Eventually used to pull from the other database
  title: string;
  description?: string;
  media?: string;
  researcherID: ResearcherID; // researcher who added the entry
  subCategory: string;
  date?: Date;
  entryDate: Date;
  parentId: number; // Changed to number to match the main entry's id
  available: boolean; //  field to indicate availability
  availableOnStart: boolean; //  field to indicate if available on start
}

interface bothEntries {
  id: number; //real id
  fauxID: string;  // Fake ID seen by the player - sometimes multiple entries have the same will share because they have changing game states.
  title: string;
  date?: Date;
  type: 'main' | 'sub'; // Type to distinguish between main and sub entries
}

const db = new Dexie('gb-current') as Dexie & {
  friends: EntityTable<
    dbMainEntry,
    'id' // primary key "id" (for the typings only)
  >;
  subentries: EntityTable<
    dbSubEntry,
    'id' // primary key "id" (for the typings only)
  >;
  export: (options?: any) => Promise<Blob>;
  import: (blob: Blob, options?: any) => Promise<Dexie>;
};



// Schema declaration:
db.version(1).stores({
  friends: '++id, fauxID, title, description, thumbnail, category, date, entryDate, available, availableOnStart', // Removed subItems
  subentries: '++id, fauxID, title, description, media, subCategory, date, entryDate, researcherID, parentId, available, availableOnStart' // Fixed spelling and added parentId index
});



// Helper functions for working with entries and subentries
const dbHelpers = {
  // Get a main entry with all its subentries
  async getEntryWithSubentries(entryId: number) {
    const entry = await db.friends.get(entryId);
    if (!entry) return null;

    const subentries = await db.subentries.where('parentId').equals(entryId).toArray();
    return {
      ...entry,
      subentries
    };
  },

  // Get all subentries for a main entry
  async getSubentriesForEntry(entryId: number) {
    return await db.subentries.where('parentId').equals(entryId).toArray();
  },

  // Add a new main entry
  async addMainEntry(entry: Omit<dbMainEntry, 'id'>) {
    return await db.friends.add(entry);
  },

  // Add a new subentry linked to a main entry
  async addSubentry(subentry: Omit<dbSubEntry, 'id'>) {
    return await db.subentries.add(subentry);
  },

  // Delete a main entry and all its subentries
  async deleteEntryWithSubentries(entryId: number) {
    await db.subentries.where('parentId').equals(entryId).delete();
    await db.friends.delete(entryId);
  }
};



export type { dbMainEntry, dbSubEntry, bothEntries };
export { db, dbHelpers };




