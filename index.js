import express from 'express';
import pg from 'pg';
import Joi from 'joi';

const app = express();
const port = 3000;
const { Pool } = pg;

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'mahasiswa',
    password: 'ibey030924',
    port: 5432,
})

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//MIDDLEWARE LOGGING

app.use((req, res, next) => {
   const start = Date.now();

   res.on('finish', () => {
       const duration = Date.now() - start

       console.log({
              method: req.method,
              url: req.originalUrl,
              status: res.statusCode,
              duration: `${duration}ms`
       })
   })

   next()
})

//Response Envelope (template response)

function successResponse(res, message, data, status = 200) {
    return res.status(status).json({
        success: true,
        message,
        data,
        error: null,    
    })
}

function errorResponse(res, message, status, details = null) {
    return res.status(status).json({
        success: false,
        message,
        data: null,
        error: details,
    })
}

//Joi validation schema

const biodataSchema = Joi.object({
    id: Joi.number().integer().positive(),
    nama: Joi.string().trim().min(2).max(100).required(),
    nim: Joi.string().trim().min(5).max(20).required(),
    kelas: Joi.string().trim().min(1).max(20).required(),
})

const idSchema = Joi.object({
    id: Joi.number().integer().positive().required(),
})

//middleware for validating request body

function validateBody(schema) {
    return (req, res, next) => {
        const { error,value } = schema.validate(req.body, { 
            abortEarly: false,
            convert: true,
            allowUnknown: false,
        })

        if (error) {
            return errorResponse(
                res, 
                'Validation failed', 
                400, 
                error.details.map(item => ({
                    field: item.path.join('.'),
                    message: item.message,
                }))
            )
        }
        req.body = value;
        next()
    }
}

//Middleware for validating request params ID

function validateParams(schema) {
    return (req, res, next) => {
        const { error,value } = schema.validate(req.params)

        if (error) {
            return errorResponse(
                res, 
                'Parameter failed', 
                400, 
                error.details.map(item => ({
                    field: item.path.join('.'),
                    message: item.message,
                }))
            )
        }
        req.params = value;
        next()
    }
}

app.get('/', async (req, res) => {
    const result = await pool.query
    ('SELECT * FROM biodata ORDER BY id')

    return successResponse(
        res, 
        'Data retrieved successfully', 
        result.rows
    )
})

//Endpoint get biodata by ID
app.post(
    '/biodata', 
    validateBody(biodataSchema),
    async (req, res) => {
        const { id, nama, nim, kelas } = req.body

        const result = await pool.query(
            `INSERT INTO biodata (id, nama, nim, kelas)
             VALUES ($1, $2, $3, $4) 
             RETURNING *`,
            [id ?? null, nama, nim, kelas]
        )

        return successResponse(
            res, 
            'Data inserted successfully', 
            result.rows[0],
        201
        )
    }
)
