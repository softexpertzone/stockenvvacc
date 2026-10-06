'use client';
import { Provider } from 'react-redux';
import { store } from './store'; // Import the already-configured store

export default function StoreProvider({ children }) {
    return <Provider store={store}>{children}</Provider>;
}