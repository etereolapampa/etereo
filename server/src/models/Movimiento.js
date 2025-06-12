import mongoose from 'mongoose';

const MovimientoSchema = new mongoose.Schema({
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Producto', required: true },
    quantity: { type: Number, required: true },
    type: {
        type: String,
        required: true,
        enum: [
            "add",
            "sell",
            "transfer",
            "shortage"
        ]
    },
    branch: {
        type: String,
        required: true,
        enum: [
            "Santa Rosa",
            "Macachín"
        ]
    },
    destination: {
        type: String,
        enum: [
            "Santa Rosa",
            "Macachín"
        ]
    },
    date: { type: Date, required: true },
    observations: { type: String },
    price: { type: Number },
    total: { type: Number },
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendedor' },
    isFinalConsumer: { type: Boolean }
});

export default mongoose.model('Movimiento', MovimientoSchema, 'movimientos'); 