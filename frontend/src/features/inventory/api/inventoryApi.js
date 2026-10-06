import axios from 'axios';
import { API_BASE, API_ENDPOINTS } from '@/config/apiEndpoints';

const apiClient = axios.create({
    baseURL: API_BASE
});

// ----------------------------------------------------
// Inventory Operations
// ----------------------------------------------------
export const fetchInventory = async () => {
    // Uses the path defined in your config object
    const { data } = await apiClient.get(API_ENDPOINTS.INVENTORY.STOCK_LEVELS);
    return data.data;
};

export const adjustStock = async (payload) => {
    // Assuming you have an endpoint for adjustment; added to INVENTORY config
    const { data } = await apiClient.post('/inventory/adjust', payload);
    return data;
};

// ----------------------------------------------------
// GRN Processing
// ----------------------------------------------------
export const processGRN = async (purchaseOrderId, items) => {
    try {
        const { data } = await apiClient.post(API_ENDPOINTS.PURCHASE.PROCESS_GRN, {
            purchaseOrderId,
            items
        });
        return data;
    } catch (error) {
        const message = error.response?.data?.message || error.message || "Failed to process GRN";
        throw new Error(message);
    }
};

// ----------------------------------------------------
// Warehouse Hierarchy & Layout
// ----------------------------------------------------
export const fetchWarehouseLayout = async () => {
    try {
        // Fetches the hierarchical view of your warehouse (Godown -> Room -> Rack)
        const { data } = await apiClient.get('/inventory/layout');
        return data.data;
    } catch (error) {
        console.error("Failed to fetch warehouse layout:", error);
        throw error;
    }
};