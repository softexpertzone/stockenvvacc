import { validationResult } from 'express-validator';

const validate = (rules) => {
    // If it's a Zod schema (has .parse)
    if (rules && typeof rules.parse === 'function') {
        return (req, res, next) => {
            try {
                req.body = rules.parse(req.body);
                next();
            } catch (error) {
                console.error('❌ RAW REQUEST BODY:', JSON.stringify(req.body, null, 2));

                if (error.errors && Array.isArray(error.errors)) {
                    return res.status(400).json({
                        status: 'fail',
                        message: 'Data Validation Failed',
                        errors: error.errors.map((err) => ({
                            field: err.path.join('.'),
                            message: err.message,
                        })),
                    });
                }

                return res.status(400).json({
                    status: 'fail',
                    message: error.message || 'Invalid request data',
                    errors: [],
                });
            }
        };
    }

    // Otherwise treat as express-validator rules array
    return [
        ...(Array.isArray(rules) ? rules : [rules]),
        (req, res, next) => {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    status: 'fail',
                    message: 'Data Validation Failed',
                    errors: errors.array().map((err) => ({
                        field: err.path || err.param,
                        message: err.msg,
                    })),
                });
            }
            next();
        },
    ];
};

export { validate };
export default validate;