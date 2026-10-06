import prisma from '../lib/prisma.js'; // adjust path if your prisma.js is in different location

/**
 * Middleware to check if a module is enabled
 * Usage: router.use(checkModule('accounts'))
 */
export const checkModule = (moduleName) => {
    return async (req, res, next) => {
        try {
            const setting = await prisma.systemSetting.findUnique({
                where: { key: `module_${moduleName}` },
            });

            const isEnabled = setting?.value === 'true';

            if (!isEnabled) {
                return res.status(403).json({
                    success: false,
                    message: `${moduleName.toUpperCase()} module is not enabled. Please upgrade your package.`,
                });
            }

            next();
        } catch (error) {
            console.error('Module Guard Error:', error);
            return res.status(500).json({
                success: false,
                message: 'Module check failed',
            });
        }
    };
};

/**
 * Helper function to get all enabled modules
 */
export const getEnabledModules = async () => {
    const settings = await prisma.systemSetting.findMany({
        where: {
            key: {
                in: [
                    'module_inventory',
                    'module_accounts',
                    'module_hr',
                    'module_payroll',
                    'module_attendance',
                ],
            },
        },
    });

    const modules = {
        inventory: true,
        accounts: false,
        hr: false,
        payroll: false,
        attendance: false,
    };

    settings.forEach((s) => {
        const name = s.key.replace('module_', '');
        modules[name] = s.value === 'true';
    });

    return modules;
};


/**
 * Check both global module + user allowedModules
 * Usage: router.use(checkUserModule('accounts'))
 */
export const checkUserModule = (moduleName) => {
    return async (req, res, next) => {
        try {
            // Super Admin always allowed
            if (req.user?.role === 'SUPER_ADMIN') {
                return next();
            }

            // 1. Global module must be enabled
            const setting = await prisma.systemSetting.findUnique({
                where: { key: `module_${moduleName}` },
            });

            if (setting?.value !== 'true') {
                return res.status(403).json({
                    success: false,
                    message: `${moduleName.toUpperCase()} module is not enabled.`,
                });
            }

            // 2. User must have this module in allowedModules
            const userModules = req.user?.allowedModules || [];
            if (!userModules.includes(moduleName)) {
                return res.status(403).json({
                    success: false,
                    message: `You do not have access to the ${moduleName} module.`,
                });
            }

            next();
        } catch (error) {
            console.error('User Module Guard Error:', error);
            return res.status(500).json({
                success: false,
                message: 'Module check failed',
            });
        }
    };
};