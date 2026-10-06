import { useState, useEffect, useCallback } from 'react';
import { productApi } from '@/features/catalog/api/productApi';

export const useProductRegistration = () => {
    // 1. State Matrix
    const [meta, setMeta] = useState({ categories: [], attributes: [], uoms: [], taxes: [], partners: [] });
    const [form, setForm] = useState({
        name: '',
        sku: '',
        categoryId: '',
        uomId: '',
        taxId: '',
        maxPurchasePrice: 0,
        minSellingPrice: 0
    });
    const [hierarchy, setHierarchy] = useState({ brandId: '', subBrandId: '' });
    const [variants, setVariants] = useState([{
        sku: '', price: 0, purchasePrice: 0, minStockLevel: 0,
        attributes: { color: '', size: '' }
    }]);
    const [loading, setLoading] = useState(false);

    // Metadata Sync Lifecycle
    useEffect(() => {
        const fetchData = async () => {
            try {
                const data = await productApi.fetchMetaData();
                setMeta({
                    categories: data.categories || [],
                    attributes: data.attributes || [],
                    uoms: data.uoms || [],
                    taxes: data.taxes || [],
                    partners: data.partners || []
                });
            } catch (error) { console.error("Error fetching form metadata:", error); }
        };
        fetchData();
    }, []);

    // 2. Core Centralized SKU Generation Engine
    const generateSkus = (currentForm, currentHierarchy, currentVariants) => {
        if (!currentForm.name) return { form: currentForm, variants: currentVariants };

        const slug = (val, len, fallback = 'XXX') => {
            if (!val) return fallback;
            return val.toString().replace(/[^a-zA-Z0-9]/g, '').substring(0, len).toUpperCase();
        };

        const catCode = slug(currentForm.categoryId, 3, 'CAT');
        const brandCode = slug(currentHierarchy.brandId, 3, 'BRN');
        const subCode = slug(currentHierarchy.subBrandId, 3, 'SUB');
        const nameCode = slug(currentForm.name, 4, 'PROD');

        const masterBase = `${catCode}-${brandCode}-${subCode}-${nameCode}`;
        const newForm = { ...currentForm, sku: masterBase };

        const newVariants = currentVariants.map((v, idx) => {
            const colorCode = slug(v.attributes?.color, 3, 'COL');
            const sizeCode = slug(v.attributes?.size, 2, 'SZ');
            const uniqueNumber = (idx + 1).toString().padStart(2, '0');

            return {
                ...v,
                sku: `${masterBase}-${colorCode}-${sizeCode}-${uniqueNumber}`
            };
        });

        return { form: newForm, variants: newVariants };
    };

    // 3. State Management Handlers
    const handleFieldChange = (field, value) => {
        setForm(prev => {
            const nextForm = { ...prev, [field]: value };
            const updated = generateSkus(nextForm, hierarchy, variants);
            setVariants(updated.variants);
            return updated.form;
        });
    };

    const updateHierarchy = useCallback((newHierarchy) => {
        setHierarchy(prevHierarchy => {
            if (newHierarchy.brandId === prevHierarchy.brandId && newHierarchy.subBrandId === prevHierarchy.subBrandId) {
                return prevHierarchy;
            }

            setForm(prevForm => {
                const updated = generateSkus(prevForm, newHierarchy, variants);
                setVariants(updated.variants);
                return updated.form;
            });

            return newHierarchy;
        });
    }, [variants]);

    const handleVariantChange = (i, field, value, isAttr = false) => {
        setVariants(prev => {
            const nextVariants = [...prev];
            if (isAttr) {
                nextVariants[i].attributes = { ...nextVariants[i].attributes, [field]: value };
            } else {
                nextVariants[i][field] = value;
            }

            const updated = generateSkus(form, hierarchy, nextVariants);
            return updated.variants;
        });
    };

    const addVariant = () => {
        setVariants(prev => {
            const next = [...prev, { sku: '', price: 0, purchasePrice: 0, minStockLevel: 0, attributes: { color: '', size: '' } }];
            return generateSkus(form, hierarchy, next).variants;
        });
    };

    const removeVariant = (i) => {
        if (variants.length > 1) {
            setVariants(prev => {
                const next = prev.filter((_, idx) => idx !== i);
                return generateSkus(form, hierarchy, next).variants;
            });
        }
    };

    // 4. Submit Operations Pipeline
    const submit = async (e) => {
        // Prevent default form submission if triggered by a form tag
        if (e && e.preventDefault) e.preventDefault();

        // Target form.categoryId directly to bypass the empty state blocker!
        if (!form.categoryId || typeof form.categoryId !== 'string' || form.categoryId.trim() === '') {
            alert("Error: A valid Category is required.");
            console.error("Validation Failed: categoryId is missing or empty inside form state configuration:", form);
            return;
        }

        // 1. Transform variants to match Zod Schema (Dictionary -> Array of IDs)
        const formattedVariants = variants.map((v) => {
            const formattedAttributes = [];

            // Loop through the { color: "blue", size: "XXl" } object safely
            if (v.attributes && typeof v.attributes === 'object' && !Array.isArray(v.attributes)) {
                Object.entries(v.attributes).forEach(([attrName, attrValue]) => {
                    if (!attrValue) return; // Skip empty selections

                    // Match the name (e.g. "Color") to your meta.attributes array to find the database ID
                    const matchedDef = meta.attributes?.find(
                        (a) => (a.name || a.label || a.title || '').toLowerCase().trim() === attrName.toLowerCase().trim()
                    );

                    if (matchedDef) {
                        formattedAttributes.push({
                            attributeDefId: matchedDef.id,
                            value: String(attrValue)
                        });
                    }
                });
            }

            return {
                sku: v.sku || "",
                price: parseFloat(v.price) || 0,
                purchasePrice: parseFloat(v.purchasePrice) || 0,
                minStockLevel: parseInt(v.minStockLevel, 10) || 0,
                attributes: formattedAttributes
            };
        });

        // 2. Build the final payload
        const payload = {
            name: form.name?.trim() || "",
            sku: form.sku || "",
            description: form.description || "", // <--- THIS IS THE MISSING LINK
            categoryId: form.categoryId,
            uomId: form.uomId || null,
            taxId: form.taxId || null,
            brandId: hierarchy.brandId || null,
            subBrandId: hierarchy.subBrandId || null,
            maxPurchasePrice: parseFloat(form.maxPurchasePrice || 0),
            minSellingPrice: parseFloat(form.minSellingPrice || 0),
            variants: formattedVariants
        };

        // 3. Send to API
        try {
            setLoading(true);
            const response = await productApi.register(payload);

            if (response?.error) {
                alert(`API Validation Error: ${response.error}`);
            } else {
                alert("Product successfully created!");
            }
        } catch (err) {
            console.error("Submission operational failure:", err);
            alert("Submission error encountered.");
        } finally {
            setLoading(false);
        }
    };

    return {
        meta, form, handleFieldChange, hierarchy, updateHierarchy,
        variants, handleVariantChange, addVariant, removeVariant, submit, loading
    };
};