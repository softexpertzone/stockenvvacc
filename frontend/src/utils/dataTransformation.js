export const buildBrandTree = (brands) => {
    const brandMap = {};
    const tree = [];

    // Create a map of IDs to brand objects
    brands.forEach(brand => {
        brandMap[brand.id] = { ...brand, children: [] };
    });

    // Link children to parents
    brands.forEach(brand => {
        if (brand.parentId && brandMap[brand.parentId]) {
            brandMap[brand.parentId].children.push(brandMap[brand.id]);
        } else {
            tree.push(brandMap[brand.id]);
        }
    });

    return tree;
};