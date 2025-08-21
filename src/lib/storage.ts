import localforage from "localforage";

const storageInstance = localforage.createInstance({
  driver: localforage.LOCALSTORAGE,
  storeName: "payment-checkout",
  name: "payment-checkout",
});

export const storage = {
  getItem: async <T = unknown>(key: string): Promise<T | null> => {
    try {
      const item = await storageInstance.getItem<T>(key);
      return item;
    } catch (error) {
      console.error("Error getting item from storage:", error);
      return null;
    }
  },

  setItem: async <T = unknown>(key: string, value: T): Promise<void> => {
    try {
      await storageInstance.setItem(key, value);
    } catch (error) {
      console.error("Error setting item in storage:", error);
    }
  },

  removeItem: async (key: string): Promise<void> => {
    try {
      await storageInstance.removeItem(key);
    } catch (error) {
      console.error("Error removing item from storage:", error);
    }
  },
};
