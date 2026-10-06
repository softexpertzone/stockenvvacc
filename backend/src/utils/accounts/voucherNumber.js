import prisma from '../../lib/prisma.js';

export const generateVoucherNumber = async (voucherType) => {
    const prefixMap = {
        RECEIPT: 'RV',
        PAYMENT: 'PV',
        CONTRA: 'CV',
        JOURNAL: 'JV',
    };

    const prefix = prefixMap[voucherType] || 'VCH';
    const year = new Date().getFullYear().toString().slice(-2);

    const lastVoucher = await prisma.voucher.findFirst({
        where: { voucherType },
        orderBy: { createdAt: 'desc' },
        select: { voucherNumber: true },
    });

    let nextNumber = 1;
    if (lastVoucher?.voucherNumber) {
        const parts = lastVoucher.voucherNumber.split('/');
        const lastNum = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(lastNum)) nextNumber = lastNum + 1;
    }

    return `${prefix}/${year}/${String(nextNumber).padStart(4, '0')}`;
};