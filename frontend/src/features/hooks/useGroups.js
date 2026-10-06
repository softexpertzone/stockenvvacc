'use client';

import { useState, useCallback } from 'react';
import { groupApi } from '../api/groupApi';

export function useGroups() {
    const [groups, setGroups] = useState([]);
    const [tree, setTree] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchGroups = useCallback(async (params = {}) => {
        setLoading(true);
        try {
            const res = await groupApi.getAll(params);
            // Handle both: { data: [...] } and { data: { data: [...], pagination } }
            const payload = res?.data?.data ?? res?.data ?? [];
            const list = Array.isArray(payload)
                ? payload
                : (Array.isArray(payload?.data) ? payload.data : []);
            setGroups(list);
        } catch (err) {
            console.error(err);
            setGroups([]);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchTree = useCallback(async () => {
        setLoading(true);
        try {
            const res = await groupApi.getTree();
            const payload = res?.data?.data ?? res?.data ?? [];
            setTree(Array.isArray(payload) ? payload : []);
        } catch (err) {
            console.error(err);
            setTree([]);
        } finally {
            setLoading(false);
        }
    }, []);

    return { groups, tree, loading, fetchGroups, fetchTree };
}