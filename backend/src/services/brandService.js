import { prisma } from '@/lib/prisma';

export const brandService = {
    // Logic is isolated here, making it testable and reusable
    async getAllBrands() {
        return await prisma.brand.findMany({
            orderBy: { name: 'asc' },
        });
    },

    async createBrand(data) {
        return await prisma.brand.create({
            data: {
                name: data.name,
                slug: data.slug,
            },
        });
    }
};